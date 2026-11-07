import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  Attempt,
  ParsedQuestion,
  QuestionAnswer,
  QuestionPaper,
  SubjectiveAssessment,
} from "./types";
import { parseAnswerKeyDetailed, SUBJECTIVE_ASSESSMENT_META } from "./defaults";
import { isSpecificSingleSubject } from "./markdownPaperParser";
import {
  deleteMcpPaper,
  getTopicAnalytics,
  getUserAttempts,
  getUserPaper,
  getUserPapers,
  getUserProfileData,
  getUserSyllabus,
  isCustomMcpPaper,
  saveMcpAttempt,
  saveMcpPaper,
  saveMcpSyllabus,
  saveMcpSyllabusMarkdown,
  setOnlyCustomPapers,
  setPaperArchived,
  searchMcpPapers,
  setPreloadedPapersHidden,
  sortAttemptsLatestFirst,
} from "./mcpData";
import { MCP_READ_SCOPE, MCP_WRITE_SCOPE, hasMcpScope } from "./mcpAuth";
import {
  getSyllabusCompletion,
  getEffectiveSyllabusDueDate,
  getSyllabusItemDateStatus,
  getSyllabusPace,
  getSyllabusTopicKey,
  getSyllabusProgress,
  parseSyllabusMarkdown,
} from "./syllabusMarkdown";

const looseObject = z.record(z.string(), z.any());

function textResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value as Record<string, unknown>,
  };
}

function errorResult(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

function scopeError(scope: string, required: string) {
  return !hasMcpScope(scope, required)
    ? errorResult(`This action requires the ${required} permission.`)
    : null;
}

function paperSummary(paper: QuestionPaper) {
  return {
    id: paper.id,
    title: paper.label || paper.title || paper.subject,
    year: paper.year,
    subject: paper.subject,
    category: paper.category,
    examType: paper.examType,
    totalQuestions: paper.totalQuestions,
    totalMarks: paper.totalMarks,
    hasAnswerKey:
      Object.keys(paper.answerKey || {}).length > 0 ||
      Object.keys(paper.explanations || {}).length > 0 ||
      Boolean(paper.answerKeyText?.trim()),
    hasContent: Boolean(paper.markdownContent || paper.parsedQuestions?.length),
    source: isCustomMcpPaper(paper) ? "student" : "preloaded",
  };
}

function normalizeQuestions(input: Record<string, any>): ParsedQuestion[] {
  const raw = input.parsedQuestions || input.questions;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((question, index) => ({
      questionNo: Number(question.questionNo || question.number || index + 1),
      text: String(question.text || question.question || "").trim(),
      options: question.options || {},
      matchingItems: question.matchingItems,
      matchingHeaders: question.matchingHeaders,
      answer: question.answer,
      explanation: question.explanation,
      subject: question.subject ? String(question.subject).trim() : undefined,
      chapter: question.chapter ? String(question.chapter).trim() : undefined,
      topic: question.topic ? String(question.topic).trim() : undefined,
      wordLimit:
        question.wordLimit !== undefined && question.wordLimit !== null
          ? Number(question.wordLimit)
          : undefined,
    }))
    .filter((question) => question.text);
}

function createImportedPaper(
  userId: string,
  input: Record<string, any>,
): QuestionPaper {
  const year = String(input.year || new Date().getFullYear()).replace(
    /[^0-9]/g,
    "",
  );
  const title = String(
    input.title || input.label || input.subject || "Imported paper",
  ).trim();
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48) || "paper";
  const examType = input.examType === "subjective" ? "subjective" : "objective";
  const category = input.category === "mains" ? "mains" : "prelims";
  const paperSubject = String(input.subject || title);
  const enforceSingleSubject = isSpecificSingleSubject(paperSubject);
  const parsedQuestions = normalizeQuestions(input);
  if (enforceSingleSubject) {
    parsedQuestions.forEach((q) => {
      q.subject = paperSubject;
    });
  }
  const parsedAnswerKey = input.answerKeyText
    ? parseAnswerKeyDetailed(String(input.answerKeyText))
    : { answers: {}, explanations: {} };
  const totalQuestions = Number(
    input.totalQuestions ||
      parsedQuestions.length ||
      (examType === "objective" ? 100 : 20),
  );
  const correctMarks = Number(
    input.correctMarks ?? (examType === "objective" ? 2 : 0),
  );
  const totalMarks = Number(
    input.totalMarks ||
      (examType === "objective" ? totalQuestions * correctMarks : 250),
  );

  return {
    id: `custom_${userId.slice(0, 8)}_${year}_${slug}`,
    userId,
    year: year || String(new Date().getFullYear()),
    category,
    examType,
    subject: String(input.subject || title),
    label: title,
    title,
    totalQuestions,
    totalMarks,
    correctMarks,
    incorrectMarks: Number(input.incorrectMarks || 0),
    timeMinutes: Number(
      input.timeMinutes || (examType === "objective" ? 120 : 180),
    ),
    qpUrl: "local://interactive_markdown",
    answerKey: { ...parsedAnswerKey.answers, ...(input.answerKey || {}) },
    answerKeyText: input.answerKeyText,
    explanations: {
      ...parsedAnswerKey.explanations,
      ...(input.explanations || {}),
    },
    markdownContent: input.markdownContent || input.content,
    parsedQuestions: parsedQuestions.length > 0 ? parsedQuestions : undefined,
    instructions: Array.isArray(input.instructions)
      ? input.instructions
      : undefined,
    cutoffEnabled: Boolean(input.cutoffEnabled),
    cutoffType: input.cutoffType === "marks" ? "marks" : "percentage",
    cutoffValue:
      input.cutoffValue === undefined ? undefined : Number(input.cutoffValue),
    isCustom: true,
  };
}

function summarizeProgress(papers: QuestionPaper[], attempts: Attempt[]) {
  const sortedAttempts = sortAttemptsLatestFirst(attempts);
  const totalScore = attempts.reduce(
    (sum, attempt) => sum + Number(attempt.score || 0),
    0,
  );
  const totalMaxScore = attempts.reduce(
    (sum, attempt) => sum + Number(attempt.maxScore || 0),
    0,
  );
  const byPaper = papers.map((paper) => {
    const paperAttempts = attempts
      .filter((attempt) => attempt.paperId === paper.id)
      .sort((a, b) =>
        String(b.finishedAt || b.startedAt).localeCompare(
          String(a.finishedAt || a.startedAt),
        ),
      );
    const latest = paperAttempts[0];
    return {
      ...paperSummary(paper),
      attempts: paperAttempts.length,
      latestScore: latest?.score ?? null,
      latestPercentage: latest?.percentagePct ?? null,
      bestPercentage: paperAttempts.length
        ? Math.max(
            ...paperAttempts.map((attempt) =>
              Number(attempt.percentagePct || 0),
            ),
          )
        : null,
    };
  });

  return {
    papersTracked: papers.length,
    papersAttempted: byPaper.filter((paper) => paper.attempts > 0).length,
    assessmentsCompleted: attempts.length,
    overallScore: totalMaxScore ? Number(totalScore.toFixed(2)) : null,
    overallMaxScore: totalMaxScore || null,
    overallPercentage: totalMaxScore
      ? Number(((totalScore / totalMaxScore) * 100).toFixed(1))
      : null,
    recentAttempts: sortedAttempts.slice(0, 10).map((attempt) => ({
      id: attempt.id,
      paperId: attempt.paperId,
      paperLabel: attempt.paperLabel,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentagePct: attempt.percentagePct,
      accuracyPct: attempt.accuracyPct,
      finishedAt: attempt.finishedAt || attempt.startedAt,
    })),
    byPaper,
  };
}

function attemptSummary(attempt: Attempt, paper?: QuestionPaper | null) {
  return {
    id: attempt.id,
    paperId: attempt.paperId,
    paperLabel: attempt.paperLabel,
    paperSubject: paper?.subject || null,
    paperYear: paper?.year || null,
    category: attempt.category,
    examType: attempt.examType,
    mode: attempt.mode,
    score: Number(attempt.score || 0),
    maxScore: Number(attempt.maxScore || 0),
    percentagePct: attempt.percentagePct ?? null,
    accuracyPct: attempt.accuracyPct ?? null,
    finishedAt: attempt.finishedAt || attempt.startedAt,
  };
}

function buildAttemptDetails(attempt: Attempt, paper?: QuestionPaper | null) {
  const paperQuestions = paper?.parsedQuestions || [];
  const questionByNo = new Map(paperQuestions.map((q) => [q.questionNo, q]));
  const answerEntries = Object.entries(attempt.answers || {}).map(
    ([key, val]) => [Number(key), val] as const,
  );

  const allQNos = new Set<number>();
  paperQuestions.forEach((q) => allQNos.add(q.questionNo));
  answerEntries.forEach(([qNo]) => allQNos.add(qNo));

  if (allQNos.size === 0 && attempt.totalQuestions > 0) {
    for (let i = 1; i <= attempt.totalQuestions; i++) allQNos.add(i);
  }

  const sortedQNos = Array.from(allQNos).sort((a, b) => a - b);

  const questions = sortedQNos.map((qNo) => {
    const pq = questionByNo.get(qNo);
    const ans = attempt.answers?.[qNo];
    const isCloze =
      (pq && Object.keys(pq.options || {}).length === 0) ||
      Boolean(
        ans?.selected &&
        ans.selected.length > 1 &&
        !["A", "B", "C", "D"].includes(ans.selected.trim().toUpperCase()) &&
        ans.selected !== "attempted",
      );

    const correctAnswer =
      ans?.correctAnswer ||
      pq?.answer ||
      (paper?.answerKey ? paper.answerKey[qNo] : undefined) ||
      null;

    const explanation =
      ans?.explanation ||
      pq?.explanation ||
      (paper?.explanations ? paper.explanations[qNo] : undefined) ||
      null;

    return {
      questionNo: qNo,
      text: pq?.text || `Question ${qNo}`,
      options: pq?.options || {},
      isCloze,
      selectedAnswer: ans?.selected ?? null,
      correctAnswer,
      isCorrect: ans?.isCorrect ?? null,
      confidence: ans?.confidence ?? null,
      timeSpentSeconds: ans?.timeSpentSeconds ?? 0,
      note: ans?.note ?? null,
      subjectiveAssessment: ans?.subjectiveAssessment ?? null,
      subjectiveMarks: ans?.subjectiveMarks ?? null,
      explanation,
      subject: ans?.subject || pq?.subject || paper?.subject || null,
      chapter: ans?.chapter || pq?.chapter || null,
      topic: ans?.topic || pq?.topic || null,
      wordLimit: pq?.wordLimit ?? null,
    };
  });

  return {
    ...attemptSummary(attempt, paper),
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt || attempt.startedAt,
    totalQuestions: attempt.totalQuestions,
    answered: attempt.answered,
    correct: attempt.correct,
    incorrect: attempt.incorrect,
    partial: attempt.partial ?? 0,
    unattempted: attempt.unattempted,
    durationSeconds: attempt.durationSeconds,
    generalNotes: attempt.generalNotes ?? null,
    userSubmissionPdfUrl: attempt.userSubmissionPdfUrl ?? null,
    questions,
  };
}

function isClozeQuestion(
  qNo: number,
  paper?: QuestionPaper | null,
  ans?: QuestionAnswer,
): boolean {
  const question = paper?.parsedQuestions?.find((pq) => pq.questionNo === qNo);
  if (question && Object.keys(question.options || {}).length === 0) return true;
  if (
    ans?.selected &&
    ans.selected.length > 1 &&
    !["A", "B", "C", "D"].includes(ans.selected.trim().toUpperCase()) &&
    ans.selected !== "attempted"
  ) {
    return true;
  }
  return false;
}

function isAssessmentQuestion(
  qNo: number,
  paper?: QuestionPaper | null,
  ans?: QuestionAnswer,
  isSubjective?: boolean,
): boolean {
  return Boolean(isSubjective || isClozeQuestion(qNo, paper, ans));
}

function isQuestionAnswered(
  ans?: QuestionAnswer,
  isAssessment?: boolean,
  isSubjective?: boolean,
): boolean {
  if (!ans) return false;
  if (isAssessment) {
    if (isSubjective) {
      return (
        ans.selected === "attempted" ||
        (ans.subjectiveAssessment !== undefined &&
          ans.subjectiveAssessment !== "no-attempt")
      );
    }
    return Boolean(ans.selected?.trim() && ans.selected !== "no-attempt");
  }
  return isSubjective
    ? ans.selected === "attempted"
    : ans.selected !== null && ans.selected !== undefined;
}

function getFullMarks(
  qNo: number,
  paper?: QuestionPaper | null,
  ans?: QuestionAnswer,
  correctMarksPerQ = 2.0,
  subjectiveMarksPerQ = 0,
): number {
  return isClozeQuestion(qNo, paper, ans)
    ? correctMarksPerQ
    : subjectiveMarksPerQ;
}

function getAssessmentMarks(
  qNo: number,
  assessment?: SubjectiveAssessment,
  subjectiveMarks?: number,
  paper?: QuestionPaper | null,
  ans?: QuestionAnswer,
  correctMarksPerQ = 2.0,
  incorrectMarksPerQ = 0.667,
  subjectiveMarksPerQ = 0,
): number {
  if (!assessment) return 0;
  const full = getFullMarks(
    qNo,
    paper,
    ans,
    correctMarksPerQ,
    subjectiveMarksPerQ,
  );
  const penalty = isClozeQuestion(qNo, paper, ans) ? incorrectMarksPerQ : 0;
  if (assessment === "strong") return full;
  if (assessment === "partial") {
    return Math.min(full, Math.max(0, subjectiveMarks ?? full * 0.5));
  }
  if (assessment === "needs-work") return -penalty;
  return 0;
}

function recalculateAttemptGrades(
  attempt: Attempt,
  paper?: QuestionPaper | null,
): Attempt {
  const isSubjective = attempt.examType === "subjective";
  const correctMarksPerQ = attempt.correctMarks || 2.0;
  const incorrectMarksPerQ = attempt.incorrectMarks || 0.667;
  const subjectiveMarksPerQ =
    attempt.totalQuestions > 0
      ? (attempt.totalMarks || attempt.maxScore || 0) / attempt.totalQuestions
      : 0;

  const allAnswers = Object.values(attempt.answers || {});
  const attemptedAnswers = allAnswers.filter((a) =>
    isQuestionAnswered(
      a,
      isAssessmentQuestion(a.questionNo, paper, a, isSubjective),
      isSubjective,
    ),
  );

  const score =
    Math.round(
      allAnswers.reduce((total, answer) => {
        const isAssess = isAssessmentQuestion(
          answer.questionNo,
          paper,
          answer,
          isSubjective,
        );
        if (isAssess) {
          return isQuestionAnswered(answer, true, isSubjective)
            ? total +
                getAssessmentMarks(
                  answer.questionNo,
                  answer.subjectiveAssessment,
                  answer.subjectiveMarks,
                  paper,
                  answer,
                  correctMarksPerQ,
                  incorrectMarksPerQ,
                  subjectiveMarksPerQ,
                )
            : total;
        }
        if (answer.isCorrect === true) return total + correctMarksPerQ;
        if (answer.isCorrect === false) return total - incorrectMarksPerQ;
        return total;
      }, 0) * 100,
    ) / 100;

  const maxScore = attempt.maxScore || attempt.totalMarks || 0;
  const answered = attemptedAnswers.length;

  const subjectivePoints = attemptedAnswers.reduce((total, answer) => {
    const isAssess = isAssessmentQuestion(
      answer.questionNo,
      paper,
      answer,
      isSubjective,
    );
    if (isAssess && answer.subjectiveAssessment) {
      return (
        total +
        (SUBJECTIVE_ASSESSMENT_META[answer.subjectiveAssessment]?.fraction ?? 0)
      );
    }
    return total + (answer.isCorrect === true ? 1 : 0);
  }, 0);

  const correct = allAnswers.filter((answer) => {
    const isAssess = isAssessmentQuestion(
      answer.questionNo,
      paper,
      answer,
      isSubjective,
    );
    return isAssess
      ? isQuestionAnswered(answer, true, isSubjective) &&
          answer.subjectiveAssessment === "strong"
      : answer.isCorrect === true;
  }).length;

  const partial = allAnswers.filter((answer) => {
    const isAssess = isAssessmentQuestion(
      answer.questionNo,
      paper,
      answer,
      isSubjective,
    );
    return (
      isAssess &&
      isQuestionAnswered(answer, true, isSubjective) &&
      answer.subjectiveAssessment === "partial"
    );
  }).length;

  const incorrect = allAnswers.filter((answer) => {
    const isAssess = isAssessmentQuestion(
      answer.questionNo,
      paper,
      answer,
      isSubjective,
    );
    return isAssess
      ? isQuestionAnswered(answer, true, isSubjective) &&
          answer.subjectiveAssessment === "needs-work"
      : answer.isCorrect === false;
  }).length;

  return {
    ...attempt,
    answered,
    correct,
    partial,
    incorrect,
    unattempted: Math.max(0, attempt.totalQuestions - answered),
    score: Number(score.toFixed(2)),
    maxScore: Number(maxScore.toFixed(2)),
    percentagePct:
      maxScore > 0 ? Math.round((score / maxScore) * 100 * 10) / 10 : 0,
    accuracyPct:
      answered > 0
        ? Math.round((subjectivePoints / answered) * 100 * 10) / 10
        : 0,
  };
}

export function createPortalMcpServer(
  userId: string,
  scope: string,
): McpServer {
  const server = new McpServer(
    { name: "UPSC Prep Hub", version: "1.0.0" },
    {
      instructions:
        "You are connected to a student's UPSC Prep Hub account. Read the student's data before making assumptions. Use get_attempt_history for attempt questions: it is newest-first and defaults to one latest attempt per distinct paper, so 'last N exams' must not count retries of the same paper as separate exams. Ask for confirmation before calling write tools, especially imports, score changes, or visibility changes.",
      maxToolInputElements: 5000,
    },
  );

  server.registerTool(
    "get_portal_overview",
    {
      title: "Get portal overview",
      description:
        "Return the student's paper library and assessment progress summary.",
      annotations: { readOnlyHint: true },
      inputSchema: {},
    },
    async () => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;
      const [papers, attempts] = await Promise.all([
        getUserPapers(userId),
        getUserAttempts(userId),
      ]);
      return textResult({ progress: summarizeProgress(papers, attempts) });
    },
  );

  server.registerTool(
    "list_papers",
    {
      title: "List papers",
      description:
        "List the papers visible in the student's paper library. Supports filtering by attempt status ('unattempted' to find pending tests, 'attempted', or 'all').",
      annotations: { readOnlyHint: true },
      inputSchema: {
        search: z.string().optional(),
        source: z.enum(["all", "student", "preloaded"]).optional(),
        status: z
          .enum(["all", "attempted", "unattempted"])
          .optional()
          .describe(
            "Filter by attempt status: 'unattempted' to list pending tests in one call, 'attempted' for completed papers, or 'all'. Defaults to 'all'.",
          ),
      },
    },
    async ({ search, source, status }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;

      const [papers, attempts] = await Promise.all([
        getUserPapers(userId),
        getUserAttempts(userId),
      ]);

      const attemptCountByPaper = attempts.reduce(
        (acc, att) => {
          acc[att.paperId] = (acc[att.paperId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const query = search?.trim().toLowerCase();
      const filtered = papers.filter((paper) => {
        const summary = paperSummary(paper);
        const matchesSource =
          source === "student"
            ? summary.source === "student"
            : source === "preloaded"
              ? summary.source === "preloaded"
              : true;

        const attemptCount = attemptCountByPaper[paper.id] || 0;
        const matchesStatus =
          status === "unattempted"
            ? attemptCount === 0
            : status === "attempted"
              ? attemptCount > 0
              : true;

        const haystack =
          `${summary.title} ${summary.subject} ${summary.year}`.toLowerCase();
        return (
          matchesSource && matchesStatus && (!query || haystack.includes(query))
        );
      });

      return textResult({
        papers: filtered.map((paper) => ({
          ...paperSummary(paper),
          attempts: attemptCountByPaper[paper.id] || 0,
        })),
        count: filtered.length,
        statusFilter: status || "all",
      });
    },
  );

  server.registerTool(
    "get_paper",
    {
      title: "Get paper content",
      description: "Read one paper's metadata and imported question content.",
      annotations: { readOnlyHint: true },
      inputSchema: { paperId: z.string().min(1) },
    },
    async ({ paperId }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;
      const paper = await getUserPaper(userId, paperId);
      if (!paper)
        return errorResult("Paper not found in this student's library.");
      return textResult({ paper });
    },
  );

  server.registerTool(
    "get_progress_summary",
    {
      title: "Get progress summary",
      description:
        "Calculate overall scores, attempts, best scores, and paper-wise progress.",
      annotations: { readOnlyHint: true },
      inputSchema: {},
    },
    async () => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;
      const [papers, attempts] = await Promise.all([
        getUserPapers(userId),
        getUserAttempts(userId),
      ]);
      return textResult(summarizeProgress(papers, attempts));
    },
  );

  server.registerTool(
    "get_attempt_history",
    {
      title: "Get attempt history",
      description:
        "Read the student's attempts newest-first and calculate averages for a requested set. By default, each paper is counted once using its latest attempt, so requests such as 'my last 3 CSAT exams' mean 3 different papers rather than 3 retries of one paper. Set distinctPapers to false only when every retry should be included.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe("Match paper title, subject, year, or paper ID."),
        paperId: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        distinctPapers: z.boolean().optional(),
      },
    },
    async ({ search, paperId, limit, distinctPapers }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;

      const [papers, rawAttempts] = await Promise.all([
        getUserPapers(userId),
        getUserAttempts(userId),
      ]);
      const paperById = new Map(papers.map((paper) => [paper.id, paper]));
      const normalizedSearch = search?.trim().toLowerCase();
      const filtered = sortAttemptsLatestFirst(rawAttempts).filter(
        (attempt) => {
          if (paperId && attempt.paperId !== paperId) return false;
          if (!normalizedSearch) return true;
          const paper = paperById.get(attempt.paperId);
          const haystack = [
            attempt.paperId,
            attempt.paperLabel,
            paper?.label,
            paper?.title,
            paper?.subject,
            paper?.year,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedSearch);
        },
      );

      const candidateAttempts =
        distinctPapers === false
          ? filtered
          : sortAttemptsLatestFirst([
              ...filtered
                .reduce((latestByPaper, attempt) => {
                  if (!latestByPaper.has(attempt.paperId)) {
                    latestByPaper.set(attempt.paperId, attempt);
                  }
                  return latestByPaper;
                }, new Map<string, Attempt>())
                .values(),
            ]);
      const selected = candidateAttempts.slice(0, limit ?? 20);
      const totalScore = selected.reduce(
        (sum, attempt) => sum + Number(attempt.score || 0),
        0,
      );
      const totalMaxScore = selected.reduce(
        (sum, attempt) => sum + Number(attempt.maxScore || 0),
        0,
      );
      const percentageValues = selected
        .map((attempt) => Number(attempt.percentagePct))
        .filter(Number.isFinite);

      return textResult({
        distinctPapers: distinctPapers !== false,
        requestedLimit: limit ?? 20,
        matchedAttemptCount: filtered.length,
        duplicateAttemptsExcluded:
          distinctPapers === false
            ? 0
            : Math.max(0, filtered.length - candidateAttempts.length),
        count: selected.length,
        averageScore: selected.length
          ? Number((totalScore / selected.length).toFixed(2))
          : null,
        averagePercentage: percentageValues.length
          ? Number(
              (
                percentageValues.reduce((sum, value) => sum + value, 0) /
                percentageValues.length
              ).toFixed(2),
            )
          : null,
        combinedScore: totalMaxScore
          ? Number(((totalScore / totalMaxScore) * 100).toFixed(2))
          : null,
        attempts: selected.map((attempt) =>
          attemptSummary(attempt, paperById.get(attempt.paperId)),
        ),
      });
    },
  );

  server.registerTool(
    "get_attempt_detail",
    {
      title: "Get attempt details",
      description:
        "Read one completed attempt's full per-question details including question prompt, options, student's selected choice or written cloze/one-liner answer, answer key, correctness, confidence tag, time spent, notes, and explanations. Defaults to the latest attempt if attemptId or paperId is omitted.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        attemptId: z
          .string()
          .optional()
          .describe("Specific attempt ID. Defaults to latest attempt."),
        paperId: z
          .string()
          .optional()
          .describe("Match latest attempt for this paper ID."),
      },
    },
    async ({ attemptId, paperId }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;

      const [papers, rawAttempts] = await Promise.all([
        getUserPapers(userId),
        getUserAttempts(userId),
      ]);

      if (!rawAttempts.length) {
        return errorResult("No exam attempts found for this student.");
      }

      const attempts = sortAttemptsLatestFirst(rawAttempts);
      const target = attemptId
        ? attempts.find((a) => a.id === attemptId)
        : paperId
          ? attempts.find((a) => a.paperId === paperId)
          : attempts[0];

      if (!target) {
        return errorResult(
          attemptId
            ? `Attempt ${attemptId} not found.`
            : `No attempt found for paper ${paperId}.`,
        );
      }

      const paper = papers.find((p) => p.id === target.paperId);
      return textResult({ attempt: buildAttemptDetails(target, paper) });
    },
  );

  server.registerTool(
    "get_topic_analytics",
    {
      title: "Get topic analytics & weak areas",
      description:
        "Analyzes student performance across all past attempts aggregated by 3-tier hierarchy (Subject > Chapter > Topic). Identifies critical weak areas (<50% accuracy), mastered topics (>=70% accuracy), and overall preparation trends to tailor follow-up practice tests.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        subject: z
          .string()
          .optional()
          .describe(
            "Filter analytics to a specific subject (e.g. 'History', 'Polity', 'Economy').",
          ),
        minAttempts: z
          .number()
          .optional()
          .describe(
            "Minimum questions attempted per topic to be included (defaults to 1).",
          ),
      },
    },
    async ({ subject, minAttempts }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;

      const analytics = await getTopicAnalytics(userId, {
        subject,
        minAttempts,
      });

      return textResult(analytics);
    },
  );

  server.registerTool(
    "get_syllabus",
    {
      title: "Get custom syllabus",
      description:
        "Read the student's custom Markdown syllabus, inherited due dates, completion state, and leading/on-track/lagging status.",
      annotations: { readOnlyHint: true },
      inputSchema: { paperId: z.string().optional() },
    },
    async ({ paperId }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;
      const profile = await getUserProfileData(userId);
      const items = profile.syllabus;
      const filtered = paperId
        ? items.filter((item) => item.paperId === paperId)
        : items;
      const progress = getSyllabusProgress(filtered);
      const pace = getSyllabusPace(items);
      return textResult({
        markdown: profile.syllabusMarkdown,
        dateStatus: pace.status,
        datedTopics: pace.datedTopics,
        overdueTopics: pace.overdueTopics,
        items: filtered.map((item) => ({
          ...item,
          effectiveDueDate: getEffectiveSyllabusDueDate(item, items),
          dateStatus: getSyllabusItemDateStatus(item, items),
        })),
        completed: progress.completed,
        total: progress.total,
        percentage: progress.percentage,
        completedItemIds: filtered
          .filter((item) => getSyllabusCompletion(item, filtered))
          .map((item) => item.id),
      });
    },
  );

  server.registerTool(
    "search_paper_content",
    {
      title: "Search paper content",
      description:
        "Search imported paper questions and markdown content for a topic or phrase.",
      annotations: { readOnlyHint: true },
      inputSchema: { query: z.string().min(2), paperId: z.string().optional() },
    },
    async ({ query, paperId }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;
      const results = await searchMcpPapers(userId, query, paperId);
      return textResult({ query, results });
    },
  );

  server.registerTool(
    "preview_import_paper",
    {
      title: "Preview paper import",
      description:
        'Validate a paper before saving it to the student\'s library. Markdown questions may be MCQs with options (a)-(d) or cloze/free-text questions with no options. In the answer key, MCQs use \'<number>. <letter> \\"\\"\\" explanation \\"\\"\\"\' and cloze questions use \'<number>. \\"\\"\\" reference explanation \\"\\"\\"\'. Explanations inside \\"\\"\\" support rich HTML formatting (e.g. <b>, <i>, <ul>, <ol>, <li>, <table>, <code>, <blockquote>, <p>).',
      annotations: { readOnlyHint: true },
      inputSchema: { paper: looseObject },
    },
    async ({ paper }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;
      const imported = createImportedPaper(userId, paper);
      const warnings: string[] = [];
      if (!imported.markdownContent && !imported.parsedQuestions?.length) {
        warnings.push("No markdownContent or questions were supplied.");
      }
      if (
        !Object.keys(imported.answerKey || {}).length &&
        !Object.keys(imported.explanations || {}).length
      ) {
        warnings.push(
          "No answer key was supplied; practice grading may be unavailable.",
        );
      }
      const existing = await getUserPaper(userId, imported.id);
      if (existing)
        warnings.push(
          "A paper with this generated ID already exists and will be updated.",
        );
      return textResult({
        valid: warnings.every((warning) => !warning.startsWith("No markdown")),
        warnings,
        paper: paperSummary(imported),
        payload: imported,
      });
    },
  );

  server.registerTool(
    "commit_import_paper",
    {
      title: "Save imported paper",
      description:
        "Save a validated paper in the student's personal library. Ask the student for confirmation first.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: { paper: looseObject },
    },
    async ({ paper }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;
      const imported = createImportedPaper(userId, paper);
      if (!imported.markdownContent && !imported.parsedQuestions?.length) {
        return errorResult(
          "Add markdownContent or a non-empty questions array before importing.",
        );
      }
      await saveMcpPaper(userId, imported);
      return textResult({ saved: true, paper: paperSummary(imported) });
    },
  );

  server.registerTool(
    "record_attempt",
    {
      title: "Record assessment attempt",
      description:
        "Save a completed paper attempt and include it in progress analytics.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        paperId: z.string().min(1),
        score: z.number(),
        maxScore: z.number().optional(),
        correct: z.number().int().min(0).optional(),
        incorrect: z.number().int().min(0).optional(),
        answered: z.number().int().min(0).optional(),
        mode: z.enum(["practice", "mock"]).optional(),
        notes: z.string().optional(),
      },
    },
    async ({
      paperId,
      score,
      maxScore,
      correct,
      incorrect,
      answered,
      mode,
      notes,
    }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;
      const paper = await getUserPaper(userId, paperId);
      if (!paper)
        return errorResult("Paper not found in this student's library.");
      const totalQuestions = paper.totalQuestions || 0;
      const resolvedMaxScore = Number(maxScore || paper.totalMarks || 0);
      const resolvedAnswered = Number(
        answered ?? Number(correct || 0) + Number(incorrect || 0),
      );
      const resolvedCorrect = Number(correct || 0);
      const resolvedIncorrect = Number(incorrect || 0);
      const attempt: Attempt = {
        id: randomUUID(),
        userId,
        paperId,
        paperLabel: paper.label,
        category: paper.category,
        examType: paper.examType,
        mode: mode || "mock",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        totalQuestions,
        totalMarks: resolvedMaxScore,
        correctMarks: paper.correctMarks,
        incorrectMarks: paper.incorrectMarks,
        timeMinutes: paper.timeMinutes,
        durationSeconds: 0,
        answered: resolvedAnswered,
        correct: resolvedCorrect,
        incorrect: resolvedIncorrect,
        unattempted: Math.max(0, totalQuestions - resolvedAnswered),
        score,
        maxScore: resolvedMaxScore,
        percentagePct: resolvedMaxScore
          ? Number(((score / resolvedMaxScore) * 100).toFixed(2))
          : 0,
        accuracyPct: resolvedAnswered
          ? Number(((resolvedCorrect / resolvedAnswered) * 100).toFixed(2))
          : 0,
        answers: {},
        generalNotes: notes,
      };
      await saveMcpAttempt(userId, attempt);
      return textResult({
        saved: true,
        attempt: {
          id: attempt.id,
          paperId,
          paperLabel: paper.label,
          score,
          maxScore: resolvedMaxScore,
          percentagePct: attempt.percentagePct,
        },
      });
    },
  );

  server.registerTool(
    "attach_attempt_reflection",
    {
      title: "Attach strategy notes & reflections",
      description:
        "Attach or update strategy notes and reflections in the 'Attempt Strategy Notes & Reflections' section of an attempt. Defaults to the student's latest attempt if attemptId or paperId is omitted.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        notes: z
          .string()
          .min(1)
          .describe("The strategy reflections or notes to attach."),
        attemptId: z
          .string()
          .optional()
          .describe("Specific attempt ID. Defaults to latest attempt."),
        paperId: z
          .string()
          .optional()
          .describe("Paper ID to match the latest attempt of that paper."),
        append: z
          .boolean()
          .optional()
          .describe(
            "Append to existing notes instead of overwriting. Defaults to false.",
          ),
      },
    },
    async ({ notes, attemptId, paperId, append }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;
      const attempts = await getUserAttempts(userId);
      if (!attempts.length) {
        return errorResult("No exam attempts found for this student.");
      }
      const targetAttempt = attemptId
        ? attempts.find((a) => a.id === attemptId)
        : paperId
          ? attempts.find((a) => a.paperId === paperId)
          : attempts[0];

      if (!targetAttempt) {
        return errorResult(
          attemptId
            ? `Attempt ${attemptId} not found.`
            : `No attempt found for paper ${paperId}.`,
        );
      }

      const trimmed = notes.trim();
      const updatedNotes =
        append && targetAttempt.generalNotes?.trim()
          ? `${targetAttempt.generalNotes.trim()}\n\n${trimmed}`
          : trimmed;

      const updatedAttempt: Attempt = {
        ...targetAttempt,
        generalNotes: updatedNotes,
      };

      await saveMcpAttempt(userId, updatedAttempt);

      return textResult({
        saved: true,
        attemptId: updatedAttempt.id,
        paperLabel: updatedAttempt.paperLabel,
        generalNotes: updatedNotes,
        message: "Strategy notes & reflections attached successfully.",
      });
    },
  );

  server.registerTool(
    "grade_attempt_questions",
    {
      title: "Grade attempt questions",
      description:
        "Post marks or subjective assessments for free-text, cloze, or subjective answers in an attempt. Automatically recalculates the attempt's score, percentage, and accuracy so the app UI matches the adjusted marks. Ask for student confirmation before applying grade changes.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        attemptId: z
          .string()
          .optional()
          .describe("Specific attempt ID. Defaults to latest attempt."),
        paperId: z
          .string()
          .optional()
          .describe("Match latest attempt for this paper ID."),
        grades: z
          .array(
            z.object({
              questionNo: z.number().int().min(1),
              marks: z.number().describe("Marks awarded for this question."),
              assessment: z
                .enum(["strong", "partial", "needs-work", "no-attempt"])
                .optional()
                .describe(
                  "Optional qualitative assessment. If omitted, inferred from marks vs full marks.",
                ),
              isCorrect: z
                .boolean()
                .optional()
                .describe(
                  "Optional correctness flag. Inferred from assessment/marks if omitted.",
                ),
              note: z
                .string()
                .optional()
                .describe(
                  "Optional feedback or explanation note for this question.",
                ),
            }),
          )
          .min(1)
          .describe("List of question grades to apply."),
      },
    },
    async ({ attemptId, paperId, grades }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;

      const [papers, rawAttempts] = await Promise.all([
        getUserPapers(userId),
        getUserAttempts(userId),
      ]);

      if (!rawAttempts.length) {
        return errorResult("No exam attempts found for this student.");
      }

      const attempts = sortAttemptsLatestFirst(rawAttempts);
      const targetAttempt = attemptId
        ? attempts.find((a) => a.id === attemptId)
        : paperId
          ? attempts.find((a) => a.paperId === paperId)
          : attempts[0];

      if (!targetAttempt) {
        return errorResult(
          attemptId
            ? `Attempt ${attemptId} not found.`
            : `No attempt found for paper ${paperId}.`,
        );
      }

      const paper = papers.find((p) => p.id === targetAttempt.paperId);
      const isSubjective = targetAttempt.examType === "subjective";
      const correctMarksPerQ = targetAttempt.correctMarks || 2.0;
      const subjectiveMarksPerQ =
        targetAttempt.totalQuestions > 0
          ? (targetAttempt.totalMarks || targetAttempt.maxScore || 0) /
            targetAttempt.totalQuestions
          : 0;

      const updatedAnswers = { ...targetAttempt.answers };

      for (const grade of grades) {
        const qNo = grade.questionNo;
        const currentAnswer = updatedAnswers[qNo] || {
          questionNo: qNo,
          selected: isSubjective ? "attempted" : "attempted",
        };

        const isCloze = isClozeQuestion(qNo, paper, currentAnswer);
        const fullMarks = isCloze ? correctMarksPerQ : subjectiveMarksPerQ;

        const assessment: SubjectiveAssessment =
          grade.assessment ||
          (grade.marks >= fullMarks
            ? "strong"
            : grade.marks > 0
              ? "partial"
              : grade.marks === 0 && currentAnswer.selected === null
                ? "no-attempt"
                : "needs-work");

        const isCorrect: boolean | null =
          grade.isCorrect !== undefined
            ? grade.isCorrect
            : assessment === "strong"
              ? true
              : assessment === "needs-work"
                ? false
                : null;

        updatedAnswers[qNo] = {
          ...currentAnswer,
          selected: isCloze
            ? currentAnswer.selected
            : assessment === "no-attempt"
              ? null
              : currentAnswer.selected || "attempted",
          subjectiveAssessment: assessment,
          subjectiveMarks: grade.marks,
          isCorrect,
          note: grade.note !== undefined ? grade.note : currentAnswer.note,
        };
      }

      const updatedAttempt = recalculateAttemptGrades(
        {
          ...targetAttempt,
          answers: updatedAnswers,
        },
        paper,
      );

      await saveMcpAttempt(userId, updatedAttempt);

      return textResult({
        saved: true,
        attemptId: updatedAttempt.id,
        paperLabel: updatedAttempt.paperLabel,
        adjustedScore: updatedAttempt.score,
        maxScore: updatedAttempt.maxScore,
        percentagePct: updatedAttempt.percentagePct,
        accuracyPct: updatedAttempt.accuracyPct,
        correct: updatedAttempt.correct,
        partial: updatedAttempt.partial,
        incorrect: updatedAttempt.incorrect,
        gradedQuestionsCount: grades.length,
      });
    },
  );

  server.registerTool(
    "update_question_notes",
    {
      title: "Attach evaluation notes per question",
      description:
        "Attach or update mentor feedback and evaluation notes to specific questions inside an attempt. Notes are visible directly under each question in the student's review screen. Defaults to the latest attempt if attemptId or paperId is omitted.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        attemptId: z
          .string()
          .optional()
          .describe("Specific attempt ID. Defaults to latest attempt."),
        paperId: z
          .string()
          .optional()
          .describe("Match latest attempt for this paper ID."),
        notes: z
          .array(
            z.object({
              questionNo: z.number().int().min(1),
              note: z
                .string()
                .min(1)
                .describe("The evaluation or mentor feedback note."),
              append: z
                .boolean()
                .optional()
                .describe(
                  "Append to existing question note instead of replacing. Defaults to false.",
                ),
            }),
          )
          .min(1)
          .describe("List of questions and their evaluation notes."),
      },
    },
    async ({ attemptId, paperId, notes }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;

      const attempts = sortAttemptsLatestFirst(await getUserAttempts(userId));
      if (!attempts.length) {
        return errorResult("No exam attempts found for this student.");
      }

      const targetAttempt = attemptId
        ? attempts.find((a) => a.id === attemptId)
        : paperId
          ? attempts.find((a) => a.paperId === paperId)
          : attempts[0];

      if (!targetAttempt) {
        return errorResult(
          attemptId
            ? `Attempt ${attemptId} not found.`
            : `No attempt found for paper ${paperId}.`,
        );
      }

      const updatedAnswers = { ...targetAttempt.answers };
      const updatedList: Array<{ questionNo: number; note: string }> = [];

      for (const item of notes) {
        const qNo = item.questionNo;
        const currentAnswer = updatedAnswers[qNo];
        const trimmed = item.note.trim();

        const updatedNote =
          item.append && currentAnswer?.note?.trim()
            ? `${currentAnswer.note.trim()}\n\n${trimmed}`
            : trimmed;

        if (currentAnswer) {
          updatedAnswers[qNo] = {
            ...currentAnswer,
            note: updatedNote,
          };
        } else {
          updatedAnswers[qNo] = {
            questionNo: qNo,
            selected: null,
            note: updatedNote,
          };
        }

        updatedList.push({ questionNo: qNo, note: updatedNote });
      }

      const updatedAttempt: Attempt = {
        ...targetAttempt,
        answers: updatedAnswers,
      };

      await saveMcpAttempt(userId, updatedAttempt);

      return textResult({
        saved: true,
        attemptId: updatedAttempt.id,
        paperLabel: updatedAttempt.paperLabel,
        notesUpdatedCount: updatedList.length,
        notes: updatedList,
      });
    },
  );

  server.registerTool(
    "replace_syllabus_markdown",
    {
      title: "Replace Markdown syllabus",
      description:
        "Replace the student's custom syllabus with a Markdown outline. Headings and indented bullets become nested topics; dates like [30 Nov 2026] set due dates, and undated children inherit their nearest parent date. Existing completion is kept for unchanged paths.",
      annotations: { readOnlyHint: false, destructiveHint: true },
      inputSchema: { markdown: z.string().min(1) },
    },
    async ({ markdown }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;
      const profile = await getUserProfileData(userId);
      const items = parseSyllabusMarkdown(markdown, profile.syllabus);
      await saveMcpSyllabusMarkdown(userId, markdown, items);
      return textResult({
        saved: true,
        itemCount: items.length,
        items,
      });
    },
  );

  server.registerTool(
    "set_syllabus_item_completion",
    {
      title: "Update syllabus completion",
      description: "Mark a custom syllabus item complete or incomplete.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: { itemId: z.string().min(1), completed: z.boolean() },
    },
    async ({ itemId, completed }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;
      const items = await getUserSyllabus(userId);
      if (!items.some((item) => item.id === itemId))
        return errorResult("Syllabus item not found.");
      const target = items.find((item) => item.id === itemId);
      if (!target) return errorResult("Syllabus item not found.");
      const topicKey = getSyllabusTopicKey(target);
      const affectedIds = new Set(
        items
          .filter((item) => getSyllabusTopicKey(item) === topicKey)
          .map((item) => item.id),
      );
      let changed = true;
      while (changed) {
        changed = false;
        items.forEach((item) => {
          if (item.parentId && affectedIds.has(item.parentId)) {
            if (!affectedIds.has(item.id)) {
              affectedIds.add(item.id);
              changed = true;
            }
          }
        });
      }
      const updated = items.map((item) =>
        affectedIds.has(item.id)
          ? { ...item, completed, updatedAt: new Date().toISOString() }
          : item,
      );
      await saveMcpSyllabus(userId, updated);
      return textResult({
        saved: true,
        item: updated.find((item) => item.id === itemId),
      });
    },
  );

  server.registerTool(
    "set_preloaded_papers_visibility",
    {
      title: "Show or hide pre-loaded papers",
      description:
        "Hide all pre-loaded papers or restore them. Student-created papers are not changed.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: { hidden: z.boolean() },
    },
    async ({ hidden }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;
      const hiddenPaperIds = await setPreloadedPapersHidden(userId, hidden);
      return textResult({
        updated: true,
        hidden,
        hiddenPaperCount: hiddenPaperIds.length,
      });
    },
  );

  server.registerTool(
    "set_only_uploaded_papers",
    {
      title: "Show only uploaded papers",
      description:
        "Set whether the student's library should show only their uploaded papers.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: { enabled: z.boolean() },
    },
    async ({ enabled }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;
      await setOnlyCustomPapers(userId, enabled);
      return textResult({ updated: true, onlyUploadedPapers: enabled });
    },
  );

  server.registerTool(
    "delete_paper",
    {
      title: "Delete paper",
      description:
        "Permanently delete an imported or custom paper from the student's library. Pre-loaded default papers cannot be deleted; use archive_paper to hide them instead. Ask the student for confirmation first.",
      annotations: { readOnlyHint: false, destructiveHint: true },
      inputSchema: {
        paperId: z.string().min(1).describe("The ID of the paper to delete."),
      },
    },
    async ({ paperId }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;

      const paper = await getUserPaper(userId, paperId);
      if (!paper) {
        return errorResult("Paper not found in this student's library.");
      }

      if (!isCustomMcpPaper(paper)) {
        return errorResult(
          "Pre-loaded platform papers cannot be permanently deleted. Use archive_paper to hide them from your library instead.",
        );
      }

      await deleteMcpPaper(userId, paperId);
      return textResult({
        deleted: true,
        paperId,
        title: paper.label || paper.title || paper.subject,
        message: "Paper deleted successfully.",
      });
    },
  );

  server.registerTool(
    "archive_paper",
    {
      title: "Archive or restore paper",
      description:
        "Archive (hide) or restore (unhide) any paper in the student's library without deleting historical attempts. Works for both pre-loaded and student-created papers.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        paperId: z
          .string()
          .min(1)
          .describe("The ID of the paper to archive or restore."),
        archived: z
          .boolean()
          .default(true)
          .describe(
            "True to archive/hide from library, false to unarchive/restore. Defaults to true.",
          ),
      },
    },
    async ({ paperId, archived }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;

      const hiddenPaperIds = await setPaperArchived(userId, paperId, archived);
      return textResult({
        updated: true,
        paperId,
        archived,
        hiddenPaperCount: hiddenPaperIds.length,
        message: archived
          ? "Paper archived and hidden from library."
          : "Paper restored and visible in library.",
      });
    },
  );

  return server;
}

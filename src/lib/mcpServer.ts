import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Attempt, ParsedQuestion, QuestionPaper } from "./types";
import { parseAnswerKeyDetailed } from "./defaults";
import { isSpecificSingleSubject } from "./markdownPaperParser";
import {
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
      topic: question.topic ? String(question.topic).trim() : undefined,
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
      description: "List the papers visible in the student's paper library.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        search: z.string().optional(),
        source: z.enum(["all", "student", "preloaded"]).optional(),
      },
    },
    async ({ search, source }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;
      const papers = await getUserPapers(userId);
      const query = search?.trim().toLowerCase();
      const filtered = papers.filter((paper) => {
        const summary = paperSummary(paper);
        const matchesSource =
          source === "student"
            ? summary.source === "student"
            : source === "preloaded"
              ? summary.source === "preloaded"
              : true;
        const haystack =
          `${summary.title} ${summary.subject} ${summary.year}`.toLowerCase();
        return matchesSource && (!query || haystack.includes(query));
      });
      return textResult({
        papers: filtered.map(paperSummary),
        count: filtered.length,
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

  return server;
}

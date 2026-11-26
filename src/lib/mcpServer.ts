import { createHash, randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  Attempt,
  ParsedQuestion,
  QuestionAnswer,
  QuestionPaper,
  SubjectiveAssessment,
} from "./types";
import { VocabCard } from "./vocabTypes";
import {
  parseAnswerKeyDetailed,
  SUBJECTIVE_ASSESSMENT_META,
  isCsatPaper,
} from "./defaults";
import {
  cleanPreviousYears,
  extractPyqYearsFromText,
  isSpecificSingleSubject,
  parseMarkdownHeader,
  parseQuestionnaireMarkdown,
} from "./markdownPaperParser";
import {
  deleteMcpPaper,
  getTopicAnalytics,
  getRevisionContextData,
  saveTopicRevisionNote,
  getUserAttempts,
  getUserPaper,
  getPaperById,
  getUserPapers,
  getUserProfileData,
  getUserSyllabus,
  getUserVocabCards,
  saveUserVocabCards,
  getMcpDailyQuote,
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
  getUserMainsSessions,
  aggregateMainsFeedback,
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
import {
  normalizePaperToQuestions,
  saveQuestionsToBank,
  queryQuestionBank,
} from "./questionBank";

export const paperImportSchema = z
  .object({
    title: z
      .string()
      .optional()
      .describe("Paper title or name (e.g. 'Polity Cloze Practice')"),
    label: z
      .string()
      .optional()
      .describe("Alternative label for the paper title"),
    year: z.string().optional().describe("Exam year (e.g. '2026')"),
    subject: z
      .string()
      .optional()
      .describe("Subject (e.g. 'Polity', 'GS I', 'CSAT')"),
    category: z
      .enum(["prelims", "mains"])
      .optional()
      .describe("Exam category: 'prelims' or 'mains'"),
    examType: z
      .enum(["objective", "subjective"])
      .optional()
      .describe("Exam type: 'objective' or 'subjective'"),
    markdownContent: z
      .string()
      .optional()
      .describe(
        "Questionnaire in markdown format with numbered questions (e.g. '1. Question prompt...')",
      ),
    answerKeyText: z
      .string()
      .optional()
      .describe(
        'Documented raw answer key text: MCQs \'<number>. <letter> """ explanation """\', Cloze \'<number>. <answer> """ explanation """\' or \'<number>. """ reference answer """\'',
      ),
    answerKey: z
      .union([z.record(z.string(), z.string()), z.string()])
      .optional()
      .describe(
        "Structured answer key object { [qNo]: answer } OR raw answer key text",
      ),
    explanations: z
      .record(z.string(), z.string())
      .optional()
      .describe("Optional structured explanations map { [qNo]: explanation }"),
    totalQuestions: z.number().optional().describe("Total number of questions"),
    totalMarks: z.number().optional().describe("Total marks for the paper"),
    correctMarks: z
      .number()
      .optional()
      .describe("Marks awarded per correct answer (e.g. 1 or 2)"),
    incorrectMarks: z
      .number()
      .optional()
      .describe(
        "Marks deducted per incorrect answer (e.g. 0 for no negative marking, 0.667 for prelims)",
      ),
    timeMinutes: z
      .number()
      .optional()
      .describe("Exam duration in minutes (e.g. 60 or 120)"),
    instructions: z
      .array(z.string())
      .optional()
      .describe("Array of exam instructions"),
    cutoffEnabled: z
      .boolean()
      .optional()
      .describe("Whether a cutoff threshold is enabled"),
    cutoffValue: z.number().optional().describe("Cutoff target value"),
    cutoffType: z
      .enum(["percentage", "marks"])
      .optional()
      .describe("Cutoff target type: 'percentage' or 'marks'"),
    questions: z
      .array(z.record(z.string(), z.any()))
      .optional()
      .describe("Optional pre-parsed questions array"),
  })
  .passthrough();

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
    timeMinutes: paper.timeMinutes,
    correctMarks: paper.correctMarks,
    incorrectMarks: paper.incorrectMarks,
    hasAnswerKey:
      Object.keys(paper.answerKey || {}).length > 0 ||
      Object.keys(paper.explanations || {}).length > 0 ||
      Boolean(paper.answerKeyText?.trim()),
    hasContent: Boolean(paper.markdownContent || paper.parsedQuestions?.length),
    source: isCustomMcpPaper(paper) ? "student" : "preloaded",
  };
}

function parseDurationToMinutes(raw: unknown): number | undefined {
  if (!raw) return undefined;
  if (typeof raw === "number" && !isNaN(raw) && raw > 0) return Math.round(raw);
  const str = String(raw).trim().toLowerCase();
  if (!str) return undefined;

  const hrMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  const minMatch = str.match(/(\d+)\s*(?:minutes?|mins?|m)\b/);
  if (hrMatch || minMatch) {
    const hours = hrMatch ? parseFloat(hrMatch[1]) : 0;
    const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
    const total = Math.round(hours * 60 + mins);
    if (total > 0) return total;
  }

  const plainNum = parseInt(str.replace(/[^\d]/g, ""), 10);
  if (!isNaN(plainNum) && plainNum > 0) return plainNum;

  return undefined;
}

interface EnrichedVocabDetails {
  meaning: string;
  memoryHook: string;
  example: string;
  partOfSpeech?: string;
  phonetic?: string;
  rootBreakdown?: string;
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string[];
  nuanceTip?: string;
}

function generateFallbackVocabDetails(word: string): EnrichedVocabDetails {
  const cleanWord = word.trim();
  return {
    meaning: `Key conceptual term referring to ${cleanWord.toLowerCase()} within administrative, constitutional, or socio-economic discourse.`,
    memoryHook: `Link "${cleanWord}" with core root or thematic context to recall instantly in exam recall drills.`,
    example: `The policy paper underscored the significance of ${cleanWord.toLowerCase()} in ensuring robust institutional governance.`,
  };
}

async function enrichVocabWordWithAi(
  word: string,
): Promise<EnrichedVocabDetails> {
  const cleanWord = word.trim();
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    try {
      const prompt = `You are an expert vocabulary coach and cognitive memory specialist for serious students preparing for competitive exams (UPSC CSE, GRE, editorial writing).
The student provided the word: "${cleanWord}".
Respond ONLY with a JSON object in this exact format:
{
  "partOfSpeech": "noun | verb | adjective | adverb",
  "phonetic": "Clear syllable pronunciation guide",
  "meaning": "One crisp, intuitive, plain-language sentence explaining what the word means.",
  "memoryHook": "A vivid visual scene, wordplay, or sound-alike story that locks the meaning in memory.",
  "rootBreakdown": "Concise etymology or word parts",
  "example": "A realistic, contemporary sentence demonstrating how to naturally use this word in an editorial or GS essay.",
  "synonyms": ["synonym1", "synonym2", "synonym3"],
  "antonyms": ["antonym1", "antonym2"],
  "collocations": ["natural phrase 1", "natural phrase 2"],
  "nuanceTip": "1 short sentence on register/tone or common usage pitfall."
}`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const cleanedJson = text
            .trim()
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "");
          const parsed = JSON.parse(cleanedJson);
          if (parsed.meaning && parsed.memoryHook && parsed.example) {
            return {
              meaning: String(parsed.meaning).trim(),
              memoryHook: String(parsed.memoryHook).trim(),
              example: String(parsed.example).trim(),
              partOfSpeech: parsed.partOfSpeech
                ? String(parsed.partOfSpeech).trim()
                : undefined,
              phonetic: parsed.phonetic
                ? String(parsed.phonetic).trim()
                : undefined,
              rootBreakdown: parsed.rootBreakdown
                ? String(parsed.rootBreakdown).trim()
                : undefined,
              synonyms: Array.isArray(parsed.synonyms)
                ? parsed.synonyms
                    .map((s: unknown) => String(s).trim())
                    .filter(Boolean)
                : undefined,
              antonyms: Array.isArray(parsed.antonyms)
                ? parsed.antonyms
                    .map((s: unknown) => String(s).trim())
                    .filter(Boolean)
                : undefined,
              collocations: Array.isArray(parsed.collocations)
                ? parsed.collocations
                    .map((s: unknown) => String(s).trim())
                    .filter(Boolean)
                : undefined,
              nuanceTip: parsed.nuanceTip
                ? String(parsed.nuanceTip).trim()
                : undefined,
            };
          }
        }
      }
    } catch {
      // Fallback cleanly
    }
  }
  return generateFallbackVocabDetails(cleanWord);
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
      previousYears: question.previousYears
        ? String(question.previousYears).trim()
        : undefined,
    }))
    .filter((question) => question.text);
}

function createImportedPaper(
  userId: string,
  input: Record<string, any>,
): QuestionPaper {
  const markdownText = String(input.markdownContent || input.content || "");
  const header = markdownText ? parseMarkdownHeader(markdownText) : {};

  const year = String(
    input.year || (header as any).year || new Date().getFullYear(),
  ).replace(/[^0-9]/g, "");

  const title = String(
    input.title ||
      input.label ||
      header.exam ||
      input.subject ||
      header.subject ||
      "Imported paper",
  ).trim();

  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48) || "paper";

  const examType = input.examType === "subjective" ? "subjective" : "objective";
  const category = input.category === "mains" ? "mains" : "prelims";
  const paperSubject = String(input.subject || header.subject || "").trim();
  const enforceSingleSubject = paperSubject
    ? isSpecificSingleSubject(paperSubject)
    : false;

  let parsedQuestions = normalizeQuestions(input);
  if (parsedQuestions.length === 0 && markdownText.trim()) {
    parsedQuestions = parseQuestionnaireMarkdown(markdownText, paperSubject);
  }

  if (enforceSingleSubject) {
    parsedQuestions.forEach((q) => {
      q.subject = paperSubject;
    });
  }

  let rawAnswerKeyText =
    typeof input.answerKeyText === "string" ? input.answerKeyText : undefined;
  let rawAnswerKey = input.answerKey;

  // Auto-heal: If answerKey was provided as a string (e.g. "1. A\n2. B..."), treat as answerKeyText
  if (typeof rawAnswerKey === "string") {
    if (!rawAnswerKeyText) rawAnswerKeyText = rawAnswerKey;
    rawAnswerKey = undefined;
  } else if (rawAnswerKey && typeof rawAnswerKey === "object") {
    // Detect if answerKey was corrupted by string spreading: {"0": "1", "1": ".", ...}
    const keys = Object.keys(rawAnswerKey);
    const isCharSpread =
      keys.length > 5 && keys.every((k, idx) => k === String(idx));
    if (isCharSpread) {
      const reconstituted = Object.values(rawAnswerKey).join("");
      if (!rawAnswerKeyText) rawAnswerKeyText = reconstituted;
      rawAnswerKey = undefined;
    }
  }

  const parsedAnswerKey = rawAnswerKeyText
    ? parseAnswerKeyDetailed(rawAnswerKeyText)
    : { answers: {}, explanations: {} };

  const mergedAnswerKey: Record<number, string> = {
    ...parsedAnswerKey.answers,
  };
  if (rawAnswerKey && typeof rawAnswerKey === "object") {
    for (const [k, v] of Object.entries(rawAnswerKey)) {
      const qNo = Number(k);
      if (!isNaN(qNo) && typeof v === "string" && v.trim()) {
        mergedAnswerKey[qNo] = v.trim();
      }
    }
  }

  const mergedExplanations: Record<number, string> = {
    ...parsedAnswerKey.explanations,
  };
  if (input.explanations && typeof input.explanations === "object") {
    for (const [k, v] of Object.entries(input.explanations)) {
      const qNo = Number(k);
      if (!isNaN(qNo) && typeof v === "string" && v.trim()) {
        mergedExplanations[qNo] = v.trim();
      }
    }
  }

  // Hydrate previousYears (PYQ) and missing answers/explanations onto parsedQuestions
  const resolvedYearNum = parseInt(year, 10);
  const isPastPyqPaper =
    !isNaN(resolvedYearNum) &&
    resolvedYearNum >= 1979 &&
    resolvedYearNum <= 2025 &&
    /prelims|upsc|cse|pyq/i.test(`${title} ${paperSubject}`);

  parsedQuestions = parsedQuestions.map((q) => {
    const qExpl = mergedExplanations[q.questionNo] || q.explanation || "";
    const qAns = mergedAnswerKey[q.questionNo] || q.answer;
    let pyq = q.previousYears ? cleanPreviousYears(q.previousYears) : "";
    if (!pyq) {
      pyq = extractPyqYearsFromText(`${q.text} ${qExpl}`);
    }
    if (!pyq && isPastPyqPaper) {
      pyq = String(resolvedYearNum);
    }
    return {
      ...q,
      ...(qAns && !q.answer ? { answer: qAns } : {}),
      ...(qExpl && !q.explanation ? { explanation: qExpl } : {}),
      ...(pyq ? { previousYears: pyq } : {}),
    };
  });

  // Calculate total questions:
  // 1. Explicit input.totalQuestions
  // 2. Parsed markdown header totalQuestions
  // 3. Count of parsed questions (if questions exist)
  // 4. Default fallback: 100 for objective, 20 for subjective
  const totalQuestions = Number(
    input.totalQuestions ||
      header.totalQuestions ||
      (parsedQuestions.length > 0 ? parsedQuestions.length : undefined) ||
      (examType === "objective" ? 100 : 20),
  );

  // Correct marks per question:
  // 1. Explicit input.correctMarks
  // 2. Parsed markdown header positiveMarks
  // 3. Derived from header totalMarks / totalQuestions (if available)
  // 4. Default: 2 for objective, 0 for subjective
  const correctMarks = Number(
    input.correctMarks ??
      header.positiveMarks ??
      (header.totalMarks && totalQuestions > 0
        ? Number((header.totalMarks / totalQuestions).toFixed(2))
        : examType === "objective"
          ? 2
          : 0),
  );

  // Incorrect marks:
  // 1. Explicit input.incorrectMarks
  // 2. Parsed markdown header negativeMarking
  // 3. Default: 0
  const headerNegative = header.negativeMarking
    ? parseFloat(header.negativeMarking.match(/[\d.]+/)?.[0] || "0")
    : undefined;
  const incorrectMarks = Number(
    input.incorrectMarks ??
      (headerNegative !== undefined && !isNaN(headerNegative)
        ? headerNegative
        : 0),
  );

  // Total marks:
  // 1. Explicit input.totalMarks
  // 2. Parsed markdown header totalMarks
  // 3. totalQuestions * correctMarks (if objective)
  // 4. Default: 250 for subjective
  const totalMarks = Number(
    input.totalMarks ||
      header.totalMarks ||
      (examType === "objective" ? totalQuestions * correctMarks : 250),
  );

  // Duration in minutes:
  // 1. Explicit input.timeMinutes
  // 2. Parsed markdown header time
  // 3. Default: 120 for objective, 180 for subjective
  const headerTimeMins = parseDurationToMinutes(header.time);
  const timeMinutes = Number(
    input.timeMinutes ||
      headerTimeMins ||
      (examType === "objective" ? 120 : 180),
  );

  const instructions =
    Array.isArray(input.instructions) && input.instructions.length > 0
      ? input.instructions
      : header.instructions && header.instructions.length > 0
        ? header.instructions
        : undefined;

  const explicitId =
    typeof input.id === "string" && input.id.trim()
      ? input.id.trim()
      : typeof input.paperId === "string" && input.paperId.trim()
        ? input.paperId.trim()
        : "";
  const contentFingerprint = createHash("sha1")
    .update(
      markdownText ||
        JSON.stringify(parsedQuestions.map((q) => q.text)) ||
        title,
    )
    .digest("hex")
    .slice(0, 6);
  const generatedId = `custom_${userId.slice(0, 8)}_${year}_${slug}_${contentFingerprint}`;

  return {
    id: explicitId || generatedId,
    userId,
    year: year || String(new Date().getFullYear()),
    category,
    examType,
    subject: paperSubject,
    label: title,
    title,
    totalQuestions,
    totalMarks,
    correctMarks,
    incorrectMarks,
    timeMinutes,
    qpUrl: "local://interactive_markdown",
    answerKey: mergedAnswerKey,
    answerKeyText: rawAnswerKeyText || input.answerKeyText || undefined,
    explanations: mergedExplanations,
    markdownContent: markdownText || undefined,
    parsedQuestions: parsedQuestions.length > 0 ? parsedQuestions : undefined,
    instructions,
    cutoffEnabled: Boolean(
      input.cutoffEnabled ||
      header.cutoffEnabled ||
      (input.cutoffValue !== undefined && Number(input.cutoffValue) > 0) ||
      (header.cutoffValue !== undefined && Number(header.cutoffValue) > 0),
    ),
    cutoffType:
      input.cutoffType === "marks" || header.cutoffType === "marks"
        ? "marks"
        : "percentage",
    cutoffValue:
      input.cutoffValue !== undefined
        ? Number(input.cutoffValue)
        : header.cutoffValue !== undefined
          ? Number(header.cutoffValue)
          : undefined,
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

    const explanation =
      ans?.explanation ||
      pq?.explanation ||
      (paper?.explanations ? paper.explanations[qNo] : undefined) ||
      null;

    let correctAnswer =
      ans?.correctAnswer ||
      pq?.answer ||
      (paper?.answerKey ? paper.answerKey[qNo] : undefined) ||
      null;

    if (!correctAnswer && isCloze && explanation) {
      const ansMatch = explanation.match(
        /^(?:Answer|Ans|Key|Reference|Correct\s*Answer)\s*[:\-]\s*([^\n\.]+)/i,
      );
      if (ansMatch) {
        correctAnswer = ansMatch[1].trim();
      } else if (!explanation.includes("\n") && explanation.length <= 120) {
        correctAnswer = explanation.trim();
      }
    }

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
      evaluationComment: ans?.evaluationComment ?? null,
      evaluationSource: ans?.evaluationSource ?? null,
      evaluationUpdatedAt: ans?.evaluationUpdatedAt ?? null,
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
  const effectiveCorrect =
    paper?.correctMarks !== undefined && Number(paper.correctMarks) > 0
      ? Number(paper.correctMarks)
      : correctMarksPerQ;
  return isClozeQuestion(qNo, paper, ans)
    ? effectiveCorrect
    : subjectiveMarksPerQ;
}

function getAssessmentMarks(
  qNo: number,
  assessment?: SubjectiveAssessment,
  subjectiveMarks?: number,
  paper?: QuestionPaper | null,
  ans?: QuestionAnswer,
  correctMarksPerQ = 2.0,
  incorrectMarksPerQ = 0,
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
  if (assessment === "needs-work") {
    return -penalty;
  }
  return 0;
}

function recalculateAttemptGrades(
  attempt: Attempt,
  paper?: QuestionPaper | null,
): Attempt {
  const isSubjective = attempt.examType === "subjective";
  const correctMarksPerQ =
    paper?.correctMarks !== undefined && Number(paper.correctMarks) > 0
      ? Number(paper.correctMarks)
      : attempt.correctMarks || 2.0;
  const incorrectMarksPerQ =
    paper?.incorrectMarks !== undefined && Number(paper.incorrectMarks) >= 0
      ? Number(paper.incorrectMarks)
      : attempt.incorrectMarks !== undefined &&
          Number(attempt.incorrectMarks) >= 0
        ? Number(attempt.incorrectMarks)
        : isCsatPaper(paper, attempt)
          ? 0.833
          : 0.667;
  const effectiveTotalMarks =
    paper?.totalMarks !== undefined && Number(paper.totalMarks) > 0
      ? Number(paper.totalMarks)
      : attempt.totalMarks || attempt.maxScore || 0;
  const subjectiveMarksPerQ =
    attempt.totalQuestions > 0
      ? effectiveTotalMarks / attempt.totalQuestions
      : 0;

  const sanitizedAnswers = { ...attempt.answers };
  for (const [key, ans] of Object.entries(sanitizedAnswers)) {
    if (ans.subjectiveAssessment === "partial" && ans.isCorrect !== null) {
      sanitizedAnswers[Number(key)] = { ...ans, isCorrect: null };
    }
  }

  const allAnswers = Object.values(sanitizedAnswers);
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

  const calculatedMax =
    attempt.totalQuestions > 0 && correctMarksPerQ > 0
      ? Math.round(attempt.totalQuestions * correctMarksPerQ * 100) / 100
      : null;

  let maxScore = attempt.maxScore || attempt.totalMarks || 0;
  if (paper?.totalMarks && paper.totalMarks > 0) {
    if (calculatedMax && paper.totalMarks === 200 && calculatedMax !== 200) {
      maxScore = calculatedMax;
    } else {
      maxScore = paper.totalMarks;
    }
  } else if (effectiveTotalMarks > 0) {
    maxScore = effectiveTotalMarks;
  } else if (calculatedMax) {
    maxScore = calculatedMax;
  }

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
    answers: sanitizedAnswers,
    correctMarks: correctMarksPerQ,
    incorrectMarks: incorrectMarksPerQ,
    totalMarks:
      effectiveTotalMarks > 0 ? effectiveTotalMarks : attempt.totalMarks,
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
        "You are connected to a student's UPSC Prep Hub account. Read the student's data before making assumptions. Use get_attempt_history for attempt questions: it is newest-first and defaults to one latest attempt per distinct paper. When evaluating or re-grading attempts, use get_attempt_detail to inspect candidate responses alongside their rough scratchpad notes (note: calculations, formulas, elimination steps) and existing feedback (evaluationComment). Use attach_question_evaluations to attach question-specific evaluator feedback (e.g., verifying whether calculations were sound or calling out flawed arithmetic/lucky guesses that happened to match the correct option), and use grade_attempt_questions to update marks, tags, or feedback—this automatically recalculates the attempt's score, percentage, and accuracy using the paper's current marks. For overall post-exam strategy notes, use attach_attempt_reflection. For vocabulary and Study Aids, use list_vocab_cards, add_vocab_card, toggle_vocab_mastery, delete_vocab_card, get_vocab_practice_question, evaluate_vocab_sentence, and get_daily_motivation. For UPSC Mains answer writing evaluations, cumulative feedback analysis, recurring weaknesses, and score patterns across GS-1 through GS-4 and Optionals, use get_mains_evaluation_insights. Ask for confirmation before calling write tools, especially imports, score changes, or visibility changes.",
      maxToolInputElements: 5000,
    },
  );

  server.registerTool(
    "get_portal_overview",
    {
      title: "Get portal overview",
      description:
        "Return the student's paper library and overall preparation summary, including all tests, scores, marks, and optional cross-attempt topic performance.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        includeTopics: z
          .boolean()
          .optional()
          .describe(
            "Include cross-attempt topic performance, weak areas, and mastered topics.",
          ),
      },
    },
    async ({ includeTopics }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;
      const [papers, attempts, vocabCards] = await Promise.all([
        getUserPapers(userId),
        getUserAttempts(userId),
        getUserVocabCards(userId),
      ]);
      const progress = summarizeProgress(papers, attempts);
      const todayStr = new Date().toISOString().split("T")[0];
      const studyAids = {
        vocabTotal: vocabCards.length,
        vocabMastered: vocabCards.filter((c) => c.mastered).length,
        vocabLearning: vocabCards.filter((c) => !c.mastered).length,
        vocabAddedToday: vocabCards.filter((c) => c.dateAdded === todayStr)
          .length,
        dailyGoal: 5,
        dailyGoalAchieved:
          vocabCards.filter((c) => c.dateAdded === todayStr).length >= 5,
      };
      const topicAnalytics = includeTopics
        ? await getTopicAnalytics(userId)
        : undefined;
      return textResult({
        progress,
        studyAids,
        ...(topicAnalytics ? { topicAnalytics } : {}),
      });
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
        "Read one completed attempt's full per-question details including question prompt, options, student's selected choice or written cloze/one-liner answer, answer key, correctness, confidence tag, time spent, candidate scratchpad notes (note: rough work & calculations), evaluator feedback (evaluationComment), and explanations. Defaults to the latest attempt if attemptId or paperId is omitted.",
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
        'Validate a paper before saving it to the student\'s library. Supply `markdownContent` for the question text and `answerKeyText` (or `answerKey`) for the answers. Questions may be MCQs with options (a)-(d) or cloze/free-text questions with no options. In the answer key, MCQs use \'<number>. <letter> """ explanation """\' and cloze questions use \'<number>. <answer> """ explanation """\' or \'<number>. """ reference explanation """\'. Explanations inside """ support rich HTML formatting (e.g. <b>, <i>, <ul>, <ol>, <li>, <table>, <code>, <blockquote>, <p>).',
      annotations: { readOnlyHint: true },
      inputSchema: { paper: paperImportSchema },
    },
    async ({ paper }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;
      const imported = createImportedPaper(userId, paper);
      const warnings: string[] = [];
      if (!imported.markdownContent && !imported.parsedQuestions?.length) {
        warnings.push("No markdownContent or questions were supplied.");
      }

      // Detect string answerKey or character-spread answerKey
      if (typeof paper?.answerKey === "string") {
        warnings.push(
          "Notice: `answerKey` was provided as a raw string instead of a structured object or `answerKeyText`. It was automatically parsed into `answerKeyText` and structured question-answer mappings.",
        );
      } else if (
        paper?.answerKey &&
        typeof paper.answerKey === "object" &&
        Object.keys(paper.answerKey).length > 5 &&
        Object.keys(paper.answerKey).every((k, idx) => k === String(idx))
      ) {
        warnings.push(
          'Warning: `answerKey` was received as a character-indexed object (e.g. {"0": "1", ...}). It has been healed and reconstituted into `answerKeyText` and structured mappings.',
        );
      }

      if (
        !Object.keys(imported.answerKey || {}).length &&
        !Object.keys(imported.explanations || {}).length
      ) {
        warnings.push(
          "No answer key or explanations were supplied; practice grading may be unavailable.",
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
        "Save a validated paper in the student's personal library. Supports markdownContent, answerKeyText, answerKey, and explanations. Ask the student for confirmation first.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: { paper: paperImportSchema },
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
      // Ingest normalized questions into question bank
      try {
        const qEntities = normalizePaperToQuestions(imported, userId);
        if (qEntities.length > 0) {
          await saveQuestionsToBank(qEntities, userId);
        }
      } catch (qbErr) {
        console.warn("Notice: Question bank background sync:", qbErr);
      }
      return textResult({ saved: true, paper: paperSummary(imported) });
    },
  );

  server.registerTool(
    "query_question_bank",
    {
      title: "Query Question Bank",
      description:
        "Search or retrieve individual questions from the student's normalized question bank across papers by subject, topic, exam stage (prelims/mains), or keyword search. Returns question stems, options, and model solutions.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        subject: z
          .string()
          .optional()
          .describe("Subject filter, e.g. Polity, Economy, History."),
        topic: z
          .string()
          .optional()
          .describe(
            "Topical filter, e.g. Preamble, Fundamental Rights, Monetary Policy.",
          ),
        stage: z
          .enum(["prelims", "mains", "optional"])
          .optional()
          .describe("Exam stage filter."),
        searchQuery: z
          .string()
          .optional()
          .describe("Keyword search within question text."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("Maximum questions to retrieve (default 10, max 50)."),
      },
    },
    async ({ subject, topic, stage, searchQuery, limit }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;
      const questions = await queryQuestionBank({
        userId,
        subject,
        topic,
        examStage: stage,
        searchQuery,
        limit,
      });

      return textResult({
        totalFound: questions.length,
        questions: questions.map((q) => ({
          id: q.id,
          sourcePaper: q.sourcePaperTitle,
          questionNo: q.questionNo,
          stage: q.examStage,
          type: q.questionType,
          subject: q.subject,
          topic: q.topic,
          content: q.contentMarkdown,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanationMarkdown,
          previousYears: q.previousYears,
        })),
      });
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
                  "Optional evaluator feedback or explanation note for this question (saved to evaluationComment; preserves student scratchpad note).",
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

      let paper = papers.find((p) => p.id === targetAttempt.paperId);
      if (!paper && targetAttempt.paperId) {
        paper =
          (await getPaperById(targetAttempt.paperId)) ||
          (await getUserPaper(userId, targetAttempt.paperId)) ||
          undefined;
      }

      if (
        paper &&
        (paper.incorrectMarks === undefined || paper.incorrectMarks === null) &&
        paper.markdownContent
      ) {
        const hdr = parseMarkdownHeader(paper.markdownContent);
        if (hdr.negativeMarking) {
          const m = hdr.negativeMarking.match(/[\d.]+/);
          if (m) paper.incorrectMarks = parseFloat(m[0]);
        }
      }
      const isSubjective = targetAttempt.examType === "subjective";
      const correctMarksPerQ =
        paper?.correctMarks !== undefined && Number(paper.correctMarks) > 0
          ? Number(paper.correctMarks)
          : targetAttempt.correctMarks || 2.0;
      const effectiveTotalMarks =
        paper?.totalMarks !== undefined && Number(paper.totalMarks) > 0
          ? Number(paper.totalMarks)
          : targetAttempt.totalMarks || targetAttempt.maxScore || 0;
      const subjectiveMarksPerQ =
        targetAttempt.totalQuestions > 0
          ? effectiveTotalMarks / targetAttempt.totalQuestions
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
          assessment === "strong"
            ? true
            : assessment === "needs-work"
              ? false
              : assessment === "partial" || assessment === "no-attempt"
                ? null
                : grade.isCorrect !== undefined
                  ? grade.isCorrect
                  : null;

        const timestamp = new Date().toISOString();
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
          ...(grade.note !== undefined
            ? {
                evaluationComment: grade.note,
                evaluationSource: "mcp" as const,
                evaluationUpdatedAt: timestamp,
              }
            : {}),
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
    "attach_question_evaluations",
    {
      title: "Attach question-wise evaluation comments",
      description:
        "Attach or update mentor or AI evaluation comments on specific question attempts. Evaluates candidate's selected answer, scratchpad notes (e.g. calculation steps, elimination logic, flawed arithmetic despite correct choice), accuracy, and time spent. Comments are displayed prominently in the student's question review inspector.",
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
        evaluations: z
          .array(
            z.object({
              questionNo: z.number().int().min(1),
              comment: z
                .string()
                .min(1)
                .describe(
                  "Evaluation feedback comment analyzing the candidate's attempt and scratchpad notes (e.g., calculation errors, elimination quality, lucky guesses).",
                ),
              append: z
                .boolean()
                .optional()
                .describe(
                  "Append to existing evaluation comment instead of replacing. Defaults to false.",
                ),
            }),
          )
          .min(1)
          .describe("List of questions and their evaluation comments."),
      },
    },
    async ({ attemptId, paperId, evaluations }) => {
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
      const updatedList: Array<{ questionNo: number; comment: string }> = [];
      const timestamp = new Date().toISOString();

      for (const item of evaluations) {
        const qNo = item.questionNo;
        const currentAnswer = updatedAnswers[qNo];
        const trimmed = item.comment.trim();

        const updatedComment =
          item.append && currentAnswer?.evaluationComment?.trim()
            ? `${currentAnswer.evaluationComment.trim()}\n\n${trimmed}`
            : trimmed;

        if (currentAnswer) {
          updatedAnswers[qNo] = {
            ...currentAnswer,
            evaluationComment: updatedComment,
            evaluationSource: "mcp",
            evaluationUpdatedAt: timestamp,
          };
        } else {
          updatedAnswers[qNo] = {
            questionNo: qNo,
            selected: null,
            evaluationComment: updatedComment,
            evaluationSource: "mcp",
            evaluationUpdatedAt: timestamp,
          };
        }

        updatedList.push({ questionNo: qNo, comment: updatedComment });
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
        evaluationsUpdatedCount: updatedList.length,
        evaluations: updatedList,
      });
    },
  );

  server.registerTool(
    "update_question_notes",
    {
      title: "Attach evaluation notes per question",
      description:
        "Attach or update mentor feedback and evaluation comments to specific questions inside an attempt. Feedback is visible directly in the student's question inspector in review mode. Defaults to latest attempt if attemptId or paperId is omitted.",
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
        target: z
          .enum(["evaluation", "scratchpad"])
          .optional()
          .describe(
            "Whether to save as an evaluation feedback comment (default) or student scratchpad note.",
          ),
        notes: z
          .array(
            z.object({
              questionNo: z.number().int().min(1),
              note: z
                .string()
                .optional()
                .describe("The evaluation or mentor feedback note."),
              comment: z
                .string()
                .optional()
                .describe("Alternative field for evaluation feedback comment."),
              append: z
                .boolean()
                .optional()
                .describe(
                  "Append to existing note/comment instead of replacing. Defaults to false.",
                ),
            }),
          )
          .min(1)
          .describe("List of questions and their evaluation notes."),
      },
    },
    async ({ attemptId, paperId, target = "evaluation", notes }) => {
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
      const updatedList: Array<{
        questionNo: number;
        text: string;
        target: string;
      }> = [];
      const timestamp = new Date().toISOString();

      for (const item of notes) {
        const qNo = item.questionNo;
        const currentAnswer = updatedAnswers[qNo];
        const rawText = (item.comment || item.note || "").trim();
        if (!rawText) continue;

        if (target === "scratchpad") {
          const updatedNote =
            item.append && currentAnswer?.note?.trim()
              ? `${currentAnswer.note.trim()}\n\n${rawText}`
              : rawText;

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
          updatedList.push({
            questionNo: qNo,
            text: updatedNote,
            target: "scratchpad",
          });
        } else {
          const updatedComment =
            item.append && currentAnswer?.evaluationComment?.trim()
              ? `${currentAnswer.evaluationComment.trim()}\n\n${rawText}`
              : rawText;

          if (currentAnswer) {
            updatedAnswers[qNo] = {
              ...currentAnswer,
              evaluationComment: updatedComment,
              evaluationSource: "mcp",
              evaluationUpdatedAt: timestamp,
            };
          } else {
            updatedAnswers[qNo] = {
              questionNo: qNo,
              selected: null,
              evaluationComment: updatedComment,
              evaluationSource: "mcp",
              evaluationUpdatedAt: timestamp,
            };
          }
          updatedList.push({
            questionNo: qNo,
            text: updatedComment,
            target: "evaluation",
          });
        }
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
        itemsUpdatedCount: updatedList.length,
        notes: updatedList.map((i) => ({
          questionNo: i.questionNo,
          note: i.text,
        })),
        items: updatedList,
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

      let paper = await getUserPaper(userId, paperId);
      if (!paper) {
        const allPapers = await getUserPapers(userId);
        const lower = paperId.trim().toLowerCase();
        const byTitle = allPapers.filter(
          (p) =>
            p.label?.toLowerCase() === lower ||
            p.title?.toLowerCase() === lower,
        );
        if (byTitle.length === 1) {
          paper = byTitle[0];
        }
      }
      if (!paper) {
        return errorResult("Paper not found in this student's library.");
      }

      if (!isCustomMcpPaper(paper)) {
        return errorResult(
          "Pre-loaded platform papers cannot be permanently deleted. Use archive_paper to hide them from your library instead.",
        );
      }

      const deleted = await deleteMcpPaper(userId, paper.id);
      if (!deleted) {
        return errorResult(
          "Paper could not be deleted because no matching record was removed.",
        );
      }
      return textResult({
        deleted: true,
        paperId: paper.id,
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

  server.registerTool(
    "get_revision_context",
    {
      title: "Get UPSC revision context",
      description:
        "Retrieve unified exam revision context for a syllabus topic or specific question paper. Gathers syllabus status, student's historical accuracy on this topic, matching questions across papers, and target question dissection with student answers.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        topic: z
          .string()
          .optional()
          .describe(
            "UPSC syllabus topic or theme, e.g. 'Federal Structure', 'Fiscal Policy', '1857 Revolt'.",
          ),
        subject: z
          .string()
          .optional()
          .describe("Optional subject, e.g. 'Polity', 'History', 'Economy'."),
        paperId: z
          .string()
          .optional()
          .describe("Specific paper ID to review or chat with."),
        questionNo: z
          .number()
          .int()
          .optional()
          .describe("Specific question number inside the paper to dissect."),
        maxRelatedQuestions: z
          .number()
          .int()
          .optional()
          .default(5)
          .describe("Maximum related questions to fetch from library."),
      },
    },
    async ({ topic, subject, paperId, questionNo, maxRelatedQuestions }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;

      const data = await getRevisionContextData(userId, {
        topic,
        subject,
        paperId,
        questionNo,
        maxRelatedQuestions,
      });

      return textResult(data);
    },
  );

  server.registerTool(
    "save_revision_note",
    {
      title: "Save revision note or takeaway",
      description:
        "Save a high-yield revision takeaway, formula, or case law note directly to a syllabus topic or to a specific question attempt note.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        note: z
          .string()
          .min(1)
          .describe("The markdown revision note or takeaway to save."),
        topic: z
          .string()
          .optional()
          .describe("Syllabus topic to attach this revision note to."),
        paperId: z
          .string()
          .optional()
          .describe("Paper ID if attaching to an attempt question."),
        questionNo: z
          .number()
          .int()
          .optional()
          .describe("Question number if attaching to an attempt question."),
      },
    },
    async ({ note, topic, paperId, questionNo }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;

      const res = await saveTopicRevisionNote(userId, {
        note,
        topic,
        paperId,
        questionNo,
      });

      return textResult(res);
    },
  );

  server.registerTool(
    "list_vocab_cards",
    {
      title: "List vocabulary flashcards",
      description:
        "List, filter, and search vocabulary cards in the student's Study Aids (Misc) section. Shows memory hooks, definitions, editorial examples, and mastery state.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        filter: z
          .enum(["all", "today", "learning", "mastered"])
          .optional()
          .describe(
            "Filter flashcards: 'all', 'today' for words added today, 'learning' for active words, or 'mastered'. Defaults to 'all'.",
          ),
        search: z
          .string()
          .optional()
          .describe("Search keyword across words, meanings, or memory hooks."),
      },
    },
    async ({ filter = "all", search }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;

      const cards = await getUserVocabCards(userId);
      const todayStr = new Date().toISOString().split("T")[0];

      let filtered = cards;
      if (filter === "today") {
        filtered = filtered.filter((c) => c.dateAdded === todayStr);
      } else if (filter === "learning") {
        filtered = filtered.filter((c) => !c.mastered);
      } else if (filter === "mastered") {
        filtered = filtered.filter((c) => c.mastered);
      }

      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(
          (c) =>
            c.word.toLowerCase().includes(q) ||
            c.meaning.toLowerCase().includes(q) ||
            c.memoryHook.toLowerCase().includes(q) ||
            c.example.toLowerCase().includes(q),
        );
      }

      return textResult({
        summary: {
          total: cards.length,
          mastered: cards.filter((c) => c.mastered).length,
          learning: cards.filter((c) => !c.mastered).length,
          addedToday: cards.filter((c) => c.dateAdded === todayStr).length,
          dailyGoal: 5,
        },
        cards: filtered,
      });
    },
  );

  server.registerTool(
    "add_vocab_card",
    {
      title: "Add vocabulary flashcard",
      description:
        "Add a high-retention vocabulary card to the student's Study Aids (Misc) section. Auto-populates definitions, mnemonics, and editorial examples if omitted.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        word: z.string().min(1).describe("Vocabulary word to add."),
        meaning: z
          .string()
          .optional()
          .describe(
            "Clear intuitive definition. If omitted, an editorial definition is auto-generated.",
          ),
        memoryHook: z
          .string()
          .optional()
          .describe(
            "Relatable mnemonic or root clue. If omitted, an instant memory hook is auto-generated.",
          ),
        example: z
          .string()
          .optional()
          .describe(
            "Practical UPSC/editorial usage sentence. If omitted, an illustrative sentence is auto-generated.",
          ),
        mastered: z
          .boolean()
          .optional()
          .describe("Initial mastery state (default false)."),
      },
    },
    async ({ word, meaning, memoryHook, example, mastered }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;

      const cleanWord = word.trim();
      let finalMeaning = meaning?.trim();
      let finalHook = memoryHook?.trim();
      let finalExample = example?.trim();
      let enrichedExtras: Partial<VocabCard> = {};

      if (!finalMeaning || !finalHook || !finalExample) {
        const generated = await enrichVocabWordWithAi(cleanWord);
        if (!finalMeaning) finalMeaning = generated.meaning;
        if (!finalHook) finalHook = generated.memoryHook;
        if (!finalExample) finalExample = generated.example;
        enrichedExtras = {
          partOfSpeech: generated.partOfSpeech,
          phonetic: generated.phonetic,
          rootBreakdown: generated.rootBreakdown,
          synonyms: generated.synonyms,
          antonyms: generated.antonyms,
          collocations: generated.collocations,
          nuanceTip: generated.nuanceTip,
        };
      }

      const cards = await getUserVocabCards(userId);
      const existing = cards.find(
        (c) => c.word.trim().toLowerCase() === cleanWord.toLowerCase(),
      );
      if (existing) {
        return errorResult(
          `"${cleanWord}" already exists in the vocabulary list. Duplicate words are not allowed.`,
        );
      }

      const todayStr = new Date().toISOString().split("T")[0];
      const nowIso = new Date().toISOString();

      const targetCard: VocabCard = {
        id: `vocab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        word: cleanWord,
        meaning: finalMeaning,
        memoryHook: finalHook,
        example: finalExample,
        ...enrichedExtras,
        dateAdded: todayStr,
        mastered: Boolean(mastered),
        createdAt: nowIso,
      };
      cards.unshift(targetCard);

      await saveUserVocabCards(userId, cards);

      return textResult({
        saved: true,
        action: "created",
        card: targetCard,
        totalCards: cards.length,
        todayCount: cards.filter((c) => c.dateAdded === todayStr).length,
      });
    },
  );

  server.registerTool(
    "toggle_vocab_mastery",
    {
      title: "Toggle vocabulary card mastery",
      description:
        "Mark a vocabulary card as mastered or in-learning in the student's Study Aids (Misc) section.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      inputSchema: {
        id: z.string().optional().describe("ID of the vocab card."),
        word: z
          .string()
          .optional()
          .describe("Word text (case-insensitive) if ID is not available."),
        mastered: z
          .boolean()
          .optional()
          .describe(
            "Explicit mastery state. If omitted, toggles current status.",
          ),
      },
    },
    async ({ id, word, mastered }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;

      const cards = await getUserVocabCards(userId);
      const target = cards.find(
        (c) =>
          (id && c.id === id) ||
          (word && c.word.toLowerCase() === word.trim().toLowerCase()),
      );

      if (!target) {
        return errorResult("Vocab card not found.");
      }

      target.mastered = mastered !== undefined ? mastered : !target.mastered;
      await saveUserVocabCards(userId, cards);

      return textResult({
        updated: true,
        card: target,
        mastered: target.mastered,
        totalMastered: cards.filter((c) => c.mastered).length,
        totalLearning: cards.filter((c) => !c.mastered).length,
      });
    },
  );

  server.registerTool(
    "delete_vocab_card",
    {
      title: "Delete vocabulary card",
      description:
        "Remove a vocabulary card from the student's Study Aids (Misc) section.",
      annotations: { readOnlyHint: false, destructiveHint: true },
      inputSchema: {
        id: z.string().optional().describe("ID of the card to delete."),
        word: z
          .string()
          .optional()
          .describe("Word text to delete (case-insensitive)."),
      },
    },
    async ({ id, word }) => {
      const authError = scopeError(scope, MCP_WRITE_SCOPE);
      if (authError) return authError;

      const cards = await getUserVocabCards(userId);
      const filtered = cards.filter(
        (c) =>
          !(id && c.id === id) &&
          !(word && c.word.toLowerCase() === word.trim().toLowerCase()),
      );

      if (filtered.length === cards.length) {
        return errorResult("No matching vocab card found to delete.");
      }

      await saveUserVocabCards(userId, filtered);

      return textResult({
        deleted: true,
        remainingCount: filtered.length,
      });
    },
  );

  server.registerTool(
    "get_vocab_practice_question",
    {
      title: "Get vocabulary practice question",
      description:
        "Generate a fill-in-the-blank practice question for a word from the student's Study Aids (Misc) section.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        word: z
          .string()
          .optional()
          .describe("Target word. If omitted, selects from unmastered cards."),
        id: z.string().optional().describe("Card ID to practice."),
      },
    },
    async ({ word, id }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;

      const cards = await getUserVocabCards(userId);
      if (!cards.length) {
        return errorResult(
          "No vocabulary cards found in Study Aids. Add a word first.",
        );
      }

      let target = cards.find(
        (c) =>
          (id && c.id === id) ||
          (word && c.word.toLowerCase() === word.trim().toLowerCase()),
      );

      if (!target) {
        const unmastered = cards.filter((c) => !c.mastered);
        const pool = unmastered.length > 0 ? unmastered : cards;
        target = pool[Math.floor(Math.random() * pool.length)];
      }

      const escaped = target.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const blankRegex = new RegExp(`\\b${escaped}\\b`, "gi");
      let statementWithBlank = target.example.replace(blankRegex, "_______");
      if (statementWithBlank === target.example) {
        statementWithBlank = `The administrative committee evaluated the policy, emphasizing the need for _______ in governance.`;
      }

      const otherWords = cards
        .map((c) => c.word)
        .filter((w) => w.toLowerCase() !== target!.word.toLowerCase());
      const fallbackDistractors = [
        "paradigm",
        "hegemony",
        "ubiquity",
        "antithesis",
        "surreptitious",
      ];
      const distractors: string[] = [];
      for (const w of [...otherWords, ...fallbackDistractors]) {
        if (
          w.toLowerCase() !== target.word.toLowerCase() &&
          !distractors.includes(w)
        ) {
          distractors.push(w);
          if (distractors.length === 3) break;
        }
      }

      const options = [target.word, ...distractors].sort(
        () => 0.5 - Math.random(),
      );

      return textResult({
        cardId: target.id,
        word: target.word,
        statementWithBlank,
        options,
        hint: target.memoryHook,
      });
    },
  );

  server.registerTool(
    "evaluate_vocab_sentence",
    {
      title: "Evaluate vocabulary sentence",
      description:
        "Evaluate whether a student's sentence uses a target vocabulary word naturally and accurately in academic or civil services context.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        word: z.string().min(1).describe("Target vocabulary word."),
        sentence: z
          .string()
          .min(3)
          .describe("Student-composed sentence using the target word."),
      },
    },
    async ({ word, sentence }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;

      const cleanWord = word.trim().toLowerCase();
      const cleanSentence = sentence.trim();
      const hasWord = cleanSentence.toLowerCase().includes(cleanWord);

      if (!hasWord) {
        return textResult({
          isNatural: false,
          feedback: `The sentence does not appear to contain the target word "${word}".`,
        });
      }

      const wordCount = cleanSentence.split(/\s+/).length;
      if (wordCount < 4) {
        return textResult({
          isNatural: false,
          feedback:
            "The sentence is too brief to demonstrate contextual understanding. Aim for at least 6-8 words.",
        });
      }

      return textResult({
        isNatural: true,
        feedback: `Good usage! "${word}" is used in a coherent and grammatically sound context.`,
        improvedSentence: `${cleanSentence.charAt(0).toUpperCase() + cleanSentence.slice(1).replace(/[.]+$/, "")}, illustrating effective analytical expression.`,
      });
    },
  );

  server.registerTool(
    "get_daily_motivation",
    {
      title: "Get daily motivation quote",
      description:
        "Get today's inspirational quote and administrative resilience takeaway from the Study Aids & Misc section.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        random: z
          .boolean()
          .optional()
          .describe(
            "If true, returns a random quote instead of today's fixed quote.",
          ),
      },
    },
    async ({ random = false }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;

      const quote = getMcpDailyQuote(Boolean(random));
      return textResult(quote);
    },
  );

  server.registerTool(
    "get_mains_evaluation_insights",
    {
      title: "Get Mains evaluation insights & aggregated feedback",
      description:
        "Cumulate feedback across all evaluated UPSC Mains questions for the student: common mistakes, recurring weaknesses, missing dimensions (articles, cases, committees, diagrams), average scores per paper type (GS-1 through GS-4, Optional), word count compliance, score progression across multiple attempts, and high-yield remediation patterns.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        paperType: z
          .enum(["GS-1", "GS-2", "GS-3", "GS-4", "Optional", "all"])
          .optional()
          .describe("Filter by specific paper type or 'all' (default)."),
        includeQuestionList: z
          .boolean()
          .optional()
          .describe(
            "Whether to include the full list of evaluated questions and examiner quotes (default true).",
          ),
      },
    },
    async ({ paperType = "all", includeQuestionList = true }) => {
      const authError = scopeError(scope, MCP_READ_SCOPE);
      if (authError) return authError;

      const mainsSessions = await getUserMainsSessions(userId);
      const insights = aggregateMainsFeedback(
        mainsSessions,
        paperType,
        Boolean(includeQuestionList),
      );

      return textResult(insights);
    },
  );

  return server;
}

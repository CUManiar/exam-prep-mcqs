import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Attempt, ParsedQuestion, QuestionPaper } from "./types";
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
    hasAnswerKey: Object.keys(paper.answerKey || {}).length > 0,
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
  const parsedQuestions = normalizeQuestions(input);
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
    answerKey: input.answerKey || {},
    answerKeyText: input.answerKeyText,
    explanations: input.explanations || {},
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
    recentAttempts: attempts.slice(0, 10).map((attempt) => ({
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

export function createPortalMcpServer(
  userId: string,
  scope: string,
): McpServer {
  const server = new McpServer(
    { name: "UPSC Prep Hub", version: "1.0.0" },
    {
      instructions:
        "You are connected to a student's UPSC Prep Hub account. Read the student's data before making assumptions. Ask for confirmation before calling write tools, especially imports, score changes, or visibility changes.",
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
        "Validate a paper before saving it to the student's library.",
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
      if (!Object.keys(imported.answerKey || {}).length) {
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

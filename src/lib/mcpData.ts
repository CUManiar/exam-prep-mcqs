import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Attempt, ParsedQuestion, QuestionPaper, SyllabusItem } from "./types";
import {
  INITIAL_PAPERS,
  getStandardTimeMinutes,
  isUserUploadedPaper,
} from "./defaults";
import { readJsonStore, writeJsonStore } from "./cloudStorage";

let adminClient: SupabaseClient | null | undefined;
const memoryHiddenPaperIds = new Map<string, string[]>();
const memoryOnlyCustomPapers = new Map<string, boolean>();
const memorySyllabus = new Map<string, SyllabusItem[]>();
const memorySyllabusMarkdown = new Map<string, string>();

function getAdminClient(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  adminClient =
    url && serviceRoleKey
      ? createClient(url, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;
  return adminClient;
}

function normalizePaper(row: Record<string, any>): QuestionPaper {
  const label = row.label || row.title || row.subject || "Imported paper";
  const paper: QuestionPaper = {
    id: row.id,
    userId: row.user_id || row.userId,
    year: String(row.year || new Date().getFullYear()),
    category: row.stage || row.category || "prelims",
    examType: row.exam_type || row.examType || "objective",
    subject: row.subject || label,
    label,
    title: row.title || label,
    totalQuestions: Number(row.total_questions ?? row.totalQuestions) || 0,
    totalMarks: Number(row.total_marks ?? row.totalMarks) || 0,
    correctMarks: Number(row.correct_marks ?? row.correctMarks) || 0,
    incorrectMarks: Number(row.incorrect_marks ?? row.incorrectMarks) || 0,
    timeMinutes: Number(row.time_minutes ?? row.timeMinutes) || 0,
    qpUrl: row.qp_url || row.qpUrl || "local://interactive_markdown",
    akUrl: row.ak_url || row.akUrl || undefined,
    exsUrl: row.exs_url || row.exsUrl || undefined,
    answerKey: row.answer_key || row.answerKey || {},
    answerKeyText: row.answer_key_text || row.answerKeyText || undefined,
    explanations: row.explanations || {},
    markdownContent: row.markdown_content || row.markdownContent || undefined,
    parsedQuestions: row.parsed_questions || row.parsedQuestions || undefined,
    instructions: row.instructions || undefined,
    cutoffEnabled: Boolean(row.cutoff_enabled ?? row.cutoffEnabled),
    cutoffType: row.cutoff_type === "marks" ? "marks" : "percentage",
    cutoffValue:
      row.cutoff_value === null || row.cutoff_value === undefined
        ? undefined
        : Number(row.cutoff_value),
    isCustom: Boolean(
      row.is_custom ?? row.isCustom ?? row.user_id ?? row.userId,
    ),
  };
  if (!paper.timeMinutes) {
    paper.timeMinutes = getStandardTimeMinutes(paper.category, paper.examType);
  }
  if (!paper.totalMarks && paper.totalQuestions && paper.correctMarks) {
    paper.totalMarks = paper.totalQuestions * paper.correctMarks;
  }
  return paper;
}

export async function getUserProfileData(userId: string): Promise<{
  hiddenPaperIds: string[];
  onlyCustomPapers: boolean;
  syllabus: SyllabusItem[];
  syllabusMarkdown: string;
}> {
  const supabase = getAdminClient();
  if (!supabase) {
    return {
      hiddenPaperIds: memoryHiddenPaperIds.get(userId) || [],
      onlyCustomPapers: memoryOnlyCustomPapers.get(userId) || false,
      syllabus: memorySyllabus.get(userId) || [],
      syllabusMarkdown: memorySyllabusMarkdown.get(userId) || "",
    };
  }
  const { data } = await supabase
    .from("profiles")
    .select(
      "hidden_paper_ids, only_custom_papers, custom_syllabus, custom_syllabus_markdown",
    )
    .eq("id", userId)
    .maybeSingle();
  return {
    hiddenPaperIds: Array.isArray(data?.hidden_paper_ids)
      ? data.hidden_paper_ids
      : [],
    onlyCustomPapers: Boolean(data?.only_custom_papers),
    syllabus: Array.isArray(data?.custom_syllabus) ? data.custom_syllabus : [],
    syllabusMarkdown: data?.custom_syllabus_markdown || "",
  };
}

export async function getUserPapers(userId: string): Promise<QuestionPaper[]> {
  const supabase = getAdminClient();
  let custom: QuestionPaper[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("custom_papers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    custom = (data || []).map((row) => normalizePaper(row));
  } else {
    const stored = await readJsonStore<Record<string, QuestionPaper>>(
      "papers.json",
      {},
    );
    custom = Object.values(stored)
      .filter((paper) => paper?.userId === userId)
      .map((paper) => normalizePaper(paper));
  }

  const { hiddenPaperIds, onlyCustomPapers } = await getUserProfileData(userId);
  const visibleDefaults = onlyCustomPapers
    ? []
    : INITIAL_PAPERS.filter((paper) => !hiddenPaperIds.includes(paper.id));
  return [...custom, ...visibleDefaults].map((paper) => {
    const normalized = normalizePaper(paper);
    if (normalized.markdownContent && !normalized.parsedQuestions) {
      normalized.parsedQuestions = [];
    }
    return normalized;
  });
}

export async function getUserPaper(
  userId: string,
  paperId: string,
): Promise<QuestionPaper | null> {
  const papers = await getUserPapers(userId);
  return papers.find((paper) => paper.id === paperId) || null;
}

export async function searchMcpPapers(
  userId: string,
  query: string,
  paperId?: string,
): Promise<
  Array<{
    paperId: string;
    paperTitle: string;
    questionNo?: number;
    text: string;
    source: "question" | "markdown";
  }>
> {
  const normalizedQuery = query.trim().toLowerCase();
  const papers = await getUserPapers(userId);
  const matches: Array<{
    paperId: string;
    paperTitle: string;
    questionNo?: number;
    text: string;
    source: "question" | "markdown";
  }> = [];

  for (const paper of papers) {
    if (paperId && paper.id !== paperId) continue;
    for (const question of paper.parsedQuestions || []) {
      if (question.text.toLowerCase().includes(normalizedQuery)) {
        matches.push({
          paperId: paper.id,
          paperTitle: paper.label,
          questionNo: question.questionNo,
          text: question.text,
          source: "question",
        });
      }
      if (matches.length >= 50) return matches;
    }
    if (
      paper.markdownContent &&
      paper.markdownContent.toLowerCase().includes(normalizedQuery)
    ) {
      const index = paper.markdownContent
        .toLowerCase()
        .indexOf(normalizedQuery);
      const start = Math.max(0, index - 160);
      matches.push({
        paperId: paper.id,
        paperTitle: paper.label,
        text: paper.markdownContent.slice(start, start + 420),
        source: "markdown",
      });
    }
    if (matches.length >= 50) return matches;
  }
  return matches;
}

export async function getUserAttempts(userId: string): Promise<Attempt[]> {
  const supabase = getAdminClient();
  if (supabase) {
    const { data } = await supabase
      .from("attempts")
      .select("payload")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });
    return sortAttemptsLatestFirst(
      (data || []).map((row) => row.payload as Attempt),
    );
  }
  const attempts = await readJsonStore<Attempt[]>("attempts.json", []);
  return sortAttemptsLatestFirst(
    attempts.filter((attempt) => attempt.userId === userId),
  );
}

/** Return attempts newest-first regardless of storage backend or row order. */
export function sortAttemptsLatestFirst(attempts: Attempt[]): Attempt[] {
  return [...attempts].sort((a, b) => {
    const bTime = Date.parse(b.finishedAt || b.startedAt);
    const aTime = Date.parse(a.finishedAt || a.startedAt);
    if (Number.isFinite(bTime) && Number.isFinite(aTime) && bTime !== aTime) {
      return bTime - aTime;
    }
    if (Number.isFinite(bTime) !== Number.isFinite(aTime)) {
      return Number.isFinite(bTime) ? -1 : 1;
    }
    return String(b.id).localeCompare(String(a.id));
  });
}

export async function saveMcpPaper(
  userId: string,
  paper: QuestionPaper,
): Promise<void> {
  const supabase = getAdminClient();
  const title =
    paper.label || paper.title || `${paper.year} – ${paper.subject}`;
  if (supabase) {
    const { error } = await supabase.from("custom_papers").upsert({
      id: paper.id,
      user_id: userId,
      title,
      year: Number(paper.year) || new Date().getFullYear(),
      subject: paper.subject || title,
      stage: paper.category,
      exam_type: paper.examType,
      label: title,
      total_questions: paper.totalQuestions,
      total_marks: paper.totalMarks,
      correct_marks: paper.correctMarks,
      incorrect_marks: paper.incorrectMarks,
      time_minutes: paper.timeMinutes,
      qp_url: paper.qpUrl || "local://interactive_markdown",
      ak_url: paper.akUrl || null,
      exs_url: paper.exsUrl || null,
      answer_key: paper.answerKey || {},
      answer_key_text: paper.answerKeyText || null,
      markdown_content: paper.markdownContent || null,
      parsed_questions: paper.parsedQuestions || null,
      instructions: paper.instructions || [],
      explanations: paper.explanations || {},
      cutoff_enabled: Boolean(paper.cutoffEnabled),
      cutoff_type: paper.cutoffType || "percentage",
      cutoff_value: paper.cutoffValue ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error("The paper could not be saved.");
    return;
  }

  const stored = await readJsonStore<Record<string, QuestionPaper>>(
    "papers.json",
    {},
  );
  stored[paper.id] = { ...paper, userId, isCustom: true };
  await writeJsonStore("papers.json", stored);
}

export async function deleteMcpPaper(
  userId: string,
  paperId: string,
): Promise<boolean> {
  const supabase = getAdminClient();
  if (supabase) {
    const { error } = await supabase
      .from("custom_papers")
      .delete()
      .eq("id", paperId)
      .eq("user_id", userId);
    if (error) throw new Error("The paper could not be deleted.");
  } else {
    const stored = await readJsonStore<Record<string, QuestionPaper>>(
      "papers.json",
      {},
    );
    if (stored[paperId] && stored[paperId].userId === userId) {
      delete stored[paperId];
      await writeJsonStore("papers.json", stored);
    }
  }

  // Also remove from hidden_paper_ids if it was archived
  const { hiddenPaperIds } = await getUserProfileData(userId);
  if (hiddenPaperIds.includes(paperId)) {
    const nextHidden = hiddenPaperIds.filter((id) => id !== paperId);
    if (supabase) {
      await supabase
        .from("profiles")
        .update({
          hidden_paper_ids: nextHidden,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    } else {
      memoryHiddenPaperIds.set(userId, nextHidden);
    }
  }

  return true;
}

export async function setPaperArchived(
  userId: string,
  paperId: string,
  archived: boolean,
): Promise<string[]> {
  const { hiddenPaperIds: current } = await getUserProfileData(userId);
  const next = archived
    ? [...new Set([...current, paperId])]
    : current.filter((id) => id !== paperId);
  const supabase = getAdminClient();
  if (supabase) {
    const { error } = await supabase
      .from("profiles")
      .update({
        hidden_paper_ids: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) throw new Error("Paper archiving could not be updated.");
  } else {
    memoryHiddenPaperIds.set(userId, next);
  }
  return next;
}

export async function saveMcpAttempt(
  userId: string,
  attempt: Attempt,
): Promise<void> {
  const ownedAttempt = { ...attempt, userId };
  const supabase = getAdminClient();
  if (supabase) {
    const { error } = await supabase.from("attempts").upsert({
      id: ownedAttempt.id,
      user_id: userId,
      paper_id: ownedAttempt.paperId,
      paper_label: ownedAttempt.paperLabel,
      category: ownedAttempt.category,
      exam_type: ownedAttempt.examType,
      mode: ownedAttempt.mode,
      score: ownedAttempt.score,
      max_score: ownedAttempt.maxScore,
      accuracy_pct: ownedAttempt.accuracyPct,
      started_at: ownedAttempt.startedAt,
      finished_at: ownedAttempt.finishedAt,
      payload: ownedAttempt,
    });
    if (error) throw new Error("The attempt could not be saved.");
    return;
  }

  const attempts = await readJsonStore<Attempt[]>("attempts.json", []);
  const index = attempts.findIndex(
    (existing) => existing.id === attempt.id && existing.userId === userId,
  );
  if (index >= 0) attempts[index] = ownedAttempt;
  else attempts.unshift(ownedAttempt);
  await writeJsonStore("attempts.json", attempts);
}

export async function setPreloadedPapersHidden(
  userId: string,
  hidden: boolean,
): Promise<string[]> {
  const { hiddenPaperIds: current } = await getUserProfileData(userId);
  const defaultIds = new Set(INITIAL_PAPERS.map((paper) => paper.id));
  const next = hidden
    ? [...new Set([...current, ...defaultIds])]
    : current.filter((id) => !defaultIds.has(id));
  const supabase = getAdminClient();
  if (supabase) {
    const { error } = await supabase
      .from("profiles")
      .update({ hidden_paper_ids: next, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error("Paper visibility could not be updated.");
  } else {
    memoryHiddenPaperIds.set(userId, next);
  }
  return next;
}

export async function getUserSyllabus(userId: string): Promise<SyllabusItem[]> {
  return (await getUserProfileData(userId)).syllabus;
}

export async function setOnlyCustomPapers(
  userId: string,
  value: boolean,
): Promise<void> {
  const supabase = getAdminClient();
  if (supabase) {
    const { error } = await supabase
      .from("profiles")
      .update({
        only_custom_papers: value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) throw new Error("Paper visibility could not be updated.");
    return;
  }
  memoryOnlyCustomPapers.set(userId, value);
}

export async function saveMcpSyllabus(
  userId: string,
  items: SyllabusItem[],
): Promise<void> {
  const supabase = getAdminClient();
  if (supabase) {
    const { error } = await supabase
      .from("profiles")
      .update({ custom_syllabus: items, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error("The syllabus could not be saved.");
    return;
  }
  memorySyllabus.set(userId, items);
}

export async function saveMcpSyllabusMarkdown(
  userId: string,
  markdown: string,
  items: SyllabusItem[],
): Promise<void> {
  const supabase = getAdminClient();
  if (supabase) {
    const { error } = await supabase
      .from("profiles")
      .update({
        custom_syllabus: items,
        custom_syllabus_markdown: markdown,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) throw new Error("The syllabus could not be saved.");
    return;
  }
  memorySyllabus.set(userId, items);
  memorySyllabusMarkdown.set(userId, markdown);
}

export function isCustomMcpPaper(paper: QuestionPaper): boolean {
  return isUserUploadedPaper(paper) || Boolean(paper.userId);
}

export interface TopicMetric {
  subject: string;
  chapter: string;
  topic: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  partial: number;
  incorrect: number;
  unattempted: number;
  accuracyPct: number;
  status: "critical" | "practicing" | "mastered";
}

export interface TopicAnalyticsResult {
  summary: {
    totalAttemptsEvaluated: number;
    totalQuestionsAnalyzed: number;
    totalAttempted: number;
    totalCorrect: number;
    overallAccuracyPct: number;
    weakTopicsCount: number;
    masteredTopicsCount: number;
  };
  weakTopics: TopicMetric[];
  strongTopics: TopicMetric[];
  allTopics: TopicMetric[];
  hierarchy: Record<string, Record<string, TopicMetric[]>>;
}

/**
 * Aggregates cross-attempt topic performance across all completed student attempts.
 * Operates in-memory in a single pass O(N) to guarantee minimal server load.
 */
export async function getTopicAnalytics(
  userId: string,
  options?: {
    subject?: string;
    minAttempts?: number;
  },
): Promise<TopicAnalyticsResult> {
  const attempts = await getUserAttempts(userId);
  const papers = await getUserPapers(userId);
  const paperMap = new Map<string, QuestionPaper>(
    papers.map((p) => [p.id, p]),
  );

  const subjectFilter = options?.subject?.trim().toLowerCase();
  const minAttempts = Math.max(0, Number(options?.minAttempts ?? 1));

  interface TopicAccumulator {
    subject: string;
    chapter: string;
    topic: string;
    totalQuestions: number;
    attempted: number;
    correct: number;
    partial: number;
    incorrect: number;
    unattempted: number;
  }

  const topicMap = new Map<string, TopicAccumulator>();

  let evaluatedAttemptsCount = 0;

  for (const attempt of attempts) {
    const paper = paperMap.get(attempt.paperId);
    const parsedQuestionsMap = new Map(
      (paper?.parsedQuestions || []).map((q) => [q.questionNo, q]),
    );

    const answersList = Object.entries(attempt.answers || {});
    if (answersList.length === 0) continue;

    evaluatedAttemptsCount += 1;
    const isSubjective = attempt.examType === "subjective";

    for (const [qNoStr, ans] of answersList) {
      const qNo = Number(qNoStr);
      const pq = parsedQuestionsMap.get(qNo);

      const subject = (
        ans.subject ||
        pq?.subject ||
        paper?.subject ||
        attempt.paperLabel ||
        "General Studies"
      ).trim();

      if (subjectFilter && !subject.toLowerCase().includes(subjectFilter)) {
        continue;
      }

      const chapter = (ans.chapter || pq?.chapter || "General").trim();
      const topic = (ans.topic || pq?.topic || "General").trim();

      const key = `${subject.toLowerCase()}:::${chapter.toLowerCase()}:::${topic.toLowerCase()}`;
      let entry = topicMap.get(key);
      if (!entry) {
        entry = {
          subject,
          chapter,
          topic,
          totalQuestions: 0,
          attempted: 0,
          correct: 0,
          partial: 0,
          incorrect: 0,
          unattempted: 0,
        };
        topicMap.set(key, entry);
      }

      entry.totalQuestions += 1;

      const isAttempted =
        (ans.selected &&
          ans.selected.trim() !== "" &&
          ans.selected !== "no-attempt") ||
        Boolean(
          ans.subjectiveAssessment && ans.subjectiveAssessment !== "no-attempt",
        );

      if (!isAttempted) {
        entry.unattempted += 1;
        continue;
      }

      entry.attempted += 1;

      if (ans.subjectiveAssessment) {
        if (ans.subjectiveAssessment === "strong") {
          entry.correct += 1;
        } else if (ans.subjectiveAssessment === "partial") {
          entry.partial += 1;
        } else if (ans.subjectiveAssessment === "needs-work") {
          entry.incorrect += 1;
        } else {
          entry.partial += 1;
        }
      } else if (ans.isCorrect === true) {
        entry.correct += 1;
      } else if (ans.isCorrect === false) {
        entry.incorrect += 1;
      } else if (isSubjective && ans.selected === "attempted") {
        entry.partial += 1;
      }
    }
  }

  const allTopics: TopicMetric[] = [];
  const hierarchy: Record<string, Record<string, TopicMetric[]>> = {};

  for (const acc of topicMap.values()) {
    if (acc.attempted < minAttempts && minAttempts > 0) {
      continue;
    }

    const accuracyPct =
      acc.attempted > 0
        ? Math.round((acc.correct / acc.attempted) * 100)
        : 0;

    const status: "critical" | "practicing" | "mastered" =
      accuracyPct >= 70
        ? "mastered"
        : accuracyPct >= 50
          ? "practicing"
          : "critical";

    const metric: TopicMetric = {
      subject: acc.subject,
      chapter: acc.chapter,
      topic: acc.topic,
      totalQuestions: acc.totalQuestions,
      attempted: acc.attempted,
      correct: acc.correct,
      partial: acc.partial,
      incorrect: acc.incorrect,
      unattempted: acc.unattempted,
      accuracyPct,
      status,
    };

    allTopics.push(metric);

    if (!hierarchy[metric.subject]) {
      hierarchy[metric.subject] = {};
    }
    if (!hierarchy[metric.subject][metric.chapter]) {
      hierarchy[metric.subject][metric.chapter] = [];
    }
    hierarchy[metric.subject][metric.chapter].push(metric);
  }

  // Sort weak topics: lowest accuracy first, highest attempted count first
  const weakTopics = allTopics
    .filter((t) => t.status === "critical" || t.accuracyPct < 50)
    .sort((a, b) => a.accuracyPct - b.accuracyPct || b.attempted - a.attempted);

  // Sort strong topics: highest accuracy first, highest attempted count first
  const strongTopics = allTopics
    .filter((t) => t.status === "mastered" && t.accuracyPct >= 70)
    .sort((a, b) => b.accuracyPct - a.accuracyPct || b.attempted - a.attempted);

  const totalQuestionsAnalyzed = allTopics.reduce(
    (sum, t) => sum + t.totalQuestions,
    0,
  );
  const totalAttempted = allTopics.reduce((sum, t) => sum + t.attempted, 0);
  const totalCorrect = allTopics.reduce((sum, t) => sum + t.correct, 0);
  const overallAccuracyPct =
    totalAttempted > 0
      ? Math.round((totalCorrect / totalAttempted) * 100)
      : 0;

  return {
    summary: {
      totalAttemptsEvaluated: evaluatedAttemptsCount,
      totalQuestionsAnalyzed,
      totalAttempted,
      totalCorrect,
      overallAccuracyPct,
      weakTopicsCount: weakTopics.length,
      masteredTopicsCount: strongTopics.length,
    },
    weakTopics,
    strongTopics,
    allTopics,
    hierarchy,
  };
}

export interface RevisionContextResult {
  topic?: string;
  subject?: string;
  syllabusMatch?: {
    id: string;
    title: string;
    completed: boolean;
    dueDate?: string;
    notes?: string;
  };
  studentTopicPerformance?: TopicMetric;
  relatedPaperQuestions: Array<{
    paperId: string;
    paperTitle: string;
    questionNo: number;
    text: string;
    options: Record<string, string>;
    answer?: string;
    explanation?: string;
  }>;
  targetQuestion?: {
    paperId: string;
    paperTitle: string;
    question: ParsedQuestion;
    latestAttempt?: {
      selected: string | null;
      isCorrect: boolean | null;
      confidence?: string;
      note?: string;
      timeSpentSeconds?: number;
    };
  };
}

export async function getRevisionContextData(
  userId: string,
  options: {
    topic?: string;
    subject?: string;
    paperId?: string;
    questionNo?: number;
    maxRelatedQuestions?: number;
  },
): Promise<RevisionContextResult> {
  const [papers, attempts, syllabus, analytics] = await Promise.all([
    getUserPapers(userId),
    getUserAttempts(userId),
    getUserSyllabus(userId),
    getTopicAnalytics(userId),
  ]);

  const topicQuery = options.topic?.trim().toLowerCase();
  const subjectQuery = options.subject?.trim().toLowerCase();
  const maxRelated = options.maxRelatedQuestions ?? 5;

  let syllabusMatch: RevisionContextResult["syllabusMatch"];
  if (topicQuery) {
    const matchedItem = syllabus.find(
      (item) =>
        item.title.toLowerCase().includes(topicQuery) ||
        topicQuery.includes(item.title.toLowerCase()),
    );
    if (matchedItem) {
      syllabusMatch = {
        id: matchedItem.id,
        title: matchedItem.title,
        completed: matchedItem.completed,
        dueDate: matchedItem.dueDate,
        notes: matchedItem.notes,
      };
    }
  }

  let studentTopicPerformance: TopicMetric | undefined;
  if (topicQuery) {
    studentTopicPerformance = analytics.allTopics.find(
      (t) =>
        t.topic.toLowerCase().includes(topicQuery) ||
        topicQuery.includes(t.topic.toLowerCase()),
    );
  }

  // Find related questions across papers
  const relatedPaperQuestions: RevisionContextResult["relatedPaperQuestions"] =
    [];
  if (topicQuery) {
    for (const paper of papers) {
      if (relatedPaperQuestions.length >= maxRelated) break;
      const questions = paper.parsedQuestions || [];
      for (const q of questions) {
        if (relatedPaperQuestions.length >= maxRelated) break;
        const matchesTopic =
          (q.topic && q.topic.toLowerCase().includes(topicQuery)) ||
          (q.chapter && q.chapter.toLowerCase().includes(topicQuery)) ||
          q.text.toLowerCase().includes(topicQuery);
        if (matchesTopic) {
          relatedPaperQuestions.push({
            paperId: paper.id,
            paperTitle: paper.label || paper.title || paper.subject,
            questionNo: q.questionNo,
            text: q.text,
            options: q.options || {},
            answer: q.answer,
            explanation: q.explanation,
          });
        }
      }
    }
  }

  // Target specific question if provided
  let targetQuestion: RevisionContextResult["targetQuestion"];
  if (options.paperId && options.questionNo) {
    const targetPaper = papers.find((p) => p.id === options.paperId);
    if (targetPaper) {
      const q = (targetPaper.parsedQuestions || []).find(
        (item) => item.questionNo === options.questionNo,
      );
      if (q) {
        // Find latest attempt on this paper
        const paperAttempts = sortAttemptsLatestFirst(
          attempts.filter((a) => a.paperId === options.paperId),
        );
        const latestAttempt = paperAttempts[0];
        const studentAns = latestAttempt?.answers?.[options.questionNo];

        targetQuestion = {
          paperId: targetPaper.id,
          paperTitle:
            targetPaper.label || targetPaper.title || targetPaper.subject,
          question: q,
          latestAttempt: studentAns
            ? {
                selected: studentAns.selected,
                isCorrect: studentAns.isCorrect ?? null,
                confidence: studentAns.confidence,
                note: studentAns.note,
                timeSpentSeconds: studentAns.timeSpentSeconds,
              }
            : undefined,
        };
      }
    }
  }

  return {
    topic: options.topic,
    subject: options.subject,
    syllabusMatch,
    studentTopicPerformance,
    relatedPaperQuestions,
    targetQuestion,
  };
}

export async function saveTopicRevisionNote(
  userId: string,
  options: {
    topic?: string;
    paperId?: string;
    questionNo?: number;
    note: string;
  },
): Promise<{ saved: boolean; destination: string }> {
  const note = options.note.trim();
  if (!note) {
    throw new Error("Note content cannot be empty.");
  }

  // If paperId and questionNo specified, save to question attempt notes
  if (options.paperId && options.questionNo) {
    const attempts = sortAttemptsLatestFirst(await getUserAttempts(userId));
    const targetAttempt = attempts.find((a) => a.paperId === options.paperId);
    if (targetAttempt) {
      const answers = { ...(targetAttempt.answers || {}) };
      const currentAns = answers[options.questionNo] || {
        questionNo: options.questionNo,
        selected: null,
      };
      const existing = currentAns.note?.trim();
      currentAns.note = existing ? `${existing}\n\n${note}` : note;
      answers[options.questionNo] = currentAns;
      targetAttempt.answers = answers;
      await saveMcpAttempt(userId, targetAttempt);
      return {
        saved: true,
        destination: `Question #${options.questionNo} notes in attempt ${targetAttempt.id}`,
      };
    }
  }

  // Otherwise, attach to syllabus item if topic matches
  if (options.topic) {
    const syllabus = await getUserSyllabus(userId);
    const topicLower = options.topic.toLowerCase();
    const item = syllabus.find(
      (s) =>
        s.title.toLowerCase().includes(topicLower) ||
        topicLower.includes(s.title.toLowerCase()),
    );
    if (item) {
      const existing = item.notes?.trim();
      item.notes = existing ? `${existing}\n\n${note}` : note;
      item.updatedAt = new Date().toISOString();
      await saveMcpSyllabus(userId, syllabus);
      return {
        saved: true,
        destination: `Syllabus topic "${item.title}" notes`,
      };
    }
  }

  return {
    saved: false,
    destination: "No matching question or syllabus item found to attach note.",
  };
}


import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Attempt, ParsedQuestion, QuestionPaper, SyllabusItem } from "./types";
import { VocabCard } from "./vocabTypes";
import { migrateMainsSessionsToSingleQuestionBooklet } from "./mainsEvaluation";
import {
  INITIAL_PAPERS,
  getStandardTimeMinutes,
  isUserUploadedPaper,
} from "./defaults";
import { readJsonStore, writeJsonStore, deleteFile } from "./cloudStorage";
import { findQuestionsForSyllabusTopic } from "./syllabusQuestionIndex";

let adminClient: SupabaseClient | null | undefined;
const memoryHiddenPaperIds = new Map<string, string[]>();
const memoryOnlyCustomPapers = new Map<string, boolean>();
const memorySyllabus = new Map<string, SyllabusItem[]>();
const memorySyllabusMarkdown = new Map<string, string>();
const memoryVocabCards = new Map<string, VocabCard[]>();

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
    subject: row.subject || "",
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
  return [...custom, ...visibleDefaults].map((paper) => normalizePaper(paper));
}

export async function getUserPaper(
  userId: string,
  paperId: string,
): Promise<QuestionPaper | null> {
  const papers = await getUserPapers(userId);
  const lower = paperId.trim().toLowerCase();
  return (
    papers.find(
      (paper) => paper.id === paperId || paper.id.toLowerCase() === lower,
    ) || null
  );
}

export async function getPaperById(
  paperId: string,
): Promise<QuestionPaper | null> {
  const supabase = getAdminClient();
  if (supabase) {
    const { data } = await supabase
      .from("custom_papers")
      .select("*")
      .eq("id", paperId)
      .maybeSingle();
    if (data) return normalizePaper(data);
  } else {
    const stored = await readJsonStore<Record<string, QuestionPaper>>(
      "papers.json",
      {},
    );
    if (stored[paperId]) return normalizePaper(stored[paperId]);
  }
  return INITIAL_PAPERS.find((p) => p.id === paperId) || null;
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
      subject: paper.subject || "",
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
  const cleanId = paperId.trim();
  const lowerId = cleanId.toLowerCase();
  let deletedFromSupabase = false;
  let deletedFromStore = false;

  if (supabase) {
    const candidateIds = Array.from(new Set([cleanId, lowerId]));
    const { data: rows } = await supabase
      .from("custom_papers")
      .select("id, qp_url, ak_url, exs_url")
      .eq("user_id", userId)
      .in("id", candidateIds);

    const matchedIds = new Set<string>(candidateIds);
    if (rows && rows.length > 0) {
      for (const row of rows) {
        matchedIds.add(row.id);
        if (row.qp_url && !String(row.qp_url).startsWith("local://")) {
          await deleteFile(row.qp_url).catch(() => {});
        }
        if (row.ak_url && !String(row.ak_url).startsWith("local://")) {
          await deleteFile(row.ak_url).catch(() => {});
        }
        if (row.exs_url && !String(row.exs_url).startsWith("local://")) {
          await deleteFile(row.exs_url).catch(() => {});
        }
        const folder = `custom-papers/${userId}/${row.id}`;
        const { data: files } = await supabase.storage
          .from("papers")
          .list(folder);
        if (files && files.length > 0) {
          await supabase.storage
            .from("papers")
            .remove(files.map((f) => `${folder}/${f.name}`))
            .catch(() => {});
        }
      }
    }

    const idList = Array.from(matchedIds);
    // Clean up question_bank entries if present (best-effort)
    await supabase
      .from("question_bank")
      .delete()
      .eq("user_id", userId)
      .in("source_paper_id", idList);

    const { data: deletedRows, error } = await supabase
      .from("custom_papers")
      .delete()
      .eq("user_id", userId)
      .in("id", idList)
      .select("id");
    if (error) {
      throw new Error(`The paper could not be deleted: ${error.message}`);
    }
    deletedFromSupabase = Boolean(deletedRows && deletedRows.length > 0);
  }

  // Always also remove from papers.json / Blob store so no stale entry remains
  try {
    const stored = await readJsonStore<Record<string, QuestionPaper>>(
      "papers.json",
      {},
    );
    let changed = false;
    for (const key of Object.keys(stored)) {
      const entry = stored[key];
      if (
        entry &&
        (!entry.userId || entry.userId === userId) &&
        (key === cleanId ||
          key.toLowerCase() === lowerId ||
          entry.id?.toLowerCase() === lowerId)
      ) {
        if (entry.qpUrl && !entry.qpUrl.startsWith("local://")) {
          await deleteFile(entry.qpUrl).catch(() => {});
        }
        if (entry.akUrl && !entry.akUrl.startsWith("local://")) {
          await deleteFile(entry.akUrl).catch(() => {});
        }
        if (entry.exsUrl && !entry.exsUrl.startsWith("local://")) {
          await deleteFile(entry.exsUrl).catch(() => {});
        }
        delete stored[key];
        changed = true;
      }
    }
    if (changed) {
      await writeJsonStore("papers.json", stored);
      deletedFromStore = true;
    }
  } catch (err) {
    console.warn("Notice: papers.json cleanup during MCP delete:", err);
  }

  // Also remove from hidden_paper_ids if it was archived
  const { hiddenPaperIds } = await getUserProfileData(userId);
  if (hiddenPaperIds.includes(cleanId) || hiddenPaperIds.includes(lowerId)) {
    const nextHidden = hiddenPaperIds.filter(
      (id) => id !== cleanId && id.toLowerCase() !== lowerId,
    );
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

  return supabase ? deletedFromSupabase || deletedFromStore : deletedFromStore;
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
  const paperMap = new Map<string, QuestionPaper>(papers.map((p) => [p.id, p]));

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
      acc.attempted > 0 ? Math.round((acc.correct / acc.attempted) * 100) : 0;

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
    totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

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

  // Find related questions across papers using indexed inverted lookups
  const relatedPaperQuestions: RevisionContextResult["relatedPaperQuestions"] =
    [];
  if (topicQuery && options.topic) {
    const indexedMatches = findQuestionsForSyllabusTopic(
      options.topic,
      papers,
      maxRelated,
    );
    indexedMatches.forEach((m) => {
      relatedPaperQuestions.push({
        paperId: m.paperId,
        paperTitle: m.paperTitle,
        questionNo: m.questionNo,
        text: m.text,
        options: m.options || {},
        answer: m.correctAnswer,
        explanation: m.explanation,
      });
    });
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

export const FALLBACK_UPSC_QUOTES = [
  {
    quote:
      "You have to dream before your dreams can come true. Excellence is a continuous process and not an accident.",
    author: "Dr. A.P.J. Abdul Kalam",
    role: "Former President of India & Scientist",
    tag: "Vision & Consistency",
  },
  {
    quote:
      "Arise, awake, and stop not till the goal is reached. All power is within you; you can do anything and everything.",
    author: "Swami Vivekananda",
    role: "Philosopher & Youth Icon",
    tag: "Unstoppable Will",
  },
  {
    quote:
      "By common endeavor we can raise the country to a new greatness, while a lack of unity will expose us to fresh calamities.",
    author: "Sardar Vallabhbhai Patel",
    role: "Architect of Indian Civil Services",
    tag: "Service to Nation",
  },
  {
    quote:
      "Cultivation of mind should still be the ultimate aim of human existence. Educate, Agitate, Organize.",
    author: "Dr. B.R. Ambedkar",
    role: "Chief Architect of the Indian Constitution",
    tag: "Intellectual Rigor",
  },
  {
    quote:
      "It does not matter how slowly you go as long as you do not stop. The man who moves a mountain begins by carrying away small stones.",
    author: "Confucius",
    role: "Philosopher",
    tag: "Daily Persistence",
  },
  {
    quote:
      "You cannot cross the sea merely by standing and staring at the water. Hard work always brings you to your shore.",
    author: "Rabindranath Tagore",
    role: "Nobel Laureate & Poet",
    tag: "Active Action",
  },
  {
    quote:
      "Success is not final, failure is not fatal: it is the courage to continue that counts in this marathon.",
    author: "Winston Churchill",
    role: "Statesman",
    tag: "Resilience",
  },
  {
    quote:
      "A nation's greatness is measured by how it treats its weakest members. Remember the purpose of your administrative calling.",
    author: "Mahatma Gandhi",
    role: "Father of the Nation",
    tag: "Public Service",
  },
  {
    quote:
      "The secret of getting ahead is getting started. Break your complex overwhelming tasks into small manageable steps.",
    author: "Mark Twain",
    role: "Author & Thinker",
    tag: "Daily Discipline",
  },
];

export async function getUserVocabCards(userId: string): Promise<VocabCard[]> {
  const supabase = getAdminClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("vocab_cards")
        .eq("id", userId)
        .maybeSingle();
      if (!error && Array.isArray(data?.vocab_cards)) {
        return data.vocab_cards;
      }
    } catch (e) {
      console.warn("Supabase vocab fetch failed:", e);
    }
  }

  const stored = await readJsonStore<Record<string, VocabCard[]>>(
    "vocab.json",
    {},
  );
  if (Array.isArray(stored[userId]) && stored[userId].length > 0) {
    return stored[userId];
  }

  return memoryVocabCards.get(userId) || [];
}

export async function saveUserVocabCards(
  userId: string,
  cards: VocabCard[],
): Promise<boolean> {
  memoryVocabCards.set(userId, cards);

  try {
    const stored = await readJsonStore<Record<string, VocabCard[]>>(
      "vocab.json",
      {},
    );
    stored[userId] = cards;
    await writeJsonStore("vocab.json", stored);
  } catch (e) {
    console.warn("JSON store vocab save failed:", e);
  }

  const supabase = getAdminClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          vocab_cards: cards,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (error) {
        console.warn(
          "Failed updating vocab_cards in Supabase profiles:",
          error,
        );
        return false;
      }
    } catch (e) {
      console.warn("Failed updating vocab_cards in Supabase profiles:", e);
      return false;
    }
  }
  return true;
}

export function getMcpDailyQuote(random = false) {
  const idx = random
    ? Math.floor(Math.random() * FALLBACK_UPSC_QUOTES.length)
    : Math.floor(Date.now() / 86400000) % FALLBACK_UPSC_QUOTES.length;
  return FALLBACK_UPSC_QUOTES[idx];
}

export interface MainsAggregatedFeedback {
  totalEvaluatedQuestions: number;
  totalAttempts: number;
  averageScorePercentage: number;
  paperDistribution: Record<
    string,
    { count: number; avgScore: number; avgPercentage: number }
  >;
  dimensionAverages: {
    demand: number;
    content: number;
    structure: number;
    presentation: number;
  };
  recurringWeaknesses: Array<{ weakness: string; count: number }>;
  recurringMissingDimensions: Array<{ dimension: string; count: number }>;
  commonDirectivesAnalyzed: Array<{ directive: string; count: number }>;
  averageWordCountCompliance: number;
  reAttemptImprovementRate: {
    reAttemptedQuestionsCount: number;
    averageMarksDelta: number;
  };
  questionsSummary?: Array<{
    id: string;
    question: string;
    paperType: string;
    optionalSubject?: string;
    maxMarks: number;
    attemptsCount: number;
    latestScore: number;
    latestPercentage: number;
    verdict: string;
    strengths: string[];
    weaknesses: string[];
    missingDimensions: string[];
    submittedAt: string;
  }>;
}

export async function getUserMainsSessions(userId: string): Promise<any[]> {
  const supabase = getAdminClient();
  if (supabase) {
    try {
      const { data: tableData } = await supabase
        .from("mains_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (Array.isArray(tableData) && tableData.length > 0) {
        return tableData;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("mains_sessions")
        .eq("id", userId)
        .maybeSingle();
      if (
        Array.isArray(profileData?.mains_sessions) &&
        profileData.mains_sessions.length > 0
      ) {
        return profileData.mains_sessions;
      }
    } catch (e) {
      console.warn("Failed fetching mains sessions in mcpData:", e);
    }
  }

  const stored = await readJsonStore<Record<string, any[]>>("mains.json", {});
  if (Array.isArray(stored[userId])) {
    return stored[userId];
  }
  return [];
}

export function aggregateMainsFeedback(
  rawSessions: any[],
  paperFilter?: string,
  includeQuestionList = true,
): MainsAggregatedFeedback {
  const sessions = migrateMainsSessionsToSingleQuestionBooklet(rawSessions);
  const filtered =
    !paperFilter || paperFilter === "all"
      ? sessions
      : sessions.filter((s) => s.paperType === paperFilter);

  let totalEvaluatedQuestions = 0;
  let totalAttempts = 0;
  let totalScore = 0;
  let totalMax = 0;

  const paperStats: Record<
    string,
    { totalAwarded: number; totalMax: number; count: number }
  > = {};
  const dimensionTotals = {
    demand: 0,
    content: 0,
    structure: 0,
    presentation: 0,
    count: 0,
  };
  const weaknessFreq = new Map<string, number>();
  const missingDimFreq = new Map<string, number>();
  const directiveFreq = new Map<string, number>();
  let totalWordCompliance = 0;
  let wordComplianceCount = 0;

  let reAttemptCount = 0;
  let totalMarksDelta = 0;

  const questionsSummary: any[] = [];

  for (const s of filtered) {
    const attempts = Array.isArray(s.attempts) ? s.attempts : [];
    const evaluatedAttempts = attempts.filter(
      (att) =>
        att.evaluation && typeof att.evaluation.marksAwarded === "number",
    );

    if (evaluatedAttempts.length === 0) continue;

    totalEvaluatedQuestions++;
    totalAttempts += evaluatedAttempts.length;

    // Check re-attempt improvement
    if (evaluatedAttempts.length > 1) {
      const firstScore = evaluatedAttempts[0].evaluation!.marksAwarded;
      const lastScore =
        evaluatedAttempts[evaluatedAttempts.length - 1].evaluation!
          .marksAwarded;
      totalMarksDelta += lastScore - firstScore;
      reAttemptCount++;
    }

    const latestAttempt = evaluatedAttempts[evaluatedAttempts.length - 1];
    const latestEval = latestAttempt.evaluation!;

    const pType = s.paperType || "GS-2";
    if (!paperStats[pType])
      paperStats[pType] = { totalAwarded: 0, totalMax: 0, count: 0 };
    paperStats[pType].totalAwarded += latestEval.marksAwarded;
    paperStats[pType].totalMax += latestEval.maxMarks || s.maxMarks || 10;
    paperStats[pType].count++;

    totalScore += latestEval.marksAwarded;
    totalMax += latestEval.maxMarks || s.maxMarks || 10;

    // Dimension scores
    if (latestEval.dimensions) {
      if (latestEval.dimensions.demand)
        dimensionTotals.demand += latestEval.dimensions.demand.score;
      if (latestEval.dimensions.content)
        dimensionTotals.content += latestEval.dimensions.content.score;
      if (latestEval.dimensions.structure)
        dimensionTotals.structure += latestEval.dimensions.structure.score;
      if (latestEval.dimensions.presentation)
        dimensionTotals.presentation +=
          latestEval.dimensions.presentation.score;
      dimensionTotals.count++;
    }

    // Directive
    if (latestEval.directive) {
      const dir = latestEval.directive.trim().toUpperCase();
      directiveFreq.set(dir, (directiveFreq.get(dir) || 0) + 1);
    }

    // Word compliance
    if (latestEval.targetWordCount && latestEval.actualWordCount) {
      totalWordCompliance += Math.min(
        150,
        Math.round(
          (latestEval.actualWordCount / latestEval.targetWordCount) * 100,
        ),
      );
      wordComplianceCount++;
    }

    // Weaknesses
    for (const w of latestEval.weaknesses || []) {
      const cleanW = w.trim();
      if (cleanW) weaknessFreq.set(cleanW, (weaknessFreq.get(cleanW) || 0) + 1);
    }

    // Missing dimensions
    for (const m of latestEval.missingDimensions || []) {
      const cleanM = m.trim();
      if (cleanM)
        missingDimFreq.set(cleanM, (missingDimFreq.get(cleanM) || 0) + 1);
    }

    if (includeQuestionList) {
      questionsSummary.push({
        id: s.id,
        question: s.question || latestEval.question || s.title,
        paperType: s.paperType,
        optionalSubject: s.optionalSubject,
        maxMarks: s.maxMarks || 10,
        attemptsCount: evaluatedAttempts.length,
        latestScore: latestEval.marksAwarded,
        latestPercentage:
          latestEval.percentage ||
          Math.round(
            (latestEval.marksAwarded / (latestEval.maxMarks || 10)) * 100,
          ),
        verdict: latestEval.verdict,
        strengths: (latestEval.strengths || []).slice(0, 3),
        weaknesses: (latestEval.weaknesses || []).slice(0, 4),
        missingDimensions: (latestEval.missingDimensions || []).slice(0, 3),
        submittedAt: latestAttempt.submittedAt,
      });
    }
  }

  const paperDistribution: Record<
    string,
    { count: number; avgScore: number; avgPercentage: number }
  > = {};
  for (const [p, stat] of Object.entries(paperStats)) {
    paperDistribution[p] = {
      count: stat.count,
      avgScore:
        stat.count > 0
          ? Math.round((stat.totalAwarded / stat.count) * 10) / 10
          : 0,
      avgPercentage:
        stat.totalMax > 0
          ? Math.round((stat.totalAwarded / stat.totalMax) * 100)
          : 0,
    };
  }

  const dimCount = dimensionTotals.count || 1;
  const dimensionAverages = {
    demand: Math.round((dimensionTotals.demand / dimCount) * 10) / 10,
    content: Math.round((dimensionTotals.content / dimCount) * 10) / 10,
    structure: Math.round((dimensionTotals.structure / dimCount) * 10) / 10,
    presentation:
      Math.round((dimensionTotals.presentation / dimCount) * 10) / 10,
  };

  const recurringWeaknesses = Array.from(weaknessFreq.entries())
    .map(([weakness, count]) => ({ weakness, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recurringMissingDimensions = Array.from(missingDimFreq.entries())
    .map(([dimension, count]) => ({ dimension, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const commonDirectivesAnalyzed = Array.from(directiveFreq.entries())
    .map(([directive, count]) => ({ directive, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalEvaluatedQuestions,
    totalAttempts,
    averageScorePercentage:
      totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
    paperDistribution,
    dimensionAverages,
    recurringWeaknesses,
    recurringMissingDimensions,
    commonDirectivesAnalyzed,
    averageWordCountCompliance:
      wordComplianceCount > 0
        ? Math.round(totalWordCompliance / wordComplianceCount)
        : 0,
    reAttemptImprovementRate: {
      reAttemptedQuestionsCount: reAttemptCount,
      averageMarksDelta:
        reAttemptCount > 0
          ? Math.round((totalMarksDelta / reAttemptCount) * 10) / 10
          : 0,
    },
    ...(includeQuestionList ? { questionsSummary } : {}),
  };
}

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Attempt, QuestionPaper, SyllabusItem } from "./types";
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
    return (data || []).map((row) => row.payload as Attempt);
  }
  const attempts = await readJsonStore<Attempt[]>("attempts.json", []);
  return attempts.filter((attempt) => attempt.userId === userId);
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

import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import {
  Attempt,
  ActiveSessionDraft,
  QuestionPaper,
  SyllabusItem,
} from "./types";
import { VocabCard } from "./vocabTypes";

import { inferPaperStream } from "./paperStream";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const globalObj = (typeof window !== "undefined" ? window : globalThis) as any;
let cachedBrowserClient: SupabaseClient | null =
  globalObj.__supabase_singleton__ || null;

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    if (globalObj.__supabase_server_singleton__) {
      return globalObj.__supabase_server_singleton__;
    }
    const serverClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    globalObj.__supabase_server_singleton__ = serverClient;
    return serverClient;
  }

  if (cachedBrowserClient) return cachedBrowserClient;
  if (globalObj.__supabase_singleton__) {
    cachedBrowserClient = globalObj.__supabase_singleton__;
    return cachedBrowserClient;
  }

  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    cachedBrowserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    globalObj.__supabase_singleton__ = cachedBrowserClient;
    return cachedBrowserClient;
  } catch {
    return null;
  }
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  is_pro: boolean;
  pro_purchased_at?: string;
  razorpay_payment_id?: string;
  hidden_paper_ids?: string[];
  only_custom_papers?: boolean;
  custom_syllabus?: SyllabusItem[];
  custom_syllabus_markdown?: string;
  vocab_cards?: VocabCard[];
  mains_sessions?: any[];
  revision_sessions?: any[];
}

// Check current authenticated user
export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/** Returns the current Supabase access token for authenticated API requests. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  if (!supabase) return {};

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
  } catch {
    return {};
  }
}

// Fetch user profile (including is_pro status)
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as UserProfile;
  } catch {
    return null;
  }
}

// Update profile pro status
export async function updateUserProStatus(
  userId: string,
  paymentId?: string,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        is_pro: true,
        pro_purchased_at: new Date().toISOString(),
        razorpay_payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return !error;
  } catch {
    return false;
  }
}

// Fetch user's isolated attempts
export async function fetchUserAttemptsFromSupabase(
  userId: string,
): Promise<Attempt[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("attempts")
      .select("payload")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });

    if (error || !data) return [];
    return data.map((row) => row.payload as Attempt);
  } catch {
    return [];
  }
}

// Save or update an isolated attempt
export async function saveUserAttemptToSupabase(
  attempt: Attempt,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const streamInfo = inferPaperStream({
      paperStream: attempt.paperStream,
      optionalName: attempt.optionalName,
      category: attempt.category,
      examType: attempt.examType,
      label: attempt.paperLabel,
      subject: attempt.paperLabel,
    });
    const enrichedPayload: Attempt = {
      ...attempt,
      paperStream: streamInfo.paperStream,
      optionalName: streamInfo.optionalName,
    };

    const { error } = await supabase.from("attempts").upsert({
      id: attempt.id,
      user_id: userId,
      paper_id: attempt.paperId,
      paper_label: attempt.paperLabel,
      category: attempt.category,
      exam_type: attempt.examType,
      paper_stream: streamInfo.paperStream,
      optional_name: streamInfo.optionalName || null,
      mode: attempt.mode,
      score: attempt.score,
      max_score: attempt.maxScore,
      accuracy_pct: attempt.accuracyPct,
      started_at: attempt.startedAt,
      finished_at: attempt.finishedAt || new Date().toISOString(),
      payload: enrichedPayload,
    });

    return !error;
  } catch {
    return false;
  }
}

// Delete an attempt
export async function deleteUserAttemptFromSupabase(
  attemptId: string,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("attempts")
      .delete()
      .eq("id", attemptId)
      .eq("user_id", userId);

    return !error;
  } catch {
    return false;
  }
}

// Save active session draft
export async function saveUserDraftToSupabase(
  draft: ActiveSessionDraft,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("drafts").upsert({
      user_id: userId,
      paper_id: draft.paperId,
      payload: draft,
      updated_at: new Date().toISOString(),
    });

    return !error;
  } catch {
    return false;
  }
}

// Fetch active session draft
export async function fetchUserDraftFromSupabase(
  userId: string,
): Promise<ActiveSessionDraft | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("drafts")
      .select("payload")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data.payload as ActiveSessionDraft;
  } catch {
    return null;
  }
}

// Clear user draft
export async function clearUserDraftFromSupabase(
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("drafts")
      .delete()
      .eq("user_id", userId);

    return !error;
  } catch {
    return false;
  }
}

// Hide a paper for specific user in Supabase
export async function hideUserPaperInSupabase(
  userId: string,
  paperId: string,
): Promise<string[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  try {
    const profile = await getUserProfile(userId);
    const current = profile?.hidden_paper_ids || [];
    if (!current.includes(paperId)) {
      const updated = [...current, paperId];
      await supabase
        .from("profiles")
        .update({
          hidden_paper_ids: updated,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      return updated;
    }
    return current;
  } catch (err) {
    console.warn("Failed hiding paper in Supabase:", err);
    return [];
  }
}

// Restore all hidden papers for user
export async function restoreUserHiddenPapersInSupabase(
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        hidden_paper_ids: [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    return !error;
  } catch (err) {
    console.warn("Failed restoring hidden papers:", err);
    return false;
  }
}

export async function updateOnlyCustomPapersInSupabase(
  userId: string,
  value: boolean,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("profiles")
    .update({ only_custom_papers: value, updated_at: new Date().toISOString() })
    .eq("id", userId);
  return !error;
}

export async function saveUserSyllabusToSupabase(
  userId: string,
  items: SyllabusItem[],
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("profiles")
    .update({ custom_syllabus: items, updated_at: new Date().toISOString() })
    .eq("id", userId);
  return !error;
}

export async function saveUserSyllabusMarkdownToSupabase(
  userId: string,
  markdown: string,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("profiles")
    .update({
      custom_syllabus_markdown: markdown,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  return !error;
}

export async function saveUserVocabCardsToSupabase(
  userId: string,
  cards: VocabCard[],
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        vocab_cards: cards,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    return !error;
  } catch {
    return false;
  }
}

// Save user's Mains evaluation sessions to Supabase
export async function saveUserMainsSessionsToSupabase(
  userId: string,
  sessions: any[],
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) return false;
  try {
    // 1. Update in profiles as JSONB
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        mains_sessions: sessions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // 2. Also upsert individual sessions into mains_sessions table
    if (Array.isArray(sessions) && sessions.length > 0) {
      const rows = sessions.map((s) => ({
        id: s.id,
        user_id: userId,
        title: s.title || "Untitled Evaluation",
        paper_type: s.paperType || "GS-2",
        paper_stream: inferPaperStream({
          category: "mains",
          examType: "subjective",
          paperType: s.paperType,
          optionalName: s.optionalSubject,
          title: s.title,
        }).paperStream,
        optional_subject: s.optionalSubject || null,
        updated_at: s.updatedAt || new Date().toISOString(),
        questions: s.questions || [],
      }));

      await supabase.from("mains_sessions").upsert(rows, { onConflict: "id" });
    }

    return !profileError;
  } catch (err) {
    console.warn("Failed saving mains sessions to Supabase:", err);
    return false;
  }
}

// Fetch user's Mains evaluation sessions from Supabase (merging profiles.mains_sessions + mains_sessions table)
export async function fetchUserMainsSessionsFromSupabase(
  userId: string,
): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) return [];
  try {
    const [{ data: profileData }, { data: tableData, error: tableError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("mains_sessions")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("mains_sessions")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false }),
      ]);

    const mergedMap = new Map<string, any>();

    // Add dedicated mains_sessions table rows first
    if (!tableError && Array.isArray(tableData)) {
      for (const row of tableData) {
        if (!row?.id) continue;
        mergedMap.set(row.id, {
          id: row.id,
          title: row.title,
          paperType: row.paper_type,
          optionalSubject: row.optional_subject,
          updatedAt: row.updated_at,
          questions: row.questions || [],
        });
      }
    }

    // Overlay profiles.mains_sessions (contains full structured attempts & evaluations)
    if (profileData && Array.isArray(profileData.mains_sessions)) {
      for (const s of profileData.mains_sessions) {
        if (!s?.id) continue;
        const existing = mergedMap.get(s.id);
        if (
          !existing ||
          (s.updatedAt && s.updatedAt >= (existing.updatedAt || "")) ||
          (Array.isArray(s.attempts) && s.attempts.length > 0)
        ) {
          mergedMap.set(s.id, s);
        }
      }
    }

    return Array.from(mergedMap.values()).sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime(),
    );
  } catch (err) {
    console.warn("Failed fetching mains sessions from Supabase:", err);
    return [];
  }
}

// Save user's AI Revision sessions to Supabase
export async function saveUserRevisionSessionsToSupabase(
  userId: string,
  sessions: any[],
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) return false;
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        revision_sessions: sessions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return !error;
  } catch (err) {
    console.warn("Failed saving revision sessions to Supabase:", err);
    return false;
  }
}

// Fetch user's AI Revision sessions from Supabase
export async function fetchUserRevisionSessionsFromSupabase(
  userId: string,
): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) return [];
  try {
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("revision_sessions")
      .eq("id", userId)
      .maybeSingle();

    if (!error && profileData && Array.isArray(profileData.revision_sessions)) {
      return profileData.revision_sessions;
    }
    return [];
  } catch (err) {
    console.warn("Failed fetching revision sessions from Supabase:", err);
    return [];
  }
}

// Delete a user's Mains evaluation session from Supabase
export async function deleteUserMainsSessionFromSupabase(
  userId: string,
  sessionId: string,
  remainingSessions?: any[],
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !userId) return false;
  try {
    const idsToDelete = [sessionId];
    if (sessionId.includes("_q")) idsToDelete.push(sessionId.split("_q")[0]);
    if (sessionId.includes("_att"))
      idsToDelete.push(sessionId.split("_att")[0]);

    await supabase
      .from("mains_sessions")
      .delete()
      .in("id", idsToDelete)
      .eq("user_id", userId);

    if (Array.isArray(remainingSessions)) {
      await supabase
        .from("profiles")
        .update({
          mains_sessions: remainingSessions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }
    return true;
  } catch {
    return false;
  }
}

// Fetch user's isolated custom papers from Supabase
export async function fetchUserCustomPapersFromSupabase(
  userId: string,
): Promise<QuestionPaper[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("custom_papers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((row) => {
      let paperLabel = row.label || row.title || "";
      if (
        !paperLabel ||
        paperLabel.match(/^\d{4}\s*–\s*(GS\s*I|GS\s*II\s*CSAT|Mains.*)$/i)
      ) {
        const m = row.id.match(/^custom_[^_]+_\d{4}_(.+)$/);
        if (m && m[1]) {
          paperLabel = m[1]
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c: string) => c.toUpperCase());
        } else {
          paperLabel = row.label || row.title || `${row.year} – ${row.subject}`;
        }
      }
      return {
        id: row.id,
        year: String(row.year),
        category: (row.stage || "prelims") as any,
        examType: (row.exam_type || "objective") as any,
        subject: row.subject || "",
        paperStream:
          row.paper_stream ||
          inferPaperStream({
            category: row.stage,
            examType: row.exam_type,
            subject: row.subject,
            title: paperLabel,
          }).paperStream,
        optionalName: row.optional_name || undefined,
        label: paperLabel,
        title: paperLabel,
        totalQuestions: Number(row.total_questions) || 100,
        totalMarks:
          row.total_marks !== undefined &&
          row.total_marks !== null &&
          !isNaN(Number(row.total_marks)) &&
          Number(row.total_marks) > 0
            ? Number(row.total_marks)
            : (Number(row.total_questions) || 0) *
                (Number(row.correct_marks) || 1) || 100,
        correctMarks:
          row.correct_marks !== undefined &&
          row.correct_marks !== null &&
          !isNaN(Number(row.correct_marks))
            ? Number(row.correct_marks)
            : 2.0,
        incorrectMarks:
          row.incorrect_marks !== undefined &&
          row.incorrect_marks !== null &&
          !isNaN(Number(row.incorrect_marks))
            ? Number(row.incorrect_marks)
            : 0.667,
        timeMinutes: Number(row.time_minutes) || 120,
        qpUrl: row.qp_url,
        akUrl: row.ak_url || undefined,
        exsUrl: row.exs_url || undefined,
        answerKey: row.answer_key || {},
        answerKeyText: row.answer_key_text || undefined,
        explanations: row.explanations || {},
        markdownContent:
          row.markdown_content || row.markdownContent || undefined,
        parsedQuestions:
          row.parsed_questions || row.parsedQuestions || undefined,
        instructions: row.instructions || undefined,
        cutoffEnabled:
          row.cutoff_enabled === true ||
          row.cutoff_enabled === "true" ||
          row.cutoffEnabled === true ||
          row.cutoffEnabled === "true",
        cutoffType: row.cutoff_type === "marks" ? "marks" : "percentage",
        cutoffValue:
          row.cutoff_value !== null && row.cutoff_value !== undefined
            ? Number(row.cutoff_value)
            : undefined,
        isCustom: true,
        userId: row.user_id,
        createdAt: row.created_at || undefined,
      };
    });
  } catch (err) {
    console.warn("Failed fetching user custom papers from Supabase:", err);
    return [];
  }
}

// Save or update user's isolated custom paper in Supabase
export async function saveUserCustomPaperToSupabase(
  paper: QuestionPaper,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const paperTitle =
      paper.label || paper.title || `${paper.year} – ${paper.subject}`;
    const streamInfo = inferPaperStream({
      paperStream: paper.paperStream,
      optionalName: paper.optionalName,
      category: paper.category,
      examType: paper.examType,
      subject: paper.subject,
      title: paperTitle,
      label: paper.label,
    });
    const { error } = await supabase.from("custom_papers").upsert({
      id: paper.id,
      user_id: userId,
      title: paperTitle,
      year: parseInt(paper.year) || 2026,
      subject: paper.subject || "",
      stage: paper.category,
      exam_type: paper.examType,
      paper_stream: streamInfo.paperStream,
      optional_name: streamInfo.optionalName || null,
      label: paperTitle,
      total_questions: paper.totalQuestions,
      total_marks: paper.totalMarks,
      correct_marks: paper.correctMarks,
      incorrect_marks: paper.incorrectMarks,
      time_minutes: paper.timeMinutes,
      qp_url: paper.qpUrl,
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
      cutoff_value:
        paper.cutoffEnabled && paper.cutoffValue !== undefined
          ? paper.cutoffValue
          : null,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch (err) {
    console.warn("Failed saving user custom paper to Supabase:", err);
    return false;
  }
}

// Delete user's isolated custom paper from Supabase
export async function deleteUserCustomPaperFromSupabase(
  paperId: string,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("custom_papers")
      .delete()
      .eq("id", paperId)
      .eq("user_id", userId);
    return !error;
  } catch (err) {
    console.warn("Failed deleting user custom paper from Supabase:", err);
    return false;
  }
}

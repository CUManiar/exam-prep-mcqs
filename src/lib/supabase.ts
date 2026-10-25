import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { Attempt, ActiveSessionDraft, QuestionPaper } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  if (!clientInstance && supabaseUrl && supabaseAnonKey) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return clientInstance;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  is_pro: boolean;
  pro_purchased_at?: string;
  razorpay_payment_id?: string;
  hidden_paper_ids?: string[];
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
    const { error } = await supabase.from("attempts").upsert({
      id: attempt.id,
      user_id: userId,
      paper_id: attempt.paperId,
      paper_label: attempt.paperLabel,
      category: attempt.category,
      exam_type: attempt.examType,
      mode: attempt.mode,
      score: attempt.score,
      max_score: attempt.maxScore,
      accuracy_pct: attempt.accuracyPct,
      started_at: attempt.startedAt,
      finished_at: attempt.finishedAt || new Date().toISOString(),
      payload: attempt,
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
        subject: row.subject || paperLabel,
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
        correctMarks: Number(row.correct_marks) || 2.0,
        incorrectMarks: Number(row.incorrect_marks) || 0.667,
        timeMinutes: Number(row.time_minutes) || 120,
        qpUrl: row.qp_url,
        akUrl: row.ak_url || undefined,
        exsUrl: row.exs_url || undefined,
        answerKey: row.answer_key || {},
        answerKeyText: row.answer_key_text || undefined,
        explanations: row.explanations || {},
        markdownContent: row.markdown_content || row.markdownContent || undefined,
        parsedQuestions: row.parsed_questions || row.parsedQuestions || undefined,
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
    const { error } = await supabase.from("custom_papers").upsert({
      id: paper.id,
      user_id: userId,
      title: paperTitle,
      year: parseInt(paper.year) || 2026,
      subject: paper.subject || paperTitle,
      stage: paper.category,
      exam_type: paper.examType,
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

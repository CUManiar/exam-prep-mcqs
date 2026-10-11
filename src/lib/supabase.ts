import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Attempt, ActiveSessionDraft } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') {
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
}

// Check current authenticated user
export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

// Fetch user profile (including is_pro status)
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
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
  paymentId?: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_pro: true,
        pro_purchased_at: new Date().toISOString(),
        razorpay_payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return !error;
  } catch {
    return false;
  }
}

// Fetch user's isolated attempts
export async function fetchUserAttemptsFromSupabase(userId: string): Promise<Attempt[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('attempts')
      .select('payload')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error || !data) return [];
    return data.map((row) => row.payload as Attempt);
  } catch {
    return [];
  }
}

// Save or update an isolated attempt
export async function saveUserAttemptToSupabase(
  attempt: Attempt,
  userId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('attempts')
      .upsert({
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
  userId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('attempts')
      .delete()
      .eq('id', attemptId)
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}

// Save active session draft
export async function saveUserDraftToSupabase(
  draft: ActiveSessionDraft,
  userId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('drafts')
      .upsert({
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
  userId: string
): Promise<ActiveSessionDraft | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('drafts')
      .select('payload')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data.payload as ActiveSessionDraft;
  } catch {
    return null;
  }
}

// Clear user draft
export async function clearUserDraftFromSupabase(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('drafts')
      .delete()
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}

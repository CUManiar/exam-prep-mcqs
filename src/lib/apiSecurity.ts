import { NextRequest, NextResponse } from "next/server";
import { createClient, User } from "@supabase/supabase-js";

type RateLimitBucket = { count: number; resetAt: number };

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function getClientIdentifier(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkRateLimit(
  req: NextRequest,
  scope: string,
  limit: number,
  windowMs = 60_000,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const key = `${scope}:${getClientIdentifier(req)}`;
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function rateLimitResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

export async function getAuthenticatedUser(
  req: NextRequest,
): Promise<User | null> {
  const authorization = req.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token || !supabaseUrl || !anonKey) return null;

  try {
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    return error || !user ? null : user;
  } catch {
    return null;
  }
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { ok: false, error: "Authentication required." },
    { status: 401 },
  );
}

export function validateUploadFile(
  file: File | null,
  options: {
    label: string;
    maxBytes: number;
    extensions: string[];
    mimeTypes: string[];
  },
): string | null {
  if (!file || file.size === 0) return null;

  if (file.size > options.maxBytes) {
    return `${options.label} must be ${Math.round(options.maxBytes / 1024 / 1024)} MB or smaller.`;
  }

  const fileName = file.name.toLowerCase();
  const hasValidExtension = options.extensions.some((extension) =>
    fileName.endsWith(extension),
  );
  const normalizedMime = file.type.split(";")[0].trim().toLowerCase();
  const hasValidMime =
    !normalizedMime || options.mimeTypes.includes(normalizedMime);

  if (!hasValidExtension || !hasValidMime) {
    return `${options.label} must be one of: ${options.extensions.join(", ")}.`;
  }

  return null;
}

/** Loads a user's paper when Supabase is the source of truth rather than papers.json. */
export async function getOwnedCustomPaperFromSupabase(
  paperId: string,
  userId: string,
): Promise<Record<string, any> | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase
      .from("custom_papers")
      .select("*")
      .eq("id", paperId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      year: String(data.year || new Date().getFullYear()),
      category: data.stage || "prelims",
      examType: data.exam_type || "objective",
      subject: data.subject || data.label || data.title || "Custom Paper",
      label: data.label || data.title || "Custom Paper",
      title: data.title || data.label || "Custom Paper",
      totalQuestions: Number(data.total_questions) || 0,
      totalMarks: Number(data.total_marks) || 0,
      correctMarks: Number(data.correct_marks) || 0,
      incorrectMarks: Number(data.incorrect_marks) || 0,
      timeMinutes: Number(data.time_minutes) || 0,
      qpUrl: data.qp_url || "",
      akUrl: data.ak_url || undefined,
      exsUrl: data.exs_url || undefined,
      answerKey: data.answer_key || {},
      answerKeyText: data.answer_key_text || undefined,
      explanations: data.explanations || {},
      markdownContent: data.markdown_content || undefined,
      parsedQuestions: data.parsed_questions || undefined,
      instructions: data.instructions || undefined,
      cutoffEnabled: Boolean(data.cutoff_enabled),
      cutoffType: data.cutoff_type === "marks" ? "marks" : "percentage",
      cutoffValue:
        data.cutoff_value === null || data.cutoff_value === undefined
          ? undefined
          : Number(data.cutoff_value),
      isCustom: true,
    };
  } catch {
    return null;
  }
}

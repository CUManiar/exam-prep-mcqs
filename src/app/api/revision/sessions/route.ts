import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/apiSecurity";
import {
  saveUserRevisionSessionsToSupabase,
  fetchUserRevisionSessionsFromSupabase,
} from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorizedResponse();

    const sessions = await fetchUserRevisionSessionsFromSupabase(user.id);
    return NextResponse.json({ ok: true, sessions });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to fetch revision sessions" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json().catch(() => ({}));
    const sessions = body.sessions;
    if (!Array.isArray(sessions)) {
      return NextResponse.json(
        { ok: false, error: "Invalid sessions payload" },
        { status: 400 },
      );
    }

    const success = await saveUserRevisionSessionsToSupabase(user.id, sessions);
    return NextResponse.json({ ok: success });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to save revision sessions" },
      { status: 500 },
    );
  }
}

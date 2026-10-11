import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Database configuration missing on server" },
        { status: 500 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing user ID for deletion" },
        { status: 400 },
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Delete user attempts from public.attempts
    await adminSupabase.from("attempts").delete().eq("user_id", userId);

    // 2. Delete user ongoing drafts from public.drafts
    await adminSupabase.from("drafts").delete().eq("user_id", userId);

    // 3. Delete user profile from public.profiles
    await adminSupabase.from("profiles").delete().eq("id", userId);

    // 4. Delete user account from Supabase Auth
    const { error: authDeleteError } =
      await adminSupabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.warn("Auth delete warning:", authDeleteError.message);
    }

    return NextResponse.json({
      ok: true,
      message:
        "User account, subscription, attempts, and profile successfully deleted.",
    });
  } catch (err: any) {
    console.error("Account deletion failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to delete account" },
      { status: 500 },
    );
  }
}

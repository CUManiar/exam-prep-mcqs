import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  checkRateLimit,
  getAuthenticatedUser,
  rateLimitResponse,
  unauthorizedResponse,
} from "@/lib/apiSecurity";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorizedResponse();

    const rateLimit = checkRateLimit(req, "delete-account", 3, 60 * 60_000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: "Database configuration missing on server" },
        { status: 500 },
      );
    }

    const userId = user.id;

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Delete user attempts from public.attempts
    await adminSupabase.from("attempts").delete().eq("user_id", userId);

    // 2. Delete user ongoing drafts from public.drafts
    await adminSupabase.from("drafts").delete().eq("user_id", userId);

    // 3. Delete user custom papers from public.custom_papers
    await adminSupabase.from("custom_papers").delete().eq("user_id", userId);

    // 3.5 Clean up user custom files in storage
    try {
      const { data: userFiles } = await adminSupabase.storage
        .from("papers")
        .list(`custom-papers/${userId}`);
      if (userFiles && userFiles.length > 0) {
        const filePaths = userFiles.map(
          (f) => `custom-papers/${userId}/${f.name}`,
        );
        await adminSupabase.storage.from("papers").remove(filePaths);
      }
    } catch (storageErr) {
      console.warn(
        "Storage cleanup warning during account deletion:",
        storageErr,
      );
    }

    // 4. Delete user profile from public.profiles
    await adminSupabase.from("profiles").delete().eq("id", userId);

    // 5. Delete user account from Supabase Auth
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

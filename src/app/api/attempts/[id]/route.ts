import { NextRequest, NextResponse } from "next/server";
import { Attempt } from "../../../../lib/types";
import {
  readJsonStore,
  writeJsonStore,
  isProdEnv,
  getProdApiUrl,
  getBlobToken,
} from "@/lib/cloudStorage";
import {
  checkRateLimit,
  getAuthenticatedUser,
  rateLimitResponse,
  unauthorizedResponse,
} from "@/lib/apiSecurity";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorizedResponse();

    const rateLimit = checkRateLimit(req, "attempt-delete", 30, 10 * 60_000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const { id } = await params;
    const currentList = await readJsonStore<Attempt[]>("attempts.json", []);
    if (
      !currentList.some(
        (attempt) => attempt.id === id && attempt.userId === user.id,
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "Attempt not found." },
        { status: 404 },
      );
    }

    // Forward to PROD if running locally in PROD mode
    if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
      try {
        await fetch(`${getProdApiUrl()}/api/attempts/${id}`, {
          method: "DELETE",
          redirect: "follow",
          headers: { Authorization: req.headers.get("authorization") || "" },
        });
      } catch (err) {
        console.warn(`[Attempts API] Failed to forward DELETE to PROD:`, err);
      }
    }

    const updated = currentList.filter(
      (attempt) => !(attempt.id === id && attempt.userId === user.id),
    );
    await writeJsonStore("attempts.json", updated);
    return NextResponse.json({ ok: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorizedResponse();

    const rateLimit = checkRateLimit(req, "attempt-update", 60, 10 * 60_000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const { id } = await params;
    const updates = await req.json();
    const list = await readJsonStore<Attempt[]>("attempts.json", []);
    const idx = list.findIndex(
      (attempt) => attempt.id === id && attempt.userId === user.id,
    );
    if (idx < 0) {
      return NextResponse.json(
        { ok: false, error: "Attempt not found." },
        { status: 404 },
      );
    }
    const ownedUpdates = { ...updates, userId: user.id };

    // Forward to PROD if running locally in PROD mode
    if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
      try {
        await fetch(`${getProdApiUrl()}/api/attempts/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.get("authorization") || "",
          },
          body: JSON.stringify(ownedUpdates),
          redirect: "follow",
        });
      } catch (err) {
        console.warn(`[Attempts API] Failed to forward PATCH to PROD:`, err);
      }
    }

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...ownedUpdates };
      await writeJsonStore("attempts.json", list);
      return NextResponse.json({ ok: true, attempt: list[idx] });
    }
    return NextResponse.json(
      { ok: false, error: "Attempt not found" },
      { status: 404 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}

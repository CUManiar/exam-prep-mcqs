import { NextRequest, NextResponse } from "next/server";
import {
  readJsonStore,
  writeJsonStore,
  deleteJsonStore,
  isProdEnv,
  getProdApiUrl,
  getBlobToken,
} from "@/lib/cloudStorage";

const REMOTE_FORWARD_TIMEOUT_MS = 5000;

async function fetchRemoteDraft(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REMOTE_FORWARD_TIMEOUT_MS,
  );

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function getForwardingFailureReason(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "timed out";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "network error";
}

function logForwardingFailure(action: string, error: unknown): void {
  console.warn(
    `Unable to forward draft ${action} to PROD (${getForwardingFailureReason(error)}); continuing locally.`,
  );
}

// GET active draft for cross-device synchronization (desktop <-> mobile)
export async function GET() {
  try {
    if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
      try {
        const res = await fetchRemoteDraft(`${getProdApiUrl()}/api/draft`, {
          redirect: "follow",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok) return NextResponse.json(data);
        }
      } catch (err) {
        logForwardingFailure("fetch", err);
      }
    }

    const draft = await readJsonStore("active_draft.json", null);
    return NextResponse.json({ ok: true, draft });
  } catch (err: any) {
    console.error("Error fetching draft:", err);
    return NextResponse.json({ ok: true, draft: null });
  }
}

// POST update active draft
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.paperId) {
      return NextResponse.json(
        { ok: false, error: "Invalid draft payload" },
        { status: 400 },
      );
    }

    if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
      try {
        const res = await fetchRemoteDraft(`${getProdApiUrl()}/api/draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          redirect: "follow",
        });
        if (!res.ok) {
          logForwardingFailure("save", new Error(`HTTP ${res.status}`));
        }
      } catch (err) {
        logForwardingFailure("save", err);
      }
    }

    await writeJsonStore("active_draft.json", body);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error saving draft:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}

// DELETE discard active draft
export async function DELETE() {
  try {
    if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
      try {
        const res = await fetchRemoteDraft(`${getProdApiUrl()}/api/draft`, {
          method: "DELETE",
          redirect: "follow",
        });
        if (!res.ok) {
          logForwardingFailure("delete", new Error(`HTTP ${res.status}`));
        }
      } catch (err) {
        logForwardingFailure("delete", err);
      }
    }

    await deleteJsonStore("active_draft.json");
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error deleting draft:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}

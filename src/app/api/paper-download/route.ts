import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

function isAllowedSource(source: URL, request: NextRequest): boolean {
  const requestHost = request.nextUrl.hostname;
  const sourceHost = source.hostname;

  return (
    sourceHost === requestHost ||
    sourceHost === "localhost" ||
    sourceHost === "127.0.0.1" ||
    sourceHost.endsWith(".supabase.co") ||
    sourceHost.endsWith(".vercel-storage.com")
  );
}

function sanitizeFilename(value: string): string {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 120);
  return cleaned.toLowerCase().endsWith(".pdf")
    ? cleaned
    : `${cleaned || "question-paper"}.pdf`;
}

export async function GET(request: NextRequest) {
  const sourceParam = request.nextUrl.searchParams.get("url");
  const filename = sanitizeFilename(
    request.nextUrl.searchParams.get("filename") || "question-paper.pdf",
  );

  if (!sourceParam) {
    return NextResponse.json(
      { ok: false, error: "Question paper URL is required" },
      { status: 400 },
    );
  }

  try {
    const source = new URL(sourceParam, request.url);
    if (!isAllowedSource(source, request)) {
      return NextResponse.json(
        { ok: false, error: "Question paper source is not allowed" },
        { status: 403 },
      );
    }

    // Serve local static PDFs directly from public/ to avoid self-fetch/redirect issues
    const isLocalOrigin =
      source.origin === request.nextUrl.origin || sourceParam.startsWith("/");
    if (isLocalOrigin && source.pathname.startsWith("/data/")) {
      const publicDataDir = path.resolve(process.cwd(), "public", "data");
      const relPath = decodeURIComponent(
        source.pathname.replace(/^\/data\//, ""),
      );
      const localPath = path.resolve(publicDataDir, relPath);
      if (
        localPath.startsWith(publicDataDir + path.sep) &&
        fs.existsSync(localPath) &&
        fs.statSync(localPath).isFile()
      ) {
        const buffer = fs.readFileSync(localPath);
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
            "Cache-Control": "private, no-store",
          },
        });
      }
      return NextResponse.json(
        { ok: false, error: "Question paper file not found." },
        { status: 404 },
      );
    }

    const upstream = await fetch(source, {
      cache: "no-store",
      redirect: "follow",
    });
    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Question paper unavailable (${upstream.status})`,
        },
        { status: upstream.status },
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/pdf";
    if (!contentType.toLowerCase().includes("pdf")) {
      return new NextResponse("Question paper is not a PDF", { status: 415 });
    }

    return new NextResponse(await upstream.arrayBuffer(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Paper download proxy error:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to open question paper" },
      { status: 502 },
    );
  }
}

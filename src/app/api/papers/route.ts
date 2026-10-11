import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { QuestionPaper, ExamCategory, ExamType } from "../../../lib/types";
import { INITIAL_PAPERS, getStandardTimeMinutes } from "../../../lib/defaults";
import {
  readJsonStore,
  writeJsonStore,
  isBlobEnabled,
  getAppEnvironment,
  isProdEnv,
  getProdApiUrl,
  getBlobToken,
} from "@/lib/cloudStorage";

const DATA_DIR = path.join(process.cwd(), "public", "data");

function parseAnswerKeyFile(filePath: string): Record<number, string> {
  const answers: Record<number, string> = {};
  try {
    if (!fs.existsSync(filePath)) return answers;
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    for (const line of lines) {
      const m = line.trim().match(/^(\d+)[\.\)\s\-\:]+([A-Da-d])/);
      if (m) answers[parseInt(m[1])] = m[2].toUpperCase();
    }
  } catch (err) {
    console.error("Failed to parse answer key:", err);
  }
  return answers;
}

export async function GET(req: NextRequest) {
  try {
    const currentEnv = getAppEnvironment();

    // If running in PROD mode locally without blob token, try fetching all papers directly from PROD
    if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
      try {
        const res = await fetch(`${getProdApiUrl()}/api/papers`, {
          redirect: "follow",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.papers)) {
            return NextResponse.json({
              ok: true,
              papers: data.papers,
              environment: currentEnv,
              source: "PROD_REMOTE",
            });
          }
        }
      } catch (err) {
        console.warn(
          "Failed fetching papers from PROD, using local fallback:",
          err,
        );
      }
    }

    // 1. Read stored custom metadata from Cloud Storage (Vercel Blob) or local fallback
    const customMeta = await readJsonStore<Record<string, QuestionPaper>>(
      "papers.json",
      {},
    );

    const allPapers: QuestionPaper[] = [];

    // 2. Add valid papers from customMeta (user uploads)
    for (const [id, paper] of Object.entries(customMeta)) {
      if (paper && paper.id && paper.label && paper.qpUrl) {
        allPapers.push(paper);
      }
    }

    // 3. Add built-in INITIAL_PAPERS if not already present and not deleted by user
    for (const initPaper of INITIAL_PAPERS) {
      const isDeleted = Boolean(
        customMeta[`__deleted_${initPaper.id.toLowerCase()}`],
      );
      if (!allPapers.some((p) => p.id === initPaper.id) && !isDeleted) {
        allPapers.push(initPaper);
      }
    }

    // Dynamic resolution of timeMinutes and rules if missing
    allPapers.forEach((p) => {
      if (!p.timeMinutes || p.timeMinutes <= 0) {
        p.timeMinutes = getStandardTimeMinutes(p.category, p.examType);
      }
    });

    // Sort papers by year descending, then prelims first, then subject
    allPapers.sort((a, b) => {
      if (b.year !== a.year) return b.year.localeCompare(a.year);
      if (a.category !== b.category) return a.category === "prelims" ? -1 : 1;
      return a.subject.localeCompare(b.subject);
    });

    return NextResponse.json({
      ok: true,
      papers: allPapers,
      environment: currentEnv,
      source: isBlobEnabled() ? "BLOB_STORE" : "LOCAL_STORE",
    });
  } catch (err: any) {
    console.error("Papers API error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  generateQuestionEvaluationComment,
  QuestionEvaluationParams,
} from "@/lib/questionEvaluation";
import { RevisionProviderConfig } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const questions = body.questions as QuestionEvaluationParams[] | undefined;
    const providerConfig = body.providerConfig as
      | RevisionProviderConfig
      | undefined;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Questions array cannot be empty." },
        { status: 400 },
      );
    }

    // Process questions with concurrency of 2 to avoid provider rate-limits
    const results: Array<{ questionNo: number; comment: string }> = [];
    const queue = [...questions];
    const concurrency = Math.min(2, queue.length);

    async function worker() {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        try {
          const comment = await generateQuestionEvaluationComment(
            item,
            providerConfig,
          );
          results.push({
            questionNo: item.questionNo,
            comment,
          });
        } catch (err: any) {
          console.warn(
            `Failed evaluating question ${item.questionNo} in batch:`,
            err?.message || err,
          );
          results.push({
            questionNo: item.questionNo,
            comment: `Candidate attempt for Question ${item.questionNo}. Compare with the official explanation to verify conceptual accuracy.`,
          });
        }
      }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    return NextResponse.json({
      ok: true,
      evaluatedCount: results.length,
      results: results.sort((a, b) => a.questionNo - b.questionNo),
    });
  } catch (error: any) {
    console.error("Batch evaluation error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to process batch evaluation.",
      },
      { status: 500 },
    );
  }
}

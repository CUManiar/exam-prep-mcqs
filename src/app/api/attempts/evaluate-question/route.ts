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
    const question = body.question as QuestionEvaluationParams | undefined;
    const providerConfig = body.providerConfig as RevisionProviderConfig | undefined;

    if (!question || typeof question.questionNo !== "number") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid question parameter." },
        { status: 400 },
      );
    }

    const comment = await generateQuestionEvaluationComment(
      question,
      providerConfig,
    );

    return NextResponse.json({
      ok: true,
      comment,
      questionNo: question.questionNo,
    });
  } catch (error: any) {
    console.error("Question evaluation API error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to generate evaluation comment.",
      },
      { status: 500 },
    );
  }
}

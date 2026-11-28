import { NextRequest, NextResponse } from "next/server";
import { RevisionProviderConfig } from "@/lib/types";
import {
  MediaAttachment,
  normalizeMediaMime,
  parseJsonFromText,
  callGeminiMultimodal,
  callOpenAIMultimodal,
  callAnthropicMultimodal,
  callGroqMultimodal,
} from "@/lib/aiProviders";

export const runtime = "nodejs";
export const maxDuration = 120;

interface QuestionSummaryInput {
  questionNo: number;
  text: string;
  maxMarks?: number;
}

async function fetchPdfAsAttachment(
  qpUrl: string,
  origin: string,
): Promise<MediaAttachment | null> {
  if (!qpUrl || qpUrl.startsWith("local://")) return null;
  const resolvedUrl = qpUrl.startsWith("http")
    ? qpUrl
    : `${origin}${qpUrl.startsWith("/") ? "" : "/"}${qpUrl}`;
  try {
    const res = await fetch(resolvedUrl, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    if (
      arrayBuffer.byteLength === 0 ||
      arrayBuffer.byteLength > 20 * 1024 * 1024
    ) {
      return null;
    }
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return {
      mimeType: "application/pdf",
      data: base64,
      name: "question_paper.pdf",
    };
  } catch (err) {
    console.warn("Failed fetching question paper PDF:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const paperTitle = String(body.paperTitle || "UPSC Mains Paper");
    const totalQuestions = Math.max(1, Number(body.totalQuestions) || 1);
    const totalMarks = Math.max(1, Number(body.totalMarks) || 250);
    const qpUrl = typeof body.qpUrl === "string" ? body.qpUrl : "";
    const parsedQuestions: QuestionSummaryInput[] = Array.isArray(
      body.parsedQuestions,
    )
      ? body.parsedQuestions
      : [];
    const markdownContent =
      typeof body.markdownContent === "string" ? body.markdownContent : "";
    const typedNotes =
      typeof body.typedNotes === "string" ? body.typedNotes.trim() : "";
    const answerAttachments: MediaAttachment[] = Array.isArray(body.attachments)
      ? body.attachments
      : [];
    const providerConfig = body.providerConfig as
      RevisionProviderConfig | undefined;

    if (answerAttachments.length === 0 && !typedNotes) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Please upload your answer booklet (PDF or page images) or provide written notes before evaluating.",
        },
        { status: 400 },
      );
    }

    const provider = providerConfig?.provider || "gemini";
    const apiKey =
      providerConfig?.apiKey?.trim() ||
      (provider === "gemini" ? process.env.GEMINI_API_KEY?.trim() : "") ||
      "";

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: `No API key found for ${provider}. Please add an API key in AI Settings first.`,
        },
        { status: 400 },
      );
    }

    const hasPdfAnswer = answerAttachments.some(
      (att) => normalizeMediaMime(att.mimeType) === "application/pdf",
    );
    if (provider === "groq" && hasPdfAnswer) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Groq does not support PDF answer booklets. Please upload JPG/PNG/WebP page images, provide typed notes, or switch to Gemini, OpenAI, or Claude.",
        },
        { status: 400 },
      );
    }

    // Build question reference (Markdown/parsedQuestions text OR Question Paper PDF)
    const allMedia: MediaAttachment[] = [];
    let questionContextBlock = "";

    if (parsedQuestions.length > 0) {
      questionContextBlock = parsedQuestions
        .map(
          (q) =>
            `Q${q.questionNo}${q.maxMarks ? ` (${q.maxMarks} marks)` : ""}: ${q.text}`,
        )
        .join("\n\n");
    } else if (markdownContent.trim()) {
      questionContextBlock = markdownContent.slice(0, 12000);
    } else if (qpUrl && provider !== "groq") {
      const qpPdf = await fetchPdfAsAttachment(qpUrl, req.nextUrl.origin);
      if (qpPdf) {
        allMedia.push(qpPdf);
      }
    }

    allMedia.push(...answerAttachments);

    const hasQpPdf =
      parsedQuestions.length === 0 &&
      !markdownContent.trim() &&
      allMedia.length > answerAttachments.length;

    const defaultPerQMarks =
      Math.round((totalMarks / totalQuestions) * 10) / 10;

    const prompt = `You are a strict, constructive UPSC Civil Services Mains Examiner evaluating a candidate's full answer booklet for "${paperTitle}".
Total Questions in Paper: ${totalQuestions} | Total Paper Marks: ${totalMarks} (default ~${defaultPerQMarks} marks per question if not specified on the paper).

${
  questionContextBlock
    ? `QUESTION PAPER CONTENT:\n${questionContextBlock}\n`
    : hasQpPdf
      ? "NOTE: The FIRST attached PDF is the official Question Paper. The SUBSEQUENT attached PDF/images are the candidate's handwritten Answer Booklet.\n"
      : "NOTE: Evaluate the candidate's attached Answer Booklet against the standard UPSC Mains questions 1.." +
        totalQuestions +
        ".\n"
}
${typedNotes ? `CANDIDATE TYPED NOTES / ANSWERS:\n${typedNotes}\n` : ""}

Instructions:
1. Match each written answer in the candidate's Answer Booklet to its question number (1 to ${totalQuestions}). If a question has sub-parts like 1(a), 1(b), evaluate them together under that main question number (or as numbered 1..${totalQuestions}) and sum their marks accurately.
2. For unattempted questions, set marksAwarded to 0, assessment to "needs-work", and comment "Not attempted in the uploaded answer booklet."
3. Apply realistic UPSC Mains marking (strict: top answers typically score 45%-60% of maxMarks; mediocre answers 30%-45%).
4. Return ONLY valid JSON with this exact schema:
{
  "overallFeedback": "3-4 sentence examiner synthesis covering structure, depth, directives, and top 2 actionable improvements.",
  "questionResults": [
    {
      "questionNo": 1,
      "marksAwarded": 4.5,
      "maxMarks": 10,
      "assessment": "partial",
      "comment": "2-3 concise sentences of specific strengths, missing dimensions, and how to improve."
    }
  ]
}
Allowed values for "assessment": "strong", "partial", "needs-work".`;

    let rawText = "";
    if (provider === "gemini") {
      rawText = await callGeminiMultimodal({
        apiKey,
        prompt,
        attachments: allMedia,
      });
    } else if (provider === "openai") {
      rawText = await callOpenAIMultimodal({
        apiKey,
        prompt,
        attachments: allMedia,
      });
    } else if (provider === "anthropic") {
      rawText = await callAnthropicMultimodal({
        apiKey,
        prompt,
        attachments: allMedia,
        systemPrompt:
          "You are a strict UPSC Civil Services Mains Examiner. Output ONLY valid JSON matching the requested schema, with no markdown fences or extra text.",
      });
    } else if (provider === "groq") {
      rawText = await callGroqMultimodal({
        apiKey,
        prompt,
        attachments: allMedia,
      });
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: `Provider "${provider}" is not supported for paper booklet evaluation.`,
        },
        { status: 400 },
      );
    }

    const parsed = parseJsonFromText(rawText);
    if (!parsed || !Array.isArray(parsed.questionResults)) {
      console.warn(
        "Mains paper evaluation JSON parse failed:",
        rawText.slice(0, 300),
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            "The AI evaluator returned an unformatted response. Please retry the evaluation.",
        },
        { status: 502 },
      );
    }

    const rawResults = parsed.questionResults;

    const questionResults = rawResults
      .map((item: any) => {
        const qNo = Number(item.questionNo);
        const maxM =
          Number(item.maxMarks) > 0 ? Number(item.maxMarks) : defaultPerQMarks;
        const awarded = Math.max(
          0,
          Math.min(maxM, Number(item.marksAwarded) || 0),
        );
        const assessment =
          item.assessment === "strong" ||
          item.assessment === "partial" ||
          item.assessment === "needs-work"
            ? item.assessment
            : awarded >= maxM * 0.55
              ? "strong"
              : awarded >= maxM * 0.35
                ? "partial"
                : "needs-work";
        return {
          questionNo: qNo,
          marksAwarded: Math.round(awarded * 10) / 10,
          maxMarks: Math.round(maxM * 10) / 10,
          assessment,
          comment: String(item.comment || "").trim(),
        };
      })
      .filter((r: any) => Number.isFinite(r.questionNo) && r.questionNo >= 1);

    const computedTotalScore =
      Math.round(
        questionResults.reduce(
          (sum: number, r: any) => sum + r.marksAwarded,
          0,
        ) * 10,
      ) / 10;

    return NextResponse.json({
      ok: true,
      evaluatedByProvider: provider,
      totalScore: computedTotalScore,
      maxScore: totalMarks,
      overallFeedback: String(parsed?.overallFeedback || "").trim(),
      questionResults,
    });
  } catch (error: any) {
    console.error("Mains paper evaluation error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to evaluate subjective paper.",
      },
      { status: 500 },
    );
  }
}

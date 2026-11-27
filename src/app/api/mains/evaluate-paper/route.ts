import { NextRequest, NextResponse } from "next/server";
import { RevisionProviderConfig } from "@/lib/types";

export const runtime = "nodejs";

interface MediaAttachment {
  mimeType: string;
  data: string;
  name?: string;
}

interface QuestionSummaryInput {
  questionNo: number;
  text: string;
  maxMarks?: number;
}

function stripBase64Prefix(data: string): string {
  return data.replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
}

function parseJsonResponse(raw: string): any {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice =
    start !== -1 && end !== -1 && end > start
      ? cleaned.slice(start, end + 1)
      : cleaned;
  return JSON.parse(slice);
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

async function callGemini(
  apiKey: string,
  prompt: string,
  attachments: MediaAttachment[],
): Promise<string> {
  const models = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"];
  const parts: any[] = [{ text: prompt }];
  for (const att of attachments) {
    parts.push({
      inline_data: {
        mime_type: att.mimeType || "image/jpeg",
        data: stripBase64Prefix(att.data),
      },
    });
  }

  let lastError = "";
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 6000,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(55000),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const text = (data.candidates?.[0]?.content?.parts || [])
          .map((p: any) => p.text || "")
          .join("")
          .trim();
        if (text) return text;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
      }
    } catch (err: any) {
      lastError = err?.message || "Gemini connection error";
    }
  }
  throw new Error(
    `Google Gemini evaluation failed (${models[0]}): ${lastError}`,
  );
}

async function callOpenAI(
  apiKey: string,
  prompt: string,
  attachments: MediaAttachment[],
): Promise<string> {
  const models = ["gpt-4o", "gpt-4o-mini"];
  const content: any[] = [{ type: "text", text: prompt }];

  for (const att of attachments) {
    const clean = stripBase64Prefix(att.data);
    const mime = (att.mimeType || "image/jpeg").toLowerCase().trim();
    if (mime === "application/pdf") {
      content.push({
        type: "file",
        file: {
          filename: att.name || "document.pdf",
          file_data: `data:application/pdf;base64,${clean}`,
        },
      });
    } else {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${mime === "image/jpg" ? "image/jpeg" : mime};base64,${clean}`,
          detail: "high",
        },
      });
    }
  }

  let lastError = "";
  for (const model of models) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content }],
          temperature: 0.25,
          max_tokens: 6000,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(55000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        if (text) return text;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
      }
    } catch (err: any) {
      lastError = err?.message || "OpenAI connection error";
    }
  }
  throw new Error(`OpenAI evaluation failed: ${lastError}`);
}

async function callAnthropic(
  apiKey: string,
  prompt: string,
  attachments: MediaAttachment[],
): Promise<string> {
  const models = ["claude-sonnet-4-5-20250929", "claude-3-7-sonnet-latest"];
  const content: any[] = [];

  for (const att of attachments) {
    const clean = stripBase64Prefix(att.data);
    const mime = (att.mimeType || "image/jpeg").toLowerCase().trim();
    if (mime === "application/pdf") {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: clean,
        },
      });
    } else {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mime === "image/jpg" ? "image/jpeg" : mime,
          data: clean,
        },
      });
    }
  }
  content.push({ type: "text", text: prompt });

  let lastError = "";
  for (const model of models) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content }],
          max_tokens: 6000,
          temperature: 0.25,
        }),
        signal: AbortSignal.timeout(55000),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text || "";
        if (text) return text;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
      }
    } catch (err: any) {
      lastError = err?.message || "Anthropic connection error";
    }
  }
  throw new Error(`Anthropic evaluation failed: ${lastError}`);
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

    if (provider === "groq" && answerAttachments.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Groq does not support PDF/image answer booklet evaluation. Please switch to Gemini, OpenAI, or Claude.",
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
    } else if (qpUrl) {
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
      rawText = await callGemini(apiKey, prompt, allMedia);
    } else if (provider === "openai") {
      rawText = await callOpenAI(apiKey, prompt, allMedia);
    } else if (provider === "anthropic") {
      rawText = await callAnthropic(apiKey, prompt, allMedia);
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: `Provider "${provider}" is not supported for paper booklet evaluation.`,
        },
        { status: 400 },
      );
    }

    const parsed = parseJsonResponse(rawText);
    const rawResults = Array.isArray(parsed?.questionResults)
      ? parsed.questionResults
      : [];

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

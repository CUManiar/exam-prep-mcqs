import { NextRequest, NextResponse } from "next/server";
import {
  buildMainsEvaluationPrompt,
  MainsEvaluationResult,
} from "@/lib/mainsEvaluation";
import { RevisionProviderConfig } from "@/lib/types";

export const runtime = "nodejs";

function cleanJsonString(str: string): string {
  return str
    .replace(/"((?:[^"\\]|\\.)*)"/gs, (_, content) => {
      return (
        '"' +
        content
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r")
          .replace(/\t/g, "\\t") +
        '"'
      );
    })
    .replace(/,\s*([}\]])/g, "$1");
}

function tryRepairTruncatedJson(str: string): any {
  let s = str.trim();
  // Strip opening markdown fences if present
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const firstBrace = s.indexOf("{");
  if (firstBrace !== -1) {
    s = s.slice(firstBrace);
  }

  // Count unescaped quotes
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && inString) {
      escaped = !escaped;
    } else if (c === '"' && !escaped) {
      inString = !inString;
    } else {
      escaped = false;
    }
  }

  // If truncated inside a string literal, close the quote
  if (inString) {
    s += '"';
  }

  // Count unclosed braces and brackets
  let openBraces = 0;
  let openBrackets = 0;
  inString = false;
  escaped = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && inString) {
      escaped = !escaped;
    } else if (c === '"' && !escaped) {
      inString = !inString;
    } else if (!inString) {
      if (c === "{") openBraces++;
      if (c === "}") openBraces--;
      if (c === "[") openBrackets++;
      if (c === "]") openBrackets--;
    } else {
      escaped = false;
    }
  }

  while (openBrackets > 0) {
    s += "]";
    openBrackets--;
  }
  while (openBraces > 0) {
    s += "}";
    openBraces--;
  }

  try {
    return JSON.parse(s);
  } catch {
    try {
      return JSON.parse(cleanJsonString(s));
    } catch {}
  }
  return null;
}

export function formatCleanModelAnswer(
  text: string,
  context?: {
    question?: string;
    paperType?: string;
    optionalSubject?: string;
    maxMarks?: number;
    directive?: string;
  },
): string {
  if (!text || !text.trim()) {
    return "A topper model answer was not provided in this evaluation. You can request a complete model answer in the 'Ask Examiner' tab.";
  }
  let trimmed = text.trim();

  // If text starts with a JSON object or contains JSON keys, extract the modelAnswer value
  if (
    trimmed.startsWith("{") ||
    trimmed.includes('"modelAnswer"') ||
    trimmed.includes('"question":') ||
    trimmed.includes('"marksAwarded":')
  ) {
    const match =
      trimmed.match(
        /"modelAnswer"\s*:\s*"([\s\S]*?)(?:",\s*"[a-zA-Z]+"|"\s*\}|$)/i,
      ) || trimmed.match(/"modelAnswer"\s*:\s*"([\s\S]*)/i);
    if (match) {
      let clean = match[1];
      clean = clean
        .replace(/"\s*,\s*"[a-zA-Z]+".*$/s, "")
        .replace(/"\s*\}\s*$/, "")
        .replace(/"\s*$/, "");
      clean = clean
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\t/g, "\t")
        .trim();
      if (clean && !clean.startsWith("{") && clean.length > 20) {
        return clean;
      }
    }
    // Failed to extract a valid modelAnswer string from JSON dump
    return "A topper model answer was not provided in this evaluation. You can request a complete model answer in the 'Ask Examiner' tab.";
  }

  // If text is still surrounded by braces or looks like raw code
  if (trimmed.startsWith("{") || trimmed.endsWith("}")) {
    return "A topper model answer was not provided in this evaluation. You can request a complete model answer in the 'Ask Examiner' tab.";
  }

  let cleaned = trimmed.replace(/\\n/g, "\n").replace(/\\"/g, '"');
  // Strip meta-commentary headers so it remains strictly a clean model answer
  cleaned = cleaned
    .replace(/^#+\s*(?:Topper\s+)?Model\s+Answer[^\n]*\n+/i, "")
    .replace(/^\*\*(?:Word\s+Count|Words?|Time Limit|Target)[^\n]*\n+/gim, "")
    .replace(/^\*(?:Word\s+Count|Words?|Time Limit|Target)[^\n]*\n+/gim, "")
    // Strip artificial Value-Addition Box callouts from model answers
    .replace(
      /^>\s*\*{0,2}(?:Topper\s+)?(?:Value[- ]Addition|Value Add|Examiner Note)(?: Box)?\*{0,2}:?[\s\S]*?(?=\n\n\S|\n#{1,6}\s|$)/gim,
      "",
    )
    .replace(
      /^\*{1,2}(?:Topper\s+)?(?:Value[- ]Addition|Value Add)(?: Box)?\*{1,2}:?[\s\S]*?(?=\n\n\S|\n#{1,6}\s|$)/gim,
      "",
    )
    .trim();

  return cleaned;
}

function parseJsonFromText(raw: string): any {
  if (!raw || typeof raw !== "string") return null;

  // 1. Try direct parse
  try {
    return JSON.parse(raw);
  } catch {}

  // 2. Try sanitize + direct parse
  try {
    return JSON.parse(cleanJsonString(raw));
  } catch {}

  // 3. Try markdown code block extraction
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch {
      try {
        return JSON.parse(cleanJsonString(match[1]));
      } catch {}
    }
  }

  // 4. Try finding outermost { ... }
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = raw.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        return JSON.parse(cleanJsonString(candidate));
      } catch {}
    }
  }

  // 5. Try auto-repairing truncated JSON
  const repaired = tryRepairTruncatedJson(raw);
  if (repaired) return repaired;

  return null;
}

/** Dynamically discover active models from a Gemini key */
async function discoverGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (listRes.ok) {
      const data = await listRes.json();
      const models = (data.models || [])
        .filter((m: any) =>
          m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m: any) => m.name.replace(/^models\//, "") as string)
        .filter(
          (name: string) =>
            !name.includes("embedding") &&
            !name.includes("aqa") &&
            !name.includes("imagen") &&
            !name.includes("learnlm") &&
            !name.includes("tts") &&
            !name.includes("realtime") &&
            !name.includes("preview-image") &&
            !name.includes("preview-tts") &&
            !name.includes("2.5-flash-preview"),
        );

      models.sort((a, b) => {
        const score = (id: string) => {
          let s = 0;
          if (id === "gemini-2.0-flash") s += 100;
          if (id === "gemini-1.5-flash") s += 90;
          if (id === "gemini-1.5-pro") s += 80;
          if (id === "gemini-1.5-flash-8b") s += 70;
          if (id.includes("2.0-flash")) s += 60;
          if (id.includes("1.5-flash")) s += 50;
          if (id.includes("pro")) s += 30;
          return s;
        };
        return score(b) - score(a);
      });

      if (models.length > 0) return models;
    }
  } catch (e: any) {
    console.warn("Gemini model discovery failed:", e?.message);
  }
  return [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash-8b",
  ];
}

/** Execute with Google Gemini */
async function callGeminiEvaluation(
  apiKey: string,
  prompt: string,
  images: Array<{ mimeType: string; data: string }> = [],
): Promise<string> {
  const discovered = await discoverGeminiModels(apiKey);
  const models =
    discovered.length > 0
      ? discovered.slice(0, 4)
      : ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  let lastError = "";

  const preparedParts: any[] = [{ text: prompt }];
  for (const img of images) {
    let mime = (img.mimeType || "image/jpeg").toLowerCase().trim();
    if (mime === "image/jpg") mime = "image/jpeg";
    const cleanData = img.data
      .replace(/^data:[^;]+;base64,/, "")
      .replace(/\s+/g, "");
    preparedParts.push({
      inlineData: {
        mimeType: mime,
        data: cleanData,
      },
    });
  }

  for (const rawModel of models) {
    const cleanModel = rawModel.replace(/^models\//, "");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: preparedParts }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4000,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(50000),
      });

      if (res.ok) {
        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const text = parts
          .map((p: any) => p.text || "")
          .join("")
          .trim();
        if (text) return text;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
        // If responseMimeType is rejected with 400 Bad Request, retry without it
        if (
          res.status === 400 &&
          lastError.toLowerCase().includes("responsemimetype")
        ) {
          const retryRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: preparedParts }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 4000,
              },
            }),
            signal: AbortSignal.timeout(50000),
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const retryParts = retryData.candidates?.[0]?.content?.parts || [];
            const retryText = retryParts
              .map((p: any) => p.text || "")
              .join("")
              .trim();
            if (retryText) return retryText;
          }
        }
      }
    } catch (e: any) {
      lastError = e?.message || "Gemini connection error";
    }
  }

  throw new Error(
    `Google Gemini evaluation failed across models (${models.slice(0, 3).join(", ")}): ${lastError}`,
  );
}

/** Execute with OpenAI */
async function callOpenAIEvaluation(
  apiKey: string,
  prompt: string,
  images: Array<{ mimeType: string; data: string }> = [],
): Promise<string> {
  const models = ["gpt-4o-mini", "gpt-4o"];
  let lastError = "";

  const content: any[] = [{ type: "text", text: prompt }];
  for (const img of images) {
    let mime = (img.mimeType || "image/jpeg").toLowerCase().trim();
    if (mime === "image/jpg") mime = "image/jpeg";
    if (mime === "application/pdf") continue; // OpenAI chat completions does not accept raw PDF in image_url

    const cleanData = img.data
      .replace(/^data:[^;]+;base64,/, "")
      .replace(/\s+/g, "");
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${mime};base64,${cleanData}`,
        detail: "high",
      },
    });
  }

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
          temperature: 0.3,
          max_tokens: 4000,
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
    } catch (e: any) {
      lastError = e?.message || "OpenAI connection error";
    }
  }

  throw new Error(lastError || "OpenAI evaluation failed");
}

/** Execute with Anthropic */
async function callAnthropicEvaluation(
  apiKey: string,
  prompt: string,
  images: Array<{ mimeType: string; data: string }> = [],
): Promise<string> {
  const models = ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"];
  let lastError = "";

  const content: any[] = [];
  for (const img of images) {
    const base64Clean = img.data.replace(/^data:[^;]+;base64,/, "");
    const mime = img.mimeType || "image/jpeg";
    if (mime === "application/pdf") {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64Clean,
        },
      });
    } else {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mime,
          data: base64Clean,
        },
      });
    }
  }
  content.push({ type: "text", text: prompt });

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
          max_tokens: 4000,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text || "";
        if (text) return text;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
      }
    } catch (e: any) {
      lastError = e?.message || "Anthropic connection error";
    }
  }

  throw new Error(lastError || "Anthropic evaluation failed");
}

/** Execute with Groq */
async function callGroqEvaluation(
  apiKey: string,
  prompt: string,
  images: Array<{ mimeType: string; data: string }> = [],
  answerText: string = "",
): Promise<string> {
  const isVision = images.length > 0;

  let visionContent: any[] = [{ type: "text", text: prompt }];
  if (isVision) {
    for (const img of images) {
      let mime = (img.mimeType || "image/jpeg").toLowerCase().trim();
      if (mime === "image/jpg") mime = "image/jpeg";
      if (mime === "application/pdf") continue;
      const cleanData = img.data
        .replace(/^data:[^;]+;base64,/, "")
        .replace(/\s+/g, "");
      visionContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mime};base64,${cleanData}`,
        },
      });
    }
  }

  // Use vision models if images are attached; fallback to versatile text model
  const models = isVision
    ? ["llama-3.2-11b-vision-preview", "llama-3.2-90b-vision-preview"]
    : ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  let lastError = "";

  for (const model of models) {
    try {
      const payload: any = {
        model,
        messages: [
          {
            role: "user",
            content: isVision ? visionContent : prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 3500,
        response_format: { type: "json_object" },
      };

      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(50000),
        },
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        if (text) return text;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
      }
    } catch (e: any) {
      lastError = e?.message || "Groq connection error";
    }
  }

  // If Groq vision model failed or quota exceeded and candidate has typed text, fallback to text-based evaluation
  if (isVision && answerText.trim()) {
    return callGroqEvaluation(apiKey, prompt, [], answerText);
  }

  throw new Error(lastError || "Groq evaluation failed");
}

/** Fallback Live Tier (Pollinations) */
async function callFreeTier(prompt: string): Promise<string> {
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You are a senior UPSC CSE Mains examiner. Output ONLY valid JSON according to the schema requested.",
        },
        { role: "user", content: prompt },
      ],
      model: "openai-fast",
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(75000),
  });

  const raw = await res.text();
  if (res.ok && raw && raw.trim() && !raw.startsWith("<!DOCTYPE")) {
    return raw;
  }
  throw new Error("Free evaluation service timed out.");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      question,
      answerText = "",
      paperType = "GS-2",
      optionalSubject = "",
      maxMarks = 10,
      images = [],
      providerConfig,
    }: {
      question?: string;
      answerText?: string;
      paperType?: "GS-1" | "GS-2" | "GS-3" | "GS-4" | "Optional";
      optionalSubject?: string;
      maxMarks?: 10 | 15 | 20;
      images?: Array<{ mimeType: string; data: string }>;
      providerConfig?: RevisionProviderConfig | null;
    } = body;

    const trimmedQuestion = (question || "").trim();
    const trimmedAnswer = (answerText || "").trim();
    const rawImages = Array.isArray(images) ? images : [];

    // Filter out corrupted or zero-length image payloads
    const validImages = rawImages.filter((img) => {
      if (!img || !img.data) return false;
      const cleanData = img.data.replace(/^data:[^;]+;base64,/, "").trim();
      return cleanData.length > 300; // Real page snapshot base64 is at least several KB
    });

    const hasValidImages = validImages.length > 0;
    const hasMeaningfulText = trimmedAnswer.length >= 20;

    // Reject empty or trivial submissions immediately without consuming tokens or calling AI APIs
    if (!hasMeaningfulText && !hasValidImages) {
      if (trimmedAnswer.length > 0 && trimmedAnswer.length < 20) {
        return NextResponse.json(
          {
            error:
              "Answer text is too short to evaluate (minimum 20 characters required). Please provide your complete answer.",
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        {
          error:
            "No answer content found. Please type or paste your written answer, or upload a clear answer sheet photo/PDF.",
        },
        { status: 400 },
      );
    }

    const userApiKey = providerConfig?.apiKey?.trim();
    const provider = providerConfig?.provider;
    const serverGeminiKey = process.env.GEMINI_API_KEY?.trim();

    // Early validation: Groq cannot process image uploads without text
    if (hasValidImages && !trimmedAnswer && provider === "groq") {
      return NextResponse.json(
        {
          error:
            "Groq Cloud currently only supports text models and does not support image or handwritten OCR. Please select Google Gemini (free at aistudio.google.com) in AI Revision Settings, or type/paste your answer directly in the text tab.",
        },
        { status: 400 },
      );
    }

    const evaluationPrompt = buildMainsEvaluationPrompt({
      question: trimmedQuestion,
      answerText: trimmedAnswer,
      paperType,
      optionalSubject,
      maxMarks,
      hasAttachment: hasValidImages,
    });

    let rawOutput = "";

    // 1. User-configured provider
    if (userApiKey && provider) {
      try {
        if (provider === "gemini") {
          rawOutput = await callGeminiEvaluation(
            userApiKey,
            evaluationPrompt,
            validImages,
          );
        } else if (provider === "openai") {
          rawOutput = await callOpenAIEvaluation(
            userApiKey,
            evaluationPrompt,
            validImages,
          );
        } else if (provider === "anthropic") {
          rawOutput = await callAnthropicEvaluation(
            userApiKey,
            evaluationPrompt,
            validImages,
          );
        } else if (provider === "groq") {
          rawOutput = await callGroqEvaluation(
            userApiKey,
            evaluationPrompt,
            validImages,
            trimmedAnswer,
          );
        }
      } catch (err: any) {
        console.warn(
          `User-configured ${provider} evaluation failed:`,
          err?.message,
        );
        return NextResponse.json(
          {
            error: `${provider.toUpperCase()} Evaluation Error: ${err?.message || "Evaluation request failed"}. Please verify your API key in AI Provider Settings.`,
          },
          { status: 400 },
        );
      }
    }

    // 2. Server-side Gemini Key fallback
    if (!rawOutput && serverGeminiKey) {
      try {
        rawOutput = await callGeminiEvaluation(
          serverGeminiKey,
          evaluationPrompt,
          validImages,
        );
      } catch (err: any) {
        console.warn("Server Gemini evaluation failed:", err?.message);
      }
    }

    // 3. Free Live Tier fallback (Text only)
    if (!rawOutput) {
      if (hasValidImages && !trimmedAnswer) {
        return NextResponse.json(
          {
            error:
              "To evaluate handwritten answer sheets or uploaded images/PDFs, please configure a Google Gemini API Key (free at aistudio.google.com) in AI Revision Settings, or type/paste your answer directly in the text tab.",
          },
          { status: 400 },
        );
      }
      rawOutput = await callFreeTier(evaluationPrompt);
    }

    const parsed = parseJsonFromText(rawOutput);

    if (
      !parsed ||
      (typeof parsed.marksAwarded !== "number" &&
        typeof parsed.marks !== "number" &&
        typeof parsed.score !== "number" &&
        isNaN(
          parseFloat(
            String(parsed.marksAwarded || parsed.marks || parsed.score),
          ),
        ))
    ) {
      console.warn(
        "Structured JSON parse failed on rawOutput:",
        rawOutput.slice(0, 300),
      );
      return NextResponse.json(
        {
          error:
            "The AI evaluator returned an unformatted assessment. Please retry the evaluation.",
        },
        { status: 502 },
      );
    }

    // Check if the evaluator indicated that the student's answer was missing or unreadable
    const isAnswerMissingOrUnreadable = (data: any): boolean => {
      if (!data) return false;
      const directiveAnalysis = (data.directiveAnalysis || "").toLowerCase();
      const bodyComment = (
        data.rubric?.bodyContent?.comment || ""
      ).toLowerCase();
      const introComment = (
        data.rubric?.introduction?.comment || ""
      ).toLowerCase();
      const weaknesses = (
        Array.isArray(data.weaknesses) ? data.weaknesses.join(" ") : ""
      ).toLowerCase();
      const missingDims = (
        Array.isArray(data.missingDimensions)
          ? data.missingDimensions.join(" ")
          : ""
      ).toLowerCase();

      const missingKeywords = [
        "answer text is missing",
        "answer is missing",
        "no answer text",
        "absence of answer",
        "unable to assess",
        "no body content present",
        "no content provided",
        "no attempt",
        "cannot evaluate content",
        "unreadable",
        "illegible",
      ];

      const matchesKeyword = missingKeywords.some(
        (kw) =>
          directiveAnalysis.includes(kw) ||
          bodyComment.includes(kw) ||
          introComment.includes(kw) ||
          weaknesses.includes(kw) ||
          missingDims.includes(kw),
      );

      const bodyScore = Number(
        data.dimensions?.content?.score ?? data.rubric?.bodyContent?.score ?? 0,
      );
      return matchesKeyword && bodyScore <= 1.0;
    };

    if (
      hasValidImages &&
      !trimmedAnswer &&
      isAnswerMissingOrUnreadable(parsed)
    ) {
      return NextResponse.json(
        {
          error:
            "The AI evaluator could not detect or read any handwritten answer from your uploaded file. Please ensure the image is clear and well-lit, or type/paste your answer directly in the text tab.",
        },
        { status: 422 },
      );
    }

    const resolvedQuestion =
      trimmedQuestion ||
      (parsed?.question && String(parsed.question).trim()) ||
      "UPSC CSE Mains Question";

    const marksNum =
      typeof parsed.marksAwarded === "number"
        ? parsed.marksAwarded
        : parseFloat(
            String(parsed.marksAwarded || parsed.marks || parsed.score || 0),
          );
    const safeMarks = isNaN(marksNum)
      ? 0
      : Math.min(Math.max(marksNum, 0), maxMarks);

    // Honest scoring: do not inflate 0 marks or invent random numbers
    const finalMarks = safeMarks;
    const targetWordCount = maxMarks === 10 ? 150 : maxMarks === 15 ? 250 : 300;
    const timeLimitMinutes = maxMarks === 10 ? 7 : maxMarks === 15 ? 11 : 20;

    const rawTranscribed =
      typeof parsed.transcribedAnswer === "string"
        ? parsed.transcribedAnswer.trim()
        : "";

    const isUnreadable =
      rawTranscribed.toUpperCase().startsWith("UNREADABLE:") ||
      rawTranscribed.toLowerCase().includes("cannot be transcribed") ||
      rawTranscribed.toLowerCase().includes("illegible");

    const ocrWarning = isUnreadable
      ? rawTranscribed.replace(/^UNREADABLE:\s*/i, "").trim()
      : !rawTranscribed && hasValidImages && !trimmedAnswer
        ? "The handwriting, scan resolution, or contrast in the uploaded sheet was not clear enough for high-fidelity verbatim text extraction. However, the UPSC examiner evaluated the conceptual content, structure, and points directly from your attached image pages."
        : undefined;

    const transcribedText =
      !isUnreadable &&
      rawTranscribed.length > 10 &&
      !rawTranscribed.startsWith("Clean verbatim or faithful")
        ? rawTranscribed
        : "";

    let actualWordCount = 0;
    if (trimmedAnswer) {
      actualWordCount = trimmedAnswer
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
    } else if (
      typeof parsed.actualWordCount === "number" &&
      parsed.actualWordCount > 0
    ) {
      actualWordCount = parsed.actualWordCount;
    } else if (transcribedText) {
      actualWordCount = transcribedText.split(/\s+/).filter(Boolean).length;
    } else if (
      Array.isArray(parsed.markedCopy) &&
      parsed.markedCopy.length > 0
    ) {
      // Estimate based on the quotes extracted by examiner from the student copy
      const quoteWords = parsed.markedCopy
        .map(
          (m: any) =>
            (m.quote || "").trim().split(/\s+/).filter(Boolean).length,
        )
        .reduce((sum: number, count: number) => sum + count, 0);
      actualWordCount = Math.max(quoteWords, Math.round(targetWordCount * 0.9));
    }
    const percentage = Math.round((finalMarks / maxMarks) * 100);

    // Compute 4 Core Dimensions (/10 each)
    const baseDimScore = Math.min(
      10,
      Math.max(0, Math.round((finalMarks / maxMarks) * 10 * 10) / 10),
    );

    const parseDim = (dim: any, fallbackComment: string) => {
      let rawScore =
        typeof dim?.score === "number"
          ? dim.score
          : typeof dim?.percentage === "number"
            ? dim.percentage
            : typeof dim === "number"
              ? dim
              : baseDimScore;

      // Grade sub-scores as percentages (0-100), never out of 10
      if (rawScore <= 10 && (dim?.max === 10 || rawScore <= 10)) {
        rawScore = Math.round(rawScore * 10);
      }
      const score = Math.min(100, Math.max(0, Math.round(rawScore)));
      return {
        score,
        max: 100,
        percentage: score,
        comment:
          typeof dim?.comment === "string" && dim.comment.trim()
            ? dim.comment.trim()
            : fallbackComment,
      };
    };

    const dimensions = {
      demand: parseDim(
        parsed.dimensions?.demand,
        parsed.directiveAnalysis || "Demand and sub-parts compliance.",
      ),
      content: parseDim(
        parsed.dimensions?.content,
        parsed.rubric?.bodyContent?.comment ||
          "Content depth, empirical evidence, and authentic citations.",
      ),
      structure: parseDim(
        parsed.dimensions?.structure,
        parsed.rubric?.structurePresentation?.comment ||
          "Intro, keyword headings, numbered points, and synthesis.",
      ),
      presentation: parseDim(
        parsed.dimensions?.presentation,
        `Word limit compliance and ${timeLimitMinutes}-minute time writability.`,
      ),
    };

    const markedCopy = Array.isArray(parsed.markedCopy)
      ? parsed.markedCopy
          .filter((item: any) => item && (item.quote || item.note))
          .map((item: any) => {
            const quote = String(item.quote || "").trim();
            const note = String(item.note || "").trim();
            let rawType = String(item.type || "")
              .toLowerCase()
              .trim();

            let inferredType: "correct" | "incorrect" | "flawed" | "verify" =
              "flawed";
            if (
              rawType.includes("correct") ||
              rawType.includes("accurate") ||
              rawType.includes("good") ||
              rawType.includes("strength") ||
              rawType.includes("earned")
            ) {
              inferredType = "correct";
            } else if (
              rawType.includes("incorrect") ||
              rawType.includes("wrong") ||
              rawType.includes("error") ||
              rawType.includes("mistake") ||
              rawType.includes("misattributed")
            ) {
              inferredType = "incorrect";
            } else if (
              rawType.includes("verify") ||
              rawType.includes("doubt") ||
              note.includes("⚠️") ||
              note.toLowerCase().includes("verify")
            ) {
              inferredType = "verify";
            } else if (
              rawType.includes("flaw") ||
              rawType.includes("informal") ||
              rawType.includes("structure") ||
              rawType.includes("weak")
            ) {
              inferredType = "flawed";
            } else {
              const noteLower = note.toLowerCase();
              if (
                note.includes("⚠️") ||
                noteLower.includes("verify") ||
                noteLower.includes("unverified")
              ) {
                inferredType = "verify";
              } else if (
                noteLower.includes("wrong") ||
                noteLower.includes("incorrect") ||
                noteLower.includes("misattributed") ||
                noteLower.includes("not comte") ||
                noteLower.includes("spelling error")
              ) {
                inferredType = "incorrect";
              } else if (
                noteLower.includes("accurate") ||
                noteLower.includes("correct") ||
                noteLower.includes("good") ||
                noteLower.includes("well framed") ||
                noteLower.includes("earns marks")
              ) {
                inferredType = "correct";
              }
            }

            return {
              quote,
              note,
              type: inferredType,
            };
          })
      : [];

    const strengths = Array.isArray(parsed.strengths)
      ? parsed.strengths.map((s: any) => String(s).trim()).filter(Boolean)
      : [];

    const weaknesses = Array.isArray(parsed.weaknesses)
      ? parsed.weaknesses.map((w: any) => String(w).trim()).filter(Boolean)
      : [];

    const missingDimensions = Array.isArray(parsed.missingDimensions)
      ? parsed.missingDimensions
          .map((m: any) => String(m).trim())
          .filter(Boolean)
      : [];

    const actionableRoadmap = Array.isArray(parsed.actionableRoadmap)
      ? parsed.actionableRoadmap
          .map((a: any) => String(a).trim())
          .filter(Boolean)
      : [];

    const sanitizeDiagramIdea = (rawDiagram: any): string | undefined => {
      if (!rawDiagram || typeof rawDiagram !== "string") return undefined;
      const trimmed = rawDiagram.trim();
      const lower = trimmed.toLowerCase();
      if (
        !trimmed ||
        lower === "null" ||
        lower === "none" ||
        lower === "n/a" ||
        lower.startsWith("none required") ||
        lower.startsWith("no diagram")
      ) {
        return undefined;
      }
      const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);
      if (
        lines.length <= 1 &&
        trimmed.length < 50 &&
        (trimmed.includes("-->") || trimmed.includes("->"))
      ) {
        return undefined;
      }
      if (
        !trimmed.includes("[") &&
        !trimmed.includes("|") &&
        !trimmed.includes("+") &&
        !trimmed.includes("->") &&
        !trimmed.includes("-->")
      ) {
        return undefined;
      }
      return trimmed;
    };

    const cleanDiagramIdea = sanitizeDiagramIdea(parsed.diagramIdea);

    const bodyScore =
      typeof parsed.rubric?.bodyContent?.score === "number"
        ? parsed.rubric.bodyContent.score
        : 0;

    const result: MainsEvaluationResult = {
      id: `eval_${Date.now()}`,
      question: resolvedQuestion,
      studentAnswer:
        trimmedAnswer ||
        transcribedText ||
        (hasValidImages
          ? "(Answer submitted via uploaded document/images)"
          : ""),
      transcribedAnswer: transcribedText || undefined,
      ocrWarning: ocrWarning || undefined,
      paperType,
      optionalSubject: optionalSubject?.trim() || undefined,
      maxMarks,
      targetWordCount,
      actualWordCount,
      timeLimitMinutes,
      marksAwarded: finalMarks,
      percentage,
      verdict:
        parsed.verdict ||
        (percentage >= 50
          ? "Topper Tier"
          : percentage >= 35
            ? "Average Attempt"
            : "Below Average"),
      directive: parsed.directive || "General",
      directiveAnalysis: parsed.directiveAnalysis || "",
      evaluatorVersion: parsed.evaluatorVersion || "v2.5-po-calibrated",
      evaluatedByProvider:
        userApiKey && provider
          ? provider
          : serverGeminiKey
            ? "gemini"
            : "free-ai",
      dimensions,
      markedCopy,
      rubric: {
        introduction: parsed.rubric?.introduction || {
          score: 0,
          max: maxMarks === 10 ? 2 : 3,
          comment: "",
        },
        bodyContent: {
          score: bodyScore,
          max: parsed.rubric?.bodyContent?.max || (maxMarks === 10 ? 4.5 : 6.5),
          comment: parsed.rubric?.bodyContent?.comment || "",
        },
        structurePresentation: parsed.rubric?.structurePresentation || {
          score: 0,
          max: 1.5,
          comment: "",
        },
        valueAddition: parsed.rubric?.valueAddition || {
          score: 0,
          max: 1.5,
          comment: "",
        },
        conclusion: parsed.rubric?.conclusion || {
          score: 0,
          max: maxMarks === 10 ? 1.5 : 2.5,
          comment: "",
        },
      },
      strengths,
      weaknesses,
      missingDimensions,
      actionableRoadmap,
      diagramIdea: cleanDiagramIdea,
      modelAnswer: formatCleanModelAnswer(parsed.modelAnswer || "", {
        question: resolvedQuestion,
        paperType,
        optionalSubject,
        maxMarks,
        directive: parsed.directive || "Examine",
      }),
      approachBreakdown: parsed.approachBreakdown || undefined,
      evaluatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, evaluation: result });
  } catch (err: any) {
    console.error("Mains evaluation error:", err);
    return NextResponse.json(
      {
        error: err?.message || "Failed to evaluate Mains answer. Please retry.",
      },
      { status: 500 },
    );
  }
}

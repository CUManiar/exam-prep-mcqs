import { NextRequest, NextResponse } from "next/server";
import {
  buildMainsEvaluationPrompt,
  MainsEvaluationResult,
} from "@/lib/mainsEvaluation";
import { RevisionProviderConfig } from "@/lib/types";
import {
  callGeminiMultimodal,
  callOpenAIMultimodal,
  callAnthropicMultimodal,
  callGroqMultimodal,
} from "@/lib/aiProviders";

export const runtime = "nodejs";
export const maxDuration = 120;

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

/** Execute with Google Gemini */
async function callGeminiEvaluation(
  apiKey: string,
  prompt: string,
  images: Array<{ mimeType: string; data: string }> = [],
): Promise<string> {
  return callGeminiMultimodal({
    apiKey,
    prompt,
    attachments: images,
    temperature: 0.3,
    maxOutputTokens: 4000,
    timeoutMs: 60000,
  });
}

/** Execute with OpenAI */
async function callOpenAIEvaluation(
  apiKey: string,
  prompt: string,
  images: Array<{ mimeType: string; data: string }> = [],
): Promise<string> {
  return callOpenAIMultimodal({
    apiKey,
    prompt,
    attachments: images,
    temperature: 0.3,
    maxTokens: 4000,
    timeoutMs: 60000,
  });
}

/** Execute with Anthropic */
async function callAnthropicEvaluation(
  apiKey: string,
  prompt: string,
  images: Array<{ mimeType: string; data: string }> = [],
): Promise<string> {
  return callAnthropicMultimodal({
    apiKey,
    prompt,
    attachments: images,
    systemPrompt:
      "You are a senior UPSC CSE Mains examiner. Output ONLY valid JSON according to the schema requested.",
    temperature: 0.3,
    maxTokens: 4000,
    timeoutMs: 60000,
  });
}

/** Execute with Groq */
async function callGroqEvaluation(
  apiKey: string,
  prompt: string,
  images: Array<{ mimeType: string; data: string }> = [],
  answerText: string = "",
): Promise<string> {
  const nonPdfImages = images.filter(
    (img) => (img.mimeType || "").toLowerCase().trim() !== "application/pdf",
  );
  try {
    return await callGroqMultimodal({
      apiKey,
      prompt,
      attachments: nonPdfImages,
      temperature: 0.3,
      maxTokens: 3500,
      timeoutMs: 50000,
    });
  } catch (err) {
    if (nonPdfImages.length > 0 && answerText.trim()) {
      return callGroqMultimodal({
        apiKey,
        prompt,
        attachments: [],
        temperature: 0.3,
        maxTokens: 3500,
        timeoutMs: 50000,
      });
    }
    throw err;
  }
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
      fallbackProviders?: Array<{ provider: string; apiKey: string }>;
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
    const providerErrors: string[] = [];

    const runProvider = async (prov: string, key: string) => {
      if (prov === "gemini") {
        return callGeminiEvaluation(key, evaluationPrompt, validImages);
      }
      if (prov === "openai") {
        return callOpenAIEvaluation(key, evaluationPrompt, validImages);
      }
      if (prov === "anthropic") {
        return callAnthropicEvaluation(key, evaluationPrompt, validImages);
      }
      if (prov === "groq") {
        if (hasValidImages && !trimmedAnswer) {
          throw new Error(
            "Groq does not support image/PDF OCR without typed text.",
          );
        }
        return callGroqEvaluation(
          key,
          evaluationPrompt,
          validImages,
          trimmedAnswer,
        );
      }
      throw new Error(`Unsupported provider: ${prov}`);
    };

    // 1. User-configured primary provider
    if (userApiKey && provider) {
      try {
        rawOutput = await runProvider(provider, userApiKey);
      } catch (err: any) {
        const msg = `${provider.toUpperCase()}: ${err?.message || "Evaluation request failed"}`;
        console.warn("Primary evaluation failed:", msg);
        providerErrors.push(msg);
      }
    }

    // 2. Fallback to any other configured keys in the user's vault
    if (!rawOutput && Array.isArray(body.fallbackProviders)) {
      for (const fb of body.fallbackProviders) {
        if (!fb?.provider || !fb?.apiKey?.trim()) continue;
        try {
          rawOutput = await runProvider(fb.provider, fb.apiKey.trim());
          if (rawOutput) break;
        } catch (err: any) {
          const msg = `${fb.provider.toUpperCase()}: ${err?.message || "Evaluation request failed"}`;
          console.warn("Vault fallback evaluation failed:", msg);
          providerErrors.push(msg);
        }
      }
    }

    // 3. Server-side Gemini Key fallback
    if (!rawOutput && serverGeminiKey) {
      try {
        rawOutput = await callGeminiEvaluation(
          serverGeminiKey,
          evaluationPrompt,
          validImages,
        );
      } catch (err: any) {
        const msg = `SERVER GEMINI: ${err?.message || "Evaluation request failed"}`;
        console.warn("Server Gemini evaluation failed:", msg);
        providerErrors.push(msg);
      }
    }

    if (!rawOutput && providerErrors.length > 0) {
      return NextResponse.json(
        {
          error: providerErrors.join("\n"),
        },
        { status: 400 },
      );
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

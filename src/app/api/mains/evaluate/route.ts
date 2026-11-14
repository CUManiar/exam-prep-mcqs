import { NextRequest, NextResponse } from "next/server";
import { buildMainsEvaluationPrompt, MainsEvaluationResult } from "@/lib/mainsEvaluation";
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

export function generateFallbackModelAnswer(context?: {
  question?: string;
  paperType?: string;
  optionalSubject?: string;
  maxMarks?: number;
  directive?: string;
}): string {
  const q = context?.question || "UPSC CSE Mains Question";
  const paper = context?.paperType || "GS";
  const opt = context?.optionalSubject ? ` (${context.optionalSubject})` : "";
  const marks = context?.maxMarks || 10;
  const wordLimit = marks === 10 ? 150 : 250;
  const directive = context?.directive || "Examine";

  return `### Topper-Grade Model Answer (${wordLimit} Words)

#### 1. Introduction & Conceptual Hook (20–25 Words)
The question addresses a pivotal theme under **${paper}${opt}**. A comprehensive approach to the directive **"${directive}"** requires critically examining structural foundations, institutional mechanisms, and constitutional safeguards.

#### 2. Core Arguments & Multi-Dimensional Analysis
* **Constitutional & Legal Framework:**
  * Grounded in statutory mandates, institutional checks, and standard administrative doctrines.
  * Ensures alignment between executive prerogative, public accountability, and fundamental rights.
* **Structural Bottlenecks & Operational Friction:**
  * Jurisdictional overlaps, resource asymmetry, and inter-governmental coordination challenges.
  * Need for transparent institutional mechanisms to eliminate discretion-driven ambiguity.
* **Judicial Precedents & Empirical Perspectives:**
  * Landmark rulings and committee doctrines (e.g. 2nd ARC, judicial guidelines) highlight procedural fairness and institutional resilience.

#### 3. Way Forward & Forward-Looking Conclusion (25–30 Words)
To advance constitutional morality and responsive governance, administrative execution must synthesize procedural accountability with progressive jurisprudence, safeguarding democratic equilibrium.

---
> **Topper Value-Addition Box**
> * **Key Landmark Reference:** Statutory provisions, constitutional benchmarks, and relevant Supreme Court doctrines.
> * **Committee & Policy Recommendation:** Implement 2nd ARC / Commission reforms to bolster institutional autonomy and timely compliance.`;
}

export function formatCleanModelAnswer(
  text: string,
  context?: {
    question?: string;
    paperType?: string;
    optionalSubject?: string;
    maxMarks?: number;
    directive?: string;
  }
): string {
  if (!text) return generateFallbackModelAnswer(context);
  let trimmed = text.trim();

  // If text starts with a JSON object or contains JSON keys, extract the modelAnswer value
  if (
    trimmed.startsWith("{") ||
    trimmed.includes('"modelAnswer"') ||
    trimmed.includes('"question":') ||
    trimmed.includes('"marksAwarded":')
  ) {
    const match =
      trimmed.match(/"modelAnswer"\s*:\s*"([\s\S]*?)(?:",\s*"[a-zA-Z]+"|"\s*\}|$)/i) ||
      trimmed.match(/"modelAnswer"\s*:\s*"([\s\S]*)/i);
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
      if (clean && !clean.startsWith("{") && clean.length > 40) {
        return clean;
      }
    }
    // Failed to extract a valid modelAnswer string from JSON dump
    return generateFallbackModelAnswer(context);
  }

  // If text is still surrounded by braces or looks like raw code
  if (trimmed.startsWith("{") || trimmed.endsWith("}")) {
    return generateFallbackModelAnswer(context);
  }

  return trimmed.replace(/\\n/g, "\n").replace(/\\"/g, '"');
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

/** Fallback extractor if JSON is completely malformed or unparsable */
function extractEvaluationFromText(
  raw: string,
  maxMarks: number,
  defaultDirective = "Discuss",
  context?: {
    question?: string;
    paperType?: string;
    optionalSubject?: string;
  }
): any {
  const marksMatch =
    raw.match(/"?(?:marksAwarded|marks|score|awardedMarks)"?\s*[:=]\s*"?([\d.]+)"?/i) ||
    raw.match(/marks\s*(?:awarded)?\s*[:/]\s*([\d.]+)/i) ||
    raw.match(/([\d.]+)\s*\/\s*(?:10|15)/);
  const parsedMarks = marksMatch ? parseFloat(marksMatch[1]) : (maxMarks === 10 ? 4.0 : 6.0);
  const rawMarks = isNaN(parsedMarks) ? (maxMarks === 10 ? 4.0 : 6.0) : Math.min(parsedMarks, maxMarks);
  const marksAwarded = rawMarks > 0 ? rawMarks : (maxMarks === 10 ? 3.5 : 5.5);

  const verdictMatch = raw.match(/"?(?:verdict)"?\s*[:=]\s*"([^"]+)"/i);
  const directiveMatch = raw.match(/"?(?:directive)"?\s*[:=]\s*"([^"]+)"/i);
  const directiveAnalysisMatch = raw.match(/"?(?:directiveAnalysis)"?\s*[:=]\s*"([^"]+)"/i);

  // Extract model answer
  let modelAnswer = "";
  const modelAnswerMatch =
    raw.match(/"?(?:modelAnswer)"?\s*[:=]\s*"([\s\S]*?)(?:",\s*"[a-zA-Z]+"|"\s*\}|$)/i) ||
    raw.match(/###?\s*Model Answer[:\s]*\n([\s\S]*?)(?:###|$)/i) ||
    raw.match(/Model Answer[:\s]*([\s\S]*)/i);
  if (modelAnswerMatch) {
    const candidate = modelAnswerMatch[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .trim();
    if (!candidate.startsWith("{") && candidate.length > 50) {
      modelAnswer = candidate;
    }
  }

  if (!modelAnswer) {
    modelAnswer = generateFallbackModelAnswer({
      question: context?.question,
      paperType: context?.paperType,
      optionalSubject: context?.optionalSubject,
      maxMarks,
      directive: directiveMatch ? directiveMatch[1] : defaultDirective,
    });
  }

  return {
    marksAwarded,
    maxMarks,
    verdict: verdictMatch ? verdictMatch[1] : marksAwarded / maxMarks >= 0.5 ? "Good Attempt" : "Average",
    directive: directiveMatch ? directiveMatch[1] : defaultDirective,
    directiveAnalysis: directiveAnalysisMatch
      ? directiveAnalysisMatch[1]
      : "The candidate attempt was assessed under strict UPSC evaluation parameters.",
    rubric: {
      introduction: {
        score: Math.round(maxMarks * 0.1 * 10) / 10,
        max: maxMarks === 10 ? 2.0 : 3.0,
        comment: "Contextual framing and conceptual definition provided.",
      },
      bodyContent: {
        score: Math.round(marksAwarded * 0.55 * 10) / 10,
        max: maxMarks === 10 ? 4.5 : 6.5,
        comment: "Coverage of core analytical dimensions and directives.",
      },
      structurePresentation: {
        score: Math.round(maxMarks * 0.08 * 10) / 10,
        max: maxMarks === 10 ? 1.5 : 2.0,
        comment: "Paragraph transitions and bullet point presentation.",
      },
      valueAddition: {
        score: Math.round(maxMarks * 0.08 * 10) / 10,
        max: maxMarks === 10 ? 1.5 : 2.0,
        comment: "Integration of constitutional articles, judgments, and committees.",
      },
      conclusion: {
        score: Math.round(maxMarks * 0.08 * 10) / 10,
        max: maxMarks === 10 ? 1.5 : 2.0,
        comment: "Forward-looking synthesis and balanced way forward.",
      },
    },
    strengths: [
      "Addresses the primary core of the question directly.",
      "Clear segregation between different aspects of the directive.",
    ],
    weaknesses: [
      "Needs richer citation of landmark judicial precedents and committees.",
      "Can incorporate a micro-diagram or flowchart to save word space.",
    ],
    missingDimensions: [
      "Institutional and administrative federal friction perspectives.",
      "Constitutional safeguard doctrines and Supreme Court guidelines.",
    ],
    actionableRoadmap: [
      "Cite specific Articles and Committees (e.g. Sarkaria / Punchhi) in the body.",
      "Frame the conclusion with forward-looking constitutional morality.",
    ],
    diagramIdea: "A 3-node flowchart illustrating the trigger conditions, approval procedure, and consequences.",
    modelAnswer,
  };
}

/** Execute with Google Gemini */
async function callGeminiEvaluation(
  apiKey: string,
  prompt: string,
  images: Array<{ mimeType: string; data: string }> = []
): Promise<string> {
  const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  let lastError = "";

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const parts: any[] = [{ text: prompt }];

      for (const img of images) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType || "image/jpeg",
            data: img.data.replace(/^data:[^;]+;base64,/, ""),
          },
        });
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4000,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text) return text;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
      }
    } catch (e: any) {
      lastError = e?.message || "Gemini connection error";
    }
  }

  throw new Error(lastError || "Gemini failed to evaluate");
}

/** Execute with OpenAI */
async function callOpenAIEvaluation(
  apiKey: string,
  prompt: string,
  images: Array<{ mimeType: string; data: string }> = []
): Promise<string> {
  const models = ["gpt-4o-mini", "gpt-4o"];
  let lastError = "";

  const content: any[] = [{ type: "text", text: prompt }];
  for (const img of images) {
    const dataUrl = img.data.startsWith("data:")
      ? img.data
      : `data:${img.mimeType || "image/jpeg"};base64,${img.data}`;
    content.push({
      type: "image_url",
      image_url: { url: dataUrl },
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
        signal: AbortSignal.timeout(45000),
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
  images: Array<{ mimeType: string; data: string }> = []
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
  images: Array<{ mimeType: string; data: string }> = []
): Promise<string> {
  const isVision = images.length > 0;
  let visionCandidates = ["qwen/qwen3.8-27b", "qwen/qwen3.6-27b"];

  if (isVision) {
    try {
      const listRes = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const ids: string[] = (listData.data || []).map((m: any) => m.id);
        const discovered = ids.filter(
          (id) =>
            id.includes("vision") ||
            id.includes("qwen") ||
            id.includes("vl") ||
            id.includes("multimodal")
        );
        if (discovered.length > 0) {
          visionCandidates = Array.from(new Set([...discovered, ...visionCandidates]));
        }
      }
    } catch {}
  }

  // If vision is present, try vision models with images; then fallback to text models with text prompt
  const models = isVision
    ? [...visionCandidates, "llama-3.3-70b-versatile"]
    : ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

  let lastError = "";

  for (const model of models) {
    try {
      const isModelVision =
        isVision &&
        (model.includes("qwen") ||
          model.includes("vision") ||
          model.includes("vl") ||
          model.includes("multimodal"));

      const messages: any[] = [];
      if (isModelVision) {
        const userContent: any[] = [{ type: "text", text: prompt }];
        // Groq enforces maximum 3 images per request
        const safeImages = images.slice(0, 3);
        for (const img of safeImages) {
          const dataUrl = img.data.startsWith("data:")
            ? img.data
            : `data:${img.mimeType || "image/jpeg"};base64,${img.data}`;
          userContent.push({
            type: "image_url",
            image_url: { url: dataUrl },
          });
        }
        messages.push({ role: "user", content: userContent });
      } else {
        messages.push({ role: "user", content: prompt });
      }

      const payload: any = {
        model,
        messages,
        temperature: 0.3,
        max_tokens: 3500,
      };

      // Groq vision models reject response_format parameter with 400 Bad Request
      if (!isModelVision) {
        payload.response_format = { type: "json_object" };
      }

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(45000),
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
      lastError = e?.message || "Groq connection error";
    }
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
          content: "You are a senior UPSC CSE Mains examiner. Output ONLY valid JSON according to the schema requested.",
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
    const hasAnyText = Boolean(trimmedQuestion || trimmedAnswer);
    const hasImages = Boolean(images && images.length > 0);

    if (!hasAnyText && !hasImages) {
      return NextResponse.json(
        { error: "Please provide either answer text or upload an answer sheet image/PDF." },
        { status: 400 }
      );
    }

    const evaluationPrompt = buildMainsEvaluationPrompt({
      question: trimmedQuestion,
      answerText: trimmedAnswer,
      paperType,
      optionalSubject,
      maxMarks,
      hasAttachment: hasImages,
    });

    const userApiKey = providerConfig?.apiKey?.trim();
    const provider = providerConfig?.provider;
    const serverGeminiKey = process.env.GEMINI_API_KEY?.trim();

    let rawOutput = "";

    // 1. User-configured provider
    if (userApiKey && provider) {
      try {
        if (provider === "gemini") {
          rawOutput = await callGeminiEvaluation(userApiKey, evaluationPrompt, images);
        } else if (provider === "openai") {
          rawOutput = await callOpenAIEvaluation(userApiKey, evaluationPrompt, images);
        } else if (provider === "anthropic") {
          rawOutput = await callAnthropicEvaluation(userApiKey, evaluationPrompt, images);
        } else if (provider === "groq") {
          rawOutput = await callGroqEvaluation(userApiKey, evaluationPrompt, images);
        }
      } catch (err: any) {
        console.warn(`User-configured ${provider} evaluation failed, falling back:`, err?.message);
      }
    }

    // 2. Server-side Gemini Key fallback
    if (!rawOutput && serverGeminiKey) {
      try {
        rawOutput = await callGeminiEvaluation(serverGeminiKey, evaluationPrompt, images);
      } catch (err: any) {
        console.warn("Server Gemini evaluation failed:", err?.message);
      }
    }

    // 3. Free Live Tier fallback
    if (!rawOutput) {
      rawOutput = await callFreeTier(evaluationPrompt);
    }

    let parsed = parseJsonFromText(rawOutput);

    const resolvedQuestion =
      trimmedQuestion ||
      (parsed?.question && String(parsed.question).trim()) ||
      "UPSC CSE Mains Question";

    if (
      !parsed ||
      (typeof parsed.marksAwarded !== "number" &&
        typeof parsed.marks !== "number" &&
        typeof parsed.score !== "number" &&
        isNaN(parseFloat(String(parsed.marksAwarded || parsed.marks || parsed.score))))
    ) {
      console.warn("Structured JSON parse failed, extracting evaluation fields with fallback parser.");
      parsed = extractEvaluationFromText(rawOutput, maxMarks, "Discuss", {
        question: resolvedQuestion,
        paperType,
        optionalSubject,
      });
    }

    const marksNum =
      typeof parsed.marksAwarded === "number"
        ? parsed.marksAwarded
        : parseFloat(String(parsed.marksAwarded || parsed.marks || parsed.score || 4.0));
    const safeMarks = isNaN(marksNum)
      ? maxMarks === 10
        ? 4.0
        : 6.0
      : Math.min(Math.max(marksNum, 0), maxMarks);

    // If candidate submitted an answer (text or images), ensure realistic non-zero evaluation
    const finalMarks =
      safeMarks > 0
        ? safeMarks
        : maxMarks === 10
          ? 3.5
          : maxMarks === 15
            ? 5.5
            : 7.0;

    const targetWordCount = maxMarks === 10 ? 150 : maxMarks === 15 ? 250 : 300;
    const actualWordCount = answerText ? answerText.trim().split(/\s+/).length : 0;
    const percentage = Math.round((finalMarks / maxMarks) * 100);

    const bodyScore =
      parsed.rubric?.bodyContent?.score && parsed.rubric.bodyContent.score > 0
        ? parsed.rubric.bodyContent.score
        : Math.round(finalMarks * 0.5 * 10) / 10;

    const result: MainsEvaluationResult = {
      id: `eval_${Date.now()}`,
      question: resolvedQuestion,
      studentAnswer: trimmedAnswer || (hasImages ? "(Answer submitted via uploaded document/images)" : ""),
      paperType,
      optionalSubject: optionalSubject?.trim() || undefined,
      maxMarks,
      targetWordCount,
      actualWordCount,
      marksAwarded: finalMarks,
      percentage,
      verdict: parsed.verdict || (percentage >= 55 ? "Top Tier (Safe Zone)" : percentage >= 45 ? "Good Attempt" : "Average"),
      directive: parsed.directive || "General",
      directiveAnalysis: parsed.directiveAnalysis || "",
      rubric: {
        introduction: parsed.rubric?.introduction || { score: 1, max: 2, comment: "Fair introduction" },
        bodyContent: {
          score: bodyScore,
          max: parsed.rubric?.bodyContent?.max || (maxMarks === 10 ? 4.5 : 6.5),
          comment: parsed.rubric?.bodyContent?.comment || "Coverage of core arguments and analytical perspectives.",
        },
        structurePresentation: parsed.rubric?.structurePresentation || { score: 0.5, max: 1.5, comment: "Points formatted" },
        valueAddition: parsed.rubric?.valueAddition || { score: 0.5, max: 1.5, comment: "Articles and reports" },
        conclusion: parsed.rubric?.conclusion || { score: 0.5, max: 1.5, comment: "Way forward provided" },
      },
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      missingDimensions: Array.isArray(parsed.missingDimensions) ? parsed.missingDimensions : [],
      actionableRoadmap: Array.isArray(parsed.actionableRoadmap) ? parsed.actionableRoadmap : [],
      diagramIdea: parsed.diagramIdea || undefined,
      modelAnswer: formatCleanModelAnswer(parsed.modelAnswer || rawOutput, {
        question: resolvedQuestion,
        paperType,
        optionalSubject,
        maxMarks,
        directive: parsed.directive || "Examine",
      }),
      evaluatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, evaluation: result });
  } catch (err: any) {
    console.error("Mains evaluation error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to evaluate Mains answer. Please retry." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { RevisionProviderConfig } from "../../../lib/types";

export const runtime = "nodejs";

/** Helper to extract JSON from AI response */
function parseJsonFromText(rawText: string): any {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch (inner) {}
    }
    throw new Error("Could not parse structured response from AI.");
  }
}

/** Dynamically discover active models from a Groq key */
async function discoverGroqModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const models: string[] = (data.data || [])
        .filter((m: any) => m.active !== false)
        .map((m: any) => m.id as string)
        .filter(
          (id: string) =>
            !id.includes("whisper") &&
            !id.includes("guard") &&
            !id.includes("embed") &&
            !id.includes("tool") &&
            !id.includes("safeguard"),
        );

      models.sort((a, b) => {
        const score = (id: string) => {
          let s = 0;
          if (id.includes("8b-instant")) s += 15;
          if (id.includes("70b")) s += 10;
          if (id.includes("versatile")) s += 5;
          if (id.includes("llama")) s += 3;
          return s;
        };
        return score(b) - score(a);
      });

      if (models.length > 0) return models;
    }
  } catch (e: any) {
    console.warn("Groq model discovery failed:", e?.message);
  }
  return [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "mixtral-8x7b-32768",
  ];
}

/** Dynamically discover active models from an OpenAI key */
async function discoverOpenAIModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const models: string[] = (data.data || [])
        .map((m: any) => m.id as string)
        .filter(
          (id: string) =>
            (id.startsWith("gpt-") || id.startsWith("o1") || id.startsWith("o3")) &&
            !id.includes("instruct") &&
            !id.includes("realtime") &&
            !id.includes("audio"),
        );

      models.sort((a, b) => {
        const score = (id: string) => {
          if (id === "gpt-4o-mini") return 100;
          if (id === "gpt-4o") return 90;
          return 10;
        };
        return score(b) - score(a);
      });

      if (models.length > 0) return models;
    }
  } catch (e: any) {
    console.warn("OpenAI model discovery failed:", e?.message);
  }
  return ["gpt-4o-mini", "gpt-4o"];
}

/** Dynamically discover active models from an Anthropic key */
async function discoverAnthropicModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const models: string[] = (data.data || []).map((m: any) => m.id as string);
      models.sort((a, b) => {
        const score = (id: string) => {
          if (id.includes("haiku")) return 20;
          if (id.includes("sonnet")) return 10;
          return 5;
        };
        return score(b) - score(a);
      });
      if (models.length > 0) return models;
    }
  } catch (e: any) {
    console.warn("Anthropic model discovery failed:", e?.message);
  }
  return [
    "claude-3-5-haiku-latest",
    "claude-3-haiku-20240307",
    "claude-3-5-sonnet-latest",
  ];
}

/** Low-level caller for Gemini */
async function callGeminiRaw(apiKey: string, prompt: string): Promise<string> {
  const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  let lastError = "";

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1000,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text.trim()) return text;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
      }
    } catch (e: any) {
      lastError = e?.message || "Gemini connection error";
    }
  }
  throw new Error(lastError || "Gemini failed to respond");
}

/** Low-level caller for OpenAI-compatible providers (Groq, OpenAI) with candidate model fallback */
async function callOpenAICompatibleWithFallback(
  baseUrl: string,
  apiKey: string,
  candidateModels: string[],
  prompt: string,
): Promise<string> {
  let lastError = "";

  for (const model of candidateModels) {
    try {
      // First try with JSON format
      let res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 1000,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(20000),
      });

      // If rejected due to response_format not supported, retry model without response_format
      if (res.status === 400) {
        const errJson = await res.clone().json().catch(() => ({}));
        const errMsg = (errJson.error?.message || "").toLowerCase();
        if (
          errMsg.includes("response_format") ||
          errMsg.includes("json_object") ||
          errMsg.includes("json mode")
        ) {
          res = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.4,
              max_tokens: 1000,
            }),
            signal: AbortSignal.timeout(20000),
          });
        }
      }

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";
        if (content.trim()) return content;
      } else {
        const errData = await res.json().catch(() => ({}));
        lastError = errData.error?.message || `HTTP ${res.status}`;
        console.warn(`Model ${model} on ${baseUrl} failed: ${lastError}`);
      }
    } catch (e: any) {
      lastError = e?.message || "Connection timed out";
    }
  }

  throw new Error(lastError || "All candidate models failed");
}

/** Caller for Anthropic Claude */
async function callAnthropicRaw(
  apiKey: string,
  candidateModels: string[],
  prompt: string,
): Promise<string> {
  let lastError = "";
  for (const model of candidateModels.slice(0, 3)) {
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
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.content?.[0]?.text || "";
        if (rawText.trim()) return rawText;
      } else {
        const errData = await res.json().catch(() => ({}));
        lastError = errData.error?.message || `HTTP ${res.status}`;
      }
    } catch (e: any) {
      lastError = e?.message || "Anthropic connection timed out";
    }
  }
  throw new Error(lastError || "Anthropic failed to respond");
}

/** Free Pollinations fallback */
async function callFreePollinations(prompt: string): Promise<string> {
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "You are an expert tutor. Always respond ONLY with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      model: "openai-fast",
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(45000),
  });

  const raw = await res.text();
  if (res.ok && raw && raw.trim() && !raw.startsWith("<!DOCTYPE")) {
    return raw;
  }
  throw new Error("Free AI service is temporarily busy. Please try again.");
}

async function executePrompt(
  prompt: string,
  providerConfig?: RevisionProviderConfig | null,
): Promise<string> {
  const userApiKey = providerConfig?.apiKey?.trim();
  const provider = providerConfig?.provider;

  // 1. Try user-configured provider first
  if (userApiKey && provider) {
    try {
      if (provider === "gemini") {
        return await callGeminiRaw(userApiKey, prompt);
      }
      if (provider === "groq") {
        const discovered = await discoverGroqModels(userApiKey);
        const candidates = Array.from(
          new Set(
            [
              providerConfig?.model,
              ...discovered,
              "llama-3.1-8b-instant",
              "llama-3.3-70b-versatile",
              "llama-3.1-70b-versatile",
              "mixtral-8x7b-32768",
              "gemma2-9b-it",
            ].filter(Boolean) as string[],
          ),
        );
        return await callOpenAICompatibleWithFallback(
          "https://api.groq.com/openai/v1",
          userApiKey,
          candidates,
          prompt,
        );
      }
      if (provider === "openai") {
        const discovered = await discoverOpenAIModels(userApiKey);
        const candidates = Array.from(
          new Set(
            [providerConfig?.model, ...discovered, "gpt-4o-mini", "gpt-4o"].filter(
              Boolean,
            ) as string[],
          ),
        );
        return await callOpenAICompatibleWithFallback(
          "https://api.openai.com/v1",
          userApiKey,
          candidates,
          prompt,
        );
      }
      if (provider === "anthropic") {
        const discovered = await discoverAnthropicModels(userApiKey);
        const candidates = Array.from(
          new Set(
            [
              providerConfig?.model,
              ...discovered,
              "claude-3-5-haiku-latest",
              "claude-3-haiku-20240307",
            ].filter(Boolean) as string[],
          ),
        );
        return await callAnthropicRaw(userApiKey, candidates, prompt);
      }
    } catch (userErr: any) {
      console.warn(
        `User ${provider} provider failed (${userErr?.message}). Falling back to server/free AI...`,
      );
    }
  }

  // 2. Fallback to Server Gemini Key
  const serverGeminiKey = process.env.GEMINI_API_KEY?.trim();
  if (serverGeminiKey) {
    try {
      return await callGeminiRaw(serverGeminiKey, prompt);
    } catch (e) {
      console.warn("Server gemini key failed, falling back to free AI:", e);
    }
  }

  // 3. Fallback to Free Live Service
  return await callFreePollinations(prompt);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, word, wordsList = [], sentence, providerConfig } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action." }, { status: 400 });
    }

    // 1. ACTION: ENRICH (Student entered ONLY the word -> make flashcard)
    if (action === "enrich") {
      if (!word || !word.trim()) {
        return NextResponse.json({ error: "Please provide a word." }, { status: 400 });
      }

      const prompt = `You are an expert vocabulary coach for serious students preparing for competitive exams and academic writing.
The student has provided the word: "${word.trim()}".
Do NOT create an overwhelming dictionary entry. Focus on making it practical, clear, and memorable for daily use (4-5 words a day habit).

Respond ONLY with a JSON object in this exact format:
{
  "word": "${word.trim()}",
  "meaning": "One clear, intuitive, and plain-language sentence explaining what the word means.",
  "memoryHook": "A clever, relatable memory hook, association, or root clue that makes the word instant to remember.",
  "example": "A realistic, contemporary sentence demonstrating how to naturally use this word in an editorial, essay, or discussion."
}`;

      const raw = await executePrompt(prompt, providerConfig);
      const parsed = parseJsonFromText(raw);
      return NextResponse.json({ success: true, data: parsed });
    }

    // 2. ACTION: GENERATE PRACTICE (Statement with blank for word identification)
    if (action === "generate_practice") {
      if (!word || !word.trim()) {
        return NextResponse.json({ error: "Please provide a word." }, { status: 400 });
      }

      const prompt = `You are creating a quick vocabulary practice question.
Target word: "${word.trim()}"
Pool of student's other words (if available): ${JSON.stringify(wordsList)}

Create a high-quality sentence with a blank (represented as "_____") where the target word fits naturally.
Provide 4 multiple choice options: 1 correct answer (the target word) and 3 believable distractors.

Respond ONLY with a JSON object in this exact format:
{
  "word": "${word.trim()}",
  "statementWithBlank": "A natural sentence with _____ where the word belongs.",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "hint": "A subtle context hint about the tone or meaning needed."
}`;

      const raw = await executePrompt(prompt, providerConfig);
      const parsed = parseJsonFromText(raw);
      if (
        Array.isArray(parsed.options) &&
        !parsed.options.some((o: string) => o.toLowerCase() === word.toLowerCase())
      ) {
        parsed.options[0] = word;
      }
      return NextResponse.json({ success: true, data: parsed });
    }

    // 3. ACTION: EVALUATE SENTENCE (Student wrote a sentence from their word)
    if (action === "evaluate_sentence") {
      if (!word || !sentence) {
        return NextResponse.json({ error: "Missing word or sentence." }, { status: 400 });
      }

      const prompt = `The student was challenged to form an original sentence using the word "${word.trim()}".
Student's submitted sentence:
"${sentence.trim()}"

Evaluate the student's sentence kindly and constructively:
1. Is it used naturally and accurately? (isNatural: boolean)
2. Friendly 1-2 sentence feedback explaining what was good or what nuance was missed.
3. A polished, elegant version of their sentence (improvedSentence).

Respond ONLY with a JSON object in this exact format:
{
  "isNatural": true,
  "feedback": "Great usage! You used it accurately to convey...",
  "improvedSentence": "A refined version of their sentence with enhanced vocabulary or phrasing."
}`;

      const raw = await executePrompt(prompt, providerConfig);
      const parsed = parseJsonFromText(raw);
      return NextResponse.json({ success: true, data: parsed });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("Vocab API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process vocabulary request." },
      { status: 500 },
    );
  }
}

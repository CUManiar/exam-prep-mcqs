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

/** Low-level caller for OpenAI compatible (OpenAI, Groq) */
async function callOpenAICompatibleRaw(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
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
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!content.trim()) throw new Error("Empty response from AI provider");
  return content;
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

  if (userApiKey && provider) {
    if (provider === "gemini") {
      return await callGeminiRaw(userApiKey, prompt);
    }
    if (provider === "groq") {
      return await callOpenAICompatibleRaw(
        "https://api.groq.com/openai/v1",
        userApiKey,
        "llama-3.3-70b-versatile",
        prompt,
      );
    }
    if (provider === "openai") {
      return await callOpenAICompatibleRaw(
        "https://api.openai.com/v1",
        userApiKey,
        "gpt-4o-mini",
        prompt,
      );
    }
  }

  const serverGeminiKey = process.env.GEMINI_API_KEY?.trim();
  if (serverGeminiKey) {
    try {
      return await callGeminiRaw(serverGeminiKey, prompt);
    } catch (e) {
      console.warn("Server gemini key failed, trying fallback:", e);
    }
  }

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
      // Ensure target word is included in options
      if (Array.isArray(parsed.options) && !parsed.options.some((o: string) => o.toLowerCase() === word.toLowerCase())) {
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

import { NextRequest, NextResponse } from "next/server";
import { RevisionProviderConfig } from "../../../lib/types";
import { getAuthenticatedUser } from "@/lib/apiSecurity";
import {
  getUserProfile,
  saveUserVocabCardsToSupabase,
} from "../../../lib/supabase";

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
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
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
            (id.startsWith("gpt-") ||
              id.startsWith("o1") ||
              id.startsWith("o3")) &&
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
      const models: string[] = (data.data || []).map(
        (m: any) => m.id as string,
      );
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

/** Dynamically discover active models from a Gemini key */
async function discoverGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (listRes.ok) {
      const data = await listRes.json();
      const models = (data.models || [])
        .filter((m: any) =>
          m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m: any) => m.name.replace(/^models\//, "") as string);

      models.sort((a, b) => {
        const score = (id: string) => {
          let s = 0;
          if (id.includes("2.0-flash")) s += 20;
          if (id.includes("1.5-flash")) s += 10;
          if (id.includes("flash")) s += 5;
          return s;
        };
        return score(b) - score(a);
      });

      if (models.length > 0) return models;
    }
  } catch (e: any) {
    console.warn("Gemini model discovery failed:", e?.message);
  }
  return ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
}

/** Low-level caller for Gemini */
async function callGeminiRaw(
  apiKey: string,
  prompt: string,
  temperature: number = 0.4,
): Promise<string> {
  const discovered = await discoverGeminiModels(apiKey);
  const candidateModels = Array.from(
    new Set([
      ...discovered,
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-pro",
    ]),
  );

  let lastError = "";

  for (const rawModel of candidateModels.slice(0, 4)) {
    const cleanModel = rawModel.replace(/^models\//, "");
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`,
      `https://generativelanguage.googleapis.com/v1/models/${cleanModel}:generateContent?key=${apiKey}`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: 1000,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (text.trim()) return text;
        } else {
          const errJson = await res.json().catch(() => ({}));
          lastError = errJson.error?.message || `HTTP ${res.status}`;

          // If responseMimeType is rejected with 400 Bad Request, retry without it
          if (
            res.status === 400 &&
            (lastError.toLowerCase().includes("responsemimetype") ||
              lastError.toLowerCase().includes("json"))
          ) {
            const retryRes = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature,
                  maxOutputTokens: 1000,
                },
              }),
              signal: AbortSignal.timeout(30000),
            });
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              const retryText =
                retryData.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (retryText.trim()) return retryText;
            }
          }
        }
      } catch (e: any) {
        lastError = e?.message || "Gemini connection error";
      }
    }
  }

  throw new Error(
    `Google Gemini Error: ${lastError || "Failed to generate response"}`,
  );
}

/** Low-level caller for OpenAI-compatible providers (Groq, OpenAI) with candidate model fallback */
async function callOpenAICompatibleWithFallback(
  baseUrl: string,
  apiKey: string,
  candidateModels: string[],
  prompt: string,
  temperature: number = 0.4,
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
          temperature,
          max_tokens: 1000,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(20000),
      });

      // If rejected due to response_format not supported, retry model without response_format
      if (res.status === 400) {
        const errJson = await res
          .clone()
          .json()
          .catch(() => ({}));
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
              temperature,
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
  temperature: number = 0.4,
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
          temperature,
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
async function callFreePollinations(
  prompt: string,
  temperature: number = 0.4,
): Promise<string> {
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You are an expert tutor. Always respond ONLY with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      model: "openai-fast",
      temperature,
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
  temperature: number = 0.4,
): Promise<string> {
  const userApiKey = providerConfig?.apiKey?.trim();
  const provider = providerConfig?.provider;

  // 1. If user has a configured provider with an API key, use it directly.
  // DO NOT fall back to free/busy AI if the user's connected provider is set!
  if (userApiKey && provider) {
    if (provider === "gemini") {
      return await callGeminiRaw(userApiKey, prompt, temperature);
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
        temperature,
      );
    }
    if (provider === "openai") {
      const discovered = await discoverOpenAIModels(userApiKey);
      const candidates = Array.from(
        new Set(
          [
            providerConfig?.model,
            ...discovered,
            "gpt-4o-mini",
            "gpt-4o",
          ].filter(Boolean) as string[],
        ),
      );
      return await callOpenAICompatibleWithFallback(
        "https://api.openai.com/v1",
        userApiKey,
        candidates,
        prompt,
        temperature,
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
      return await callAnthropicRaw(
        userApiKey,
        candidates,
        prompt,
        temperature,
      );
    }
  }

  // 2. Server-side Google/Gemini Key
  const serverGeminiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_AI_KEY?.trim();
  if (serverGeminiKey) {
    return await callGeminiRaw(serverGeminiKey, prompt, temperature);
  }

  // 3. If user selected a custom provider but no API key was provided
  if (provider && !userApiKey) {
    throw new Error(
      `Your ${provider === "gemini" ? "Google Gemini" : provider.toUpperCase()} API key is missing or not active. Please open Profile & Settings to configure your key.`,
    );
  }

  // 4. Free AI Service (only for guest users with no custom provider or key)
  return await callFreePollinations(prompt, temperature);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const profile = await getUserProfile(user.id);
    return NextResponse.json({
      ok: true,
      cards: Array.isArray(profile?.vocab_cards) ? profile.vocab_cards : [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      word,
      wordsList = [],
      sentence,
      providerConfig,
      meaning = "",
      avoidSentence = "",
      avoidSentences = [],
      theme = "",
    } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action." }, { status: 400 });
    }

    // 0. ACTION: SYNC (Save/Update user vocab cards in Supabase)
    if (action === "sync") {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const { cards } = body;
      if (Array.isArray(cards)) {
        await saveUserVocabCardsToSupabase(user.id, cards);
        return NextResponse.json({ success: true, cards });
      }
      return NextResponse.json(
        { error: "Invalid cards array." },
        { status: 400 },
      );
    }

    // 1. ACTION: ENRICH (Student entered ONLY the word -> make flashcard)
    if (action === "enrich") {
      if (!word || !word.trim()) {
        return NextResponse.json(
          { error: "Please provide a word." },
          { status: 400 },
        );
      }

      const prompt = `You are an expert vocabulary coach and cognitive memory specialist for serious students preparing for competitive exams (UPSC CSE, GRE, academic & editorial writing).
The student has provided the word: "${word.trim()}".
Make it practical, visually structured, and unforgettable using Dual Coding (vivid mental imagery) and Etymology/Root clues. NEVER write generic filler like "Link X with core root to recall" or "The policy paper underscored the significance of X".

Respond ONLY with a JSON object in this exact format:
{
  "word": "${word.trim()}",
  "partOfSpeech": "noun | verb | adjective | adverb",
  "phonetic": "Clear syllable pronunciation guide, e.g. 'hi-JEM-uh-nee' or 'uh-FEM-er-ul'",
  "meaning": "One crisp, intuitive, plain-language sentence explaining what the word means.",
  "memoryHook": "A vivid, concrete visual scene, wordplay, or sound-alike story that locks the meaning in memory.",
  "rootBreakdown": "Concise etymology or word parts, e.g. 'Greek ephēmeros (epi = on + hēmera = day → lasting only a day)'",
  "example": "A natural, authentic sentence demonstrating how the word is actually used in a high-scoring editorial or GS essay.",
  "synonyms": ["synonym1", "synonym2", "synonym3"],
  "antonyms": ["antonym1", "antonym2"],
  "collocations": ["natural phrase 1", "natural phrase 2"],
  "nuanceTip": "1 short sentence on register/tone or common usage pitfall (e.g. 'Formal; usually carries a critical tone')."
}`;

      const raw = await executePrompt(prompt, providerConfig);
      const parsed = parseJsonFromText(raw);
      return NextResponse.json({ success: true, data: parsed });
    }

    // 2. ACTION: GENERATE PRACTICE (Statement with blank for word identification)
    if (action === "generate_practice") {
      if (!word || !word.trim()) {
        return NextResponse.json(
          { error: "Please provide a word." },
          { status: 400 },
        );
      }

      const DOMAINS = [
        "Public Policy, Bureaucracy & Governance",
        "Judicial Precedents & Constitutional Rulings",
        "Geopolitical Strategy, Bilateral Diplomacy & Treaties",
        "Macroeconomic Reforms, Fiscal Policy & Markets",
        "Societal Transformation, Civil Rights & Ethical Debates",
        "Environmental Governance, Biodiversity & Climate Crises",
        "Scientific Innovation, Research Rigor & Bioethics",
        "Historical Statecraft, Reform Movements & Independence",
        "Philosophical Ethics, Epistemology & Public Morality",
        "Editorial Commentary, Investigative Journalism & Analysis",
      ];

      const STYLES = [
        "analytical editorial critique",
        "academic and scholarly prose",
        "civil services policy briefing style",
        "parliamentary debate discourse",
        "socio-historical inquiry",
      ];

      const selectedDomain =
        theme && theme.trim()
          ? theme.trim()
          : DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
      const selectedStyle = STYLES[Math.floor(Math.random() * STYLES.length)];

      const allAvoidSentences = Array.from(
        new Set([avoidSentence, ...avoidSentences].filter(Boolean)),
      );

      const avoidBlock =
        allAvoidSentences.length > 0
          ? `\nCRITICAL VARIATION MANDATE:\nDo NOT use, repeat, or paraphrase any of these previously generated sentences or their specific scenarios:\n${allAvoidSentences
              .map((s) => `- "${s}"`)
              .join(
                "\n",
              )}\nYou MUST generate an entirely fresh, original, and distinct scenario.`
          : "";

      const prompt = `You are a distinguished vocabulary test examiner for competitive examinations (UPSC CSE, GRE, Advanced English).
Target word: "${word.trim()}"
${meaning ? `Meaning: "${meaning.trim()}"` : ""}
Context Domain: ${selectedDomain}
Stylistic Tone: ${selectedStyle}
Pool of student's other vocabulary words: ${JSON.stringify(wordsList.slice(0, 20))}
${avoidBlock}

TASK REQUIREMENTS:
1. Compose a sophisticated, context-rich sentence set in "${selectedDomain}" (${selectedStyle}).
2. The sentence MUST have a single blank represented as "_____" where "${word.trim()}" fits naturally, accurately, and uniquely.
3. The sentence must provide subtle, intelligent contextual clues (such as contrasting ideas, causality, or descriptive precision) allowing a sharp student to deduce the correct word.
4. Provide 4 multiple choice options: exactly 1 correct answer ("${word.trim()}") and 3 believable, high-level distractors of the same part of speech.
5. Provide a subtle 1-sentence hint pointing to the tonal or thematic nuance required without stating the word itself.

Respond ONLY with a JSON object in this exact format:
{
  "word": "${word.trim()}",
  "statementWithBlank": "A sophisticated sentence with _____ where the target word belongs.",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "hint": "A subtle context hint about the tone or nuance needed."
}`;

      const raw = await executePrompt(prompt, providerConfig, 0.85);
      const parsed = parseJsonFromText(raw);

      if (Array.isArray(parsed.options)) {
        // Ensure the target word is included
        const hasWord = parsed.options.some(
          (o: string) => o.toLowerCase() === word.toLowerCase(),
        );
        let finalOptions = [...parsed.options];
        if (!hasWord) {
          finalOptions[0] = word;
        }

        // Deduplicate case-insensitively
        const seenWords = new Set<string>();
        finalOptions = finalOptions.filter((opt: string) => {
          const lower = opt.toLowerCase();
          if (seenWords.has(lower)) return false;
          seenWords.add(lower);
          return true;
        });

        // Fill up to 4 options from wordsList if needed
        const pool = wordsList.filter(
          (w: string) =>
            w.toLowerCase() !== word.toLowerCase() &&
            !seenWords.has(w.toLowerCase()),
        );
        for (const distractor of pool) {
          if (finalOptions.length >= 4) break;
          finalOptions.push(distractor);
          seenWords.add(distractor.toLowerCase());
        }

        // Shuffle options with Fisher-Yates so target word is not predictably positioned
        for (let i = finalOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [finalOptions[i], finalOptions[j]] = [
            finalOptions[j],
            finalOptions[i],
          ];
        }
        parsed.options = finalOptions.slice(0, 4);
      }

      return NextResponse.json({ success: true, data: parsed });
    }

    // 3. ACTION: EVALUATE SENTENCE (Student wrote a sentence from their word)
    if (action === "evaluate_sentence") {
      if (!word || !sentence) {
        return NextResponse.json(
          { error: "Missing word or sentence." },
          { status: 400 },
        );
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

import { NextRequest, NextResponse } from "next/server";
import {
  getUpscRevisionSystemPrompt,
  cleanMarkdownContent,
} from "../../../../lib/revisionAi";
import {
  RevisionContext,
  RevisionMessage,
  RevisionProviderConfig,
} from "../../../../lib/types";
import { generatePaperPerformanceReport } from "../../../../lib/revisionDossiers";

export const runtime = "nodejs";

/** Dynamically discover active models from a Groq key */
async function discoverGroqModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
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
            !id.includes("tool"),
        );

      models.sort((a, b) => {
        const score = (id: string) => {
          let s = 0;
          if (id.includes("70b")) s += 10;
          if (id.includes("versatile")) s += 5;
          if (id.includes("llama")) s += 3;
          if (id.includes("8b")) s += 1;
          return s;
        };
        return score(b) - score(a);
      });

      if (models.length > 0) return models;
    }
  } catch (e: any) {
    console.warn("Groq model discovery failed:", e?.message);
  }
  return ["llama-3.3-70b-versatile"];
}

/** Dynamically discover active models from an OpenAI key */
async function discoverOpenAIModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
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
          if (id.includes("4o-mini")) return 80;
          if (id.includes("4o")) return 70;
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
      signal: AbortSignal.timeout(10000),
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
  return ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
}

/** Generic chat execution on OpenAI-compatible providers using discovered models */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  models: string[],
  systemPrompt: string,
  messages: RevisionMessage[],
): Promise<{ text?: string; error?: string }> {
  const formattedMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as
        "assistant" | "user",
      content: m.content,
    })),
  ];

  let lastError = "";

  for (const model of models.slice(0, 3)) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature: 0.6,
          max_tokens: 3500,
          frequency_penalty: 0.3,
        }),
        signal: AbortSignal.timeout(35000),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.choices?.[0]?.message?.content || "";
        if (rawText.trim()) {
          return { text: cleanMarkdownContent(rawText) };
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        lastError =
          errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        if (res.status === 401 || res.status === 403) {
          return { error: `Authentication failed: ${lastError}` };
        }
      }
    } catch (e: any) {
      lastError = e?.message || "Connection timed out.";
    }
  }

  return { error: lastError || "Failed to reach AI service." };
}

/** Anthropic chat execution using discovered models */
async function callAnthropic(
  apiKey: string,
  models: string[],
  systemPrompt: string,
  messages: RevisionMessage[],
): Promise<{ text?: string; error?: string }> {
  const formattedMessages = messages.map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as
      "assistant" | "user",
    content: m.content,
  }));

  let lastError = "";

  for (const model of models.slice(0, 3)) {
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
          system: systemPrompt,
          messages: formattedMessages,
          max_tokens: 3500,
          temperature: 0.6,
        }),
        signal: AbortSignal.timeout(35000),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.content?.[0]?.text || "";
        if (rawText.trim()) {
          return { text: cleanMarkdownContent(rawText) };
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        lastError =
          errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        if (res.status === 401 || res.status === 403) {
          return { error: `Anthropic authentication failed: ${lastError}` };
        }
      }
    } catch (e: any) {
      lastError = e?.message || "Connection timed out.";
    }
  }

  return { error: lastError || "Failed to reach Anthropic Claude API." };
}

/** Gemini chat execution using discovered models */
async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: RevisionMessage[],
): Promise<{ text?: string; error?: string }> {
  const candidateModels = await discoverGeminiModels(apiKey);

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  let lastError = "";

  for (const model of candidateModels.slice(0, 3)) {
    try {
      const cleanModel = model.replace(/^models\//, "");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

      let res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 3500,
          },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.status === 400) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error?.message || "";
        if (
          errMsg.toLowerCase().includes("systeminstruction") ||
          errMsg.toLowerCase().includes("system_instruction")
        ) {
          const contentsWithSystem = [
            {
              role: "user",
              parts: [
                {
                  text: `[SYSTEM INSTRUCTIONS]:\n${systemPrompt}\n\n[USER QUERY]:\n${
                    messages[0]?.content || ""
                  }`,
                },
              ],
            },
            ...contents.slice(1),
          ];
          res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: contentsWithSystem,
              generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 3500,
              },
            }),
            signal: AbortSignal.timeout(30000),
          });
        } else {
          lastError = errMsg;
          if (errMsg.toLowerCase().includes("api key not valid")) {
            return { error: errMsg };
          }
        }
      }

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text.trim()) {
          return { text: cleanMarkdownContent(text) };
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        lastError =
          errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      }
    } catch (e: any) {
      lastError = e?.message || "Gemini connection timed out.";
    }
  }

  return {
    error: lastError || "Failed to generate content from Google Gemini.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages = [],
      context = { mode: "open" } as RevisionContext,
      providerConfig,
    }: {
      messages: RevisionMessage[];
      context: RevisionContext;
      providerConfig?: RevisionProviderConfig | null;
    } = body;

    if (!messages.length) {
      return NextResponse.json(
        { error: "No messages provided." },
        { status: 400 },
      );
    }

    const latestUserMsg =
      messages.filter((m) => m.role === "user").pop()?.content || "";

    // ── SPECIALIZED ROUTING: Factual Attempt / Score Calculation in Paper Mode ──
    const isScoreInquiry =
      context.mode === "paper" &&
      /\b(score|marks|result|how did i do|how much score|my performance|wrong questions|mistakes|accuracy|how many correct)\b/i.test(
        latestUserMsg,
      );

    if (isScoreInquiry) {
      const performanceText = generatePaperPerformanceReport(context);
      return NextResponse.json({
        text: cleanMarkdownContent(performanceText),
      });
    }

    const systemPrompt = getUpscRevisionSystemPrompt(context);
    const userApiKey = providerConfig?.apiKey?.trim();
    const provider = providerConfig?.provider;

    // ── BRANCH 1: User Provided Dedicated API Key ──
    if (userApiKey && provider) {
      let result: { text?: string; error?: string } = {};

      switch (provider) {
        case "gemini":
          result = await callGemini(userApiKey, systemPrompt, messages);
          break;

        case "groq": {
          const groqModels = await discoverGroqModels(userApiKey);
          result = await callOpenAICompatible(
            "https://api.groq.com/openai/v1",
            userApiKey,
            groqModels,
            systemPrompt,
            messages,
          );
          break;
        }

        case "openai": {
          const openaiModels = await discoverOpenAIModels(userApiKey);
          result = await callOpenAICompatible(
            "https://api.openai.com/v1",
            userApiKey,
            openaiModels,
            systemPrompt,
            messages,
          );
          break;
        }

        case "anthropic": {
          const anthropicModels = await discoverAnthropicModels(userApiKey);
          result = await callAnthropic(
            userApiKey,
            anthropicModels,
            systemPrompt,
            messages,
          );
          break;
        }
      }

      if (result.text) {
        return NextResponse.json({
          text: result.text,
        });
      }

      return NextResponse.json(
        {
          error: `${provider.toUpperCase()} API Error: ${result.error || "Request failed. Please verify your API key or quota."}`,
          needsApiKey: true,
        },
        { status: 400 },
      );
    }

    // ── BRANCH 2: Server-side Gemini Key ──
    const serverGeminiKey = process.env.GEMINI_API_KEY?.trim();
    if (!userApiKey && serverGeminiKey) {
      const serverResult = await callGemini(
        serverGeminiKey,
        systemPrompt,
        messages,
      );
      if (serverResult.text) {
        return NextResponse.json({
          text: serverResult.text,
        });
      }
    }

    // ── BRANCH 3: Built-in Free Live AI Service (Pollinations) ──
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    try {
      const polRes = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: formattedMessages,
          model: "openai-fast",
          temperature: 0.6,
        }),
        signal: AbortSignal.timeout(75000),
      });

      const raw = await polRes.text();

      if (
        polRes.status === 402 ||
        raw.includes("Free limit reached") ||
        raw.includes("1 reply every 45 seconds")
      ) {
        return NextResponse.json({
          text: cleanMarkdownContent(
            `> ⏳ **Free AI Cooldown Active**\n>\n> The shared free AI tier allows **1 reply every 45 seconds per IP** to prevent server overload.\n>\n> **How to continue**:\n> - Please wait ~30 seconds and click **Retry** below.\n> - Or connect a free API key (Google Gemini, OpenAI, Groq, or Claude) in **AI Settings** for instantaneous, zero-delay responses.`,
          ),
        });
      }

      if (
        polRes.ok &&
        raw &&
        raw.trim() &&
        !raw.startsWith("<!DOCTYPE") &&
        raw.length > 20
      ) {
        return NextResponse.json({
          text: cleanMarkdownContent(raw),
        });
      }
    } catch (pollinationErr: any) {
      console.warn("Free AI service request failed:", pollinationErr?.message);
    }

    return NextResponse.json(
      {
        error:
          "The free AI revision service timed out or is temporarily overloaded. Please wait a few seconds and click Retry, or add an API key (Google Gemini, OpenAI, Claude, or Groq) in AI Settings for instantaneous replies.",
      },
      { status: 503 },
    );
  } catch (err: any) {
    console.error("Revision chat error:", err);
    return NextResponse.json(
      {
        error:
          err.message ||
          "Unable to complete revision query. Please check your network connection or try again.",
      },
      { status: 500 },
    );
  }
}

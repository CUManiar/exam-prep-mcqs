import { NextRequest, NextResponse } from "next/server";
import {
  getUpscRevisionSystemPrompt,
  cleanMarkdownContent,
} from "../../../../lib/revisionAi";
import { RevisionContext, RevisionMessage, RevisionProviderConfig } from "../../../../lib/types";
import { generatePaperPerformanceReport } from "../../../../lib/revisionDossiers";

export const runtime = "nodejs";

/** OpenAI-compatible chat completions (OpenAI, Groq) */
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
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    })),
  ];

  let lastError = "";

  for (const model of models) {
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
          temperature: 0.35,
          max_tokens: 3500,
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
        lastError = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
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

/** Anthropic Messages API call */
async function callAnthropic(
  apiKey: string,
  models: string[],
  systemPrompt: string,
  messages: RevisionMessage[],
): Promise<{ text?: string; error?: string }> {
  const formattedMessages = messages.map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
    content: m.content,
  }));

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
          system: systemPrompt,
          messages: formattedMessages,
          max_tokens: 3500,
          temperature: 0.35,
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
        lastError = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
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

/** Gemini REST API call with dynamic model discovery */
async function callGemini(
  apiKey: string,
  systemPrompt: string,
  messages: RevisionMessage[],
): Promise<{ text?: string; error?: string }> {
  // 1. Fetch available models for this specific API key to avoid hardcoding obsolete models
  let availableModels: string[] = [];
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (listRes.ok) {
      const data = await listRes.json();
      availableModels = (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => m.name.replace(/^models\//, ""));
    } else {
      const errData = await listRes.json().catch(() => ({}));
      const errMsg = errData.error?.message;
      if (listRes.status === 400 && errMsg?.toLowerCase().includes("api key not valid")) {
        return { error: "Google Gemini API key is not valid. Please verify your key in Google AI Studio." };
      }
    }
  } catch (e) {
    // If model listing fails, fall through to default candidates
  }

  // Prioritize active flash models from Google's list
  const candidateModels: string[] = [];
  if (availableModels.length > 0) {
    const flash20 = availableModels.find((m) => m === "gemini-2.0-flash" || m.includes("2.0-flash"));
    if (flash20) candidateModels.push(flash20);
    const flash15 = availableModels.find((m) => m.includes("1.5-flash") && !m.includes("8b"));
    if (flash15 && !candidateModels.includes(flash15)) candidateModels.push(flash15);
    for (const m of availableModels) {
      if (!candidateModels.includes(m)) candidateModels.push(m);
    }
  } else {
    candidateModels.push("gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro");
  }

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  let lastError = "";

  for (const model of candidateModels.slice(0, 4)) {
    try {
      const cleanModel = model.replace(/^models\//, "");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

      // Attempt with systemInstruction
      let res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 3500,
          },
        }),
        signal: AbortSignal.timeout(30000),
      });

      // If systemInstruction is rejected, retry without it (compatible with all versions)
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
                temperature: 0.35,
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
        lastError = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      }
    } catch (e: any) {
      lastError = e?.message || "Gemini connection timed out.";
    }
  }

  return { error: lastError || "Failed to generate content from Google Gemini." };
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

    const latestUserMsg = messages.filter((m) => m.role === "user").pop()?.content || "";

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

        case "openai":
          result = await callOpenAICompatible(
            "https://api.openai.com/v1",
            userApiKey,
            ["gpt-4o-mini", "gpt-4o"],
            systemPrompt,
            messages,
          );
          break;

        case "anthropic":
          result = await callAnthropic(
            userApiKey,
            ["claude-3-haiku-20240307", "claude-3-5-sonnet-20241022"],
            systemPrompt,
            messages,
          );
          break;

        case "groq":
          result = await callOpenAICompatible(
            "https://api.groq.com/openai/v1",
            userApiKey,
            ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
            systemPrompt,
            messages,
          );
          break;
      }

      if (result.text) {
        return NextResponse.json({
          text: result.text,
        });
      }

      // If user provided a key and it returned an error, report it directly so the student knows what happened
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
      const serverResult = await callGemini(serverGeminiKey, systemPrompt, messages);
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
          temperature: 0.35,
        }),
        signal: AbortSignal.timeout(75000), // Extended to 75s for reasoning models
      });

      const raw = await polRes.text();

      // Check for free tier rate-limit (45 seconds per IP cooldown)
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

      if (polRes.ok && raw && raw.trim() && !raw.startsWith("<!DOCTYPE") && raw.length > 20) {
        return NextResponse.json({
          text: cleanMarkdownContent(raw),
        });
      }
    } catch (pollinationErr: any) {
      console.warn("Free AI service request failed:", pollinationErr?.message);
    }

    // If Free AI failed or timed out, inform the student honestly with a retry action
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

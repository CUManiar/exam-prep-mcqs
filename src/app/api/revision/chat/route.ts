import { NextRequest, NextResponse } from "next/server";
import {
  getUpscRevisionSystemPrompt,
  cleanMarkdownContent,
} from "../../../../lib/revisionAi";
import { RevisionContext, RevisionMessage, RevisionProviderConfig } from "../../../../lib/types";
import { generatePaperPerformanceReport } from "../../../../lib/revisionDossiers";

export const runtime = "nodejs";

/** OpenAI-compatible chat call (works for OpenAI, Groq, and similar APIs) */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  models: string[],
  systemPrompt: string,
  messages: RevisionMessage[],
): Promise<{ text: string } | null> {
  const formattedMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    })),
  ];

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
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.choices?.[0]?.message?.content || "";
        if (rawText.trim()) {
          return { text: cleanMarkdownContent(rawText) };
        }
      } else if (res.status === 401 || res.status === 403) {
        return null; // Key invalid — break out
      }
      // Model-specific error — try next model
    } catch (e: any) {
      console.warn(`OpenAI-compatible call failed (${baseUrl}, ${model}):`, e?.message);
    }
  }
  return null;
}

/** Anthropic Messages API call */
async function callAnthropic(
  apiKey: string,
  models: string[],
  systemPrompt: string,
  messages: RevisionMessage[],
): Promise<{ text: string } | null> {
  const formattedMessages = messages.map((m) => ({
    role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
    content: m.content,
  }));

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
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.content?.[0]?.text || "";
        if (rawText.trim()) {
          return { text: cleanMarkdownContent(rawText) };
        }
      } else if (res.status === 401 || res.status === 403) {
        return null; // Key invalid
      }
    } catch (e: any) {
      console.warn(`Anthropic call failed (${model}):`, e?.message);
    }
  }
  return null;
}

/** Gemini REST API call */
async function callGemini(
  apiKey: string,
  models: string[],
  systemPrompt: string,
  messages: RevisionMessage[],
): Promise<{ text: string } | null> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
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

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text.trim()) {
          return { text: cleanMarkdownContent(text) };
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || "";
        if (
          (res.status === 400 &&
            (errMsg.toLowerCase().includes("api key not valid") ||
              errMsg.toLowerCase().includes("api_key_invalid"))) ||
          res.status === 401 ||
          res.status === 403
        ) {
          return null; // Key invalid
        }
        // Model-specific issue — try next model
      }
    } catch (e: any) {
      console.warn(`Gemini call failed (${model}):`, e?.message);
    }
  }
  return null;
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
    let clearInvalidKey = false;
    let keyNotice: string | undefined = undefined;

    // SPECIALIZED ROUTING: Factual Attempt / Score Calculation in Paper Mode
    const isScoreInquiry =
      context.mode === "paper" &&
      /\b(score|marks|result|how did i do|how much score|my performance|wrong questions|mistakes|accuracy|how many correct)\b/i.test(
        latestUserMsg,
      );

    if (isScoreInquiry) {
      const performanceText = generatePaperPerformanceReport(context);
      return NextResponse.json({
        text: cleanMarkdownContent(performanceText),
        clearInvalidKey,
        keyNotice,
      });
    }

    const systemPrompt = getUpscRevisionSystemPrompt(context);
    const userApiKey = providerConfig?.apiKey?.trim();
    const provider = providerConfig?.provider;

    // ── PROVIDER DISPATCH ──
    if (userApiKey && provider) {
      let result: { text: string } | null = null;

      switch (provider) {
        case "gemini":
          result = await callGemini(
            userApiKey,
            ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
            systemPrompt,
            messages,
          );
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

      if (result) {
        return NextResponse.json({
          text: result.text,
          clearInvalidKey: false,
        });
      }

      // If we get here, provider key failed — fall through to free AI
      clearInvalidKey = true;
      const providerLabel = provider === "gemini" ? "Google Gemini" : provider === "openai" ? "OpenAI" : provider === "anthropic" ? "Anthropic Claude" : "Groq";
      keyNotice = `Saved ${providerLabel} API key was invalid or all models failed. Automatically switched to Free AI.`;
      console.warn(`Provider ${provider} failed, falling through to Free AI.`);
    }

    // ── Also try server-side Gemini key if no user key ──
    const serverGeminiKey = process.env.GEMINI_API_KEY?.trim();
    if (!userApiKey && serverGeminiKey) {
      const serverResult = await callGemini(
        serverGeminiKey,
        ["gemini-2.0-flash", "gemini-1.5-flash"],
        systemPrompt,
        messages,
      );
      if (serverResult) {
        return NextResponse.json({
          text: serverResult.text,
          clearInvalidKey: false,
        });
      }
    }

    // ── FREE AI FALLBACK (Pollinations) ──
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
        signal: AbortSignal.timeout(45000),
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
          clearInvalidKey,
          keyNotice,
        });
      }

      if (polRes.ok && raw && raw.trim() && !raw.startsWith("<!DOCTYPE") && raw.length > 20) {
        return NextResponse.json({
          text: cleanMarkdownContent(raw),
          clearInvalidKey,
          keyNotice,
        });
      }
    } catch (pollinationErr: any) {
      console.warn("Free AI service request failed:", pollinationErr?.message);
    }

    // If Free AI failed or timed out, inform the student honestly with a retry action
    return NextResponse.json(
      {
        error:
          "The AI revision service timed out or is temporarily overloaded. Please wait a few seconds and click Retry, or add a free API key (Gemini, OpenAI, Groq, or Claude) in AI Settings for instant replies.",
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

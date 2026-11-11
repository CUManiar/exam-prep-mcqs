import { NextRequest, NextResponse } from "next/server";
import {
  getUpscRevisionSystemPrompt,
  cleanMarkdownContent,
} from "../../../../lib/revisionAi";
import { RevisionContext, RevisionMessage, RevisionProviderConfig } from "../../../../lib/types";
import { generatePaperPerformanceReport } from "../../../../lib/revisionDossiers";

export const runtime = "nodejs";

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

    // 1. Check for User or Server API Key
    const userApiKey = providerConfig?.apiKey?.trim();
    const serverGeminiKey = process.env.GEMINI_API_KEY?.trim();

    // BRANCH 1: Custom Groq Key (Ultra-fast, Llama 3.3 70B)
    if (userApiKey && providerConfig?.provider === "groq") {
      const groqModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
      for (const model of groqModels) {
        try {
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userApiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: systemPrompt },
                ...messages.map((m) => ({
                  role: m.role === "assistant" ? "assistant" : "user",
                  content: m.content,
                })),
              ],
              temperature: 0.35,
              max_tokens: 3500,
            }),
            signal: AbortSignal.timeout(25000),
          });

          if (groqRes.ok) {
            const data = await groqRes.json();
            const rawText = data.choices?.[0]?.message?.content || "";
            if (rawText.trim()) {
              return NextResponse.json({ text: cleanMarkdownContent(rawText) });
            }
          } else if (groqRes.status === 401 || groqRes.status === 403) {
            clearInvalidKey = true;
            keyNotice = "Saved Groq API key was invalid. Automatically switched to Free AI.";
            break;
          }
        } catch (e: any) {
          console.warn(`Groq query with model ${model} failed:`, e?.message);
        }
      }
    }

    // BRANCH 2: Google Gemini Key (User Key or Server Key)
    const geminiKey = userApiKey || serverGeminiKey;
    if (geminiKey) {
      const candidateModels = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite-preview",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro",
      ];

      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      for (const model of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
          const geminiRes = await fetch(url, {
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
            signal: AbortSignal.timeout(25000),
          });

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text.trim()) {
              return NextResponse.json({
                text: cleanMarkdownContent(text),
                clearInvalidKey: false,
              });
            }
          } else {
            const errData = await geminiRes.json().catch(() => ({}));
            const errMsg = errData.error?.message || "";
            if (
              (geminiRes.status === 400 &&
                (errMsg.toLowerCase().includes("api key not valid") ||
                  errMsg.toLowerCase().includes("api_key_invalid"))) ||
              geminiRes.status === 401 ||
              geminiRes.status === 403
            ) {
              clearInvalidKey = true;
              keyNotice = "Saved Google AI Studio API key was invalid. Automatically switched to Free AI.";
              console.warn("Invalid Gemini key detected, purging key and falling to Free AI:", errMsg);
              break;
            }
          }
        } catch (e: any) {
          console.warn(`Gemini call with model ${model} timed out or failed:`, e?.message);
        }
      }
    }

    // BRANCH 3: Built-in Free Live AI Service (Multi-Turn Conversational Memory)
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
            `> ⏳ **Free AI Cooldown Active**\n>\n> The shared free AI tier allows **1 reply every 45 seconds per IP** to prevent server overload.\n>\n> **How to continue**:\n> - Please wait ~30 seconds and click **Retry** below.\n> - Or connect a free **Google Gemini or Groq API key** in **AI Settings** for instantaneous, zero-delay responses (100% free with zero billing).`,
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
          "The AI revision service timed out or is temporarily overloaded. Please wait a few seconds and click Retry, or add a free Google Gemini / Groq key in AI Settings for instantaneous replies.",
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

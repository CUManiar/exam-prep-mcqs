import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_GEMINI_MODEL, getUpscRevisionSystemPrompt } from "../../../../lib/revisionAi";
import { RevisionContext, RevisionMessage, RevisionProviderConfig } from "../../../../lib/types";

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

    const systemPrompt = getUpscRevisionSystemPrompt(context);

    // 1. Check for API Key (User-provided or Server Environment)
    const userApiKey = providerConfig?.apiKey?.trim();
    const serverGeminiKey = process.env.GEMINI_API_KEY?.trim();

    if (!userApiKey && !serverGeminiKey) {
      return NextResponse.json(
        {
          error:
            "A Google Gemini API Key is required for high-yield UPSC revision. Please connect your free key.",
          needsApiKey: true,
        },
        { status: 400 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s hard limit to prevent hanging

    try {
      // Branch A: Groq Provider
      if (userApiKey && providerConfig?.provider === "groq") {
        const model = providerConfig.model || "llama-3.3-70b-versatile";
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
          signal: controller.signal,
        });

        if (!groqRes.ok) {
          const errData = await groqRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Groq error HTTP ${groqRes.status}`;
          return NextResponse.json({ error: errMsg }, { status: groqRes.status });
        }

        const data = await groqRes.json();
        const text = data.choices?.[0]?.message?.content || "";
        return NextResponse.json({ text });
      }

      // Branch B: Google Gemini Provider (User key or Server fallback)
      const activeKey = userApiKey || serverGeminiKey;
      let model = providerConfig?.model || DEFAULT_GEMINI_MODEL;
      if (model.includes("2.5")) {
        model = "gemini-2.0-flash";
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

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
        signal: controller.signal,
      });

      if (!geminiRes.ok) {
        const errData = await geminiRes.json().catch(() => ({}));
        const errMsg =
          errData.error?.message || `Gemini error HTTP ${geminiRes.status}`;
        return NextResponse.json({ error: errMsg }, { status: geminiRes.status });
      }

      const data = await geminiRes.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text.trim()) {
        throw new Error("Empty response received from Gemini.");
      }
      return NextResponse.json({ text });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: any) {
    console.error("Revision chat error:", err);
    if (err.name === "AbortError") {
      return NextResponse.json(
        { error: "The AI request timed out after 30 seconds. Please try again." },
        { status: 504 },
      );
    }
    return NextResponse.json(
      {
        error:
          err.message ||
          "Unable to generate revision notes. Please verify your connection or API key.",
      },
      { status: 500 },
    );
  }
}

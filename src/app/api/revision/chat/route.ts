import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_GEMINI_MODEL, getUpscRevisionSystemPrompt } from "../../../../lib/revisionAi";
import { cleanMarkdownContent } from "../../../../components/revision/RevisionMarkdownRenderer";
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

    // 1. Check for User or Server API Key
    const userApiKey = providerConfig?.apiKey?.trim();
    const serverGeminiKey = process.env.GEMINI_API_KEY?.trim();

    // BRANCH 1: Custom Groq Key
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
        signal: AbortSignal.timeout(25000),
      });

      if (!groqRes.ok) {
        const errData = await groqRes.json().catch(() => ({}));
        const errMsg = errData.error?.message || `Groq error HTTP ${groqRes.status}`;
        return NextResponse.json({ error: errMsg }, { status: groqRes.status });
      }

      const data = await groqRes.json();
      const rawText = data.choices?.[0]?.message?.content || "";
      return NextResponse.json({ text: cleanMarkdownContent(rawText) });
    }

    // BRANCH 2: Google Gemini Key (User Key or Server Key)
    const geminiKey = userApiKey || serverGeminiKey;
    if (geminiKey) {
      const candidateModels = [
        providerConfig?.model || DEFAULT_GEMINI_MODEL,
        "gemini-1.5-flash",
        "gemini-2.0-flash",
      ].filter((v, idx, arr) => arr.indexOf(v) === idx);

      let lastError = "";
      for (const model of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
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
            signal: AbortSignal.timeout(25000),
          });

          if (geminiRes.ok) {
            const data = await geminiRes.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text.trim()) {
              return NextResponse.json({ text: cleanMarkdownContent(text) });
            }
          } else {
            const errData = await geminiRes.json().catch(() => ({}));
            lastError = errData.error?.message || `Gemini HTTP ${geminiRes.status}`;
            // If the model is not found, continue to next candidate model
            if (geminiRes.status === 404 || lastError.includes("not found") || lastError.includes("no longer available")) {
              continue;
            }
            return NextResponse.json({ error: lastError }, { status: geminiRes.status });
          }
        } catch (e: any) {
          lastError = e.message;
        }
      }
      if (lastError) {
        return NextResponse.json({ error: lastError }, { status: 500 });
      }
    }

    // BRANCH 3: Built-in Free Live AI Service (Zero configuration for student)
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    // Try primary free model (openai)
    try {
      const polRes = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: formattedMessages,
          model: "openai",
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(18000),
      });

      if (polRes.ok) {
        const raw = await polRes.text();
        if (raw && raw.trim() && !raw.startsWith("<!DOCTYPE")) {
          return NextResponse.json({ text: cleanMarkdownContent(raw) });
        }
      }
    } catch {
      // Proceed to secondary fallback
    }

    // Fallback free model (mistral)
    try {
      const polRes2 = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: formattedMessages,
          model: "mistral",
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(18000),
      });

      if (polRes2.ok) {
        const raw = await polRes2.text();
        if (raw && raw.trim() && !raw.startsWith("<!DOCTYPE")) {
          return NextResponse.json({ text: cleanMarkdownContent(raw) });
        }
      }
    } catch {
      // Proceed to tertiary
    }

    // Tertiary fallback: simple encoded query
    const latestUserMsg = messages.filter((m) => m.role === "user").pop()?.content || "";
    const promptSummary = `UPSC revision for ${context.topic || latestUserMsg.slice(0, 80)}. ${latestUserMsg}`;
    const simpleUrl = `https://text.pollinations.ai/${encodeURIComponent(promptSummary)}?model=openai`;
    const simpleRes = await fetch(simpleUrl, {
      signal: AbortSignal.timeout(12000),
    });

    if (simpleRes.ok) {
      const raw = await simpleRes.text();
      if (raw && raw.trim()) {
        return NextResponse.json({ text: cleanMarkdownContent(raw) });
      }
    }

    throw new Error("Free AI network is temporarily busy. Please retry in a few seconds.");
  } catch (err: any) {
    console.error("Revision chat error:", err);
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "AI request timed out. Please retry." },
        { status: 504 },
      );
    }
    return NextResponse.json(
      {
        error:
          err.message ||
          "Unable to complete revision query. Please try again.",
      },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getUpscRevisionSystemPrompt } from "../../../../lib/revisionAi";
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

    // 1. User provided their own API key
    if (providerConfig?.apiKey?.trim()) {
      const apiKey = providerConfig.apiKey.trim();
      if (providerConfig.provider === "groq") {
        const model = providerConfig.model || "llama-3.3-70b-versatile";
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
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
        });

        if (!groqRes.ok) {
          const errData = await groqRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Groq error HTTP ${groqRes.status}`;
          return NextResponse.json({ error: errMsg }, { status: groqRes.status });
        }

        const data = await groqRes.json();
        const text = data.choices?.[0]?.message?.content || "";
        return NextResponse.json({ text });
      } else {
        // Gemini with user key
        const model = providerConfig.model || "gemini-2.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
        });

        if (!geminiRes.ok) {
          const errData = await geminiRes.json().catch(() => ({}));
          const errMsg =
            errData.error?.message || `Gemini error HTTP ${geminiRes.status}`;
          return NextResponse.json({ error: errMsg }, { status: geminiRes.status });
        }

        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return NextResponse.json({ text });
      }
    }

    // 2. Server-side environment key (if set by maintainer)
    const serverGeminiKey = process.env.GEMINI_API_KEY;
    if (serverGeminiKey?.trim()) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${serverGeminiKey.trim()}`;
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
      });

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return NextResponse.json({ text });
      }
    }

    // 3. Built-in Free Live AI Service (No key required for student)
    const pollinationsPayload = {
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      ],
      model: "openai",
    };

    const polRes = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pollinationsPayload),
    });

    if (!polRes.ok) {
      throw new Error(`Free AI service returned HTTP ${polRes.status}: ${polRes.statusText}`);
    }

    const text = await polRes.text();
    if (!text || !text.trim()) {
      throw new Error("Empty response received from AI model.");
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("Revision chat error:", err);
    return NextResponse.json(
      {
        error:
          err.message ||
          "Unable to generate revision notes. Please verify your connection or enter an API key in settings.",
      },
      { status: 500 },
    );
  }
}

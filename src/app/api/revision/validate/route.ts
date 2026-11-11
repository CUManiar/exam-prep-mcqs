import { NextRequest, NextResponse } from "next/server";
import { RevisionProvider } from "../../../../lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider,
      apiKey,
    }: {
      provider?: RevisionProvider;
      apiKey?: string;
    } = body;

    const key = apiKey?.trim();
    if (!key) {
      return NextResponse.json(
        { valid: false, error: "API key cannot be empty." },
        { status: 400 },
      );
    }

    if (!provider) {
      return NextResponse.json(
        { valid: false, error: "Provider not specified." },
        { status: 400 },
      );
    }

    // ── 1. GOOGLE GEMINI VALIDATION ──
    if (provider === "gemini") {
      try {
        // Query models list to verify key authenticity directly with Google
        const listRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
          { signal: AbortSignal.timeout(15000) },
        );

        if (!listRes.ok) {
          const errData = await listRes.json().catch(() => ({}));
          const errMsg =
            errData.error?.message ||
            (listRes.status === 400
              ? "Invalid Gemini API key. Please check your key from Google AI Studio."
              : `Google API error (HTTP ${listRes.status}): ${listRes.statusText}`);
          return NextResponse.json({ valid: false, error: errMsg });
        }

        const data = await listRes.json();
        const models: Array<{ name: string; supportedGenerationMethods?: string[] }> =
          data.models || [];

        const usableModels = models
          .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m) => m.name.replace(/^models\//, ""));

        if (usableModels.length === 0) {
          return NextResponse.json({
            valid: false,
            error:
              "API key is valid, but no text-generation models are enabled on this Google AI Studio project.",
          });
        }

        // Key is 100% authenticated and has active models
        const primaryModel =
          usableModels.find((m) => m.includes("2.0-flash")) ||
          usableModels.find((m) => m.includes("1.5-flash")) ||
          usableModels.find((m) => m.includes("flash")) ||
          usableModels[0];

        return NextResponse.json({
          valid: true,
          model: primaryModel,
          availableCount: usableModels.length,
        });
      } catch (err: any) {
        return NextResponse.json({
          valid: false,
          error:
            err.name === "TimeoutError"
              ? "Connection to Google AI Studio timed out. Please check your network."
              : `Failed to reach Google Gemini: ${err.message}`,
        });
      }
    }

    // ── 2. OPENAI VALIDATION ──
    if (provider === "openai") {
      try {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: {
            Authorization: `Bearer ${key}`,
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg =
            errData.error?.message ||
            (res.status === 401
              ? "Invalid OpenAI API key. Check your key from platform.openai.com."
              : `OpenAI error (HTTP ${res.status}): ${res.statusText}`);
          return NextResponse.json({ valid: false, error: errMsg });
        }

        return NextResponse.json({ valid: true, model: "gpt-4o-mini" });
      } catch (err: any) {
        return NextResponse.json({
          valid: false,
          error: `Failed to reach OpenAI: ${err.message}`,
        });
      }
    }

    // ── 3. ANTHROPIC VALIDATION ──
    if (provider === "anthropic") {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 5,
            messages: [{ role: "user", content: "Ping" }],
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok || res.status === 429) {
          return NextResponse.json({ valid: true, model: "claude-3-haiku-20240307" });
        }

        const errData = await res.json().catch(() => ({}));
        const errMsg =
          errData.error?.message ||
          (res.status === 401
            ? "Invalid Anthropic API key. Check console.anthropic.com."
            : `Anthropic error (HTTP ${res.status}): ${res.statusText}`);
        return NextResponse.json({ valid: false, error: errMsg });
      } catch (err: any) {
        return NextResponse.json({
          valid: false,
          error: `Failed to reach Anthropic: ${err.message}`,
        });
      }
    }

    // ── 4. GROQ VALIDATION ──
    if (provider === "groq") {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/models", {
          headers: {
            Authorization: `Bearer ${key}`,
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg =
            errData.error?.message ||
            (res.status === 401
              ? "Invalid Groq API key. Check your key from console.groq.com."
              : `Groq error (HTTP ${res.status}): ${res.statusText}`);
          return NextResponse.json({ valid: false, error: errMsg });
        }

        return NextResponse.json({ valid: true, model: "llama-3.3-70b-versatile" });
      } catch (err: any) {
        return NextResponse.json({
          valid: false,
          error: `Failed to reach Groq: ${err.message}`,
        });
      }
    }

    return NextResponse.json(
      { valid: false, error: "Unsupported provider." },
      { status: 400 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, error: err.message || "Validation failed." },
      { status: 500 },
    );
  }
}

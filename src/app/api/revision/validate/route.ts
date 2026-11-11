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

        usableModels.sort((a, b) => {
          const score = (id: string) => {
            let s = 0;
            if (id.includes("2.0-flash")) s += 20;
            if (id.includes("1.5-flash")) s += 10;
            if (id.includes("flash")) s += 5;
            return s;
          };
          return score(b) - score(a);
        });

        return NextResponse.json({
          valid: true,
          model: usableModels[0],
          availableCount: usableModels.length,
        });
      } catch (err: any) {
        return NextResponse.json({
          valid: false,
          error:
            err.name === "TimeoutError"
              ? "Connection to Google AI Studio timed out."
              : `Failed to reach Google Gemini: ${err.message}`,
        });
      }
    }

    // ── 2. GROQ VALIDATION ──
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

        const data = await res.json();
        const models = (data.data || [])
          .filter((m: any) => m.active !== false)
          .map((m: any) => m.id as string)
          .filter(
            (id: string) =>
              !id.includes("whisper") &&
              !id.includes("guard") &&
              !id.includes("embed") &&
              !id.includes("tool"),
          );

        if (models.length === 0) {
          return NextResponse.json({
            valid: false,
            error: "Key is valid but no active chat models were returned by Groq.",
          });
        }

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

        return NextResponse.json({
          valid: true,
          model: models[0],
          availableCount: models.length,
        });
      } catch (err: any) {
        return NextResponse.json({
          valid: false,
          error: `Failed to reach Groq: ${err.message}`,
        });
      }
    }

    // ── 3. OPENAI VALIDATION ──
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

        const data = await res.json();
        const models = (data.data || [])
          .map((m: any) => m.id as string)
          .filter(
            (id: string) =>
              (id.startsWith("gpt-") || id.startsWith("o1") || id.startsWith("o3")) &&
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

        return NextResponse.json({
          valid: true,
          model: models[0] || "gpt-4o-mini",
          availableCount: models.length,
        });
      } catch (err: any) {
        return NextResponse.json({
          valid: false,
          error: `Failed to reach OpenAI: ${err.message}`,
        });
      }
    }

    // ── 4. ANTHROPIC VALIDATION ──
    if (provider === "anthropic") {
      try {
        const res = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const data = await res.json();
          const models = (data.data || []).map((m: any) => m.id as string);
          return NextResponse.json({
            valid: true,
            model: models[0] || "claude-3-5-haiku-latest",
            availableCount: models.length,
          });
        }

        // If /v1/models is restricted, test with a 1-token message
        const pingRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku-latest",
            max_tokens: 5,
            messages: [{ role: "user", content: "Ping" }],
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (pingRes.ok || pingRes.status === 429) {
          return NextResponse.json({ valid: true, model: "claude-3-5-haiku-latest" });
        }

        const errData = await pingRes.json().catch(() => ({}));
        const errMsg =
          errData.error?.message ||
          (pingRes.status === 401
            ? "Invalid Anthropic API key. Check console.anthropic.com."
            : `Anthropic error (HTTP ${pingRes.status}): ${pingRes.statusText}`);
        return NextResponse.json({ valid: false, error: errMsg });
      } catch (err: any) {
        return NextResponse.json({
          valid: false,
          error: `Failed to reach Anthropic: ${err.message}`,
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

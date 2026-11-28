export interface MediaAttachment {
  mimeType: string;
  data: string;
  name?: string;
}

export function stripBase64Prefix(data: string): string {
  return data.replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
}

export function normalizeMediaMime(mimeType?: string): string {
  const mime = (mimeType || "image/jpeg").toLowerCase().trim();
  if (mime === "image/jpg") return "image/jpeg";
  return mime;
}

function normalizeAnthropicImageMime(
  mime: string,
): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  if (mime === "image/png") return "image/png";
  if (mime === "image/gif") return "image/gif";
  if (mime === "image/webp") return "image/webp";
  return "image/jpeg";
}

function cleanJsonString(str: string): string {
  return str
    .replace(/"((?:[^"\\]|\\.)*)"/gs, (_, content) => {
      return (
        '"' +
        content
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r")
          .replace(/\t/g, "\\t") +
        '"'
      );
    })
    .replace(/,\s*([}\]])/g, "$1");
}

function tryRepairTruncatedJson(str: string): any {
  let s = str.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const firstBrace = s.indexOf("{");
  if (firstBrace !== -1) {
    s = s.slice(firstBrace);
  }

  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && inString) {
      escaped = !escaped;
    } else if (c === '"' && !escaped) {
      inString = !inString;
    } else {
      escaped = false;
    }
  }

  if (inString) {
    s += '"';
  }

  let openBraces = 0;
  let openBrackets = 0;
  inString = false;
  escaped = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && inString) {
      escaped = !escaped;
    } else if (c === '"' && !escaped) {
      inString = !inString;
    } else if (!inString) {
      if (c === "{") openBraces++;
      if (c === "}") openBraces--;
      if (c === "[") openBrackets++;
      if (c === "]") openBrackets--;
    } else {
      escaped = false;
    }
  }

  while (openBrackets > 0) {
    s += "]";
    openBrackets--;
  }
  while (openBraces > 0) {
    s += "}";
    openBraces--;
  }

  try {
    return JSON.parse(s);
  } catch {
    try {
      return JSON.parse(cleanJsonString(s));
    } catch {}
  }
  return null;
}

/** Robustly parse JSON from an LLM response (handles markdown fences, unescaped newlines, truncation). */
export function parseJsonFromText(raw: string): any {
  if (!raw || typeof raw !== "string") return null;

  try {
    return JSON.parse(raw);
  } catch {}

  try {
    return JSON.parse(cleanJsonString(raw));
  } catch {}

  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch {
      try {
        return JSON.parse(cleanJsonString(match[1]));
      } catch {}
    }
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = raw.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        return JSON.parse(cleanJsonString(candidate));
      } catch {}
    }
  }

  const repaired = tryRepairTruncatedJson(raw);
  if (repaired) return repaired;

  return null;
}

/** Dynamically discover active generateContent models from a Gemini API key. */
export async function discoverGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (listRes.ok) {
      const data = await listRes.json();
      const models: string[] = (data.models || [])
        .filter((m: any) =>
          m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m: any) => String(m.name || "").replace(/^models\//, ""))
        .filter(
          (name: string) =>
            name.startsWith("gemini-") &&
            !name.includes("embedding") &&
            !name.includes("aqa") &&
            !name.includes("imagen") &&
            !name.includes("learnlm") &&
            !name.includes("tts") &&
            !name.includes("realtime") &&
            !name.includes("audio") &&
            !name.includes("preview-image") &&
            !name.includes("robotics") &&
            !name.includes("computer-use") &&
            !name.includes("deep-research"),
        );

      const score = (id: string) => {
        let s = 0;
        const verMatch = id.match(/^gemini-(\d+)(?:\.(\d+))?/);
        if (verMatch) {
          const major = Number(verMatch[1]) || 0;
          const minor = Number(verMatch[2]) || 0;
          s += major * 100 + minor * 10;
        }
        if (id.includes("flash")) s += 40;
        else if (id.includes("pro")) s += 25;
        if (id.includes("lite")) s -= 15;
        if (id.includes("latest")) s += 5;
        if (id.includes("preview") || id.includes("exp")) s -= 20;
        return s;
      };

      models.sort((a, b) => score(b) - score(a));
      if (models.length > 0) return models;
    }
  } catch (e: any) {
    console.warn("Gemini model discovery failed:", e?.message);
  }
  return ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.5-pro"];
}

/** Dynamically discover active chat/vision models from an OpenAI API key. */
export async function discoverOpenAIModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const models: string[] = (data.data || [])
        .map((m: any) => String(m.id || ""))
        .filter(
          (id: string) =>
            (id.startsWith("gpt-") ||
              id.startsWith("o1") ||
              id.startsWith("o3") ||
              id.startsWith("o4")) &&
            !id.includes("instruct") &&
            !id.includes("realtime") &&
            !id.includes("audio") &&
            !id.includes("transcribe") &&
            !id.includes("tts") &&
            !id.includes("search") &&
            !id.includes("image") &&
            !id.includes("codex") &&
            !id.includes("deep-research"),
        );

      const score = (id: string) => {
        let s = 0;
        if (id === "gpt-4.1") s += 160;
        else if (id === "gpt-4o") s += 150;
        else if (id === "gpt-5") s += 145;
        else if (id === "gpt-4.1-mini") s += 130;
        else if (id === "gpt-4o-mini") s += 125;
        else if (id === "gpt-5-mini") s += 120;
        else if (id.startsWith("gpt-5")) s += 110;
        else if (id.startsWith("gpt-4.1")) s += 105;
        else if (id.startsWith("gpt-4o")) s += 100;
        else if (id.startsWith("o4-mini")) s += 90;
        else if (id.startsWith("o3")) s += 85;
        else s += 20;
        if (id.includes("nano")) s -= 30;
        if (id.includes("preview")) s -= 15;
        return s;
      };

      models.sort((a, b) => score(b) - score(a));
      if (models.length > 0) return models;
    }
  } catch (e: any) {
    console.warn("OpenAI model discovery failed:", e?.message);
  }
  return ["gpt-4.1", "gpt-4o", "gpt-4.1-mini", "gpt-4o-mini"];
}

/** Dynamically discover active models from an Anthropic API key. */
export async function discoverAnthropicModels(
  apiKey: string,
): Promise<string[]> {
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
      const models: string[] = (data.data || [])
        .map((m: any) => String(m.id || ""))
        .filter((id: string) => id.startsWith("claude-"));

      const score = (id: string) => {
        let s = 0;
        if (id.includes("sonnet")) s += 100;
        else if (id.includes("haiku")) s += 70;
        else if (id.includes("opus")) s += 60;
        // Extract date suffix (YYYYMMDD) or version numbers to prefer newer models
        const dateMatch = id.match(/(\d{8})/);
        if (dateMatch) {
          s += Number(dateMatch[1].slice(0, 6)) / 10000;
        }
        if (id.includes("4-6") || id.includes("4.6")) s += 50;
        else if (id.includes("4-5") || id.includes("4.5")) s += 40;
        else if (id.includes("-4-")) s += 30;
        else if (id.includes("3-7")) s += 15;
        return s;
      };

      models.sort((a, b) => score(b) - score(a));
      if (models.length > 0) return models;
    }
  } catch (e: any) {
    console.warn("Anthropic model discovery failed:", e?.message);
  }
  return [
    "claude-sonnet-4-5-20250929",
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-20250514",
  ];
}

/** Dynamically discover active models from a Groq API key. */
export async function discoverGroqModels(
  apiKey: string,
  preferVision: boolean = false,
): Promise<string[]> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const allModels: string[] = (data.data || [])
        .filter((m: any) => m.active !== false)
        .map((m: any) => String(m.id || ""))
        .filter(
          (id: string) =>
            !id.includes("whisper") &&
            !id.includes("guard") &&
            !id.includes("embed") &&
            !id.includes("tool") &&
            !id.includes("tts") &&
            !id.includes("orpheus"),
        );

      if (preferVision) {
        const visionModels = allModels.filter(
          (id) =>
            id.includes("llama-4-scout") ||
            id.includes("llama-4-maverick") ||
            id.includes("vision"),
        );
        if (visionModels.length > 0) {
          visionModels.sort((a, b) => {
            const s = (id: string) =>
              id.includes("maverick") ? 20 : id.includes("scout") ? 15 : 5;
            return s(b) - s(a);
          });
          return visionModels;
        }
      } else {
        const textModels = allModels.filter(
          (id) => !id.includes("vision") && !id.includes("prompt-guard"),
        );
        if (textModels.length > 0) {
          textModels.sort((a, b) => {
            const s = (id: string) => {
              let v = 0;
              if (id === "llama-3.3-70b-versatile") v += 100;
              if (id.includes("70b")) v += 40;
              if (id.includes("llama-4")) v += 35;
              if (id.includes("versatile")) v += 20;
              if (id.includes("qwen")) v += 15;
              return v;
            };
            return s(b) - s(a);
          });
          return textModels;
        }
      }
    }
  } catch (e: any) {
    console.warn("Groq model discovery failed:", e?.message);
  }
  return preferVision
    ? [
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "meta-llama/llama-4-maverick-17b-128e-instruct",
      ]
    : ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
}

export async function callGeminiMultimodal({
  apiKey,
  prompt,
  attachments = [],
  temperature = 0.25,
  maxOutputTokens = 6000,
  timeoutMs = 85000,
}: {
  apiKey: string;
  prompt: string;
  attachments?: MediaAttachment[];
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  const discovered = await discoverGeminiModels(apiKey);
  const models = discovered.slice(0, 4);

  const parts: any[] = [{ text: prompt }];
  for (const att of attachments) {
    parts.push({
      inlineData: {
        mimeType: normalizeMediaMime(att.mimeType),
        data: stripBase64Prefix(att.data),
      },
    });
  }

  let lastError = "";
  let lastModel = models[0] || "gemini";

  for (const rawModel of models) {
    const cleanModel = rawModel.replace(/^models\//, "");
    lastModel = cleanModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature,
            maxOutputTokens,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) {
        const data = await res.json();
        const text = (data.candidates?.[0]?.content?.parts || [])
          .map((p: any) => p.text || "")
          .join("")
          .trim();
        if (text) return text;
        lastError = "Empty response from Gemini";
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;

        if (
          res.status === 401 ||
          res.status === 403 ||
          lastError.toLowerCase().includes("api key")
        ) {
          throw new Error(
            `Google Gemini authentication failed (${cleanModel}): ${lastError}`,
          );
        }

        if (
          res.status === 400 &&
          lastError.toLowerCase().includes("responsemimetype")
        ) {
          const retryRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: {
                temperature,
                maxOutputTokens,
              },
            }),
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            const retryText = (retryData.candidates?.[0]?.content?.parts || [])
              .map((p: any) => p.text || "")
              .join("")
              .trim();
            if (retryText) return retryText;
          }
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("authentication failed")) throw err;
      lastError = err?.message || "Gemini connection error";
    }
  }

  throw new Error(
    `Google Gemini evaluation failed (${lastModel}): ${lastError}`,
  );
}

export async function callOpenAIMultimodal({
  apiKey,
  prompt,
  attachments = [],
  temperature = 0.25,
  maxTokens = 6000,
  timeoutMs = 85000,
}: {
  apiKey: string;
  prompt: string;
  attachments?: MediaAttachment[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  const discovered = await discoverOpenAIModels(apiKey);
  const models = discovered.slice(0, 4);

  const content: any[] = [{ type: "text", text: prompt }];
  for (const att of attachments) {
    const clean = stripBase64Prefix(att.data);
    const mime = normalizeMediaMime(att.mimeType);
    if (mime === "application/pdf") {
      content.push({
        type: "file",
        file: {
          filename: att.name || "document.pdf",
          file_data: `data:application/pdf;base64,${clean}`,
        },
      });
    } else {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${mime};base64,${clean}`,
          detail: "high",
        },
      });
    }
  }

  let lastError = "";
  let lastModel = models[0] || "gpt-4o";

  for (const model of models) {
    lastModel = model;
    const isReasoningModel =
      model.startsWith("o1") ||
      model.startsWith("o3") ||
      model.startsWith("o4") ||
      model.startsWith("gpt-5");

    const buildBody = (useCompletionTokens: boolean, omitTemp: boolean) => {
      const payload: any = {
        model,
        messages: [{ role: "user", content }],
        response_format: { type: "json_object" },
      };
      if (useCompletionTokens) {
        payload.max_completion_tokens = maxTokens;
      } else {
        payload.max_tokens = maxTokens;
      }
      if (!omitTemp) {
        payload.temperature = temperature;
      }
      return payload;
    };

    try {
      let res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(buildBody(isReasoningModel, isReasoningModel)),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok && res.status === 400) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = String(errJson.error?.message || "");
        if (
          errMsg.includes("max_completion_tokens") ||
          errMsg.includes("max_tokens") ||
          errMsg.includes("temperature")
        ) {
          res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(buildBody(true, true)),
            signal: AbortSignal.timeout(timeoutMs),
          });
        } else {
          lastError = errMsg || `HTTP ${res.status}`;
          continue;
        }
      }

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        if (text) return text;
        lastError = "Empty response from OpenAI";
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            `OpenAI authentication failed (${model}): ${lastError}`,
          );
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("authentication failed")) throw err;
      lastError = err?.message || "OpenAI connection error";
    }
  }

  throw new Error(`OpenAI evaluation failed (${lastModel}): ${lastError}`);
}

export async function callAnthropicMultimodal({
  apiKey,
  prompt,
  attachments = [],
  systemPrompt,
  temperature = 0.25,
  maxTokens = 6000,
  timeoutMs = 85000,
}: {
  apiKey: string;
  prompt: string;
  attachments?: MediaAttachment[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  const discovered = await discoverAnthropicModels(apiKey);
  const models = discovered.slice(0, 4);

  const content: any[] = [];
  for (const att of attachments) {
    const clean = stripBase64Prefix(att.data);
    const mime = normalizeMediaMime(att.mimeType);
    if (mime === "application/pdf") {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: clean,
        },
      });
    } else {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: normalizeAnthropicImageMime(mime),
          data: clean,
        },
      });
    }
  }
  content.push({ type: "text", text: prompt });

  let lastError = "";
  let lastModel = models[0] || "claude";

  for (const model of models) {
    lastModel = model;
    try {
      const payload: any = {
        model,
        messages: [{ role: "user", content }],
        max_tokens: maxTokens,
        temperature,
      };
      if (systemPrompt) {
        payload.system = systemPrompt;
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text || "";
        if (text) return text;
        lastError = "Empty response from Anthropic";
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            `Anthropic authentication failed (${model}): ${lastError}`,
          );
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("authentication failed")) throw err;
      lastError = err?.message || "Anthropic connection error";
    }
  }

  throw new Error(`Anthropic evaluation failed (${lastModel}): ${lastError}`);
}

export async function callGroqMultimodal({
  apiKey,
  prompt,
  attachments = [],
  temperature = 0.25,
  maxTokens = 4000,
  timeoutMs = 60000,
}: {
  apiKey: string;
  prompt: string;
  attachments?: MediaAttachment[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  const imageAttachments = attachments.filter(
    (att) => normalizeMediaMime(att.mimeType) !== "application/pdf",
  );
  const isVision = imageAttachments.length > 0;
  const discovered = await discoverGroqModels(apiKey, isVision);
  const models = discovered.slice(0, 3);

  const content: any = isVision
    ? [
        { type: "text", text: prompt },
        ...imageAttachments.map((att) => ({
          type: "image_url",
          image_url: {
            url: `data:${normalizeMediaMime(att.mimeType)};base64,${stripBase64Prefix(att.data)}`,
          },
        })),
      ]
    : prompt;

  let lastError = "";
  let lastModel = models[0] || "groq";

  for (const model of models) {
    lastModel = model;
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content }],
            temperature,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        },
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        if (text) return text;
        lastError = "Empty response from Groq";
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            `Groq authentication failed (${model}): ${lastError}`,
          );
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("authentication failed")) throw err;
      lastError = err?.message || "Groq connection error";
    }
  }

  throw new Error(`Groq evaluation failed (${lastModel}): ${lastError}`);
}

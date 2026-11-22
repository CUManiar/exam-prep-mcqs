import {
  RevisionContext,
  RevisionMessage,
  RevisionProvider,
  RevisionProviderConfig,
} from "./types";

export type { RevisionProvider, RevisionProviderConfig };

const REVISION_CONFIG_KEY = "upsc_revision_llm_config";
const REVISION_VAULT_KEY = "upsc_revision_keys_vault";

/** Provider display metadata for the settings UI */
export const PROVIDER_INFO: Record<
  string,
  {
    label: string;
    description: string;
    icon: string;
    keyPlaceholder: string;
    keyGetUrl: string;
    keyGetLabel: string;
  }
> = {
  gemini: {
    label: "Google Gemini",
    description:
      "Free tier available. High-yield syllabus analysis & case laws.",
    icon: "✦",
    keyPlaceholder: "Paste AIzaSy... here",
    keyGetUrl: "https://aistudio.google.com/app/apikey",
    keyGetLabel: "Google AI Studio",
  },
  groq: {
    label: "Groq Cloud",
    description: "Free tier available. Blazing fast inference (300+ tok/s).",
    icon: "⚡",
    keyPlaceholder: "Paste gsk_... here",
    keyGetUrl: "https://console.groq.com/keys",
    keyGetLabel: "Groq Console",
  },
  openai: {
    label: "OpenAI (ChatGPT)",
    description: "Deep reasoning & multi-dimensional conceptual analysis.",
    icon: "◎",
    keyPlaceholder: "Paste sk-... here",
    keyGetUrl: "https://platform.openai.com/api-keys",
    keyGetLabel: "OpenAI Platform",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    description: "Nuanced, articulate long-form UPSC answer frameworks.",
    icon: "◈",
    keyPlaceholder: "Paste sk-ant-... here",
    keyGetUrl: "https://console.anthropic.com/settings/keys",
    keyGetLabel: "Anthropic Console",
  },
};

import { buildAdaptiveSystemPrompt } from "./revision/promptBuilder";

export function getUpscRevisionSystemPrompt(context?: RevisionContext): string {
  return buildAdaptiveSystemPrompt(context);
}

const STORAGE_VAULT_SALT = "upsc_candidate_priv_vault_v1";

/** Obfuscates API key and provider configuration so it is not stored as plain text */
function obfuscateConfig(config: RevisionProviderConfig): string {
  try {
    const raw = JSON.stringify(config);
    let str = "";
    for (let i = 0; i < raw.length; i++) {
      str += String.fromCharCode(
        raw.charCodeAt(i) ^
          STORAGE_VAULT_SALT.charCodeAt(i % STORAGE_VAULT_SALT.length),
      );
    }
    return "sec_v1:" + btoa(encodeURIComponent(str));
  } catch {
    return btoa(JSON.stringify(config));
  }
}

/** Decodes obfuscated configuration from local storage */
function deobfuscateConfig(data: string): RevisionProviderConfig | null {
  try {
    if (data.startsWith("sec_v1:")) {
      const b64 = data.slice(7);
      const str = decodeURIComponent(atob(b64));
      let raw = "";
      for (let i = 0; i < str.length; i++) {
        raw += String.fromCharCode(
          str.charCodeAt(i) ^
            STORAGE_VAULT_SALT.charCodeAt(i % STORAGE_VAULT_SALT.length),
        );
      }
      return JSON.parse(raw);
    }
    // Backward compatibility for previously saved unencoded JSON
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function getRevisionConfig(): RevisionProviderConfig | null {
  if (typeof window === "undefined") return null;
  try {
    let config: RevisionProviderConfig | null = null;
    const raw = localStorage.getItem(REVISION_CONFIG_KEY);
    if (raw) {
      config = deobfuscateConfig(raw);
    }

    // If active config is valid and has an apiKey, return it immediately
    if (config?.apiKey?.trim() && config?.provider) {
      return config;
    }

    // Fallback: Check provider vault if active config has no key or is missing
    const rawVault = localStorage.getItem(REVISION_VAULT_KEY);
    if (rawVault) {
      try {
        const vault = JSON.parse(atob(rawVault));
        if (vault && typeof vault === "object") {
          const preferred = config?.provider || "gemini";
          if (vault[preferred]?.trim()) {
            return {
              provider: preferred as RevisionProvider,
              apiKey: vault[preferred].trim(),
            };
          }
          if (vault.gemini?.trim()) {
            return { provider: "gemini", apiKey: vault.gemini.trim() };
          }
          if (vault.openai?.trim()) {
            return { provider: "openai", apiKey: vault.openai.trim() };
          }
          if (vault.anthropic?.trim()) {
            return { provider: "anthropic", apiKey: vault.anthropic.trim() };
          }
          if (vault.groq?.trim()) {
            return { provider: "groq", apiKey: vault.groq.trim() };
          }
        }
      } catch {}
    }

    return config;
  } catch {
    return null;
  }
}

export function getProviderVault(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(REVISION_VAULT_KEY);
    const vault: Record<string, string> = {};
    if (raw) {
      try {
        const parsed = JSON.parse(atob(raw));
        if (parsed && typeof parsed === "object") {
          Object.assign(vault, parsed);
        }
      } catch {}
    }
    const rawConfig = localStorage.getItem(REVISION_CONFIG_KEY);
    if (rawConfig) {
      const active = deobfuscateConfig(rawConfig);
      if (active?.provider && active?.apiKey) {
        vault[active.provider] = active.apiKey;
      }
    }
    return vault;
  } catch {
    return {};
  }
}

export function saveProviderKey(provider: string, apiKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const vault = getProviderVault();
    vault[provider] = apiKey;
    localStorage.setItem(REVISION_VAULT_KEY, btoa(JSON.stringify(vault)));
  } catch (e) {
    console.warn("Failed to save provider key to vault:", e);
  }
}

export function removeProviderKey(provider: string): void {
  if (typeof window === "undefined") return;
  try {
    const vault = getProviderVault();
    delete vault[provider];
    localStorage.setItem(REVISION_VAULT_KEY, btoa(JSON.stringify(vault)));
  } catch (e) {
    console.warn("Failed to remove provider key from vault:", e);
  }
}

export function switchActiveProvider(
  newProvider: RevisionProvider | string,
): RevisionProviderConfig | null {
  if (typeof window === "undefined") return null;
  const vault = getProviderVault();
  const key = vault[newProvider];
  if (!key) return null;
  const config: RevisionProviderConfig = {
    provider: newProvider as RevisionProvider,
    apiKey: key,
  };
  saveRevisionConfig(config);
  return config;
}

export function saveRevisionConfig(config: RevisionProviderConfig): void {
  if (typeof window === "undefined") return;
  try {
    const secured = obfuscateConfig(config);
    localStorage.setItem(REVISION_CONFIG_KEY, secured);
    saveProviderKey(config.provider, config.apiKey);
    window.dispatchEvent(
      new CustomEvent("upsc-ai-config-changed", { detail: config }),
    );
  } catch (e) {
    console.warn("Failed to securely store revision config:", e);
  }
}

export function clearRevisionConfig(providerToClear?: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REVISION_CONFIG_KEY);
  if (providerToClear) {
    removeProviderKey(providerToClear);
  }
  window.dispatchEvent(
    new CustomEvent("upsc-ai-config-changed", { detail: null }),
  );
}

export async function validateApiKey(
  provider: "gemini" | "openai" | "anthropic" | "groq",
  apiKey: string,
): Promise<{ valid: boolean; error?: string; model?: string }> {
  try {
    if (!apiKey || !apiKey.trim()) {
      return { valid: false, error: "API key cannot be empty." };
    }

    const res = await fetch("/api/revision/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        apiKey: apiKey.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.valid) {
      return {
        valid: false,
        error: data.error || `Validation failed with status ${res.status}.`,
      };
    }

    return {
      valid: true,
      model: data.model,
    };
  } catch (err: any) {
    return {
      valid: false,
      error:
        err.name === "TimeoutError"
          ? "Validation request timed out."
          : err.message || "Failed to reach the validation server.",
    };
  }
}

export interface RevisionApiError extends Error {
  needsApiKey?: boolean;
}

export interface RevisionQueryResponse {
  text: string;
  clearInvalidKey?: boolean;
  keyNotice?: string;
}

/**
 * Unescapes literal backslash sequences often returned by LLM APIs
 * (\n, \r\n, \", \t) into real whitespace and formatting.
 */
export function cleanMarkdownContent(raw: string): string {
  if (!raw) return "";
  let text = raw;

  // Unescape backslash sequences often returned by LLM APIs
  if (text.includes("\\n")) {
    text = text
      .replace(/\\\\n/g, "\n")
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n");
  }
  if (text.includes("\\r")) {
    text = text.replace(/\\r/g, "\n");
  }

  // CRITICAL: DO NOT replace \t if followed by a letter (\times, \theta, \tau, \text, \to, \tan, etc.)
  // Only replace \t followed by whitespace or at line ends
  text = text.replace(/\\t(?=[\s\t,;.)\]}]|$)/g, "  ");

  // Fix escaped quotes
  if (text.includes('\\"')) {
    text = text.replace(/\\"/g, '"');
  }

  // Ensure markdown headings have a space after '#' (e.g. "###Heading" -> "### Heading")
  text = text.replace(/^(#{1,4})([^\s#])/gm, "$1 $2");

  // Clean meta-boilerplate headers if produced by LLM
  text = text.replace(/^>\s*(Target Audience|Format):[^\n]*\n?/gim, "");

  // Prevent degenerate runaway number counting loops (e.g. 1, 2, 3... 500)
  text = text.replace(
    /(\b\d{1,4}\s*,\s*){12,}(\b\d{1,4}\b)/g,
    "Key relevant provisions",
  );

  return text;
}

export async function sendRevisionQuery(
  messages: RevisionMessage[],
  context: RevisionContext,
  config?: RevisionProviderConfig | null,
): Promise<RevisionQueryResponse> {
  const res = await fetch("/api/revision/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      context,
      providerConfig: config,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const err: RevisionApiError = new Error(
      errData.error ||
        `Revision API returned error ${res.status}: ${res.statusText}`,
    );
    err.needsApiKey = Boolean(errData.needsApiKey);
    throw err;
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }

  if (!data.text || !data.text.trim()) {
    throw new Error("No response generated. Please retry.");
  }

  return {
    text: data.text,
    clearInvalidKey: Boolean(data.clearInvalidKey),
    keyNotice: data.keyNotice,
  };
}

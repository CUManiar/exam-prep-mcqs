/**
 * Simple in-memory & session storage cache for UPSC revision concept queries.
 * Prevents redundant LLM queries for identical static concepts on BYOK keys.
 */

const CACHE_PREFIX = "upsc_revision_cache_";
const MAX_CACHE_ENTRIES = 50;

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function getCachedRevisionResponse(
  prompt: string,
  stage?: string,
  format?: string,
): string | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `${CACHE_PREFIX}${hashString(`${stage || "gen"}_${format || "crisp"}_${prompt.trim().toLowerCase()}`)}`;
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    // 24 hour cache expiration
    if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.text;
  } catch {
    return null;
  }
}

export function setCachedRevisionResponse(
  prompt: string,
  text: string,
  stage?: string,
  format?: string,
): void {
  if (typeof window === "undefined" || !text) return;
  try {
    const key = `${CACHE_PREFIX}${hashString(`${stage || "gen"}_${format || "crisp"}_${prompt.trim().toLowerCase()}`)}`;
    sessionStorage.setItem(
      key,
      JSON.stringify({
        text,
        timestamp: Date.now(),
      }),
    );
  } catch {
    // If storage full, clear revision cache entries
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(CACHE_PREFIX)) keysToRemove.push(k);
      }
      keysToRemove.slice(0, 10).forEach((k) => sessionStorage.removeItem(k));
    } catch {}
  }
}

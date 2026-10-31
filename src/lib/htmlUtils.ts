/**
 * Utilities for detecting, sanitizing, and rendering HTML in answer key explanations.
 */

/**
 * Checks whether the given text contains HTML tags.
 */
export function isHtmlContent(text?: string | null): boolean {
  if (!text) return false;
  // Match standard HTML tags such as <p>, <div>, <span>, <strong>, <b>, <em>, <i>, <ul>, <ol>, <li>, <br>, <table>, etc.
  return /<\/?[a-z][a-z0-9]*(\s+[^>]*)?\/?>/i.test(text);
}

/**
 * Whitelist of allowed HTML tags for answer key explanations.
 */
const ALLOWED_TAGS = new Set([
  "p",
  "span",
  "div",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "sub",
  "sup",
  "mark",
  "small",
  "blockquote",
  "pre",
  "code",
  "hr",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "details",
  "summary",
  "a",
  "img",
]);

/**
 * Whitelist of allowed HTML attributes.
 */
const ALLOWED_ATTRIBUTES = new Set([
  "class",
  "classname",
  "style",
  "id",
  "title",
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "width",
  "height",
  "colspan",
  "rowspan",
  "align",
  "border",
]);

/**
 * Strips all HTML tags from the given text, returning plain text.
 */
export function stripHtmlTags(html?: string | null): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Safely sanitizes HTML for rich answer key / solution explanations.
 * Strips script, style, iframe, object, embed tags, and any inline event handlers (on*),
 * ensuring safe rendering while preserving rich educational formatting.
 */
export function sanitizeExplanationHtml(rawHtml: string): string {
  if (!rawHtml) return "";

  // 1. Completely strip dangerous tags and their contents
  let html = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "");

  // 2. Filter tags and attributes against whitelist
  html = html.replace(/<\/?([a-z0-9_-]+)([^>]*)>/gi, (match, tagName, attrs) => {
    const lowerTag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(lowerTag)) {
      return "";
    }

    const isClosing = match.startsWith("</");
    if (isClosing) {
      return `</${lowerTag}>`;
    }

    // Clean attributes
    const cleanAttrs: string[] = [];
    const attrRegex =
      /([a-z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gi;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrVal = (attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "").trim();

      // Disallow all event handlers (onclick, onerror, onload, etc.)
      if (attrName.startsWith("on")) continue;

      // URL safety checks: block javascript:, data:, vbscript:
      if (attrName === "href" || attrName === "src") {
        const cleanVal = attrVal.replace(/\s+/g, "").toLowerCase();
        if (
          cleanVal.startsWith("javascript:") ||
          cleanVal.startsWith("data:") ||
          cleanVal.startsWith("vbscript:")
        ) {
          continue;
        }
      }

      if (ALLOWED_ATTRIBUTES.has(attrName)) {
        if (attrName === "href" && lowerTag === "a") {
          cleanAttrs.push(`href="${attrVal.replace(/"/g, "&quot;")}"`);
          cleanAttrs.push('target="_blank"');
          cleanAttrs.push('rel="noopener noreferrer"');
        } else if (attrName !== "target" && attrName !== "rel") {
          cleanAttrs.push(`${attrName}="${attrVal.replace(/"/g, "&quot;")}"`);
        }
      }
    }

    const attrString = cleanAttrs.length > 0 ? " " + cleanAttrs.join(" ") : "";
    const isSelfClosing =
      match.endsWith("/>") ||
      lowerTag === "br" ||
      lowerTag === "hr" ||
      lowerTag === "img";

    return `<${lowerTag}${attrString}${isSelfClosing ? " /" : ""}>`;
  });

  return html;
}

"use client";

import React, { useMemo } from "react";
import { isHtmlContent, sanitizeExplanationHtml } from "../lib/htmlUtils";

interface HtmlExplanationProps {
  text?: string | null;
  className?: string;
}

/**
 * Renders an answer key explanation.
 * If rich HTML is provided inside """ triple quotes, it sanitizes and converts it to formatted HTML.
 * Otherwise, it displays clean plain text with whitespace preserved.
 */
export function HtmlExplanation({ text, className = "" }: HtmlExplanationProps) {
  if (!text) return null;

  const hasHtml = useMemo(() => isHtmlContent(text), [text]);
  const sanitized = useMemo(() => (hasHtml ? sanitizeExplanationHtml(text) : ""), [hasHtml, text]);

  if (hasHtml) {
    return (
      <div
        className={`html-explanation text-slate-800 text-xs sm:text-sm leading-relaxed space-y-1.5 break-words select-text [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_strong]:font-bold [&_strong]:text-slate-900 [&_b]:font-bold [&_b]:text-slate-900 [&_em]:italic [&_i]:italic [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-slate-200 [&_table]:my-2 [&_table]:text-xs [&_th]:border [&_th]:border-slate-200 [&_th]:p-1.5 [&_th]:bg-slate-50 [&_th]:font-bold [&_th]:text-slate-900 [&_th]:text-left [&_td]:border [&_td]:border-slate-200 [&_td]:p-1.5 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_code]:bg-slate-100 [&_code]:text-indigo-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_a]:text-indigo-600 [&_a]:underline [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-xs [&_h3]:font-bold ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  return (
    <p
      className={`text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-normal select-text break-words ${className}`}
    >
      {text}
    </p>
  );
}

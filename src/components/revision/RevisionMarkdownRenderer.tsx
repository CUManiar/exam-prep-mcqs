"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Info,
  Layers,
  Lightbulb,
  Maximize2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface RevisionMarkdownRendererProps {
  content: string;
  className?: string;
}

interface AlertBoxProps {
  type: "NOTE" | "TIP" | "WARNING" | "IMPORTANT" | "CAUTION";
  children: React.ReactNode;
}

function AlertBox({ type, children }: AlertBoxProps) {
  const meta = {
    NOTE: {
      border: "border-blue-500 bg-blue-50/75 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200",
      icon: Info,
      title: "Note",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    TIP: {
      border: "border-emerald-500 bg-emerald-50/75 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200",
      icon: Lightbulb,
      title: "Mains / Prelims Tip",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    WARNING: {
      border: "border-amber-500 bg-amber-50/75 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200",
      icon: AlertTriangle,
      title: "Prelims Trap Alert",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    IMPORTANT: {
      border: "border-purple-500 bg-purple-50/75 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200",
      icon: ShieldAlert,
      title: "Important Principle",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    CAUTION: {
      border: "border-rose-500 bg-rose-50/75 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200",
      icon: AlertTriangle,
      title: "Caution",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
  }[type];

  const Icon = meta.icon;

  return (
    <div
      className={`my-3.5 rounded-lg border-l-4 p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${meta.border}`}
    >
      <div className="flex items-center gap-2 font-semibold mb-1.5 uppercase tracking-wide text-[11px] sm:text-xs">
        <Icon className={`h-4 w-4 shrink-0 ${meta.iconColor}`} />
        <span>{meta.title}</span>
      </div>
      <div className="space-y-1.5 text-slate-800 dark:text-slate-200 [&_p]:my-1 font-normal">
        {children}
      </div>
    </div>
  );
}

/**
 * Diagram Card that tries to dynamically render with Mermaid.js,
 * or falls back to a clean native SVG/Tree diagram representation.
 */
function MermaidDiagram({ code }: { code: string }) {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let isMounted = true;
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Load mermaid script if not present
    const renderWithMermaid = () => {
      const w = window as any;
      if (w.mermaid) {
        try {
          w.mermaid.initialize({
            startOnLoad: false,
            theme: document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "default",
            flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis" },
          });
          const id = `mermaid_${Math.random().toString(36).slice(2, 9)}`;
          w.mermaid.render(id, cleanCode).then((res: any) => {
            if (isMounted && res?.svg) {
              setSvgHtml(res.svg);
              setHasError(false);
            }
          }).catch(() => {
            if (isMounted) setHasError(true);
          });
        } catch {
          if (isMounted) setHasError(true);
        }
      }
    };

    const existingScript = document.getElementById("mermaid-script");
    if (!(window as any).mermaid && !existingScript) {
      const script = document.createElement("script");
      script.id = "mermaid-script";
      script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
      script.onload = renderWithMermaid;
      script.onerror = () => {
        if (isMounted) setHasError(true);
      };
      document.head.appendChild(script);
    } else if ((window as any).mermaid) {
      renderWithMermaid();
    }

    return () => {
      isMounted = false;
    };
  }, [code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fallback native node parser for flowcharts (e.g. A["Text"] --> B["Text"])
  const parsedFlowNodes = useMemo(() => {
    const lines = code.split("\n");
    const connections: Array<{ from: string; to: string; text?: string }> = [];
    const nodeLabels = new Map<string, string>();

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("flowchart") || line.startsWith("graph")) continue;

      const linkMatch = line.match(/([a-zA-Z0-9_-]+)(?:\["([^"]+)"\])?\s*-->\s*([a-zA-Z0-9_-]+)(?:\["([^"]+)"\])?/);
      if (linkMatch) {
        const fromId = linkMatch[1];
        const fromLabel = linkMatch[2] || fromId;
        const toId = linkMatch[3];
        const toLabel = linkMatch[4] || toId;

        nodeLabels.set(fromId, fromLabel.replace(/<br\s*\/?>/gi, " • "));
        nodeLabels.set(toId, toLabel.replace(/<br\s*\/?>/gi, " • "));
        connections.push({ from: fromId, to: toId });
      }
    }
    return { connections, nodeLabels };
  }, [code]);

  return (
    <div className="my-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/50 to-white dark:from-slate-900 dark:to-slate-950 p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-100 dark:border-indigo-950">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
            Interactive Visual Flowchart
          </span>
        </div>
        <div className="flex items-center gap-2">
          {svgHtml && !hasError && (
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setIsExpanded(true);
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900"
              title="Expand flowchart fullscreen"
            >
              <Maximize2 className="h-3 w-3" />
              <span>Expand</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            {showRaw ? "Show Visual" : "View Source"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {showRaw ? (
        <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre">
          {code}
        </pre>
      ) : svgHtml && !hasError ? (
        <div
          onClick={() => {
            setZoom(1);
            setIsExpanded(true);
          }}
          className="mermaid-render overflow-x-auto py-2 flex justify-center [&_svg]:max-w-full [&_svg]:h-auto cursor-zoom-in hover:opacity-95 transition-opacity"
          title="Click to view full-size flowchart"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      ) : (
        /* Native Fallback Node Visualizer */
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {Array.from(parsedFlowNodes.nodeLabels.entries()).map(([id, label]) => (
              <div
                key={id}
                className="p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 shadow-2xs text-xs"
              >
                <div className="font-mono text-[10px] text-indigo-500 font-bold uppercase tracking-wider mb-0.5">
                  Node [{id}]
                </div>
                <div className="font-medium text-slate-800 dark:text-slate-200 leading-snug">
                  {label}
                </div>
              </div>
            ))}
          </div>
          {parsedFlowNodes.connections.length > 0 && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
              {parsedFlowNodes.connections.map((c, i) => (
                <span key={i} className="inline-block mr-3">
                  {c.from} ➔ {c.to}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Expandable Lightbox Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-6 backdrop-blur-xs">
          <div className="relative w-full max-w-6xl h-[88vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Expanded UPSC Flowchart / Mindmap
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                    title="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="px-2 font-mono font-semibold text-xs text-slate-700 dark:text-slate-200 min-w-[50px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(1))))}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                    title="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
                    title="Reset zoom"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy Source"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Close (ESC)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Canvas */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-100/60 dark:bg-slate-950/40">
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: "transform 0.12s ease-out",
                }}
                className="max-w-full flex justify-center [&_svg]:max-w-none [&_svg]:h-auto shadow-sm"
                dangerouslySetInnerHTML={{ __html: svgHtml || "" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Unescapes literal backslash sequences often returned by LLM APIs
 * (\n, \r\n, \", \t) into real whitespace and formatting.
 */
export function cleanMarkdownContent(raw: string): string {
  if (!raw) return "";
  let text = raw;
  if (text.includes("\\n")) {
    text = text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
  }
  if (text.includes("\\r")) {
    text = text.replace(/\\r/g, "\n");
  }
  if (text.includes("\\t")) {
    text = text.replace(/\\t/g, "  ");
  }
  if (text.includes('\\"')) {
    text = text.replace(/\\"/g, '"');
  }
  return text;
}

/**
 * Custom High-Performance Markdown Section Parser.
 * Handles headings, tables, block alerts (> [!TIP]), code blocks, and lists.
 */
export function RevisionMarkdownRenderer({
  content,
  className = "",
}: RevisionMarkdownRendererProps) {
  const blocks = useMemo(() => {
    if (!content) return [];
    const sanitized = cleanMarkdownContent(content);
    const lines = sanitized.split("\n");
    const result: Array<{
      type: "p" | "h1" | "h2" | "h3" | "h4" | "hr" | "ul" | "ol" | "table" | "mermaid" | "code" | "alert";
      text?: string;
      items?: string[];
      tableData?: { headers: string[]; rows: string[][] };
      codeData?: { lang: string; code: string };
      alertType?: "NOTE" | "TIP" | "WARNING" | "IMPORTANT" | "CAUTION";
    }> = [];

    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      // Horizontal Rules (---, ***, ___)
      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        result.push({ type: "hr" });
        index++;
        continue;
      }

      // 1. Mermaid Code Block
      if (trimmed.startsWith("```mermaid")) {
        const codeLines: string[] = [];
        index++;
        while (index < lines.length && !lines[index].trim().startsWith("```")) {
          codeLines.push(lines[index]);
          index++;
        }
        index++; // skip closing ```
        result.push({
          type: "mermaid",
          codeData: { lang: "mermaid", code: codeLines.join("\n") },
        });
        continue;
      }

      // 2. Generic Code Block
      if (trimmed.startsWith("```")) {
        const lang = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        index++;
        while (index < lines.length && !lines[index].trim().startsWith("```")) {
          codeLines.push(lines[index]);
          index++;
        }
        index++;
        result.push({
          type: "code",
          codeData: { lang, code: codeLines.join("\n") },
        });
        continue;
      }

      // 3. GitHub Alerts (> [!NOTE], > [!TIP], or standalone [!TIP])
      const alertMatch = trimmed.match(/^>?\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*(.*)$/i);
      if (alertMatch) {
        const alertType = alertMatch[1].toUpperCase() as any;
        const alertLines: string[] = [];
        if (alertMatch[2]) alertLines.push(alertMatch[2]);
        index++;
        while (index < lines.length && (lines[index].trim().startsWith(">") || (lines[index].trim() && !lines[index].trim().startsWith("#") && !lines[index].trim().startsWith("```")))) {
          const l = lines[index].trim().replace(/^>\s?/, "");
          // stop if we hit another header or section
          if (l.startsWith("###") || l.startsWith("##") || l.startsWith("#") || l.startsWith("---")) break;
          alertLines.push(l);
          index++;
        }
        result.push({
          type: "alert",
          alertType,
          text: alertLines.join("\n"),
        });
        continue;
      }

      // 4. Headings
      if (trimmed.startsWith("# ")) {
        result.push({ type: "h1", text: trimmed.slice(2).trim() });
        index++;
        continue;
      }
      if (trimmed.startsWith("## ")) {
        result.push({ type: "h2", text: trimmed.slice(3).trim() });
        index++;
        continue;
      }
      if (trimmed.startsWith("### ")) {
        result.push({ type: "h3", text: trimmed.slice(4).trim() });
        index++;
        continue;
      }
      if (trimmed.startsWith("#### ")) {
        result.push({ type: "h4", text: trimmed.slice(5).trim() });
        index++;
        continue;
      }

      // 5. Tables (| Column 1 | Column 2 |)
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const tableLines: string[] = [];
        while (index < lines.length && lines[index].trim().startsWith("|") && lines[index].trim().endsWith("|")) {
          tableLines.push(lines[index].trim());
          index++;
        }
        if (tableLines.length >= 2) {
          const parseRow = (r: string) =>
            r
              .slice(1, -1)
              .split("|")
              .map((c) => c.trim());
          const headers = parseRow(tableLines[0]);
          const rows = tableLines.slice(2).map(parseRow);
          result.push({
            type: "table",
            tableData: { headers, rows },
          });
          continue;
        }
      }

      // 6. Bullet lists (- Item, * Item)
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items: string[] = [];
        while (index < lines.length && (lines[index].trim().startsWith("- ") || lines[index].trim().startsWith("* "))) {
          items.push(lines[index].trim().slice(2).trim());
          index++;
        }
        result.push({ type: "ul", items });
        continue;
      }

      // 7. Numbered lists (1. Item)
      if (/^\d+\.\s+/.test(trimmed)) {
        const items: string[] = [];
        while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
          items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
          index++;
        }
        result.push({ type: "ol", items });
        continue;
      }

      // 8. Paragraphs
      if (trimmed.length > 0) {
        result.push({ type: "p", text: trimmed });
      }
      index++;
    }

    return result;
  }, [content]);

  // Inline formatter helper (bold, italic, code)
  const renderInline = (rawText: string) => {
    // Strip accidental leading # or ### in inline text
    const text = rawText.replace(/^#{1,4}\s+/, "");
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong key={match.index} className="font-semibold text-slate-900 dark:text-white">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-mono text-[0.88em]"
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith("*") && token.endsWith("*")) {
        parts.push(
          <em key={match.index} className="italic">
            {token.slice(1, -1)}
          </em>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`space-y-3 text-slate-800 dark:text-slate-200 text-sm leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === "hr") {
          return <hr key={idx} className="my-4 border-slate-200 dark:border-slate-800" />;
        }
        if (block.type === "h1") {
          return (
            <h1
              key={idx}
              className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight pb-2 border-b border-slate-200 dark:border-slate-800 mt-4 first:mt-0 flex items-center gap-2"
            >
              {renderInline(block.text || "")}
            </h1>
          );
        }
        if (block.type === "h2") {
          return (
            <h2
              key={idx}
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-4 pt-1 flex items-center gap-2"
            >
              {renderInline(block.text || "")}
            </h2>
          );
        }
        if (block.type === "h3") {
          return (
            <h3
              key={idx}
              className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 mt-3 pt-0.5"
            >
              {renderInline(block.text || "")}
            </h3>
          );
        }
        if (block.type === "h4") {
          return (
            <h4
              key={idx}
              className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2.5 pt-0.5"
            >
              {renderInline(block.text || "")}
            </h4>
          );
        }
        if (block.type === "p") {
          return (
            <p key={idx} className="my-1.5 text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {renderInline(block.text || "")}
            </p>
          );
        }
        if (block.type === "alert") {
          return (
            <AlertBox key={idx} type={block.alertType || "NOTE"}>
              {renderInline(block.text || "")}
            </AlertBox>
          );
        }
        if (block.type === "mermaid" && block.codeData) {
          return <MermaidDiagram key={idx} code={block.codeData.code} />;
        }
        if (block.type === "code" && block.codeData) {
          return (
            <div key={idx} className="my-2.5 rounded-lg bg-slate-900 text-slate-100 p-3 overflow-x-auto text-xs font-mono">
              <pre>{block.codeData.code}</pre>
            </div>
          );
        }
        if (block.type === "table" && block.tableData) {
          return (
            <div key={idx} className="my-3.5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                    {block.tableData.headers.map((h, hIdx) => (
                      <th key={hIdx} className="p-2.5 font-bold text-slate-900 dark:text-white">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {block.tableData.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-900/50"}
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 text-slate-700 dark:text-slate-300">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === "ul" && block.items) {
          return (
            <ul key={idx} className="my-2 space-y-1 pl-5 list-disc text-slate-700 dark:text-slate-300">
              {block.items.map((it, itIdx) => (
                <li key={itIdx} className="leading-relaxed">
                  {renderInline(it)}
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol" && block.items) {
          return (
            <ol key={idx} className="my-2 space-y-1 pl-5 list-decimal text-slate-700 dark:text-slate-300">
              {block.items.map((it, itIdx) => (
                <li key={itIdx} className="leading-relaxed">
                  {renderInline(it)}
                </li>
              ))}
            </ol>
          );
        }
        return null;
      })}
    </div>
  );
}

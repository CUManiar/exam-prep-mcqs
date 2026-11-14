"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Info,
  Layers,
  Lightbulb,
  Maximize2,
  RotateCcw,
  ShieldAlert,
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
      border:
        "border-blue-500 bg-blue-50/75 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200",
      icon: Info,
      title: "Note",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    TIP: {
      border:
        "border-emerald-500 bg-emerald-50/75 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200",
      icon: Lightbulb,
      title: "Mains / Prelims Tip",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    WARNING: {
      border:
        "border-amber-500 bg-amber-50/75 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200",
      icon: AlertTriangle,
      title: "Prelims Trap Alert",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    IMPORTANT: {
      border:
        "border-purple-500 bg-purple-50/75 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200",
      icon: ShieldAlert,
      title: "Important Principle",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    CAUTION: {
      border:
        "border-rose-500 bg-rose-50/75 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200",
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
 * Automatically sanitizes and repairs common LLM Mermaid syntax flaws:
 * - Missing flowchart/graph declaration
 * - Unquoted parentheses or special characters inside node labels (e.g., A[Text (1976)] -> A["Text (1976)"])
 * - Unescaped double quotes inside quoted labels (e.g., A["The "Why" Context"] -> A["The 'Why' Context"])
 * - Unquoted subgraph headers with spaces/colons
 * - Unquoted link text: A -- text --> B -> A -->|"text"| B
 * - Trailing semicolons on diagram headers
 */
function sanitizeMermaidCode(raw: string): string {
  if (!raw) return "";
  const lines = raw.trim().split("\n");
  if (!lines.length) return "";

  // 1. Ensure a valid diagram header is present
  const first = lines[0].trim();
  const validHeaders = [
    "flowchart",
    "graph",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "erDiagram",
    "gantt",
    "pie",
    "journey",
    "gitGraph",
    "mindmap",
    "timeline",
  ];
  if (!validHeaders.some((h) => first.startsWith(h))) {
    lines.unshift("flowchart TD");
  }

  // 2. Sanitize line-by-line
  const sanitizedLines = lines.map((rawLine) => {
    let line = rawLine.trim();
    if (!line || line.startsWith("%%")) return line;

    // Strip trailing semicolons on header lines (e.g. "graph TD;" -> "graph TD")
    line = line.replace(/^(graph|flowchart)\s+[A-Za-z]+;+$/, (m) =>
      m.replace(/;+$/, ""),
    );

    // Strip markdown bold / italics inside labels
    line = line.replace(/\*\*([^*]+?)\*\*/g, "$1");
    line = line.replace(/(?<!\\)_([^_]+?)_/g, "$1");

    // Fix subgraphs with invalid titles: e.g. "subgraph Part IVA: Fundamental Duties" -> "subgraph sg1 ["Part IVA: Fundamental Duties"]"
    if (line.startsWith("subgraph ")) {
      const subTitle = line.replace(/^subgraph\s+/, "").trim();
      if (subTitle && !subTitle.includes("[") && subTitle !== "end") {
        const cleanSub = subTitle.replace(/"/g, "'");
        const safeId = "sg_" + Math.random().toString(36).slice(2, 6);
        return `subgraph ${safeId} ["${cleanSub}"]`;
      }
    }

    // Fix unquoted link labels: A -- Some link text --> B -> A -->|"Some link text"| B
    line = line.replace(
      /--\s+([^->|]+?)\s+-->/g,
      (_, text) => `-->|"${text.replace(/"/g, "'").trim()}"|`,
    );

    // Auto-quote unquoted square brackets: A[Text with (parens) and "quotes"] -> A["Text with (parens) and 'quotes'"]
    line = line.replace(
      /([a-zA-Z0-9_-]+)\[(?!")([^\]]+?)\]/g,
      (_, id, content) => {
        const clean = content.replace(/"/g, "'").trim();
        return `${id}["${clean}"]`;
      },
    );

    // Auto-quote unquoted round brackets/parens: A(Text with "quotes") -> A("Text with 'quotes'")
    line = line.replace(
      /([a-zA-Z0-9_-]+)\((?!")([^)]+?)\)/g,
      (_, id, content) => {
        const clean = content.replace(/"/g, "'").trim();
        return `${id}("${clean}")`;
      },
    );

    // Auto-quote unquoted curly braces: A{Text?} -> A{"Text?"}
    line = line.replace(
      /([a-zA-Z0-9_-]+)\{(?!")([^}]+?)\}/g,
      (_, id, content) => {
        const clean = content.replace(/"/g, "'").trim();
        return `${id}{"${clean}"}`;
      },
    );

    // If node already has quotes with nested inner quotes: A["Text with "inner" quotes"]
    line = line.replace(/\["([^"]*?"[^"]*?)"\]/g, (_, inner) => {
      const clean = inner.replace(/"/g, "'");
      return `["${clean}"]`;
    });

    return line;
  });

  return sanitizedLines.join("\n");
}

/**
 * Intelligent fallback parser for Mermaid flowcharts:
 * Extracts node IDs and labels across all syntax shapes ([...], (...), {...})
 */
function parseMermaidFallback(code: string) {
  const lines = code.split("\n");
  const connections: Array<{ from: string; to: string; text?: string }> = [];
  const nodeLabels = new Map<string, string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (
      !line ||
      line.startsWith("flowchart") ||
      line.startsWith("graph") ||
      line.startsWith("%%") ||
      line.startsWith("subgraph") ||
      line === "end"
    ) {
      continue;
    }

    // 1. Extract any node definitions with labels on this line
    const nodeDefRegex =
      /([a-zA-Z0-9_-]+)(?:\["([^"]+)"\]|\[([^\]]+)\]|\("([^"]+)"\)|\(([^)]+)\)|\{"([^"]+)"\}|\{([^}]+)\})/g;
    let match: RegExpExecArray | null;
    while ((match = nodeDefRegex.exec(line)) !== null) {
      const id = match[1];
      const label =
        match[2] ||
        match[3] ||
        match[4] ||
        match[5] ||
        match[6] ||
        match[7] ||
        id;
      nodeLabels.set(
        id,
        label.replace(/<br\s*\/?>/gi, " • ").replace(/&quot;/g, '"'),
      );
    }

    // 2. Extract connections: A --> B, A -->|text| B, A --- B, A ==> B
    const arrowMatch = line.match(
      /([a-zA-Z0-9_-]+)\s*(?:-->|==>|---|---\s*\|[^|]+\|\s*|-->\s*\|([^|]+)\|\s*|-\.->)\s*([a-zA-Z0-9_-]+)/,
    );
    if (arrowMatch) {
      const from = arrowMatch[1];
      const linkText = arrowMatch[2]?.trim();
      const to = arrowMatch[3];
      if (!nodeLabels.has(from)) nodeLabels.set(from, from);
      if (!nodeLabels.has(to)) nodeLabels.set(to, to);
      connections.push({ from, to, text: linkText });
    }
  }

  return { connections, nodeLabels };
}

/**
 * Diagram Card that dynamically renders with Mermaid.js,
 * with automatic syntax self-healing and rich fallback representation.
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
      if (!w.mermaid) return;

      try {
        w.mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          parseError: () => {}, // Suppress Mermaid's default error DOM injection
          theme:
            document.documentElement.getAttribute("data-theme") === "dark"
              ? "dark"
              : "default",
          flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis" },
          securityLevel: "loose",
        });

        const id = `mermaid_${Math.random().toString(36).slice(2, 9)}`;
        const sanitizedCode = sanitizeMermaidCode(cleanCode);

        // Pre-parse the code first: if parsing fails, NEVER call render() so Mermaid never injects the bomb icon
        w.mermaid
          .parse(sanitizedCode, { suppressErrors: true })
          .then(() => {
            return w.mermaid.render(id, sanitizedCode);
          })
          .then((res: any) => {
            if (isMounted && res?.svg) {
              setSvgHtml(res.svg);
              setHasError(false);
            }
          })
          .catch((err: any) => {
            console.warn("Mermaid validation/render error:", err);
            // Clean up any stray error element that Mermaid might have inserted into document.body
            document
              .querySelectorAll(
                '[id^="dmermaid"], svg[aria-roledescription="error"], .error-icon',
              )
              .forEach((el) => {
                if (el.parentElement === document.body) el.remove();
              });
            if (isMounted) setHasError(true);
          });
      } catch (err) {
        console.warn("Mermaid initialization error:", err);
        if (isMounted) setHasError(true);
      }
    };

    const existingScript = document.getElementById(
      "mermaid-script",
    ) as HTMLScriptElement | null;

    if (!(window as any).mermaid && !existingScript) {
      const script = document.createElement("script");
      script.id = "mermaid-script";
      script.src =
        "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
      script.crossOrigin = "anonymous";
      script.onload = () => {
        renderWithMermaid();
      };
      script.onerror = () => {
        if (isMounted) setHasError(true);
      };
      document.head.appendChild(script);
    } else if ((window as any).mermaid) {
      renderWithMermaid();
    } else if (existingScript) {
      // Script is already in DOM and loading
      existingScript.addEventListener("load", renderWithMermaid);
      const timer = setInterval(() => {
        if ((window as any).mermaid) {
          clearInterval(timer);
          renderWithMermaid();
        }
      }, 150);
      return () => {
        clearInterval(timer);
        existingScript.removeEventListener("load", renderWithMermaid);
        isMounted = false;
      };
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

  const parsedFlowNodes = useMemo(() => {
    return parseMermaidFallback(code);
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
            {copied ? (
              <Check className="h-3 w-3 text-emerald-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
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
          {parsedFlowNodes.nodeLabels.size > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {Array.from(parsedFlowNodes.nodeLabels.entries()).map(
                ([id, label], idx) => (
                  <div
                    key={id}
                    className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 shadow-2xs text-xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                        Step {idx + 1}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        [{id}]
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-[13px] leading-snug">
                      {label}
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre">
              {code}
            </pre>
          )}

          {parsedFlowNodes.connections.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                Flow:
              </span>
              {parsedFlowNodes.connections.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 font-medium bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs"
                >
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                    {c.from}
                  </span>
                  <span className="text-slate-400">➔</span>
                  {c.text && (
                    <span className="text-[10px] italic text-slate-500">
                      ({c.text})
                    </span>
                  )}
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                    {c.to}
                  </span>
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
                    onClick={() =>
                      setZoom((z) =>
                        Math.max(0.4, Number((z - 0.2).toFixed(1))),
                      )
                    }
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
                    onClick={() =>
                      setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(1))))
                    }
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
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
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

import { cleanMarkdownContent } from "../../lib/revisionAi";
import katex from "katex";
import "katex/dist/katex.min.css";
export { cleanMarkdownContent };

function renderKatexHtml(math: string, displayMode: boolean): string {
  try {
    return katex.renderToString(math.trim(), {
      displayMode,
      throwOnError: false,
    });
  } catch {
    return math;
  }
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
      type:
        | "p"
        | "h1"
        | "h2"
        | "h3"
        | "h4"
        | "hr"
        | "ul"
        | "ol"
        | "table"
        | "mermaid"
        | "code"
        | "alert"
        | "math";
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

      // 0. Standalone Math Block ($$ ... $$)
      if (trimmed.startsWith("$$")) {
        const mathLines: string[] = [];
        if (trimmed.length > 2 && trimmed.endsWith("$$") && trimmed !== "$$") {
          result.push({
            type: "math",
            text: trimmed.slice(2, -2).trim(),
          });
          index++;
          continue;
        }
        index++;
        while (index < lines.length && !lines[index].trim().startsWith("$$")) {
          mathLines.push(lines[index]);
          index++;
        }
        index++;
        result.push({
          type: "math",
          text: mathLines.join("\n"),
        });
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
      const alertMatch = trimmed.match(
        /^>?\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*(.*)$/i,
      );
      if (alertMatch) {
        const alertType = alertMatch[1].toUpperCase() as any;
        const alertLines: string[] = [];
        if (alertMatch[2]) alertLines.push(alertMatch[2]);
        index++;
        while (
          index < lines.length &&
          (lines[index].trim().startsWith(">") ||
            (lines[index].trim() &&
              !lines[index].trim().startsWith("#") &&
              !lines[index].trim().startsWith("```")))
        ) {
          const l = lines[index].trim().replace(/^>\s?/, "");
          // stop if we hit another header or section
          if (
            l.startsWith("###") ||
            l.startsWith("##") ||
            l.startsWith("#") ||
            l.startsWith("---")
          )
            break;
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
        while (
          index < lines.length &&
          lines[index].trim().startsWith("|") &&
          lines[index].trim().endsWith("|")
        ) {
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
        while (
          index < lines.length &&
          (lines[index].trim().startsWith("- ") ||
            lines[index].trim().startsWith("* "))
        ) {
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

  // Inline formatter helper (math, bold, italic, code, line breaks)
  const renderInline = (rawText: string) => {
    // Strip accidental leading # or ### in inline text
    const text = rawText.replace(/^#{1,4}\s+/, "");
    const parts: React.ReactNode[] = [];
    // Tokenizer matching display math, inline math, bold, code, italic, and HTML linebreaks
    const regex =
      /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\$\n]+?\$|\\\([\s\S]+?\\\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|<br\s*\/?>)/gi;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const token = match[0];

      // 1. Display Math ($$ ... $$ or \[ ... \])
      if (token.startsWith("$$") && token.endsWith("$$")) {
        const math = token.slice(2, -2);
        const html = renderKatexHtml(math, true);
        parts.push(
          <span
            key={`dm_${match.index}`}
            className="my-1.5 block text-center overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: html }}
          />,
        );
      } else if (token.startsWith("\\[") && token.endsWith("\\]")) {
        const math = token.slice(2, -2);
        const html = renderKatexHtml(math, true);
        parts.push(
          <span
            key={`dm2_${match.index}`}
            className="my-1.5 block text-center overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: html }}
          />,
        );
      }
      // 2. Inline Math ($ ... $ or \( ... \))
      else if (token.startsWith("$") && token.endsWith("$")) {
        const math = token.slice(1, -1);
        const html = renderKatexHtml(math, false);
        parts.push(
          <span
            key={`im_${match.index}`}
            className="inline-block px-0.5 align-baseline text-indigo-950 dark:text-indigo-200"
            dangerouslySetInnerHTML={{ __html: html }}
          />,
        );
      } else if (token.startsWith("\\(") && token.endsWith("\\)")) {
        const math = token.slice(2, -2);
        const html = renderKatexHtml(math, false);
        parts.push(
          <span
            key={`im2_${match.index}`}
            className="inline-block px-0.5 align-baseline text-indigo-950 dark:text-indigo-200"
            dangerouslySetInnerHTML={{ __html: html }}
          />,
        );
      }
      // 3. Bold (** ... **)
      else if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong
            key={match.index}
            className="font-semibold text-slate-900 dark:text-white"
          >
            {token.slice(2, -2)}
          </strong>,
        );
      }
      // 4. Code (` ... `)
      else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-mono text-[0.88em]"
          >
            {token.slice(1, -1)}
          </code>,
        );
      }
      // 5. Italic (* ... *)
      else if (token.startsWith("*") && token.endsWith("*")) {
        parts.push(
          <em key={match.index} className="italic">
            {token.slice(1, -1)}
          </em>,
        );
      }
      // 6. Linebreak (<br> / <br/>)
      else if (token.toLowerCase().startsWith("<br")) {
        parts.push(<br key={`br_${match.index}`} />);
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div
      className={`space-y-3 text-slate-800 dark:text-slate-200 text-sm leading-relaxed ${className}`}
    >
      {blocks.map((block, idx) => {
        if (block.type === "hr") {
          return (
            <hr
              key={idx}
              className="my-4 border-slate-200 dark:border-slate-800"
            />
          );
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
            <p
              key={idx}
              className="my-1.5 text-slate-700 dark:text-slate-300 leading-relaxed font-normal"
            >
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
        if (block.type === "math" && block.text) {
          const html = renderKatexHtml(block.text, true);
          return (
            <div
              key={idx}
              className="my-3 overflow-x-auto py-2 text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        if (block.type === "mermaid" && block.codeData) {
          return <MermaidDiagram key={idx} code={block.codeData.code} />;
        }
        if (block.type === "code" && block.codeData) {
          return (
            <div
              key={idx}
              className="my-2.5 rounded-lg bg-slate-900 text-slate-100 p-3 overflow-x-auto text-xs font-mono"
            >
              <pre>{block.codeData.code}</pre>
            </div>
          );
        }
        if (block.type === "table" && block.tableData) {
          return (
            <div
              key={idx}
              className="my-3.5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                    {block.tableData.headers.map((h, hIdx) => (
                      <th
                        key={hIdx}
                        className="p-2.5 font-bold text-slate-900 dark:text-white"
                      >
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {block.tableData.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={
                        rIdx % 2 === 0
                          ? "bg-white dark:bg-slate-900"
                          : "bg-slate-50/50 dark:bg-slate-900/50"
                      }
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="p-2.5 text-slate-700 dark:text-slate-300"
                        >
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
            <ul
              key={idx}
              className="my-2 space-y-1 pl-5 list-disc text-slate-700 dark:text-slate-300"
            >
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
            <ol
              key={idx}
              className="my-2 space-y-1 pl-5 list-decimal text-slate-700 dark:text-slate-300"
            >
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

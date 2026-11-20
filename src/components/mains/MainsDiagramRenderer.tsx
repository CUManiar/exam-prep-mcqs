"use client";

import React, { useState } from "react";
import {
  Workflow,
  ArrowRight,
  ArrowDown,
  GitBranch,
  Copy,
  Check,
  Eye,
  Code,
} from "lucide-react";

interface MainsDiagramRendererProps {
  diagramIdea?: string | null;
}

interface ParsedSequence {
  type: "sequence";
  nodes: string[];
}

interface ParsedBranching {
  type: "branching";
  root: string;
  branches: string[];
}

type ParsedDiagram = ParsedSequence | ParsedBranching;

function parseDiagram(raw?: string | null): ParsedDiagram | null {
  if (!raw || typeof raw !== "string") return null;

  // Clean code fences
  let trimmed = raw
    .replace(/^```[a-zA-Z0-9_-]*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();

  if (trimmed.length < 15) return null;
  const lower = trimmed.toLowerCase();
  if (
    [
      "null",
      "none",
      "n/a",
      "no diagram",
      "not applicable",
      "no diagram required",
      "nil",
    ].includes(lower)
  ) {
    return null;
  }

  // 1. Try linear sequence with arrow delimiters
  const arrowRegex = /\s*(?:-->|->|==>|➔|➜|→)\s*/g;
  if (arrowRegex.test(trimmed)) {
    const parts = trimmed
      .split(arrowRegex)
      .map((p) =>
        p
          .replace(/^\s*[-*•\d.)\][]+|\s*[\])]+$/g, "")
          .replace(/^[\[(]+|[\])]+$/g, "")
          .trim(),
      )
      .filter((p) => p.length > 0 && !p.startsWith("|"));

    if (parts.length >= 2) {
      return { type: "sequence", nodes: parts };
    }
  }

  // 2. Try multi-line tree or branching
  const lines = trimmed
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    const root = lines[0]
      .replace(/^[\[(]+|[\])]+$/g, "")
      .replace(/^(?:Central|Core|Theme|Topic|Concept):\s*/i, "")
      .trim();

    const branchLines = lines.slice(1);
    const branches = branchLines
      .map((l) =>
        l
          .replace(/^(?:\|?-+>|├──|└──|\|\s*-->?|\*|-|\d+\.)\s*/, "")
          .replace(/^[\[(]+|[\])]+$/g, "")
          .trim(),
      )
      .filter((b) => b.length > 0 && b !== root);

    if (branches.length >= 2 && root.length > 0) {
      return { type: "branching", root, branches };
    }
  }

  return null;
}

export function MainsDiagramRenderer({
  diagramIdea,
}: MainsDiagramRendererProps) {
  const [viewMode, setViewMode] = useState<"visual" | "schema">("visual");
  const [copied, setCopied] = useState(false);

  const parsed = parseDiagram(diagramIdea);
  if (!parsed || !diagramIdea) {
    // If no meaningful diagram was provided or parsed, refrain completely from showing
    return null;
  }

  const cleanSchema = diagramIdea
    .replace(/^```[a-zA-Z0-9_-]*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();

  const handleCopy = () => {
    void navigator.clipboard.writeText(cleanSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-4 sm:p-4.5 shadow-2xs space-y-3">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-indigo-600" />
          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Drawn Micro-Diagram (Examiner-Approved)
          </h5>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-800/60 text-[10px]">
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                viewMode === "visual"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Eye className="h-3 w-3" />
              <span>Visual Flow</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("schema")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                viewMode === "schema"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Code className="h-3 w-3" />
              <span>Schema</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer shadow-2xs"
            title="Copy schema to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copy Schema</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content: Visual vs Schema */}
      {viewMode === "visual" ? (
        <div className="space-y-3">
          {parsed.type === "sequence" && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-indigo-50/60 via-slate-50/70 to-indigo-50/60 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-indigo-950/20 border border-indigo-100/90 dark:border-indigo-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-2 sm:gap-3 flex-wrap">
                {parsed.nodes.map((node, index) => {
                  const isLast = index === parsed.nodes.length - 1;
                  return (
                    <React.Fragment key={index}>
                      <div className="flex items-center gap-2.5 rounded-xl border border-indigo-200/90 dark:border-indigo-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs transition-all hover:border-indigo-400">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-[10px] font-bold text-white shadow-2xs">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="leading-snug">{node}</span>
                      </div>

                      {!isLast && (
                        <div className="flex items-center justify-center shrink-0 py-0.5 sm:py-0 text-indigo-500 dark:text-indigo-400">
                          <ArrowRight className="hidden sm:block h-4 w-4" />
                          <ArrowDown className="sm:hidden h-3.5 w-3.5" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {parsed.type === "branching" && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-indigo-50/60 via-slate-50/70 to-indigo-50/60 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-indigo-950/20 border border-indigo-100/90 dark:border-indigo-900/40 space-y-3">
              {/* Root Node */}
              <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-600 text-white px-3.5 py-2 text-xs font-bold shadow-xs">
                <GitBranch className="h-4 w-4" />
                <span>{parsed.root}</span>
              </div>

              {/* Branches Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800 ml-4">
                {parsed.branches.map((branch, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-xl border border-indigo-200/90 dark:border-indigo-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 shadow-2xs"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="leading-snug">{branch}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              ✍️ Exam Sheet Implementation:
            </span>
            <span>
              Draw this clear micro-diagram in the margin or box for quick
              examiner recognition (+1 to +2 marks).
            </span>
          </div>
        </div>
      ) : (
        <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs whitespace-pre-wrap overflow-x-auto border border-slate-800 leading-relaxed">
          {cleanSchema}
        </pre>
      )}
    </div>
  );
}

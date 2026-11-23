"use client";

import { useState } from "react";
import {
  Compass,
  Copy,
  Check,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface SpatialMapCardProps {
  code: string;
  lang?: string;
}

export function SpatialMapCard({ code, lang = "map" }: SpatialMapCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);

  const isSvg =
    code.trim().startsWith("<svg") && code.trim().endsWith("</svg>");

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {lang === "svg"
              ? "Vector Diagram / Chart"
              : "Spatial Sketch & Geographic Map"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
            title="Copy Map Data"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="p-1 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
            title="Expand Fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 overflow-x-auto bg-slate-950 text-slate-100 flex justify-center items-center">
        {isSvg ? (
          <div
            className="max-w-full [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: code }}
          />
        ) : (
          <pre className="font-mono text-xs sm:text-[13px] leading-relaxed text-emerald-400 whitespace-pre">
            {code}
          </pre>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 sm:p-6">
          <div className="relative w-full max-w-4xl h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <Compass className="h-4 w-4 text-emerald-400" />
                <span>Spatial Map View</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
                  className="p-1.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
                  className="p-1.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded text-slate-400 hover:text-white"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-950">
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                className="max-w-full"
              >
                {isSvg ? (
                  <div dangerouslySetInnerHTML={{ __html: code }} />
                ) : (
                  <pre className="font-mono text-sm leading-relaxed text-emerald-400 whitespace-pre">
                    {code}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

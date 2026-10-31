"use client";

import React from "react";
import { FileUp } from "lucide-react";

interface AnswerKeyWidgetProps {
  mode: "paste" | "upload";
  onModeChange: (mode: "paste" | "upload") => void;
  textValue: string;
  onTextChange: (val: string) => void;
  fileValue: File | null;
  onFileChange: (file: File | null) => void;
  mappedCount: number;
}

export function AnswerKeyWidget({
  mode,
  onModeChange,
  textValue,
  onTextChange,
  fileValue,
  onFileChange,
  mappedCount,
}: AnswerKeyWidgetProps) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3 shadow-xs">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mr-1">
            <span className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[11px] font-bold border border-emerald-200">
              3
            </span>
            Answer Key & Explanations
          </span>

          <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => onModeChange("paste")}
              className={`cursor-pointer px-2.5 py-1 rounded-md transition-all ${
                mode === "paste"
                  ? "bg-white text-emerald-800 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Paste Key
            </button>
            <button
              type="button"
              onClick={() => onModeChange("upload")}
              className={`cursor-pointer px-2.5 py-1 rounded-md transition-all ${
                mode === "upload"
                  ? "bg-white text-emerald-800 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Upload .txt
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {mappedCount > 0 && (
            <span className="text-emerald-700 font-mono font-semibold">
              {mappedCount} answers mapped
            </span>
          )}
          <code className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            1. a &quot;&quot;&quot; explanation / HTML &quot;&quot;&quot;
          </code>
        </div>
      </div>

      {mode === "upload" ? (
        <label className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-3.5 text-xs font-semibold text-slate-700 hover:border-slate-500 shadow-2xs transition-colors">
          <FileUp className="h-4 w-4 text-slate-500" />
          <span>
            {fileValue ? fileValue.name : "Select .txt answer key file"}
          </span>
          <input
            type="file"
            accept=".txt"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
      ) : (
        <textarea
          value={textValue}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={`1. a,\n2. c """ Explanations can be enclosed in triple quotes (HTML tags like <b>, <ul> supported) """,\n3. d,\n4. b`}
          rows={4}
          className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-2xs leading-relaxed transition-colors"
        />
      )}
    </div>
  );
}

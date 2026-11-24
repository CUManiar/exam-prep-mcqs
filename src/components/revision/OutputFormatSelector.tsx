"use client";

import { ResponseFormat } from "../../lib/types";

interface OutputFormatSelectorProps {
  currentFormat: ResponseFormat;
  onSelectFormat: (format: ResponseFormat) => void;
  allowedFormats?: ResponseFormat[];
}

export const FORMAT_OPTIONS: Array<{
  id: ResponseFormat;
  label: string;
  icon: string;
  desc: string;
}> = [
  {
    id: "crisp_notes",
    label: "Crisp Notes",
    icon: "📋",
    desc: "Bullet points & tables",
  },
  {
    id: "mains_blueprint",
    label: "Mains Blueprint",
    icon: "🏛️",
    desc: "Intro, body & case laws",
  },
  {
    id: "prelims_drill",
    label: "Trap Drill",
    icon: "🎯",
    desc: "Statement MCQs & traps",
  },
  {
    id: "mermaid_map",
    label: "Mindmap",
    icon: "📊",
    desc: "Mermaid visual flowchart",
  },
  {
    id: "first_principles",
    label: "First Principles",
    icon: "💡",
    desc: "Analogy & intuition",
  },
];

export function OutputFormatSelector({
  currentFormat,
  onSelectFormat,
  allowedFormats,
}: OutputFormatSelectorProps) {
  const options = allowedFormats
    ? FORMAT_OPTIONS.filter((opt) => allowedFormats.includes(opt.id))
    : FORMAT_OPTIONS;

  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-0.5">
      <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-0.5">
        Format:
      </span>
      {options.map((opt) => {
        const isActive = currentFormat === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectFormat(opt.id)}
            title={opt.desc}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-all shrink-0 cursor-pointer ${
              isActive
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs font-semibold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

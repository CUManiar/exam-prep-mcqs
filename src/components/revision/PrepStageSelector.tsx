"use client";

import { Info, Sparkles, CheckCircle2 } from "lucide-react";
import { PrepStage } from "../../lib/types";
import { UPSC_OPTIONAL_SUBJECTS } from "../../lib/optionalSubjects";

interface StageMetadata {
  id: PrepStage;
  label: string;
  badge: string;
  icon: string;
  valueProvided: string;
  whenToUse: string;
  proTip: string;
}

export const STAGE_METADATA: Record<PrepStage, StageMetadata> = {
  prelims: {
    id: "prelims",
    label: "Prelims Elimination",
    badge: "GS Paper-I Strategy",
    icon: "🎯",
    valueProvided:
      "Line-by-line statement trap deconstruction. Flags extreme qualifiers (only, all, always, solely) vs nuanced qualifiers (can, may, generally), and calibrates risk against the 1/3rd negative marking penalty.",
    whenToUse:
      "When solving test papers, analyzing past wrong attempts, or untangling questions where you are stuck in a 50:50 dilemma between two close options.",
    proTip:
      "Generates authentic 'How many statements are correct?' trap drills with elimination rationales.",
  },

  mains: {
    id: "mains",
    label: "Mains Answer",
    badge: "GS-I to GS-IV Blueprints",
    icon: "✍️",
    valueProvided:
      "Structures high-scoring 10-Mark (150 words) and 15-Mark (250 words) model blueprints: punchy constitutional/data introductions, multi-dimensional PESTLE headings, landmark Supreme Court cases, and forward-looking conclusions.",
    whenToUse:
      "When practicing daily answer writing, transforming editorial debates into exam-ready points, or structuring multi-dimensional policy arguments.",
    proTip:
      "Includes committee recommendations (Sarkaria, Punchhi, Kelkar) and diagram suggestions for maximum marks.",
  },

  optional: {
    id: "optional",
    label: "Optional Subject",
    badge: "Scholarly Paper I & II",
    icon: "🎓",
    valueProvided:
      "Injects university-grade scholarly depth, seminal academic theorists, and discipline-specific paradigms across 25+ optionals, bridging Paper-I theoretical frameworks directly to Paper-II contemporary Indian case studies.",
    whenToUse:
      "When revising your specific Optional paper where standard General Studies answers fail to achieve competitive 280+ score marks.",
    proTip:
      "Select your exact subject from the dropdown to activate tailored scholar personas.",
  },

  csat: {
    id: "csat",
    label: "CSAT Speed & Logic",
    badge: "Paper-II Qualifying",
    icon: "⚡",
    valueProvided:
      "Delivers 30-second speed calculation shortcuts, standard LaTeX mathematical formula derivations, option elimination by parity/unit-digits, and step-by-step reasoning.",
    whenToUse:
      "When tackling Permutations & Combinations, Probability, Number Systems, Time & Work, or securing the statutory 33.3% (66.67 marks) cutoff.",
    proTip:
      "Formats all math in clean LaTeX equations with quick-solve hacks alongside textbook methods.",
  },

  concept: {
    id: "concept",
    label: "First-Principles AI",
    badge: "Zero-Textbook Partner",
    icon: "💡",
    valueProvided:
      "Zero-jargon conceptual scaffolding for aspirants who haven't read 800-page standard textbooks page by page. Explains complex systems using intuitive real-world analogies, mechanical operational flows, and comprehension checks.",
    whenToUse:
      "When a topic feels intimidating, abstract, or overly dense, or when starting a fresh syllabus topic without prior background reading.",
    proTip:
      "Breaks concepts into 4 steps: Everyday Analogy ➔ Moving Parts ➔ UPSC Tension ➔ Quick Self-Check Quiz.",
  },
};

interface PrepStageSelectorProps {
  currentStage: PrepStage;
  onSelectStage: (stage: PrepStage) => void;
  selectedOptional?: string;
  onSelectOptional?: (optional: string) => void;
  mistakeCount?: number;
  isMistakesOpen?: boolean;
  onToggleMistakes?: () => void;
}

export function PrepStageSelector({
  currentStage,
  onSelectStage,
  selectedOptional = "Political Science & International Relations (PSIR)",
  onSelectOptional,
  mistakeCount,
  isMistakesOpen,
  onToggleMistakes,
}: PrepStageSelectorProps) {
  const stages: PrepStage[] = [
    "prelims",
    "mains",
    "optional",
    "csat",
    "concept",
  ];

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
        {stages.map((stg, index) => {
          const cfg = STAGE_METADATA[stg];
          const isActive = currentStage === stg;
          const mobileLabel =
            stg === "prelims"
              ? "Prelims"
              : stg === "mains"
                ? "Mains"
                : stg === "optional"
                  ? "Optional"
                  : stg === "csat"
                    ? "CSAT"
                    : "Concept";
          // Determine edge-safe popover and arrow alignment to prevent viewport clipping
          const isFirst = index === 0;
          const isLast = index >= stages.length - 2;
          const popoverPosClass = isFirst
            ? "left-0 sm:left-0 sm:translate-x-0"
            : isLast
              ? "right-0 sm:right-0 sm:left-auto sm:translate-x-0"
              : "left-0 sm:left-1/2 sm:-translate-x-1/2";
          const arrowPosClass = isFirst
            ? "left-6 sm:left-6 sm:translate-x-0"
            : isLast
              ? "right-6 sm:right-6 sm:left-auto sm:translate-x-0"
              : "left-6 sm:left-1/2 sm:-translate-x-1/2";

          return (
            <div key={stg} className="relative group">
              <button
                type="button"
                onClick={() => onSelectStage(stg)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{cfg.icon}</span>
                <span className="hidden sm:inline">{cfg.label}</span>
                <span className="sm:hidden">{mobileLabel}</span>
              </button>

              {/* ── Hover Popover (Value Provided & When To Use) ── */}
              <div
                className={`pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 ease-out absolute z-50 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-slate-900/95 text-slate-100 p-4 shadow-2xl backdrop-blur-md border border-slate-800 text-xs ${popoverPosClass}`}
              >
                {/* Arrow */}
                <div
                  className={`absolute -top-1.5 w-3 h-3 bg-slate-900 border-t border-l border-slate-800 rotate-45 ${arrowPosClass}`}
                />

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>{cfg.icon}</span>
                      <span>{cfg.label}</span>
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                      {cfg.badge}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      💡 What Value It Provides
                    </span>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {cfg.valueProvided}
                    </p>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                      🎯 When To Use It
                    </span>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {cfg.whenToUse}
                    </p>
                  </div>

                  <div className="pt-1.5 flex items-start gap-1.5 text-[10.5px] text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400" />
                    <span>{cfg.proTip}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {mistakeCount !== undefined && mistakeCount > 0 && onToggleMistakes && (
          <div className="hidden sm:block relative group pl-1 border-l border-slate-200 dark:border-slate-700/80">
            <button
              type="button"
              onClick={onToggleMistakes}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isMistakesOpen
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              }`}
              title="Toggle Weak Spots Diagnostics"
              aria-expanded={isMistakesOpen}
            >
              <span>🔥</span>
              <span className="hidden sm:inline">Weak Spots</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isMistakesOpen
                    ? "bg-rose-700 text-white"
                    : "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300"
                }`}
              >
                {mistakeCount}
              </span>
            </button>

            {/* Hover Popover */}
            <div className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 ease-out absolute z-50 top-full mt-2 right-0 w-72 sm:w-80 rounded-2xl bg-slate-900/95 text-slate-100 p-4 shadow-2xl backdrop-blur-md border border-slate-800 text-xs">
              <div className="absolute -top-1.5 right-6 w-3 h-3 bg-slate-900 border-t border-l border-slate-800 rotate-45" />

              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>🔥</span>
                    <span>Mistake Diagnostics</span>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                    {mistakeCount} Weak Spots
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    💡 What Value It Provides
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Maps questions you answered incorrectly across mock tests
                    and PYQs directly to their underlying syllabus concepts,
                    categorizing them by root causes so you stop repeating the
                    same traps.
                  </p>
                </div>

                <div className="pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                    🎯 When To Use It
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isMistakesOpen
                      ? "Currently open. Click to collapse and focus entirely on chat."
                      : "Click to expand your weakness clusters and drill concepts with AI to recover forfeited marks."}
                  </p>
                </div>

                <div className="pt-1.5 flex items-start gap-1.5 text-[10.5px] text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400" />
                  <span>
                    Click anytime to toggle open or collapsed without leaving
                    your chat.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {currentStage === "optional" && onSelectOptional && (
        <div className="flex items-center gap-1.5">
          <select
            value={selectedOptional}
            onChange={(e) => onSelectOptional(e.target.value)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
          >
            {UPSC_OPTIONAL_SUBJECTS.map((subj) => (
              <option
                key={subj}
                value={subj}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                {subj}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

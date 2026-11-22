"use client";

import { useState } from "react";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";

interface FirstPrinciplesGuideCardProps {
  onSelectPrompt: (prompt: string) => void;
}

export function FirstPrinciplesGuideCard({
  onSelectPrompt,
}: FirstPrinciplesGuideCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const samplePrompts = [
    {
      title: "Monetary Policy & Inflation Targeting",
      prompt:
        "Explain the Monetary Policy Committee (MPC) and Inflation Targeting from absolute first principles using everyday household budget analogies, with zero economics jargon.",
    },
    {
      title: "Governor's Assent & Art. 200/201",
      prompt:
        "Why was the Governor given discretionary veto powers under Article 200? Explain the constitutional mechanics and why federal conflicts arise, using a simple real-world analogy.",
    },
    {
      title: "Basic Structure Doctrine",
      prompt:
        "Explain the Basic Structure doctrine from first principles: what crisis caused it, how it balances Parliament vs Judiciary, and ask me a self-check question at the end.",
    },
    {
      title: "Fiscal vs Primary Deficit",
      prompt:
        "Break down the difference between Fiscal Deficit and Primary Deficit using a simple salary-and-credit-card analogy, and explain why UPSC tests it.",
    },
  ];

  return (
    <div className="rounded-2xl border border-amber-200/90 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 sm:p-5 shadow-sm space-y-3.5 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                First-Principles AI Partner
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                Zero-Textbook Scaffold
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Haven't read 800-page books cover to cover? Learn concepts by
              understanding <em>why</em> they exist and <em>how</em> they work.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isExpanded ? "Collapse Guide" : "Expand Guide"}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3.5 pt-1 border-t border-amber-200/60 dark:border-amber-900/40 text-xs">
          {/* 4-Phase Learning Framework */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-950 space-y-1">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                1. Real Analogy
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Demystifies the concept with everyday real-world metaphors —
                zero initial jargon.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-950 space-y-1">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                2. System Mechanics
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Explains the moving parts: what problem India solved by creating
                this body or rule.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-950 space-y-1">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                3. UPSC Tension
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Identifies the exact friction point tested in Prelims traps or
                Mains debates.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-950 space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                4. Checkpoint Quiz
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                AI asks you a single interactive question to verify your
                intuitive grasp.
              </p>
            </div>
          </div>

          {/* Prompting Tips & Sample Chips */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <span>Try a First-Principles Concept Drill:</span>
              <span className="text-amber-700 dark:text-amber-300 font-normal">
                Click any prompt to ask
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {samplePrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectPrompt(item.prompt)}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-900/50 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-xs transition-all text-left flex items-start justify-between gap-2 group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 block">
                      {item.title}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.prompt}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-amber-500 mt-1 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

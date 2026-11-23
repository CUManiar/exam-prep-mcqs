"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Brain,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Flame,
  Info,
  Lightbulb,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { PrepStage, ResponseFormat } from "../../lib/types";
import { STAGE_METADATA } from "../revision/PrepStageSelector";

interface ShowcaseScenario {
  stage: PrepStage;
  format: ResponseFormat;
  userPrompt: string;
  topicBadge: string;
  assistantSummary: string;
  assistantContent: React.ReactNode;
}

const SHOWCASE_SCENARIOS: Record<PrepStage, ShowcaseScenario> = {
  prelims: {
    stage: "prelims",
    format: "prelims_drill",
    userPrompt:
      "Dissect the elimination traps in Article 200 (Governor's assent to state bills) and generate a UPSC-style statement trap drill.",
    topicBadge: "Polity & Governance · Prelims GS-1",
    assistantSummary:
      "Line-by-line trap identification and elimination rationale",
    assistantContent: (
      <div className="space-y-3 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
        <div className="p-3 rounded-xl bg-amber-500/10 border-l-4 border-amber-500 text-amber-900 dark:text-amber-200 text-xs space-y-1">
          <span className="font-bold flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
            ⚠️ Prelims Trap Alert
          </span>
          <p>
            Watch for absolute wordings: Article 200 does <strong>NOT</strong>{" "}
            prescribe a strict time limit within which the Governor must give or
            withhold assent. Deliberately swapped with President&apos;s pocket
            veto.
          </p>
        </div>

        <p className="font-semibold text-slate-900 dark:text-white">
          UPSC Practice Question (Multi-Statement Trap):
        </p>

        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
          <p className="font-medium text-slate-800 dark:text-slate-200">
            Consider the following statements regarding the Governor&apos;s
            assent under Article 200:
          </p>
          <ol className="list-decimal pl-4 space-y-1 text-slate-700 dark:text-slate-300">
            <li>
              The Governor is constitutionally bound to return a Money Bill if
              passed without recommendations.
            </li>
            <li>
              The Constitution stipulates a 6-month deadline for the Governor to
              reserve a bill for Presidential consideration.
            </li>
          </ol>
          <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold pt-1">
            Elimination Key: Neither 1 nor 2 (Money bills cannot be returned; no
            time deadline exists).
          </p>
        </div>
      </div>
    ),
  },

  mains: {
    stage: "mains",
    format: "mains_blueprint",
    userPrompt:
      "Frame a 15-Mark model answer on the challenges before the 16th Finance Commission in balancing equity and efficiency in horizontal devolution.",
    topicBadge: "GS-II · Fiscal Federalism & Constitutional Bodies",
    assistantSummary:
      "Multi-dimensional 250-word framework with Sarkaria quotes",
    assistantContent: (
      <div className="space-y-3 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
        <div className="border-l-2 border-indigo-500 pl-3 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            1. Context-Setting Introduction
          </span>
          <p className="text-slate-700 dark:text-slate-300">
            The 16th Finance Commission, constituted under Article 280, operates
            amidst growing fiscal centralization, expanding cess and surcharges
            (constituting ~18% of gross tax revenue), and the North-South
            demographic divergence under the 2011 census.
          </p>
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            2. Structural Dilemmas (Equity vs Efficiency)
          </span>
          <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
            <li>
              <strong>Demographic Dividend Penalty</strong>: Southern states
              with TFR &lt; 1.6 face reduced devolution weights despite higher
              revenue contributions.
            </li>
            <li>
              <strong>Shrinking Divisible Pool</strong>: Heavy reliance on
              cesses exempt from Art. 270 sharing starves state developmental
              expenditure.
            </li>
          </ul>
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-900 dark:text-emerald-200 text-xs">
          <span className="font-bold block mb-0.5">
            💡 Mains Evaluator Value-Add
          </span>
          <span>
            Cite N.K. Singh Committee &amp; Sarkaria Commission recommendation:
            Cap non-divisible cesses to under 10% of total tax receipts.
          </span>
        </div>
      </div>
    ),
  },

  optional: {
    stage: "optional",
    format: "mains_blueprint",
    userPrompt:
      "Explain the Realist vs Constructivist divergence on India's strategic autonomy in contemporary international relations (PSIR Paper-1 & 2).",
    topicBadge: "PSIR Optional · Paper I & II Integration",
    assistantSummary:
      "Scholarly theoretical frameworks linked to empirical foreign policy",
    assistantContent: (
      <div className="space-y-3 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">
              Structural Realism (Waltz / Mearsheimer)
            </span>
            <p className="text-slate-600 dark:text-slate-300">
              Views strategic autonomy as rational internal balancing against
              asymmetric Chinese power in the Indo-Pacific.
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">
              Social Constructivism (Wendt / Acharya)
            </span>
            <p className="text-slate-600 dark:text-slate-300">
              Roots strategic autonomy in India&apos;s post-colonial
              civilizational identity and Non-Aligned ideological memory.
            </p>
          </div>
        </div>
        <p className="text-[11px] text-slate-700 dark:text-slate-300 italic border-l-2 border-purple-500 pl-2">
          &ldquo;India acts as a &apos;bridging power&apos; rather than a treaty
          ally, operationalizing multi-alignment across Quad and BRICS.&rdquo;
        </p>
      </div>
    ),
  },

  csat: {
    stage: "csat",
    format: "crisp_notes",
    userPrompt:
      "A round table has 6 seats. In how many ways can 4 boys and 2 girls be seated such that the 2 girls never sit together?",
    topicBadge: "CSAT Paper-II · Permutations & Combinations",
    assistantSummary:
      "Formula breakdown + 30-second exam hall elimination hack",
    assistantContent: (
      <div className="space-y-3 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
        <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
          <span className="font-bold text-indigo-900 dark:text-indigo-200 block text-xs">
            ⚡ 30-Second Exam Hall Hack (Gap Method):
          </span>
          <p className="text-slate-700 dark:text-slate-300">
            1. Seat the 4 boys around the round table first: $(4 - 1)! = 3! = 6$
            ways.
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            2. This creates 4 distinct gaps between the seated boys.
          </p>
          <p className="text-slate-700 dark:text-slate-300">
            3. Seat the 2 girls in any 2 of the 4 gaps: $^4P_2 = 4 \times 3 =
            12$ ways.
          </p>
          <div className="pt-1.5 border-t border-indigo-200 dark:border-indigo-800 font-mono font-bold text-indigo-700 dark:text-indigo-300">
            Total Arrangements: $6 \times 12 = 72$ ways.
          </div>
        </div>
      </div>
    ),
  },

  concept: {
    stage: "concept",
    format: "first_principles",
    userPrompt:
      "Explain Inflation Targeting and the Monetary Policy Committee (MPC) without any economics textbook jargon.",
    topicBadge: "First-Principles AI · Zero-Textbook Scaffold",
    assistantSummary:
      "Real-world household analogy + moving parts + self-check quiz",
    assistantContent: (
      <div className="space-y-3 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
        <div className="p-3 rounded-xl bg-amber-500/10 border-l-4 border-amber-500 text-amber-950 dark:text-amber-100 text-xs space-y-1">
          <span className="font-bold flex items-center gap-1.5">
            💡 Everyday Analogy (The Thermostat &amp; Gas Burner)
          </span>
          <p>
            Imagine an oven thermostat set to 400°F ($\pm 20$°F). If it gets too
            hot (prices rise too fast), you lower the flame (raise interest
            rates to make borrowing expensive). If it gets freezing cold
            (economy slows down), you turn up the flame.
          </p>
        </div>

        <div className="space-y-1.5 pt-1">
          <span className="font-bold text-slate-900 dark:text-white block text-[11px] uppercase tracking-wide">
            How It Works in India:
          </span>
          <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
            <li>
              <strong>The Target</strong>: Government mandates $4\% \pm 2\%$
              ($2\%$ to $6\%$) Consumer Price Index (CPI).
            </li>
            <li>
              <strong>The Committee (MPC)</strong>: 6 members (3 RBI + 3
              Government). If inflation breaches for 3 consecutive quarters, RBI
              must submit a formal failure report to Parliament.
            </li>
          </ul>
        </div>

        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200">
          <span className="font-bold block">❓ Self-Check Checkpoint:</span>
          Does RBI target WPI (Wholesale) or CPI (Retail) for inflation
          targeting?{" "}
          <em>
            (Answer: CPI Combined, as recommended by Urjit Patel Committee).
          </em>
        </div>
      </div>
    ),
  },
};

export function InteractiveTutorShowcase() {
  const [activeStage, setActiveStage] = useState<PrepStage>("concept");
  const scenario = SHOWCASE_SCENARIOS[activeStage];
  const meta = STAGE_METADATA[activeStage];

  const stages: PrepStage[] = [
    "prelims",
    "mains",
    "optional",
    "csat",
    "concept",
  ];

  return (
    <section className="public-section page-container my-12 sm:my-16">
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-8 sm:mb-10">
        <span className="px-3.5 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
          Pure In-App AI Mentorship
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          One Tutor. Five Stage-Specific Personas.
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
          Hover over each stage to discover its specific value, then click to
          see live exam-grade response architecture with zero boilerplate.
        </p>
      </div>

      {/* Interactive Mockup Container */}
      <div className="max-w-4xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Browser Top Window Chrome */}
        <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-[11px] font-mono text-slate-400 ml-2 hidden sm:inline">
              upsc-prep.app/revision?mode={activeStage}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/revision"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-2xs"
            >
              <Sparkles className="h-3 w-3" />
              <span>Launch Live Tutor</span>
            </Link>
          </div>
        </div>

        {/* Stage Selector Pills (with rich hover popovers matching the app) */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {stages.map((stg) => {
              const cfg = STAGE_METADATA[stg];
              const isActive = activeStage === stg;
              return (
                <div key={stg} className="relative group">
                  <button
                    type="button"
                    onClick={() => setActiveStage(stg)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                    }`}
                  >
                    <span>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </button>

                  {/* Hover Popover */}
                  <div className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 ease-out absolute z-40 top-full mt-2 left-0 sm:left-1/2 sm:-translate-x-1/2 w-72 sm:w-80 rounded-2xl bg-slate-900/95 text-slate-100 p-4 shadow-2xl backdrop-blur-md border border-slate-800 text-xs text-left">
                    <div className="absolute -top-1.5 left-6 sm:left-1/2 sm:-translate-x-1/2 w-3 h-3 bg-slate-900 border-t border-l border-slate-800 rotate-45" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-white text-xs flex items-center gap-1.5">
                          <span>{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-300">
                          {cfg.badge}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          💡 Value Provided
                        </span>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {cfg.valueProvided}
                        </p>
                      </div>
                      <div className="pt-1 border-t border-slate-800">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-0.5">
                          🎯 When To Use
                        </span>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {cfg.whenToUse}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="text-indigo-600 dark:text-indigo-400">
              {meta.badge}
            </span>
          </div>
        </div>

        {/* Simulated Live Chat Interaction Screen */}
        <div className="p-4 sm:p-6 space-y-4 bg-white dark:bg-slate-900 min-h-[380px]">
          {/* User Prompt Bubble */}
          <div className="flex gap-2.5 justify-end max-w-2xl ml-auto">
            <div className="p-3 sm:p-3.5 rounded-2xl rounded-tr-xs bg-indigo-600 text-white text-xs sm:text-sm font-medium leading-relaxed shadow-sm">
              {scenario.userPrompt}
            </div>
            <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-1">
              <User className="h-4 w-4" />
            </div>
          </div>

          {/* Assistant Response Bubble */}
          <div className="flex gap-3 justify-start max-w-3xl">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
              <Bot className="h-4 w-4" />
            </div>

            <div className="p-4 rounded-2xl rounded-tl-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs w-full">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {meta.label} Response
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold font-mono">
                    {scenario.topicBadge}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  {scenario.assistantSummary}
                </span>
              </div>

              {/* Dynamic Content */}
              {scenario.assistantContent}

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="h-3.5 w-3.5" /> Direct exam-grade output
                </span>
                <span className="font-mono">
                  Single Export Ready (PDF / MD)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Bar */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Download className="h-3.5 w-3.5 text-indigo-500" />
              <span>Consolidated 1-Click Notes Export</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Flame className="h-3.5 w-3.5 text-rose-500" />
              <span>Mistake-to-Concept Auto Linkage</span>
            </span>
          </div>

          <Link
            href="/revision"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>Open in Fullscreen Workspace</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

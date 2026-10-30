"use client";

import React, { useState } from "react";
import { Attempt } from "../../lib/types";
import { formatTimeSeconds } from "../../lib/defaults";
import { CutoffVerdict, TakeawayItem, FilterTabType } from "./reviewTypes";
import {
  Award,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
} from "lucide-react";

interface ReviewScoreHeroProps {
  attempt: Attempt;
  effectiveMaxScore: number;
  scorePct: string;
  grossCorrectMarks: number;
  negativePenaltyMarks: number;
  netAlterationMarks: number;
  avgTimePerQ: number;
  cutoffVerdict: CutoffVerdict;
  topTakeaways: TakeawayItem[];
  onSelectFilter: (tab: FilterTabType) => void;
  formatReviewNumber: (val: number) => string;
}

export function ReviewScoreHero({
  attempt,
  effectiveMaxScore,
  scorePct,
  grossCorrectMarks,
  negativePenaltyMarks,
  netAlterationMarks,
  avgTimePerQ,
  cutoffVerdict,
  topTakeaways,
  onSelectFilter,
  formatReviewNumber,
}: ReviewScoreHeroProps) {
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);

  const totalQ = attempt.totalQuestions;
  const correctPct = totalQ > 0 ? Math.round((attempt.correct / totalQ) * 100) : 0;
  const incorrectPct = totalQ > 0 ? Math.round((attempt.incorrect / totalQ) * 100) : 0;
  const skippedPct = totalQ > 0 ? Math.max(0, 100 - correctPct - incorrectPct) : 0;

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-all">
      {/* Primary Hero Row: Score, Key Metrics & Cutoff Status */}
      <div className="p-4 sm:p-6 bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Left: Score & Accuracy Block */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            {/* Big Score Display */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Net Score
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900">
                  {formatReviewNumber(attempt.score)}
                </span>
                <span className="text-xs sm:text-sm font-semibold font-mono text-slate-400">
                  / {effectiveMaxScore}
                </span>
                <span
                  className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                    attempt.score < 0
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                  }`}
                >
                  {scorePct}%
                </span>
              </div>
            </div>

            <div className="hidden sm:block h-10 w-px bg-slate-200/80" />

            {/* Quick Stats Pill Row */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => onSelectFilter("all")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer text-xs"
                title="View total attempted"
              >
                <span className="text-slate-400 text-[11px]">Accuracy:</span>
                <strong className="font-mono text-slate-900 font-bold">
                  {formatReviewNumber(attempt.accuracyPct)}%
                </strong>
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("correct")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 hover:bg-emerald-100/60 transition-colors text-xs font-medium text-emerald-900 cursor-pointer shadow-2xs"
                title="Filter correct questions"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-mono font-bold">{attempt.correct}</span>
                <span className="text-emerald-700/90 text-[11px]">correct</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("incorrect")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200/80 bg-rose-50/60 hover:bg-rose-100/60 transition-colors text-xs font-medium text-rose-900 cursor-pointer shadow-2xs"
                title="Filter incorrect questions"
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="font-mono font-bold">{attempt.incorrect}</span>
                <span className="text-rose-700/90 text-[11px]">wrong</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("skipped")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-xs font-medium text-slate-700 cursor-pointer shadow-2xs"
                title="Filter skipped questions"
              >
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                <span className="font-mono font-bold">{attempt.unattempted}</span>
                <span className="text-slate-500 text-[11px]">skipped</span>
              </button>

              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium pl-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>{avgTimePerQ}s / q</span>
              </div>
            </div>
          </div>

          {/* Right: Cutoff Benchmark Pill & Analytics Accordion Toggle */}
          <div className="flex items-center gap-3 self-start lg:self-center flex-wrap">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border shadow-2xs ${cutoffVerdict.statusColor}`}
            >
              {cutoffVerdict.status.includes("QUALIFIED") ||
              cutoffVerdict.status.includes("CLEAR") ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] uppercase tracking-wider opacity-75">
                  {cutoffVerdict.isCsat ? "CSAT Status" : "Prelims Cutoff"}
                </span>
                <span>{cutoffVerdict.status}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
              aria-expanded={analyticsExpanded}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
              <span>{analyticsExpanded ? "Hide Analytics" : "Detailed Breakdown"}</span>
              {analyticsExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Benchmark Progress Bar Row */}
        <div className="mt-4 pt-3.5 border-t border-slate-200/70 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-600 text-[11px] leading-relaxed">
              {cutoffVerdict.message}
            </span>
            <div className="flex items-center gap-3 shrink-0 text-[11px]">
              <span className="text-slate-500">
                Score: <strong>{formatReviewNumber(attempt.score)}</strong>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">
                Cutoff Target: <strong>{cutoffVerdict.targetLabel}</strong>
              </span>
            </div>
          </div>

          <div className="relative h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${cutoffVerdict.barColor}`}
              style={{
                width: `${Math.min(100, Math.max(0, (attempt.score / (effectiveMaxScore || 200)) * 100))}%`,
              }}
            />
            {/* Cutoff Marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
              style={{
                left: `${Math.min(100, Math.max(0, (cutoffVerdict.targetScore / (effectiveMaxScore || 200)) * 100))}%`,
              }}
              title={`Benchmark Cutoff: ${cutoffVerdict.targetScore} pts`}
            />
          </div>
        </div>
      </div>

      {/* Top 3 Actionable Diagnostic Takeaways */}
      {topTakeaways.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Diagnostic Insights & Takeaways
            </h3>
            <span className="text-[10px] text-slate-400 font-medium ml-1">
              (Click any card to isolate relevant questions)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topTakeaways.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectFilter(item.actionTab)}
                className="group flex flex-col justify-between text-left rounded-xl border border-slate-200 bg-white p-3.5 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer gap-2.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                      {item.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeStyle}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-sm font-bold font-mono text-slate-900">
                    {item.metric}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-800 transition-colors pt-1 border-t border-slate-100">
                  <span>{item.actionText}</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Deep Dive Analytics Panel */}
      {analyticsExpanded && (
        <div className="border-t border-slate-200 bg-white p-5 space-y-5 animate-in fade-in duration-200">
          {/* Outcome distribution bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Outcome distribution across {totalQ} questions</span>
              <span>
                Total Duration: <strong>{formatTimeSeconds(attempt.durationSeconds)}</strong>
              </span>
            </div>

            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex border border-slate-200">
              {correctPct > 0 && (
                <div
                  style={{ width: `${correctPct}%` }}
                  className="bg-emerald-500 h-full"
                  title={`Correct: ${attempt.correct} (${correctPct}%)`}
                />
              )}
              {incorrectPct > 0 && (
                <div
                  style={{ width: `${incorrectPct}%` }}
                  className="bg-rose-500 h-full"
                  title={`Incorrect: ${attempt.incorrect} (${incorrectPct}%)`}
                />
              )}
              {skippedPct > 0 && (
                <div
                  style={{ width: `${skippedPct}%` }}
                  className="bg-slate-300 h-full"
                  title={`Skipped: ${attempt.unattempted} (${skippedPct}%)`}
                />
              )}
            </div>
          </div>

          {/* Marks calculation summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3">
              <div className="text-[11px] font-semibold text-emerald-800">
                Gross Correct Marks
              </div>
              <div className="text-xl font-bold text-emerald-700 font-mono mt-0.5">
                +{grossCorrectMarks} pts
              </div>
              <div className="text-[10px] text-emerald-900/70 mt-1">
                {attempt.correct} questions scored
              </div>
            </div>

            <div className="rounded-xl bg-rose-50/70 border border-rose-200 p-3">
              <div className="text-[11px] font-semibold text-rose-800">
                Negative Penalties
              </div>
              <div className="text-xl font-bold text-rose-700 font-mono mt-0.5">
                -{negativePenaltyMarks} pts
              </div>
              <div className="text-[10px] text-rose-900/70 mt-1">
                {attempt.incorrect} incorrect choices penalized
              </div>
            </div>

            <div className="rounded-xl bg-indigo-50/70 border border-indigo-200 p-3">
              <div className="text-[11px] font-semibold text-indigo-800">
                Net Resulting Score
              </div>
              <div className="text-xl font-bold text-indigo-700 font-mono mt-0.5">
                {formatReviewNumber(attempt.score)} pts
              </div>
              <div className="text-[10px] text-indigo-900/70 mt-1">
                Revision delta: {netAlterationMarks >= 0 ? `+${netAlterationMarks}` : netAlterationMarks} pts
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


"use client";

import React, { useState } from "react";
import { Attempt } from "../../lib/types";
import { formatTimeSeconds } from "../../lib/defaults";
import { CutoffVerdict, TakeawayItem, FilterTabType, ReviewFilterState, EMPTY_FILTER_STATE } from "./reviewTypes";
import {
  Award,
  ChevronDown,
  ChevronUp,
  Sparkles,
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
  onSelectFilter: (tab: FilterTabType, filterState?: ReviewFilterState) => void;
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
  const [scoreCollapsed, setScoreCollapsed] = useState(false);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);

  const totalQ = attempt.totalQuestions;
  const correctPct = totalQ > 0 ? Math.round((attempt.correct / totalQ) * 100) : 0;
  const incorrectPct = totalQ > 0 ? Math.round((attempt.incorrect / totalQ) * 100) : 0;
  const skippedPct = totalQ > 0 ? Math.max(0, 100 - correctPct - incorrectPct) : 0;

  return (
    <section className="space-y-3.5">
      {/* 1. Score & Benchmark Card (Collapsible) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden transition-all">
        {/* Header Bar */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 flex items-center justify-between gap-3 border-b border-slate-200/80">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Score & Cutoff
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
                {formatReviewNumber(attempt.score)}
              </span>
              <span className="text-xs sm:text-sm font-semibold font-mono text-slate-500">
                / {effectiveMaxScore}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
                {scorePct}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${cutoffVerdict.statusColor}`}
            >
              {cutoffVerdict.status.toLowerCase().includes("qualified") ||
              cutoffVerdict.status.toLowerCase().includes("clear") ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )}
              <span>{cutoffVerdict.status}</span>
            </span>

            <button
              type="button"
              onClick={() => setScoreCollapsed(!scoreCollapsed)}
              className="flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              title={scoreCollapsed ? "Expand Scorecard" : "Collapse Scorecard"}
            >
              {scoreCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Score Body */}
        {!scoreCollapsed && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Accuracy & Outcome Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onSelectFilter("all", EMPTY_FILTER_STATE)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-xs cursor-pointer shadow-2xs"
              >
                <span className="text-slate-400 text-[11px]">Accuracy:</span>
                <strong className="font-mono text-slate-900 font-bold">
                  {formatReviewNumber(attempt.accuracyPct)}%
                </strong>
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("correct", { outcome: "correct" })}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-mono">{attempt.correct}</span>
                <span className="text-[11px] text-emerald-700">correct</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("incorrect", { outcome: "incorrect" })}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100 text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span className="font-mono">{attempt.incorrect}</span>
                <span className="text-[11px] text-rose-700">wrong</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("skipped", { outcome: "skipped" })}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-medium cursor-pointer shadow-2xs"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <span className="font-mono">{attempt.unattempted}</span>
                <span className="text-[11px] text-slate-500">skip</span>
              </button>

              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium pl-1">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>{avgTimePerQ}s / q</span>
              </div>
            </div>

            {/* Cutoff Benchmark Progress Bar */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  Target: <strong>{cutoffVerdict.targetLabel}</strong>
                </span>
                <span className="text-slate-700 font-mono font-bold text-[11px]">
                  {cutoffVerdict.diff >= 0 ? `+${cutoffVerdict.diff}` : cutoffVerdict.diff} pts margin
                </span>
              </div>

              <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cutoffVerdict.barColor}`}
                  style={{
                    width: `${Math.min(100, Math.max(0, (attempt.score / (effectiveMaxScore || 200)) * 100))}%`,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
                  style={{
                    left: `${Math.min(100, Math.max(0, (cutoffVerdict.targetScore / (effectiveMaxScore || 200)) * 100))}%`,
                  }}
                  title={`Benchmark Cutoff: ${cutoffVerdict.targetScore} pts`}
                />
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                {cutoffVerdict.message}
              </p>
            </div>

            {/* Analytics Accordion Toggle */}
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
                <span>
                  {analyticsExpanded ? "Hide Detailed Analytics" : "View Detailed Analytics & Diagnostics"}
                </span>
                {analyticsExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Expandable Deep-Dive Analytics & Diagnostics Panel */}
            {analyticsExpanded && (
              <div className="pt-2 space-y-4 animate-in fade-in border-t border-slate-100">
                {/* 1. Distribution Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>Outcome Distribution</span>
                    <span>Total: {formatTimeSeconds(attempt.durationSeconds)}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex border border-slate-200">
                    {correctPct > 0 && (
                      <div
                        style={{ width: `${correctPct}%` }}
                        className="bg-emerald-500 h-full"
                        title={`Correct: ${attempt.correct}`}
                      />
                    )}
                    {incorrectPct > 0 && (
                      <div
                        style={{ width: `${incorrectPct}%` }}
                        className="bg-rose-500 h-full"
                        title={`Incorrect: ${attempt.incorrect}`}
                      />
                    )}
                    {skippedPct > 0 && (
                      <div
                        style={{ width: `${skippedPct}%` }}
                        className="bg-slate-300 h-full"
                        title={`Skipped: ${attempt.unattempted}`}
                      />
                    )}
                  </div>
                </div>

                {/* 2. Marks Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-medium block">Gross Marks</span>
                    <strong className="font-mono text-emerald-950 text-sm">+{grossCorrectMarks} pts</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200">
                    <span className="text-[10px] text-rose-800 font-medium block">Penalties</span>
                    <strong className="font-mono text-rose-950 text-sm">-{negativePenaltyMarks} pts</strong>
                  </div>
                </div>

                {/* 3. Diagnostic Insights & Takeaways (Inside Analytics) */}
                {topTakeaways.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>Diagnostic Insights ({topTakeaways.length})</span>
                    </div>

                    <div className="space-y-2">
                      {topTakeaways.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectFilter(item.actionTab, item.actionFilter)}
                          className="w-full text-left rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer space-y-1.5 group"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                              {item.title}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${item.badgeStyle}`}
                            >
                              {item.badge}
                            </span>
                          </div>
                          <div className="text-xs font-bold font-mono text-slate-900">
                            {item.metric}
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                            {item.desc}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-800 transition-colors pt-0.5">
                            <span>{item.actionText}</span>
                            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

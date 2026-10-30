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
  const [scoreCollapsed, setScoreCollapsed] = useState(false);
  const [diagnosticsCollapsed, setDiagnosticsCollapsed] = useState(false);
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
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-white via-slate-50/50 to-indigo-50/20 flex items-center justify-between gap-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Score & Cutoff
            </span>
            <span className="font-mono font-bold text-sm text-slate-900 truncate">
              {formatReviewNumber(attempt.score)} / {effectiveMaxScore} ({scorePct}%)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cutoffVerdict.statusColor}`}
            >
              {cutoffVerdict.status.includes("QUALIFIED") ||
              cutoffVerdict.status.includes("CLEAR") ? (
                <ShieldCheck className="h-3 w-3" />
              ) : (
                <ShieldAlert className="h-3 w-3" />
              )}
              <span>{cutoffVerdict.isCsat ? "CSAT " : ""}{cutoffVerdict.status}</span>
            </span>

            <button
              type="button"
              onClick={() => setScoreCollapsed(!scoreCollapsed)}
              className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                onClick={() => onSelectFilter("all")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-xs cursor-pointer shadow-2xs"
              >
                <span className="text-slate-400 text-[11px]">Accuracy:</span>
                <strong className="font-mono text-slate-900 font-bold">
                  {formatReviewNumber(attempt.accuracyPct)}%
                </strong>
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("correct")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-mono">{attempt.correct}</span>
                <span className="text-[11px] text-emerald-700">correct</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("incorrect")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100 text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span className="font-mono">{attempt.incorrect}</span>
                <span className="text-[11px] text-rose-700">wrong</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("skipped")}
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
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                <BarChart3 className="h-3 w-3 text-indigo-600" />
                <span>{analyticsExpanded ? "Hide Analytics" : "View Detailed Analytics"}</span>
                {analyticsExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </div>

            {analyticsExpanded && (
              <div className="pt-2 space-y-3 animate-in fade-in">
                {/* Distribution Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Distribution</span>
                    <span>Total: {formatTimeSeconds(attempt.durationSeconds)}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex border border-slate-200">
                    {correctPct > 0 && (
                      <div
                        style={{ width: `${correctPct}%` }}
                        className="bg-emerald-500 h-full"
                      />
                    )}
                    {incorrectPct > 0 && (
                      <div
                        style={{ width: `${incorrectPct}%` }}
                        className="bg-rose-500 h-full"
                      />
                    )}
                    {skippedPct > 0 && (
                      <div
                        style={{ width: `${skippedPct}%` }}
                        className="bg-slate-300 h-full"
                      />
                    )}
                  </div>
                </div>

                {/* Marks Summary */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-medium block">Gross Marks</span>
                    <strong className="font-mono text-emerald-900 text-sm">+{grossCorrectMarks} pts</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                    <span className="text-[10px] text-rose-800 font-medium block">Penalties</span>
                    <strong className="font-mono text-rose-900 text-sm">-{negativePenaltyMarks} pts</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Diagnostic Insights & Takeaways (Collapsible) */}
      {topTakeaways.length > 0 && (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden transition-all">
          {/* Header Bar */}
          <div className="p-3.5 sm:p-4 bg-slate-50/70 flex items-center justify-between gap-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Diagnostic Insights ({topTakeaways.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setDiagnosticsCollapsed(!diagnosticsCollapsed)}
              className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title={diagnosticsCollapsed ? "Expand Insights" : "Collapse Insights"}
            >
              {diagnosticsCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Cards Body */}
          {!diagnosticsCollapsed && (
            <div className="p-3.5 sm:p-4 space-y-2.5">
              {topTakeaways.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectFilter(item.actionTab)}
                  className="w-full text-left rounded-xl border border-slate-200/90 bg-slate-50/60 p-3 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer space-y-1.5 group"
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
          )}
        </div>
      )}
    </section>
  );
}

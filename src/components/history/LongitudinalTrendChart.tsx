"use client";

import { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Attempt, QuestionPaper } from "../../lib/types";
import { formatDateTime, getAttemptPercentage } from "../../lib/defaults";
import { PreparationDirectionBreakdown } from "./PreparationDirectionBreakdown";

interface LongitudinalTrendChartProps {
  attempts: Attempt[];
  papers?: QuestionPaper[];
  onSelectAttempt?: (attempt: Attempt) => void;
}

type SubjectFilter = "all" | "gs1" | "csat" | "mains";
type MetricType = "scorePct" | "accuracy" | "score";
type HorizonType = "10" | "20" | "all";

export function LongitudinalTrendChart({
  attempts,
  papers = [],
  onSelectAttempt,
}: LongitudinalTrendChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("all");
  const [metric, setMetric] = useState<MetricType>("scorePct");
  const [horizon, setHorizon] = useState<HorizonType>("all");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter and sort attempts chronologically
  const chronologicalAttempts = useMemo(() => {
    const sorted = [...attempts]
      .filter((a) => a.finishedAt)
      .sort(
        (a, b) =>
          new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
      );

    if (subjectFilter === "all") return sorted;

    return sorted.filter((a) => {
      const label = a.paperLabel.toLowerCase();
      const p = papers.find((paper) => paper.id === a.paperId);
      const subject = (p?.subject || "").toLowerCase();

      if (subjectFilter === "gs1") {
        return (
          label.includes("gs i") ||
          label.includes("gs 1") ||
          label.includes("gs-1") ||
          label.includes("general studies i") ||
          (subject.includes("gs i") && !subject.includes("mains"))
        );
      }
      if (subjectFilter === "csat") {
        return (
          label.includes("csat") ||
          label.includes("gs ii") ||
          label.includes("gs 2") ||
          label.includes("gs-2") ||
          subject.includes("csat")
        );
      }
      if (subjectFilter === "mains") {
        return (
          label.includes("mains") ||
          subject.includes("mains") ||
          p?.category === "mains"
        );
      }
      return true;
    });
  }, [attempts, subjectFilter, papers]);

  // Windowed attempts respecting selected horizon
  const displayedAttempts = useMemo(() => {
    if (horizon === "10") return chronologicalAttempts.slice(-10);
    if (horizon === "20") return chronologicalAttempts.slice(-20);
    return chronologicalAttempts;
  }, [chronologicalAttempts, horizon]);

  // Trajectory stats
  const stats = useMemo(() => {
    if (displayedAttempts.length < 2) return null;
    const first = displayedAttempts[0];
    const last = displayedAttempts[displayedAttempts.length - 1];
    const firstPct = getAttemptPercentage(first);
    const lastPct = getAttemptPercentage(last);
    const scorePctDelta = Math.round((lastPct - firstPct) * 10) / 10;
    const scoreDelta = Math.round((last.score - first.score) * 10) / 10;
    const accuracyDelta =
      Math.round((last.accuracyPct - first.accuracyPct) * 10) / 10;

    const recentWindow = displayedAttempts.slice(-5);
    const recentAvgPct =
      Math.round(
        (recentWindow.reduce((s, a) => s + getAttemptPercentage(a), 0) /
          recentWindow.length) *
          10,
      ) / 10;
    const recentAvgScore =
      Math.round(
        (recentWindow.reduce((s, a) => s + a.score, 0) / recentWindow.length) *
          10,
      ) / 10;
    const recentAvgAcc =
      Math.round(
        (recentWindow.reduce((s, a) => s + a.accuracyPct, 0) /
          recentWindow.length) *
          10,
      ) / 10;

    return {
      scorePctDelta,
      scoreDelta,
      accuracyDelta,
      recentAvgPct,
      recentAvgScore,
      recentAvgAcc,
      isImproving:
        metric === "scorePct"
          ? scorePctDelta > 0
          : metric === "score"
            ? scoreDelta > 0
            : accuracyDelta > 0,
      totalTracked: displayedAttempts.length,
      allTotalTracked: chronologicalAttempts.length,
    };
  }, [displayedAttempts, chronologicalAttempts.length, metric]);

  // Chart layout dimensions
  const width = 680;
  const height = 180;
  const padding = { top: 25, right: 35, bottom: 35, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const getMetricValue = (a: Attempt) =>
    metric === "scorePct"
      ? getAttemptPercentage(a)
      : metric === "accuracy"
        ? a.accuracyPct
        : a.score;

  // Metric range calculation
  const values = useMemo(() => {
    return displayedAttempts.map((a) => getMetricValue(a));
  }, [displayedAttempts, metric]);

  const { minVal, maxVal, cutoffVal } = useMemo(() => {
    if (values.length === 0) {
      return { minVal: 0, maxVal: 100, cutoffVal: null };
    }

    let cutoff: number | null = null;
    if (metric === "score") {
      if (subjectFilter === "csat") cutoff = 66.67;
      else if (subjectFilter === "gs1") cutoff = 90.0;
    } else if (metric === "scorePct") {
      if (subjectFilter === "csat") cutoff = 33.3;
      else if (subjectFilter === "gs1") cutoff = 45.0;
    }

    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);

    let min =
      metric === "accuracy"
        ? Math.min(20, dataMin)
        : metric === "scorePct"
          ? Math.min(0, dataMin)
          : Math.min(0, dataMin);
    let max =
      metric === "accuracy" || metric === "scorePct"
        ? Math.max(100, dataMax)
        : Math.max(cutoff ? cutoff + 20 : 120, dataMax * 1.15);

    if (min === max) {
      max = min + 50;
    }

    return { minVal: min, maxVal: max, cutoffVal: cutoff };
  }, [values, metric, subjectFilter]);

  // Points mapping for SVG
  const points = useMemo(() => {
    if (displayedAttempts.length === 0) return [];
    const len = displayedAttempts.length;

    return displayedAttempts.map((att, i) => {
      const val = getMetricValue(att);
      const x =
        len === 1
          ? padding.left + chartWidth / 2
          : padding.left + (i / (len - 1)) * chartWidth;
      const normalizedY = (val - minVal) / (maxVal - minVal || 1);
      const y = padding.top + chartHeight - normalizedY * chartHeight;
      return { x, y, val, attempt: att, index: i };
    });
  }, [
    displayedAttempts,
    metric,
    minVal,
    maxVal,
    chartWidth,
    chartHeight,
    padding,
  ]);

  // Generate SVG path strings
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: "", areaPath: "" };
    if (points.length === 1) {
      return {
        linePath: `M ${points[0].x} ${points[0].y}`,
        areaPath: "",
      };
    }

    const first = points[0];
    const last = points[points.length - 1];

    let d = `M ${first.x} ${first.y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth cubic bezier or straight line
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const bottomY = padding.top + chartHeight;
    const a = `${d} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;

    return { linePath: d, areaPath: a };
  }, [points, padding, chartHeight]);

  // Cutoff horizontal reference line Y
  const cutoffY = useMemo(() => {
    if (cutoffVal === null) return null;
    const norm = (cutoffVal - minVal) / (maxVal - minVal || 1);
    return padding.top + chartHeight - norm * chartHeight;
  }, [cutoffVal, minVal, maxVal, chartHeight, padding]);

  const activeHoverPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  if (attempts.length === 0) {
    return null;
  }

  const activeDelta =
    stats === null
      ? null
      : metric === "scorePct"
        ? stats.scorePctDelta
        : metric === "accuracy"
          ? stats.accuracyDelta
          : stats.scoreDelta;
  const activeDeltaSuffix = metric === "score" ? " pts net" : "% net";

  return (
    <div className="bi-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-4">
      {/* Collapsible Header Bar */}
      <div
        className={`space-y-3 ${
          isExpanded ? "pb-3 border-b border-slate-100" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          className="w-full flex items-center justify-between gap-2.5 text-left cursor-pointer group min-h-[40px]"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200/60 text-indigo-600 shrink-0">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight group-hover:text-indigo-700 transition-colors">
                  Longitudinal Performance &amp; Direction
                </h3>
                {stats && activeDelta !== null && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeDelta > 0
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : activeDelta < 0
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {activeDelta > 0 ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : activeDelta < 0 ? (
                      <TrendingDown className="h-2.5 w-2.5" />
                    ) : (
                      <Minus className="h-2.5 w-2.5" />
                    )}
                    {activeDelta > 0 ? `+${activeDelta}` : activeDelta}
                    {activeDeltaSuffix}
                  </span>
                )}
                {!isExpanded && stats && (
                  <span className="hidden md:inline-flex items-center text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Recent 5 Avg:{" "}
                    {metric === "score"
                      ? `${stats.recentAvgScore} pts`
                      : metric === "accuracy"
                        ? `${stats.recentAvgAcc}%`
                        : `${stats.recentAvgPct}%`}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {isExpanded
                  ? `Showing ${displayedAttempts.length} of ${chronologicalAttempts.length} completed exam mocks`
                  : `Tap to expand trajectory chart & execution breakdown (${chronologicalAttempts.length} mocks)`}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 shrink-0 transition-colors">
            <span>{isExpanded ? "Close" : "Expand"}</span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </span>
        </button>

        {isExpanded && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {/* Horizon Selector Toggle */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setHorizon("10")}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  horizon === "10"
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "hover:text-slate-900"
                }`}
                title="Show last 10 mock attempts"
              >
                Last 10
              </button>
              <button
                type="button"
                onClick={() => setHorizon("20")}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  horizon === "20"
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "hover:text-slate-900"
                }`}
                title="Show last 20 mock attempts"
              >
                Last 20
              </button>
              <button
                type="button"
                onClick={() => setHorizon("all")}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  horizon === "all"
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "hover:text-slate-900"
                }`}
                title="Show all historical mock attempts"
              >
                All
              </button>
            </div>

            {/* Subject Scope Filter */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setSubjectFilter("all")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  subjectFilter === "all"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "hover:text-slate-900"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSubjectFilter("gs1")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  subjectFilter === "gs1"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "hover:text-slate-900"
                }`}
              >
                GS I
              </button>
              <button
                type="button"
                onClick={() => setSubjectFilter("csat")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  subjectFilter === "csat"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "hover:text-slate-900"
                }`}
              >
                CSAT
              </button>
            </div>

            {/* Metric Selector Toggle */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setMetric("scorePct")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  metric === "scorePct"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "hover:text-slate-900"
                }`}
              >
                Score %
              </button>
              <button
                type="button"
                onClick={() => setMetric("accuracy")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  metric === "accuracy"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "hover:text-slate-900"
                }`}
              >
                Accuracy %
              </button>
              <button
                type="button"
                onClick={() => setMetric("score")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  metric === "score"
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "hover:text-slate-900"
                }`}
              >
                Pts
              </button>
            </div>
          </div>
        )}
      </div>

      {isExpanded && (
        <>
          {/* Chart Canvas Area */}
          {displayedAttempts.length < 2 ? (
            <div className="py-8 text-center space-y-1.5 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Layers className="h-6 w-6 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                Need at least 2 attempts in this horizon to generate trend
                trajectory
              </p>
              <p className="text-[11px] text-slate-500">
                Complete another paper mock to visualize your score progression
                curve.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Responsive SVG Chart */}
              <div className="w-full overflow-hidden select-none">
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-44 sm:h-52 overflow-visible"
                >
                  <defs>
                    <linearGradient
                      id="trendAreaGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#4f46e5"
                        stopOpacity="0.22"
                      />
                      <stop
                        offset="90%"
                        stopColor="#4f46e5"
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  {[0, 0.33, 0.66, 1].map((pct, idx) => {
                    const y = padding.top + chartHeight * (1 - pct);
                    const val = Math.round(minVal + pct * (maxVal - minVal));
                    return (
                      <g key={idx}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={width - padding.right}
                          y2={y}
                          stroke="#f1f5f9"
                          strokeWidth="1"
                        />
                        <text
                          x={padding.left - 8}
                          y={y + 3}
                          textAnchor="end"
                          className="text-[9px] fill-slate-400 font-mono"
                        >
                          {val}
                          {metric !== "score" ? "%" : ""}
                        </text>
                      </g>
                    );
                  })}

                  {/* Cutoff Reference Line if applicable */}
                  {cutoffY !== null && (
                    <g>
                      <line
                        x1={padding.left}
                        y1={cutoffY}
                        x2={width - padding.right}
                        y2={cutoffY}
                        stroke="#f43f5e"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={width - padding.right}
                        y={cutoffY - 4}
                        textAnchor="end"
                        className="text-[9px] fill-rose-600 font-bold font-mono"
                      >
                        Cutoff Benchmark ({cutoffVal}
                        {metric !== "score" ? "%" : ""})
                      </text>
                    </g>
                  )}

                  {/* Shaded Area */}
                  {areaPath && (
                    <path d={areaPath} fill="url(#trendAreaGradient)" />
                  )}

                  {/* Curve Line */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Data points */}
                  {points.map((pt) => {
                    const isHovered = hoveredIndex === pt.index;
                    return (
                      <g
                        key={pt.index}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(pt.index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => onSelectAttempt?.(pt.attempt)}
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 6 : 3.5}
                          fill={isHovered ? "#4f46e5" : "#ffffff"}
                          stroke="#4f46e5"
                          strokeWidth={isHovered ? 3 : 2}
                          className="transition-all duration-150"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Active Hover Tooltip */}
              {activeHoverPoint && (
                <div
                  className="absolute z-20 pointer-events-none rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md px-3 py-2 text-xs shadow-xl animate-in fade-in duration-100 space-y-1"
                  style={{
                    left: `${Math.min(
                      85,
                      Math.max(15, (activeHoverPoint.x / width) * 100),
                    )}%`,
                    top: `${Math.max(5, (activeHoverPoint.y / height) * 60)}%`,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <div className="font-bold text-slate-900 truncate max-w-[220px]">
                    {activeHoverPoint.attempt.paperLabel}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono">
                    <span>
                      Score:{" "}
                      <strong className="text-indigo-600">
                        {activeHoverPoint.attempt.score}
                      </strong>
                      /{activeHoverPoint.attempt.maxScore || 200} (
                      {getAttemptPercentage(activeHoverPoint.attempt)}%)
                    </span>
                    <span>
                      Accuracy:{" "}
                      <strong className="text-teal-600">
                        {activeHoverPoint.attempt.accuracyPct}%
                      </strong>
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {formatDateTime(activeHoverPoint.attempt.startedAt)} &bull;
                    Click to view review
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trajectory Insights Footer */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Initial Attempt
                </span>
                <div className="font-mono font-bold text-slate-700">
                  {metric === "score"
                    ? `${displayedAttempts[0].score} pts`
                    : metric === "accuracy"
                      ? `${displayedAttempts[0].accuracyPct}%`
                      : `${getAttemptPercentage(displayedAttempts[0])}%`}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Latest Attempt
                </span>
                <div className="font-mono font-bold text-slate-900">
                  {metric === "score"
                    ? `${displayedAttempts[displayedAttempts.length - 1].score} pts`
                    : metric === "accuracy"
                      ? `${displayedAttempts[displayedAttempts.length - 1].accuracyPct}%`
                      : `${getAttemptPercentage(displayedAttempts[displayedAttempts.length - 1])}%`}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Recent 5 Avg
                </span>
                <div className="font-mono font-bold text-indigo-600">
                  {metric === "score"
                    ? `${stats.recentAvgScore} pts`
                    : metric === "accuracy"
                      ? `${stats.recentAvgAcc}%`
                      : `${stats.recentAvgPct}%`}
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Net Progression
                </span>
                <div
                  className={`font-mono font-bold ${
                    (activeDelta ?? 0) > 0
                      ? "text-emerald-600"
                      : (activeDelta ?? 0) < 0
                        ? "text-rose-600"
                        : "text-slate-600"
                  }`}
                >
                  {metric === "score"
                    ? `${stats.scoreDelta > 0 ? "+" : ""}${stats.scoreDelta} pts`
                    : metric === "accuracy"
                      ? `${stats.accuracyDelta > 0 ? "+" : ""}${stats.accuracyDelta}%`
                      : `${stats.scorePctDelta > 0 ? "+" : ""}${stats.scorePctDelta}%`}
                </div>
              </div>
            </div>
          )}

          {/* Merged Direction & Execution Breakdown */}
          <PreparationDirectionBreakdown
            attempts={displayedAttempts}
            papers={papers}
          />

          {/* Mobile-friendly bottom Close control */}
          <div className="pt-2 border-t border-slate-100 flex justify-center sm:justify-end">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              <span>Close Trajectory &amp; Breakdown</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

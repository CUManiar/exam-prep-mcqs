"use client";

import React, { useState, useMemo } from "react";
import { Attempt } from "../../lib/types";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

interface McqAndMockTrendsChartProps {
  attempts: Attempt[];
  dailyTarget?: number;
}

type TimeRangeOption = "7d" | "14d" | "30d" | "8w";
type MetricViewOption = "mcqs" | "mocks" | "accuracy";

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function McqAndMockTrendsChart({
  attempts,
  dailyTarget = 50,
}: McqAndMockTrendsChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeOption>("14d");
  const [metricView, setMetricView] = useState<MetricViewOption>("mcqs");
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    sublabel: string;
    mcqs: number;
    mocks: number;
    practice: number;
    accuracy: number | null;
  } | null>(null);

  // Group attempts by date
  const dateMap = useMemo(() => {
    const map = new Map<
      string,
      {
        mcqs: number;
        mocks: number;
        practice: number;
        totalCorrect: number;
        totalAnswered: number;
      }
    >();

    attempts.forEach((a) => {
      const raw = a.finishedAt || a.startedAt;
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      const key = formatDateKey(d);

      const existing = map.get(key) || {
        mcqs: 0,
        mocks: 0,
        practice: 0,
        totalCorrect: 0,
        totalAnswered: 0,
      };

      existing.mcqs += a.answered || 0;
      if (a.mode === "mock") existing.mocks += 1;
      else existing.practice += 1;
      existing.totalCorrect += a.correct || 0;
      existing.totalAnswered += a.answered || 0;

      map.set(key, existing);
    });

    return map;
  }, [attempts]);

  // Aggregate high-level stats: today, this week, this month
  const overviewStats = useMemo(() => {
    const today = new Date();
    const todayKey = formatDateKey(today);

    // Start of this week (Monday)
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    // Start of this month
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let todayMcqs = 0;
    let todayMocks = 0;
    let weekMcqs = 0;
    let weekMocks = 0;
    let monthMcqs = 0;
    let monthMocks = 0;

    attempts.forEach((a) => {
      const raw = a.finishedAt || a.startedAt;
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      const key = formatDateKey(d);

      const mcq = a.answered || 0;
      const isMock = a.mode === "mock";

      if (key === todayKey) {
        todayMcqs += mcq;
        if (isMock) todayMocks += 1;
      }

      if (d.getTime() >= monday.getTime()) {
        weekMcqs += mcq;
        if (isMock) weekMocks += 1;
      }

      if (d.getTime() >= firstOfMonth.getTime()) {
        monthMcqs += mcq;
        if (isMock) monthMocks += 1;
      }
    });

    return {
      todayMcqs,
      todayMocks,
      weekMcqs,
      weekMocks,
      monthMcqs,
      monthMocks,
    };
  }, [attempts]);

  // Build chart dataset based on selected timeRange
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (timeRange === "8w") {
      // 8 weekly buckets
      const weeks: {
        label: string;
        sublabel: string;
        mcqs: number;
        mocks: number;
        practice: number;
        accuracy: number | null;
      }[] = [];

      for (let i = 7; i >= 0; i--) {
        const start = new Date(today);
        start.setDate(today.getDate() - (i * 7 + 6));
        const end = new Date(today);
        end.setDate(today.getDate() - i * 7);

        let mcqs = 0;
        let mocks = 0;
        let practice = 0;
        let correct = 0;
        let answered = 0;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = formatDateKey(d);
          const data = dateMap.get(key);
          if (data) {
            mcqs += data.mcqs;
            mocks += data.mocks;
            practice += data.practice;
            correct += data.totalCorrect;
            answered += data.totalAnswered;
          }
        }

        const label = `W-${i === 0 ? "Now" : i}`;
        const sublabel = `${start.getDate()} ${start.toLocaleDateString(undefined, { month: "short" })} - ${end.getDate()} ${end.toLocaleDateString(undefined, { month: "short" })}`;

        weeks.push({
          label,
          sublabel,
          mcqs,
          mocks,
          practice,
          accuracy:
            answered > 0 ? Math.round((correct / answered) * 100) : null,
        });
      }
      return weeks;
    }

    // Daily buckets (7d, 14d, 30d)
    const daysCount = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
    const days: {
      label: string;
      sublabel: string;
      mcqs: number;
      mocks: number;
      practice: number;
      accuracy: number | null;
    }[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = formatDateKey(d);
      const data = dateMap.get(key);

      const dayName = d.toLocaleDateString(undefined, { weekday: "short" });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString(undefined, { month: "short" });

      const label =
        daysCount === 30
          ? dayNum % 5 === 0 || i === 0
            ? `${dayNum} ${monthName}`
            : ""
          : `${dayName} ${dayNum}`;
      const sublabel = `${dayName}, ${dayNum} ${monthName}`;

      days.push({
        label,
        sublabel,
        mcqs: data?.mcqs || 0,
        mocks: data?.mocks || 0,
        practice: data?.practice || 0,
        accuracy:
          data && data.totalAnswered > 0
            ? Math.round((data.totalCorrect / data.totalAnswered) * 100)
            : null,
      });
    }

    return days;
  }, [dateMap, timeRange]);

  // Compute maximum value for chart scaling
  const maxValue = useMemo(() => {
    if (metricView === "accuracy") return 100;
    if (metricView === "mocks") {
      const maxMocks = Math.max(
        ...chartData.map((d) => d.mocks + d.practice),
        0,
      );
      return Math.max(maxMocks, 4);
    }
    // metricView === 'mcqs'
    const maxMcqs = Math.max(...chartData.map((d) => d.mcqs), 0);
    return Math.max(maxMcqs, dailyTarget, 20);
  }, [chartData, metricView, dailyTarget]);

  return (
    <div className="surface-card p-5 sm:p-6 space-y-5">
      {/* Widget Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 ring-1 ring-blue-300/60">
              <BarChart3 className="h-4 w-4" />
            </span>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              MCQ Volume &amp; Mock Trends
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Daily practice volume, mock assessment velocity, and accuracy
            trajectory.
          </p>
        </div>

        {/* View Controls: Time Range & Metric Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetricView("mcqs")}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                metricView === "mcqs"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              MCQs
            </button>
            <button
              type="button"
              onClick={() => setMetricView("mocks")}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                metricView === "mocks"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mocks
            </button>
            <button
              type="button"
              onClick={() => setMetricView("accuracy")}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                metricView === "accuracy"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Accuracy %
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
            {(["7d", "14d", "30d", "8w"] as TimeRangeOption[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`rounded-md px-2 py-1 transition-all cursor-pointer uppercase text-[11px] ${
                  timeRange === range
                    ? "bg-white text-indigo-700 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Highlights Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Today&apos;s MCQs
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {overviewStats.todayMcqs}
            </span>
            <span className="text-xs text-slate-400">/ {dailyTarget} goal</span>
          </div>
          <span className="text-[10px] font-medium text-emerald-700 mt-0.5 block">
            {overviewStats.todayMocks > 0
              ? `${overviewStats.todayMocks} mock completed`
              : "Keep practicing"}
          </span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            This Week
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {overviewStats.weekMcqs}
            </span>
            <span className="text-xs text-slate-400">MCQs</span>
          </div>
          <span className="text-[10px] font-medium text-indigo-700 mt-0.5 block">
            {overviewStats.weekMocks} mock
            {overviewStats.weekMocks === 1 ? "" : "s"} taken
          </span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            This Month
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {overviewStats.monthMcqs}
            </span>
            <span className="text-xs text-slate-400">MCQs</span>
          </div>
          <span className="text-[10px] font-medium text-blue-700 mt-0.5 block">
            {overviewStats.monthMocks} mock
            {overviewStats.monthMocks === 1 ? "" : "s"} completed
          </span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Daily Average
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {chartData.length > 0
                ? Math.round(
                    chartData.reduce((acc, d) => acc + d.mcqs, 0) /
                      chartData.length,
                  )
                : 0}
            </span>
            <span className="text-xs text-slate-400">MCQs/day</span>
          </div>
          <span className="text-[10px] font-medium text-slate-500 mt-0.5 block">
            In selected {timeRange}
          </span>
        </div>
      </div>

      {/* SVG Responsive Chart View */}
      <div className="relative pt-4">
        {/* Daily Target reference dashed line when viewing MCQs */}
        {metricView === "mcqs" && (
          <div
            className="pointer-events-none absolute left-0 right-0 flex items-center z-10"
            style={{
              bottom: `${(dailyTarget / maxValue) * 160 + 32}px`,
            }}
          >
            <div className="w-full border-b border-dashed border-amber-400/80" />
            <span className="absolute right-0 -top-3 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 border border-amber-200 shadow-2xs">
              Daily Target: {dailyTarget}
            </span>
          </div>
        )}

        {/* Bar chart container */}
        <div className="flex items-end gap-1.5 sm:gap-2 h-44 sm:h-48 pt-6 pb-2 border-b border-slate-200">
          {chartData.map((d, idx) => {
            let barHeight = 0;
            let displayVal = 0;
            let barColor = "bg-blue-500 hover:bg-blue-600";

            if (metricView === "mcqs") {
              displayVal = d.mcqs;
              barHeight = (d.mcqs / maxValue) * 100;
              if (d.mcqs >= dailyTarget) {
                barColor =
                  "bg-gradient-to-t from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300";
              } else if (d.mcqs > 0) {
                barColor =
                  "bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300";
              } else {
                barColor = "bg-slate-100 hover:bg-slate-200";
                barHeight = 3; // tiny sliver for 0 values
              }
            } else if (metricView === "mocks") {
              const totalTests = d.mocks + d.practice;
              displayVal = totalTests;
              barHeight = (totalTests / maxValue) * 100;
              barColor =
                d.mocks > 0
                  ? "bg-gradient-to-t from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300"
                  : d.practice > 0
                    ? "bg-gradient-to-t from-sky-500 to-sky-300 hover:from-sky-400 hover:to-sky-200"
                    : "bg-slate-100";
              if (totalTests === 0) barHeight = 3;
            } else {
              // accuracy
              displayVal = d.accuracy || 0;
              barHeight = (displayVal / 100) * 100;
              barColor =
                displayVal >= 75
                  ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                  : displayVal >= 60
                    ? "bg-gradient-to-t from-amber-500 to-amber-300"
                    : displayVal > 0
                      ? "bg-gradient-to-t from-rose-500 to-rose-300"
                      : "bg-slate-100";
              if (displayVal === 0) barHeight = 3;
            }

            const clampedHeight = Math.min(Math.max(barHeight, 3), 100);

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredPoint(d)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="group relative flex-1 flex flex-col justify-end items-center h-full cursor-pointer"
              >
                {/* Visual Bar */}
                <div
                  className={`w-full max-w-[2.25rem] rounded-t-md transition-all duration-300 ${barColor}`}
                  style={{ height: `${clampedHeight}%` }}
                />

                {/* X-axis label */}
                <span className="mt-2 text-[10px] font-medium text-slate-400 truncate max-w-full text-center group-hover:text-slate-800 transition-colors">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hover inspection pill */}
        {hoveredPoint ? (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 sm:p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">
                {hoveredPoint.sublabel}
              </span>
              <span className="text-slate-300">·</span>
              <span>
                MCQs Solved:{" "}
                <strong className="text-blue-800 font-bold">
                  {hoveredPoint.mcqs}
                </strong>
              </span>
              <span className="text-slate-300">·</span>
              <span>
                Mocks:{" "}
                <strong className="text-indigo-800 font-bold">
                  {hoveredPoint.mocks}
                </strong>
              </span>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <span className="hidden sm:inline">
                Practice:{" "}
                <strong className="text-slate-800">
                  {hoveredPoint.practice}
                </strong>
              </span>
            </div>
            {hoveredPoint.accuracy !== null && (
              <div className="font-semibold text-emerald-800">
                Accuracy: {hoveredPoint.accuracy}%
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Hover or tap any day column to view detailed metrics breakdown.
            </span>
            <span>Scale max: {maxValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}

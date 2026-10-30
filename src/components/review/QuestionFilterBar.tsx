"use client";

import React from "react";
import { FilterTabType, SortOptionType } from "./reviewTypes";
import {
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bookmark,
  Clock,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface QuestionFilterBarProps {
  currentTab: FilterTabType;
  onSelectTab: (tab: FilterTabType) => void;
  counts: {
    all: number;
    correct: number;
    incorrect: number;
    skipped: number;
    flagged: number;
    altered: number;
    slow: number;
    sure: number;
    fiftyFifty: number;
    elimination: number;
    guess: number;
  };
  sortOption: SortOptionType;
  onChangeSort: (sort: SortOptionType) => void;
  filteredCount: number;
}

export function QuestionFilterBar({
  currentTab,
  onSelectTab,
  counts,
  sortOption,
  onChangeSort,
  filteredCount,
}: QuestionFilterBarProps) {
  const primaryTabs: {
    id: FilterTabType;
    label: string;
    count: number;
    icon?: React.ReactNode;
    colorClass: string;
    activeClass: string;
  }[] = [
    {
      id: "all",
      label: "All",
      count: counts.all,
      colorClass: "border-slate-200 text-slate-700 hover:bg-slate-50",
      activeClass: "bg-slate-900 border-slate-900 text-white shadow-2xs",
    },
    {
      id: "incorrect",
      label: "Mistakes",
      count: counts.incorrect,
      icon: <XCircle className="h-3.5 w-3.5 text-rose-600" />,
      colorClass: "border-rose-200 bg-rose-50/50 text-rose-800 hover:bg-rose-100/60",
      activeClass: "bg-rose-600 border-rose-600 text-white shadow-xs",
    },
    {
      id: "correct",
      label: "Correct",
      count: counts.correct,
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
      colorClass: "border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/60",
      activeClass: "bg-emerald-600 border-emerald-600 text-white shadow-xs",
    },
    {
      id: "skipped",
      label: "Skipped",
      count: counts.skipped,
      icon: <HelpCircle className="h-3.5 w-3.5 text-slate-400" />,
      colorClass: "border-slate-200 text-slate-600 hover:bg-slate-50",
      activeClass: "bg-slate-700 border-slate-700 text-white shadow-xs",
    },
    {
      id: "flagged",
      label: "Flagged",
      count: counts.flagged,
      icon: <Bookmark className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />,
      colorClass: "border-amber-200 bg-amber-50/50 text-amber-900 hover:bg-amber-100/60",
      activeClass: "bg-amber-600 border-amber-600 text-white shadow-xs",
    },
  ];

  const secondaryFilters: { id: FilterTabType; label: string; count: number }[] = [
    { id: "sure", label: "🎯 Sure", count: counts.sure },
    { id: "50-50", label: "⚖️ 50:50", count: counts.fiftyFifty },
    { id: "guess", label: "🎲 Guess", count: counts.guess },
    { id: "slow", label: "⏳ Slow (>90s)", count: counts.slow },
    { id: "altered", label: "🔄 Altered", count: counts.altered },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      {/* Primary Row: Essential Filters + Sorting */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Core Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {primaryTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  isActive ? tab.activeClass : tab.colorClass
                }`}
              >
                {!isActive && tab.icon}
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-black/5 text-current"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}

          {/* Reset button if filter is active */}
          {currentTab !== "all" && (
            <button
              type="button"
              onClick={() => onSelectTab("all")}
              className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              title="Clear active filter"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 text-[11px] hidden sm:inline">Sort:</span>
          <select
            value={sortOption}
            onChange={(e) => onChangeSort(e.target.value as SortOptionType)}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="qno_asc">Q. No (1 → {counts.all})</option>
            <option value="qno_desc">Q. No ({counts.all} → 1)</option>
            <option value="time_desc">Time Spent (Slowest)</option>
            <option value="time_asc">Time Spent (Fastest)</option>
          </select>
        </div>
      </div>

      {/* Secondary Nuance Pills: Confidence & Pacing Tags */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <Filter className="h-3 w-3" />
          More filters:
        </span>
        {secondaryFilters.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? "border-slate-800 bg-slate-800 text-white font-semibold shadow-2xs"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono ${
                  isActive ? "text-slate-200" : "text-slate-400"
                }`}
              >
                ({tab.count})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


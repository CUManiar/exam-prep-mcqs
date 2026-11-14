"use client";
import {
  SortOptionType,
  ReviewFilterState,
  isFilterActive,
} from "./reviewTypes";
import {
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bookmark,
  RotateCcw,
} from "lucide-react";

interface QuestionFilterBarProps {
  filters: ReviewFilterState;
  onToggleOutcome: (outcome: "incorrect" | "correct" | "skipped") => void;
  onToggleFlagged: () => void;
  onToggleConfidence: (conf: "sure" | "50-50" | "guess") => void;
  onToggleSlow: () => void;
  onToggleAltered: () => void;
  onResetFilters: () => void;
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
  filters,
  onToggleOutcome,
  onToggleFlagged,
  onToggleConfidence,
  onToggleSlow,
  onToggleAltered,
  onResetFilters,
  counts,
  sortOption,
  onChangeSort,
  filteredCount,
}: QuestionFilterBarProps) {
  const hasActive = isFilterActive(filters);

  const primaryTabs: {
    id: string;
    label: string;
    count: number;
    icon?: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    colorClass: string;
    activeClass: string;
  }[] = [
    {
      id: "all",
      label: "All",
      count: counts.all,
      isActive: !hasActive,
      onClick: onResetFilters,
      colorClass: "border-slate-200 text-slate-700 hover:bg-slate-50",
      activeClass: "bg-slate-900 border-slate-900 text-white shadow-2xs",
    },
    {
      id: "incorrect",
      label: "Mistakes",
      count: counts.incorrect,
      icon: <XCircle className="h-3.5 w-3.5 text-rose-600" />,
      isActive: filters.outcome === "incorrect",
      onClick: () => onToggleOutcome("incorrect"),
      colorClass:
        "border-rose-200 bg-rose-50/50 text-rose-800 hover:bg-rose-100/60",
      activeClass:
        "bg-rose-600 border-rose-600 text-white shadow-xs font-bold ring-2 ring-rose-300 ring-offset-1",
    },
    {
      id: "correct",
      label: "Correct",
      count: counts.correct,
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
      isActive: filters.outcome === "correct",
      onClick: () => onToggleOutcome("correct"),
      colorClass:
        "border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/60",
      activeClass:
        "bg-emerald-600 border-emerald-600 text-white shadow-xs font-bold ring-2 ring-emerald-300 ring-offset-1",
    },
    {
      id: "skipped",
      label: "Skipped",
      count: counts.skipped,
      icon: <HelpCircle className="h-3.5 w-3.5 text-slate-400" />,
      isActive: filters.outcome === "skipped",
      onClick: () => onToggleOutcome("skipped"),
      colorClass: "border-slate-200 text-slate-600 hover:bg-slate-50",
      activeClass:
        "bg-slate-700 border-slate-700 text-white shadow-xs font-bold ring-2 ring-slate-300 ring-offset-1",
    },
    {
      id: "flagged",
      label: "Flagged",
      count: counts.flagged,
      icon: <Bookmark className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />,
      isActive: Boolean(filters.flagged),
      onClick: onToggleFlagged,
      colorClass:
        "border-amber-200 bg-amber-50/50 text-amber-900 hover:bg-amber-100/60",
      activeClass:
        "bg-amber-600 border-amber-600 text-white shadow-xs font-bold ring-2 ring-amber-300 ring-offset-1",
    },
  ];

  const secondaryFilters: {
    id: string;
    label: string;
    count: number;
    isActive: boolean;
    onClick: () => void;
  }[] = [
    {
      id: "sure",
      label: "🎯 Sure",
      count: counts.sure,
      isActive: filters.confidence === "sure",
      onClick: () => onToggleConfidence("sure"),
    },
    {
      id: "50-50",
      label: "⚖️ 50:50",
      count: counts.fiftyFifty,
      isActive: filters.confidence === "50-50",
      onClick: () => onToggleConfidence("50-50"),
    },
    {
      id: "guess",
      label: "🎲 Guess",
      count: counts.guess,
      isActive: filters.confidence === "guess",
      onClick: () => onToggleConfidence("guess"),
    },
    {
      id: "slow",
      label: "⏳ Slow (>90s)",
      count: counts.slow,
      isActive: Boolean(filters.slow),
      onClick: onToggleSlow,
    },
    {
      id: "altered",
      label: "🔄 Altered",
      count: counts.altered,
      isActive: Boolean(filters.altered),
      onClick: onToggleAltered,
    },
  ];

  return (
    <div className="flex items-center justify-between gap-2 bg-slate-50/90 p-1.5 rounded-xl border border-slate-200 shadow-2xs">
      {/* Scrollable Filter Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
        {/* Reset button if any filter is active */}
        {hasActive && (
          <button
            type="button"
            onClick={onResetFilters}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
            title="Clear all active filters"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset ({filteredCount})</span>
          </button>
        )}

        {/* Primary Outcome Pills */}
        {primaryTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={tab.onClick}
            className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              tab.isActive ? tab.activeClass : tab.colorClass
            }`}
            title={`Filter by ${tab.label}`}
          >
            {!tab.isActive && tab.icon}
            <span>{tab.label}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                tab.isActive
                  ? "bg-white/20 text-white font-bold"
                  : "bg-black/5 text-current"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}

        {/* Subtle Separator */}
        <span className="h-4 w-px bg-slate-300/80 shrink-0 mx-0.5" />

        {/* Nuance & Pacing Pills */}
        {secondaryFilters.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={tab.onClick}
            className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              tab.isActive
                ? "border-slate-900 bg-slate-900 text-white font-bold shadow-2xs ring-1 ring-slate-900"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
            title={`Filter by ${tab.label}`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] font-mono ${
                tab.isActive ? "text-slate-200" : "text-slate-400"
              }`}
            >
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {/* Sort Selector */}
      <div className="shrink-0 flex items-center gap-1 pl-1 border-l border-slate-200">
        <select
          value={sortOption}
          onChange={(e) => onChangeSort(e.target.value as SortOptionType)}
          aria-label="Sort questions"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs outline-none focus:border-indigo-400 cursor-pointer"
        >
          <option value="qno_asc">Q 1 → {counts.all}</option>
          <option value="qno_desc">Q {counts.all} → 1</option>
          <option value="time_desc">Slowest</option>
          <option value="time_asc">Fastest</option>
        </select>
      </div>
    </div>
  );
}

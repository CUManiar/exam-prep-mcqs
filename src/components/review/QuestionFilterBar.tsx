"use client";
import React, { useState, useMemo } from "react";
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
  X,
  ChevronDown,
} from "lucide-react";

interface QuestionFilterBarProps {
  filters: ReviewFilterState;
  onToggleOutcome: (
    outcome: "incorrect" | "correct" | "skipped" | "partial",
  ) => void;
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
    partial?: number;
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
  onChangeLogic?: (logic: "AND" | "OR") => void;
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
  onChangeLogic,
}: QuestionFilterBarProps) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const currentLogic = filters.logic || "AND";
  const hasActive = isFilterActive(filters);

  // Active filter chips displayed in the "Current filters" summary row
  const activeChips = useMemo(() => {
    const chips: {
      id: string;
      label: string;
      count?: number;
      icon?: React.ReactNode;
      badgeStyle: string;
      onRemove: () => void;
    }[] = [];

    const selectedOutcomes =
      filters.outcomes && filters.outcomes.length > 0
        ? filters.outcomes
        : filters.outcome
          ? [filters.outcome]
          : [];

    selectedOutcomes.forEach((out) => {
      if (out === "incorrect") {
        chips.push({
          id: "incorrect",
          label: "Mistakes",
          count: counts.incorrect,
          icon: <XCircle className="h-3 w-3 text-rose-600" />,
          badgeStyle: "bg-rose-50 text-rose-800 border-rose-200",
          onRemove: () => onToggleOutcome("incorrect"),
        });
      } else if (out === "correct") {
        chips.push({
          id: "correct",
          label: "Correct",
          count: counts.correct,
          icon: <CheckCircle2 className="h-3 w-3 text-emerald-600" />,
          badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
          onRemove: () => onToggleOutcome("correct"),
        });
      } else if (out === "partial") {
        chips.push({
          id: "partial",
          label: "Partial",
          count: counts.partial ?? 0,
          icon: <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />,
          badgeStyle: "bg-amber-50 text-amber-800 border-amber-200",
          onRemove: () => onToggleOutcome("partial"),
        });
      } else if (out === "skipped") {
        chips.push({
          id: "skipped",
          label: "Skipped",
          count: counts.skipped,
          icon: <HelpCircle className="h-3 w-3 text-slate-500" />,
          badgeStyle: "bg-slate-100 text-slate-700 border-slate-300",
          onRemove: () => onToggleOutcome("skipped"),
        });
      }
    });

    const selectedConfidences =
      filters.confidences && filters.confidences.length > 0
        ? filters.confidences
        : filters.confidence
          ? [filters.confidence]
          : [];

    selectedConfidences.forEach((conf) => {
      if (conf === "sure") {
        chips.push({
          id: "sure",
          label: "Sure",
          count: counts.sure,
          icon: <span className="text-[11px]">🎯</span>,
          badgeStyle: "bg-indigo-50 text-indigo-800 border-indigo-200",
          onRemove: () => onToggleConfidence("sure"),
        });
      } else if (conf === "50-50") {
        chips.push({
          id: "50-50",
          label: "50:50",
          count: counts.fiftyFifty,
          icon: <span className="text-[11px]">⚖️</span>,
          badgeStyle: "bg-blue-50 text-blue-800 border-blue-200",
          onRemove: () => onToggleConfidence("50-50"),
        });
      } else if (conf === "guess") {
        chips.push({
          id: "guess",
          label: "Guess",
          count: counts.guess,
          icon: <span className="text-[11px]">🎲</span>,
          badgeStyle: "bg-purple-50 text-purple-800 border-purple-200",
          onRemove: () => onToggleConfidence("guess"),
        });
      }
    });

    if (filters.slow) {
      chips.push({
        id: "slow",
        label: "Slow (>90s)",
        count: counts.slow,
        icon: <span className="text-[11px]">⏳</span>,
        badgeStyle: "bg-amber-50 text-amber-900 border-amber-200",
        onRemove: onToggleSlow,
      });
    }

    if (filters.flagged) {
      chips.push({
        id: "flagged",
        label: "Flagged",
        count: counts.flagged,
        icon: <Bookmark className="h-3 w-3 text-amber-600 fill-amber-500" />,
        badgeStyle: "bg-amber-50 text-amber-900 border-amber-200",
        onRemove: onToggleFlagged,
      });
    }

    if (filters.altered) {
      chips.push({
        id: "altered",
        label: "Altered",
        count: counts.altered,
        icon: <span className="text-[11px]">🔄</span>,
        badgeStyle: "bg-cyan-50 text-cyan-800 border-cyan-200",
        onRemove: onToggleAltered,
      });
    }

    return chips;
  }, [
    filters,
    onToggleOutcome,
    onToggleConfidence,
    onToggleSlow,
    onToggleFlagged,
    onToggleAltered,
  ]);

  const toggleLogic = () => {
    if (onChangeLogic) {
      onChangeLogic(currentLogic === "AND" ? "OR" : "AND");
    }
  };

  const isOutcomeActive = (
    id: "incorrect" | "correct" | "partial" | "skipped",
  ) => filters.outcome === id || Boolean(filters.outcomes?.includes(id));

  const isConfActive = (id: "sure" | "50-50" | "guess") =>
    filters.confidence === id || Boolean(filters.confidences?.includes(id));

  const primaryOutcomeButtons: {
    id: "incorrect" | "correct" | "partial" | "skipped";
    label: string;
    count: number;
    icon?: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    baseClass: string;
    activeClass: string;
  }[] = [
    {
      id: "incorrect",
      label: "Mistakes",
      count: counts.incorrect,
      icon: <XCircle className="h-3.5 w-3.5 text-rose-600" />,
      isActive: isOutcomeActive("incorrect"),
      onClick: () => onToggleOutcome("incorrect"),
      baseClass:
        "border-rose-200 bg-white text-rose-800 hover:bg-rose-50 hover:border-rose-300",
      activeClass:
        "bg-rose-600 border-rose-600 text-white shadow-xs font-bold ring-2 ring-rose-300 ring-offset-1",
    },
    {
      id: "correct",
      label: "Correct",
      count: counts.correct,
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
      isActive: isOutcomeActive("correct"),
      onClick: () => onToggleOutcome("correct"),
      baseClass:
        "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300",
      activeClass:
        "bg-emerald-600 border-emerald-600 text-white shadow-xs font-bold ring-2 ring-emerald-300 ring-offset-1",
    },
    ...((counts.partial ?? 0) > 0
      ? [
          {
            id: "partial" as const,
            label: "Partial",
            count: counts.partial ?? 0,
            icon: (
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            ),
            isActive: isOutcomeActive("partial"),
            onClick: () => onToggleOutcome("partial"),
            baseClass:
              "border-amber-200 bg-white text-amber-800 hover:bg-amber-50 hover:border-amber-300",
            activeClass:
              "bg-amber-600 border-amber-600 text-white shadow-xs font-bold ring-2 ring-amber-300 ring-offset-1",
          },
        ]
      : []),
    {
      id: "skipped",
      label: "Skipped",
      count: counts.skipped,
      icon: <HelpCircle className="h-3.5 w-3.5 text-slate-400" />,
      isActive: isOutcomeActive("skipped"),
      onClick: () => onToggleOutcome("skipped"),
      baseClass:
        "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300",
      activeClass:
        "bg-slate-700 border-slate-700 text-white shadow-xs font-bold ring-2 ring-slate-300 ring-offset-1",
    },
  ];

  const secondaryCertaintyButtons: {
    id: string;
    label: string;
    count: number;
    icon?: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
  }[] = [
    {
      id: "sure",
      label: "🎯 Sure",
      count: counts.sure,
      isActive: isConfActive("sure"),
      onClick: () => onToggleConfidence("sure"),
    },
    {
      id: "50-50",
      label: "⚖️ 50:50",
      count: counts.fiftyFifty,
      isActive: isConfActive("50-50"),
      onClick: () => onToggleConfidence("50-50"),
    },
    {
      id: "guess",
      label: "🎲 Guess",
      count: counts.guess,
      isActive: isConfActive("guess"),
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
      id: "flagged",
      label: "Flagged",
      icon: (
        <Bookmark className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
      ),
      count: counts.flagged,
      isActive: Boolean(filters.flagged),
      onClick: onToggleFlagged,
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
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden w-full">
      {/* Top Header: Current Filtered Criteria + Mobile Collapse + Logic Mode + Sort */}
      <div className="p-2.5 sm:px-3 sm:py-2 border-b border-slate-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
          {/* Current filters breadcrumb / summary */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="font-semibold text-slate-400 shrink-0">
              Current filters:
            </span>
            {hasActive ? (
              <>
                {activeChips.map((chip, idx) => (
                  <span
                    key={chip.id}
                    className="inline-flex items-center gap-1"
                  >
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={toggleLogic}
                        title={`Combined using ${currentLogic} logic. Click to switch to ${
                          currentLogic === "AND" ? "OR" : "AND"
                        }.`}
                        className="px-1.5 py-0.2 rounded text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                      >
                        {currentLogic}
                      </button>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-[11px] border shadow-2xs ${chip.badgeStyle}`}
                    >
                      {chip.icon}
                      <span>{chip.label}</span>
                      {chip.count !== undefined && (
                        <span className="text-[10px] font-mono opacity-80">
                          ({chip.count})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={chip.onRemove}
                        className="hover:opacity-75 cursor-pointer ml-0.5 p-0.5 rounded"
                        title={`Remove ${chip.label} filter`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs shrink-0">
                  <span>Match count:</span>
                  <span className="font-mono font-extrabold text-xs">
                    {filteredCount}
                  </span>
                </span>
                <span className="text-slate-400 font-normal shrink-0">
                  &bull; {filteredCount} of {counts.all}{" "}
                  {counts.all === 1 ? "question" : "questions"}
                </span>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="cursor-pointer font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors shrink-0 ml-1"
                >
                  Reset all
                </button>
              </>
            ) : (
              <span className="text-slate-400">
                Showing all {counts.all} questions &bull; No active restrictions
              </span>
            )}
          </div>

          {/* Right Controls: Mobile collapse toggle, AND/OR logic, Sort selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0">
            {/* Mobile Collapse Button */}
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className="sm:hidden cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-indigo-700 hover:bg-slate-50 border border-indigo-200 transition-colors shadow-2xs shrink-0"
            >
              <Filter className="h-3 w-3 text-indigo-600" />
              <span>
                {isMobileFiltersOpen ? "Collapse filters" : "Filter options"}
              </span>
              {activeChips.length > 0 && (
                <span className="h-4 w-4 rounded-full bg-indigo-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                  {activeChips.length}
                </span>
              )}
              <ChevronDown
                className={`h-3 w-3 transition-transform ${
                  isMobileFiltersOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* AND / OR Combination Logic Switch */}
            <div className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <span className="hidden sm:inline text-slate-400 font-medium">
                Logic:
              </span>
              <div
                className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-2xs"
                title="Combine filters using AND (must match all active) or OR (matches any active)"
              >
                <button
                  type="button"
                  onClick={() => onChangeLogic && onChangeLogic("AND")}
                  className={`cursor-pointer px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    currentLogic === "AND"
                      ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  AND
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLogic && onChangeLogic("OR")}
                  className={`cursor-pointer px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    currentLogic === "OR"
                      ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  OR
                </button>
              </div>
            </div>

            {/* Sort Selector */}
            <select
              value={sortOption}
              onChange={(e) => onChangeSort(e.target.value as SortOptionType)}
              aria-label="Sort questions"
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-2xs outline-none focus:border-indigo-400 cursor-pointer shrink-0"
            >
              <option value="qno_asc">Q 1 → {counts.all}</option>
              <option value="qno_desc">Q {counts.all} → 1</option>
              <option value="time_desc">Slowest</option>
              <option value="time_asc">Fastest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter Rows with Small Gap and Distinct Highlighting */}
      <div
        className={`p-2.5 sm:p-3 bg-slate-50/50 space-y-2.5 ${
          isMobileFiltersOpen ? "block" : "hidden sm:block"
        }`}
      >
        {/* Row 1: Outcomes */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 w-16 sm:w-20 shrink-0">
            Outcome:
          </span>
          <div className="inline-flex items-center gap-1.5 flex-wrap">
            {/* All Questions Button */}
            <button
              type="button"
              onClick={onResetFilters}
              className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                !hasActive
                  ? "bg-slate-900 text-white shadow-2xs font-semibold"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              All
              <span
                className={`text-[10px] font-mono rounded px-1 ${
                  !hasActive
                    ? "bg-white/20 text-white font-bold"
                    : "text-slate-400 bg-slate-100"
                }`}
              >
                {counts.all}
              </span>
            </button>

            {/* Outcome Pills */}
            {primaryOutcomeButtons.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={tab.onClick}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all border ${
                  tab.isActive ? tab.activeClass : tab.baseClass
                }`}
                title={`Filter by ${tab.label}`}
              >
                {!tab.isActive && tab.icon}
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono rounded px-1 ${
                    tab.isActive
                      ? "bg-white/20 text-white font-bold"
                      : "text-current bg-black/5"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Confidence & Diagnostics */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 w-16 sm:w-20 shrink-0">
            Certainty:
          </span>
          <div className="inline-flex items-center gap-1.5 flex-wrap">
            {secondaryCertaintyButtons.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={tab.onClick}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all border ${
                  tab.isActive
                    ? "border-slate-900 bg-slate-900 text-white font-bold shadow-xs ring-1 ring-slate-900"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                }`}
                title={`Filter by ${tab.label}`}
              >
                {tab.icon && !tab.isActive && tab.icon}
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono rounded px-1 ${
                    tab.isActive
                      ? "bg-white/20 text-white font-bold"
                      : "text-slate-400 bg-slate-100"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

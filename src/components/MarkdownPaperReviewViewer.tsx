"use client";

import React, { useRef, useEffect, useState } from "react";
import { QuestionPaper, ParsedQuestion, QuestionAnswer } from "../lib/types";
import { ParsedMarkdownHeader } from "../lib/markdownPaperParser";
import { MatchingItemsTable } from "./MatchingItemsTable";
import { formatTimeSeconds, getPaperDisplayTitle } from "../lib/defaults";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Clock,
  Check,
  X,
  Info,
  HelpCircle,
  FileText,
  RotateCcw,
} from "lucide-react";

interface MarkdownPaperReviewViewerProps {
  paper: QuestionPaper;
  questions: ParsedQuestion[];
  answers: Record<number, QuestionAnswer>;
  explanations?: Record<number, string>;
  instructions?: string[];
  header?: ParsedMarkdownHeader | string[] | null;
  activeQuestionNo?: number | null;
  onSelectQuestion?: (qNo: number) => void;
  onClose?: () => void;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}

export function MarkdownPaperReviewViewer({
  paper,
  questions = [],
  answers = {},
  explanations = {},
  instructions = [],
  header,
  activeQuestionNo,
  onSelectQuestion,
  onClose,
  hasActiveFilters,
  onResetFilters,
}: MarkdownPaperReviewViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"all" | "single">("all");
  const [showPaperDetails, setShowPaperDetails] = useState<boolean>(false);

  // Auto-scroll to selected question inside the paper container only (never scrolling the window)
  useEffect(() => {
    if (!activeQuestionNo || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const targetEl = document.getElementById(`paper-q-${activeQuestionNo}`);
    if (container && targetEl) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const targetTop = targetRect.top - containerRect.top + container.scrollTop;
      container.scrollTo({ top: Math.max(0, targetTop - 12), behavior: "smooth" });
    }
  }, [activeQuestionNo]);

  const displayTitle = getPaperDisplayTitle(paper);
  const visibleQuestions =
    viewMode === "single" && activeQuestionNo
      ? questions.filter((q) => q.questionNo === activeQuestionNo)
      : questions;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-slate-200 shrink-0 gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-800 min-w-0">
          <span
            className="truncate max-w-[150px] sm:max-w-[220px]"
            title={displayTitle}
          >
            {displayTitle}
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400 font-normal">
            · {questions.length} questions
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(
              [
                ["all", "All questions"],
                ["single", "One question"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${viewMode === mode ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Quick Question Jump Dropdown */}
          {questions.length > 0 && (
            <select
              value={activeQuestionNo || ""}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  onSelectQuestion?.(val);
                }
              }}
              className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <option value="">Jump to Q...</option>
              {questions.map((q) => {
                const ans = answers[q.questionNo];
                const marker = ans?.isCorrect ? "✓" : ans?.selected ? "✗" : "○";
                return (
                  <option key={q.questionNo} value={q.questionNo}>
                    Q{q.questionNo} {marker}
                  </option>
                );
              })}
            </select>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Hide question paper preview"
            >
              ✕ Hide
            </button>
          )}
        </div>
      </div>

      {/* 2. Scrollable Paper Body */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 bg-slate-100/60"
      >
        {/* Exam Header & Rules (Collapsible, collapsed by default to save vertical space) */}
        {(header || instructions.length > 0 || paper.instructions?.length) && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setShowPaperDetails((prev) => !prev)}
              className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                <span>Paper details & marking rules</span>
              </div>
              <span className="text-[11px] text-indigo-600 font-medium">
                {showPaperDetails ? "Hide rules ▲" : "Show rules ▼"}
              </span>
            </button>

            {showPaperDetails && (
              <div className="p-3.5 border-t border-slate-200 space-y-3 bg-slate-50/50">
                {/* Key stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200 border-y border-slate-200 py-2 text-xs bg-white rounded-lg">
                  <div className="px-2 text-center first:pl-0">
                    <span className="text-[10px] font-medium text-slate-400 block">
                      Questions
                    </span>
                    <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                      {paper.totalQuestions || questions.length}
                    </span>
                  </div>
                  <div className="px-2 text-center">
                    <span className="text-[10px] font-medium text-slate-400 block">
                      Time Limit
                    </span>
                    <span className="font-mono font-semibold text-indigo-700 mt-0.5 block">
                      {paper.timeMinutes || 120}m
                    </span>
                  </div>
                  <div className="px-2 text-center">
                    <span className="text-[10px] font-medium text-slate-400 block">
                      Per Correct
                    </span>
                    <span className="font-mono font-semibold text-emerald-700 mt-0.5 block">
                      +{paper.correctMarks || 2.0}m
                    </span>
                  </div>
                  <div className="px-2 text-center last:pr-0">
                    <span className="text-[10px] font-medium text-slate-400 block">
                      Penalty
                    </span>
                    <span className="font-mono font-semibold text-rose-700 mt-0.5 block">
                      -{paper.incorrectMarks || 0.667}m
                    </span>
                  </div>
                </div>

                {/* Instructions list */}
                {((instructions && instructions.length > 0) ||
                  (paper.instructions && paper.instructions.length > 0)) && (
                  <div className="pt-1 space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block">
                      Instructions
                    </span>
                    <ul className="space-y-1">
                      {(instructions.length > 0
                        ? instructions
                        : paper.instructions || []
                      ).map((rule, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-xs text-slate-700 leading-relaxed"
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Questions List */}
        {questions.length === 0 ? (
          hasActiveFilters ? (
            <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-3.5 my-4">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <RotateCcw className="h-5 w-5 text-slate-500" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">
                  No matching questions
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No questions in this paper match the selected filter combination.
                </p>
              </div>
              {onResetFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-2">
              <Info className="h-8 w-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">
                No questions found for this paper
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                The markdown content for this paper could not be parsed into
                individual questions.
              </p>
            </div>
          )
        ) : (
          visibleQuestions.map((q) => {
            const ans = answers[q.questionNo];
            const userSelected = ans?.selected?.toUpperCase() || null;
            const isCloze = Object.keys(q.options || {}).length === 0;
            const correctOpt =
              paper.answerKey?.[q.questionNo]?.toUpperCase() ||
              q.answer?.toUpperCase() ||
              ans?.correctAnswer?.toUpperCase() ||
              null;

            const isAnswered = Boolean(ans?.selected?.trim());
            const isCorrect = isAnswered && ans?.isCorrect === true;
            const isWrong = isAnswered && ans?.isCorrect === false;
            const isSelectedActive = activeQuestionNo === q.questionNo;

            const explanationText =
              q.explanation ||
              explanations[q.questionNo] ||
              paper.explanations?.[q.questionNo] ||
              ans?.explanation;

            const timeSpent = ans?.timeSpentSeconds || 0;
            const correctMarksValue = paper.correctMarks ?? 2.0;
            const incorrectMarksValue = paper.incorrectMarks ?? 0.667;

            return (
              <div
                key={q.questionNo}
                id={`paper-q-${q.questionNo}`}
                className={`p-3.5 sm:p-4 rounded-xl bg-white border transition-all duration-150 shadow-xs ${
                  isSelectedActive
                    ? "border-slate-900 ring-2 ring-slate-900/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Top Question Status Bar */}
                <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      Q{q.questionNo}
                    </span>

                    {/* Status Pill */}
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Correct · +{correctMarksValue}</span>
                      </span>
                    ) : isWrong ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full shadow-2xs">
                        <XCircle className="h-3 w-3 text-rose-600" />
                        <span>
                          Incorrect · -{incorrectMarksValue} · Picked{" "}
                          {userSelected}
                        </span>
                      </span>
                    ) : isCloze && isAnswered ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full shadow-2xs">
                        <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                        <span>Answer recorded</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                        <HelpCircle className="h-3 w-3 text-slate-400" />
                        <span>Skipped · 0 pts</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {timeSpent > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{formatTimeSeconds(timeSpent)}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Prompt */}
                <p className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap mt-2.5">
                  {q.text}
                </p>

                <MatchingItemsTable
                  items={q.matchingItems}
                  headers={q.matchingHeaders}
                />

                {/* Cloze / Fill-in-the-blank response strip */}
                {isCloze && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Your submitted response
                      </span>
                      <div className="font-mono font-semibold text-slate-900 whitespace-pre-wrap break-words">
                        {ans?.selected && ans.selected.trim() ? (
                          ans.selected
                        ) : (
                          <span className="text-slate-400 italic font-sans font-normal">
                            No response entered
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Expected key / solution
                      </span>
                      <div className="font-mono font-bold text-emerald-950 whitespace-pre-wrap break-words">
                        {correctOpt || "Refer to solution below"}
                      </div>
                    </div>
                  </div>
                )}

                {/* MCQ Options Grid */}
                {Object.keys(q.options || {}).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-0.5">
                    {Object.entries(q.options).map(([optKey, optText]) => {
                      const normKey = optKey.toUpperCase();
                      const isUserPick = userSelected === normKey;
                      const isRightAnswer = correctOpt === normKey;

                      let optStyle =
                        "bg-slate-50 border-slate-200 text-slate-800";
                      let badgeEl: React.ReactNode = null;

                      if (isRightAnswer && isUserPick) {
                        optStyle =
                          "bg-emerald-50 border-2 border-emerald-500 text-emerald-950 font-semibold shadow-2xs";
                        badgeEl = (
                          <span className="text-[10px] font-bold text-emerald-800 ml-auto flex items-center gap-0.5 shrink-0 bg-emerald-100 px-1.5 py-0.5 rounded">
                            <Check className="h-3 w-3 text-emerald-700" /> Your
                            answer
                          </span>
                        );
                      } else if (isRightAnswer) {
                        optStyle =
                          "bg-emerald-50/80 border-2 border-emerald-400 text-emerald-950 font-semibold shadow-2xs";
                        badgeEl = (
                          <span className="text-[10px] font-bold text-emerald-800 ml-auto flex items-center gap-0.5 shrink-0 bg-emerald-100 px-1.5 py-0.5 rounded">
                            <Check className="h-3 w-3 text-emerald-700" />{" "}
                            Correct
                          </span>
                        );
                      } else if (isUserPick) {
                        optStyle =
                          "bg-rose-50 border-2 border-rose-500 text-rose-950 font-semibold shadow-2xs";
                        badgeEl = (
                          <span className="text-[10px] font-bold text-rose-800 ml-auto flex items-center gap-0.5 shrink-0 bg-rose-100 px-1.5 py-0.5 rounded">
                            <X className="h-3 w-3 text-rose-700" /> Your answer
                          </span>
                        );
                      }

                      return (
                        <div
                          key={optKey}
                          className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs leading-relaxed transition-colors ${optStyle}`}
                        >
                          <span
                            className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isRightAnswer
                                ? "bg-emerald-600 text-white"
                                : isUserPick
                                  ? "bg-rose-600 text-white"
                                  : "bg-slate-200 text-slate-800"
                            }`}
                          >
                            {optKey}
                          </span>
                          <span className="whitespace-pre-wrap flex-1">
                            {optText}
                          </span>
                          {badgeEl}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Student Note (Hero Subject Matter Highlight - Above Explanation) */}
                {ans?.note && ans.note.trim() && (
                  <div className="mt-3 rounded-xl bg-amber-50 border border-amber-300 p-3 text-xs text-slate-900 font-mono shadow-2xs flex items-start gap-2.5">
                    <FileText className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
                    <div className="flex-1 leading-relaxed whitespace-pre-wrap">
                      <strong className="text-amber-900 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                        Student Note
                      </strong>
                      {ans.note.trim()}
                    </div>
                  </div>
                )}

                {/* Explanation Box (Below Student Note, Improvised Typography) */}
                {explanationText && (
                  <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200/90 p-3.5 sm:p-4 space-y-2 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <Lightbulb className="h-4 w-4 text-indigo-600" />
                      <span>Solution & Explanation</span>
                    </div>
                    <p className="text-sm sm:text-[15px] text-slate-900 leading-relaxed whitespace-pre-wrap font-normal">
                      {explanationText}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

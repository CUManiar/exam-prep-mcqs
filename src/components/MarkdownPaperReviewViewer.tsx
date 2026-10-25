"use client";

import React, { useRef, useEffect } from "react";
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
}: MarkdownPaperReviewViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected question when activeQuestionNo changes
  useEffect(() => {
    if (!activeQuestionNo || !scrollContainerRef.current) return;
    const targetEl = document.getElementById(`review-q-${activeQuestionNo}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeQuestionNo]);

  const displayTitle = getPaperDisplayTitle(paper);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-slate-200 shrink-0 gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-800 min-w-0">
          <span className="truncate max-w-[150px] sm:max-w-[220px]" title={displayTitle}>
            {displayTitle}
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400 font-normal">
            · {questions.length} questions
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
              className="text-xs font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              title="Hide question paper preview"
            >
              ✕ Hide
            </button>
          )}
        </div>
      </div>

      {/* 2. Sticky Question Palette / Navigation Chips */}
      {questions.length > 0 && (
        <div className="px-3 py-1.5 bg-white border-b border-slate-200 overflow-x-auto no-scrollbar flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Questions:
          </span>
          {questions.map((q) => {
            const ans = answers[q.questionNo];
            const isAnswered = ans?.selected !== null && ans?.selected !== undefined;
            const isCorrect = isAnswered && ans?.isCorrect === true;
            const isWrong = isAnswered && ans?.isCorrect === false;
            const isActive = activeQuestionNo === q.questionNo;

            return (
              <button
                key={q.questionNo}
                type="button"
                onClick={() => onSelectQuestion?.(q.questionNo)}
                className={`cursor-pointer px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all shrink-0 ${
                  isActive
                    ? "ring-2 ring-slate-900 scale-105"
                    : ""
                } ${
                  isCorrect
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                    : isWrong
                      ? "bg-rose-50 text-rose-800 border border-rose-300"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
                title={`Q${q.questionNo}: ${isCorrect ? "Correct" : isWrong ? "Incorrect" : "Unattempted"}`}
              >
                {q.questionNo}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Scrollable Paper Body */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50"
      >
        {/* Exam Header & Rules (if available) */}
        {(header || instructions.length > 0 || paper.instructions?.length) && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">
                <BookOpen className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-xs font-semibold text-slate-900">
                Paper details
              </h3>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200 border-y border-slate-200 py-2 text-xs">
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
              <div className="border-t border-slate-200 pt-3 space-y-1.5 mt-2">
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block">
                  Instructions
                </span>
                <ul className="space-y-1">
                  {(instructions.length > 0 ? instructions : paper.instructions || []).map(
                    (rule, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-1.5 text-xs text-slate-700 leading-relaxed"
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{rule}</span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-2">
            <Info className="h-8 w-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">
              No questions found for this paper
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              The markdown content for this paper could not be parsed into individual questions.
            </p>
          </div>
        ) : (
          questions.map((q) => {
            const ans = answers[q.questionNo];
            const userSelected = ans?.selected?.toUpperCase() || null;
            const correctOpt =
              paper.answerKey?.[q.questionNo]?.toUpperCase() ||
              q.answer?.toUpperCase() ||
              ans?.correctAnswer?.toUpperCase() ||
              null;

            const isAnswered = userSelected !== null;
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
                id={`review-q-${q.questionNo}`}
                className={`p-4 sm:p-5 rounded-xl bg-white border transition-colors duration-200 ${
                  isSelectedActive
                    ? "border-slate-900 ring-1 ring-slate-900/10"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Top Question Status Bar */}
                <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-900">
                      Q{q.questionNo}
                    </span>

                    {/* Status Pill */}
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Correct · +{correctMarksValue}</span>
                      </span>
                    ) : isWrong ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-800">
                        <XCircle className="h-3 w-3 text-rose-600" />
                        <span>Incorrect · -{incorrectMarksValue} · {userSelected}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                        <HelpCircle className="h-3 w-3 text-slate-400" />
                        <span>Skipped · 0</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {timeSpent > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{formatTimeSeconds(timeSpent)}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Prompt */}
                <p className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap mt-3">
                  {q.text}
                </p>

                <MatchingItemsTable
                  items={q.matchingItems}
                  headers={q.matchingHeaders}
                />

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3.5 pt-1">
                  {Object.entries(q.options).map(([optKey, optText]) => {
                    const normKey = optKey.toUpperCase();
                    const isUserPick = userSelected === normKey;
                    const isRightAnswer = correctOpt === normKey;

                    let optStyle =
                      "bg-slate-50/70 border-slate-200 text-slate-700";
                    let badgeEl: React.ReactNode = null;

                    if (isRightAnswer && isUserPick) {
                      optStyle =
                        "bg-emerald-50/90 border-emerald-300 text-emerald-950 font-medium ring-1 ring-emerald-400/30";
                        badgeEl = (
                        <span className="text-[10px] font-medium text-emerald-700 ml-auto flex items-center gap-0.5 shrink-0">
                          <Check className="h-3 w-3" /> Your answer
                        </span>
                      );
                    } else if (isRightAnswer) {
                      optStyle =
                        "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium";
                      badgeEl = (
                        <span className="text-[10px] font-medium text-emerald-700 ml-auto flex items-center gap-0.5 shrink-0">
                          <Check className="h-3 w-3" /> Answer
                        </span>
                      );
                    } else if (isUserPick) {
                      optStyle =
                        "bg-rose-50/90 border-rose-300 text-rose-950 font-medium ring-1 ring-rose-400/30";
                      badgeEl = (
                        <span className="text-[10px] font-medium text-rose-700 ml-auto flex items-center gap-0.5 shrink-0">
                          <X className="h-3 w-3" /> Your answer
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
                                : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {optKey}
                        </span>
                        <span className="whitespace-pre-wrap flex-1">{optText}</span>
                        {badgeEl}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                {explanationText && (
                  <div className="mt-3.5 rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <Lightbulb className="h-3.5 w-3.5 text-slate-500" />
                      <span>Solution</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pl-5">
                      {explanationText}
                    </p>
                  </div>
                )}

                {/* Candidate Note (if written during session) */}
                {ans?.note && ans.note.trim() && (
                  <div className="mt-2.5 rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-700 flex items-start gap-1.5">
                    <span className="font-semibold text-slate-900 shrink-0">
                      Note:
                    </span>
                    <span className="italic whitespace-pre-wrap">
                      {ans.note.trim()}
                    </span>
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

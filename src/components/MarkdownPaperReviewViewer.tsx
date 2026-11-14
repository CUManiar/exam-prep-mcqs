"use client";

import { useRef, useEffect, useState } from "react";
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
  Sparkles,
  History,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { HtmlExplanation } from "./HtmlExplanation";

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
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );

  const currentIndex = questions.findIndex(
    (q) =>
      q.questionNo === (activeQuestionNo || (questions[0]?.questionNo ?? 1)),
  );

  const handleNextQuestion = () => {
    if (currentIndex >= 0 && currentIndex < questions.length - 1) {
      onSelectQuestion?.(questions[currentIndex + 1].questionNo);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      onSelectQuestion?.(questions[currentIndex - 1].questionNo);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    if (
      deltaTime < 650 &&
      Math.abs(deltaX) > 45 &&
      Math.abs(deltaX) > Math.abs(deltaY) * 1.3
    ) {
      if (deltaX < 0) {
        handleNextQuestion();
      } else {
        handlePrevQuestion();
      }
    }
  };

  const correctCount = questions.filter(
    (q) => answers[q.questionNo]?.isCorrect === true,
  ).length;
  const wrongCount = questions.filter(
    (q) => answers[q.questionNo]?.isCorrect === false,
  ).length;
  const skippedCount = questions.filter(
    (q) => !answers[q.questionNo]?.selected?.trim(),
  ).length;
  const flaggedCount = questions.filter(
    (q) => Boolean(answers[q.questionNo]?.flagged),
  ).length;

  // Auto-scroll to selected question inside the paper container only (never scrolling the window)
  useEffect(() => {
    if (!activeQuestionNo || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const targetEl = document.getElementById(`paper-q-${activeQuestionNo}`);
    if (container && targetEl) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const targetTop =
        targetRect.top - containerRect.top + container.scrollTop;
      container.scrollTo({
        top: Math.max(0, targetTop - 12),
        behavior: "smooth",
      });
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
      <div className="flex items-center justify-between px-3 sm:px-3.5 py-1.5 sm:py-2 bg-white border-b border-slate-200 shrink-0 gap-2">
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-800 min-w-0">
          <span
            className="truncate max-w-[150px] sm:max-w-[220px]"
            title={displayTitle}
          >
            {displayTitle}
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            · {questions.length} questions
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-1.5 sm:gap-2 shrink-0">
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
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  viewMode === mode
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Question Palette Trigger Button */}
          {questions.length > 0 && (
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Open Visual Question Palette"
            >
              <Grid3X3 className="h-3.5 w-3.5 text-indigo-600" />
              <span>
                {activeQuestionNo ? `Q${activeQuestionNo}` : "Palette"} (
                {questions.length})
              </span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:inline-flex text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Hide question paper preview"
            >
              ✕ Hide
            </button>
          )}
        </div>
      </div>

      {/* 2. Scrollable Paper Body with Touch Swipe Listener */}
      <div
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
                  No questions in this paper match the selected filter
                  combination.
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
            const isPartial =
              isAnswered && ans?.subjectiveAssessment === "partial";
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
                    ) : isPartial ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shadow-2xs">
                        <span>
                          Partial · +
                          {(
                            ans?.subjectiveMarks ?? correctMarksValue * 0.5
                          ).toFixed(1)}{" "}
                          pts
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

                    {(q.previousYears || ans?.previousYears) && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shadow-2xs">
                        <History className="h-3 w-3 text-amber-600" />
                        <span>PYQ: {q.previousYears || ans?.previousYears}</span>
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
                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-indigo-600" />
                        <span>Solution & Explanation</span>
                      </div>
                      <a
                        href={`/revision?paperId=${encodeURIComponent(paper.id)}&q=${q.questionNo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-[11px] font-semibold transition-colors shadow-2xs"
                        title="Open question in AI Revision"
                      >
                        <Sparkles className="h-3 w-3 text-indigo-600" />
                        <span>Discuss with AI</span>
                      </a>
                    </div>
                    <HtmlExplanation
                      text={explanationText}
                      className="text-sm sm:text-[15px] text-slate-900"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Sticky Question Navigator for Single Question Mode */}
        {viewMode === "single" && questions.length > 0 && (
          <div className="sticky bottom-0 z-20 -mx-3.5 -mb-3.5 sm:-mx-5 sm:-mb-5 p-2.5 sm:p-3 bg-white/95 backdrop-blur-xs border-t border-slate-200 flex items-center justify-between gap-2 shadow-md">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={handlePrevQuestion}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              <span>
                Q{activeQuestionNo || 1} of {questions.length}
              </span>
            </button>

            <button
              type="button"
              disabled={currentIndex >= questions.length - 1}
              onClick={handleNextQuestion}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-xs cursor-pointer"
            >
              <span className="hidden sm:inline">Next Question</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Visual Question Palette Drawer / Bottom Sheet */}
      {isPaletteOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:justify-center lg:items-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsPaletteOpen(false)}
          />

          {/* Modal / Sheet Container */}
          <div className="relative z-10 flex max-h-[85vh] lg:max-h-[80vh] w-full lg:max-w-xl flex-col rounded-t-3xl lg:rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Question Palette ({questions.length} Questions)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close palette"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status Legend */}
            <div className="flex items-center gap-3 overflow-x-auto border-b border-slate-100 px-4 py-2 text-[11px] font-medium text-slate-600 shrink-0">
              <span className="inline-flex items-center gap-1 shrink-0">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                Correct ({correctCount})
              </span>
              <span className="inline-flex items-center gap-1 shrink-0">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                Mistakes ({wrongCount})
              </span>
              <span className="inline-flex items-center gap-1 shrink-0">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                Skipped ({skippedCount})
              </span>
              {flaggedCount > 0 && (
                <span className="inline-flex items-center gap-1 shrink-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Flagged ({flaggedCount})
                </span>
              )}
            </div>

            {/* Question Grid */}
            <div className="overflow-y-auto p-4 max-h-[55vh]">
              <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 gap-2">
                {questions.map((q) => {
                  const ans = answers[q.questionNo];
                  const isCur = activeQuestionNo === q.questionNo;
                  const isAnswered = Boolean(ans?.selected?.trim());
                  const isCorrect = isAnswered && ans?.isCorrect === true;
                  const isWrong = isAnswered && ans?.isCorrect === false;
                  const isFlagged = Boolean(ans?.flagged);

                  let badgeColor =
                    "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200";

                  if (isCorrect) {
                    badgeColor =
                      "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs";
                  } else if (isWrong) {
                    badgeColor =
                      "bg-rose-600 text-white border-rose-600 font-bold shadow-xs";
                  } else if (isAnswered) {
                    badgeColor =
                      "bg-indigo-600 text-white border-indigo-600 font-bold";
                  }

                  if (isCur) {
                    badgeColor +=
                      " ring-2 ring-indigo-600 ring-offset-2 scale-105 font-black";
                  }

                  return (
                    <button
                      key={q.questionNo}
                      type="button"
                      onClick={() => {
                        onSelectQuestion?.(q.questionNo);
                        setIsPaletteOpen(false);
                      }}
                      className={`relative flex h-11 items-center justify-center rounded-xl border text-xs transition-all ${badgeColor}`}
                    >
                      <span>{q.questionNo}</span>
                      {isFlagged && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 ring-1 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-slate-50 rounded-b-3xl">
              <span className="text-xs text-slate-500">
                Tap any question to review
              </span>
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

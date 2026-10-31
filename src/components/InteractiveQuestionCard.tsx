"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { QuestionPaper, ParsedQuestion, QuestionAnswer } from "../lib/types";
import { MatchingItemsTable } from "./MatchingItemsTable";
import { HtmlExplanation } from "./HtmlExplanation";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Bookmark,
  ArrowRight,
  Lightbulb,
  Info,
  Clock,
  Sparkles,
  RotateCcw,
} from "lucide-react";

interface InteractiveQuestionCardProps {
  paper: QuestionPaper;
  currentQuestion: number | null;
  currentAnswer?: QuestionAnswer;
  mode: "practice" | "mock";
  idleTimeSeconds: number;
  fontScale?: "normal" | "large" | "xlarge";
  confidenceCounts?: {
    sure: number;
    fiftyFifty: number;
    elimination: number;
    guess: number;
    flagged: number;
  };
  onEscapeBlur?: () => void;
  onSelectOption: (qNo: number, option: string) => void;
  onUpdateAnswer: (qNo: number, answer: string) => void;
  onClearOption: (qNo: number) => void;
  onNavigateQuestion: (qNo: number) => void;
  onStartExam: () => void;
}

interface ClozeAnswerInputProps {
  questionNo: number;
  initialValue: string;
  onSave: (qNo: number, value: string) => void;
  onEscapeBlur?: () => void;
}

function ClozeAnswerInput({
  questionNo,
  initialValue,
  onSave,
  onEscapeBlur,
}: ClozeAnswerInputProps) {
  const [draft, setDraft] = useState<string>(initialValue);
  const draftRef = useRef<string>(initialValue);
  const savedRef = useRef<string>(initialValue);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  });

  useEffect(() => {
    setDraft(initialValue);
    draftRef.current = initialValue;
    savedRef.current = initialValue;
  }, [initialValue, questionNo]);

  const handleFlush = useCallback(() => {
    const current = draftRef.current.trim();
    if (current !== savedRef.current.trim()) {
      savedRef.current = draftRef.current;
      onSaveRef.current(questionNo, draftRef.current);
    }
  }, [questionNo]);

  useEffect(() => {
    return () => {
      const current = draftRef.current.trim();
      if (current !== savedRef.current.trim()) {
        savedRef.current = draftRef.current;
        onSaveRef.current(questionNo, draftRef.current);
      }
    };
  }, [questionNo]);

  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex items-center justify-between px-1">
        <label
          htmlFor={`cloze-answer-${questionNo}`}
          className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block"
        >
          Your Answer
        </label>
        <span className="text-[10px] font-mono font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
          T to focus • Esc to exit
        </span>
      </div>
      <textarea
        id={`cloze-answer-${questionNo}`}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          draftRef.current = event.target.value;
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onEscapeBlur?.();
            (e.target as HTMLElement).blur();
          }
        }}
        onBlur={handleFlush}
        rows={2}
        placeholder="Type a one- or two-line answer..."
        className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 shadow-2xs outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
      />
      <p className="px-1 text-[11px] text-slate-400">
        This is a free-text cloze question. No options are provided. Answer is
        saved when switching questions.
      </p>
    </div>
  );
}

export function InteractiveQuestionCard({
  paper,
  currentQuestion,
  currentAnswer,
  mode,
  idleTimeSeconds,
  fontScale = "normal",
  confidenceCounts,
  onEscapeBlur,
  onSelectOption,
  onUpdateAnswer,
  onClearOption,
  onNavigateQuestion,
  onStartExam,
}: InteractiveQuestionCardProps) {
  const [showExplanationManual, setShowExplanationManual] =
    useState<boolean>(false);
  const questions = paper.parsedQuestions || [];

  // 1. INSTRUCTIONS / BUFFER SCREEN (When currentQuestion is null)
  if (currentQuestion === null) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 flex flex-col justify-center items-center">
        <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in">
          {/* Header */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Interactive Markdown Paper</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {paper.title || paper.label}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {paper.subject} • {paper.year} Examination
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-center">
              <span className="text-[11px] font-medium text-slate-400 block">
                Questions
              </span>
              <span className="text-base font-bold text-slate-800 font-mono mt-0.5 block">
                {paper.totalQuestions}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-center">
              <span className="text-[11px] font-medium text-slate-400 block">
                Time
              </span>
              <span className="text-base font-bold text-slate-800 font-mono mt-0.5 block">
                {paper.timeMinutes}m
              </span>
            </div>
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 text-center">
              <span className="text-[11px] font-medium text-emerald-600 block">
                Correct
              </span>
              <span className="text-base font-bold text-emerald-800 font-mono mt-0.5 block">
                +{paper.correctMarks}m
              </span>
            </div>
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-3.5 text-center">
              <span className="text-[11px] font-medium text-rose-600 block">
                Wrong Penalty
              </span>
              <span className="text-base font-bold text-rose-800 font-mono mt-0.5 block">
                -{paper.incorrectMarks}m
              </span>
            </div>
          </div>

          {/* Instructions List */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 text-xs font-bold uppercase tracking-wider">
              <Info className="h-4 w-4 text-indigo-600" />
              <span>Exam Rules & Instructions</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 leading-relaxed list-disc list-inside">
              {(paper.instructions && paper.instructions.length > 0
                ? paper.instructions
                : [
                    "All questions carry equal marks.",
                    "Each question has 4 options with single correct choice.",
                    "Negative marking applies for each wrong answer.",
                    "You can navigate freely using the question palette or arrow keys.",
                  ]
              ).map((inst, idx) => (
                <li key={idx} className="pl-1">
                  <span>{inst}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Buffer reading status */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>
                Instructions reading time: <strong>{idleTimeSeconds}s</strong>
              </span>
            </span>
            <span className="text-[11px] text-slate-400">
              Timer active (not charged to Q1)
            </span>
          </div>

          {/* Start Action */}
          <button
            onClick={onStartExam}
            className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white py-3.5 px-6 font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Begin</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const questionTextSize =
    fontScale === "xlarge"
      ? "text-base sm:text-lg lg:text-xl"
      : fontScale === "large"
        ? "text-sm sm:text-base lg:text-lg"
        : "text-xs sm:text-sm lg:text-base";

  const optionTextSize =
    fontScale === "xlarge"
      ? "text-sm sm:text-base lg:text-lg"
      : fontScale === "large"
        ? "text-xs sm:text-sm lg:text-base"
        : "text-xs sm:text-sm";

  // 2. ACTIVE QUESTION SCREEN
  const qData = questions.find((q) => q.questionNo === currentQuestion);

  if (!qData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 text-slate-500 text-sm">
        Question {currentQuestion} not found in this paper.
      </div>
    );
  }

  const selectedOpt = currentAnswer?.selected?.toUpperCase() || null;
  const selectedText = currentAnswer?.selected || "";
  const correctOpt =
    paper.answerKey[currentQuestion]?.toUpperCase() ||
    qData.answer?.toUpperCase() ||
    currentAnswer?.correctAnswer?.toUpperCase();
  const hasOptions = Object.keys(qData.options || {}).length > 0;
  const hasAnswered = selectedText.trim().length > 0;
  const isCorrect =
    hasAnswered && correctOpt
      ? selectedText.trim().toUpperCase() === correctOpt
      : null;
  const explanation =
    qData.explanation || paper.explanations?.[currentQuestion];

  // In Practice mode, show explanation automatically once answered or manually requested
  const shouldShowExplanation =
    mode === "practice" &&
    (hasAnswered || showExplanationManual) &&
    !!explanation;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 flex flex-col justify-between">
      <div className="max-w-3xl w-full mx-auto space-y-5 animate-in fade-in">
        {/* Top Question Status Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center px-3 py-1 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-xs">
              Q{currentQuestion}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              of {paper.totalQuestions} Questions
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              +{paper.correctMarks}m
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              -{paper.incorrectMarks}m
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasAnswered && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  mode === "practice"
                    ? isCorrect === true
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : isCorrect === false
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : "bg-indigo-100 text-indigo-800 border border-indigo-300"
                    : "bg-indigo-100 text-indigo-800 border border-indigo-300"
                }`}
              >
                {mode === "practice" ? (
                  isCorrect === true ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Correct (+{paper.correctMarks})</span>
                    </>
                  ) : isCorrect === false ? (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      <span>Incorrect (-{paper.incorrectMarks})</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Answer recorded</span>
                    </>
                  )
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>
                      {hasOptions
                        ? `Option ${selectedOpt} Selected`
                        : "Answer recorded"}
                    </span>
                  </>
                )}
              </span>
            )}

            {/* Counts of Sure, 50:50, Eliminated, Guess, Flagged beside selected option */}
            {confidenceCounts && (
              <div className="flex flex-wrap items-center gap-1">
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800"
                  title={`${confidenceCounts.sure} questions marked Sure`}
                >
                  <span>🎯</span>
                  <span className="font-bold font-mono">
                    {confidenceCounts.sure}
                  </span>
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
                  title={`${confidenceCounts.fiftyFifty} questions marked 50:50`}
                >
                  <span>⚖️</span>
                  <span className="font-bold font-mono">
                    {confidenceCounts.fiftyFifty}
                  </span>
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-sky-50 border border-sky-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800"
                  title={`${confidenceCounts.elimination} questions marked Eliminated`}
                >
                  <span>✂️</span>
                  <span className="font-bold font-mono">
                    {confidenceCounts.elimination}
                  </span>
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800"
                  title={`${confidenceCounts.guess} questions marked Guess`}
                >
                  <span>🎲</span>
                  <span className="font-bold font-mono">
                    {confidenceCounts.guess}
                  </span>
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-amber-100/70 border border-amber-300 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900"
                  title={`${confidenceCounts.flagged} questions Flagged`}
                >
                  <Bookmark className="h-3 w-3 fill-amber-600 text-amber-600" />
                  <span className="font-bold font-mono">
                    {confidenceCounts.flagged}
                  </span>
                </span>
              </div>
            )}

            {mode === "practice" && explanation && !hasAnswered && (
              <button
                type="button"
                onClick={() => setShowExplanationManual(!showExplanationManual)}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                <span>
                  {showExplanationManual ? "Hide Solution" : "Peek Solution"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Question Text Box */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-3">
          <div
            className={`text-slate-900 ${questionTextSize} font-medium leading-relaxed whitespace-pre-wrap select-text`}
          >
            {qData.text}
          </div>
          <MatchingItemsTable
            items={qData.matchingItems}
            headers={qData.matchingHeaders}
          />
        </div>

        {/* Options List or cloze response */}
        {hasOptions ? (
          <div className="space-y-2.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
              Select Your Answer
            </span>

            <div className="grid grid-cols-1 gap-2.5">
              {["A", "B", "C", "D"].map((optKey) => {
                const optText = qData.options?.[optKey] || `Option ${optKey}`;
                const isSelected = selectedOpt === optKey;
                const isOptionCorrect = correctOpt === optKey;

                let cardStyle =
                  "border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80 text-slate-800 bg-white";
                let badgeStyle =
                  "bg-slate-100 text-slate-700 border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-700";

                if (mode === "practice" && hasAnswered) {
                  if (isOptionCorrect) {
                    cardStyle =
                      "border-emerald-500 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/30 shadow-xs";
                    badgeStyle = "bg-emerald-600 text-white border-emerald-700";
                  } else if (isSelected && !isOptionCorrect) {
                    cardStyle =
                      "border-rose-500 bg-rose-50/90 text-rose-950 ring-2 ring-rose-500/30 shadow-xs";
                    badgeStyle = "bg-rose-600 text-white border-rose-700";
                  } else {
                    cardStyle =
                      "border-slate-200 bg-white/60 text-slate-500 opacity-75";
                    badgeStyle = "bg-slate-100 text-slate-400 border-slate-200";
                  }
                } else if (isSelected) {
                  cardStyle =
                    "border-indigo-600 bg-indigo-50/90 text-indigo-950 ring-2 ring-indigo-600/30 font-semibold shadow-xs";
                  badgeStyle = "bg-indigo-600 text-white border-indigo-700";
                }

                return (
                  <button
                    key={optKey}
                    type="button"
                    onClick={() => onSelectOption(currentQuestion, optKey)}
                    className={`group w-full rounded-2xl border p-3.5 sm:p-4 text-left transition-all duration-150 flex items-start gap-3.5 cursor-pointer shadow-2xs ${cardStyle}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center h-7 w-7 rounded-xl font-black text-xs shrink-0 border transition-all mt-0.5 ${badgeStyle}`}
                    >
                      {optKey}
                    </span>
                    <div
                      className={`flex-1 ${optionTextSize} leading-relaxed self-center font-normal`}
                    >
                      {optText}
                    </div>
                    {mode === "practice" && hasAnswered && isOptionCorrect && (
                      <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">Correct</span>
                      </span>
                    )}
                    {mode === "practice" &&
                      hasAnswered &&
                      isSelected &&
                      !isOptionCorrect && (
                        <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-md">
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          <span className="hidden sm:inline">Your choice</span>
                        </span>
                      )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <ClozeAnswerInput
            key={currentQuestion}
            questionNo={currentQuestion}
            initialValue={selectedText}
            onSave={onUpdateAnswer}
            onEscapeBlur={onEscapeBlur}
          />
        )}

        {/* Practice Mode Detailed Explanation Card */}
        {shouldShowExplanation && (
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 p-5 sm:p-6 shadow-sm space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-600 text-white p-1.5">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Official Solution & Conceptual Breakdown
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {correctOpt ? (
                      <>
                        Correct Option:{" "}
                        <strong className="text-emerald-700 font-bold">
                          {correctOpt}
                        </strong>
                      </>
                    ) : (
                      "Reference explanation"
                    )}
                  </span>
                </div>
              </div>
            </div>

            <HtmlExplanation text={explanation} className="text-slate-700" />
          </div>
        )}
      </div>

      {/* Quick Navigation Footer */}
      <div className="max-w-3xl w-full mx-auto pt-6 flex items-center justify-between gap-3 border-t border-slate-200/80 mt-6">
        <button
          type="button"
          disabled={currentQuestion <= 1}
          onClick={() => onNavigateQuestion(Math.max(1, currentQuestion - 1))}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        {hasAnswered && (
          <button
            type="button"
            onClick={() => onClearOption(currentQuestion)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear Choice</span>
          </button>
        )}

        <button
          type="button"
          disabled={currentQuestion >= paper.totalQuestions}
          onClick={() =>
            onNavigateQuestion(
              Math.min(paper.totalQuestions, currentQuestion + 1),
            )
          }
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-sm disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useRef } from "react";
import { QuestionPaper, ParsedQuestion, QuestionAnswer } from "../lib/types";
import { ParsedMarkdownHeader } from "../lib/markdownPaperParser";
import { MatchingItemsTable } from "./MatchingItemsTable";
import { formatTimeSeconds, getPaperDisplayTitle } from "../lib/defaults";
import {
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  Lightbulb,
  X,
  XCircle,
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
  activeQuestionNo,
  onSelectQuestion,
  onClose,
}: MarkdownPaperReviewViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const displayTitle = getPaperDisplayTitle(paper);
  const paperInstructions =
    instructions.length > 0 ? instructions : paper.instructions || [];

  // Keep the selected question at the top of the preview in both review modes.
  useEffect(() => {
    if (!activeQuestionNo || !scrollContainerRef.current) return;

    const target = scrollContainerRef.current.querySelector<HTMLElement>(
      "#review-q-" + activeQuestionNo,
    );
    if (!target) return;

    scrollContainerRef.current.scrollTo({
      top: Math.max(0, target.offsetTop - 12),
      behavior: "smooth",
    });
  }, [activeQuestionNo]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-800">
          <span
            className="max-w-[150px] truncate sm:max-w-[220px]"
            title={displayTitle}
          >
            {displayTitle}
          </span>
          <span className="hidden text-[11px] font-normal text-slate-400 sm:inline">
            · {questions.length} questions
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {questions.length > 0 && (
            <select
              value={activeQuestionNo || ""}
              onChange={(event) => {
                const questionNo = Number(event.target.value);
                if (Number.isFinite(questionNo)) {
                  onSelectQuestion?.(questionNo);
                }
              }}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              aria-label="Jump to question"
            >
              <option value="">Jump to Q...</option>
              {questions.map((question) => {
                const answer = answers[question.questionNo];
                const isAnswered = Boolean(answer?.selected?.trim());
                const marker =
                  isAnswered && answer?.isCorrect === true
                    ? "✓"
                    : isAnswered && answer?.isCorrect === false
                      ? "✗"
                      : "○";
                return (
                  <option key={question.questionNo} value={question.questionNo}>
                    Q{question.questionNo} {marker}
                  </option>
                );
              })}
            </select>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              title="Hide question paper preview"
            >
              ✕ Hide
            </button>
          )}
        </div>
      </div>

      {questions.length > 0 && (
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-1.5 no-scrollbar">
          <span className="mr-1 shrink-0 text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Questions:
          </span>
          {questions.map((question) => {
            const answer = answers[question.questionNo];
            const isAnswered = Boolean(answer?.selected?.trim());
            const isCorrect = isAnswered && answer?.isCorrect === true;
            const isIncorrect = isAnswered && answer?.isCorrect === false;
            const isActive = activeQuestionNo === question.questionNo;
            const paletteClass =
              "shrink-0 cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-bold transition-all " +
              (isActive ? "scale-105 ring-2 ring-slate-900 " : "") +
              (isCorrect
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : isIncorrect
                  ? "border-rose-300 bg-rose-50 text-rose-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50");

            return (
              <button
                key={question.questionNo}
                type="button"
                onClick={() => onSelectQuestion?.(question.questionNo)}
                className={paletteClass}
                title={
                  "Q" +
                  question.questionNo +
                  ": " +
                  (isCorrect
                    ? "Correct"
                    : isIncorrect
                      ? "Incorrect"
                      : "Unattempted")
                }
              >
                {question.questionNo}
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto bg-slate-50/50 p-4 sm:p-6"
      >
        <details
          open
          className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
        >
          <summary className="cursor-pointer list-none">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              <BookOpen className="h-3.5 w-3.5 text-slate-500" />
              Paper details
            </span>
          </summary>

          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 divide-x divide-slate-200 border-y border-slate-200 py-2 text-xs sm:grid-cols-4">
              <div className="px-2 text-center first:pl-0">
                <span className="block text-[10px] font-medium text-slate-400">
                  Questions
                </span>
                <span className="mt-0.5 block font-mono font-semibold text-slate-800">
                  {paper.totalQuestions || questions.length}
                </span>
              </div>
              <div className="px-2 text-center">
                <span className="block text-[10px] font-medium text-slate-400">
                  Time Limit
                </span>
                <span className="mt-0.5 block font-mono font-semibold text-indigo-700">
                  {paper.timeMinutes || 120}m
                </span>
              </div>
              <div className="px-2 text-center">
                <span className="block text-[10px] font-medium text-slate-400">
                  Per Correct
                </span>
                <span className="mt-0.5 block font-mono font-semibold text-emerald-700">
                  +{paper.correctMarks || 2.0}m
                </span>
              </div>
              <div className="px-2 text-center last:pr-0">
                <span className="block text-[10px] font-medium text-slate-400">
                  Penalty
                </span>
                <span className="mt-0.5 block font-mono font-semibold text-rose-700">
                  -{paper.incorrectMarks || 0.667}m
                </span>
              </div>
            </div>

            {paperInstructions.length > 0 && (
              <div className="space-y-1.5 border-t border-slate-200 pt-3">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Instructions
                </span>
                <ul className="space-y-1">
                  {paperInstructions.map((rule, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-700"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>

        {questions.length === 0 ? (
          <div className="space-y-2 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Info className="mx-auto h-8 w-8 text-slate-400" />
            <h4 className="text-sm font-bold text-slate-700">
              No questions found for this paper
            </h4>
            <p className="mx-auto max-w-sm text-xs text-slate-500">
              The markdown content for this paper could not be parsed into
              individual questions.
            </p>
          </div>
        ) : (
          questions.map((question) => {
            const answer = answers[question.questionNo];
            const userSelected = answer?.selected?.toUpperCase() || null;
            const isCloze = Object.keys(question.options || {}).length === 0;
            const correctOpt =
              paper.answerKey?.[question.questionNo]?.toUpperCase() ||
              question.answer?.toUpperCase() ||
              answer?.correctAnswer?.toUpperCase() ||
              null;
            const isAnswered = Boolean(answer?.selected?.trim());
            const isCorrect = isAnswered && answer?.isCorrect === true;
            const isIncorrect = isAnswered && answer?.isCorrect === false;
            const explanationText =
              question.explanation ||
              explanations[question.questionNo] ||
              paper.explanations?.[question.questionNo] ||
              answer?.explanation;

            const articleClass =
              "rounded-xl border bg-white p-4 transition-colors duration-200 sm:p-5 " +
              (activeQuestionNo === question.questionNo
                ? "border-slate-900 ring-1 ring-slate-900/10"
                : "border-slate-200 hover:border-slate-300");

            return (
              <article
                key={question.questionNo}
                id={"review-q-" + question.questionNo}
                className={articleClass}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-900">
                      Q{question.questionNo}
                    </span>
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Correct
                      </span>
                    ) : isIncorrect ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-800">
                        <XCircle className="h-3 w-3 text-rose-600" />
                        Incorrect
                      </span>
                    ) : isCloze && isAnswered ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-800">
                        <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                        Answer recorded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                        <HelpCircle className="h-3 w-3 text-slate-400" />
                        Skipped · 0
                      </span>
                    )}
                  </div>

                  {answer?.timeSpentSeconds ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {formatTimeSeconds(answer.timeSpentSeconds)}
                    </span>
                  ) : null}
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-900">
                  {question.text}
                </p>

                <MatchingItemsTable
                  items={question.matchingItems}
                  headers={question.matchingHeaders}
                />

                {!isCloze && (
                  <div className="mt-3.5 grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                    {Object.entries(question.options || {}).map(
                      ([optionKey, optionText]) => {
                        const normalizedKey = optionKey.toUpperCase();
                        const isUserPick = userSelected === normalizedKey;
                        const isRightAnswer = correctOpt === normalizedKey;
                        const optionStyle =
                          isRightAnswer && isUserPick
                            ? "border-emerald-300 bg-emerald-50/90 font-medium text-emerald-950 ring-1 ring-emerald-400/30"
                            : isRightAnswer
                              ? "border-emerald-300 bg-emerald-50/70 font-medium text-emerald-950"
                              : isUserPick
                                ? "border-rose-300 bg-rose-50/90 font-medium text-rose-950 ring-1 ring-rose-400/30"
                                : "border-slate-200 bg-slate-50/70 text-slate-700";

                        return (
                          <div
                            key={optionKey}
                            className={
                              "flex items-start gap-2 rounded-lg border p-2.5 text-xs leading-relaxed transition-colors " +
                              optionStyle
                            }
                          >
                            <span
                              className={
                                "shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold " +
                                (isRightAnswer
                                  ? "bg-emerald-600 text-white"
                                  : isUserPick
                                    ? "bg-rose-600 text-white"
                                    : "bg-slate-200 text-slate-700")
                              }
                            >
                              {optionKey}
                            </span>
                            <span className="flex-1 whitespace-pre-wrap">
                              {optionText}
                            </span>
                            {isRightAnswer && (
                              <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-emerald-700">
                                <Check className="h-3 w-3" /> Answer
                              </span>
                            )}
                            {!isRightAnswer && isUserPick && (
                              <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-rose-700">
                                <X className="h-3 w-3" /> Your answer
                              </span>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                )}

                {explanationText && (
                  <div className="mt-3.5 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <Lightbulb className="h-3.5 w-3.5 text-slate-500" />
                      Solution
                    </div>
                    <p className="whitespace-pre-wrap pl-5 text-xs leading-relaxed text-slate-700">
                      {explanationText}
                    </p>
                  </div>
                )}

                {answer?.note?.trim() && (
                  <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
                    <span className="shrink-0 font-semibold text-slate-900">
                      Note:
                    </span>
                    <span className="whitespace-pre-wrap italic">
                      {answer.note.trim()}
                    </span>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

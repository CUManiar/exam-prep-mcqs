"use client";

import React from "react";
import { QuestionPaper, ParsedQuestion, QuestionAnswer } from "../lib/types";
import { getPaperDisplayTitle } from "../lib/defaults";

interface MarkdownPaperReviewViewerProps {
  paper: QuestionPaper;
  questions: ParsedQuestion[];
  answers: Record<number, QuestionAnswer>;
  explanations?: Record<number, string>;
  instructions?: string[];
  header?: unknown;
  activeQuestionNo?: number | null;
  onSelectQuestion?: (qNo: number) => void;
  onClose?: () => void;
}

export function MarkdownPaperReviewViewer({
  paper,
  questions = [],
  answers = {},
  activeQuestionNo,
  onSelectQuestion,
  onClose,
}: MarkdownPaperReviewViewerProps) {
  const displayTitle = getPaperDisplayTitle(paper);

  return (
    <aside className="flex h-full flex-col overflow-hidden bg-slate-50">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3.5 py-2.5">
        <div className="min-w-0">
          <p
            className="truncate text-xs font-semibold text-slate-900"
            title={displayTitle}
          >
            {displayTitle}
          </p>
          <p className="text-[11px] text-slate-400">
            {questions.length} questions
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Hide
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Question palette
            </span>
            <span className="text-[10px] text-slate-400">
              Green correct · Red incorrect · White unattempted
            </span>
          </div>

          {questions.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No questions found.
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {questions.map((question) => {
                const answer = answers[question.questionNo];
                const isCorrect = answer?.isCorrect === true;
                const isIncorrect = answer?.isCorrect === false;
                const isActive = activeQuestionNo === question.questionNo;

                return (
                  <button
                    key={question.questionNo}
                    type="button"
                    onClick={() => onSelectQuestion?.(question.questionNo)}
                    title={`Question ${question.questionNo}${isCorrect ? " · Correct" : isIncorrect ? " · Incorrect" : " · Unattempted"}`}
                    className={`flex h-9 items-center justify-center rounded-lg border text-xs font-bold transition-all sm:h-10 ${
                      isCorrect
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : isIncorrect
                          ? "border-rose-600 bg-rose-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    } ${isActive ? "ring-2 ring-indigo-600 ring-offset-1" : ""}`}
                  >
                    {question.questionNo}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

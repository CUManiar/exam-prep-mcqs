"use client";

import React from "react";
import { QuestionAnswer } from "../../lib/types";
import { Check, X, Bookmark, AlertCircle } from "lucide-react";

interface QuestionPaletteProps {
  questions: QuestionAnswer[];
  activeQuestionNo: number;
  onSelectQuestion: (qNo: number) => void;
  isAssessmentQuestion: (qNo: number) => boolean;
}

export function QuestionPalette({
  questions,
  activeQuestionNo,
  onSelectQuestion,
  isAssessmentQuestion,
}: QuestionPaletteProps) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
          Question Palette ({questions.length})
        </span>
        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Correct
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Wrong
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            Skipped
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">
        {questions.map((q) => {
          const isSelected = q.questionNo === activeQuestionNo;
          const isEvaluable = isAssessmentQuestion(q.questionNo);
          const isCorrect = isEvaluable
            ? q.subjectiveAssessment === "strong"
            : q.selected && q.isCorrect === true;
          const isWrong = isEvaluable
            ? q.subjectiveAssessment === "needs-work"
            : q.selected && q.isCorrect === false;
          const isPartial = isEvaluable && q.subjectiveAssessment === "partial";
          const isSkipped = !q.selected && !q.subjectiveAssessment;

          let badgeColor = "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200";
          if (isCorrect) {
            badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100";
          } else if (isWrong) {
            badgeColor = "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100";
          } else if (isPartial) {
            badgeColor = "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100";
          } else if (isSkipped) {
            badgeColor = "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100";
          }

          return (
            <button
              key={q.questionNo}
              type="button"
              onClick={() => onSelectQuestion(q.questionNo)}
              className={`relative h-7 w-7 sm:h-8 sm:w-8 rounded-lg border text-xs font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${badgeColor} ${
                isSelected
                  ? "ring-2 ring-indigo-600 ring-offset-1 font-black shadow-xs z-10 scale-105"
                  : ""
              }`}
              title={`Question ${q.questionNo} - ${
                isCorrect
                  ? "Correct"
                  : isWrong
                    ? "Incorrect"
                    : isPartial
                      ? "Partial"
                      : "Skipped"
              }`}
            >
              <span>{q.questionNo}</span>
              {q.flagged && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 ring-1 ring-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

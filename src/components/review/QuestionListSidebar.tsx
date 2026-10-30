"use client";

import React from "react";
import { QuestionAnswer, ParsedQuestion } from "../../lib/types";
import { formatTimeSeconds } from "../../lib/defaults";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Bookmark,
  ChevronRight,
  HelpCircle,
} from "lucide-react";

interface QuestionListSidebarProps {
  questions: QuestionAnswer[];
  activeQuestionNo: number;
  onSelectQuestion: (qNo: number) => void;
  isAssessmentQuestion: (qNo: number) => boolean;
  isClozeQuestion: (qNo: number) => boolean;
  markdownQuestions: ParsedQuestion[];
}

export function QuestionListSidebar({
  questions,
  activeQuestionNo,
  onSelectQuestion,
  isAssessmentQuestion,
  isClozeQuestion,
  markdownQuestions,
}: QuestionListSidebarProps) {
  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">No matching questions</p>
        <p className="text-[11px] text-slate-400">
          Try selecting another filter from above.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
      <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
        {questions.map((q) => {
          const isSelected = q.questionNo === activeQuestionNo;
          const isEvaluable = isAssessmentQuestion(q.questionNo);
          const isCloze = isClozeQuestion(q.questionNo);
          const isCorrect = isEvaluable
            ? q.subjectiveAssessment === "strong"
            : q.selected && q.isCorrect === true;
          const isWrong = isEvaluable
            ? q.subjectiveAssessment === "needs-work"
            : q.selected && q.isCorrect === false;
          const isPartial = isEvaluable && q.subjectiveAssessment === "partial";
          const isSkipped = !q.selected && !q.subjectiveAssessment;

          const parsedQ = markdownQuestions.find((mq) => mq.questionNo === q.questionNo);
          const expectedAns = parsedQ?.answer || q.correctAnswer;

          return (
            <button
              key={q.questionNo}
              type="button"
              id={`sidebar-q-${q.questionNo}`}
              onClick={() => onSelectQuestion(q.questionNo)}
              className={`w-full text-left p-3 sm:p-3.5 transition-all flex items-center justify-between gap-3 cursor-pointer ${
                isSelected
                  ? "bg-indigo-50/70 border-l-4 border-indigo-600 pl-2.5 sm:pl-3"
                  : "hover:bg-slate-50/80"
              }`}
            >
              {/* Left Info: Q.No, Confidence badge, Status */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex flex-col items-center">
                  <span
                    className={`font-mono text-xs font-black ${
                      isSelected ? "text-indigo-900" : "text-slate-800"
                    }`}
                  >
                    Q{q.questionNo}
                  </span>
                  {isCloze && (
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded">
                      cloze
                    </span>
                  )}
                </div>

                {/* Status indicator */}
                <div>
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      Correct
                    </span>
                  ) : isWrong ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      <XCircle className="h-3 w-3 text-rose-600 shrink-0" />
                      Wrong
                    </span>
                  ) : isPartial ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Partial
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                      Skipped
                    </span>
                  )}
                </div>

                {/* Answer comparison pill */}
                {!isCloze && !isEvaluable && (
                  <div className="hidden sm:flex items-center gap-1 font-mono text-[11px]">
                    <span
                      className={`font-bold px-1.5 py-0.2 rounded ${
                        isCorrect
                          ? "bg-emerald-50 text-emerald-900"
                          : isWrong
                            ? "bg-rose-50 text-rose-900 line-through"
                            : "text-slate-400"
                      }`}
                    >
                      {q.selected || "—"}
                    </span>
                    {!isCorrect && expectedAns && (
                      <>
                        <span className="text-slate-300">→</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          {expectedAns}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Right Info: Time, Note icon, Flag, Arrow */}
              <div className="flex items-center gap-2 text-slate-400 shrink-0">
                {q.flagged && (
                  <Bookmark className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                )}
                {q.note && q.note.trim() && (
                  <span title="Student note attached">
                    <FileText className="h-3.5 w-3.5 text-amber-600" />
                  </span>
                )}
                <span className="font-mono text-[11px] text-slate-500 flex items-center gap-0.5">
                  <Clock className="h-3 w-3 text-slate-400" />
                  {q.timeSpentSeconds || 0}s
                </span>
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${
                    isSelected ? "text-indigo-600 translate-x-0.5" : "text-slate-300"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

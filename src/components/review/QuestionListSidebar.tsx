"use client";

import React from "react";
import { QuestionAnswer, ParsedQuestion } from "../../lib/types";
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
      {/* Table Header Bar */}
      <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Question Review
          </span>
          <span className="text-[11px] font-semibold text-slate-500 font-mono">
            ({questions.length})
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          Click any row to inspect
        </span>
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 z-10 select-none">
            <tr>
              <th className="py-2 px-3">Q. No</th>
              <th className="py-2 px-2.5">Status</th>
              <th className="py-2 px-2 text-center">Your Answer</th>
              <th className="py-2 px-2 text-center">Correct Answer</th>
              <th className="py-2 px-2 text-center">Time</th>
              <th className="py-2 px-3">Student Notes</th>
              <th className="py-2 pr-2.5 w-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
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
              const expectedAns = (parsedQ?.answer || q.correctAnswer || "").replace(/[\(\)\[\]\.\s]/g, "").toUpperCase();
              const candidateAns = (q.selected || "").replace(/[\(\)\[\]\.\s]/g, "").toUpperCase();

              return (
                <tr
                  key={q.questionNo}
                  id={`sidebar-q-${q.questionNo}`}
                  onClick={() => onSelectQuestion(q.questionNo)}
                  className={`transition-colors cursor-pointer group ${
                    isSelected
                      ? "bg-indigo-50/80 font-medium"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  {/* Q. No Column */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isSelected ? "text-indigo-900" : "text-slate-800"
                          }`}
                        >
                          Q{q.questionNo}
                        </span>
                        {q.flagged && (
                          <Bookmark className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                      </div>
                      {q.confidence && (
                        <span className="text-[9px] text-slate-400 capitalize font-medium">
                          {q.confidence}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status Pill Column */}
                  <td className="py-2.5 px-2.5 whitespace-nowrap">
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>Correct</span>
                      </span>
                    ) : isWrong ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                        <XCircle className="h-3 w-3 text-rose-600 shrink-0" />
                        <span>Incorrect</span>
                      </span>
                    ) : isPartial ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <span>% Partial</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                        <span>Skipped</span>
                      </span>
                    )}
                  </td>

                  {/* Candidate Answer Column */}
                  <td className="py-2.5 px-2 text-center whitespace-nowrap">
                    {candidateAns ? (
                      <span
                        className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                          isCorrect
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                            : isWrong
                              ? "bg-rose-50 text-rose-900 border-rose-200"
                              : "bg-slate-100 text-slate-800 border-slate-200"
                        }`}
                      >
                        {candidateAns}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-mono text-xs">—</span>
                    )}
                  </td>

                  {/* Correct Key Column */}
                  <td className="py-2.5 px-2 text-center whitespace-nowrap">
                    {expectedAns ? (
                      <span className="inline-block font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {expectedAns}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-mono text-xs">—</span>
                    )}
                  </td>

                  {/* Time Spent Column */}
                  <td className="py-2.5 px-2 text-center whitespace-nowrap font-mono text-[11px] text-slate-500">
                    {q.timeSpentSeconds ? `${q.timeSpentSeconds}s` : "0s"}
                  </td>

                  {/* Student Notes Column */}
                  <td className="py-2.5 px-3 max-w-[200px]">
                    {q.note && q.note.trim() ? (
                      <div
                        className="truncate text-[11px] font-mono bg-amber-50 text-amber-900 border border-amber-200/90 px-2 py-0.5 rounded-md"
                        title={q.note}
                      >
                        {q.note}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Jump Arrow */}
                  <td className="py-2.5 pr-2.5 text-right whitespace-nowrap">
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition-transform ${
                        isSelected
                          ? "text-indigo-600 translate-x-0.5"
                          : "text-slate-300 group-hover:text-slate-600"
                      }`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

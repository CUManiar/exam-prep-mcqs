"use client";

import React, { useState } from "react";
import { QuestionAnswer, ParsedQuestion } from "../../lib/types";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Lightbulb,
} from "lucide-react";

interface QuestionListSidebarProps {
  questions: QuestionAnswer[];
  activeQuestionNo: number;
  onSelectQuestion: (qNo: number) => void;
  isAssessmentQuestion: (qNo: number) => boolean;
  isClozeQuestion: (qNo: number) => boolean;
  markdownQuestions: ParsedQuestion[];
  onSaveQuestionNote?: (qNo: number, note: string) => void;
}

export function QuestionListSidebar({
  questions,
  activeQuestionNo,
  onSelectQuestion,
  isAssessmentQuestion,
  isClozeQuestion,
  markdownQuestions,
  onSaveQuestionNote,
}: QuestionListSidebarProps) {
  // Track which questions are expanded
  const [expandedQNos, setExpandedQNos] = useState<Set<number>>(() => new Set([activeQuestionNo]));
  const [editingQNo, setEditingQNo] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>("");

  const toggleExpand = (qNo: number) => {
    setExpandedQNos((prev) => {
      const next = new Set(prev);
      if (next.has(qNo)) {
        next.delete(qNo);
      } else {
        next.add(qNo);
      }
      return next;
    });
  };

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
      {/* Header Bar */}
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
          Click row to expand details
        </span>
      </div>

      {/* Structured Table: ZERO horizontal scrolling */}
      <div className="max-h-[600px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse table-fixed">
          <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200 z-10 select-none">
            <tr>
              <th className="py-2 pl-3 pr-1 w-14">Q. No</th>
              <th className="py-2 px-1 w-20 text-center">Status</th>
              <th className="py-2 px-1 text-center w-14">Yours</th>
              <th className="py-2 px-1 text-center w-14">Key</th>
              <th className="py-2 px-1 text-center w-12">Time</th>
              <th className="py-2 pr-3 pl-1 text-right w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {questions.map((q) => {
              const isSelected = q.questionNo === activeQuestionNo;
              const isExpanded = expandedQNos.has(q.questionNo);
              const isEvaluable = isAssessmentQuestion(q.questionNo);
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
              const explanationText = parsedQ?.explanation || q.explanation;

              return (
                <React.Fragment key={q.questionNo}>
                  {/* Main Row */}
                  <tr
                    id={`sidebar-q-${q.questionNo}`}
                    onClick={() => {
                      onSelectQuestion(q.questionNo);
                      toggleExpand(q.questionNo);
                    }}
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? "bg-indigo-50/80 font-medium"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Q. No */}
                    <td className="py-2.5 pl-3 pr-1 whitespace-nowrap">
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
                        {q.note && q.note.trim() && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0"
                            title="Student note attached"
                          />
                        )}
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="py-2.5 px-1 text-center whitespace-nowrap">
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>Correct</span>
                        </span>
                      ) : isWrong ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <XCircle className="h-3 w-3 text-rose-600 shrink-0" />
                          <span>Wrong</span>
                        </span>
                      ) : isPartial ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Partial
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          Skipped
                        </span>
                      )}
                    </td>

                    {/* Candidate Answer */}
                    <td className="py-2.5 px-1 text-center whitespace-nowrap">
                      {candidateAns ? (
                        <span
                          className={`inline-block font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
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

                    {/* Correct Key */}
                    <td className="py-2.5 px-1 text-center whitespace-nowrap">
                      {expectedAns ? (
                        <span className="inline-block font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {expectedAns}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* Time */}
                    <td className="py-2.5 px-1 text-center whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {q.timeSpentSeconds ? `${q.timeSpentSeconds}s` : "0s"}
                    </td>

                    {/* Expand Arrow */}
                    <td className="py-2.5 pr-3 pl-1 text-right whitespace-nowrap">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-indigo-600 inline-block" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-600 inline-block" />
                      )}
                    </td>
                  </tr>

                  {/* Inline Expansion Block: Notes, Explanation, and Details */}
                  {isExpanded && (
                    <tr className="bg-slate-50/70 border-b border-slate-200">
                      <td colSpan={6} className="p-3 sm:p-3.5 space-y-2.5">
                        {/* 1. Official Explanation & Solution */}
                        {explanationText ? (
                          <div className="rounded-xl border border-indigo-200/90 bg-white p-3 space-y-1 shadow-2xs">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                              <Lightbulb className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              <span>Official Solution</span>
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-normal select-text">
                              {explanationText}
                            </p>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">
                            No explanation provided for this question.
                          </div>
                        )}

                        {/* 2. Student Scratchpad Note (Inline Editable) */}
                        {q.note && q.note.trim() ? (
                          <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 shadow-2xs space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-900">
                              <span className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                                Student Note
                              </span>
                              {onSaveQuestionNote && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingQNo(q.questionNo);
                                    setNoteDraft(q.note || "");
                                  }}
                                  className="text-[10px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                            {editingQNo === q.questionNo ? (
                              <div
                                className="space-y-1.5 pt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <textarea
                                  value={noteDraft}
                                  onChange={(e) => setNoteDraft(e.target.value)}
                                  rows={2}
                                  className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingQNo(null)}
                                    className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSaveQuestionNote?.(q.questionNo, noteDraft);
                                      setEditingQNo(null);
                                    }}
                                    className="px-2.5 py-0.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-2xs cursor-pointer"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs font-mono text-slate-900 leading-relaxed whitespace-pre-wrap">
                                {q.note}
                              </div>
                            )}
                          </div>
                        ) : onSaveQuestionNote ? (
                          editingQNo === q.questionNo ? (
                            <div
                              className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 space-y-1.5 shadow-2xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <textarea
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                placeholder="Add formula, elimination logic or mistake note..."
                                rows={2}
                                className="w-full rounded-lg border border-amber-300 bg-white p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingQNo(null)}
                                  className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSaveQuestionNote?.(q.questionNo, noteDraft);
                                    setEditingQNo(null);
                                  }}
                                  className="px-2.5 py-0.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-2xs cursor-pointer"
                                >
                                  Save Note
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingQNo(q.questionNo);
                                setNoteDraft("");
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-amber-800 transition-colors font-medium cursor-pointer"
                            >
                              <FileText className="h-3 w-3 text-slate-400" />
                              <span>+ Add note for Q{q.questionNo}</span>
                            </button>
                          )
                        ) : null}

                        {/* 3. Question Metadata */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                          <span className="font-semibold text-slate-700">
                            {isCorrect
                              ? "✓ Scored full marks"
                              : isWrong
                                ? "✗ Penalized negative marks"
                                : "○ Unattempted"}
                          </span>
                          {q.confidence && (
                            <span className="capitalize font-medium text-slate-600">
                              Confidence: {q.confidence}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

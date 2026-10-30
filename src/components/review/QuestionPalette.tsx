"use client";

import React, { useState, useEffect } from "react";
import { QuestionAnswer, ParsedQuestion } from "../../lib/types";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ChevronUp,
  Lightbulb,
  ArrowRight,
} from "lucide-react";

interface QuestionPaletteProps {
  questions: QuestionAnswer[];
  activeQuestionNo: number;
  onSelectQuestion: (qNo: number) => void;
  isAssessmentQuestion: (qNo: number) => boolean;
  isClozeQuestion?: (qNo: number) => boolean;
  markdownQuestions?: ParsedQuestion[];
  onSaveQuestionNote?: (qNo: number, note: string) => void;
  onJumpToNextMistake?: () => void;
  hasNextMistake?: boolean;
  incorrectMarksPerQ?: number;
  getFullMarks?: (qNo: number) => number;
  filteredQuestionNos?: Set<number>;
  filterTab?: string;
}

export function QuestionPalette({
  questions,
  activeQuestionNo,
  onSelectQuestion,
  isAssessmentQuestion,
  isClozeQuestion,
  markdownQuestions = [],
  onSaveQuestionNote,
  onJumpToNextMistake,
  hasNextMistake,
  incorrectMarksPerQ = 0.667,
  getFullMarks,
  filteredQuestionNos,
  filterTab,
}: QuestionPaletteProps) {
  // Collapsed by default until expanded by click
  const [expandedQNo, setExpandedQNo] = useState<number | null>(null);
  const [editingQNo, setEditingQNo] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>("");

  // Sync expandedQNo when activeQuestionNo is explicitly navigated (e.g. Next Mistake)
  useEffect(() => {
    if (expandedQNo !== null) {
      setExpandedQNo(activeQuestionNo);
    }
  }, [activeQuestionNo]);

  const handleChipClick = (qNo: number) => {
    if (expandedQNo === qNo) {
      // Toggle collapse if already open
      setExpandedQNo(null);
    } else {
      // Expand clicked question details
      setExpandedQNo(qNo);
      onSelectQuestion(qNo);
    }
  };

  const expandedQuestion = expandedQNo !== null ? questions.find((q) => q.questionNo === expandedQNo) : null;
  const isEvaluable = expandedQuestion ? isAssessmentQuestion(expandedQuestion.questionNo) : false;
  const isCloze = expandedQuestion && isClozeQuestion ? isClozeQuestion(expandedQuestion.questionNo) : false;

  const expandedIsCorrect = expandedQuestion
    ? isEvaluable
      ? expandedQuestion.subjectiveAssessment === "strong"
      : expandedQuestion.selected && expandedQuestion.isCorrect === true
    : false;

  const expandedIsWrong = expandedQuestion
    ? isEvaluable
      ? expandedQuestion.subjectiveAssessment === "needs-work"
      : expandedQuestion.selected && expandedQuestion.isCorrect === false
    : false;

  const expandedIsPartial = expandedQuestion && isEvaluable && expandedQuestion.subjectiveAssessment === "partial";

  const parsedQ = expandedQuestion
    ? markdownQuestions.find((mq) => mq.questionNo === expandedQuestion.questionNo)
    : null;

  const expandedKey = (parsedQ?.answer || expandedQuestion?.correctAnswer || "")
    .replace(/[\(\)\[\]\.\s]/g, "")
    .toUpperCase();
  const expandedCandidate = (expandedQuestion?.selected || "")
    .replace(/[\(\)\[\]\.\s]/g, "")
    .toUpperCase();
  const explanationText = parsedQ?.explanation || expandedQuestion?.explanation;

  const fullMarks = expandedQuestion && getFullMarks ? getFullMarks(expandedQuestion.questionNo) : 2.0;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-3.5 shadow-2xs space-y-2.5">
      {/* Header: Title + Status Dots Legend */}
      <div className="flex items-center justify-between gap-1 flex-wrap pb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
            Question Palette ({questions.length})
          </span>
          {filterTab && filterTab !== "all" && filteredQuestionNos && (
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md">
              {filteredQuestionNos.size} match
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium shrink-0">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Correct
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Wrong
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            Skip
          </span>
        </div>
      </div>

      {/* Palette Chips Grid */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {questions.map((q) => {
          const isSelected = q.questionNo === activeQuestionNo;
          const isCurrentExpanded = q.questionNo === expandedQNo;
          const isFilteredOut =
            filterTab && filterTab !== "all" && filteredQuestionNos && !filteredQuestionNos.has(q.questionNo);
          const qIsEvaluable = isAssessmentQuestion(q.questionNo);
          const isCorrect = qIsEvaluable
            ? q.subjectiveAssessment === "strong"
            : q.selected && q.isCorrect === true;
          const isWrong = qIsEvaluable
            ? q.subjectiveAssessment === "needs-work"
            : q.selected && q.isCorrect === false;
          const isPartial = qIsEvaluable && q.subjectiveAssessment === "partial";
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
              onClick={() => handleChipClick(q.questionNo)}
              className={`relative h-7 w-7 rounded-lg border text-xs font-mono font-bold transition-all flex items-center justify-center cursor-pointer ${badgeColor} ${
                isFilteredOut ? "opacity-30 hover:opacity-90 grayscale hover:grayscale-0" : ""
              } ${
                isCurrentExpanded
                  ? "ring-2 ring-indigo-600 ring-offset-1 font-black shadow-xs z-10 scale-105"
                  : isSelected
                    ? "ring-2 ring-slate-400 font-black"
                    : ""
              }`}
              title={`Question ${q.questionNo} - Click to ${isCurrentExpanded ? "collapse" : "view details"}`}
            >
              <span>{q.questionNo}</span>
              {q.flagged && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 ring-1 ring-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Accordion Expansion Block (Opens on click, collapsed until expanded) */}
      {expandedQuestion && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-200/90 space-y-3 animate-in fade-in duration-150">
          {/* Header Row: Q.No, Status pill, Confidence, Time, Collapse Button */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-sm text-slate-900">
                Q{expandedQuestion.questionNo}
              </span>

              {/* Status Badge */}
              {expandedIsCorrect ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                  <span>Correct (+{fullMarks.toFixed(2)})</span>
                </span>
              ) : expandedIsWrong ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  <XCircle className="h-3 w-3 text-rose-600 shrink-0" />
                  <span>Wrong (-{incorrectMarksPerQ.toFixed(2)})</span>
                </span>
              ) : expandedIsPartial ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Partial
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                  Skipped · 0 pts
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              {expandedQuestion.confidence && (
                <span className="text-[10px] text-slate-500 font-medium capitalize">
                  {expandedQuestion.confidence}
                </span>
              )}
              <span className="font-mono text-xs text-slate-500 flex items-center gap-0.5">
                <Clock className="h-3 w-3 text-slate-400" />
                {expandedQuestion.timeSpentSeconds || 0}s
              </span>
              <button
                type="button"
                onClick={() => setExpandedQNo(null)}
                className="h-6 w-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Collapse details"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Answer Comparison Strip */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Candidate Pick */}
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-1.5 transition-all ${
                expandedIsCorrect
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                  : expandedIsWrong
                    ? "bg-rose-50/70 border-rose-200 text-rose-950"
                    : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                  Your Answer
                </span>
                <span className="font-mono text-xs font-black truncate mt-0.5">
                  {expandedCandidate ? `Option ${expandedCandidate}` : "Unattempted"}
                </span>
              </div>
              <span
                className={`h-6 w-6 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 border ${
                  expandedIsCorrect
                    ? "bg-emerald-600 text-white border-emerald-700"
                    : expandedIsWrong
                      ? "bg-rose-600 text-white border-rose-700"
                      : "bg-slate-200 text-slate-500 border-slate-300"
                }`}
              >
                {expandedCandidate || "—"}
              </span>
            </div>

            {/* Official Key */}
            <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 flex items-center justify-between gap-1.5">
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase font-bold text-emerald-800 tracking-wider">
                  Official Key
                </span>
                <span className="font-mono text-xs font-black truncate mt-0.5 text-emerald-900">
                  {expandedKey ? `Option ${expandedKey}` : "Refer below"}
                </span>
              </div>
              <span className="h-6 w-6 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 bg-emerald-600 text-white border border-emerald-700">
                {expandedKey || "✓"}
              </span>
            </div>
          </div>

          {/* Official Solution & Explanation */}
          {explanationText ? (
            <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/30 p-3 space-y-1 shadow-2xs">
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
              No explanation recorded for this question.
            </div>
          )}

          {/* Student Scratchpad Note */}
          {expandedQuestion.note && expandedQuestion.note.trim() ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-900">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                  Student Note
                </span>
                {onSaveQuestionNote && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQNo(expandedQuestion.questionNo);
                      setNoteDraft(expandedQuestion.note || "");
                    }}
                    className="text-[10px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
              {editingQNo === expandedQuestion.questionNo ? (
                <div className="space-y-1.5 pt-1">
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
                        onSaveQuestionNote?.(expandedQuestion.questionNo, noteDraft);
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
                  {expandedQuestion.note}
                </div>
              )}
            </div>
          ) : onSaveQuestionNote ? (
            editingQNo === expandedQuestion.questionNo ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 space-y-1.5 shadow-2xs">
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
                      onSaveQuestionNote?.(expandedQuestion.questionNo, noteDraft);
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
                onClick={() => {
                  setEditingQNo(expandedQuestion.questionNo);
                  setNoteDraft("");
                }}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-amber-800 transition-colors font-medium cursor-pointer"
              >
                <FileText className="h-3 w-3 text-slate-400" />
                <span>+ Add note for Q{expandedQuestion.questionNo}</span>
              </button>
            )
          ) : null}

          {/* Quick Jump: Next Mistake Navigation */}
          {hasNextMistake && onJumpToNextMistake && (
            <div className="pt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  onJumpToNextMistake();
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <span>Next Mistake</span>
                <ArrowRight className="h-3.5 w-3.5 text-rose-600" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


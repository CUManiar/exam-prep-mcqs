"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Layers,
  ChevronRight,
} from "lucide-react";
import { SyllabusItem, QuestionPaper } from "../../lib/types";
import {
  findQuestionsForSyllabusTopic,
  IndexedQuestionMatch,
} from "../../lib/syllabusQuestionIndex";

interface SyllabusMatchingQuestionsModalProps {
  topic: SyllabusItem;
  papers: QuestionPaper[];
  onClose: () => void;
  onNavigatePaper?: (paperId: string) => void;
}

export function SyllabusMatchingQuestionsModal({
  topic,
  papers,
  onClose,
  onNavigatePaper,
}: SyllabusMatchingQuestionsModalProps) {
  const [expandedQIndices, setExpandedQIndices] = useState<Set<number>>(new Set());
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());

  // Lazily compute indexed matching questions (O(1) index, max 20 questions)
  const matchingQuestions = useMemo(() => {
    return findQuestionsForSyllabusTopic(topic.title, papers, 20);
  }, [topic.title, papers]);

  const toggleExpand = (index: number) => {
    setExpandedQIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleRevealAnswer = (index: number) => {
    setRevealedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="space-y-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                <BookOpen className="h-3 w-3" />
                Syllabus Topic
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {matchingQuestions.length} {matchingQuestions.length === 1 ? "question" : "questions"} found
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate" title={topic.title}>
              {topic.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
          {matchingQuestions.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Layers className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">
                No matching questions found in current papers
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload mock papers or PYQs covering &ldquo;{topic.title}&rdquo; to practice topic-targeted questions here.
              </p>
            </div>
          ) : (
            matchingQuestions.map((q, idx) => {
              const isExpanded = expandedQIndices.has(idx);
              const isAnswerRevealed = revealedAnswers.has(idx);
              const optionKeys = Object.keys(q.options || {}).sort();

              return (
                <div
                  key={`${q.paperId}-${q.questionNo}-${idx}`}
                  className="rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-all p-3.5 space-y-2.5 shadow-2xs"
                >
                  {/* Top Metadata */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-mono text-[11px]">
                        Q{q.questionNo}
                      </span>
                      <span className="font-semibold text-indigo-700 truncate max-w-[200px] sm:max-w-[320px]" title={q.paperTitle}>
                        {q.paperTitle}
                      </span>
                      {q.previousYears && (
                        <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                          PYQ {q.previousYears}
                        </span>
                      )}
                    </div>
                    {onNavigatePaper && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigatePaper(q.paperId);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
                        title="View full paper"
                      >
                        <span>Open Paper</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Question Stem */}
                  <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                    {q.text}
                  </p>

                  {/* Options (if available) */}
                  {optionKeys.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {optionKeys.map((key) => {
                        const isCorrect = isAnswerRevealed && q.correctAnswer?.trim().toUpperCase() === key.toUpperCase();
                        return (
                          <div
                            key={key}
                            className={`flex items-start gap-2 p-2 rounded-lg border text-xs transition-colors ${
                              isCorrect
                                ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold"
                                : "bg-slate-50/60 border-slate-100 text-slate-700"
                            }`}
                          >
                            <span className="font-bold font-mono text-slate-500 uppercase shrink-0">
                              ({key})
                            </span>
                            <span className="leading-snug">{q.options[key]}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Reveal Answer & Explanation Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleRevealAnswer(idx)}
                      className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>{isAnswerRevealed ? "Hide Solution" : "Reveal Answer & Notes"}</span>
                    </button>
                  </div>

                  {/* Solution Disclosure */}
                  {isAnswerRevealed && (
                    <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 space-y-1 text-xs animate-in fade-in duration-150">
                      <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Official Answer: ({q.correctAnswer || "Not specified"})</span>
                      </div>
                      {q.explanation && (
                        <p className="text-slate-700 leading-relaxed pt-1 whitespace-pre-wrap text-[11px]">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Targeted practice powered by syllabus inverted indexing.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

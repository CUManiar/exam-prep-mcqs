"use client";

import { useState } from "react";
import {
  Target,
  X,
  Play,
  Zap,
  Clock,
} from "lucide-react";
import { QuestionAnswer, QuestionPaper } from "../../lib/types";

interface MistakeReTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchedPaper: QuestionPaper;
  incorrectQuestions: QuestionAnswer[];
  skippedQuestions: QuestionAnswer[];
  onStartReTest: (
    selectedQuestions: QuestionAnswer[],
    mode: "practice" | "mock",
  ) => void;
}

export function MistakeReTestModal({
  isOpen,
  onClose,
  matchedPaper,
  incorrectQuestions,
  skippedQuestions,
  onStartReTest,
}: MistakeReTestModalProps) {
  const [includeSkipped, setIncludeSkipped] = useState(false);
  const [targetMode, setTargetMode] = useState<"practice" | "mock">("practice");

  if (!isOpen) return null;

  const activeQuestions = includeSkipped
    ? [...incorrectQuestions, ...skippedQuestions].sort(
        (a, b) => a.questionNo - b.questionNo,
      )
    : incorrectQuestions;

  const minutesEstimate = Math.max(
    5,
    Math.ceil(
      activeQuestions.length *
        (matchedPaper.totalQuestions > 0
          ? matchedPaper.timeMinutes / matchedPaper.totalQuestions
          : 1.2),
    ),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Target className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Targeted Mistake Re-Test
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[260px]">
                {matchedPaper.label}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scope selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Practice Scope
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIncludeSkipped(false)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                !includeSkipped
                  ? "border-rose-300 bg-rose-50/70 text-rose-950 ring-1 ring-rose-400"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Incorrect Only</span>
                <span className="text-xs font-mono font-bold bg-rose-200/80 text-rose-800 px-1.5 py-0.5 rounded-md">
                  {incorrectQuestions.length} Qs
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Re-solve questions answered wrong
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIncludeSkipped(true)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                includeSkipped
                  ? "border-rose-300 bg-rose-50/70 text-rose-950 ring-1 ring-rose-400"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Wrong + Skipped</span>
                <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded-md">
                  {incorrectQuestions.length + skippedQuestions.length} Qs
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Include unattempted blanks
              </p>
            </button>
          </div>
        </div>

        {/* Mode selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Re-Test Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTargetMode("practice")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                targetMode === "practice"
                  ? "border-indigo-300 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-400"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-xs font-bold">Practice Mode</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Instant answer check &amp; explanation after each question
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTargetMode("mock")}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                targetMode === "mock"
                  ? "border-indigo-300 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-400"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-xs font-bold">Timed Mock</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Strict countdown timer &bull; {minutesEstimate} mins
              </p>
            </button>
          </div>
        </div>

        {/* Selected question numbers preview */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Questions in this session:</span>
            <span className="font-mono text-indigo-600">
              {activeQuestions.length} questions
            </span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {activeQuestions.map((q) => (
              <span
                key={q.questionNo}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  q.isCorrect === false
                    ? "bg-rose-100 text-rose-800 font-semibold"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                Q{q.questionNo}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={activeQuestions.length === 0}
            onClick={() => {
              onStartReTest(activeQuestions, targetMode);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Start Re-Test ({activeQuestions.length} Qs)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

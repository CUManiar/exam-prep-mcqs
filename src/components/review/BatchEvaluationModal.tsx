"use client";

import { useState } from "react";
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  XCircle,
  Layers,
} from "lucide-react";
import { QuestionAnswer, ParsedQuestion, Attempt } from "../../lib/types";
import { QuestionEvaluationParams } from "../../lib/questionEvaluation";

interface BatchEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempt: Attempt;
  questions: QuestionAnswer[];
  parsedQuestions?: ParsedQuestion[];
  paperExplanations?: Record<number, string>;
  onApplyBatchEvaluations: (
    results: Array<{ questionNo: number; comment: string }>,
  ) => void;
}

type BatchScope = "mistakes" | "scratchpads" | "all";

export function BatchEvaluationModal({
  isOpen,
  onClose,
  attempt,
  questions,
  parsedQuestions = [],
  paperExplanations = {},
  onApplyBatchEvaluations,
}: BatchEvaluationModalProps) {
  const [scope, setScope] = useState<BatchScope>("mistakes");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    currentQNo: number | null;
  }>({ current: 0, total: 0, currentQNo: null });
  const [completedResults, setCompletedResults] = useState<Array<{
    questionNo: number;
    comment: string;
  }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const mistakeQuestions = questions.filter((q) => q.isCorrect === false);
  const scratchpadQuestions = questions.filter(
    (q) => q.note && q.note.trim().length > 0,
  );
  const totalQuestions = questions;

  const targetQuestions =
    scope === "mistakes"
      ? mistakeQuestions
      : scope === "scratchpads"
        ? scratchpadQuestions
        : totalQuestions;

  const handleStartEvaluation = async () => {
    if (targetQuestions.length === 0) {
      setError("No questions match the selected evaluation scope.");
      return;
    }

    setIsRunning(true);
    setError(null);
    setCompletedResults(null);
    setProgress({
      current: 0,
      total: targetQuestions.length,
      currentQNo: targetQuestions[0]?.questionNo ?? null,
    });

    try {
      const { getRevisionConfig } = await import("../../lib/revisionAi");
      const providerConfig = getRevisionConfig();

      const questionParamsList: QuestionEvaluationParams[] =
        targetQuestions.map((q) => {
          const pq = parsedQuestions.find((p) => p.questionNo === q.questionNo);
          const expl =
            q.explanation ||
            pq?.explanation ||
            paperExplanations[q.questionNo] ||
            "";
          return {
            questionNo: q.questionNo,
            questionText: pq?.text || `Question ${q.questionNo}`,
            options: pq?.options,
            correctAnswer: q.correctAnswer || pq?.answer,
            explanation: expl,
            selectedAnswer: q.selected,
            isCorrect: q.isCorrect,
            scratchpadNote: q.note,
            timeSpentSeconds: q.timeSpentSeconds,
            confidence: q.confidence,
          };
        });

      // Execute in micro-batches of 3 so we can render responsive progress
      const accumulatedResults: Array<{ questionNo: number; comment: string }> =
        [];
      const chunkSize = 3;

      for (let i = 0; i < questionParamsList.length; i += chunkSize) {
        const chunk = questionParamsList.slice(i, i + chunkSize);
        setProgress({
          current: i,
          total: questionParamsList.length,
          currentQNo: chunk[0]?.questionNo ?? null,
        });

        const res = await fetch("/api/attempts/evaluate-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questions: chunk,
            providerConfig,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Batch evaluation failed.");
        }

        if (Array.isArray(data.results)) {
          accumulatedResults.push(...data.results);
        }
      }

      setProgress({
        current: questionParamsList.length,
        total: questionParamsList.length,
        currentQNo: null,
      });
      setCompletedResults(accumulatedResults);
      onApplyBatchEvaluations(accumulatedResults);
    } catch (err: any) {
      setError(err?.message || "Failed to process batch AI evaluation.");
    } finally {
      setIsRunning(false);
    }
  };

  const percentComplete =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Batch AI Attempt Evaluation
              </h3>
              <p className="text-xs text-slate-500">
                Attach question-by-question examiner feedback across this
                attempt
              </p>
            </div>
          </div>
          {!isRunning && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        {completedResults ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Evaluation Complete!
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Generated and attached personalized evaluation comments to{" "}
                  <strong>{completedResults.length} questions</strong>.
                  Scratchpad calculations and elimination steps have been
                  audited against the official solutions.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Done & View Review
              </button>
            </div>
          </div>
        ) : isRunning ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                Auditing questions with AI mentor...
              </p>
              <p className="text-xs text-slate-500 font-mono">
                {progress.currentQNo
                  ? `Analyzing Question ${progress.currentQNo} (${progress.current} of ${progress.total})`
                  : `Evaluating ${progress.current} of ${progress.total}...`}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 text-center font-mono">
              {percentComplete}% completed &bull; Scrutinizing scratchpad
              calculations
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Select Questions to Audit:
              </label>

              <div className="grid grid-cols-1 gap-2.5 text-xs">
                {/* Option 1: Mistakes Only */}
                <button
                  type="button"
                  onClick={() => setScope("mistakes")}
                  className={`p-3 rounded-xl border text-left flex items-start justify-between gap-3 cursor-pointer transition-all ${
                    scope === "mistakes"
                      ? "border-rose-400 bg-rose-50/70 ring-2 ring-rose-200"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">
                        Mistakes & Incorrect Questions
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Diagnoses trap premises, calculation slips, and
                        misreadings
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-white border border-slate-200 text-rose-700 shrink-0">
                    {mistakeQuestions.length} Qs
                  </span>
                </button>

                {/* Option 2: Scratchpads */}
                <button
                  type="button"
                  onClick={() => setScope("scratchpads")}
                  className={`p-3 rounded-xl border text-left flex items-start justify-between gap-3 cursor-pointer transition-all ${
                    scope === "scratchpads"
                      ? "border-amber-400 bg-amber-50/70 ring-2 ring-amber-200"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <FileText className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">
                        Questions with Scratchpad Notes
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Audits formulas, calculations, and accidental correct
                        answers
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-white border border-slate-200 text-amber-700 shrink-0">
                    {scratchpadQuestions.length} Qs
                  </span>
                </button>

                {/* Option 3: All Questions */}
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`p-3 rounded-xl border text-left flex items-start justify-between gap-3 cursor-pointer transition-all ${
                    scope === "all"
                      ? "border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-200"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Layers className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">
                        Entire Question Set
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Full exam review across correct, incorrect, and skipped
                        questions
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-white border border-slate-200 text-indigo-700 shrink-0">
                    {totalQuestions.length} Qs
                  </span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartEvaluation}
                disabled={targetQuestions.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  Start Evaluation ({targetQuestions.length} Questions)
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

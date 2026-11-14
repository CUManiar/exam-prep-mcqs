"use client";
import { Attempt, QuestionPaper } from "../../lib/types";
import { getPaperCutoffStatus } from "../../lib/defaults";
import { ArrowRight, Award, BookOpen, RotateCcw, Sparkles } from "lucide-react";

interface LastThreePapersSummaryProps {
  attempts: Attempt[];
  papers: QuestionPaper[];
  onViewAttempt: (attempt: Attempt) => void;
  onNavigatePapers: () => void;
  onStartExam?: (paper: QuestionPaper, mode?: "practice" | "mock") => void;
}

function formatDate(value?: string): string {
  if (!value) return "Recently";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs}h ${remainingMins}m`;
}

export function LastThreePapersSummary({
  attempts,
  papers,
  onViewAttempt,
  onNavigatePapers,
  onStartExam,
}: LastThreePapersSummaryProps) {
  // Sort completed attempts newest first
  const completedAttempts = [...attempts]
    .filter((a) => Boolean(a.finishedAt))
    .sort(
      (a, b) =>
        new Date(b.finishedAt || b.startedAt).getTime() -
        new Date(a.finishedAt || a.startedAt).getTime(),
    );

  const lastThree = completedAttempts.slice(0, 3);

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-300/60">
              <Award className="h-4 w-4" />
            </span>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              Last 3 Assessments Summary
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Compare your recent exam simulations, negative mark impact, and
            cutoff clearance.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigatePapers}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer self-start sm:self-auto"
        >
          Browse paper library <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {lastThree.length === 0 ? (
        <div className="surface-card p-8 text-center rounded-2xl border border-dashed border-slate-200">
          <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="mt-2 text-sm font-semibold text-slate-800">
            No completed assessments yet
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Take a mock test or practice set to unlock instant performance
            summaries, cutoff status, and mistake analysis.
          </p>
          <button
            type="button"
            onClick={onNavigatePapers}
            className="mt-4 button-primary mx-auto"
          >
            Start your first test <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {lastThree.map((attempt, index) => {
            const matchedPaper = papers.find((p) => p.id === attempt.paperId);
            const cutoffInfo = getPaperCutoffStatus(matchedPaper, attempt);
            const accuracy = Math.round(attempt.accuracyPct || 0);

            // Compute negative mark deduction
            const penaltyPerIncorrect = attempt.incorrectMarks || 0.667;
            const totalPenalty =
              Math.round((attempt.incorrect || 0) * penaltyPerIncorrect * 10) /
              10;

            const isMock = attempt.mode === "mock";

            return (
              <div
                key={attempt.id}
                className="surface-card flex flex-col justify-between p-5 rounded-2xl border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {index === 0 ? "Latest Test" : `Test #${index + 1}`}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-bold uppercase ${
                            isMock
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-sky-50 text-sky-700 border border-sky-200"
                          }`}
                        >
                          {isMock ? "Mock Test" : "Practice"}
                        </span>
                      </div>
                      <h3
                        className="mt-1 font-bold text-slate-900 text-sm truncate"
                        title={attempt.paperLabel}
                      >
                        {attempt.paperLabel}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(attempt.finishedAt || attempt.startedAt)} ·{" "}
                        {formatDuration(attempt.durationSeconds)}
                      </p>
                    </div>

                    {/* Cutoff pill */}
                    {cutoffInfo && (
                      <span
                        className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          cutoffInfo.cutoffCleared
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        {cutoffInfo.badgeText ||
                          (cutoffInfo.cutoffCleared
                            ? "Qualified"
                            : "Below Cutoff")}
                      </span>
                    )}
                  </div>

                  {/* Main Score & Accuracy Banner */}
                  <div className="mt-4 flex items-baseline justify-between rounded-xl bg-slate-50/80 p-3 border border-slate-100">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        Net Score
                      </span>
                      <div className="mt-0.5 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900 tabular-nums">
                          {attempt.score}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          / {attempt.maxScore}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        Accuracy
                      </span>
                      <div className="mt-0.5 flex items-baseline justify-end gap-1">
                        <span
                          className={`text-xl font-bold tabular-nums ${
                            accuracy >= 75
                              ? "text-emerald-700"
                              : accuracy >= 60
                                ? "text-blue-700"
                                : "text-amber-700"
                          }`}
                        >
                          {accuracy}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Question Breakdown Chips */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-xs">
                    <div className="rounded-lg bg-emerald-50/70 border border-emerald-100 p-1.5">
                      <span className="block text-emerald-800 font-bold tabular-nums">
                        {attempt.correct || 0}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium">
                        Correct
                      </span>
                    </div>

                    <div className="rounded-lg bg-rose-50/70 border border-rose-100 p-1.5">
                      <span className="block text-rose-800 font-bold tabular-nums">
                        {attempt.incorrect || 0}
                      </span>
                      <span className="text-[10px] text-rose-600 font-medium">
                        Wrong
                      </span>
                    </div>

                    <div className="rounded-lg bg-slate-100/70 border border-slate-200/60 p-1.5">
                      <span className="block text-slate-700 font-bold tabular-nums">
                        {attempt.unattempted ??
                          Math.max(
                            0,
                            (attempt.totalQuestions || 0) -
                              (attempt.answered || 0),
                          )}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Skipped
                      </span>
                    </div>
                  </div>

                  {/* Negative deduction & alteration impact footer */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span>
                      Penalty lost:{" "}
                      <strong className="text-rose-600 font-semibold">
                        -{totalPenalty} marks
                      </strong>
                    </span>
                    {attempt.alteredCount && attempt.alteredCount > 0 ? (
                      <span className="text-indigo-700 font-medium">
                        {attempt.alteredBenefitCount || 0} beneficial changes
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        {attempt.answered}/{attempt.totalQuestions} answered
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onViewAttempt(attempt)}
                    className="flex-1 button-secondary text-xs py-1.5 justify-center font-bold cursor-pointer"
                  >
                    Review Paper <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  {matchedPaper && onStartExam && (
                    <button
                      type="button"
                      onClick={() => onStartExam(matchedPaper, "mock")}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Re-attempt this paper"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* If user has 1 or 2 completed tests, show an invitation card for the 3rd slot */}
          {lastThree.length < 3 && (
            <div className="surface-card flex flex-col justify-center items-center p-6 text-center rounded-2xl border border-dashed border-blue-200 bg-blue-50/30">
              <Sparkles className="h-7 w-7 text-blue-500" />
              <h4 className="mt-2 text-sm font-semibold text-slate-800">
                Complete more assessments
              </h4>
              <p className="mt-1 text-xs text-slate-500 max-w-[220px]">
                Complete {3 - lastThree.length} more test
                {3 - lastThree.length > 1 ? "s" : ""} to view full 3-paper
                comparison and accuracy pacing.
              </p>
              <button
                type="button"
                onClick={onNavigatePapers}
                className="mt-3 button-primary text-xs py-1.5 px-3"
              >
                Take a test now
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

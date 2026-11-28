"use client";

import { useMemo } from "react";
import { Attempt } from "../../lib/types";
import { getAttemptPercentage } from "../../lib/defaults";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  FileText,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface SubjectiveAnalyticsSectionProps {
  attempts: Attempt[];
  onViewAttempt: (attempt: Attempt) => void;
  onNavigatePapers: () => void;
}

export function SubjectiveAnalyticsSection({
  attempts,
  onViewAttempt,
  onNavigatePapers,
}: SubjectiveAnalyticsSectionProps) {
  const bandStats = useMemo(() => {
    let strong = 0;
    let partial = 0;
    let needsWork = 0;
    let unscored = 0;
    let totalMarksAwarded = 0;
    let totalMaxMarks = 0;

    for (const attempt of attempts) {
      totalMarksAwarded += Number(attempt.score || 0);
      totalMaxMarks += Number(attempt.maxScore || 0);
      const ansValues = Object.values(attempt.answers || {});
      for (const ans of ansValues) {
        if (!ans) continue;
        if (ans.subjectiveAssessment === "strong") strong += 1;
        else if (ans.subjectiveAssessment === "partial") partial += 1;
        else if (ans.subjectiveAssessment === "needs-work") needsWork += 1;
        else if (ans.selected === "attempted") unscored += 1;
      }
    }

    const total = strong + partial + needsWork + unscored;
    return {
      strong,
      partial,
      needsWork,
      unscored,
      total,
      totalMarksAwarded: Math.round(totalMarksAwarded * 10) / 10,
      totalMaxMarks: Math.round(totalMaxMarks * 10) / 10,
    };
  }, [attempts]);

  const recentTrend = useMemo(
    () => [...attempts].slice(0, 8).reverse(),
    [attempts],
  );

  if (attempts.length === 0) {
    return (
      <section className="surface-card rounded-2xl border border-slate-200/90 p-6 sm:p-8 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 border border-violet-200">
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          No Subjective (Mains) Attempts Yet
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Attempt a Mains paper, upload your answer booklet on submit, and AI
          question-wise scores &amp; examiner feedback will appear here.
        </p>
        <button
          type="button"
          onClick={onNavigatePapers}
          className="button-primary text-xs py-2 cursor-pointer"
        >
          Browse Mains Papers
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Subjective Score Trend */}
        <section className="lg:col-span-2 surface-card rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" /> Mains Score Trajectory
              </p>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                Subjective Paper Percentage Trend
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500">
              Last {recentTrend.length} papers
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 items-end pt-2 min-h-[150px]">
            {recentTrend.map((attempt) => {
              const pct = getAttemptPercentage(attempt);
              const barHeight = Math.max(14, Math.min(100, pct));
              const isEvaluated =
                attempt.score > 0 || Boolean(attempt.generalNotes);
              return (
                <button
                  key={attempt.id}
                  type="button"
                  onClick={() => onViewAttempt(attempt)}
                  className="group flex flex-col items-center gap-1.5 text-center cursor-pointer"
                  title={`${attempt.paperLabel}: ${attempt.score}/${attempt.maxScore} (${pct}%)`}
                >
                  <span className="text-[11px] font-bold tabular-nums text-slate-700 group-hover:text-violet-700">
                    {pct}%
                  </span>
                  <div className="w-full max-w-[36px] h-24 rounded-lg bg-slate-100 border border-slate-200/80 flex items-end overflow-hidden p-0.5">
                    <div
                      className={`w-full rounded-md transition-all ${
                        isEvaluated
                          ? pct >= 50
                            ? "bg-emerald-500 group-hover:bg-emerald-600"
                            : pct >= 35
                              ? "bg-violet-500 group-hover:bg-violet-600"
                              : "bg-amber-500 group-hover:bg-amber-600"
                          : "bg-slate-300"
                      }`}
                      style={{ height: `${barHeight}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 truncate w-full font-medium">
                    {attempt.paperLabel.replace(/^\d{4}\s*–\s*Mains\s*/i, "")}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Answer Quality Band Breakdown */}
        <section className="surface-card rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
              <Award className="h-3.5 w-3.5" /> Answer Quality Bands
            </p>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
              Question-Level Breakdown
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            {[
              {
                label: "Strong (High-Yield)",
                count: bandStats.strong,
                color: "bg-emerald-500",
                pill: "text-emerald-700 bg-emerald-50 border-emerald-200",
              },
              {
                label: "Partial (Needs Depth)",
                count: bandStats.partial,
                color: "bg-amber-500",
                pill: "text-amber-700 bg-amber-50 border-amber-200",
              },
              {
                label: "Needs Work",
                count: bandStats.needsWork,
                color: "bg-rose-500",
                pill: "text-rose-700 bg-rose-50 border-rose-200",
              },
              {
                label: "Pending Evaluation",
                count: bandStats.unscored,
                color: "bg-slate-400",
                pill: "text-slate-600 bg-slate-100 border-slate-200",
              },
            ].map((band) => {
              const pct =
                bandStats.total > 0
                  ? Math.round((band.count / bandStats.total) * 100)
                  : 0;
              return (
                <div key={band.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">
                      {band.label}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-bold tabular-nums ${band.pill}`}
                    >
                      {band.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${band.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Latest AI Feedback Cards */}
      <section className="surface-card rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-violet-600" /> Recent Mains
            Evaluations
          </h3>
          <span className="text-xs text-slate-500">
            Cumulative: {bandStats.totalMarksAwarded} /{" "}
            {bandStats.totalMaxMarks} marks
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {attempts.slice(0, 4).map((attempt) => {
            const pct = getAttemptPercentage(attempt);
            const hasAiFeedback = Boolean(attempt.generalNotes?.trim());
            return (
              <div
                key={attempt.id}
                role="button"
                tabIndex={0}
                onClick={() => onViewAttempt(attempt)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onViewAttempt(attempt);
                  }
                }}
                className="rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-violet-300 p-3.5 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {attempt.paperLabel}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {attempt.answered}/{attempt.totalQuestions} questions
                      addressed
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs font-bold text-violet-800 shrink-0 tabular-nums">
                    {attempt.score}/{attempt.maxScore} ({pct}%)
                  </span>
                </div>

                {hasAiFeedback ? (
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {attempt.generalNotes}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 italic flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Open review to inspect
                    question-wise marks
                  </p>
                )}

                <div className="flex justify-end">
                  <span className="text-[11px] font-semibold text-violet-700 inline-flex items-center gap-1">
                    Review feedback <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

"use client";

import React, { useMemo } from "react";
import { Attempt, QuestionPaper } from "../../lib/types";
import { getAttemptPercentage } from "../../lib/defaults";
import { isSpecificSingleSubject } from "../../lib/markdownPaperParser";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Compass,
  LineChart,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

interface RecentTestInsightsProps {
  attempts: Attempt[];
  papers: QuestionPaper[];
  onNavigateHistory: () => void;
  onViewAttempt: (attempt: Attempt) => void;
}

function normalizeSubjectName(subj: string): string {
  const s = (subj || "").trim();
  const lower = s.toLowerCase();
  if (lower === "gs" || lower === "general" || lower === "general studies") {
    return "General Studies";
  }
  if (
    lower === "csat" ||
    lower === "gs ii csat" ||
    lower === "gs 2" ||
    lower === "gs ii"
  ) {
    return "CSAT";
  }
  if (lower.includes("polity")) return "Polity";
  if (lower.includes("economy")) return "Economy";
  if (lower.includes("geography")) return "Geography";
  if (lower.includes("history")) return "History";
  if (lower.includes("environment")) return "Environment";
  if (lower.includes("science")) return "Science & Tech";
  if (lower.includes("ethics")) return "Ethics";
  return s || "General Studies";
}

export function RecentTestInsights({
  attempts,
  papers,
  onNavigateHistory,
  onViewAttempt,
}: RecentTestInsightsProps) {
  const completed = useMemo(
    () =>
      [...attempts]
        .filter((a) => Boolean(a.finishedAt))
        .sort(
          (a, b) =>
            new Date(b.finishedAt || b.startedAt).getTime() -
            new Date(a.finishedAt || a.startedAt).getTime(),
        ),
    [attempts],
  );

  // Chronological last 6 attempts for trajectory graph
  const trajectoryPoints = useMemo(() => {
    return [...completed]
      .slice(0, 6)
      .reverse()
      .map((att) => {
        const pct = getAttemptPercentage(att);
        const acc = Math.round(att.accuracyPct || 0);
        return {
          id: att.id,
          paperLabel: att.paperLabel,
          scorePct: pct,
          accuracyPct: acc,
          score: att.score,
          maxScore: att.maxScore,
          mode: att.mode,
          attempt: att,
        };
      });
  }, [completed]);

  // Aggregate subject strengths vs focus areas
  const subjectBreakdown = useMemo(() => {
    const map: Record<
      string,
      {
        subject: string;
        attemptsCount: number;
        totalQuestions: number;
        totalAnswered: number;
        totalCorrect: number;
        totalIncorrect: number;
      }
    > = {};

    completed.forEach((att) => {
      const matched = papers.find((p) => p.id === att.paperId);
      const paperSubject =
        matched?.subject || att.paperLabel || att.category || "General Studies";
      const isSingleSubject = isSpecificSingleSubject(paperSubject);

      if (isSingleSubject) {
        const subj = normalizeSubjectName(paperSubject);
        if (!map[subj]) {
          map[subj] = {
            subject: subj,
            attemptsCount: 0,
            totalQuestions: 0,
            totalAnswered: 0,
            totalCorrect: 0,
            totalIncorrect: 0,
          };
        }
        map[subj].attemptsCount += 1;
        map[subj].totalQuestions += att.totalQuestions || 0;
        map[subj].totalAnswered += att.answered || 0;
        map[subj].totalCorrect += att.correct || 0;
        map[subj].totalIncorrect += att.incorrect || 0;
      } else {
        const answerEntries = Object.values(att.answers || {});
        if (answerEntries.length > 0) {
          const subjectsInThisAttempt = new Set<string>();

          answerEntries.forEach((ans) => {
            const rawSubj =
              ans.subject ||
              matched?.parsedQuestions?.find(
                (pq) => pq.questionNo === ans.questionNo,
              )?.subject ||
              paperSubject;
            const normSubj = normalizeSubjectName(rawSubj);
            subjectsInThisAttempt.add(normSubj);

            if (!map[normSubj]) {
              map[normSubj] = {
                subject: normSubj,
                attemptsCount: 0,
                totalQuestions: 0,
                totalAnswered: 0,
                totalCorrect: 0,
                totalIncorrect: 0,
              };
            }
            map[normSubj].totalQuestions += 1;
            if (ans.selected) {
              map[normSubj].totalAnswered += 1;
              if (ans.isCorrect) {
                map[normSubj].totalCorrect += 1;
              } else if (ans.isCorrect === false) {
                map[normSubj].totalIncorrect += 1;
              }
            }
          });

          subjectsInThisAttempt.forEach((s) => {
            if (map[s]) map[s].attemptsCount += 1;
          });
        }
      }
    });

    return Object.values(map)
      .map((item) => {
        const accuracy =
          item.totalAnswered > 0
            ? Math.round((item.totalCorrect / item.totalAnswered) * 100)
            : 0;
        return {
          ...item,
          accuracy,
        };
      })
      .sort((a, b) => b.totalAnswered - a.totalAnswered);
  }, [completed, papers]);

  // Strategic Alteration & Pacing Stats
  const strategyStats = useMemo(() => {
    let totalAlterations = 0;
    let beneficialAlterations = 0;
    let harmfulAlterations = 0;
    let totalTimeSeconds = 0;
    let totalAnsweredQ = 0;

    completed.forEach((att) => {
      totalAlterations += att.alteredCount || 0;
      beneficialAlterations += att.alteredBenefitCount || 0;
      harmfulAlterations += att.alteredHarmCount || 0;
      totalTimeSeconds += att.durationSeconds || 0;
      totalAnsweredQ += att.answered || 0;
    });

    const avgSecondsPerQ =
      totalAnsweredQ > 0 ? Math.round(totalTimeSeconds / totalAnsweredQ) : 0;
    const netAlterationMarks =
      beneficialAlterations * 2 - harmfulAlterations * 0.667;

    return {
      totalAlterations,
      beneficialAlterations,
      harmfulAlterations,
      avgSecondsPerQ,
      netAlterationMarks: Math.round(netAlterationMarks * 10) / 10,
    };
  }, [completed]);

  return (
    <div className="surface-card p-5 sm:p-6 space-y-6">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-300/60">
            <LineChart className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Exam Insights &amp; Trajectory
            </h2>
            <p className="text-[11px] text-slate-500">
              Score trajectory curve, subject mastery, and strategic test-taking
              metrics.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateHistory}
          className="text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer inline-flex items-center gap-1"
        >
          Detailed History <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Trajectory Curve Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Score &amp; Accuracy Trajectory (Last {trajectoryPoints.length}{" "}
            Tests)
          </span>
          <div className="flex items-center gap-3 text-[10px] font-semibold">
            <span className="flex items-center gap-1 text-indigo-700">
              <span className="h-2 w-2 rounded-full bg-indigo-600" /> Score %
            </span>
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Accuracy
              %
            </span>
          </div>
        </div>

        {trajectoryPoints.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-400">
            Complete assessments to plot your learning curve and test-by-test
            score trajectory.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:p-4 space-y-3">
            {/* Visual multi-point trajectory bar comparison */}
            <div className="grid grid-cols-6 gap-2 h-28 items-end pt-4 pb-1">
              {trajectoryPoints.map((pt, i) => {
                const scoreHeight = Math.max(8, Math.min(100, pt.scorePct));
                const accHeight = Math.max(8, Math.min(100, pt.accuracyPct));

                return (
                  <div
                    key={pt.id}
                    onClick={() => onViewAttempt(pt.attempt)}
                    className="group flex flex-col justify-end items-center h-full gap-1 cursor-pointer"
                    title={`${pt.paperLabel}: ${pt.scorePct}% score · ${pt.accuracyPct}% accuracy`}
                  >
                    <div className="flex items-end gap-1 h-full w-full justify-center">
                      {/* Score bar */}
                      <div
                        className="w-2.5 sm:w-3.5 bg-indigo-600 rounded-t-sm group-hover:bg-indigo-700 transition-all"
                        style={{ height: `${scoreHeight}%` }}
                      />
                      {/* Accuracy bar */}
                      <div
                        className="w-2.5 sm:w-3.5 bg-emerald-500 rounded-t-sm group-hover:bg-emerald-600 transition-all"
                        style={{ height: `${accHeight}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                      T{i + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/80 pt-2">
              <span>Prelims Cutoff Benchmark ~45–50%</span>
              <span className="text-slate-600 font-semibold">
                Latest:{" "}
                {trajectoryPoints[trajectoryPoints.length - 1]?.scorePct}% Score
                ({trajectoryPoints[trajectoryPoints.length - 1]?.accuracyPct}%
                Acc)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Strategic Decision & Pacing Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <Clock className="h-3 w-3 text-slate-400" />
            Avg Time / MCQ
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 tabular-nums">
              {strategyStats.avgSecondsPerQ || 0}
            </span>
            <span className="text-xs font-semibold text-slate-400">sec/Q</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Ideal target: 50–70s for Prelims GS1
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <Zap className="h-3 w-3 text-amber-500" />
            Alteration Impact
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`text-xl font-black tabular-nums ${
                strategyStats.netAlterationMarks >= 0
                  ? "text-emerald-700"
                  : "text-rose-700"
              }`}
            >
              {strategyStats.netAlterationMarks >= 0 ? "+" : ""}
              {strategyStats.netAlterationMarks}
            </span>
            <span className="text-xs font-semibold text-slate-400">marks</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {strategyStats.beneficialAlterations} helped vs{" "}
            {strategyStats.harmfulAlterations} hurt
          </span>
        </div>
      </div>

      {/* Subject-Wise Mastery Bars */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span>Subject Accuracy Mastery</span>
          <span className="text-[11px] font-normal text-slate-400">
            Top Domains
          </span>
        </div>

        {subjectBreakdown.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">
            Subject strength mapping will emerge as you solve papers.
          </p>
        ) : (
          <div className="space-y-2">
            {subjectBreakdown.slice(0, 4).map((subj) => (
              <div key={subj.subject} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                    {subj.subject}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {subj.totalAnswered} Qs
                    </span>
                    <span
                      className={`font-mono font-bold text-xs ${
                        subj.accuracy >= 75
                          ? "text-emerald-700"
                          : subj.accuracy >= 60
                            ? "text-amber-700"
                            : "text-rose-700"
                      }`}
                    >
                      {subj.accuracy}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      subj.accuracy >= 75
                        ? "bg-emerald-500"
                        : subj.accuracy >= 60
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.max(4, subj.accuracy)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

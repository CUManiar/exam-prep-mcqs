"use client";

import React, { useState, useMemo } from "react";
import { ActiveSessionDraft, Attempt, QuestionPaper } from "../lib/types";
import { getAttemptPercentage } from "../lib/defaults";
import { isSpecificSingleSubject } from "../lib/markdownPaperParser";
import {
  ArrowRight,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Flame,
  Percent,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "./PageHeader";

interface DashboardViewProps {
  papers: QuestionPaper[];
  attempts: Attempt[];
  onNavigatePapers: () => void;
  onNavigateHistory: () => void;
  onViewAttempt: (attempt: Attempt) => void;
  onDeleteAttempt?: (attemptId: string) => void;
  activeDraft?: ActiveSessionDraft | null;
  onResumeDraft?: (draft: ActiveSessionDraft) => void;
  onDiscardDraft?: () => void;
}

function formatAttemptDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function calculatePracticeStreak(attempts: Attempt[]) {
  if (attempts.length === 0) return { currentStreak: 0, isActiveToday: false };

  const uniqueDates = new Set<string>();
  attempts.forEach((a) => {
    const d = new Date(a.finishedAt || a.startedAt);
    if (!Number.isNaN(d.getTime())) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      uniqueDates.add(dateStr);
    }
  });

  const today = new Date();
  const formatD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const todayStr = formatD(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatD(yesterday);

  const isActiveToday = uniqueDates.has(todayStr);
  let streak = 0;

  let checkDate = isActiveToday ? today : yesterday;
  if (!isActiveToday && !uniqueDates.has(yesterdayStr)) {
    return { currentStreak: 0, isActiveToday: false };
  }

  while (uniqueDates.has(formatD(checkDate))) {
    streak++;
    const prev = new Date(checkDate);
    prev.setDate(prev.getDate() - 1);
    checkDate = prev;
  }

  return { currentStreak: streak, isActiveToday };
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

export function DashboardView({
  papers,
  attempts,
  onNavigatePapers,
  onNavigateHistory,
  onViewAttempt,
  onDeleteAttempt,
  activeDraft,
  onResumeDraft,
  onDiscardDraft,
}: DashboardViewProps) {
  const [dailyTarget] = useState<number>(() => {
    if (typeof window === "undefined") return 25;
    const saved = localStorage.getItem("exam_prep_daily_target");
    return saved ? parseInt(saved, 10) || 25 : 25;
  });

  const completed = [...attempts]
    .filter((attempt) => Boolean(attempt.finishedAt))
    .sort(
      (a, b) =>
        new Date(b.finishedAt || b.startedAt).getTime() -
        new Date(a.finishedAt || a.startedAt).getTime(),
    );
  const questionsAnswered = completed.reduce(
    (sum, attempt) => sum + (attempt.answered || 0),
    0,
  );
  const averageAccuracy = completed.length
    ? Math.round(
        (completed.reduce(
          (sum, attempt) => sum + (attempt.accuracyPct || 0),
          0,
        ) /
          completed.length) *
          10,
      ) / 10
    : null;
  const averagePercentage = completed.length
    ? Math.round(
        (completed.reduce(
          (sum, attempt) => sum + getAttemptPercentage(attempt),
          0,
        ) /
          completed.length) *
          10,
      ) / 10
    : null;
  const latestAttempt = completed[0];

  const streakData = useMemo(
    () => calculatePracticeStreak(completed),
    [completed],
  );

  const todayAnsweredCount = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return completed
      .filter((a) => {
        const d = new Date(a.finishedAt || a.startedAt);
        if (Number.isNaN(d.getTime())) return false;
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return dStr === todayStr;
      })
      .reduce((sum, a) => sum + (a.answered || 0), 0);
  }, [completed]);

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
        // Top-level subject explicitly specified: mix-up not allowed, all questions belong to paper subject
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
        // Mixed paper, revision quiz, or daily quiz: attribute each question to its individual subject
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
        } else {
          // Fallback if no individual answers object exists
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
        }
      }
    });

    return Object.values(map)
      .map((item) => {
        const accuracy =
          item.totalAnswered > 0
            ? Math.round((item.totalCorrect / item.totalAnswered) * 100)
            : 0;
        let status = "Needs Focus";
        let statusColor = "text-rose-700 bg-rose-50 border-rose-200";
        let barColor = "bg-rose-500";
        if (accuracy >= 75) {
          status = "Strong";
          statusColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
          barColor = "bg-emerald-500";
        } else if (accuracy >= 60) {
          status = "Moderate";
          statusColor = "text-amber-700 bg-amber-50 border-amber-200";
          barColor = "bg-amber-500";
        }
        return {
          ...item,
          accuracy,
          status,
          statusColor,
          barColor,
        };
      })
      .sort((a, b) => b.totalAnswered - a.totalAnswered);
  }, [completed, papers]);

  const metrics = [
    {
      label: "Assessments completed",
      value: completed.length,
      icon: FileCheck2,
      iconClass: "text-indigo-600",
      iconBgClass: "bg-indigo-50 ring-indigo-100",
    },
    {
      label: "Practice streak",
      value: `${streakData.currentStreak} ${streakData.currentStreak === 1 ? "day" : "days"}`,
      icon: Flame,
      iconClass: "text-amber-500",
      iconBgClass: "bg-amber-50 ring-amber-100",
    },
    {
      label: "Questions answered",
      value: questionsAnswered,
      icon: Target,
      iconClass: "text-sky-600",
      iconBgClass: "bg-sky-50 ring-sky-100",
    },
    {
      label: "Average accuracy",
      value: averageAccuracy === null ? "—" : `${averageAccuracy}%`,
      icon: BarChart3,
      iconClass: "text-emerald-600",
      iconBgClass: "bg-emerald-50 ring-emerald-100",
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Your study workspace"
        title="Assessment overview"
        description="Choose a paper, complete an assessment, and review your progress."
        actions={
          <button
            type="button"
            onClick={onNavigatePapers}
            className="button-primary"
          >
            <BookOpen className="h-4 w-4" /> Browse papers
          </button>
        }
      />

      {activeDraft && (
        <section
          className="mb-6 flex flex-col gap-4 rounded-lg border border-blue-200 bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          aria-label="Assessment in progress"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-blue-700 ring-1 ring-blue-200">
              <Clock3 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                Assessment in progress
              </p>
              <h2 className="mt-1 truncate text-base font-semibold text-slate-900">
                {activeDraft.paperLabel}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Your answers and timer were saved. Continue when you’re ready.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 sm:pl-4">
            <button
              type="button"
              onClick={() => onResumeDraft?.(activeDraft)}
              className="button-primary"
            >
              <RotateCcw className="h-4 w-4" /> Resume assessment
            </button>
            <button
              type="button"
              onClick={onDiscardDraft}
              className="button-secondary"
            >
              Discard
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, iconClass, iconBgClass }) => (
          <div
            key={label}
            className="surface-card flex items-center gap-3 p-4 sm:p-5"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${iconBgClass}`}
            >
              <Icon className={`h-5 w-5 ${iconClass}`} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-slate-500">
                {label}
              </span>
              <span className="mt-1 block text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {value}
              </span>
            </span>
          </div>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Habit & Streak Momentum Widget */}
        <div className="surface-card flex flex-col justify-between p-5 sm:p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="page-eyebrow">Daily Momentum</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${streakData.isActiveToday ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}
              >
                <Flame
                  className={`h-3.5 w-3.5 ${streakData.isActiveToday ? "text-amber-500 fill-amber-500" : "text-slate-400"}`}
                />
                {streakData.currentStreak} Day
                {streakData.currentStreak === 1 ? "" : "s"} Streak
              </span>
            </div>
            <h2 className="mt-1 text-base sm:text-lg font-semibold text-slate-900">
              Today&apos;s Target
            </h2>

            {/* Target progress */}
            <div className="mt-4 space-y-2">
              <div className="flex items-baseline justify-between text-xs font-medium">
                <span className="text-slate-500">
                  {todayAnsweredCount} of {dailyTarget} MCQs completed today
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {Math.min(
                    100,
                    Math.round((todayAnsweredCount / dailyTarget) * 100),
                  )}
                  %
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/70">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${todayAnsweredCount >= dailyTarget ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{
                    width: `${Math.min(100, Math.round((todayAnsweredCount / dailyTarget) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              {todayAnsweredCount >= dailyTarget
                ? "🎉 Target reached! You've met your daily MCQ practice quota."
                : `${dailyTarget - todayAnsweredCount} more MCQs to achieve today's goal and solidify your streak.`}
            </p>
          </div>

          <button
            type="button"
            onClick={onNavigatePapers}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 self-start pt-1 cursor-pointer"
          >
            Practice MCQs now <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Card 2: Latest Signal (Progress Snapshot) */}
        <div className="surface-card flex flex-col justify-between p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="page-eyebrow">Progress snapshot</p>
              <h2 className="mt-1 text-base sm:text-lg font-semibold text-slate-900">
                Latest Signal
              </h2>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>

          {latestAttempt ? (
            <div className="mt-4 flex flex-1 flex-col justify-between">
              <div>
                <p className="truncate text-sm font-semibold text-slate-800">
                  {latestAttempt.paperLabel}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {latestAttempt.mode === "mock" ? "Mock" : "Practice"} ·{" "}
                  {formatAttemptDate(
                    latestAttempt.finishedAt || latestAttempt.startedAt,
                  )}
                </p>
                <div className="mt-4 flex items-end gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Score</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {latestAttempt.score}
                      <span className="ml-1 text-xs font-medium text-slate-400">
                        / {latestAttempt.maxScore}
                      </span>
                    </p>
                  </div>
                  <div className="border-l border-slate-200 pl-4">
                    <p className="text-xs font-medium text-slate-500">
                      Accuracy
                    </p>
                    <p className="mt-1 text-xl font-bold text-emerald-700 tabular-nums">
                      {Math.round(latestAttempt.accuracyPct || 0)}%
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onViewAttempt(latestAttempt)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 self-start cursor-pointer"
              >
                Review assessment <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-1 flex-col justify-center rounded-xl bg-slate-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-slate-400" />
              <p className="mt-2 text-xs font-semibold text-slate-800">
                No completed assessment yet
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Your first score and review will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Card 3: Subject-Wise Mastery Breakdown */}
        <div className="surface-card flex flex-col justify-between p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="page-eyebrow">Domain Mastery</p>
              <h2 className="mt-1 text-base sm:text-lg font-semibold text-slate-900">
                Subject Accuracy
              </h2>
            </div>
            <BarChart3 className="h-5 w-5 text-indigo-600" />
          </div>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto max-h-[14rem]">
            {subjectBreakdown.length === 0 ? (
              <div className="flex flex-col justify-center h-full rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-700">
                  No subject data yet
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Complete questions from different subjects to reveal your
                  domain strengths.
                </p>
              </div>
            ) : (
              subjectBreakdown.slice(0, 5).map((subj) => (
                <div key={subj.subject} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                      {subj.subject}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono font-bold text-slate-700">
                        {subj.accuracy}%
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${subj.statusColor}`}
                      >
                        {subj.status}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${subj.barColor}`}
                      style={{ width: `${subj.accuracy}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={onNavigateHistory}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800 self-start cursor-pointer"
          >
            View full analytics <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="page-eyebrow">Recent activity</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Latest assessments
            </h2>
          </div>
          <button
            type="button"
            onClick={onNavigateHistory}
            className="text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            View all
          </button>
        </div>
        <div className="surface-card overflow-hidden">
          {completed.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-800">
                No completed assessments yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Your scores and review history will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {completed.slice(0, 4).map((attempt) => {
                const paperExists = papers.some(
                  (paper) => paper.id === attempt.paperId,
                );
                return (
                  <li key={attempt.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onViewAttempt(attempt)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onViewAttempt(attempt);
                        }
                      }}
                      className="flex w-full cursor-pointer flex-col gap-3 px-4 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
                          <span className="truncate">{attempt.paperLabel}</span>
                          {!paperExists && (
                            <span
                              className="shrink-0 text-amber-600"
                              aria-label="Linked paper deleted"
                              title="The paper linked to this assessment has been deleted."
                            >
                              <AlertTriangle
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {formatAttemptDate(
                            attempt.finishedAt || attempt.startedAt,
                          )}{" "}
                          <span className="mx-1.5">·</span>{" "}
                          {attempt.mode === "mock" ? "Mock" : "Practice"}
                        </span>
                      </span>
                      <span className="flex items-center gap-4 text-xs sm:justify-end">
                        <span className="text-slate-600">
                          {attempt.answered}/{attempt.totalQuestions} answered
                        </span>
                        <span className="font-semibold tabular-nums text-slate-900">
                          {attempt.score}/{attempt.maxScore}
                        </span>
                        <span className="font-medium tabular-nums text-indigo-700">
                          {getAttemptPercentage(attempt)}%
                        </span>
                        <span className="font-medium tabular-nums text-slate-700">
                          {Math.round(attempt.accuracyPct || 0)}%
                        </span>
                        {!paperExists && onDeleteAttempt && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteAttempt(attempt.id);
                            }}
                            className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            aria-label="Delete assessment"
                            title="Delete this assessment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <ArrowRight className="hidden h-4 w-4 text-slate-400 sm:block" />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

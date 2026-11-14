"use client";

import { useMemo } from "react";
import { ActiveSessionDraft, Attempt, QuestionPaper } from "../lib/types";
import { getAttemptPercentage } from "../lib/defaults";
import {
  ArrowRight,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Clock3,
  FileCheck2,
  Flame,
  RotateCcw,
  Target,
  Trash2,
} from "lucide-react";
import { PageHeader } from "./PageHeader";
import { DailyMotivationQuote } from "./dashboard/DailyMotivationQuote";
import { StrikeCalendar } from "./dashboard/StrikeCalendar";
import { McqAndMockTrendsChart } from "./dashboard/McqAndMockTrendsChart";
import { LastThreePapersSummary } from "./dashboard/LastThreePapersSummary";
import { GoalsAndRemindersBoard } from "./dashboard/GoalsAndRemindersBoard";
import { RecentTestInsights } from "./dashboard/RecentTestInsights";

interface DashboardViewProps {
  papers: QuestionPaper[];
  attempts: Attempt[];
  onNavigatePapers: () => void;
  onNavigateHistory: () => void;
  onViewAttempt: (attempt: Attempt) => void;
  onDeleteAttempt?: (attemptId: string) => void;
  onStartExam?: (paper: QuestionPaper, mode?: "practice" | "mock") => void;
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

export function DashboardView({
  papers,
  attempts,
  onNavigatePapers,
  onNavigateHistory,
  onViewAttempt,
  onDeleteAttempt,
  onStartExam,
  activeDraft,
  onResumeDraft,
  onDiscardDraft,
}: DashboardViewProps) {
  const completed = useMemo(
    () =>
      [...attempts]
        .filter((attempt) => Boolean(attempt.finishedAt))
        .sort(
          (a, b) =>
            new Date(b.finishedAt || b.startedAt).getTime() -
            new Date(a.finishedAt || a.startedAt).getTime(),
        ),
    [attempts],
  );

  const questionsAnswered = useMemo(
    () => completed.reduce((sum, attempt) => sum + (attempt.answered || 0), 0),
    [completed],
  );

  const averageAccuracy = useMemo(() => {
    if (!completed.length) return null;
    return (
      Math.round(
        (completed.reduce(
          (sum, attempt) => sum + (attempt.accuracyPct || 0),
          0,
        ) /
          completed.length) *
          10,
      ) / 10
    );
  }, [completed]);

  const streakData = useMemo(
    () => calculatePracticeStreak(completed),
    [completed],
  );

  // Today answered count for goal progress
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

  // This week mocks count for weekly mock goal
  const weekMocksCount = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    return completed.filter((a) => {
      if (a.mode !== "mock") return false;
      const d = new Date(a.finishedAt || a.startedAt);
      return !Number.isNaN(d.getTime()) && d.getTime() >= monday.getTime();
    }).length;
  }, [completed]);

  const metrics = [
    {
      label: "Assessments completed",
      value: completed.length,
      sublabel: `${completed.filter((c) => c.mode === "mock").length} mocks · ${completed.filter((c) => c.mode === "practice").length} practice`,
      icon: FileCheck2,
      iconClass: "text-indigo-600",
      iconBgClass: "bg-indigo-50 ring-indigo-100",
    },
    {
      label: "Practice streak",
      value: `${streakData.currentStreak} ${streakData.currentStreak === 1 ? "day" : "days"}`,
      sublabel: streakData.isActiveToday
        ? "Streak active today 🔥"
        : "Practice today to extend",
      icon: Flame,
      iconClass: "text-amber-500",
      iconBgClass: "bg-amber-50 ring-amber-100",
    },
    {
      label: "Questions answered",
      value: questionsAnswered,
      sublabel: `${todayAnsweredCount} answered today`,
      icon: Target,
      iconClass: "text-sky-600",
      iconBgClass: "bg-sky-50 ring-sky-100",
    },
    {
      label: "Average accuracy",
      value: averageAccuracy === null ? "—" : `${averageAccuracy}%`,
      sublabel: "Across all completed tests",
      icon: BarChart3,
      iconClass: "text-emerald-600",
      iconBgClass: "bg-emerald-50 ring-emerald-100",
    },
  ];

  return (
    <div className="page-container space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Your UPSC Study Workspace"
        title="Assessment Overview &amp; Analytics"
        description="Comprehensive insights into your MCQ consistency, mock performance, and learning goals."
        actions={
          <button
            type="button"
            onClick={onNavigatePapers}
            className="button-primary cursor-pointer shadow-sm"
          >
            <BookOpen className="h-4 w-4" /> Browse papers
          </button>
        }
      />

      {/* Daily Motivation Quote Banner */}
      <DailyMotivationQuote />

      {/* Active Assessment Draft Alert Banner */}
      {activeDraft && (
        <section
          className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 shadow-2xs"
          aria-label="Assessment in progress"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 ring-1 ring-blue-200 shadow-2xs">
              <Clock3 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                Assessment in progress
              </p>
              <h2 className="mt-0.5 truncate text-base font-bold text-slate-900">
                {activeDraft.paperLabel}
              </h2>
              <p className="mt-0.5 text-xs text-slate-600">
                Your answers and timer are saved in real-time. Resume whenever
                you are ready.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 sm:pl-4">
            <button
              type="button"
              onClick={() => onResumeDraft?.(activeDraft)}
              className="button-primary text-xs py-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Resume assessment
            </button>
            <button
              type="button"
              onClick={onDiscardDraft}
              className="button-secondary text-xs py-1.5 cursor-pointer"
            >
              Discard
            </button>
          </div>
        </section>
      )}

      {/* Top 4 Key Performance Metrics */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(
          ({ label, value, sublabel, icon: Icon, iconClass, iconBgClass }) => (
            <div
              key={label}
              className="surface-card flex items-start gap-3 p-4 sm:p-5 rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-colors"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${iconBgClass}`}
              >
                <Icon className={`h-5 w-5 ${iconClass}`} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {label}
                </span>
                <span className="mt-0.5 block text-xl sm:text-2xl font-black tracking-tight text-slate-900 tabular-nums">
                  {value}
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">
                  {sublabel}
                </span>
              </div>
            </div>
          ),
        )}
      </section>

      {/* Row 1: Solved MCQ Count & Mock Trends (2/3) + Goals & Reminders Board (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <McqAndMockTrendsChart attempts={attempts} dailyTarget={50} />
        </div>
        <div className="lg:col-span-1">
          <GoalsAndRemindersBoard
            todayAnsweredCount={todayAnsweredCount}
            weekMocksCount={weekMocksCount}
            onNavigatePapers={onNavigatePapers}
          />
        </div>
      </section>

      {/* Row 2: Strike Calendar (2/3) + Recent Test Insights & Pacing (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StrikeCalendar attempts={attempts} />
        </div>
        <div className="lg:col-span-1">
          <RecentTestInsights
            attempts={attempts}
            papers={papers}
            onNavigateHistory={onNavigateHistory}
            onViewAttempt={onViewAttempt}
          />
        </div>
      </section>

      {/* Row 3: Last 3 Papers Summary */}
      <LastThreePapersSummary
        attempts={attempts}
        papers={papers}
        onViewAttempt={onViewAttempt}
        onNavigatePapers={onNavigatePapers}
        onStartExam={onStartExam}
      />

      {/* Row 4: Recent Activity List */}
      <section className="space-y-3 pt-2">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="page-eyebrow">Recent Activity History</p>
            <h2 className="mt-1 text-base sm:text-lg font-semibold text-slate-900">
              All Completed Assessments
            </h2>
          </div>
          <button
            type="button"
            onClick={onNavigateHistory}
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer inline-flex items-center gap-1"
          >
            View full history ({completed.length}){" "}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="surface-card overflow-hidden rounded-2xl border border-slate-200/90 shadow-2xs">
          {completed.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-800">
                No completed assessments yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Your scores and review history will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {completed.slice(0, 5).map((attempt) => {
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
                      className="flex w-full cursor-pointer flex-col gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex-row sm:items-center sm:justify-between sm:px-5"
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
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {formatAttemptDate(
                            attempt.finishedAt || attempt.startedAt,
                          )}{" "}
                          <span className="mx-1 text-slate-300">·</span>{" "}
                          <span className="font-medium text-slate-600 capitalize">
                            {attempt.mode === "mock" ? "Mock Exam" : "Practice"}
                          </span>
                        </span>
                      </span>

                      <span className="flex items-center gap-4 text-xs sm:justify-end">
                        <span className="text-slate-600 font-medium">
                          {attempt.answered}/{attempt.totalQuestions} answered
                        </span>
                        <span className="font-bold tabular-nums text-slate-900">
                          {attempt.score}/{attempt.maxScore}
                        </span>
                        <span className="font-bold tabular-nums text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                          {getAttemptPercentage(attempt)}%
                        </span>
                        <span className="font-bold tabular-nums text-emerald-700">
                          {Math.round(attempt.accuracyPct || 0)}% acc
                        </span>
                        {!paperExists && onDeleteAttempt && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteAttempt(attempt.id);
                            }}
                            className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
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

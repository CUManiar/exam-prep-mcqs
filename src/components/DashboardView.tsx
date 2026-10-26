"use client";

import React from "react";
import { ActiveSessionDraft, Attempt, QuestionPaper } from "../lib/types";
import {
  getAttemptPercentage,
  getPaperDisplayTitle,
  isPaperFree,
  isUserUploadedPaper,
} from "../lib/defaults";
import {
  ArrowRight,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Percent,
  Play,
  RotateCcw,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "./PageHeader";

interface DashboardViewProps {
  papers: QuestionPaper[];
  attempts: Attempt[];
  onStartExam: (paper: QuestionPaper, mode: "practice" | "mock") => void;
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

export function DashboardView({
  papers,
  attempts,
  onStartExam,
  onNavigatePapers,
  onNavigateHistory,
  onViewAttempt,
  onDeleteAttempt,
  activeDraft,
  onResumeDraft,
  onDiscardDraft,
}: DashboardViewProps) {
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
        ) / completed.length) * 10,
      ) / 10
    : null;
  const recommendedPaper =
    papers.find(
      (paper) =>
        paper.year === "2026" &&
        paper.category === "prelims" &&
        paper.examType === "objective" &&
        !isUserUploadedPaper(paper),
    ) ||
    papers.find(
      (paper) =>
        paper.examType === "objective" &&
        isPaperFree(paper) &&
        !isUserUploadedPaper(paper),
    ) ||
    papers.find((paper) => paper.examType === "objective");
  const latestAttempt = completed[0];

  const metrics = [
    {
      label: "Assessments completed",
      value: completed.length,
      icon: FileCheck2,
      iconClass: "text-indigo-600",
      iconBgClass: "bg-indigo-50 ring-indigo-100",
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
    {
      label: "Average percentage",
      value: averagePercentage === null ? "—" : `${averagePercentage}%`,
      icon: Percent,
      iconClass: "text-violet-600",
      iconBgClass: "bg-violet-50 ring-violet-100",
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
        {metrics.map(
          ({ label, value, icon: Icon, iconClass, iconBgClass }) => (
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
          ),
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.8fr)]">
        <div className="relative isolate flex min-h-[18rem] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-blue-700 to-sky-700 p-6 text-white shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full border border-white/15" />
          <div className="pointer-events-none absolute -bottom-32 right-16 -z-10 h-72 w-72 rounded-full border border-white/10" />
          <div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                Next assessment
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-medium text-blue-50 ring-1 ring-white/20">
                <Award className="h-3.5 w-3.5" /> Timed mock
              </span>
            </div>
            <h2 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
              {recommendedPaper
                ? getPaperDisplayTitle(recommendedPaper)
                : "Choose your next question paper"}
            </h2>
            {recommendedPaper ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-blue-100">
                <span className="rounded-md bg-white/12 px-2.5 py-1 ring-1 ring-white/15">
                  {recommendedPaper.totalQuestions} questions
                </span>
                <span className="rounded-md bg-white/12 px-2.5 py-1 ring-1 ring-white/15">
                  {recommendedPaper.timeMinutes} minutes
                </span>
                <span className="rounded-md bg-white/12 px-2.5 py-1 ring-1 ring-white/15">
                  {recommendedPaper.totalMarks} marks
                </span>
              </div>
            ) : (
              <p className="mt-3 max-w-lg text-sm leading-6 text-blue-100">
                Add a question paper to begin tracking your assessment record.
              </p>
            )}
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {recommendedPaper && (
              <button
                type="button"
                onClick={() => onStartExam(recommendedPaper, "mock")}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-blue-50"
              >
                <Play className="h-4 w-4" /> Start assessment
              </button>
            )}
            <button
              type="button"
              onClick={onNavigatePapers}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Browse all papers <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="surface-card flex min-h-[18rem] flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="page-eyebrow">Progress snapshot</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Your latest signal
              </h2>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>

          {latestAttempt ? (
            <div className="mt-5 flex flex-1 flex-col justify-between">
              <div>
                <p className="truncate text-sm font-semibold text-slate-800">
                  {latestAttempt.paperLabel}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Latest {latestAttempt.mode === "mock" ? "mock" : "practice"} · {formatAttemptDate(latestAttempt.finishedAt || latestAttempt.startedAt)}
                </p>
                <div className="mt-5 flex items-end gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Score</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
                      {latestAttempt.score}
                      <span className="ml-1 text-sm font-medium text-slate-400">
                        / {latestAttempt.maxScore}
                      </span>
                    </p>
                  </div>
                  <div className="border-l border-slate-200 pl-4">
                    <p className="text-xs font-medium text-slate-500">Accuracy</p>
                    <p className="mt-1 text-xl font-semibold text-emerald-700 tabular-nums">
                      {Math.round(latestAttempt.accuracyPct || 0)}%
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onViewAttempt(latestAttempt)}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                Review latest assessment <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-1 flex-col justify-center rounded-xl bg-slate-50 p-4">
              <CheckCircle2 className="h-6 w-6 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-800">
                No completed assessment yet
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Your first score and review will appear here after submission.
              </p>
            </div>
          )}
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
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
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

      {!recommendedPaper && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">
            No papers available yet
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Open the paper library to add a question paper to your workspace.
          </p>
          <button
            type="button"
            onClick={onNavigatePapers}
            className="button-secondary mt-4"
          >
            Open paper library
          </button>
        </section>
      )}
    </div>
  );
}

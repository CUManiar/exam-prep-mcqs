"use client";

import React from "react";
import { ActiveSessionDraft, Attempt, QuestionPaper } from "../lib/types";
import { isPaperFree, isUserUploadedPaper } from "../lib/defaults";
import {
  ArrowRight,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Clock3,
  FileCheck2,
  Play,
  RotateCcw,
  Target,
  Trash2,
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
  const mockAttempts = completed.filter((attempt) => attempt.mode === "mock");
  const questionsAnswered = completed.reduce(
    (sum, attempt) => sum + (attempt.answered || 0),
    0,
  );
  const averageAccuracy = mockAttempts.length
    ? Math.round(
        mockAttempts.reduce(
          (sum, attempt) => sum + (attempt.accuracyPct || 0),
          0,
        ) / mockAttempts.length,
      )
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

  const metrics = [
    {
      label: "Assessments completed",
      value: completed.length,
      icon: FileCheck2,
    },
    { label: "Questions answered", value: questionsAnswered, icon: Target },
    {
      label: "Mock average accuracy",
      value: averageAccuracy === null ? "—" : `${averageAccuracy}%`,
      icon: BarChart3,
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

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.8fr)]">
        <div className="surface-card flex min-h-[16rem] flex-col justify-between p-5 sm:p-7">
          <div>
            <p className="page-eyebrow">Ready when you are</p>
            <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Make your next practice session count.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Select a question paper and choose practice or mock mode. Your
              results and review are available after submission.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {recommendedPaper && (
              <button
                type="button"
                onClick={() => onStartExam(recommendedPaper, "mock")}
                className="button-primary"
              >
                <Play className="h-4 w-4" /> Start a mock
              </button>
            )}
            <button
              type="button"
              onClick={onNavigatePapers}
              className="button-secondary"
            >
              Choose a paper <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="surface-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="page-eyebrow">Progress</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                A steady record
              </h2>
            </div>
            <BarChart3 className="h-5 w-5 text-slate-500" />
          </div>
          <div className="mt-5 divide-y divide-slate-100">
            {metrics.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <Icon className="h-4 w-4 text-slate-400" /> {label}
                </span>
                <span className="text-base font-semibold tabular-nums text-slate-900">
                  {value}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onNavigateHistory}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            View detailed performance <ArrowRight className="h-4 w-4" />
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

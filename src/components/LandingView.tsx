"use client";

import React from "react";
import { QuestionPaper } from "../lib/types";
import { isPaperFree, isUserUploadedPaper } from "../lib/defaults";
import { BookOpen, CheckCircle2, Clock3, LogIn, Play } from "lucide-react";

interface LandingViewProps {
  papers: QuestionPaper[];
  onStartExam: (paper: QuestionPaper, mode: "practice" | "mock") => void;
  onOpenAuth: () => void;
}

export function LandingView({
  papers,
  onStartExam,
  onOpenAuth,
}: LandingViewProps) {
  const firstAvailablePaper =
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

  return (
    <div className="page-container">
      <section className="mx-auto max-w-4xl py-12 sm:py-20">
        <p className="page-eyebrow">UPSC examination practice</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          A focused place to prepare under exam conditions.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
          Work through question papers, practise at your own pace, or take a
          timed mock. Review your answers and track your progress in one
          workspace.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {firstAvailablePaper && (
            <button
              type="button"
              onClick={() => onStartExam(firstAvailablePaper, "practice")}
              className="button-primary"
            >
              <Play className="h-4 w-4" /> Try a practice session
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAuth}
            className="button-secondary"
          >
            <LogIn className="h-4 w-4" /> Sign in or create account
          </button>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          <div className="surface-card p-4">
            <BookOpen className="h-5 w-5 text-slate-500" />
            <h2 className="mt-3 text-sm font-semibold text-slate-900">
              Question papers
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Use the available UPSC papers or add your own set.
            </p>
          </div>
          <div className="surface-card p-4">
            <Clock3 className="h-5 w-5 text-slate-500" />
            <h2 className="mt-3 text-sm font-semibold text-slate-900">
              Exam conditions
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Choose a timed mock or a flexible practice session.
            </p>
          </div>
          <div className="surface-card p-4">
            <CheckCircle2 className="h-5 w-5 text-slate-500" />
            <h2 className="mt-3 text-sm font-semibold text-slate-900">
              Useful review
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Review answers and see your assessment history.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

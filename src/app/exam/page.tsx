"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { ExamSessionView } from "../../components/ExamSessionView";
import { isPaperFree } from "../../lib/defaults";
import { getActiveDraft, getCustomPapers } from "../../lib/storage";
import {
  parseQuestionnaireMarkdown,
  parseMarkdownHeader,
} from "../../lib/markdownPaperParser";
import { Lock } from "lucide-react";

function ExamSessionLoadingBuffer({
  message = "Loading Exam Session...",
}: {
  message?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white px-4">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center max-w-sm w-full p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl text-center space-y-5 animate-in fade-in duration-300">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <svg
              className="animate-spin h-8 w-8 text-indigo-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white tracking-tight">
            {message}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Restoring your selected options, rough notes, and countdown
            timers...
          </p>
        </div>

        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-500 h-full rounded-full animate-pulse w-3/4 mx-auto" />
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Local draft state protected</span>
        </div>
      </div>
    </div>
  );
}

function ExamSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    papers,
    activeDraft,
    handleFinishExamSession,
    isLoading,
    isPro,
    openProUpgradeModal,
    notifyExamReady,
  } = useApp();

  const localDraft = typeof window !== "undefined" ? getActiveDraft() : null;
  const effectiveActiveDraft = activeDraft || localDraft;

  const paperId = searchParams.get("paperId") || effectiveActiveDraft?.paperId;
  const modeParam =
    (searchParams.get("mode") as "practice" | "mock") ||
    effectiveActiveDraft?.mode ||
    "mock";

  let paper = papers.find((p) => p.id === paperId);
  if (!paper && paperId) {
    const localCustom = getCustomPapers();
    paper = localCustom.find((p) => p.id === paperId);
  }
  if (paper) {
    if (paper.markdownContent) {
      if (!paper.parsedQuestions || paper.parsedQuestions.length === 0) {
        paper = {
          ...paper,
          parsedQuestions: parseQuestionnaireMarkdown(paper.markdownContent),
        };
      }
      if (!paper.instructions || paper.instructions.length === 0) {
        paper = {
          ...paper,
          instructions: parseMarkdownHeader(paper.markdownContent).instructions,
        };
      }
    }
  }

  // Dismiss the "Opening assessment…" overlay once the paper is fully resolved
  // and we're about to render the ExamSessionView. This guarantees the loader
  // stays visible for the entire hydration/data-fetch period.
  useEffect(() => {
    if (paper) {
      notifyExamReady();
    }
    // Run once per resolved paper — notifyExamReady is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!paper]);

  if (isLoading && !paper) {
    return <ExamSessionLoadingBuffer message="Restoring Exam Session..." />;
  }

  if (!paper) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">
          Question Paper Not Found
        </h2>
        <p className="text-xs text-slate-400">
          The requested paper was not found or has been removed from the
          repository.
        </p>
        <button
          onClick={() => router.push("/papers")}
          className="cursor-pointer px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm"
        >
          ← Return to Question Papers
        </button>
      </div>
    );
  }

  // Check if paper is locked in Freemium tier
  if (!isPaperFree(paper) && !isPro) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Pro Vault Paper Locked
          </h2>
          <p className="text-sm text-slate-600">
            <strong>{paper.label}</strong> belongs to the Pro Archive. Free tier
            includes 2026 Prelims papers (GS I &amp; CSAT).
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => openProUpgradeModal(paper.label)}
            className="cursor-pointer px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm"
          >
            Unlock with Pro (₹999)
          </button>
          <button
            onClick={() => router.push("/papers")}
            className="cursor-pointer px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700"
          >
            Browse Free Papers
          </button>
        </div>
      </div>
    );
  }

  const resolvedDraft =
    activeDraft?.paperId === paper.id
      ? activeDraft
      : effectiveActiveDraft?.paperId === paper.id
        ? effectiveActiveDraft
        : null;

  return (
    <ExamSessionView
      paper={paper}
      mode={modeParam}
      initialDraft={resolvedDraft}
      onFinish={handleFinishExamSession}
      onExit={() => router.push("/papers")}
    />
  );
}

export default function ExamPage() {
  return (
    <Suspense
      fallback={
        <ExamSessionLoadingBuffer message="Preparing Exam Session..." />
      }
    >
      <ExamSessionContent />
    </Suspense>
  );
}

"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { ExamSessionView } from "../../components/ExamSessionView";
import { Lock } from "lucide-react";

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
  } = useApp();

  const paperId = searchParams.get("paperId") || activeDraft?.paperId;
  const modeParam =
    (searchParams.get("mode") as "practice" | "mock") ||
    activeDraft?.mode ||
    "mock";

  const paper = papers.find((p) => p.id === paperId);

  if (!paper) {
    if (isLoading) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-20 text-center text-xs text-slate-400">
          Loading exam session...
        </div>
      );
    }

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
  if (paper.year !== "2026" && !isPro) {
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
            <strong>{paper.label}</strong> belongs to the Pro Archive. Free tier includes all 2026 Prelims papers.
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

  return (
    <ExamSessionView
      paper={paper}
      mode={modeParam}
      initialDraft={activeDraft?.paperId === paper.id ? activeDraft : null}
      onFinish={handleFinishExamSession}
      onExit={() => router.push("/papers")}
    />
  );
}

export default function ExamPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-400">
          Loading Exam Session...
        </div>
      }
    >
      <ExamSessionContent />
    </Suspense>
  );
}

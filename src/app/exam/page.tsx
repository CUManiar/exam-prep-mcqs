"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { ExamSessionView } from "../../components/ExamSessionView";

function ExamSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { papers, activeDraft, handleFinishExamSession, isLoading } = useApp();

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

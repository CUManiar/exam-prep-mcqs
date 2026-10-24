"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../context/AppContext";
import { DashboardView } from "../components/DashboardView";
import { LandingView } from "../components/LandingView";

export default function RootPage() {
  const router = useRouter();
  const {
    currentUser,
    papers,
    attempts,
    handleStartExam,
    handleViewAttemptDetail,
    handleDeleteAttempt,
    activeDraft,
    handleResumeDraft,
    handleDiscardDraft,
    openAuthModal,
    isLoading,
  } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
        <span className="text-sm text-slate-500">
          Loading your workspace…
        </span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LandingView
        papers={papers}
        onStartExam={handleStartExam}
        onOpenAuth={openAuthModal}
      />
    );
  }

  return (
    <DashboardView
      papers={papers}
      attempts={attempts}
      onStartExam={handleStartExam}
      onNavigatePapers={() => router.push("/papers")}
      onNavigateHistory={() => router.push("/history")}
      onViewAttempt={handleViewAttemptDetail}
      onDeleteAttempt={handleDeleteAttempt}
      activeDraft={activeDraft}
      onResumeDraft={handleResumeDraft}
      onDiscardDraft={handleDiscardDraft}
    />
  );
}

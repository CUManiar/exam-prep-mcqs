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
    activeDraft,
    handleResumeDraft,
    handleDiscardDraft,
    openAuthModal,
    openProUpgradeModal,
    isPro,
    isLoading,
    handleDeletePaper,
  } = useApp();

  // While initializing session state, show clean loading state to avoid flashing dashboard
  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <span className="text-xs font-semibold text-slate-400">
          Loading UPSC Prep Hub...
        </span>
      </div>
    );
  }

  // If user is not authenticated, show Home / Landing Page
  if (!currentUser) {
    return (
      <LandingView
        papers={papers}
        onStartExam={handleStartExam}
        onOpenAuth={openAuthModal}
        onOpenProModal={openProUpgradeModal}
        isPro={isPro}
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
      activeDraft={activeDraft}
      onResumeDraft={handleResumeDraft}
      onDiscardDraft={handleDiscardDraft}
      onDeletePaper={handleDeletePaper}
    />
  );
}

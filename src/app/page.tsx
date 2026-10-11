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
  } = useApp();

  // If user is not authenticated, show high-converting Landing Page
  if (!currentUser && !isLoading) {
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
    />
  );
}

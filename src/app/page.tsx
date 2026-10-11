"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../context/AppContext";
import { DashboardView } from "../components/DashboardView";

export default function DashboardPage() {
  const router = useRouter();
  const {
    papers,
    attempts,
    handleStartExam,
    handleViewAttemptDetail,
    activeDraft,
    handleResumeDraft,
    handleDiscardDraft,
  } = useApp();

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

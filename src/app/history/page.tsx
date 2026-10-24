"use client";

import React from "react";
import { useApp } from "../../context/AppContext";
import { HistoryView } from "../../components/HistoryView";
import { AccountRequired } from "../../components/AccountRequired";

export default function MockHistoryPage() {
  const { attempts, handleViewAttemptDetail, handleDeleteAttempt } = useApp();

  return (
    <AccountRequired
      title="Performance history"
      description="Sign in to review completed assessments, scores, and progress over time."
    >
      <HistoryView
        attempts={attempts}
        onViewAttempt={handleViewAttemptDetail}
        onDeleteAttempt={handleDeleteAttempt}
      />
    </AccountRequired>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../../../context/AppContext";
import { AttemptDetailView } from "../../../components/AttemptDetailView";
import { getAttempts, getGuestReviewAttempt } from "../../../lib/storage";
import { Attempt } from "../../../lib/types";

export default function AttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const {
    attempts,
    papers,
    handleUpdateAttempt,
    handleDeleteAttempt,
    isLoading,
    currentUser,
  } = useApp();

  // Primary lookup from app context state with fallbacks to local storage & guest review
  const resolvedAttempt =
    attempts.find((a) => a.id === resolvedParams.id) ||
    (typeof window !== "undefined"
      ? getAttempts().find((a) => a.id === resolvedParams.id) ||
        (getGuestReviewAttempt()?.id === resolvedParams.id
          ? getGuestReviewAttempt()
          : null)
      : null);

  const [activeAttempt, setActiveAttempt] = useState<Attempt | null>(
    resolvedAttempt || null,
  );

  useEffect(() => {
    if (resolvedAttempt) {
      setActiveAttempt(resolvedAttempt);
    }
  }, [resolvedAttempt]);

  const attempt = activeAttempt || resolvedAttempt;

  if (!attempt) {
    if (isLoading) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-20 text-center text-xs text-slate-400">
          Loading assessment report...
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Assessment not found
        </h2>
        <p className="text-sm text-slate-600">
          The requested exam evaluation record could not be found or was
          deleted.
        </p>
        <button
          onClick={() => router.push(currentUser ? "/history" : "/")}
          className="button-primary mx-auto cursor-pointer"
        >
          {currentUser ? "← Return to Mock History" : "← Return to Home"}
        </button>
      </div>
    );
  }

  return (
    <AttemptDetailView
      attempt={attempt}
      papers={papers}
      onBack={() => router.push(currentUser ? "/history" : "/")}
      onUpdate={(updated) => {
        setActiveAttempt(updated);
        handleUpdateAttempt(updated);
      }}
      onDelete={(delId) => {
        handleDeleteAttempt(delId);
        router.push(currentUser ? "/history" : "/");
      }}
    />
  );
}

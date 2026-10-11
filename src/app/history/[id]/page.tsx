"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../../../context/AppContext";
import { AttemptDetailView } from "../../../components/AttemptDetailView";

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
  } = useApp();

  const attempt = attempts.find((a) => a.id === resolvedParams.id);

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
        <h2 className="text-xl font-bold text-white">Attempt Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested exam evaluation record could not be found or was
          deleted.
        </p>
        <button
          onClick={() => router.push("/history")}
          className="cursor-pointer px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm"
        >
          ← Return to Mock History
        </button>
      </div>
    );
  }

  return (
    <AttemptDetailView
      attempt={attempt}
      papers={papers}
      onBack={() => router.push("/history")}
      onUpdate={handleUpdateAttempt}
      onDelete={(delId) => {
        handleDeleteAttempt(delId);
        router.push("/history");
      }}
    />
  );
}

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { PapersView } from "../../components/PapersView";
import { Lock, UserCheck, ArrowLeft } from "lucide-react";

export default function QuestionPapersPage() {
  const router = useRouter();
  const {
    papers,
    handleStartExam,
    handleDeletePaper,
    handleUpdatePaper,
    currentUser,
    isLoading,
    openAuthModal,
  } = useApp();

  if (!currentUser && !isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">
            Sign In to Access Question Papers
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            Browse official 2024, 2025, and 2026 UPSC papers, practice with
            timer, or upload custom paper sets.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => openAuthModal()}
            className="cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-xs transition-colors"
          >
            <UserCheck className="h-4 w-4" />
            <span>Sign In / Register</span>
          </button>
          <button
            onClick={() => router.push("/")}
            className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Home</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <PapersView
      papers={papers}
      onStartExam={handleStartExam}
      onNavigateUpload={() => router.push("/upload")}
      onDeletePaper={handleDeletePaper}
      onUpdatePaper={handleUpdatePaper}
    />
  );
}

"use client";

import React from "react";
import { Attempt } from "../lib/types";
import {
  Trophy,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Lock,
  UserCheck,
  Clock,
  Target,
  X,
} from "lucide-react";
import { formatTimeSeconds } from "../lib/defaults";

interface GuestCompletionModalProps {
  isOpen: boolean;
  attempt: Attempt | null;
  onOpenAuth: () => void;
  onProceedAsGuest: () => void;
}

export function GuestCompletionModal({
  isOpen,
  attempt,
  onOpenAuth,
  onProceedAsGuest,
}: GuestCompletionModalProps) {
  if (!isOpen || !attempt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6 overflow-hidden">
        {/* Top Accent Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-indigo-600 to-amber-500" />

        {/* Header with Trophy Icon */}
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600 border border-emerald-100 shrink-0">
            <Trophy className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full font-mono">
                Exam Completed
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {attempt.mode === "mock" ? "Official Mock" : "Practice Mode"}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {attempt.paperLabel}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Your test has been automatically graded and evaluated.
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Score
            </p>
            <p className="text-lg font-black text-indigo-700">
              {attempt.score}{" "}
              <span className="text-xs font-normal text-slate-400">
                / {attempt.maxScore}
              </span>
            </p>
          </div>
          <div className="text-center border-x border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Accuracy
            </p>
            <p className="text-lg font-black text-emerald-600">
              {attempt.accuracyPct}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Time Taken
            </p>
            <p className="text-lg font-black text-slate-700 font-mono">
              {formatTimeSeconds(attempt.durationSeconds || 0)}
            </p>
          </div>
        </div>

        {/* Save Notice Box */}
        <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Keep your test details & review intact</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            You attempted this test as an unauthenticated guest. To permanently
            preserve your score, accuracy breakdown, and detailed
            question-by-question review in your personal dashboard, log in or
            create a free account now.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={onOpenAuth}
            className="cursor-pointer w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] py-3 text-sm font-bold text-white transition-all shadow-md hover:shadow-indigo-500/25"
          >
            <UserCheck className="h-4 w-4" />
            <span>Log In / Sign Up to Save & Reveal Review</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={onProceedAsGuest}
            className="cursor-pointer w-full flex items-center justify-center py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Continue as Guest (View without account)
          </button>
        </div>
      </div>
    </div>
  );
}

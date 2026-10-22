"use client";

import { ArrowRight, BarChart3, Clock3, Cloud, UserRound } from "lucide-react";
import { formatTimeSeconds } from "../lib/defaults";
import { Attempt } from "../lib/types";
import { ModalShell } from "./ModalShell";

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
  if (!attempt) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onProceedAsGuest}
      labelledBy="guest-result-title"
      describedBy="guest-result-description"
      className="w-full max-w-lg p-5 sm:p-7"
    >
      <div className="flex items-start gap-3 pr-7">
        <span
          className="modal-status-icon modal-status-success"
          aria-hidden="true"
        >
          <BarChart3 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="page-eyebrow">
            {attempt.mode === "mock" ? "Mock result" : "Practice result"}
          </p>
          <h2
            id="guest-result-title"
            data-modal-initial-focus
            tabIndex={-1}
            className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl"
          >
            {attempt.paperLabel}
          </h2>
          <p
            id="guest-result-description"
            className="mt-1 text-sm leading-5 text-slate-600"
          >
            Your answers have been evaluated.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50 py-3">
        <div className="px-2 text-center">
          <p className="text-xs text-slate-500">Score</p>
          <p className="mt-1 text-base font-semibold tabular-nums text-slate-900">
            {attempt.score}
            <span className="text-xs font-normal text-slate-500">
              {" "}
              / {attempt.maxScore}
            </span>
          </p>
        </div>
        <div className="px-2 text-center">
          <p className="text-xs text-slate-500">Accuracy</p>
          <p className="mt-1 text-base font-semibold tabular-nums text-slate-900">
            {attempt.accuracyPct}%
          </p>
        </div>
        <div className="px-2 text-center">
          <p className="flex items-center justify-center gap-1 text-xs text-slate-500">
            <Clock3 className="h-3.5 w-3.5" /> Time
          </p>
          <p className="mt-1 text-base font-medium tabular-nums text-slate-900">
            {formatTimeSeconds(attempt.durationSeconds || 0)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 px-4 py-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Cloud aria-hidden="true" className="h-4 w-4 text-blue-700" />
          Keep this result with your account
        </div>
        <p className="mt-1.5 text-sm leading-5 text-slate-600">
          This guest result is saved on this device. Sign in to add it to your
          account and keep it with your assessment history.
        </p>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onProceedAsGuest}
          className="button-secondary"
        >
          Review as guest
        </button>
        <button type="button" onClick={onOpenAuth} className="button-primary">
          <UserRound aria-hidden="true" className="h-4 w-4" />
          Sign in to save result
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </ModalShell>
  );
}

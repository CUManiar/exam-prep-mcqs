"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Loader2,
  LogOut,
  RotateCcw,
  Settings2,
  Sparkles,
  ShieldCheck,
  Palette,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { ModalShell } from "./ModalShell";
import { getAuthHeaders } from "../lib/supabase";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileSettingsModal({
  isOpen,
  onClose,
}: ProfileSettingsModalProps) {
  const {
    currentUser,
    isPro,
    attempts,
    openProUpgradeModal,
    handleSignOut,
    openAuthModal,
    hiddenPaperIds,
    handleRestoreHiddenPapers,
    onlyCustomPapers,
    handleSetOnlyCustomPapers,
    theme,
    setTheme,
  } = useApp();
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    setAutoAdvance(localStorage.getItem("exam_prep_auto_advance") === "true");
    setShowDeleteConfirm(false);
    setError("");
  }, [isOpen]);
  if (!isOpen) return null;

  const handleAutoAdvance = (value: boolean) => {
    setAutoAdvance(value);
    try {
      localStorage.setItem("exam_prep_auto_advance", String(value));
      window.dispatchEvent(new Event("exam-settings-changed"));
    } catch {
      // Keep the current preference for this session when storage is unavailable.
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    setIsDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.error || "Account deletion could not be completed.");
        return;
      }
      await handleSignOut();
      onClose();
    } catch {
      setError("Account deletion could not be completed. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="account-panel-title"
      placement="right"
      showCloseButton={false}
      className="flex h-full w-full max-w-md flex-col overflow-hidden rounded-none border-l border-slate-200 p-0 shadow-2xl"
    >
      <section className="flex h-full min-h-0 flex-col bg-white">
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Account
            </p>
            <h2
              id="account-panel-title"
              data-modal-initial-focus
              tabIndex={-1}
              className="mt-1 text-lg font-semibold text-slate-900"
            >
              Profile & preferences
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account panel"
            className="modal-close-static"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <User className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {currentUser?.user_metadata?.full_name ||
                  currentUser?.email?.split("@")[0] ||
                  "Guest"}
              </p>
              <p className="truncate text-sm text-slate-500">
                {currentUser?.email || "Local guest session"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <Settings2 className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">
                Exam preferences
              </h3>
            </div>
            <label className="flex items-center justify-between gap-4 px-4 py-4">
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  Move to the next question
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Advance after selecting an answer.
                </span>
              </span>
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(event) => handleAutoAdvance(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                aria-label="Automatically advance after answering"
              />
            </label>
          </div>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50/60">
            <div className="flex items-start gap-3 px-4 py-4">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" />
              <div>
                <p className="text-sm font-semibold text-indigo-950">
                  Connect ChatGPT or Claude
                </p>
                <p className="mt-1 text-xs leading-5 text-indigo-900/75">
                  Ask your chatbot to read progress, import papers, and record
                  scores in this account.
                </p>
                <Link
                  href="/help/mcp"
                  onClick={onClose}
                  className="mt-3 inline-flex text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  Open the connection guide →
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200">
            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Study record
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {attempts.length} completed assessments
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                {isPro ? "Pro access" : "Standard"}
              </span>
            </div>
            {!isPro && (
              <div className="border-t border-slate-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openProUpgradeModal();
                  }}
                  className="text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  View available access plans
                </button>
              </div>
            )}
          </div>

          {hiddenPaperIds.length > 0 && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-4">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Hidden question papers
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {hiddenPaperIds.length} hidden
                </p>
              </div>
              <button
                type="button"
                onClick={handleRestoreHiddenPapers}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </button>
            </div>
          )}

          <div className="rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <Settings2 className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">
                Paper library visibility
              </h3>
            </div>
            <label className="flex items-center justify-between gap-4 px-4 py-4">
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  Show only my uploaded papers
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Hide every pre-loaded paper from your library without deleting
                  it.
                </span>
              </span>
              <input
                type="checkbox"
                checked={onlyCustomPapers}
                onChange={(event) =>
                  handleSetOnlyCustomPapers(event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                aria-label="Show only my uploaded papers"
              />
            </label>
          </div>

          {/* Reading Comfort & Theme */}
          <div className="rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <Palette className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">
                Visual Comfort & Reading Theme
              </h3>
            </div>
            <div className="p-4 space-y-2.5">
              <p className="text-xs text-slate-500 leading-relaxed">
                Switch themes to reduce eye strain during prolonged question
                reading sessions.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    theme === "light"
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-600/20"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="h-4 w-4 rounded-full bg-white border border-slate-300 shadow-2xs mb-1.5" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("sepia")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    theme === "sepia"
                      ? "border-amber-700 bg-amber-50 text-amber-900 ring-2 ring-amber-700/20"
                      : "border-slate-200 bg-[#f7f0e3] text-[#382c1e] hover:brightness-95"
                  }`}
                >
                  <span className="h-4 w-4 rounded-full bg-[#fbf0d9] border border-[#d6c7b2] shadow-2xs mb-1.5" />
                  <span>Warm Sepia</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    theme === "dark"
                      ? "border-indigo-500 bg-slate-900 text-white ring-2 ring-indigo-500/30"
                      : "border-slate-200 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  <span className="h-4 w-4 rounded-full bg-slate-900 border border-slate-700 shadow-2xs mb-1.5" />
                  <span>Dark</span>
                </button>
              </div>
            </div>
          </div>

          {!currentUser && (
            <button
              type="button"
              onClick={() => {
                onClose();
                openAuthModal();
              }}
              className="w-full rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Sign in to sync your study record
            </button>
          )}

          {currentUser && (
            <div className="space-y-3 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={async () => {
                  onClose();
                  await handleSignOut();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete account
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
                    <p className="text-sm leading-5 text-rose-900">
                      This permanently removes your account and saved assessment
                      data.
                    </p>
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-rose-800">
                      {error}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDeleteAccount}
                      className="inline-flex items-center gap-2 rounded-md bg-rose-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {isDeleting ? "Deleting…" : "Confirm deletion"}
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setShowDeleteConfirm(false)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </ModalShell>
  );
}

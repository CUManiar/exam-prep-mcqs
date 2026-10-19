"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  User,
  Settings,
  X,
  Sparkles,
  Check,
  ShieldCheck,
  Clock,
  Award,
  RotateCcw,
  LogOut,
  HelpCircle,
  FileText,
  Volume2,
  Sliders,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useApp } from "../context/AppContext";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "profile" | "settings";
}

export function ProfileSettingsModal({
  isOpen,
  onClose,
  initialTab = "profile",
}: ProfileSettingsModalProps) {
  const {
    currentUser,
    isPro,
    attempts,
    openProUpgradeModal,
    handleSignOut,
    openAuthModal,
    loadAllData,
    hiddenPaperIds,
    handleRestoreHiddenPapers,
  } = useApp();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "settings">(
    initialTab,
  );
  const [autoAdvance, setAutoAdvance] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("exam_prep_auto_advance") === "true";
  });
  const [timerSoundAlert, setTimerSoundAlert] = useState(true);
  const [cacheClearedMsg, setCacheClearedMsg] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleToggleAutoAdvance = (val: boolean) => {
    setAutoAdvance(val);
    try {
      localStorage.setItem("exam_prep_auto_advance", String(val));
      window.dispatchEvent(new Event("exam-settings-changed"));
    } catch {}
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      setAutoAdvance(localStorage.getItem("exam_prep_auto_advance") === "true");
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, initialTab]);

  if (!isOpen || !mounted) return null;

  const totalAttempts = attempts.length;
  const totalCorrect = attempts.reduce((acc, a) => acc + (a.correct || 0), 0);
  const totalQuestionsAnswered = attempts.reduce(
    (acc, a) => acc + (a.answered || 0),
    0,
  );
  const avgAccuracy =
    totalQuestionsAnswered > 0
      ? Math.round((totalCorrect / totalQuestionsAnswered) * 100)
      : 0;

  const handleClearLocalCache = () => {
    try {
      localStorage.removeItem("exam_prep_attempts_v2");
      localStorage.removeItem("upsc_prep_attempts_cache");
      localStorage.removeItem("upsc_prep_active_draft");
      localStorage.removeItem("exam_prep_active_page_v1");
      localStorage.removeItem("exam_prep_selected_attempt_id_v1");
      localStorage.removeItem("exam_prep_custom_papers_v2");
      localStorage.removeItem("exam_prep_is_pro_v1");
      setCacheClearedMsg(true);
      if (loadAllData) loadAllData();
      setTimeout(() => setCacheClearedMsg(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    setIsDeletingAccount(true);
    try {
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      if (data.ok) {
        handleClearLocalCache();
        await handleSignOut();
        onClose();
      } else {
        alert(data.error || "Failed to delete account");
      }
    } catch (err: any) {
      alert("Error deleting account: " + err.message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex min-h-full items-start sm:items-center justify-center p-3 sm:p-6 py-8 sm:py-12 animate-in fade-in"
    >
      <div className="relative my-auto w-full max-w-xl max-h-[calc(100dvh-4rem)] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 shrink-0" />

        {/* Modal Sticky Header */}
        <div className="p-4 sm:p-6 pb-3 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab("profile")}
              className={`cursor-pointer flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "profile"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <User className="h-4 w-4" />
              <span>Aspirant Profile</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`cursor-pointer flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "settings"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Preferences & Settings</span>
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 1: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-5 animate-in fade-in">
              {/* User Identity Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-extrabold uppercase shadow-sm shrink-0">
                    {currentUser?.email ? currentUser.email[0] : "G"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {currentUser?.user_metadata?.full_name ||
                        (currentUser ? "Aspirant" : "Guest Aspirant")}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono truncate">
                      {currentUser?.email ||
                        "Not logged in (Local Storage Only)"}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      {currentUser && isPro ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900 border border-amber-300">
                          <Sparkles className="h-3 w-3 text-amber-600 fill-amber-500" />
                          PRO VAULT LIFETIME
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                          FREE TIER (2026 PRELIMS)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!currentUser && (
                  <button
                    onClick={() => {
                      onClose();
                      openAuthModal();
                    }}
                    className="cursor-pointer shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all"
                  >
                    Sign In
                  </button>
                )}
              </div>

              {/* Aspirant Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200/70 bg-white p-3.5 text-center shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Tests Done
                  </span>
                  <span className="text-xl font-extrabold text-slate-800 font-mono mt-0.5 block">
                    {totalAttempts}
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white p-3.5 text-center shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Questions Solved
                  </span>
                  <span className="text-xl font-extrabold text-slate-800 font-mono mt-0.5 block">
                    {totalQuestionsAnswered}
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white p-3.5 text-center shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Avg Accuracy
                  </span>
                  <span className="text-xl font-extrabold text-indigo-600 font-mono mt-0.5 block">
                    {avgAccuracy}%
                  </span>
                </div>
              </div>

              {/* Plan / Subscription Box */}
              {(!currentUser || !isPro) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-amber-900">
                      Upgrade to Pro Vault (₹999)
                    </h4>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Unlock 2024–2026 paper sets + upload your own custom
                      papers with automated scoring.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      openProUpgradeModal();
                    }}
                    className="cursor-pointer shrink-0 self-start sm:self-auto rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-xs"
                  >
                    Upgrade
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-5 animate-in fade-in">
              {/* Exam Experience Toggles */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Exam Simulator Options
                </h4>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-xs font-bold text-slate-800 block">
                        Auto-Advance Questions
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Move automatically to next question after marking an OMR
                        choice
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoAdvance}
                      onChange={(e) =>
                        handleToggleAutoAdvance(e.target.checked)
                      }
                      className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>

                  <div className="border-t border-slate-200/60 pt-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="space-y-0.5 pr-2">
                        <span className="text-xs font-bold text-slate-800 block">
                          5-Minute Time Alert
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Visual notification when only 5 minutes remain in mock
                          session
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={timerSoundAlert}
                        onChange={(e) => setTimerSoundAlert(e.target.checked)}
                        className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Cache and Data Sync */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Local Data & Cache
                </h4>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Clear Local Browser Cache
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Clears local draft sessions and resets browser state
                    </span>
                  </div>
                  <button
                    onClick={handleClearLocalCache}
                    className="cursor-pointer shrink-0 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
                  >
                    Clear Cache
                  </button>
                </div>
                {cacheClearedMsg && (
                  <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 px-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Cache cleared
                    successfully.
                  </div>
                )}
              </div>

              {/* Hidden Papers Restoration */}
              {hiddenPaperIds && hiddenPaperIds.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Hidden Question Papers
                  </h4>
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Hidden Papers ({hiddenPaperIds.length})
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        You have hidden {hiddenPaperIds.length} paper
                        {hiddenPaperIds.length > 1 ? "s" : ""} from your
                        dashboard.
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        if (handleRestoreHiddenPapers) {
                          await handleRestoreHiddenPapers();
                        }
                      }}
                      className="cursor-pointer shrink-0 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-2xs transition-colors"
                    >
                      Restore All
                    </button>
                  </div>
                </div>
              )}

              {/* Account Management & Danger Zone */}
              {currentUser && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Account Management
                  </h4>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <button
                      onClick={async () => {
                        onClose();
                        await handleSignOut();
                      }}
                      className="cursor-pointer flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors w-fit"
                    >
                      <LogOut className="h-4 w-4 text-slate-500" />
                      <span>Sign Out of Account</span>
                    </button>

                    {!showDeleteConfirm && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="cursor-pointer flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors w-fit"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Account</span>
                      </button>
                    )}
                  </div>

                  {/* Inline Delete Account Confirmation Warning */}
                  {showDeleteConfirm && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 space-y-3 animate-in fade-in">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-rose-900">
                            Permanently Delete Your Account?
                          </h5>
                          <p className="text-[11px] text-rose-700 leading-relaxed">
                            This will permanently delete all your exam attempts,
                            analytics, and saved drafts from the cloud. Your
                            subscription will end immediately, and you will have
                            to pay again if you return in the future.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={isDeletingAccount}
                          className="cursor-pointer flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs disabled:opacity-50"
                        >
                          {isDeletingAccount ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Deleting...</span>
                            </>
                          ) : (
                            <span>Yes, Delete Everything</span>
                          )}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isDeletingAccount}
                          className="cursor-pointer rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

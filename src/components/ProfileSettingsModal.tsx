"use client";

import React, { useState } from "react";
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
  } = useApp();

  const [activeTab, setActiveTab] = useState<"profile" | "settings">(
    initialTab,
  );
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [timerSoundAlert, setTimerSoundAlert] = useState(true);
  const [cacheClearedMsg, setCacheClearedMsg] = useState(false);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6 overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => setActiveTab("profile")}
            className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
            className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "settings"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Preferences & Settings</span>
          </button>
        </div>

        {/* TAB 1: PROFILE */}
        {activeTab === "profile" && (
          <div className="space-y-5 animate-in fade-in">
            {/* User Identity Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-extrabold uppercase shadow-sm">
                  {currentUser?.email ? currentUser.email[0] : "G"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {currentUser?.user_metadata?.full_name ||
                      (currentUser ? "Aspirant" : "Guest Aspirant")}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {currentUser?.email || "Not logged in (Local Storage Only)"}
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
            {!isPro && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-amber-900">
                    Upgrade to Pro Vault (₹999)
                  </h4>
                  <p className="text-[11px] text-amber-700">
                    Unlock 2024–2026 paper sets + upload your own custom papers
                    with automated scoring.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    openProUpgradeModal();
                  }}
                  className="cursor-pointer shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
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
                  <div className="space-y-0.5">
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
                    onChange={(e) => setAutoAdvance(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>

                <div className="border-t border-slate-200/60 pt-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 block">
                        5-Minute Time Alert
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Visual and audio notification when only 5 minutes remain
                        in mock session
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
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Clear Local Browser Cache
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Forces cloud resync from Supabase on next test load
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

            {/* Account Management */}
            {currentUser && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={async () => {
                    onClose();
                    await handleSignOut();
                  }}
                  className="cursor-pointer flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out of Account</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  KeyRound,
  Layers,
  ListChecks,
  Loader2,
  LogOut,
  Palette,
  RotateCcw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { ModalShell } from "./ModalShell";
import { getAuthHeaders } from "../lib/supabase";
import {
  getRevisionConfig,
  PROVIDER_INFO,
  RevisionProviderConfig,
} from "../lib/revisionAi";
import { RevisionSettingsModal } from "./revision/RevisionSettingsModal";
import { OptionalSubjectSelect } from "./OptionalSubjectSelect";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "preferences" | "ai" | "account";

function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
        checked ? "bg-indigo-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function ProfileSettingsModal({
  isOpen,
  onClose,
}: ProfileSettingsModalProps) {
  const {
    currentUser,
    isPro,
    attempts,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    openProUpgradeModal,
    handleSignOut,
    openAuthModal,
    hiddenPaperIds,
    handleRestoreHiddenPapers,
    onlyCustomPapers,
    handleSetOnlyCustomPapers,
    theme,
    setTheme,
    optionalSubject,
    setOptionalSubject,
  } = useApp();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("preferences");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [aiConfig, setAiConfig] = useState<RevisionProviderConfig | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    setAutoAdvance(localStorage.getItem("exam_prep_auto_advance") === "true");
    setShowDeleteConfirm(false);
    setError("");
    setAiConfig(getRevisionConfig());
  }, [isOpen]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  const displayName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.email?.split("@")[0] ||
    "Guest";

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        labelledBy="account-panel-title"
        placement="right"
        showCloseButton={false}
        className="flex h-full w-full max-w-md flex-col overflow-hidden rounded-none border-l border-slate-200 p-0 shadow-2xl"
      >
        <section className="flex h-full min-h-0 flex-col bg-slate-50/50">
          {/* Compact Header + User Identity */}
          <header className="border-b border-slate-200 bg-white px-5 pt-5 pb-4 sm:px-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <User className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2
                      id="account-panel-title"
                      data-modal-initial-focus
                      tabIndex={-1}
                      className="truncate text-base font-bold text-slate-900"
                    >
                      {displayName}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isPro
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <ShieldCheck className="h-3 w-3" />
                      {isPro ? "Pro" : "Standard"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {currentUser?.email || "Local guest session"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close account panel"
                className="modal-close-static shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Clean 3-Tab Segmented Navigation */}
            <div
              role="tablist"
              aria-label="Settings sections"
              className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "preferences"}
                onClick={() => setActiveTab("preferences")}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "preferences"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Preferences</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "ai"}
                onClick={() => setActiveTab("ai")}
                className={`relative flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "ai"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI &amp; Study</span>
                {unreadCount > 0 && (
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "account"}
                onClick={() => setActiveTab("account")}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "account"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Account</span>
              </button>
            </div>
          </header>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {activeTab === "preferences" && (
              <>
                {/* Paper Library Visibility */}
                <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs">
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        Show only my uploaded papers
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                        Hides pre-defined papers so only your own uploads appear
                        in your library.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={onlyCustomPapers}
                      onChange={handleSetOnlyCustomPapers}
                      ariaLabel="Show only my uploaded papers"
                    />
                  </div>

                  {hiddenPaperIds.length > 0 && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/70">
                      <span className="text-xs text-slate-600">
                        {hiddenPaperIds.length} pre-defined paper
                        {hiddenPaperIds.length > 1 ? "s" : ""} hidden
                      </span>
                      <button
                        type="button"
                        onClick={handleRestoreHiddenPapers}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore all
                      </button>
                    </div>
                  )}
                </div>

                {/* Exam & Optional Subject */}
                <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs">
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        Auto-advance questions
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Move to the next question after selecting an option.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={autoAdvance}
                      onChange={handleAutoAdvance}
                      ariaLabel="Automatically advance after answering"
                    />
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-900">
                        UPSC CSE Optional Subject
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Synced across Mains evaluations and AI study tools.
                    </p>
                    <OptionalSubjectSelect
                      value={optionalSubject}
                      onChange={setOptionalSubject}
                      placeholder="Choose your Optional Subject..."
                    />
                  </div>
                </div>

                {/* Reading Theme */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Reading Theme
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
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
              </>
            )}

            {activeTab === "ai" && (
              <>
                {/* AI Provider & API Keys */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        AI Provider &amp; API Keys
                      </h3>
                    </div>
                    {aiConfig?.apiKey ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        Free Tier
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {aiConfig?.provider
                          ? PROVIDER_INFO[aiConfig.provider]?.label ||
                            aiConfig.provider
                          : "Free Live AI Tier"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {aiConfig?.apiKey
                          ? `Key: ${aiConfig.apiKey.slice(0, 6)}••••••••${aiConfig.apiKey.slice(-4)}`
                          : "Add your Google Gemini, OpenAI, Anthropic, or Groq key for faster Mains evaluation & flashcards."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAiModal(true)}
                      className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>
                        {aiConfig?.apiKey
                          ? "Manage AI Provider & API Key"
                          : "Configure API Key"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Quick Sections */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                  <div className="px-4 py-2.5 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Study Tools
                  </div>
                  <div className="divide-y divide-slate-100">
                    <Link
                      href="/mains"
                      onClick={onClose}
                      className="flex items-center justify-between p-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Award className="w-4 h-4 text-emerald-600" />
                        <span>Mains Answer Evaluation</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>

                    <Link
                      href="/history"
                      onClick={(e) => {
                        if (!currentUser) {
                          e.preventDefault();
                          onClose();
                          openAuthModal();
                        } else {
                          onClose();
                        }
                      }}
                      className="flex items-center justify-between p-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <BarChart3 className="w-4 h-4 text-indigo-600" />
                        <span>Performance &amp; History</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>

                    <Link
                      href="/syllabus"
                      onClick={(e) => {
                        if (!currentUser) {
                          e.preventDefault();
                          onClose();
                          openAuthModal();
                        } else {
                          onClose();
                        }
                      }}
                      className="flex items-center justify-between p-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <ListChecks className="w-4 h-4 text-indigo-600" />
                        <span>Syllabus Tracker</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>

                    <Link
                      href="/misc"
                      onClick={(e) => {
                        if (!currentUser) {
                          e.preventDefault();
                          onClose();
                          openAuthModal();
                        } else {
                          onClose();
                        }
                      }}
                      className="flex items-center justify-between p-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Layers className="w-4 h-4 text-amber-600" />
                        <span>Vocabulary &amp; Study Aids</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </div>
                </div>

                {/* Notifications */}
                {currentUser && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-indigo-600" />
                        <h3 className="text-sm font-semibold text-slate-900">
                          Notifications
                        </h3>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={markAllNotificationsRead}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              Mark all read
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={clearNotifications}
                            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markNotificationRead(n.id);
                              onClose();
                              if (n.href) {
                                router.push(n.href);
                              }
                            }}
                            className={`p-3 text-xs transition-colors cursor-pointer hover:bg-slate-50 flex items-start gap-2.5 ${
                              !n.read ? "bg-indigo-50/30" : ""
                            }`}
                          >
                            <span
                              className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                                !n.read ? "bg-indigo-600" : "bg-transparent"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 truncate">
                                {n.title}
                              </p>
                              <p className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">
                                {n.message}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === "account" && (
              <>
                {/* Study Record & Plan */}
                <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs">
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Study record
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {attempts.length} completed assessment
                        {attempts.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {isPro ? "Pro access" : "Standard"}
                    </span>
                  </div>
                  {!isPro && (
                    <div className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          openProUpgradeModal();
                        }}
                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 cursor-pointer"
                      >
                        View available access plans →
                      </button>
                    </div>
                  )}
                </div>

                {!currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openAuthModal();
                    }}
                    className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 shadow-2xs cursor-pointer"
                  >
                    Sign in to sync your study record
                  </button>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      onClick={async () => {
                        onClose();
                        await handleSignOut();
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-slate-500" />
                      <span>Sign out</span>
                    </button>

                    {!showDeleteConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex w-full items-center gap-2.5 px-4 py-3.5 text-sm font-medium text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete account</span>
                      </button>
                    ) : (
                      <div className="space-y-3 bg-rose-50 p-4">
                        <div className="flex gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
                          <p className="text-xs leading-5 text-rose-900">
                            This permanently removes your account and saved
                            assessment data.
                          </p>
                        </div>
                        {error && (
                          <p role="alert" className="text-xs text-rose-800">
                            {error}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={handleDeleteAccount}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 cursor-pointer"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            {isDeleting ? "Deleting…" : "Confirm deletion"}
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setShowDeleteConfirm(false)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </ModalShell>
      <RevisionSettingsModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        currentConfig={aiConfig}
        onSave={(cfg) => {
          setAiConfig(cfg);
          setShowAiModal(false);
        }}
        onClear={() => {
          setAiConfig(null);
          setShowAiModal(false);
        }}
      />
    </>
  );
}

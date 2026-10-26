"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  QuestionPaper,
  Attempt,
  ActiveSessionDraft,
  AppNotification,
  AppNotificationType,
} from "../lib/types";
import { getNotifications, saveNotifications } from "../lib/notifications";
import {
  getAttempts,
  loadAttemptsFromServer,
  saveAttempt,
  updateAttempt,
  deleteAttempt,
  getAllPapers,
  deletePaperFromServer,
  updatePaperOnServer,
  getActiveDraft,
  loadActiveDraftFromServer,
  saveActiveDraft,
  clearActiveDraft,
  getLocalHiddenPaperIds,
  saveLocalHiddenPaperIds,
  removeLocalCustomPaper,
  saveCustomPaper,
  getCustomPapers,
  getGuestReviewAttempt,
  saveGuestReviewAttempt,
} from "../lib/storage";
import {
  parseQuestionnaireMarkdown,
  parseMarkdownHeader,
} from "../lib/markdownPaperParser";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { ProUpgradeModal } from "../components/ProUpgradeModal";
import { AuthModal } from "../components/AuthModal";
import { GuestCompletionModal } from "../components/GuestCompletionModal";
import {
  isPaperFree,
  isUserUploadedPaper,
  getPaperDisplayTitle,
} from "../lib/defaults";
import { isUserPro, setUserPro } from "../lib/razorpay";
import { User } from "@supabase/supabase-js";
import {
  getSupabaseClient,
  getCurrentUser,
  getUserProfile,
  updateUserProStatus,
  fetchUserAttemptsFromSupabase,
  saveUserAttemptToSupabase,
  deleteUserAttemptFromSupabase,
  fetchUserDraftFromSupabase,
  saveUserDraftToSupabase,
  clearUserDraftFromSupabase,
  hideUserPaperInSupabase,
  restoreUserHiddenPapersInSupabase,
  fetchUserCustomPapersFromSupabase,
  saveUserCustomPaperToSupabase,
  deleteUserCustomPaperFromSupabase,
} from "../lib/supabase";

interface AppContextType {
  papers: QuestionPaper[];
  attempts: Attempt[];
  activeDraft: ActiveSessionDraft | null;
  isLoading: boolean;
  isPro: boolean;
  isStartingExam: boolean;
  currentUser: User | null;
  openProUpgradeModal: (targetPaperLabel?: string) => void;
  openAuthModal: () => void;
  handleSignOut: () => Promise<void>;
  loadAllData: () => Promise<void>;
  handleStartExam: (paper: QuestionPaper, mode: "practice" | "mock") => void;
  handleResumeDraft: (draft: ActiveSessionDraft) => void;
  handleDiscardDraft: () => void;
  handleFinishExamSession: (attempt: Attempt) => void;
  handleViewAttemptDetail: (attempt: Attempt) => void;
  handleUpdateAttempt: (updated: Attempt) => void;
  handleDeleteAttempt: (attemptId: string) => void;
  handlePaperUploaded: (newPaper: QuestionPaper) => Promise<void>;
  handleDeletePaper: (paperId: string) => void;
  handleUpdatePaper: (paper: QuestionPaper) => Promise<void>;
  hiddenPaperIds: string[];
  handleRestoreHiddenPapers: () => Promise<void>;
  notifications: AppNotification[];
  addNotification: (notification: {
    type: AppNotificationType;
    title: string;
    message: string;
    href?: string;
  }) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [hiddenPaperIds, setHiddenPaperIds] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [activeDraft, setActiveDraft] = useState<ActiveSessionDraft | null>(
    () => {
      return typeof window !== "undefined" ? getActiveDraft() : null;
    },
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isStartingExam, setIsStartingExam] = useState(false);
  const startExamLockRef = useRef(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [proModalOpen, setProModalOpen] = useState<boolean>(false);
  const [proModalTarget, setProModalTarget] = useState<string | undefined>(
    undefined,
  );
  const [guestCompletionAttempt, setGuestCompletionAttempt] =
    useState<Attempt | null>(null);
  const [guestCompletionModalOpen, setGuestCompletionModalOpen] =
    useState<boolean>(false);

  const notificationUserId = currentUser?.id ?? null;

  useEffect(() => {
    setNotifications(getNotifications(notificationUserId));
  }, [notificationUserId]);

  const addNotification = useCallback(
    (notification: {
      type: AppNotificationType;
      title: string;
      message: string;
      href?: string;
    }) => {
      const nextNotification: AppNotification = {
        ...notification,
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
        read: false,
      };

      setNotifications((previous) => {
        const next = [nextNotification, ...previous].slice(0, 30);
        saveNotifications(next, notificationUserId);
        return next;
      });
    },
    [notificationUserId],
  );

  const markNotificationRead = useCallback(
    (notificationId: string) => {
      setNotifications((previous) => {
        const next = previous.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification,
        );
        saveNotifications(next, notificationUserId);
        return next;
      });
    },
    [notificationUserId],
  );

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((previous) => {
      const next = previous.map((notification) => ({
        ...notification,
        read: true,
      }));
      saveNotifications(next, notificationUserId);
      return next;
    });
  }, [notificationUserId]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    saveNotifications([], notificationUserId);
  }, [notificationUserId]);

  useEffect(() => {
    if (currentUser) {
      setIsPro(isUserPro());
    } else {
      setIsPro(false);
    }
    const onProChange = () => {
      if (currentUser) {
        setIsPro(isUserPro());
      } else {
        setIsPro(false);
      }
    };
    window.addEventListener("pro-status-changed", onProChange);
    return () => window.removeEventListener("pro-status-changed", onProChange);
  }, [currentUser]);

  const openProUpgradeModal = (targetPaperLabel?: string) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    setProModalTarget(targetPaperLabel);
    setProModalOpen(true);
  };

  const openAuthModal = () => {
    setAuthModalOpen(true);
  };

  useEffect(() => {
    if (pathname === "/exam") {
      startExamLockRef.current = false;
      setIsStartingExam(false);
    }
  }, [pathname]);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.warn("Sign out request failed; clearing the local session:", error);
    } finally {
      setCurrentUser(null);
      setUserPro(false);
      setIsPro(false);
      await loadAllData();
      router.replace("/");
    }
  };

  // Modern Confirmation & Alert Modal state
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    const user = await getCurrentUser();
    setCurrentUser(user);

    if (user) {
      // Authenticated User: Load their isolated attempts, drafts, custom papers, and profile from Supabase
      try {
        const [
          userAttempts,
          userDraft,
          loadedPapers,
          userCustomPapers,
          profile,
        ] = await Promise.all([
          fetchUserAttemptsFromSupabase(user.id),
          fetchUserDraftFromSupabase(user.id),
          getAllPapers(),
          fetchUserCustomPapersFromSupabase(user.id),
          getUserProfile(user.id),
        ]);
        setAttempts(userAttempts);

        // Intelligently merge Supabase draft with local draft:
        // Never wipe out active in-progress local exam work if Supabase is stale or null
        const localDraft = getActiveDraft();
        let bestDraft = userDraft;
        if (localDraft && localDraft.paperId) {
          if (!userDraft) {
            bestDraft = localDraft;
            saveUserDraftToSupabase(localDraft, user.id);
          } else {
            const localAnswersCount = Object.values(
              localDraft.answers || {},
            ).filter(
              (a) => a.selected !== null || (a.note && a.note.trim()),
            ).length;
            const userAnswersCount = Object.values(
              userDraft.answers || {},
            ).filter(
              (a) => a.selected !== null || (a.note && a.note.trim()),
            ).length;

            if (
              localAnswersCount >= userAnswersCount ||
              (localDraft.elapsedSeconds || 0) >=
                (userDraft.elapsedSeconds || 0)
            ) {
              bestDraft = localDraft;
              saveUserDraftToSupabase(localDraft, user.id);
            }
          }
        }
        setActiveDraft(bestDraft);

        const hidden = Array.isArray(profile?.hidden_paper_ids)
          ? profile.hidden_paper_ids
          : getLocalHiddenPaperIds(user.id);
        setHiddenPaperIds(hidden);

        const localCustom = getCustomPapers();
        // Backfill Markdown papers created before remote content fields existed.
        // This is the recovery path for the original browser's local copy.
        const remoteCustomById = new Map(
          userCustomPapers.map((paper) => [paper.id, paper]),
        );
        const localMarkdownToSync = localCustom.filter((localPaper) => {
          if (!localPaper.markdownContent) return false;
          const remotePaper = remoteCustomById.get(localPaper.id);
          return (
            !remotePaper?.markdownContent ||
            !remotePaper.parsedQuestions?.length
          );
        });
        if (localMarkdownToSync.length > 0) {
          await Promise.all(
            localMarkdownToSync.map((paper) =>
              saveUserCustomPaperToSupabase(paper, user.id),
            ),
          );
        }

        // Merge userCustomPapers from Supabase with localCustom so parsedQuestions, markdownContent, and instructions are preserved
        const mergedUserCustom = userCustomPapers.map((ucp) => {
          const match = localCustom.find((lc) => lc.id === ucp.id);
          return match
            ? {
                ...match,
                ...ucp,
                parsedQuestions:
                  match.parsedQuestions && match.parsedQuestions.length > 0
                    ? match.parsedQuestions
                    : ucp.parsedQuestions,
                markdownContent:
                  match.markdownContent || ucp.markdownContent,
                instructions:
                  match.instructions && match.instructions.length > 0
                    ? match.instructions
                    : ucp.instructions,
                answerKey:
                  Object.keys(match.answerKey || {}).length > 0
                    ? match.answerKey
                    : ucp.answerKey,
                explanations:
                  Object.keys(match.explanations || {}).length > 0
                    ? match.explanations
                    : ucp.explanations,
              }
            : ucp;
        });

        // Also add any local custom papers not yet returned by Supabase
        for (const lc of localCustom) {
          if (!mergedUserCustom.some((p) => p.id === lc.id)) {
            mergedUserCustom.push(lc);
          }
        }

        // Merge global papers and user's custom papers, deduplicating by ID
        const merged = [
          ...mergedUserCustom,
          ...loadedPapers.filter(
            (p) => !mergedUserCustom.some((cp) => cp.id === p.id),
          ),
        ];

        // Ensure all markdown papers have their parsed questions & rules enriched
        const enriched = merged.map((p) => {
          if (p.markdownContent) {
            if (!p.parsedQuestions || p.parsedQuestions.length === 0) {
              p.parsedQuestions = parseQuestionnaireMarkdown(p.markdownContent);
            }
            if (!p.instructions || p.instructions.length === 0) {
              p.instructions = parseMarkdownHeader(p.markdownContent).instructions;
            }
          }
          return p;
        });

        // Filter out papers hidden by this specific user
        const visiblePapers = enriched.filter((p) => !hidden.includes(p.id));
        setPapers(visiblePapers);

        if (profile?.is_pro) {
          setUserPro(true);
          setIsPro(true);
        } else {
          setUserPro(false);
          setIsPro(false);
        }
      } catch (err) {
        console.warn("Failed loading user data from Supabase:", err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Guest / Anonymous User: Isolated local browser storage only
    setUserPro(false);
    setIsPro(false);
    const cachedAttempts = getAttempts();
    const guestReviewAttempt = getGuestReviewAttempt();
    setAttempts(
      guestReviewAttempt
        ? [
            guestReviewAttempt,
            ...cachedAttempts.filter(
              (attempt) => attempt.id !== guestReviewAttempt.id,
            ),
          ]
        : cachedAttempts,
    );
    const localDraft = getActiveDraft();
    setActiveDraft(localDraft);

    try {
      const hidden = getLocalHiddenPaperIds();
      setHiddenPaperIds(hidden);
      const loadedPapers = await getAllPapers();
      const enriched = loadedPapers.map((p) => {
        if (p.markdownContent) {
          if (!p.parsedQuestions || p.parsedQuestions.length === 0) {
            p.parsedQuestions = parseQuestionnaireMarkdown(p.markdownContent);
          }
          if (!p.instructions || p.instructions.length === 0) {
            p.instructions = parseMarkdownHeader(p.markdownContent).instructions;
          }
        }
        return p;
      });
      setPapers(enriched.filter((p) => !hidden.includes(p.id)));
    } catch (err) {
      console.warn("Failed loading papers from server:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        const profile = await getUserProfile(user.id);
        if (profile?.is_pro) {
          setUserPro(true);
          setIsPro(true);
        }
      } else {
        setUserPro(false);
        setIsPro(false);
      }
      loadAllData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadAllData]);

  // Start exam session - free papers are available to guests; paid papers require Pro access.
  const handleStartExam = (paper: QuestionPaper, mode: "practice" | "mock") => {
    // Router navigation and paper hydration can take long enough that users
    // may click again. Lock synchronously so only the first launch can run.
    if (startExamLockRef.current) return;
    if (!isPaperFree(paper) && !isPro) {
      openProUpgradeModal(paper.label);
      return;
    }
    startExamLockRef.current = true;
    setIsStartingExam(true);
    clearActiveDraft();
    setActiveDraft(null);
    router.push(`/exam?paperId=${encodeURIComponent(paper.id)}&mode=${mode}`);

    // Recover if navigation is interrupted by a browser/network error.
    window.setTimeout(() => {
      if (startExamLockRef.current) {
        startExamLockRef.current = false;
        setIsStartingExam(false);
      }
    }, 15000);
  };

  // Resume paused exam draft
  const handleResumeDraft = (draft: ActiveSessionDraft) => {
    const resumedDraft = { ...draft, isExited: false };
    saveActiveDraft(resumedDraft);
    setActiveDraft(resumedDraft);
    if (currentUser) {
      saveUserDraftToSupabase(resumedDraft, currentUser.id);
    }
    router.push(
      `/exam?paperId=${encodeURIComponent(draft.paperId)}&mode=${draft.mode}`,
    );
  };

  // Discard draft with confirmation
  const handleDiscardDraft = () => {
    setModalConfig({
      isOpen: true,
      title: "Discard Paused Exam?",
      message:
        "Are you sure you want to discard your ongoing paused exam session? All progress and marked answers will be lost.",
      confirmText: "Discard Exam",
      cancelText: "Keep Paused",
      variant: "warning",
      onConfirm: () => {
        clearActiveDraft();
        setActiveDraft(null);
        if (currentUser) {
          clearUserDraftFromSupabase(currentUser.id);
        }
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Finishing exam session
  const handleFinishExamSession = (attempt: Attempt) => {
    if (!currentUser) {
      saveGuestReviewAttempt(attempt);
    }
    if (attempt.mode === "mock" && currentUser) {
      saveAttempt(attempt);
    }
    setAttempts((previous) => [
      attempt,
      ...previous.filter((existing) => existing.id !== attempt.id),
    ]);
    if (currentUser) {
      saveUserAttemptToSupabase(attempt, currentUser.id);
    }
    clearActiveDraft();
    setActiveDraft(null);
    if (currentUser) {
      clearUserDraftFromSupabase(currentUser.id);
    }

    addNotification({
      type: "result",
      title: "Assessment complete",
      message: `${attempt.paperLabel}: ${attempt.score} / ${attempt.maxScore}.`,
      href: `/history/${encodeURIComponent(attempt.id)}`,
    });

    // Guests can review either mode immediately; signing in only adds the result to their account.
    if (!currentUser) {
      setGuestCompletionAttempt(attempt);
      setGuestCompletionModalOpen(true);
      return;
    }

    router.push(`/history/${encodeURIComponent(attempt.id)}`);
  };

  // View detail
  const handleViewAttemptDetail = (attempt: Attempt) => {
    router.push(`/history/${encodeURIComponent(attempt.id)}`);
  };

  // Updating attempt
  const handleUpdateAttempt = (updated: Attempt) => {
    if (updated.mode === "mock") {
      updateAttempt(updated.id, () => updated);
      setAttempts(getAttempts());
      if (currentUser) {
        saveUserAttemptToSupabase(updated, currentUser.id);
      }
    }
  };

  // Delete attempt
  const handleDeleteAttempt = (attemptId: string) => {
    setModalConfig({
      isOpen: true,
      title: "Delete Assessment?",
      message:
        "Are you sure you want to permanently delete this exam attempt from history? This record and its performance analytics cannot be recovered.",
      confirmText: "Delete Attempt",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: () => {
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        deleteAttempt(attemptId);
        if (currentUser) {
          deleteUserAttemptFromSupabase(attemptId, currentUser.id);
        }
        setAttempts(getAttempts());
        router.push("/history");
      },
    });
  };

  // Paper uploaded handler
  const handlePaperUploaded = async (newPaper: QuestionPaper) => {
    // 1. Immediately inject into state so the user sees it without delay
    setPapers((prev) => [
      newPaper,
      ...prev.filter((p) => p.id !== newPaper.id),
    ]);

    // 2. Persist locally in browser storage
    saveCustomPaper(newPaper);

    // 3. Persist to Supabase if logged in
    if (currentUser?.id) {
      await saveUserCustomPaperToSupabase(newPaper, currentUser.id);
    }

    // 4. Resync full dataset
    await loadAllData();
    addNotification({
      type: "paper",
      title: "Paper added",
      message: `${newPaper.label} is available in your paper library.`,
      href: "/papers?tab=custom",
    });
  };

  // Restore hidden papers handler
  const handleRestoreHiddenPapers = async () => {
    if (currentUser) {
      await restoreUserHiddenPapersInSupabase(currentUser.id);
    }
    saveLocalHiddenPaperIds([], currentUser?.id);
    setHiddenPaperIds([]);
    await loadAllData();
  };

  // Delete / Hide paper handler
  const handleDeletePaper = (paperId: string) => {
    const targetPaper = papers.find((p) => p.id === paperId);
    const isCustomPaper = targetPaper
      ? isUserUploadedPaper(targetPaper)
      : paperId.startsWith("custom_");
    const isAdmin = currentUser?.user_metadata?.role === "admin";
    const paperName = targetPaper ? getPaperDisplayTitle(targetPaper) : paperId;

    // 1. User uploaded custom paper: ALWAYS Hard Delete to free up repository storage
    if (isCustomPaper) {
      setModalConfig({
        isOpen: true,
        title: "Delete Custom Paper?",
        message: `Permanently delete "${paperName}"? All question PDFs, answer keys, and records will be hard deleted from storage to free repository space. This cannot be undone.`,
        confirmText: "Delete Permanently",
        cancelText: "Cancel",
        variant: "danger",
        onConfirm: async () => {
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
          try {
            // Hard delete files from cloud storage, Supabase, and metadata store
            await deletePaperFromServer(paperId);
            if (currentUser?.id) {
              await deleteUserCustomPaperFromSupabase(paperId, currentUser.id);
            }
            removeLocalCustomPaper(paperId);
            setPapers((prev) => prev.filter((p) => p.id !== paperId));
          } catch (err) {
            console.error("Failed to hard delete paper:", err);
          } finally {
            await loadAllData();
          }
        },
      });
      return;
    }

    // 2. Non-admin user: Hide official UPSC archive paper from their dashboard ONLY
    if (!isAdmin) {
      setModalConfig({
        isOpen: true,
        title: "Remove Paper?",
        message: `Are you sure you want to remove "${paperName}"? It won't be visible for you anymore.`,
        confirmText: "Remove Paper",
        cancelText: "Cancel",
        variant: "warning",
        onConfirm: async () => {
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
          if (currentUser) {
            await hideUserPaperInSupabase(currentUser.id, paperId);
          }
          const currentHidden = getLocalHiddenPaperIds(currentUser?.id);
          if (!currentHidden.includes(paperId)) {
            saveLocalHiddenPaperIds(
              [...currentHidden, paperId],
              currentUser?.id,
            );
          }
          setHiddenPaperIds((prev) => [...prev, paperId]);
          setPapers((prev) => prev.filter((p) => p.id !== paperId));
        },
      });
      return;
    }

    // 3. Admin user: Global system deletion
    setModalConfig({
      isOpen: true,
      title: "Delete Paper Globally (Admin)",
      message: `As an administrator, deleting "${paperName}" will remove it permanently for all users across the platform. Proceed?`,
      confirmText: "Delete Globally",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        await deletePaperFromServer(paperId);
        await loadAllData();
      },
    });
  };

  // Update paper handler
  const handleUpdatePaper = async (paper: QuestionPaper) => {
    await updatePaperOnServer(paper.id, paper);
    if (currentUser?.id && isUserUploadedPaper(paper)) {
      await saveUserCustomPaperToSupabase(paper, currentUser.id);
    }
    setPapers((prev) => [paper, ...prev.filter((p) => p.id !== paper.id)]);
    await loadAllData();
  };

  return (
    <AppContext.Provider
      value={{
        papers,
        attempts,
        activeDraft,
        isLoading,
        isPro,
        isStartingExam,
        currentUser,
        openProUpgradeModal,
        openAuthModal,
        handleSignOut,
        loadAllData,
        handleStartExam,
        handleResumeDraft,
        handleDiscardDraft,
        handleFinishExamSession,
        handleViewAttemptDetail,
        handleUpdateAttempt,
        handleDeleteAttempt,
        handlePaperUploaded,
        handleDeletePaper,
        handleUpdatePaper,
        hiddenPaperIds,
        handleRestoreHiddenPapers,
        notifications,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
      }}
    >
      {children}

      {isStartingExam && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-label="Opening assessment"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-xl">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
            Opening assessment…
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        variant={modalConfig.variant}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      <ProUpgradeModal
        isOpen={proModalOpen}
        onClose={() => setProModalOpen(false)}
        targetPaperLabel={proModalTarget}
        onSuccess={async () => {
          setIsPro(true);
          if (currentUser) {
            await updateUserProStatus(currentUser.id);
          }
        }}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={async () => {
          if (guestCompletionAttempt) {
            const completedGuestAttempt = guestCompletionAttempt;
            const user = await getCurrentUser();
            if (user) {
              await saveUserAttemptToSupabase(completedGuestAttempt, user.id);
            }

            // Load the account first, then retain the just-completed result in
            // memory before navigating to its detail route. Without this, the
            // route can render between the auth refresh and the Supabase write.
            await loadAllData();
            setAttempts((previous) => [
              completedGuestAttempt,
              ...previous.filter(
                (attempt) => attempt.id !== completedGuestAttempt.id,
              ),
            ]);
            setGuestCompletionModalOpen(false);
            const targetId = completedGuestAttempt.id;
            setGuestCompletionAttempt(null);
            router.push(`/history/${encodeURIComponent(targetId)}`);
            return;
          }
          await loadAllData();
        }}
      />

      <GuestCompletionModal
        isOpen={guestCompletionModalOpen}
        attempt={guestCompletionAttempt}
        onOpenAuth={() => {
          setGuestCompletionModalOpen(false);
          setAuthModalOpen(true);
        }}
        onProceedAsGuest={() => {
          setGuestCompletionModalOpen(false);
          if (guestCompletionAttempt) {
            const targetId = guestCompletionAttempt.id;
            setGuestCompletionAttempt(null);
            router.push(`/history/${encodeURIComponent(targetId)}`);
          }
        }}
      />
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

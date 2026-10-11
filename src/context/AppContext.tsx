"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { QuestionPaper, Attempt, ActiveSessionDraft } from "../lib/types";
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
} from "../lib/storage";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { ProUpgradeModal } from "../components/ProUpgradeModal";
import { AuthModal } from "../components/AuthModal";
import { GuestCompletionModal } from "../components/GuestCompletionModal";
import { isPaperFree } from "../lib/defaults";
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
  deleteUserCustomPaperFromSupabase,
} from "../lib/supabase";

interface AppContextType {
  papers: QuestionPaper[];
  attempts: Attempt[];
  activeDraft: ActiveSessionDraft | null;
  isLoading: boolean;
  isPro: boolean;
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
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [hiddenPaperIds, setHiddenPaperIds] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [activeDraft, setActiveDraft] = useState<ActiveSessionDraft | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [proModalOpen, setProModalOpen] = useState<boolean>(false);
  const [proModalTarget, setProModalTarget] = useState<string | undefined>(
    undefined,
  );
  const [guestCompletionAttempt, setGuestCompletionAttempt] =
    useState<Attempt | null>(null);
  const [guestCompletionModalOpen, setGuestCompletionModalOpen] =
    useState<boolean>(false);

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

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setUserPro(false);
    setIsPro(false);
    await loadAllData();
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
        setActiveDraft(userDraft);

        const hidden = Array.isArray(profile?.hidden_paper_ids)
          ? profile.hidden_paper_ids
          : getLocalHiddenPaperIds(user.id);
        setHiddenPaperIds(hidden);

        // Merge global papers and user's custom papers, deduplicating by ID
        const merged = [
          ...userCustomPapers,
          ...loadedPapers.filter(
            (p) => !userCustomPapers.some((cp) => cp.id === p.id),
          ),
        ];
        // Filter out papers hidden by this specific user
        const visiblePapers = merged.filter((p) => !hidden.includes(p.id));
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
    setAttempts(cachedAttempts);
    const localDraft = getActiveDraft();
    setActiveDraft(localDraft);

    try {
      const hidden = getLocalHiddenPaperIds();
      setHiddenPaperIds(hidden);
      const loadedPapers = await getAllPapers();
      setPapers(loadedPapers.filter((p) => !hidden.includes(p.id)));
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

  // Start exam session - Gated for Freemium (Free: 2026 Prelims GS I & CSAT, Pro: all other papers)
  // Mock mode requires user account / login
  const handleStartExam = (paper: QuestionPaper, mode: "practice" | "mock") => {
    if (mode === "mock" && !currentUser) {
      openAuthModal();
      return;
    }
    if (!isPaperFree(paper) && !isPro) {
      openProUpgradeModal(paper.label);
      return;
    }
    clearActiveDraft();
    setActiveDraft(null);
    router.push(`/exam?paperId=${encodeURIComponent(paper.id)}&mode=${mode}`);
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
    saveAttempt(attempt);
    setAttempts(getAttempts());
    if (currentUser) {
      saveUserAttemptToSupabase(attempt, currentUser.id);
    }
    clearActiveDraft();
    setActiveDraft(null);
    if (currentUser) {
      clearUserDraftFromSupabase(currentUser.id);
    }

    // Practice mode allows immediate direct review without login!
    // Mock mode prompts user to sign in to save test attempt.
    if (!currentUser && attempt.mode === "mock") {
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
      title: "Delete Mock Exam Attempt?",
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
    await loadAllData();
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
    const isAdmin = currentUser?.user_metadata?.role === "admin";
    const isOwnCustomPaper =
      Boolean(targetPaper?.isCustom) &&
      Boolean(targetPaper?.userId) &&
      targetPaper?.userId === currentUser?.id;

    if (isOwnCustomPaper && currentUser) {
      // 1. User deleting their own personal custom paper
      setModalConfig({
        isOpen: true,
        title: "Delete Custom Paper?",
        message: `Permanently delete your custom paper "${targetPaper?.label || paperId}" from your vault? This cannot be undone.`,
        confirmText: "Delete My Paper",
        cancelText: "Cancel",
        variant: "danger",
        onConfirm: async () => {
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
          await deleteUserCustomPaperFromSupabase(paperId, currentUser.id);
          await loadAllData();
        },
      });
      return;
    }

    if (!isAdmin) {
      // 2. Non-admin user: Hide paper from their dashboard ONLY (NEVER delete shared storage files!)
      setModalConfig({
        isOpen: true,
        title: "Remove Paper?",
        message: `Are you sure you want to remove "${targetPaper?.label || "this paper"}"? It won't be visible for you anymore.`,
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
      message: `As an administrator, deleting "${targetPaper?.label || paperId}" will remove it permanently for all users across the platform. Proceed?`,
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
    const freshPapers = await getAllPapers();
    setPapers(freshPapers);
  };

  return (
    <AppContext.Provider
      value={{
        papers,
        attempts,
        activeDraft,
        isLoading,
        isPro,
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
      }}
    >
      {children}

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
          await loadAllData();
          if (guestCompletionAttempt) {
            const user = await getCurrentUser();
            if (user) {
              await saveUserAttemptToSupabase(guestCompletionAttempt, user.id);
            }
            setGuestCompletionModalOpen(false);
            const targetId = guestCompletionAttempt.id;
            setGuestCompletionAttempt(null);
            router.push(`/history/${encodeURIComponent(targetId)}`);
          }
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

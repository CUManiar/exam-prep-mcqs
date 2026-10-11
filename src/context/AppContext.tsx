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
} from "../lib/storage";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { ProUpgradeModal } from "../components/ProUpgradeModal";
import { isUserPro } from "../lib/razorpay";

interface AppContextType {
  papers: QuestionPaper[];
  attempts: Attempt[];
  activeDraft: ActiveSessionDraft | null;
  isLoading: boolean;
  isPro: boolean;
  openProUpgradeModal: (targetPaperLabel?: string) => void;
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
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [activeDraft, setActiveDraft] = useState<ActiveSessionDraft | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [proModalOpen, setProModalOpen] = useState<boolean>(false);
  const [proModalTarget, setProModalTarget] = useState<string | undefined>(undefined);

  useEffect(() => {
    setIsPro(isUserPro());
    const onProChange = () => setIsPro(isUserPro());
    window.addEventListener("pro-status-changed", onProChange);
    return () => window.removeEventListener("pro-status-changed", onProChange);
  }, []);

  const openProUpgradeModal = (targetPaperLabel?: string) => {
    setProModalTarget(targetPaperLabel);
    setProModalOpen(true);
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
    // 1. Initial local cache for instant render
    const cachedAttempts = getAttempts();
    setAttempts(cachedAttempts);
    const localDraft = getActiveDraft();
    setActiveDraft(localDraft);

    try {
      // 2. Fetch server persisted attempts, papers & cross-device draft
      const [serverAttempts, loadedPapers, serverDraft] = await Promise.all([
        loadAttemptsFromServer(),
        getAllPapers(),
        loadActiveDraftFromServer(),
      ]);
      setAttempts(serverAttempts);
      setPapers(loadedPapers);

      const effectiveDraft = localDraft || serverDraft;
      if (effectiveDraft) {
        setActiveDraft(effectiveDraft);
      }
    } catch (err) {
      console.warn("Failed loading data from server:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Start exam session - Gated for Freemium (Free: 2026 Prelims, Pro: 2011-2025 & Mains)
  const handleStartExam = (paper: QuestionPaper, mode: "practice" | "mock") => {
    if (paper.year !== "2026" && !isUserPro()) {
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
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Finishing exam session
  const handleFinishExamSession = (attempt: Attempt) => {
    if (attempt.mode === "mock") {
      saveAttempt(attempt);
      setAttempts(getAttempts());
    }
    clearActiveDraft();
    setActiveDraft(null);
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
        setAttempts(getAttempts());
        router.push("/history");
      },
    });
  };

  // Paper uploaded handler
  const handlePaperUploaded = async (newPaper: QuestionPaper) => {
    const freshPapers = await getAllPapers();
    setPapers(freshPapers);
  };

  // Delete paper handler
  const handleDeletePaper = (paperId: string) => {
    setModalConfig({
      isOpen: true,
      title: "Delete Question Paper?",
      message:
        "Are you sure you want to delete this paper and its files from the repository? Associated PDF and answer files will be removed.",
      confirmText: "Delete Paper",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        await deletePaperFromServer(paperId);
        const freshPapers = await getAllPapers();
        setPapers(freshPapers);
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
        openProUpgradeModal,
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
        onSuccess={() => setIsPro(true)}
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

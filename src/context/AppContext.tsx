"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  QuestionPaper,
  Attempt,
  ActiveSessionDraft,
  AppNotification,
  AppNotificationType,
  SyllabusItem,
} from "../lib/types";
import { getNotifications, saveNotifications } from "../lib/notifications";
import {
  getStoredOptionalSubject,
  saveStoredOptionalSubject,
} from "../lib/optionalSubjects";
import {
  getAttempts,
  saveAttempt,
  updateAttempt,
  deleteAttempt,
  getAllPapers,
  deletePaperFromServer,
  updatePaperOnServer,
  getActiveDraft,
  saveActiveDraft,
  clearActiveDraft,
  getLocalHiddenPaperIds,
  saveLocalHiddenPaperIds,
  getOnlyCustomPapers,
  saveOnlyCustomPapers,
  getCustomSyllabus,
  saveCustomSyllabus,
  getCustomSyllabusMarkdown,
  saveCustomSyllabusMarkdown,
  removeLocalCustomPaper,
  saveCustomPaper,
  saveEphemeralPracticePaper,
  getCustomPapers,
  getGuestReviewAttempt,
  saveGuestReviewAttempt,
  clearPapersCache,
  setActiveStorageUserId,
  getDeletedAttemptIds,
} from "../lib/storage";
import { isEphemeralPracticePaper } from "../lib/retestUtils";
import {
  parseQuestionnaireMarkdown,
  parseMarkdownHeader,
} from "../lib/markdownPaperParser";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { ProUpgradeModal } from "../components/ProUpgradeModal";
import { AuthModal } from "../components/AuthModal";
import { syncVocabCardsWithSupabase } from "../lib/vocabStorage";
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
  updateOnlyCustomPapersInSupabase,
  saveUserSyllabusToSupabase,
  saveUserSyllabusMarkdownToSupabase,
} from "../lib/supabase";
import {
  getSyllabusCompletion,
  getSyllabusTopicKey,
  parseSyllabusMarkdown,
} from "../lib/syllabusMarkdown";

export type AppTheme = "light" | "sepia" | "dark";

interface AppContextType {
  papers: QuestionPaper[];
  attempts: Attempt[];
  activeDraft: ActiveSessionDraft | null;
  isLoading: boolean;
  isPro: boolean;
  isStartingExam: boolean;
  currentUser: User | null;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  optionalSubject: string;
  setOptionalSubject: (subject: string) => void;
  openProUpgradeModal: (targetPaperLabel?: string) => void;
  openAuthModal: () => void;
  handleSignOut: () => Promise<void>;
  loadAllData: (options?: { forceLoading?: boolean }) => Promise<void>;
  handleStartExam: (paper: QuestionPaper, mode: "practice" | "mock") => void;
  handleResumeDraft: (draft: ActiveSessionDraft) => void;
  handleDiscardDraft: () => void;
  handleFinishExamSession: (attempt: Attempt) => Promise<void> | void;
  notifyExamReady: () => void;
  handleViewAttemptDetail: (attempt: Attempt) => void;
  handleUpdateAttempt: (updated: Attempt) => void;
  handleDeleteAttempt: (attemptId: string) => void;
  handlePaperUploaded: (newPaper: QuestionPaper) => Promise<void>;
  handleDeletePaper: (paperId: string) => void;
  handleUpdatePaper: (paper: QuestionPaper) => Promise<void>;
  hiddenPaperIds: string[];
  handleRestoreHiddenPapers: () => Promise<void>;
  onlyCustomPapers: boolean;
  handleSetOnlyCustomPapers: (value: boolean) => Promise<void>;
  syllabusItems: SyllabusItem[];
  syllabusMarkdown: string;
  handleImportSyllabusMarkdown: (markdown: string) => Promise<void>;
  handleClearSyllabus: () => Promise<void>;
  handleToggleSyllabusItem: (itemId: string) => Promise<void>;
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
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [hiddenPaperIds, setHiddenPaperIds] = useState<string[]>([]);
  const [onlyCustomPapers, setOnlyCustomPapers] = useState(false);
  const [syllabusItems, setSyllabusItems] = useState<SyllabusItem[]>([]);
  const [syllabusMarkdown, setSyllabusMarkdown] = useState("");
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

  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("exam_prep_theme") as AppTheme | null;
    return saved === "sepia" || saved === "dark" ? saved : "light";
  });

  const setTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("exam_prep_theme", newTheme);
      } catch {}
      document.documentElement.setAttribute("data-theme", newTheme);
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  const [optionalSubject, setOptionalSubjectState] = useState<string>(() => {
    return getStoredOptionalSubject();
  });

  const setOptionalSubject = useCallback((subj: string) => {
    setOptionalSubjectState(subj);
    saveStoredOptionalSubject(subj);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOptionalSubjectChanged = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail && typeof customEvent.detail === "string") {
        setOptionalSubjectState(customEvent.detail);
      }
    };
    window.addEventListener(
      "optional-subject-changed",
      handleOptionalSubjectChanged,
    );
    return () => {
      window.removeEventListener(
        "optional-subject-changed",
        handleOptionalSubjectChanged,
      );
    };
  }, []);

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

  // Called by the exam page once the paper is fully rendered, dismissing
  // the "Opening assessment…" overlay that was shown when the user clicked
  // Mock/Practice. Using an explicit signal (instead of a pathname effect)
  // ensures the loader stays visible for the full hydration period.
  const notifyExamReady = useCallback(() => {
    startExamLockRef.current = false;
    setIsStartingExam(false);
  }, []);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.warn(
        "Sign out request failed; clearing the local session:",
        error,
      );
    } finally {
      setCurrentUser(null);
      setUserPro(false);
      setIsPro(false);
      setActiveStorageUserId(null);
      clearPapersCache();
      await loadAllData({ forceLoading: true });
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

  const isInitialLoadDoneRef = useRef(false);
  const inFlightLoadAllDataRef = useRef<Promise<void> | null>(null);
  const lastAuthUserIdRef = useRef<string | null | undefined>(undefined);

  const loadAllData = useCallback(
    async (options?: { forceLoading?: boolean }) => {
      if (inFlightLoadAllDataRef.current) {
        return inFlightLoadAllDataRef.current;
      }

      const run = async () => {
        // Only trigger full-screen loading spinner on initial app boot or when explicitly forced
        if (!isInitialLoadDoneRef.current || options?.forceLoading) {
          setIsLoading(true);
        }
        try {
          const user = await getCurrentUser();
          lastAuthUserIdRef.current = user?.id ?? null;
          setActiveStorageUserId(user?.id ?? null);
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
                getAllPapers(true, user.id),
                fetchUserCustomPapersFromSupabase(user.id),
                getUserProfile(user.id),
              ]);
              const deletedIds = getDeletedAttemptIds(user.id);
              const filteredAttempts = userAttempts.filter(
                (a) => !deletedIds.has(a.id),
              );
              setAttempts(filteredAttempts);
              // Retry cloud deletion for any tombstoned attempts still present on server
              userAttempts
                .filter((a) => deletedIds.has(a.id))
                .forEach((a) => {
                  void deleteUserAttemptFromSupabase(a.id, user.id);
                });

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
              const customOnly =
                profile?.only_custom_papers ?? getOnlyCustomPapers(user.id);
              setOnlyCustomPapers(customOnly);
              setSyllabusItems(
                Array.isArray(profile?.custom_syllabus)
                  ? profile.custom_syllabus
                  : getCustomSyllabus(user.id),
              );
              setSyllabusMarkdown(
                profile?.custom_syllabus_markdown ??
                  getCustomSyllabusMarkdown(user.id),
              );

              // Sync vocab cards between local storage and Supabase cloud profile
              syncVocabCardsWithSupabase(user.id).catch((err) =>
                console.warn("Background vocab sync on auth load failed:", err),
              );

              const localCustom = getCustomPapers(user.id).filter(
                (p) =>
                  !isEphemeralPracticePaper(p) &&
                  (!p.userId || p.userId === user.id),
              );
              // Backfill Markdown papers created before remote content fields existed.
              // This is the recovery path for the original browser's local copy.
              const remoteCustomById = new Map(
                userCustomPapers
                  .filter((p) => !isEphemeralPracticePaper(p))
                  .map((paper) => [paper.id, paper]),
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
              // NOTE: ucp (server source of truth) takes precedence for answer keys, explanations, and scoring rules so updates reflect immediately.
              const mergedUserCustom = userCustomPapers
                .filter((ucp) => !isEphemeralPracticePaper(ucp))
                .map((ucp) => {
                  const match = localCustom.find((lc) => lc.id === ucp.id);
                  const resolvedAnswerKey =
                    Object.keys(ucp.answerKey || {}).length > 0
                      ? ucp.answerKey
                      : match?.answerKey || {};
                  const resolvedExplanations =
                    Object.keys(ucp.explanations || {}).length > 0
                      ? ucp.explanations
                      : match?.explanations || {};
                  const rawCorrect = ucp.correctMarks ?? match?.correctMarks;
                  const resolvedCorrectMarks =
                    rawCorrect !== undefined &&
                    rawCorrect !== null &&
                    !isNaN(Number(rawCorrect)) &&
                    Number(rawCorrect) > 0
                      ? Number(rawCorrect)
                      : 2.0;

                  const rawIncorrect =
                    ucp.incorrectMarks ?? match?.incorrectMarks;
                  const resolvedIncorrectMarks =
                    rawIncorrect !== undefined &&
                    rawIncorrect !== null &&
                    !isNaN(Number(rawIncorrect))
                      ? Number(rawIncorrect)
                      : 0.667;

                  const mergedPaper: QuestionPaper = match
                    ? {
                        ...match,
                        ...ucp,
                        parsedQuestions:
                          match.parsedQuestions &&
                          match.parsedQuestions.length > 0
                            ? match.parsedQuestions
                            : ucp.parsedQuestions,
                        markdownContent:
                          match.markdownContent || ucp.markdownContent,
                        instructions:
                          match.instructions && match.instructions.length > 0
                            ? match.instructions
                            : ucp.instructions,
                        answerKey: resolvedAnswerKey,
                        explanations: resolvedExplanations,
                        correctMarks: resolvedCorrectMarks,
                        incorrectMarks: resolvedIncorrectMarks,
                      }
                    : ucp;

                  // Keep local storage synchronized with fresh server data
                  saveCustomPaper(mergedPaper);
                  return mergedPaper;
                });

              // Also add any local custom papers not yet returned by Supabase
              for (const lc of localCustom) {
                if (!mergedUserCustom.some((p) => p.id === lc.id)) {
                  mergedUserCustom.push(lc);
                }
              }

              // Merge global pre-defined papers and this user's own custom papers, deduplicating by ID
              const merged = [
                ...mergedUserCustom,
                ...loadedPapers.filter(
                  (p) =>
                    !mergedUserCustom.some((cp) => cp.id === p.id) &&
                    (!isUserUploadedPaper(p) || p.userId === user.id),
                ),
              ];

              // Ensure all markdown papers have their parsed questions & rules enriched
              const enriched = merged.map((p) => {
                if (p.markdownContent) {
                  if (!p.parsedQuestions || p.parsedQuestions.length === 0) {
                    p.parsedQuestions = parseQuestionnaireMarkdown(
                      p.markdownContent,
                    );
                  }
                  if (!p.instructions || p.instructions.length === 0) {
                    p.instructions = parseMarkdownHeader(
                      p.markdownContent,
                    ).instructions;
                  }
                }
                return p;
              });

              // Filter out papers hidden by this specific user or ephemeral practice/re-test sets
              const visiblePapers = enriched.filter(
                (p) =>
                  !isEphemeralPracticePaper(p) &&
                  !hidden.includes(p.id) &&
                  (!customOnly || isUserUploadedPaper(p)),
              );
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
            }
            return;
          }

          // Guest / Anonymous User: Isolated local browser storage only
          setUserPro(false);
          setIsPro(false);
          const guestDeletedIds = getDeletedAttemptIds(null);
          const cachedAttempts = getAttempts().filter(
            (a) => !guestDeletedIds.has(a.id),
          );
          const rawGuestReview = getGuestReviewAttempt();
          const guestReviewAttempt =
            rawGuestReview && !guestDeletedIds.has(rawGuestReview.id)
              ? rawGuestReview
              : null;
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
            const customOnly = getOnlyCustomPapers();
            setOnlyCustomPapers(customOnly);
            setSyllabusItems(getCustomSyllabus());
            setSyllabusMarkdown(getCustomSyllabusMarkdown());
            const loadedPapers = await getAllPapers(true, null);
            const enriched = loadedPapers
              .filter((p) => !isUserUploadedPaper(p) || !p.userId)
              .map((p) => {
                if (p.markdownContent) {
                  if (!p.parsedQuestions || p.parsedQuestions.length === 0) {
                    p.parsedQuestions = parseQuestionnaireMarkdown(
                      p.markdownContent,
                    );
                  }
                  if (!p.instructions || p.instructions.length === 0) {
                    p.instructions = parseMarkdownHeader(
                      p.markdownContent,
                    ).instructions;
                  }
                }
                return p;
              });
            setPapers(
              enriched.filter(
                (p) =>
                  !isEphemeralPracticePaper(p) &&
                  !hidden.includes(p.id) &&
                  (!customOnly || isUserUploadedPaper(p)),
              ),
            );
          } catch (err) {
            console.warn("Failed loading papers from server:", err);
          }
        } finally {
          isInitialLoadDoneRef.current = true;
          setIsLoading(false);
        }
      };

      inFlightLoadAllDataRef.current = run();
      try {
        await inFlightLoadAllDataRef.current;
      } finally {
        inFlightLoadAllDataRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    loadAllData();

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // 1. Ignore INITIAL_SESSION to avoid duplicate full reload on initial page load
      if (_event === "INITIAL_SESSION") {
        return;
      }
      // 2. Ignore background token refresh events - user session and identity have not changed
      if (_event === "TOKEN_REFRESHED") {
        return;
      }

      const newUserId = session?.user?.id ?? null;
      // 3. Prevent duplicate full reloads when window/tab focus triggers auth events for the same user
      if (
        lastAuthUserIdRef.current !== undefined &&
        lastAuthUserIdRef.current === newUserId
      ) {
        return;
      }
      lastAuthUserIdRef.current = newUserId;

      const user = session?.user || null;
      setActiveStorageUserId(newUserId);
      clearPapersCache();
      setCurrentUser(user);
      if (user) {
        const profile = await getUserProfile(user.id);
        if (profile?.is_pro) {
          setUserPro(true);
          setIsPro(true);
        } else {
          setUserPro(false);
          setIsPro(false);
        }
      } else {
        setUserPro(false);
        setIsPro(false);
      }
      await loadAllData({ forceLoading: true });
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
    // Ephemeral practice sets (re-tests, syllabus topic practice) run in-session
    // without being added to the persistent Question Papers repository.
    if (isEphemeralPracticePaper(paper)) {
      saveEphemeralPracticePaper(paper);
    } else {
      setPapers((prev) =>
        prev.some((p) => p.id === paper.id) ? prev : [paper, ...prev],
      );
    }
    clearActiveDraft();
    setActiveDraft(null);
    if (currentUser) {
      void clearUserDraftFromSupabase(currentUser.id);
    }
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
    if (startExamLockRef.current) return;
    startExamLockRef.current = true;
    setIsStartingExam(true);
    const resumedDraft = { ...draft, isExited: false };
    saveActiveDraft(resumedDraft);
    setActiveDraft(resumedDraft);
    if (currentUser) {
      saveUserDraftToSupabase(resumedDraft, currentUser.id);
    }
    router.push(
      `/exam?paperId=${encodeURIComponent(draft.paperId)}&mode=${draft.mode}`,
    );
    window.setTimeout(() => {
      if (startExamLockRef.current) {
        startExamLockRef.current = false;
        setIsStartingExam(false);
      }
    }, 15000);
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
  const handleFinishExamSession = async (attempt: Attempt) => {
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
      await saveUserAttemptToSupabase(attempt, currentUser.id);
    }
    clearActiveDraft();
    setActiveDraft(null);
    if (currentUser) {
      await clearUserDraftFromSupabase(currentUser.id);
    }

    addNotification({
      type: "result",
      title: "Assessment complete",
      message: `${attempt.paperLabel}: ${attempt.score} / ${attempt.maxScore}.`,
      href: `/history/${encodeURIComponent(attempt.id)}`,
    });

    // Direct seamless transition to assessment review for both guest and authenticated users
    window.dispatchEvent(new Event("app-navigation-start"));
    router.push(`/history/${encodeURIComponent(attempt.id)}`);
  };

  // View detail
  const handleViewAttemptDetail = (attempt: Attempt) => {
    window.dispatchEvent(new Event("app-navigation-start"));
    router.push(`/history/${encodeURIComponent(attempt.id)}`);
  };

  // Updating attempt
  const handleUpdateAttempt = (updated: Attempt) => {
    // 1. Immediately update in-memory state so active review session never drops the attempt
    setAttempts((prev) => {
      const idx = prev.findIndex((a) => a.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [updated, ...prev];
    });

    // 2. Persist to storage
    updateAttempt(updated.id, () => updated);
    if (updated.mode !== "mock") {
      saveGuestReviewAttempt(updated);
    }

    // 3. Sync to Supabase if authenticated
    if (currentUser) {
      saveUserAttemptToSupabase(updated, currentUser.id);
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
      onConfirm: async () => {
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
        deleteAttempt(attemptId, currentUser?.id);
        setAttempts((prev) => prev.filter((a) => a.id !== attemptId));
        if (currentUser) {
          await deleteUserAttemptFromSupabase(attemptId, currentUser.id);
        }
        router.push("/history");
      },
    });
  };

  // Paper uploaded handler
  const handlePaperUploaded = async (newPaper: QuestionPaper) => {
    const ownedPaper: QuestionPaper = {
      ...newPaper,
      isCustom: true,
      userId: newPaper.userId || currentUser?.id || undefined,
    };
    // 1. Immediately inject into state so the user sees it without delay
    setPapers((prev) => [
      ownedPaper,
      ...prev.filter((p) => p.id !== ownedPaper.id),
    ]);

    // 2. Persist locally in user-scoped browser storage
    saveCustomPaper(ownedPaper, currentUser?.id);

    // 3. Persist to Supabase if logged in
    if (currentUser?.id) {
      await saveUserCustomPaperToSupabase(ownedPaper, currentUser.id);
    }

    // 4. Resync full dataset
    await loadAllData();
    addNotification({
      type: "paper",
      title: "Paper added",
      message: `${ownedPaper.label} is available in your paper library.`,
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

  const handleSetOnlyCustomPapers = async (value: boolean) => {
    setOnlyCustomPapers(value);
    saveOnlyCustomPapers(value, currentUser?.id);
    if (currentUser)
      await updateOnlyCustomPapersInSupabase(currentUser.id, value);
    await loadAllData();
  };

  const persistSyllabus = async (items: SyllabusItem[]) => {
    setSyllabusItems(items);
    saveCustomSyllabus(items, currentUser?.id);
    if (currentUser) await saveUserSyllabusToSupabase(currentUser.id, items);
  };

  const handleImportSyllabusMarkdown = async (markdown: string) => {
    const items = parseSyllabusMarkdown(
      markdown,
      syllabusMarkdown.trim() ? syllabusItems : [],
    );
    setSyllabusMarkdown(markdown);
    saveCustomSyllabusMarkdown(markdown, currentUser?.id);
    if (currentUser) {
      await saveUserSyllabusMarkdownToSupabase(currentUser.id, markdown);
    }
    await persistSyllabus(items);
  };

  const handleClearSyllabus = async () => {
    setSyllabusMarkdown("");
    saveCustomSyllabusMarkdown("", currentUser?.id);
    if (currentUser) {
      await saveUserSyllabusMarkdownToSupabase(currentUser.id, "");
    }
    await persistSyllabus([]);
  };

  const handleToggleSyllabusItem = async (itemId: string) => {
    const item = syllabusItems.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const nextCompleted = !getSyllabusCompletion(item, syllabusItems);
    const topicKey = getSyllabusTopicKey(item);
    const affectedIds = new Set(
      syllabusItems
        .filter((candidate) => getSyllabusTopicKey(candidate) === topicKey)
        .map((candidate) => candidate.id),
    );
    let changed = true;
    while (changed) {
      changed = false;
      syllabusItems.forEach((candidate) => {
        if (candidate.parentId && affectedIds.has(candidate.parentId)) {
          if (!affectedIds.has(candidate.id)) {
            affectedIds.add(candidate.id);
            changed = true;
          }
        }
      });
    }
    await persistSyllabus(
      syllabusItems.map((existing) =>
        affectedIds.has(existing.id)
          ? {
              ...existing,
              completed: nextCompleted,
              updatedAt: new Date().toISOString(),
            }
          : existing,
      ),
    );
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
        theme,
        setTheme,
        openProUpgradeModal,
        openAuthModal,
        handleSignOut,
        loadAllData,
        handleStartExam,
        handleResumeDraft,
        handleDiscardDraft,
        handleFinishExamSession,
        notifyExamReady,
        handleViewAttemptDetail,
        handleUpdateAttempt,
        handleDeleteAttempt,
        handlePaperUploaded,
        handleDeletePaper,
        handleUpdatePaper,
        hiddenPaperIds,
        handleRestoreHiddenPapers,
        onlyCustomPapers,
        handleSetOnlyCustomPapers,
        syllabusItems,
        syllabusMarkdown,
        handleImportSyllabusMarkdown,
        handleClearSyllabus,
        handleToggleSyllabusItem,
        notifications,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
        optionalSubject,
        setOptionalSubject,
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
          await loadAllData();
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

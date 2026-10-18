"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  QuestionPaper,
  Attempt,
  QuestionAnswer,
  ActiveSessionDraft,
  ConfidenceLevel,
} from "../lib/types";
import {
  formatTimeSeconds,
  parseAnswerKeyText,
  parseAnswerKeyDetailed,
  getStandardTimeMinutes,
  getPaperDisplayTitle,
} from "../lib/defaults";
import { saveActiveDraft, clearActiveDraft } from "../lib/storage";
import { DetailedSolutionModal } from "./DetailedSolutionModal";
import { ConfirmationModal } from "./ConfirmationModal";
import { PdfViewer } from "./PdfViewer";
import {
  Clock,
  Flag,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Edit3,
  UploadCloud,
  FileUp,
  FileText,
  Trash2,
  Loader2,
  AlertTriangle,
  Bookmark,
  Pause,
  Play,
  Save,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  RotateCcw,
} from "lucide-react";

interface ExamSessionViewProps {
  paper: QuestionPaper;
  mode: "practice" | "mock";
  initialDraft?: ActiveSessionDraft | null;
  onFinish: (attempt: Attempt) => void;
  onExit: () => void;
}

export function ExamSessionView({
  paper,
  mode,
  initialDraft,
  onFinish,
  onExit,
}: ExamSessionViewProps) {
  const [currentQuestion, setCurrentQuestion] = useState<number | null>(
    initialDraft?.currentQuestion ?? null,
  );
  const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>(
    initialDraft?.answers || {},
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(
    initialDraft?.elapsedSeconds || 0,
  );
  const [idleTimeSeconds, setIdleTimeSeconds] = useState<number>(
    initialDraft?.idleTimeSeconds || 0,
  );
  const [qTimeSpent, setQTimeSpent] = useState<Record<number, number>>(
    initialDraft?.qTimeSpent || {},
  );
  const [filterMode, setFilterMode] = useState<
    "all" | "attempted" | "unattempted" | "flagged"
  >("all");
  const [showNoteBox, setShowNoteBox] = useState<boolean>(true);
  const [showFinishConfirm, setShowFinishConfirm] = useState<boolean>(false);
  const [solutionModalOpen, setSolutionModalOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<"paper" | "split" | "omr">(
    "split",
  );
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [revealedAnswers, setRevealedAnswers] = useState<
    Record<number, boolean>
  >({});
  const [sessionExplanations, setSessionExplanations] = useState<
    Record<number, string>
  >(() => {
    if (paper.explanations && Object.keys(paper.explanations).length > 0) {
      return paper.explanations;
    }
    if (paper.answerKeyText) {
      return parseAnswerKeyDetailed(paper.answerKeyText).explanations;
    }
    return {};
  });

  // Subjective (Mains) handwritten scan & upload state
  const [isScanUploadPhase, setIsScanUploadPhase] = useState<boolean>(false);
  const [userSubmissionFile, setUserSubmissionFile] = useState<File | null>(
    null,
  );
  const [isUploadingScan, setIsUploadingScan] = useState<boolean>(false);
  const [fullBookletUrl, setFullBookletUrl] = useState<string | undefined>(
    undefined,
  );
  const [fullBookletName, setFullBookletName] = useState<string | undefined>(
    undefined,
  );

  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Auto-request fullscreen for Mock Exam mode
  useEffect(() => {
    if (mode === "mock" && typeof document !== "undefined") {
      const enterFull = async () => {
        try {
          if (
            !document.fullscreenElement &&
            document.documentElement.requestFullscreen
          ) {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
          }
        } catch {
          // Browser security policy might require explicit user gesture
        }
      };
      enterFull();
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [mode]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  };

  const handleAttemptExit = () => {
    if (mode === "mock") {
      setShowExitConfirm(true);
    } else {
      // Practice mode: allow smooth direct exit
      onExit();
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    // When user exits mock test midway, it is NOT counted in attempts
    clearActiveDraft();
    onExit();
  };

  const timeLimitMinutes =
    paper.timeMinutes || getStandardTimeMinutes(paper.category, paper.examType);
  const totalTimeSeconds = timeLimitMinutes * 60;
  const isPractice = mode === "practice";
  const isSubjective = paper.examType === "subjective";

  // In Practice mode, user can surpass time limit, tracking extra time
  const isOvertime = isPractice && elapsedSeconds > totalTimeSeconds;
  const overtimeSeconds = isOvertime ? elapsedSeconds - totalTimeSeconds : 0;
  const remainingSeconds = Math.max(0, totalTimeSeconds - elapsedSeconds);

  // 10% remaining check (for mock countdown, or practice when approaching limit or exceeding)
  const isTimeCritical =
    isOvertime ||
    (totalTimeSeconds > 0 && remainingSeconds <= totalTimeSeconds * 0.1);

  // Helper to reliably retrieve correct answer for any question
  const getCorrectAnswerForQ = (qNo: number): string | undefined => {
    const k = paper.answerKey;
    let val = k ? k[qNo] || k[String(qNo)] : undefined;
    if (!val && answers[qNo]?.correctAnswer) val = answers[qNo].correctAnswer;
    return val ? String(val).toUpperCase().trim() : undefined;
  };

  // Initialize questions unless resuming from draft
  useEffect(() => {
    if (initialDraft?.answers && Object.keys(initialDraft.answers).length > 0) {
      if (mode === "mock") {
        setAnswers((prev) => {
          const updated = { ...prev };
          let changed = false;
          for (const k of Object.keys(updated)) {
            const numKey = Number(k);
            if (updated[numKey] && !updated[numKey].confidence) {
              updated[numKey] = { ...updated[numKey], confidence: "sure" };
              changed = true;
            }
          }
          return changed ? updated : prev;
        });
      }
      return;
    }
    const initial: Record<number, QuestionAnswer> = {};
    for (let i = 1; i <= paper.totalQuestions; i++) {
      const rawCorrect = paper.answerKey
        ? paper.answerKey[i] || paper.answerKey[String(i)]
        : undefined;
      const correct = rawCorrect
        ? String(rawCorrect).toUpperCase().trim()
        : undefined;
      initial[i] = {
        questionNo: i,
        selected: null,
        correctAnswer: correct,
        isCorrect: null,
        flagged: false,
        confidence: mode === "mock" ? "sure" : undefined,
        note: "",
        timeSpentSeconds: 0,
        changesCount: 0,
        answerHistory: [],
      };
    }
    setAnswers(initial);
  }, [paper, initialDraft, mode]);

  // Robust answer key & explanation hydration effect: fetches/parses if empty, attaches to answers & sessionExplanations
  useEffect(() => {
    const ensureAnswerKey = async () => {
      let activeKey = paper.answerKey;
      if (paper.answerKeyText) {
        const detailed = parseAnswerKeyDetailed(paper.answerKeyText);
        if (!activeKey || Object.keys(activeKey).length === 0) {
          activeKey = detailed.answers;
        }
        if (Object.keys(detailed.explanations).length > 0) {
          setSessionExplanations((prev) => ({
            ...detailed.explanations,
            ...prev,
          }));
        }
      } else if (paper.akUrl) {
        try {
          const res = await fetch(paper.akUrl);
          if (res.ok) {
            const text = await res.text();
            const detailed = parseAnswerKeyDetailed(text);
            if (!activeKey || Object.keys(activeKey).length === 0) {
              activeKey = detailed.answers;
            }
            if (Object.keys(detailed.explanations).length > 0) {
              setSessionExplanations((prev) => ({
                ...detailed.explanations,
                ...prev,
              }));
            }
          }
        } catch (e) {
          console.warn("Could not fetch answer key:", e);
        }
      }

      if (activeKey && Object.keys(activeKey).length > 0) {
        setAnswers((prev) => {
          const next = { ...prev };
          let changed = false;
          for (let q = 1; q <= paper.totalQuestions; q++) {
            const raw = activeKey[q] || activeKey[String(q)];
            const correct = raw ? String(raw).toUpperCase().trim() : undefined;
            if (correct && (!next[q] || next[q].correctAnswer !== correct)) {
              changed = true;
              const selected = next[q]?.selected || null;
              next[q] = {
                questionNo: q,
                selected,
                flagged: false,
                note: "",
                timeSpentSeconds: 0,
                changesCount: 0,
                answerHistory: [],
                ...next[q],
                correctAnswer: correct,
                isCorrect: selected
                  ? selected.toUpperCase().trim() === correct
                  : null,
              };
            }
          }
          return changed ? next : prev;
        });
      }
    };

    ensureAnswerKey();
  }, [paper]);

  // Continuous timer + Mock question time tracker (freezes when paused)
  useEffect(() => {
    if (isScanUploadPhase || isPaused) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);

      // In Mock Mode ONLY: track time taken on active question or idle/overview time
      if (mode === "mock" && !isSubjective) {
        if (currentQuestion !== null) {
          setQTimeSpent((prev) => ({
            ...prev,
            [currentQuestion]: (prev[currentQuestion] || 0) + 1,
          }));
        } else {
          setIdleTimeSeconds((prev) => prev + 1);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, currentQuestion, isScanUploadPhase, isPaused, isSubjective]);

  // In Mock Mode, auto-finish if strict time runs out
  useEffect(() => {
    if (
      mode === "mock" &&
      totalTimeSeconds > 0 &&
      remainingSeconds <= 0 &&
      !isScanUploadPhase &&
      !isPaused
    ) {
      if (isSubjective) {
        setIsScanUploadPhase(true);
      } else {
        handleFinishExam();
      }
    }
  }, [
    remainingSeconds,
    mode,
    totalTimeSeconds,
    isScanUploadPhase,
    isPaused,
    isSubjective,
  ]);

  // Answer selection handler (Objective)
  const handleSelectOption = (qNo: number, option: string) => {
    const isDeselecting = answers[qNo]?.selected === option;
    setAnswers((prev) => {
      const current = prev[qNo] || {
        questionNo: qNo,
        selected: null,
        confidence: mode === "mock" ? "sure" : undefined,
        changesCount: 0,
        answerHistory: [],
      };

      const prevSelected = current.selected;
      const isUnselecting = isDeselecting;
      const newSelected = isUnselecting ? null : option;

      const rawCorrect = getCorrectAnswerForQ(qNo);
      const correct = rawCorrect ? rawCorrect.toUpperCase().trim() : undefined;

      let isCorrect: boolean | null = null;
      if (newSelected && correct) {
        isCorrect = newSelected.toUpperCase().trim() === correct;
      }

      // Track response alteration ONLY in Mock mode
      let changesCount = current.changesCount || 0;
      let answerHistory = current.answerHistory
        ? [...current.answerHistory]
        : [];

      if (mode === "mock") {
        if (prevSelected && newSelected && prevSelected !== newSelected) {
          changesCount += 1;
          answerHistory.push(newSelected);
        } else if (!prevSelected && newSelected) {
          answerHistory.push(newSelected);
        }
      }

      return {
        ...prev,
        [qNo]: {
          ...current,
          selected: newSelected,
          correctAnswer: correct,
          isCorrect,
          confidence:
            current.confidence ?? (mode === "mock" ? "sure" : undefined),
          changesCount,
          answerHistory,
        },
      };
    });

    // Auto-advance to next question upon selecting an option ONLY in Mock mode
    if (mode === "mock" && !isDeselecting && qNo < paper.totalQuestions) {
      setCurrentQuestion(qNo + 1);
    }
  };

  const handleSetConfidence = (qNo: number, confidence: ConfidenceLevel) => {
    setAnswers((prev) => {
      const current = prev[qNo] || {
        questionNo: qNo,
        selected: null,
        confidence: mode === "mock" ? "sure" : undefined,
      };
      const activeConf =
        current.confidence ?? (mode === "mock" ? "sure" : undefined);
      return {
        ...prev,
        [qNo]: {
          ...current,
          confidence:
            activeConf === confidence
              ? mode === "mock"
                ? "sure"
                : undefined
              : confidence,
        },
      };
    });
  };

  const handleClearSelection = (qNo: number) => {
    setAnswers((prev) => {
      const current = prev[qNo] || {
        questionNo: qNo,
        selected: null,
        confidence: mode === "mock" ? "sure" : undefined,
      };
      return {
        ...prev,
        [qNo]: {
          ...current,
          selected: null,
          isCorrect: null,
          confidence:
            current.confidence ?? (mode === "mock" ? "sure" : undefined),
        },
      };
    });
  };

  // Flag toggle handler
  const handleToggleFlag = (qNo: number) => {
    setAnswers((prev) => {
      const current = prev[qNo] || { questionNo: qNo, selected: null };
      return {
        ...prev,
        [qNo]: {
          ...current,
          flagged: !current.flagged,
        },
      };
    });
  };

  // Note change handler
  const handleUpdateNote = (qNo: number, noteText: string) => {
    setAnswers((prev) => {
      const current = prev[qNo] || { questionNo: qNo, selected: null };
      return {
        ...prev,
        [qNo]: {
          ...current,
          note: noteText,
        },
      };
    });
  };

  // Real-time automatic persistence to localStorage & server
  const persistSessionDraft = useCallback(
    (overrides?: Partial<ActiveSessionDraft>) => {
      const draft: ActiveSessionDraft = {
        paperId: paper.id,
        paperLabel: paper.label,
        mode,
        currentQuestion,
        answers,
        elapsedSeconds,
        qTimeSpent,
        idleTimeSeconds,
        pausedAt: isPaused ? new Date().toISOString() : "",
        isExited: false,
        ...overrides,
      };
      saveActiveDraft(draft);
    },
    [
      paper.id,
      paper.label,
      mode,
      currentQuestion,
      answers,
      elapsedSeconds,
      qTimeSpent,
      idleTimeSeconds,
      isPaused,
    ],
  );

  // Save immediately whenever user answers, flags, notes, or switches questions
  useEffect(() => {
    persistSessionDraft();
  }, [answers, currentQuestion, persistSessionDraft]);

  // Periodic background sync (every 3 seconds) for continuous timer and active question timings
  useEffect(() => {
    if (isScanUploadPhase) return;
    const interval = setInterval(() => {
      persistSessionDraft();
    }, 3000);
    return () => clearInterval(interval);
  }, [persistSessionDraft, isScanUploadPhase]);

  // Protect against accidental refresh, browser close, or tab exit
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      persistSessionDraft();
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [persistSessionDraft]);

  // Save draft session and exit to resume later
  const handleSaveDraftAndExit = () => {
    persistSessionDraft({
      isExited: true,
      pausedAt: new Date().toISOString(),
    });
    onExit();
  };

  // Subjective Question status toggling (Attempted, Review, Unattempted)
  const handleToggleSubjectiveAttempt = (qNo: number) => {
    setAnswers((prev) => {
      const current = prev[qNo] || { questionNo: qNo, selected: null };
      const newSelected = current.selected === "attempted" ? null : "attempted";
      return {
        ...prev,
        [qNo]: {
          ...current,
          selected: newSelected,
        },
      };
    });
  };

  const handleClearSubjectiveStatus = (qNo: number) => {
    setAnswers((prev) => ({
      ...prev,
      [qNo]: {
        ...(prev[qNo] || { questionNo: qNo }),
        selected: null,
        flagged: false,
      },
    }));
  };

  // Upload complete exam handwritten answer booklet (Single PDF for entire mock)
  const handleUploadFullBooklet = async (file: File) => {
    setIsUploadingScan(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-submission", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        setFullBookletUrl(data.url);
        setFullBookletName(data.fileName);
      }
    } catch (err) {
      console.error("Failed to upload full booklet:", err);
    } finally {
      setIsUploadingScan(false);
    }
  };

  // Computed counts & status
  const isQuestionAnswered = (q?: QuestionAnswer) => {
    if (!q) return false;
    if (!isSubjective) return q.selected !== null;
    return q.selected === "attempted";
  };

  const allAnswerValues = Object.values(answers);
  const attemptedCount = allAnswerValues.filter((a) =>
    isQuestionAnswered(a),
  ).length;
  const flaggedCount = allAnswerValues.filter((a) => a.flagged).length;
  const unattemptedCount = paper.totalQuestions - attemptedCount;
  const alteredCount = allAnswerValues.filter(
    (a) => (a.changesCount || 0) > 0,
  ).length;

  // Filtered question numbers for the grid
  const filteredQuestionNumbers = Array.from(
    { length: paper.totalQuestions },
    (_, i) => i + 1,
  ).filter((qNo) => {
    const a = answers[qNo];
    if (filterMode === "attempted") return isQuestionAnswered(a);
    if (filterMode === "unattempted") return !isQuestionAnswered(a);
    if (filterMode === "flagged") return a?.flagged;
    return true;
  });

  // Finish exam calculations
  const handleFinishExam = (submissionPdfBlobUrl?: string) => {
    clearActiveDraft();

    let correctCount = 0;
    let incorrectCount = 0;
    let alteredCount = 0;
    let alteredHarmCount = 0;
    let alteredBenefitCount = 0;

    let timeCorrectSum = 0;
    let timeIncorrectSum = 0;

    const finalAnswers: Record<number, QuestionAnswer> = {};

    for (let i = 1; i <= paper.totalQuestions; i++) {
      const a = answers[i] || { questionNo: i, selected: null };
      const rawCorrect = getCorrectAnswerForQ(i);
      const correctAns = rawCorrect
        ? rawCorrect.toUpperCase().trim()
        : undefined;
      const spentSecs = mode === "mock" ? qTimeSpent[i] || 0 : 0;

      let isCorrect: boolean | null = null;
      if (a.selected) {
        if (correctAns && a.selected.toUpperCase().trim() === correctAns) {
          correctCount++;
          isCorrect = true;
          timeCorrectSum += spentSecs;
        } else if (correctAns) {
          incorrectCount++;
          isCorrect = false;
          timeIncorrectSum += spentSecs;
        }
      }

      // Check alteration nuance in Mock mode
      if (mode === "mock" && a.changesCount && a.changesCount > 0) {
        alteredCount++;
        const history = a.answerHistory || [];
        if (history.length >= 2 && correctAns) {
          const initialChoice = history[0]?.toUpperCase().trim();
          const finalChoice = a.selected?.toUpperCase().trim();
          if (initialChoice === correctAns && finalChoice !== correctAns) {
            alteredHarmCount++;
          }
          if (initialChoice !== correctAns && finalChoice === correctAns) {
            alteredBenefitCount++;
          }
        }
      }

      finalAnswers[i] = {
        ...a,
        confidence: a.confidence ?? (mode === "mock" ? "sure" : undefined),
        correctAnswer: correctAns,
        explanation:
          sessionExplanations[i] || paper.explanations?.[i] || undefined,
        isCorrect,
        timeSpentSeconds: spentSecs,
      };
    }

    const calculatedScore = isSubjective
      ? 0
      : correctCount * paper.correctMarks -
        incorrectCount * paper.incorrectMarks;
    const maxScore = paper.totalMarks;
    const accuracyPct =
      attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;

    const activeQuestionSeconds = Math.max(0, elapsedSeconds - idleTimeSeconds);
    const avgTimePerQuestion =
      attemptedCount > 0
        ? Math.round(activeQuestionSeconds / attemptedCount)
        : 0;
    const avgTimeCorrect =
      correctCount > 0 ? Math.round(timeCorrectSum / correctCount) : 0;
    const avgTimeIncorrect =
      incorrectCount > 0 ? Math.round(timeIncorrectSum / incorrectCount) : 0;

    const attempt: Attempt = {
      id: `attempt_${Date.now()}`,
      paperId: paper.id,
      paperLabel: paper.label,
      category: paper.category,
      examType: paper.examType,
      mode,
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      finishedAt: new Date().toISOString(),
      totalQuestions: paper.totalQuestions,
      totalMarks: paper.totalMarks,
      correctMarks: paper.correctMarks,
      incorrectMarks: paper.incorrectMarks,
      timeMinutes: timeLimitMinutes,
      durationSeconds: elapsedSeconds,
      idleTimeSeconds,
      overtimeSeconds: isOvertime ? overtimeSeconds : 0,
      answered: attemptedCount,
      correct: correctCount,
      incorrect: incorrectCount,
      unattempted: unattemptedCount,
      score: Math.round(calculatedScore * 100) / 100,
      maxScore: Math.round(maxScore * 100) / 100,
      accuracyPct: Math.round(accuracyPct * 10) / 10,
      avgTimePerQuestion,
      avgTimeCorrect,
      avgTimeIncorrect,
      alteredCount,
      alteredHarmCount,
      alteredBenefitCount,
      answers: finalAnswers,
      userSubmissionPdfUrl: submissionPdfBlobUrl || fullBookletUrl,
    };

    onFinish(attempt);
  };

  const currentQObj = (currentQuestion !== null
    ? answers[currentQuestion]
    : undefined) || {
    questionNo: currentQuestion || 1,
    selected: null,
    flagged: false,
    confidence: mode === "mock" ? "sure" : undefined,
    note: "",
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Top Session Bar - Highly Responsive 2-Row Layout */}
      <div className="flex flex-col border-b border-slate-200 bg-white px-3 py-2 sm:px-4 sm:py-2.5 gap-2 shrink-0 shadow-2xs">
        {/* Top Row: Exit, Pause, Solution Key, Title & Mode, Continuous Timer, Finish Exam */}
        <div className="flex items-center justify-between gap-2">
          {/* Exit, Pause & Title */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              onClick={handleAttemptExit}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0 shadow-2xs cursor-pointer"
            >
              ← Exit
            </button>

            {/* Pause Feature Button */}
            <button
              onClick={() => setIsPaused(true)}
              title="Pause ongoing exam"
              className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors shrink-0 shadow-2xs"
            >
              <Pause className="h-3 w-3" />
              <span className="hidden xs:inline">Pause</span>
            </button>

            {/* Solution Key Shortcut Button */}
            {paper.exsUrl && (
              <button
                type="button"
                onClick={() => setSolutionModalOpen(true)}
                title="View Detailed Solution Key PDF"
                className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors shrink-0 shadow-2xs"
              >
                <BookOpen className="h-3 w-3" />
                <span className="hidden sm:inline">Solution Key</span>
              </button>
            )}

            <div className="min-w-0 ml-1">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[120px] xs:max-w-[170px] sm:max-w-xs md:max-w-md">
                {getPaperDisplayTitle(paper)}
              </h1>
              <span
                className={`block text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider truncate ${
                  isPractice ? "text-emerald-700" : "text-indigo-700"
                }`}
              >
                {isPractice
                  ? "Practice Mode"
                  : `Mock Exam (${timeLimitMinutes}m)`}
              </span>
            </div>
          </div>

          {/* Timer & Finish Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={
                isFullscreen
                  ? "Exit Fullscreen"
                  : "Enter Fullscreen (UPSC Exam Mode)"
              }
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-slate-600" />
                  <span className="hidden md:inline">Exit Full</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-slate-600" />
                  <span className="hidden md:inline">Fullscreen</span>
                </>
              )}
            </button>

            {/* Continuous Timer (HH:MM:SS format) */}
            <div
              className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1 font-mono text-xs sm:text-sm font-bold transition-all shadow-2xs ${
                isTimeCritical
                  ? "bg-rose-50 border-2 border-rose-500 text-rose-700 animate-pulse ring-4 ring-rose-500/10"
                  : "bg-slate-50 border border-slate-200 text-indigo-700"
              }`}
            >
              <Clock
                className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isTimeCritical ? "text-rose-600" : "text-indigo-600"} shrink-0`}
              />
              {isPractice ? (
                isOvertime ? (
                  <span className="text-rose-600">
                    +{formatTimeSeconds(overtimeSeconds)}
                  </span>
                ) : (
                  <span>{formatTimeSeconds(remainingSeconds)}</span>
                )
              ) : (
                <span>{formatTimeSeconds(remainingSeconds)}</span>
              )}
            </div>

            <button
              onClick={() => {
                if (isSubjective) {
                  if (mode === "mock") {
                    setIsScanUploadPhase(true);
                  } else {
                    handleFinishExam();
                  }
                } else {
                  setShowFinishConfirm(true);
                }
              }}
              className="rounded-lg bg-indigo-600 px-3 sm:px-4 py-1 sm:py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all shrink-0"
            >
              {isSubjective ? "Submit" : "Finish"}
            </button>
          </div>
        </div>

        {/* Second Row: Counters & Mobile/Tablet View Switcher */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
          {/* Status Counters */}
          <div className="flex items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs font-medium overflow-x-auto shrink-0">
            <div className="flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-800 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              <span>Att: {attemptedCount}</span>
            </div>

            <div className="flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-slate-700 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>Unatt: {unattemptedCount}</span>
            </div>

            <div className="flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-800 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Flag: {flaggedCount}</span>
            </div>
          </div>

          {/* Mobile/Tablet View Switcher (< lg) */}
          <div className="flex lg:hidden items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0 text-[11px]">
            <button
              onClick={() => setMobileTab("paper")}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                mobileTab === "paper"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Paper
            </button>
            <button
              onClick={() => setMobileTab("split")}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                mobileTab === "split"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Split
            </button>
            <button
              onClick={() => setMobileTab("omr")}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                mobileTab === "omr"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              OMR {currentQuestion !== null ? `(Q${currentQuestion})` : ""}
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row relative">
        {/* Left Side: Question Paper PDF Viewer */}
        <div
          className={`w-full lg:w-3/5 xl:w-2/3 border-r border-slate-200 bg-slate-100 flex flex-col ${
            mobileTab === "paper"
              ? "h-full flex-1"
              : mobileTab === "omr"
                ? "hidden lg:flex"
                : "h-1/2 lg:h-full"
          }`}
        >
          <PdfViewer
            url={paper.qpUrl}
            title={`${getPaperDisplayTitle(paper)} - Question Paper`}
            className="w-full flex-1 min-h-0"
          />

          {/* Quick-Answer Sticky Bar when viewing full-screen Paper on Mobile/Tablet */}
          {mobileTab === "paper" && (
            <div className="lg:hidden sticky bottom-0 z-30 flex items-center justify-between bg-white/95 backdrop-blur-md border-t border-slate-200 p-2 gap-2 shadow-lg shrink-0">
              {currentQuestion === null ? (
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] sm:text-xs text-slate-700 font-medium truncate">
                      📖 Instructions / Reading Buffer
                    </span>
                    <span className="text-[10px] font-mono text-indigo-700 shrink-0 font-bold">
                      ⏱ {formatTimeSeconds(idleTimeSeconds)}
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentQuestion(1)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs hover:bg-indigo-700 shrink-0"
                  >
                    <span>Start Q1</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={currentQuestion <= 1}
                      onClick={() =>
                        setCurrentQuestion((prev) =>
                          Math.max(1, (prev || 1) - 1),
                        )
                      }
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 shadow-2xs"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-900 px-1">
                      Q{currentQuestion}
                    </span>
                    <button
                      disabled={currentQuestion >= paper.totalQuestions}
                      onClick={() =>
                        setCurrentQuestion((prev) =>
                          Math.min(paper.totalQuestions, (prev || 1) + 1),
                        )
                      }
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 disabled:opacity-40 shadow-2xs"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Quick Options A, B, C, D */}
                  {!isSubjective ? (
                    <div className="grid grid-cols-4 gap-1 flex-1 max-w-[200px] xs:max-w-[240px]">
                      {["A", "B", "C", "D"].map((opt) => {
                        const isSelected =
                          currentQObj.selected?.toUpperCase() === opt;
                        const correctAns =
                          getCorrectAnswerForQ(currentQuestion);
                        const isRevealed = revealedAnswers[currentQuestion];
                        const isCorrectChoice =
                          correctAns && opt === correctAns;

                        let s =
                          "bg-white border-slate-200 text-slate-800 hover:border-slate-400";
                        if (isSelected)
                          s =
                            "bg-indigo-600 border-indigo-600 text-white font-bold shadow-xs";

                        // Practice mode live feedback: red for wrong, green for correct!
                        if (isPractice) {
                          if (currentQObj.selected && correctAns) {
                            if (isSelected) {
                              s = isCorrectChoice
                                ? "bg-emerald-600 border-emerald-600 text-white font-bold"
                                : "bg-rose-600 border-rose-600 text-white font-bold";
                            } else if (isCorrectChoice) {
                              s =
                                "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold ring-1 ring-emerald-500";
                            }
                          } else if (isRevealed && isCorrectChoice) {
                            s =
                              "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold ring-1 ring-emerald-500";
                          }
                        }
                        return (
                          <button
                            key={opt}
                            onClick={() =>
                              handleSelectOption(currentQuestion, opt)
                            }
                            className={`h-9 rounded-lg border text-xs font-bold flex items-center justify-center transition-all ${s}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[11px] text-indigo-700 font-medium truncate">
                      Mains question
                    </span>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleFlag(currentQuestion)}
                      className={`p-1.5 rounded-lg border text-xs ${
                        currentQObj.flagged
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      <Bookmark
                        className={`h-4 w-4 ${currentQObj.flagged ? "fill-amber-400" : ""}`}
                      />
                    </button>
                    <button
                      onClick={() => setMobileTab("omr")}
                      className="px-2 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold whitespace-nowrap"
                    >
                      OMR →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Question & OMR Section */}
        <div
          className={`w-full lg:w-2/5 xl:w-1/3 bg-slate-50/70 border-l border-slate-200 flex flex-col overflow-hidden ${
            mobileTab === "omr"
              ? "h-full flex-1"
              : mobileTab === "paper"
                ? "hidden lg:flex"
                : "h-1/2 lg:h-full"
          }`}
        >
          {/* Active Question Top Card */}
          <div className="border-b border-slate-200 p-3.5 sm:p-5 bg-white shrink-0 overflow-y-auto max-h-[50%] lg:max-h-none shadow-2xs">
            {currentQuestion === null ? (
              <div className="space-y-4 py-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-bold text-slate-900">
                      Instructions & Paper Overview
                    </span>
                  </div>
                  <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] sm:text-xs font-mono font-bold text-indigo-700">
                    ⏱ Buffer: {formatTimeSeconds(idleTimeSeconds)}
                  </span>
                </div>

                <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/60 p-3.5 sm:p-4 text-xs text-slate-700 space-y-2">
                  <p className="font-semibold text-slate-900">
                    📖 Reading instructions or scanning questions?
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                    Overall exam timer is active. Time spent before choosing a
                    question is recorded as{" "}
                    <strong>Instructions & Overview Time</strong>. Question 1
                    will{" "}
                    <span className="text-emerald-700 font-semibold">not</span>{" "}
                    be charged or inflated for this initial reading period.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Click <strong>Start Question 1</strong> or tap any question
                    number in the palette below when you are ready to begin
                    answering.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setCurrentQuestion(1)}
                    className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Start Solving (Question 1)</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-base sm:text-xl font-bold text-slate-900">
                      Question {currentQuestion}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      of {paper.totalQuestions}
                    </span>
                    {mode === "mock" && !isSubjective && (
                      <span className="rounded bg-slate-100 border border-slate-200 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-semibold text-indigo-700">
                        ⏱ {qTimeSpent[currentQuestion] || 0}s
                      </span>
                    )}

                    {/* Time-Trap Alert (>90s spent in Mock) */}
                    {mode === "mock" &&
                      !isSubjective &&
                      (qTimeSpent[currentQuestion] || 0) >= 90 && (
                        <span
                          className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800 animate-pulse"
                          title="Pacing Warning: Over 90s spent on this question. UPSC Prelims benchmark is 72s per question."
                        >
                          <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                          <span className="hidden xs:inline">Time-Trap</span>{" "}
                          &gt;90s
                        </span>
                      )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Solution Key Button in Header */}
                    {paper.exsUrl && (
                      <button
                        type="button"
                        onClick={() => setSolutionModalOpen(true)}
                        className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all shadow-2xs cursor-pointer active:scale-95"
                        title="View Official Solution Key / Booklet"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span>Solution Key</span>
                      </button>
                    )}

                    {/* Buffer Mode - prominent amber pill button */}
                    <button
                      type="button"
                      onClick={() => setCurrentQuestion(null)}
                      title="Switch to reading & overview buffer mode"
                      className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                      <Clock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                      <span>Buffer Mode</span>
                    </button>

                    {/* Flag for Review */}
                    <button
                      type="button"
                      onClick={() => handleToggleFlag(currentQuestion)}
                      title={
                        currentQObj.flagged
                          ? "Question is flagged for review"
                          : "Flag question for later review"
                      }
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border shadow-2xs cursor-pointer active:scale-95 ${
                        currentQObj.flagged
                          ? "bg-amber-500 border-amber-500 text-white shadow-xs ring-2 ring-amber-400/30"
                          : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/50"
                      }`}
                    >
                      <Bookmark
                        className={`h-3.5 w-3.5 shrink-0 ${
                          currentQObj.flagged
                            ? "fill-white text-white"
                            : "text-amber-600"
                        }`}
                      />
                      <span>{currentQObj.flagged ? "Flagged" : "Flag"}</span>
                    </button>

                    {/* Scratchpad Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowNoteBox(!showNoteBox)}
                      title="Open / close rough scratchpad for this question"
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border shadow-2xs cursor-pointer active:scale-95 ${
                        showNoteBox || currentQObj.note
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/30"
                          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
                      }`}
                    >
                      <Edit3
                        className={`h-3.5 w-3.5 shrink-0 ${
                          showNoteBox || currentQObj.note
                            ? "text-white"
                            : "text-indigo-600"
                        }`}
                      />
                      <span>Scratchpad</span>
                      {currentQObj.note && (
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            showNoteBox ? "bg-amber-300" : "bg-indigo-600"
                          }`}
                        />
                      )}
                    </button>

                    {/* Show Answer Toggle for Practice Mode */}
                    {isPractice &&
                      !isSubjective &&
                      getCorrectAnswerForQ(currentQuestion) && (
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedAnswers((prev) => ({
                              ...prev,
                              [currentQuestion]: !prev[currentQuestion],
                            }))
                          }
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all border shadow-2xs cursor-pointer active:scale-95 ${
                            revealedAnswers[currentQuestion]
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                              : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          <BookOpen className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {revealedAnswers[currentQuestion]
                              ? "Hide Answer"
                              : "See Right Answer"}
                          </span>
                        </button>
                      )}
                  </div>
                </div>

                {/* Certainty & 50:50 Elimination Tracker (Suggested Feature) */}
                {!isSubjective && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Elimination Certainty:
                    </span>
                    <div className="flex items-center gap-1">
                      {(["sure", "50-50", "guess"] as const).map((conf) => {
                        const isConfSelected =
                          (currentQObj.confidence ??
                            (mode === "mock" ? "sure" : undefined)) === conf;
                        return (
                          <button
                            key={conf}
                            type="button"
                            onClick={() =>
                              handleSetConfidence(currentQuestion, conf)
                            }
                            className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all border ${
                              isConfSelected
                                ? conf === "sure"
                                  ? "bg-emerald-100 border-emerald-400 text-emerald-800 font-bold shadow-2xs"
                                  : conf === "50-50"
                                    ? "bg-amber-100 border-amber-400 text-amber-800 font-bold shadow-2xs"
                                    : "bg-violet-100 border-violet-400 text-violet-800 font-bold shadow-2xs"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {conf === "sure"
                              ? "🎯 Sure"
                              : conf === "50-50"
                                ? "⚖️ 50:50"
                                : "🎲 Guess"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Answer Options A, B, C, D (for Objective) */}
                {!isSubjective ? (
                  <div className="mt-3.5 sm:mt-4 grid grid-cols-4 gap-2.5 sm:gap-3.5">
                    {["A", "B", "C", "D"].map((opt) => {
                      const isSelected =
                        currentQObj.selected?.toUpperCase() === opt;
                      const correctAns = getCorrectAnswerForQ(currentQuestion);
                      const isRevealed = revealedAnswers[currentQuestion];
                      const isCorrectChoice = correctAns && opt === correctAns;

                      let btnStyle =
                        "border-slate-300 bg-white text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 shadow-2xs";

                      if (isSelected) {
                        btnStyle =
                          "border-indigo-600 bg-indigo-600 text-white font-black ring-2 ring-indigo-500/30 shadow-md scale-[1.02]";
                      }

                      // Practice mode live feedback: selected wrong is RED, correct is GREEN!
                      if (isPractice) {
                        if (currentQObj.selected && correctAns) {
                          if (isSelected) {
                            if (isCorrectChoice) {
                              btnStyle =
                                "border-emerald-600 bg-emerald-600 text-white font-black ring-2 ring-emerald-500/30 shadow-md scale-[1.02]";
                            } else {
                              btnStyle =
                                "border-rose-600 bg-rose-600 text-white font-black ring-2 ring-rose-500/30 shadow-md scale-[1.02]";
                            }
                          } else if (isCorrectChoice) {
                            // Guide user to the correct choice with emerald highlight
                            btnStyle =
                              "border-2 border-emerald-500 bg-emerald-50 text-emerald-800 font-black ring-2 ring-emerald-500/20";
                          }
                        } else if (isRevealed && isCorrectChoice) {
                          btnStyle =
                            "border-2 border-emerald-500 bg-emerald-50 text-emerald-800 font-black ring-2 ring-emerald-500/30";
                        }
                      }

                      return (
                        <button
                          key={opt}
                          onClick={() =>
                            handleSelectOption(currentQuestion, opt)
                          }
                          className={`flex h-12 sm:h-14 items-center justify-center rounded-2xl border text-base sm:text-lg font-bold transition-all cursor-pointer active:scale-95 ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Dedicated Subjective Pen & Paper Question Marking */
                  <div className="mt-3 sm:mt-4 space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            Subjective Question {currentQuestion}
                            <span className="text-[10px] font-normal text-slate-500">
                              (Pen & Paper)
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Write your response on paper, then mark your
                            progress below:
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {currentQObj.selected === "attempted" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />{" "}
                              Written
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-medium text-slate-500">
                              Unattempted
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Status Buttons to flag Attempted, Review or Unattempted */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleSubjectiveAttempt(currentQuestion)
                          }
                          className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                            currentQObj.selected === "attempted"
                              ? "border-emerald-600 bg-emerald-600 text-white font-bold ring-2 ring-emerald-500/30 shadow-xs"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          {currentQObj.selected === "attempted"
                            ? "Written (Attempted)"
                            : "Mark as Written"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleFlag(currentQuestion)}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                            currentQObj.flagged
                              ? "border-amber-400 bg-amber-500 text-white font-bold ring-2 ring-amber-500/30"
                              : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50"
                          }`}
                        >
                          <Bookmark className="h-4 w-4 shrink-0" />
                          {currentQObj.flagged
                            ? "Flagged for Review"
                            : "Review Later"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleClearSubjectiveStatus(currentQuestion)
                          }
                          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          Clear Status
                        </button>
                      </div>
                    </div>

                    {/* In Mock Mode ONLY: Entire single booklet upload for future review */}
                    {mode === "mock" && (
                      <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-3.5 sm:p-4 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700 border border-violet-200 shrink-0">
                              <UploadCloud className="h-4 w-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-900">
                                Full Answer Booklet Copy
                              </h5>
                              <p className="text-[11px] text-slate-500">
                                Single upload for all answers (stored for future
                                review)
                              </p>
                            </div>
                          </div>

                          {fullBookletUrl && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />{" "}
                              Booklet Attached
                            </span>
                          )}
                        </div>

                        {fullBookletUrl ? (
                          <div className="rounded-xl border border-violet-200 bg-white p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-violet-600 shrink-0" />
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {fullBookletName || "Full_Answer_Booklet.pdf"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={fullBookletUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" /> View
                              </a>
                              <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs">
                                Replace
                                <input
                                  type="file"
                                  accept=".pdf"
                                  className="hidden"
                                  disabled={isUploadingScan}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleUploadFullBooklet(f);
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <label
                            className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-violet-300 hover:border-violet-500 bg-white p-3 text-center cursor-pointer transition-all ${isUploadingScan ? "opacity-60 pointer-events-none" : ""}`}
                          >
                            {isUploadingScan ? (
                              <div className="flex items-center gap-2 text-violet-700 text-xs font-semibold py-1">
                                <Loader2 className="h-4 w-4 animate-spin" />{" "}
                                Uploading scanned booklet...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
                                <FileUp className="h-4 w-4 text-violet-600" />
                                <span>
                                  Attach Complete Scanned Answer Booklet (PDF)
                                </span>
                              </div>
                            )}
                            <input
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              disabled={isUploadingScan}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadFullBooklet(f);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    )}

                    {/* In Practice Mode: Compare with Model Solution PDF */}
                    {isPractice && paper.exsUrl && (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-indigo-900 font-medium">
                          <BookOpen className="h-4 w-4 text-indigo-600 shrink-0" />
                          <span>Compare with Model Answer / Synopsis:</span>
                        </div>
                        <button
                          onClick={() => setSolutionModalOpen(true)}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition-all shrink-0"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          Solution Key
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Practice Mode Live Feedback Banner + Detailed Solution Key Link (Objective) */}
                {isPractice &&
                  !isSubjective &&
                  (currentQObj.selected || revealedAnswers[currentQuestion]) &&
                  getCorrectAnswerForQ(currentQuestion) &&
                  (() => {
                    const correctAns = getCorrectAnswerForQ(currentQuestion)!;
                    const hasSelected = !!currentQObj.selected;
                    const isCorrect =
                      hasSelected &&
                      currentQObj.selected!.toUpperCase().trim() === correctAns;

                    return (
                      <div
                        className={`mt-3 rounded-xl border p-3 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs animate-in fade-in ${
                          !hasSelected
                            ? "border-indigo-200 bg-indigo-50/80 text-indigo-900"
                            : isCorrect
                              ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                              : "border-rose-200 bg-rose-50/80 text-rose-900"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {!hasSelected ? (
                            <BookOpen className="h-4 w-4 text-indigo-600 shrink-0" />
                          ) : isCorrect ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                          )}
                          <span className="font-semibold">
                            {!hasSelected
                              ? `Answer Key: Right answer is Option ${correctAns}`
                              : isCorrect
                                ? "✓ Correct Answer! Well done."
                                : `✗ Incorrect • Right answer is Option ${correctAns}`}
                          </span>
                        </div>

                        {paper.exsUrl && (
                          <button
                            onClick={() => setSolutionModalOpen(true)}
                            className="flex items-center gap-1 rounded-lg bg-white border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 transition-all shadow-2xs"
                          >
                            <BookOpen className="h-3 w-3 text-indigo-600" />
                            View Solution Key
                          </button>
                        )}

                        {(() => {
                          const expl =
                            sessionExplanations[currentQuestion] ||
                            paper.explanations?.[currentQuestion];
                          if (!expl) return null;
                          return (
                            <div className="w-full mt-2.5 pt-2.5 border-t border-slate-200/80 text-slate-800 bg-white/95 rounded-xl p-3 text-xs leading-relaxed font-normal whitespace-pre-wrap shadow-2xs border border-indigo-100/80 animate-in fade-in slide-in-from-top-1">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1.5 text-xs">
                                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-800 font-bold text-[11px]">
                                  💡
                                </span>
                                <span>Explanation & Key Concepts:</span>
                              </div>
                              <p className="text-slate-700 pl-0.5 leading-relaxed text-xs">
                                {expl}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                {/* Optional Scratchpad - Resizable Multi-line Textarea */}
                {showNoteBox && (
                  <div className="mt-3.5 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 sm:p-4 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Edit3 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          Rough Scratchpad for Question {currentQuestion}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        Expandable notes
                      </span>
                    </div>
                    <textarea
                      value={currentQObj.note || ""}
                      onChange={(e) =>
                        handleUpdateNote(currentQuestion, e.target.value)
                      }
                      placeholder="Jot down keywords, elimination notes, rough outline or formulas while solving..."
                      rows={5}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y min-h-[110px] font-sans transition-all shadow-inner"
                    />
                  </div>
                )}

                {/* Navigation Bottom Controls with Highlighted Clear Selection */}
                <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    disabled={currentQuestion <= 1}
                    onClick={() =>
                      setCurrentQuestion((prev) => Math.max(1, (prev || 1) - 1))
                    }
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer active:scale-95"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </button>

                  {!isSubjective && (
                    <button
                      type="button"
                      onClick={() => handleClearSelection(currentQuestion)}
                      disabled={!currentQObj.selected}
                      className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-2xs active:scale-95 ${
                        currentQObj.selected
                          ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 cursor-pointer shadow-xs"
                          : "border-slate-200 bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed"
                      }`}
                      title="Clear option selection for this question"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                      <span>Clear Selection</span>
                    </button>
                  )}

                  <button
                    disabled={currentQuestion >= paper.totalQuestions}
                    onClick={() =>
                      setCurrentQuestion((prev) =>
                        Math.min(paper.totalQuestions, (prev || 1) + 1),
                      )
                    }
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-2xs"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Question Palette Section - Responsive Grid with Correct Red/Green State in Practice */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs shrink-0">
                  Question Palette
                </span>
                <span className="text-[11px] text-slate-500 sm:hidden">
                  {filteredQuestionNumbers.length} Qs
                </span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 overflow-x-auto max-w-full">
                {(["all", "attempted", "unattempted", "flagged"] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilterMode(tab)}
                      className={`rounded-md px-2 py-0.5 capitalize transition-all text-[11px] shrink-0 ${
                        filterMode === tab
                          ? "bg-indigo-600 text-white font-semibold shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tab}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Grid buttons fitting any mobile width */}
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1.5 sm:gap-2">
              {filteredQuestionNumbers.map((qNo) => {
                const q = answers[qNo];
                const isCurrent =
                  currentQuestion !== null && qNo === currentQuestion;
                const isAnswered = isQuestionAnswered(q);
                const isFlagged = q?.flagged;

                let badgeColor =
                  "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-2xs";

                if (isAnswered) {
                  // In Practice mode: wrong answers are shown in RED, correct in GREEN!
                  if (isPractice && !isSubjective) {
                    if (q?.isCorrect === false) {
                      badgeColor =
                        "bg-rose-600 text-white border-rose-600 font-semibold shadow-2xs";
                    } else if (q?.isCorrect === true) {
                      badgeColor =
                        "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs";
                    } else {
                      badgeColor =
                        "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs";
                    }
                  } else {
                    badgeColor =
                      "bg-indigo-600 text-white border-indigo-600 font-semibold shadow-2xs";
                  }
                }

                if (isFlagged) {
                  badgeColor =
                    "bg-amber-100 text-amber-900 border-amber-300 font-semibold shadow-2xs";
                }

                if (isCurrent) {
                  badgeColor +=
                    " ring-2 ring-indigo-600 border-indigo-600 scale-105 font-bold";
                }

                return (
                  <button
                    key={qNo}
                    onClick={() =>
                      setCurrentQuestion(currentQuestion === qNo ? null : qNo)
                    }
                    className={`relative flex h-9 sm:h-10 items-center justify-center rounded-xl border text-xs transition-all ${badgeColor}`}
                  >
                    <span>{qNo}</span>
                    {q?.note && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-indigo-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Exam Paused Overlay Modal */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <Pause className="h-7 w-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Exam Paused</h2>
              <p className="text-xs text-slate-500 mt-1">
                Emergency or quick break? Timer is frozen and your answers are
                saved.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs border border-slate-200">
              <div>
                <span className="block text-slate-500 text-[11px]">
                  Progress
                </span>
                <span className="font-bold text-slate-800">
                  {currentQuestion !== null
                    ? `Q${currentQuestion}`
                    : "Overview"}{" "}
                  of {paper.totalQuestions}
                </span>
              </div>
              <div>
                <span className="block text-slate-500 text-[11px]">
                  Time Remaining
                </span>
                <span className="font-bold text-indigo-700 font-mono">
                  {formatTimeSeconds(remainingSeconds)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => setIsPaused(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all"
              >
                <Play className="h-4 w-4 fill-current" /> Resume Exam
              </button>

              <button
                onClick={handleSaveDraftAndExit}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
              >
                <Save className="h-3.5 w-3.5" /> Save & Exit to Resume Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Solution Modal */}
      <DetailedSolutionModal
        isOpen={solutionModalOpen}
        onClose={() => setSolutionModalOpen(false)}
        pdfUrl={paper.exsUrl}
        paperTitle={paper.label}
      />

      {/* Objective Exam Assessment & Submission Review Screen */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm text-slate-800 flex flex-col font-sans animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6 shadow-2xs">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setShowFinishConfirm(false)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" /> Return to Exam
                </button>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    Exam Assessment & Submission Review
                  </h2>
                  <p className="text-xs text-slate-500 truncate">
                    {getPaperDisplayTitle(paper)} • {paper.year} •{" "}
                    {paper.category.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 border border-slate-200 text-xs text-slate-700 font-mono">
                  <Clock className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Time: {formatTimeSeconds(elapsedSeconds)}</span>
                </div>
                <button
                  onClick={() => {
                    setShowFinishConfirm(false);
                    handleFinishExam();
                  }}
                  className="rounded-xl bg-indigo-600 px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                  <span>Finalize & Submit Exam</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Assessment Body */}
          <div className="flex-1 bg-slate-50/60 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* KPI Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-2xs">
                  <div className="text-xs text-emerald-800 font-semibold">
                    Attempted
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                    {attemptedCount}
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      / {paper.totalQuestions}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">
                    {Math.round(
                      (attemptedCount / (paper.totalQuestions || 1)) * 100,
                    )}
                    % answered
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="text-xs text-slate-600 font-semibold">
                    Skipped
                  </div>
                  <div className="text-2xl font-extrabold text-slate-700 mt-1">
                    {unattemptedCount}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    0 penalty incurred
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs">
                  <div className="text-xs text-amber-800 font-semibold">
                    Flagged
                  </div>
                  <div className="text-2xl font-extrabold text-amber-700 mt-1">
                    {flaggedCount}
                  </div>
                  <div className="text-[11px] text-amber-600 mt-0.5">
                    Marked for review
                  </div>
                </div>

                <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 shadow-2xs">
                  <div className="text-xs text-violet-800 font-semibold">
                    Alterations
                  </div>
                  <div className="text-2xl font-extrabold text-violet-700 mt-1">
                    {alteredCount}
                  </div>
                  <div className="text-[11px] text-violet-600 mt-0.5">
                    Option changes
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="text-xs text-slate-600 font-semibold">
                    Time Elapsed
                  </div>
                  <div className="text-2xl font-extrabold text-indigo-700 font-mono mt-1">
                    {formatTimeSeconds(elapsedSeconds)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {isOvertime
                      ? `Overtime +${formatTimeSeconds(overtimeSeconds)}`
                      : `${timeLimitMinutes}m limit`}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="text-xs text-slate-600 font-semibold">
                    Average Pace
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                    {attemptedCount > 0
                      ? Math.round(elapsedSeconds / attemptedCount)
                      : 0}
                    s
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    per attempted Q
                  </div>
                </div>
              </div>

              {/* Question Response Palette Grid */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Question Response Palette (Interactive)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Click any question badge below to return to that question
                      in the paper.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded bg-emerald-100 border border-emerald-300 text-[10px] font-bold text-emerald-700 flex items-center justify-center">
                        A
                      </span>
                      <span className="text-slate-600">Attempted</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-700 flex items-center justify-center">
                        ⚑
                      </span>
                      <span className="text-slate-600">Flagged</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-500 flex items-center justify-center">
                        —
                      </span>
                      <span className="text-slate-600">Skipped</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                  {Array.from(
                    { length: paper.totalQuestions },
                    (_, i) => i + 1,
                  ).map((qNo) => {
                    const qObj = answers[qNo];
                    const isAtt = !!qObj?.selected;
                    const isFlag = !!qObj?.flagged;

                    return (
                      <button
                        key={qNo}
                        onClick={() => {
                          setShowFinishConfirm(false);
                          setCurrentQuestion(qNo);
                        }}
                        className={`flex flex-col items-center justify-center rounded-xl p-2 border transition-all text-center shadow-2xs ${
                          isFlag
                            ? "border-amber-300 bg-amber-50/70 text-amber-900 hover:border-amber-400"
                            : isAtt
                              ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 hover:border-emerald-400"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <span className="text-[11px] font-mono text-slate-500">
                          Q{qNo}
                        </span>
                        <span className="text-xs font-bold mt-0.5">
                          {isAtt ? qObj.selected : "—"}
                        </span>
                        {isFlag && (
                          <span className="text-[9px] text-amber-700 font-semibold mt-0.5">
                            ⚑ review
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Evaluation Policy & Finalize Confirmation */}
              <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-white to-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600 shrink-0">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Ready for Official Evaluation?
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Your answers will be evaluated against the answer key.
                      Correct answers: +{paper.correctMarks}m, Incorrect: -
                      {paper.incorrectMarks}m. Full scorecard, pace nuances, and
                      explanations will be shown next.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setShowFinishConfirm(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    Return to Exam
                  </button>
                  <button
                    onClick={() => {
                      setShowFinishConfirm(false);
                      handleFinishExam();
                    }}
                    className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all"
                  >
                    Confirm & Finalize
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subjective Mains Scan & Upload Phase */}
      {isScanUploadPhase && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm text-slate-800 flex flex-col font-sans animate-in fade-in duration-200">
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6 shadow-2xs">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <button
                onClick={() => setIsScanUploadPhase(false)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Session
              </button>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Mains Answer Booklet Submission
              </h2>
            </div>
          </div>

          <div className="flex-1 bg-slate-50/60 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-100 p-2.5 text-violet-600 shrink-0">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Upload Handwritten Answer Copy
                    </h3>
                    <p className="text-xs text-slate-500">
                      Scan your written answer booklet and upload PDF copy
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <p>
                    ⏱ Exam writing time concluded:{" "}
                    <strong>{formatTimeSeconds(elapsedSeconds)}</strong>
                  </p>
                  <p>
                    You have grace buffer to scan your handwritten pages and
                    attach your submission copy.
                  </p>
                </div>

                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50/20 transition-all">
                  <FileUp className="h-10 w-10 text-violet-600 mb-2" />
                  <span className="text-sm font-bold text-slate-900">
                    {userSubmissionFile
                      ? userSubmissionFile.name
                      : "Choose Scanned Answer Copy (PDF)"}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    {userSubmissionFile
                      ? `${(userSubmissionFile.size / 1024 / 1024).toFixed(2)} MB`
                      : "Drop PDF here or browse"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) =>
                      setUserSubmissionFile(e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </label>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setIsScanUploadPhase(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Back to Session
                  </button>
                  <button
                    onClick={() => {
                      const blobUrl = userSubmissionFile
                        ? URL.createObjectURL(userSubmissionFile)
                        : undefined;
                      handleFinishExam(blobUrl);
                    }}
                    className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs"
                  >
                    {userSubmissionFile
                      ? "Save Copy & Finish"
                      : "Skip & Finish"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal for Ongoing Mock Exam */}
      <ConfirmationModal
        isOpen={showExitConfirm}
        title="Exit Mock Exam?"
        message="Are you sure you want to exit? Your exam is currently ongoing. Exiting midway will not count this as an attempt, and unfinished progress will be discarded."
        confirmText="Exit Exam"
        cancelText="Resume Test"
        variant="warning"
        onConfirm={handleConfirmExit}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
}

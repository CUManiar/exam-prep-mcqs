'use client';

import React, { useState, useEffect } from 'react';
import { QuestionPaper, Attempt, QuestionAnswer, ActiveSessionDraft } from '../lib/types';
import { formatTimeSeconds } from '../lib/defaults';
import { saveActiveDraft, clearActiveDraft } from '../lib/storage';
import { DetailedSolutionModal } from './DetailedSolutionModal';
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
  Save 
} from 'lucide-react';

interface ExamSessionViewProps {
  paper: QuestionPaper;
  mode: 'practice' | 'mock';
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
  const [currentQuestion, setCurrentQuestion] = useState<number>(initialDraft?.currentQuestion || 1);
  const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>(initialDraft?.answers || {});
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(initialDraft?.elapsedSeconds || 0);
  const [qTimeSpent, setQTimeSpent] = useState<Record<number, number>>(initialDraft?.qTimeSpent || {});
  const [filterMode, setFilterMode] = useState<'all' | 'attempted' | 'unattempted' | 'flagged'>('all');
  const [showNoteBox, setShowNoteBox] = useState<boolean>(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState<boolean>(false);
  const [solutionModalOpen, setSolutionModalOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'paper' | 'split' | 'omr'>('split');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Subjective (Mains) handwritten scan & upload state
  const [isScanUploadPhase, setIsScanUploadPhase] = useState<boolean>(false);
  const [userSubmissionFile, setUserSubmissionFile] = useState<File | null>(null);
  const [isUploadingScan, setIsUploadingScan] = useState<boolean>(false);
  const [fullBookletUrl, setFullBookletUrl] = useState<string | undefined>(undefined);
  const [fullBookletName, setFullBookletName] = useState<string | undefined>(undefined);

  const totalTimeSeconds = paper.timeMinutes * 60;
  const isPractice = mode === 'practice';
  const isSubjective = paper.examType === 'subjective';

  // In Practice mode, user can surpass time limit, tracking extra time
  const isOvertime = isPractice && elapsedSeconds > totalTimeSeconds;
  const overtimeSeconds = isOvertime ? elapsedSeconds - totalTimeSeconds : 0;
  const remainingSeconds = Math.max(0, totalTimeSeconds - elapsedSeconds);
  
  // 10% remaining check (for mock countdown, or practice when approaching limit or exceeding)
  const isTimeCritical = isOvertime || (totalTimeSeconds > 0 && remainingSeconds <= (totalTimeSeconds * 0.10));

  // Initialize questions unless resuming from draft
  useEffect(() => {
    if (initialDraft?.answers && Object.keys(initialDraft.answers).length > 0) {
      return;
    }
    const initial: Record<number, QuestionAnswer> = {};
    for (let i = 1; i <= paper.totalQuestions; i++) {
      initial[i] = {
        questionNo: i,
        selected: null,
        correctAnswer: paper.answerKey[i] || undefined,
        isCorrect: null,
        flagged: false,
        note: '',
        timeSpentSeconds: 0,
        changesCount: 0,
        answerHistory: [],
      };
    }
    setAnswers(initial);
  }, [paper, initialDraft]);

  // Continuous timer + Mock question time tracker (freezes when paused)
  useEffect(() => {
    if (isScanUploadPhase || isPaused) return;

    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);

      // In Mock Mode ONLY: track time taken on active question
      if (mode === 'mock' && !isSubjective) {
        setQTimeSpent(prev => ({
          ...prev,
          [currentQuestion]: (prev[currentQuestion] || 0) + 1,
        }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, currentQuestion, isScanUploadPhase, isPaused, isSubjective]);

  // In Mock Mode, auto-finish if strict time runs out
  useEffect(() => {
    if (mode === 'mock' && totalTimeSeconds > 0 && remainingSeconds <= 0 && !isScanUploadPhase && !isPaused) {
      if (isSubjective) {
        setIsScanUploadPhase(true);
      } else {
        handleFinishExam();
      }
    }
  }, [remainingSeconds, mode, totalTimeSeconds, isScanUploadPhase, isPaused, isSubjective]);

  // Answer selection handler (Objective)
  const handleSelectOption = (qNo: number, option: string) => {
    setAnswers(prev => {
      const current = prev[qNo] || { 
        questionNo: qNo, 
        selected: null, 
        changesCount: 0, 
        answerHistory: [] 
      };

      const prevSelected = current.selected;
      const isUnselecting = prevSelected === option;
      const newSelected = isUnselecting ? null : option;

      const correct = paper.answerKey[qNo];
      let isCorrect: boolean | null = null;
      if (newSelected && correct) {
        isCorrect = newSelected === correct;
      }

      // Track response alteration ONLY in Mock mode
      let changesCount = current.changesCount || 0;
      let answerHistory = current.answerHistory ? [...current.answerHistory] : [];

      if (mode === 'mock') {
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
          changesCount,
          answerHistory,
        },
      };
    });
  };

  const handleClearSelection = (qNo: number) => {
    setAnswers(prev => {
      const current = prev[qNo] || { questionNo: qNo, selected: null };
      return {
        ...prev,
        [qNo]: {
          ...current,
          selected: null,
          isCorrect: null,
        },
      };
    });
  };

  // Flag toggle handler
  const handleToggleFlag = (qNo: number) => {
    setAnswers(prev => {
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
    setAnswers(prev => {
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

  // Save draft session and exit to resume later
  const handleSaveDraftAndExit = () => {
    const draft: ActiveSessionDraft = {
      paperId: paper.id,
      paperLabel: paper.label,
      mode,
      currentQuestion,
      answers,
      elapsedSeconds,
      qTimeSpent,
      pausedAt: new Date().toISOString(),
    };
    saveActiveDraft(draft);
    onExit();
  };

  // Upload scanned handwritten answer for a specific question
  const handleUploadQuestionScan = async (qNo: number, file: File) => {
    setIsUploadingScan(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-submission', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        setAnswers(prev => ({
          ...prev,
          [qNo]: {
            ...(prev[qNo] || { questionNo: qNo, selected: null }),
            submissionFileUrl: data.url,
            submissionFileName: data.fileName,
          },
        }));
      }
    } catch (err) {
      console.error('Failed to upload question scan:', err);
    } finally {
      setIsUploadingScan(false);
    }
  };

  const handleRemoveQuestionScan = (qNo: number) => {
    setAnswers(prev => {
      const updated = { ...prev };
      if (updated[qNo]) {
        updated[qNo] = {
          ...updated[qNo],
          submissionFileUrl: undefined,
          submissionFileName: undefined,
        };
      }
      return updated;
    });
  };

  // Upload complete exam handwritten answer booklet
  const handleUploadFullBooklet = async (file: File) => {
    setIsUploadingScan(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-submission', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        setFullBookletUrl(data.url);
        setFullBookletName(data.fileName);
      }
    } catch (err) {
      console.error('Failed to upload full booklet:', err);
    } finally {
      setIsUploadingScan(false);
    }
  };

  // Computed counts & status
  const isQuestionAnswered = (q?: QuestionAnswer) => {
    if (!q) return false;
    if (!isSubjective) return q.selected !== null;
    return !!(q.submissionFileUrl || fullBookletUrl);
  };

  const allAnswerValues = Object.values(answers);
  const attemptedCount = allAnswerValues.filter(a => isQuestionAnswered(a)).length;
  const flaggedCount = allAnswerValues.filter(a => a.flagged).length;
  const unattemptedCount = paper.totalQuestions - attemptedCount;

  // Filtered question numbers for the grid
  const filteredQuestionNumbers = Array.from({ length: paper.totalQuestions }, (_, i) => i + 1).filter(qNo => {
    const a = answers[qNo];
    if (filterMode === 'attempted') return isQuestionAnswered(a);
    if (filterMode === 'unattempted') return !isQuestionAnswered(a);
    if (filterMode === 'flagged') return a?.flagged;
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
      const correctAns = paper.answerKey[i];
      const spentSecs = mode === 'mock' ? (qTimeSpent[i] || 0) : 0;

      let isCorrect: boolean | null = null;
      if (a.selected) {
        if (correctAns && a.selected === correctAns) {
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
      if (mode === 'mock' && a.changesCount && a.changesCount > 0) {
        alteredCount++;
        const history = a.answerHistory || [];
        if (history.length >= 2 && correctAns) {
          const initialChoice = history[0];
          const finalChoice = a.selected;
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
        correctAnswer: correctAns,
        isCorrect,
        timeSpentSeconds: spentSecs,
      };
    }

    const calculatedScore = isSubjective 
      ? 0 
      : (correctCount * paper.correctMarks) - (incorrectCount * paper.incorrectMarks);
    const maxScore = paper.totalMarks;
    const accuracyPct = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;

    const avgTimePerQuestion = attemptedCount > 0 
      ? Math.round((elapsedSeconds / attemptedCount)) 
      : 0;
    const avgTimeCorrect = correctCount > 0 
      ? Math.round(timeCorrectSum / correctCount) 
      : 0;
    const avgTimeIncorrect = incorrectCount > 0 
      ? Math.round(timeIncorrectSum / incorrectCount) 
      : 0;

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
      timeMinutes: paper.timeMinutes,
      durationSeconds: elapsedSeconds,
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

  const currentQObj = answers[currentQuestion] || {
    questionNo: currentQuestion,
    selected: null,
    flagged: false,
    note: '',
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Top Session Bar - Highly Responsive 2-Row Layout */}
      <div className="flex flex-col border-b border-slate-800 bg-slate-900/95 px-3 py-2 sm:px-4 sm:py-2.5 gap-2 shrink-0">
        
        {/* Top Row: Exit, Pause, Title & Mode, Continuous Timer, Finish Exam */}
        <div className="flex items-center justify-between gap-2">
          
          {/* Exit, Pause & Title */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              onClick={onExit}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors shrink-0"
            >
              ← Exit
            </button>

            {/* Pause Feature Button */}
            <button
              onClick={() => setIsPaused(true)}
              title="Pause ongoing exam"
              className="flex items-center gap-1 rounded-lg border border-amber-600/40 bg-amber-950/30 px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-900/40 transition-colors shrink-0"
            >
              <Pause className="h-3 w-3" />
              <span className="hidden xs:inline">Pause</span>
            </button>

            <div className="min-w-0 ml-1">
              <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px] xs:max-w-[170px] sm:max-w-xs md:max-w-md">
                {paper.label}
              </h1>
              <span className={`block text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider truncate ${
                isPractice ? 'text-emerald-400' : 'text-indigo-400'
              }`}>
                {isPractice ? 'Practice Mode' : `Mock Exam (${paper.timeMinutes}m)`}
              </span>
            </div>
          </div>

          {/* Timer & Finish Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Continuous Timer (HH:MM:SS format) */}
            <div className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1 font-mono text-xs sm:text-sm font-bold transition-all shadow-inner ${
              isTimeCritical 
                ? 'bg-rose-950/80 border-2 border-rose-500 text-rose-300 animate-pulse ring-4 ring-rose-500/20'
                : 'bg-slate-950 border border-slate-800 text-indigo-300'
            }`}>
              <Clock className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isTimeCritical ? 'text-rose-400' : 'text-indigo-400'} shrink-0`} />
              {isPractice ? (
                isOvertime ? (
                  <span className="text-rose-400">+{formatTimeSeconds(overtimeSeconds)}</span>
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
                  setIsScanUploadPhase(true);
                } else {
                  setShowFinishConfirm(true);
                }
              }}
              className="rounded-lg bg-indigo-600 px-3 sm:px-4 py-1 sm:py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all shrink-0"
            >
              {isSubjective ? 'Submit' : 'Finish'}
            </button>
          </div>
        </div>

        {/* Second Row: Counters & Mobile/Tablet View Switcher */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
          
          {/* Status Counters */}
          <div className="flex items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs font-medium overflow-x-auto shrink-0">
            <div className="flex items-center gap-1 rounded-md bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 text-emerald-300 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Att: {attemptedCount}</span>
            </div>

            <div className="flex items-center gap-1 rounded-md bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 text-slate-300 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>Unatt: {unattemptedCount}</span>
            </div>

            <div className="flex items-center gap-1 rounded-md bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 text-amber-300 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>Flag: {flaggedCount}</span>
            </div>
          </div>

          {/* Mobile/Tablet View Switcher (< lg) */}
          <div className="flex lg:hidden items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0 text-[11px]">
            <button
              onClick={() => setMobileTab('paper')}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                mobileTab === 'paper' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Paper
            </button>
            <button
              onClick={() => setMobileTab('split')}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                mobileTab === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => setMobileTab('omr')}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                mobileTab === 'omr' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              OMR (Q{currentQuestion})
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row relative">
        
        {/* Left Side: Question Paper PDF Viewer */}
        <div className={`w-full lg:w-3/5 xl:w-2/3 border-r border-slate-800 bg-slate-900 flex flex-col ${
          mobileTab === 'paper' 
            ? 'h-full flex-1' 
            : mobileTab === 'omr' 
              ? 'hidden lg:flex' 
              : 'h-1/2 lg:h-full'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-400 shrink-0">
            <span>Question Paper Reader</span>
            <div className="flex items-center gap-3">
              <a
                href={paper.qpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open PDF in new tab
              </a>
            </div>
          </div>
          <iframe
            src={paper.qpUrl}
            title="Question Paper PDF"
            className="w-full flex-1 border-0 bg-slate-950"
          />

          {/* Quick-Answer Sticky Bar when viewing full-screen Paper on Mobile/Tablet */}
          {mobileTab === 'paper' && (
            <div className="lg:hidden sticky bottom-0 z-30 flex items-center justify-between bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-2 gap-2 shadow-2xl shrink-0">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  disabled={currentQuestion <= 1}
                  onClick={() => setCurrentQuestion(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-white px-1">
                  Q{currentQuestion}
                </span>
                <button
                  disabled={currentQuestion >= paper.totalQuestions}
                  onClick={() => setCurrentQuestion(prev => Math.min(paper.totalQuestions, prev + 1))}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Quick Options A, B, C, D */}
              {!isSubjective ? (
                <div className="grid grid-cols-4 gap-1 flex-1 max-w-[200px] xs:max-w-[240px]">
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const isSelected = currentQObj.selected === opt;
                    let s = 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700';
                    if (isSelected) s = 'bg-indigo-600 border-indigo-500 text-white font-bold ring-2 ring-indigo-500/40';

                    // Practice mode live feedback: red for wrong, green for correct!
                    if (isPractice && currentQObj.selected && currentQObj.correctAnswer) {
                      if (isSelected) {
                        s = opt === currentQObj.correctAnswer
                          ? 'bg-emerald-600 border-emerald-500 text-white font-bold'
                          : 'bg-rose-600 border-rose-500 text-white font-bold';
                      } else if (opt === currentQObj.correctAnswer) {
                        s = 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold ring-1 ring-emerald-500';
                      }
                    }
                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelectOption(currentQuestion, opt)}
                        className={`h-9 rounded-lg border text-xs font-bold flex items-center justify-center transition-all ${s}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span className="text-[11px] text-violet-300 truncate">Mains question</span>
              )}

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleFlag(currentQuestion)}
                  className={`p-1.5 rounded-lg border text-xs ${
                    currentQObj.flagged
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${currentQObj.flagged ? 'fill-amber-400' : ''}`} />
                </button>
                <button
                  onClick={() => setMobileTab('omr')}
                  className="px-2 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold whitespace-nowrap"
                >
                  OMR →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Question & OMR Section */}
        <div className={`w-full lg:w-2/5 xl:w-1/3 bg-[#0a0f1d] flex flex-col overflow-hidden ${
          mobileTab === 'omr' 
            ? 'h-full flex-1' 
            : mobileTab === 'paper' 
              ? 'hidden lg:flex' 
              : 'h-1/2 lg:h-full'
        }`}>
          
          {/* Active Question Top Card */}
          <div className="border-b border-slate-800/80 p-3.5 sm:p-5 bg-[#0e1424] shrink-0 overflow-y-auto max-h-[50%] lg:max-h-none">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-xl font-bold text-white">
                  Question {currentQuestion}
                </span>
                <span className="text-xs text-slate-400">of {paper.totalQuestions}</span>
                {mode === 'mock' && !isSubjective && (
                  <span className="rounded bg-slate-800 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-mono text-indigo-300">
                    ⏱ {qTimeSpent[currentQuestion] || 0}s
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleFlag(currentQuestion)}
                  className={`flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold transition-all border ${
                    currentQObj.flagged
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bookmark className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${currentQObj.flagged ? 'fill-amber-400' : ''}`} />
                  <span className="hidden xs:inline">Flag</span>
                </button>

                <button
                  onClick={() => setShowNoteBox(!showNoteBox)}
                  className={`flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold transition-all border ${
                    currentQObj.note
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Edit3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden xs:inline">Note</span>
                </button>
              </div>
            </div>

            {/* Answer Options A, B, C, D (for Objective) */}
            {!isSubjective ? (
              <div className="mt-3 sm:mt-5 grid grid-cols-4 gap-2 sm:gap-3">
                {['A', 'B', 'C', 'D'].map(opt => {
                  const isSelected = currentQObj.selected === opt;
                  let btnStyle = 'border-slate-800 bg-[#070b14] text-slate-200 hover:border-slate-600 hover:bg-slate-900';

                  if (isSelected) {
                    btnStyle = 'border-indigo-500 bg-indigo-600 text-white font-bold ring-2 ring-indigo-500/40';
                  }

                  // Practice mode live feedback: selected wrong is RED, correct is GREEN!
                  if (isPractice && currentQObj.selected && currentQObj.correctAnswer) {
                    if (isSelected) {
                      if (opt === currentQObj.correctAnswer) {
                        btnStyle = 'border-emerald-500 bg-emerald-600 text-white font-bold ring-2 ring-emerald-500/40';
                      } else {
                        btnStyle = 'border-rose-500 bg-rose-600 text-white font-bold ring-2 ring-rose-500/40';
                      }
                    } else if (opt === currentQObj.correctAnswer) {
                      // Guide user to the correct choice with emerald highlight
                      btnStyle = 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-bold ring-2 ring-emerald-500/40';
                    }
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectOption(currentQuestion, opt)}
                      className={`flex h-11 sm:h-12 items-center justify-center rounded-xl border text-sm sm:text-base font-semibold transition-all ${btnStyle}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Dedicated Subjective Handwritten Notes / Scan Upload Section */
              <div className="mt-3 sm:mt-4 space-y-3">
                <div className="rounded-2xl border border-slate-800 bg-[#070b14] p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 shrink-0">
                        <FileUp className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                          Handwritten Answer Copy
                          <span className="text-[10px] font-normal text-slate-400">(Pen & Paper)</span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Scan your handwritten answer sheet for Question {currentQuestion} and upload
                        </p>
                      </div>
                    </div>
                    {currentQObj.submissionFileUrl && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-600/70 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Attached
                      </span>
                    )}
                  </div>

                  {/* If user has uploaded a scan for this question */}
                  {currentQObj.submissionFileUrl ? (
                    <div className="rounded-xl border border-violet-900/40 bg-violet-950/30 p-3 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-5 w-5 text-violet-400 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-200 truncate">
                            {currentQObj.submissionFileName || `Answer_Q${currentQuestion}.pdf`}
                          </p>
                          <p className="text-[10px] text-slate-400">Question {currentQuestion} scanned copy</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={currentQObj.submissionFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg bg-violet-600/30 border border-violet-500/40 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-600 hover:text-white transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> View Scan
                        </a>
                        <label className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                          Replace
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadQuestionScan(currentQuestion, f);
                            }}
                          />
                        </label>
                        <button
                          onClick={() => handleRemoveQuestionScan(currentQuestion)}
                          className="rounded-lg border border-rose-900/40 bg-rose-950/30 p-1.5 text-rose-400 hover:bg-rose-900/50 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Upload Dropzone */
                    <label className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 hover:border-violet-500 bg-slate-950/70 p-4 text-center cursor-pointer transition-all ${isUploadingScan ? 'opacity-60 pointer-events-none' : ''}`}>
                      {isUploadingScan ? (
                        <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold py-1">
                          <Loader2 className="h-5 w-5 animate-spin" /> Uploading scanned sheet...
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="h-6 w-6 text-violet-400 mb-1" />
                          <span className="text-xs font-bold text-slate-200">
                            Upload Scanned Sheet for Q{currentQuestion}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            PDF or Images (CamScanner / Adobe Scan / ClearScan)
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        disabled={isUploadingScan}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadQuestionScan(currentQuestion, f);
                        }}
                      />
                    </label>
                  )}

                  {/* Or Full Booklet Option */}
                  <div className="pt-1.5 flex flex-wrap items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 gap-2">
                    <span className="truncate">
                      {fullBookletUrl 
                        ? `✓ Full answer booklet attached (${fullBookletName || 'Booklet.pdf'})`
                        : 'Wrote entire paper together in one booklet?'}
                    </span>
                    <label className="cursor-pointer text-violet-400 hover:text-violet-300 font-bold shrink-0 underline underline-offset-2">
                      {fullBookletUrl ? 'Replace Full Booklet' : 'Upload Complete Booklet (PDF)'}
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        disabled={isUploadingScan}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadFullBooklet(f);
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Model Solution / Synopsis in Practice Mode */}
                {isPractice && paper.exsUrl && (
                  <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/30 p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-indigo-300">
                      <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span>Compare with Model Answer / Synopsis:</span>
                    </div>
                    <button
                      onClick={() => setSolutionModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all shrink-0"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Detailed Solution
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Practice Mode Live Feedback Banner + Detailed Solution Button (Objective) */}
            {isPractice && !isSubjective && currentQObj.selected && currentQObj.correctAnswer && (
              <div className={`mt-2.5 rounded-xl border p-2.5 text-xs flex flex-wrap items-center justify-between gap-2 ${
                currentQObj.selected === currentQObj.correctAnswer 
                  ? 'border-emerald-800/80 bg-emerald-950/40 text-emerald-300' 
                  : 'border-rose-800/80 bg-rose-950/40 text-rose-300'
              }`}>
                <div className="flex items-center gap-1.5">
                  {currentQObj.selected === currentQObj.correctAnswer ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  )}
                  <span>
                    {currentQObj.selected === currentQObj.correctAnswer 
                      ? 'Correct!' 
                      : `Wrong Answer • Correct is Option ${currentQObj.correctAnswer}`}
                  </span>
                </div>

                {paper.exsUrl && (
                  <button
                    onClick={() => setSolutionModalOpen(true)}
                    className="flex items-center gap-1 rounded-lg bg-indigo-600/30 border border-indigo-500/40 px-2 py-0.5 text-[11px] font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                  >
                    <BookOpen className="h-3 w-3" />
                    Detailed Solution
                  </button>
                )}
              </div>
            )}

            {/* Optional Scratchpad (Only shown when user explicitly toggles pencil icon) */}
            {showNoteBox && (
              <div className="mt-3 rounded-xl border border-slate-800 bg-[#070b14] p-2.5 sm:p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Rough Scratchpad for Question {currentQuestion} (Optional)
                  </span>
                  <span className="text-[10px] text-slate-500">Draft keywords only</span>
                </div>
                <textarea
                  value={currentQObj.note || ''}
                  onChange={e => handleUpdateNote(currentQuestion, e.target.value)}
                  placeholder="Optional: Jot down outline points or trick keywords while writing by hand..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 sm:p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            )}

            {/* Navigation Bottom Controls */}
            <div className="mt-3 flex items-center justify-between pt-1">
              <button
                disabled={currentQuestion <= 1}
                onClick={() => setCurrentQuestion(prev => Math.max(1, prev - 1))}
                className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>

              {!isSubjective && (
                <button
                  onClick={() => handleClearSelection(currentQuestion)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium px-2 py-1"
                >
                  Clear Selection
                </button>
              )}

              <button
                disabled={currentQuestion >= paper.totalQuestions}
                onClick={() => setCurrentQuestion(prev => Math.min(paper.totalQuestions, prev + 1))}
                className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Question Palette Section - Responsive Grid with Correct Red/Green State in Practice */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs shrink-0">Question Palette</span>
                <span className="text-[11px] text-slate-400 sm:hidden">
                  {filteredQuestionNumbers.length} Qs
                </span>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 overflow-x-auto max-w-full">
                {(['all', 'attempted', 'unattempted', 'flagged'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilterMode(tab)}
                    className={`rounded-md px-2 py-0.5 capitalize transition-all text-[11px] shrink-0 ${
                      filterMode === tab 
                        ? 'bg-indigo-600 text-white font-semibold' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid buttons fitting any mobile width */}
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-1.5 sm:gap-2">
              {filteredQuestionNumbers.map(qNo => {
                const q = answers[qNo];
                const isCurrent = qNo === currentQuestion;
                const isAnswered = isQuestionAnswered(q);
                const isFlagged = q?.flagged;

                let badgeColor = 'bg-[#0e1424] text-slate-400 border-slate-800 hover:border-slate-700';

                if (isAnswered) {
                  // In Practice mode: wrong answers are shown in RED, correct in GREEN!
                  if (isPractice && !isSubjective) {
                    if (q?.isCorrect === false) {
                      badgeColor = 'bg-rose-950/70 text-rose-300 border-rose-600 font-semibold';
                    } else if (q?.isCorrect === true) {
                      badgeColor = 'bg-emerald-950/70 text-emerald-300 border-emerald-600 font-semibold';
                    } else {
                      badgeColor = 'bg-emerald-950/60 text-emerald-300 border-emerald-600 font-semibold';
                    }
                  } else {
                    badgeColor = 'bg-emerald-950/60 text-emerald-300 border-emerald-600 font-semibold';
                  }
                }

                if (isFlagged) {
                  badgeColor = 'bg-amber-950/60 text-amber-300 border-amber-500 font-semibold';
                }

                if (isCurrent) {
                  badgeColor += ' ring-2 ring-indigo-500 border-indigo-400 text-white font-bold scale-105';
                }

                return (
                  <button
                    key={qNo}
                    onClick={() => setCurrentQuestion(qNo)}
                    className={`relative flex h-9 sm:h-10 items-center justify-center rounded-xl border text-xs transition-all ${badgeColor}`}
                  >
                    <span>{qNo}</span>
                    {q?.submissionFileUrl && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-violet-400 ring-2 ring-slate-900" />
                    )}
                    {q?.note && !q?.submissionFileUrl && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-indigo-500" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Pause className="h-7 w-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Exam Paused</h2>
              <p className="text-xs text-slate-400 mt-1">
                Emergency or quick break? Timer is frozen and your answers are saved.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-3 text-xs border border-slate-800">
              <div>
                <span className="block text-slate-500 text-[11px]">Progress</span>
                <span className="font-bold text-white">Q{currentQuestion} of {paper.totalQuestions}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[11px]">Time Remaining</span>
                <span className="font-bold text-indigo-300 font-mono">
                  {formatTimeSeconds(remainingSeconds)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => setIsPaused(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
              >
                <Play className="h-4 w-4 fill-current" /> Resume Exam
              </button>

              <button
                onClick={handleSaveDraftAndExit}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-all"
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

      {/* Objective Exam Finish Confirmation */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              Submit your examination?
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Here is your submission summary for {paper.label}:
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-5 text-center">
              <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-2.5">
                <div className="text-lg font-bold text-emerald-400">{attemptedCount}</div>
                <div className="text-[11px] text-slate-400">Attempted</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                <div className="text-lg font-bold text-slate-300">{unattemptedCount}</div>
                <div className="text-[11px] text-slate-400">Skipped</div>
              </div>
              <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-2.5">
                <div className="text-lg font-bold text-amber-400">{flaggedCount}</div>
                <div className="text-[11px] text-slate-400">Flagged</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Continue Exam
              </button>
              <button
                onClick={() => {
                  setShowFinishConfirm(false);
                  handleFinishExam();
                }}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subjective Mains Scan & Upload Phase */}
      {isScanUploadPhase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/20 p-2.5 text-violet-400">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Upload Handwritten Answer Copy</h3>
                <p className="text-xs text-slate-400">Scan your written answer booklet and upload PDF copy</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 text-xs text-slate-300 space-y-1">
              <p>⏱ Exam writing time concluded: <strong>{formatTimeSeconds(elapsedSeconds)}</strong></p>
              <p>You have grace buffer to scan your handwritten pages and attach your submission copy.</p>
            </div>

            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 p-6 text-center cursor-pointer hover:border-violet-500 transition-all">
              <FileUp className="h-8 w-8 text-violet-400 mb-2" />
              <span className="text-xs font-bold text-white">
                {userSubmissionFile ? userSubmissionFile.name : 'Choose Scanned Answer Copy (PDF)'}
              </span>
              <span className="text-[11px] text-slate-500 mt-1">
                {userSubmissionFile ? `${(userSubmissionFile.size / 1024 / 1024).toFixed(2)} MB` : 'Drop PDF here or browse'}
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={e => setUserSubmissionFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setIsScanUploadPhase(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Back to Session
              </button>
              <button
                onClick={() => {
                  const blobUrl = userSubmissionFile ? URL.createObjectURL(userSubmissionFile) : undefined;
                  handleFinishExam(blobUrl);
                }}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30"
              >
                {userSubmissionFile ? 'Save Copy & Finish' : 'Skip & Finish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

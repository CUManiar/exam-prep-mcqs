'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QuestionPaper, Attempt, QuestionAnswer } from '../lib/types';
import { formatTimeSeconds } from '../lib/defaults';
import { 
  Clock, 
  Flag, 
  CheckCircle2, 
  XCircle, 
  Bookmark, 
  FileText, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Maximize2,
  AlertCircle,
  HelpCircle,
  Edit3
} from 'lucide-react';

interface ExamSessionViewProps {
  paper: QuestionPaper;
  mode: 'practice' | 'mock';
  config: {
    totalQuestions: number;
    correctMarks: number;
    incorrectMarks: number;
    timeMinutes: number;
  };
  onFinish: (attempt: Attempt) => void;
  onExit: () => void;
}

export function ExamSessionView({
  paper,
  mode,
  config,
  onFinish,
  onExit,
}: ExamSessionViewProps) {
  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [filterMode, setFilterMode] = useState<'all' | 'attempted' | 'unattempted' | 'flagged'>('all');
  const [openNoteForQ, setOpenNoteForQ] = useState<number | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState<boolean>(false);

  const totalTimeSeconds = config.timeMinutes * 60;
  const remainingSeconds = Math.max(0, totalTimeSeconds - elapsedSeconds);
  const isTimeCritical = totalTimeSeconds > 0 && remainingSeconds <= (totalTimeSeconds * 0.10);

  // Initialize questions
  useEffect(() => {
    const initial: Record<number, QuestionAnswer> = {};
    for (let i = 1; i <= config.totalQuestions; i++) {
      initial[i] = {
        questionNo: i,
        selected: null,
        correctAnswer: paper.answerKey[i] || undefined,
        isCorrect: null,
        flagged: false,
        note: '',
      };
    }
    setAnswers(initial);
  }, [paper, config.totalQuestions]);

  // Continuous timer in both modes
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Answer selection handler
  const handleSelectOption = (qNo: number, option: string) => {
    setAnswers(prev => {
      const current = prev[qNo] || { questionNo: qNo, selected: null };
      const newSelected = current.selected === option ? null : option; // toggle if clicked again
      const correct = paper.answerKey[qNo];
      let isCorrect: boolean | null = null;
      if (newSelected && correct) {
        isCorrect = newSelected === correct;
      }

      return {
        ...prev,
        [qNo]: {
          ...current,
          selected: newSelected,
          correctAnswer: correct,
          isCorrect,
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

  // Computed counts
  const allAnswerValues = Object.values(answers);
  const attemptedCount = allAnswerValues.filter(a => a.selected !== null).length;
  const flaggedCount = allAnswerValues.filter(a => a.flagged).length;
  const unattemptedCount = config.totalQuestions - attemptedCount;

  // Filtered question numbers for the grid
  const filteredQuestionNumbers = Array.from({ length: config.totalQuestions }, (_, i) => i + 1).filter(qNo => {
    const a = answers[qNo];
    if (filterMode === 'attempted') return a?.selected !== null;
    if (filterMode === 'unattempted') return !a?.selected;
    if (filterMode === 'flagged') return a?.flagged;
    return true;
  });

  // Finish exam calculations
  const handleFinishExam = () => {
    let correctCount = 0;
    let incorrectCount = 0;

    for (let i = 1; i <= config.totalQuestions; i++) {
      const a = answers[i];
      const correctAns = paper.answerKey[i];
      if (a?.selected) {
        if (correctAns && a.selected === correctAns) {
          correctCount++;
        } else if (correctAns) {
          incorrectCount++;
        }
      }
    }

    const calculatedScore = (correctCount * config.correctMarks) - (incorrectCount * config.incorrectMarks);
    const maxScore = config.totalQuestions * config.correctMarks;
    const accuracyPct = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;

    const attempt: Attempt = {
      id: `attempt_${Date.now()}`,
      paperId: paper.id,
      paperLabel: paper.label,
      mode,
      startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      finishedAt: new Date().toISOString(),
      totalQuestions: config.totalQuestions,
      correctMarks: config.correctMarks,
      incorrectMarks: config.incorrectMarks,
      timeMinutes: config.timeMinutes,
      durationSeconds: elapsedSeconds,
      answered: attemptedCount,
      correct: correctCount,
      incorrect: incorrectCount,
      unattempted: unattemptedCount,
      score: Math.round(calculatedScore * 100) / 100,
      maxScore: Math.round(maxScore * 100) / 100,
      accuracyPct: Math.round(accuracyPct * 10) / 10,
      answers,
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
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden">
      
      {/* Top Session Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 gap-3 shrink-0">
        
        {/* Paper title & Mode */}
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
          >
            ← Exit
          </button>
          <div>
            <h1 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
              {paper.label}
            </h1>
            <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider ${
              mode === 'practice' ? 'text-emerald-400' : 'text-indigo-400'
            }`}>
              {mode === 'practice' ? 'Practice Mode (Live Review)' : 'Timed Mock Exam'}
            </span>
          </div>
        </div>

        {/* Continuous Timer (Hour:Minutes:Seconds format) */}
        <div className={`flex items-center gap-2 rounded-xl px-4 py-1.5 font-mono text-sm font-bold transition-all shadow-inner ${
          isTimeCritical 
            ? 'bg-rose-950/80 border-2 border-rose-500 text-rose-300 animate-pulse ring-4 ring-rose-500/20'
            : 'bg-slate-950 border border-slate-800 text-indigo-300'
        }`}>
          <Clock className={`h-4 w-4 ${isTimeCritical ? 'text-rose-400 animate-spin' : 'text-indigo-400'}`} />
          <span>{formatTimeSeconds(remainingSeconds)}</span>
          {isTimeCritical && (
            <span className="text-[10px] uppercase font-bold text-rose-400 ml-1">
              Time Warning!
            </span>
          )}
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Attempted: {attemptedCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 px-2.5 py-1 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <span>Unattempted: {unattemptedCount}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Flagged: {flaggedCount}</span>
          </div>

          <button
            onClick={() => setShowFinishConfirm(true)}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all ml-2"
          >
            Finish Exam
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left PDF Viewer, Right Question/OMR Panel */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        
        {/* Left Side: Question Paper PDF Viewer */}
        <div className="w-full lg:w-3/5 xl:w-2/3 h-1/2 lg:h-full border-r border-slate-800 bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-400">
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
        </div>

        {/* Right Side: OMR Response & Question Workspace */}
        <div className="w-full lg:w-2/5 xl:w-1/3 h-1/2 lg:h-full bg-slate-900/95 flex flex-col overflow-hidden">
          
          {/* Active Question Bar */}
          <div className="border-b border-slate-800 p-4 bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white">
                  Question {currentQuestion}
                </span>
                <span className="text-xs text-slate-400">of {config.totalQuestions}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleFlag(currentQuestion)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    currentQObj.flagged
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'border border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${currentQObj.flagged ? 'fill-amber-400' : ''}`} />
                  {currentQObj.flagged ? 'Flagged' : 'Flag'}
                </button>

                <button
                  onClick={() => setOpenNoteForQ(openNoteForQ === currentQuestion ? null : currentQuestion)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    currentQObj.note
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                      : 'border border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Note {currentQObj.note ? '•' : ''}
                </button>
              </div>
            </div>

            {/* Answer Options (A, B, C, D) */}
            <div className="mt-4 grid grid-cols-4 gap-2.5">
              {['A', 'B', 'C', 'D'].map(opt => {
                const isSelected = currentQObj.selected === opt;
                let btnStyle = 'border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500 hover:bg-slate-800';

                if (isSelected) {
                  btnStyle = 'border-indigo-500 bg-indigo-600 text-white font-bold ring-2 ring-indigo-500/40';
                }

                // In practice mode, show correct/incorrect indicators immediately if selected
                if (mode === 'practice' && isSelected && currentQObj.correctAnswer) {
                  if (opt === currentQObj.correctAnswer) {
                    btnStyle = 'border-emerald-500 bg-emerald-600 text-white font-bold ring-2 ring-emerald-500/40';
                  } else {
                    btnStyle = 'border-rose-500 bg-rose-600 text-white font-bold ring-2 ring-rose-500/40';
                  }
                }

                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectOption(currentQuestion, opt)}
                    className={`flex h-12 items-center justify-center rounded-xl border text-base transition-all ${btnStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Practice Mode Live Feedback */}
            {mode === 'practice' && currentQObj.selected && currentQObj.correctAnswer && (
              <div className="mt-3 rounded-lg border p-2.5 text-xs flex items-center justify-between ${
                currentQObj.selected === currentQObj.correctAnswer 
                  ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' 
                  : 'border-rose-800 bg-rose-950/40 text-rose-300'
              }">
                <div className="flex items-center gap-2">
                  {currentQObj.selected === currentQObj.correctAnswer ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400" />
                  )}
                  <span>
                    Correct Answer: <strong>Option {currentQObj.correctAnswer}</strong>
                  </span>
                </div>
                {paper.exsUrl && (
                  <a
                    href={paper.exsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] underline text-indigo-400 hover:text-indigo-300"
                  >
                    View Solution PDF
                  </a>
                )}
              </div>
            )}

            {/* Per-Question Note Drawer */}
            {openNoteForQ === currentQuestion && (
              <div className="mt-3 rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-3 animate-in fade-in">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-indigo-200">
                    Notes for Question {currentQuestion}
                  </span>
                  <span className="text-[10px] text-slate-400">Autosaved with attempt</span>
                </div>
                <textarea
                  value={currentQObj.note || ''}
                  onChange={e => handleUpdateNote(currentQuestion, e.target.value)}
                  placeholder="Jot down formulas, doubts, trick keywords, or reasoning for this question..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            {/* Prev / Next Navigation Buttons */}
            <div className="mt-4 flex items-center justify-between pt-2">
              <button
                disabled={currentQuestion <= 1}
                onClick={() => setCurrentQuestion(prev => Math.max(1, prev - 1))}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>

              <button
                onClick={() => handleSelectOption(currentQuestion, currentQObj.selected || '')}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Clear Selection
              </button>

              <button
                disabled={currentQuestion >= config.totalQuestions}
                onClick={() => setCurrentQuestion(prev => Math.min(config.totalQuestions, prev + 1))}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Question Grid Section */}
          <div className="flex-1 overflow-y-auto p-4">
            
            {/* Filter Tabs */}
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-bold text-slate-300">Question Palette</span>
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                {(['all', 'attempted', 'unattempted', 'flagged'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilterMode(tab)}
                    className={`rounded px-2 py-0.5 capitalize transition-all ${
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

            {/* Grid buttons */}
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {filteredQuestionNumbers.map(qNo => {
                const q = answers[qNo];
                const isCurrent = qNo === currentQuestion;
                const isAnswered = q?.selected !== null;
                const isFlagged = q?.flagged;

                let badgeColor = 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600';
                if (isAnswered) {
                  badgeColor = 'bg-emerald-950/60 text-emerald-300 border-emerald-600 font-semibold';
                }
                if (isFlagged) {
                  badgeColor = 'bg-amber-950/60 text-amber-300 border-amber-500 font-semibold';
                }
                if (isCurrent) {
                  badgeColor += ' ring-2 ring-indigo-400 scale-105';
                }

                return (
                  <button
                    key={qNo}
                    onClick={() => setCurrentQuestion(qNo)}
                    className={`relative flex h-9 items-center justify-center rounded-lg border text-xs transition-all ${badgeColor}`}
                  >
                    <span>{qNo}</span>
                    {q?.note && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-indigo-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Finish Exam Confirmation Modal */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              Ready to submit your exam?
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Here is your attempt summary:
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
    </div>
  );
}

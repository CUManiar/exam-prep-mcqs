'use client';

import React, { useState, useMemo } from 'react';
import { Attempt, QuestionPaper } from '../lib/types';
import { formatTimeSeconds, formatDateTime } from '../lib/defaults';
import { DetailedSolutionModal } from './DetailedSolutionModal';
import { 
  ArrowLeft, 
  Clock, 
  Award, 
  Target, 
  TrendingUp, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Bookmark, 
  FileText, 
  Edit3, 
  Trash2, 
  BookOpen, 
  RotateCcw,
  Download, 
  Printer, 
  Copy, 
  Check, 
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Filter,
  Lightbulb
} from 'lucide-react';
import { 
  exportAttemptAsMarkdown, 
  exportAttemptAsJSON, 
  copyAttemptSummaryToClipboard 
} from '../lib/exportUtils';

interface AttemptDetailViewProps {
  attempt: Attempt;
  papers: QuestionPaper[];
  onBack: () => void;
  onUpdate: (updated: Attempt) => void;
  onDelete: (attemptId: string) => void;
}

export function AttemptDetailView({
  attempt,
  papers,
  onBack,
  onUpdate,
  onDelete,
}: AttemptDetailViewProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'incorrect' | 'correct' | 'skipped' | 'flagged' | 'altered' | 'slow'>('all');
  const [sortOption, setSortOption] = useState<'qno_asc' | 'qno_desc' | 'time_desc' | 'time_asc'>('qno_asc');
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});
  const [editingGeneralNote, setEditingGeneralNote] = useState<boolean>(false);
  const [generalNote, setGeneralNote] = useState<string>(attempt.generalNotes || '');
  const [editingQNote, setEditingQNote] = useState<number | null>(null);
  const [qNoteText, setQNoteText] = useState<string>('');
  const [solutionModalOpen, setSolutionModalOpen] = useState<boolean>(false);
  const [submissionModalOpen, setSubmissionModalOpen] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  // Match corresponding paper for solution PDF with backwards compatibility
  const matchedPaper = papers.find(p => 
    p.id === attempt.paperId || 
    (attempt.paperId && p.id.toLowerCase().replace(/general_studies_paper_i(i?)/, (_, g) => g ? 'gsii_csat' : 'gs_i') === attempt.paperId.toLowerCase()) ||
    (attempt.paperLabel && p.label.toLowerCase() === attempt.paperLabel.toLowerCase())
  );

  const handleCopySummary = async () => {
    const success = await copyAttemptSummaryToClipboard(attempt);
    if (success) {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveGeneralNote = () => {
    const updated = { ...attempt, generalNotes: generalNote };
    onUpdate(updated);
    setEditingGeneralNote(false);
  };

  const handleSaveQuestionNote = (qNo: number) => {
    const updatedAnswers = { ...attempt.answers };
    if (updatedAnswers[qNo]) {
      updatedAnswers[qNo] = { ...updatedAnswers[qNo], note: qNoteText };
    }
    const updated = { ...attempt, answers: updatedAnswers };
    onUpdate(updated);
    setEditingQNote(null);
  };

  const toggleQuestionExpand = (qNo: number) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [qNo]: !prev[qNo]
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<number, boolean> = {};
    for (let i = 1; i <= attempt.totalQuestions; i++) {
      allExpanded[i] = true;
    }
    setExpandedQuestions(allExpanded);
  };

  const collapseAll = () => {
    setExpandedQuestions({});
  };

  // Build complete question list
  const questionList = useMemo(() => {
    return Array.from({ length: attempt.totalQuestions }, (_, i) => i + 1).map(qNo => {
      return attempt.answers[qNo] || {
        questionNo: qNo,
        selected: null,
        correctAnswer: undefined,
        isCorrect: null,
        flagged: false,
        note: '',
        timeSpentSeconds: 0,
        changesCount: 0,
        answerHistory: [],
      };
    });
  }, [attempt]);

  // Derived metrics & negative markings
  const correctMarksPerQ = attempt.correctMarks || 2.0;
  const incorrectMarksPerQ = attempt.incorrectMarks || 0.667;
  const grossCorrectMarks = Math.round((attempt.correct * correctMarksPerQ) * 100) / 100;
  const negativePenaltyMarks = Math.round((attempt.incorrect * incorrectMarksPerQ) * 100) / 100;

  const activeSolvingSeconds = Math.max(0, attempt.durationSeconds - (attempt.idleTimeSeconds || 0));
  const avgTimePerQ = attempt.avgTimePerQuestion || 
    (attempt.answered > 0 ? Math.round(activeSolvingSeconds / attempt.answered) : 0);
  const avgTimeCorrect = attempt.avgTimeCorrect || 0;
  const avgTimeIncorrect = attempt.avgTimeIncorrect || 0;

  const alteredQuestions = useMemo(() => questionList.filter(q => q.changesCount && q.changesCount > 0), [questionList]);
  const slowQuestions = useMemo(() => questionList.filter(q => (q.timeSpentSeconds || 0) >= 90), [questionList]);
  const flaggedQuestions = useMemo(() => questionList.filter(q => q.flagged), [questionList]);

  // Net alteration mark impact
  const benefitGain = (attempt.alteredBenefitCount || 0) * (correctMarksPerQ + incorrectMarksPerQ);
  const harmLoss = (attempt.alteredHarmCount || 0) * (correctMarksPerQ + incorrectMarksPerQ);
  const netAlterationMarks = Math.round((benefitGain - harmLoss) * 100) / 100;

  // Filtered & Sorted questions
  const filteredQuestions = useMemo(() => {
    let list = questionList.filter(q => {
      if (filterTab === 'correct') return q.selected && q.isCorrect === true;
      if (filterTab === 'incorrect') return q.selected && q.isCorrect === false;
      if (filterTab === 'skipped') return !q.selected;
      if (filterTab === 'flagged') return q.flagged;
      if (filterTab === 'altered') return q.changesCount && q.changesCount > 0;
      if (filterTab === 'slow') return (q.timeSpentSeconds || 0) >= 90;
      return true;
    });

    list.sort((a, b) => {
      if (sortOption === 'qno_asc') return a.questionNo - b.questionNo;
      if (sortOption === 'qno_desc') return b.questionNo - a.questionNo;
      if (sortOption === 'time_desc') return (b.timeSpentSeconds || 0) - (a.timeSpentSeconds || 0);
      if (sortOption === 'time_asc') return (a.timeSpentSeconds || 0) - (b.timeSpentSeconds || 0);
      return 0;
    });

    return list;
  }, [questionList, filterTab, sortOption]);

  // Section 7: Practical Review Summary recommendations (Up to 3, strictly data-driven)
  const reviewSuggestions = useMemo(() => {
    const list: { id: string; title: string; desc: string; targetTab: typeof filterTab }[] = [];

    if (attempt.incorrect > 0) {
      list.push({
        id: 'review_incorrect',
        title: `Review ${attempt.incorrect} Incorrect Answers`,
        desc: `Negative penalties cost you -${negativePenaltyMarks} marks. Identify whether mistakes were due to misreading, conceptual gaps, or wild guesses.`,
        targetTab: 'incorrect',
      });
    }

    if (slowQuestions.length > 0) {
      const totalSlowSec = slowQuestions.reduce((acc, q) => acc + (q.timeSpentSeconds || 0), 0);
      list.push({
        id: 'review_slow',
        title: `Revisit ${slowQuestions.length} Slow Questions (>90s)`,
        desc: `These questions consumed ${formatTimeSeconds(totalSlowSec)} of your exam time. Practice eliminating two options faster to avoid pacing traps.`,
        targetTab: 'slow',
      });
    }

    if ((attempt.alteredHarmCount || 0) > (attempt.alteredBenefitCount || 0)) {
      list.push({
        id: 'review_altered_harm',
        title: `Inspect ${attempt.alteredHarmCount} Harmful Answer Changes`,
        desc: `Changing answers from correct to incorrect caused a net loss of marks. Trust your initial intuition unless you find concrete proof to revise.`,
        targetTab: 'altered',
      });
    } else if (flaggedQuestions.length > 0) {
      list.push({
        id: 'review_flagged',
        title: `Evaluate ${flaggedQuestions.length} Flagged Questions`,
        desc: `Review the items you were doubtful about to determine if your 50:50 elimination strategy worked.`,
        targetTab: 'flagged',
      });
    } else if (attempt.unattempted > 0) {
      list.push({
        id: 'review_skipped',
        title: `Assess ${attempt.unattempted} Skipped Questions`,
        desc: `Verify whether any of these were manageable questions that you skipped due to early hesitation or time pressure.`,
        targetTab: 'skipped',
      });
    }

    return list.slice(0, 3);
  }, [attempt, negativePenaltyMarks, slowQuestions, flaggedQuestions]);

  // Proportions for horizontal segmented bar
  const totalQ = attempt.totalQuestions || 100;
  const correctPct = Math.round((attempt.correct / totalQ) * 100);
  const incorrectPct = Math.round((attempt.incorrect / totalQ) * 100);
  const skippedPct = Math.max(0, 100 - correctPct - incorrectPct);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6 text-slate-100 font-sans animate-in fade-in duration-200 print:text-black print:bg-white print:p-0 print:space-y-4 print:max-w-none">
      
      {/* Official Examination Header for Print & PDF Export */}
      <div className="hidden print:block pb-5 mb-5 border-b-2 border-slate-900 text-black">
        <div className="text-center space-y-1">
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-800">
            UNION PUBLIC SERVICE COMMISSION (UPSC)
          </div>
          <div className="text-base font-black text-black uppercase tracking-wider">
            CIVIL SERVICES EXAMINATION — OFFICIAL CANDIDATE ASSESSMENT REPORT
          </div>
          <h1 className="text-2xl font-extrabold text-black pt-1">
            {attempt.paperLabel}
          </h1>
          <div className="flex flex-wrap justify-center items-center gap-3 text-xs font-semibold text-slate-700 pt-2 border-t border-slate-300 mt-2">
            <span><strong>Exam Stage:</strong> {attempt.category.toUpperCase()} ({attempt.examType.toUpperCase()})</span>
            <span>•</span>
            <span><strong>Max Marks:</strong> {attempt.maxScore}</span>
            <span>•</span>
            <span><strong>Prescribed Time:</strong> {attempt.timeMinutes || 120} Mins</span>
            <span>•</span>
            <span><strong>Attempted:</strong> {formatDateTime(attempt.startedAt)}</span>
            <span>•</span>
            <span><strong>Duration:</strong> {formatTimeSeconds(attempt.durationSeconds)}</span>
            <span>•</span>
            <span><strong>Ref ID:</strong> {attempt.id}</span>
          </div>
        </div>
      </div>

      {/* 1. Header Bar & Actions (Clean, restrained, professional) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Mock Assessment Report
              </span>
              <span className="text-xs text-slate-400">{formatDateTime(attempt.startedAt)}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
              {attempt.paperLabel}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowExportMenu(false)} 
                />
                <div className="absolute right-0 mt-1.5 z-50 w-52 rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-xl space-y-1">
                  <button
                    onClick={() => {
                      exportAttemptAsMarkdown(attempt);
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Download Markdown (.md)</span>
                  </button>

                  <button
                    onClick={() => {
                      handlePrint();
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Print / Save as PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      exportAttemptAsJSON(attempt);
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-amber-400" />
                    <span>Download JSON (.json)</span>
                  </button>

                  <button
                    onClick={() => {
                      handleCopySummary();
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Copy Summary to Clipboard</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {matchedPaper?.exsUrl && (
            <button
              onClick={() => setSolutionModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Solution Key</span>
            </button>
          )}

          {attempt.userSubmissionPdfUrl && (
            <button
              onClick={() => setSubmissionModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Answer Booklet</span>
            </button>
          )}

          <button
            onClick={() => onDelete(attempt.id)}
            className="flex items-center gap-1.5 rounded-lg border border-rose-900/40 bg-rose-950/20 px-2.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-900/40 transition-colors"
            title="Delete this attempt"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Copy Notification Toast */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xl animate-in fade-in flex items-center gap-2">
          <Check className="h-4 w-4" />
          <span>Summary copied to clipboard</span>
        </div>
      )}

      {/* 2. SIMPLE SCORE SUMMARY (Compact, clear, final score most prominent) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          {/* Most prominent metric: Final Score */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Final Score:</span>
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {attempt.score}
            </span>
            <span className="text-base font-semibold text-slate-400">
              / {attempt.maxScore}
            </span>
            <span className="ml-2 text-xs text-indigo-400 font-semibold bg-indigo-950/50 border border-indigo-800/40 px-2 py-0.5 rounded">
              {Math.round((attempt.score / (attempt.maxScore || 1)) * 1000) / 10}%
            </span>
          </div>

          {/* Key metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            {/* Accuracy */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[11px] text-slate-400 block">Accuracy</span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                {attempt.accuracyPct}%
              </span>
            </div>

            {/* Correct */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[11px] text-slate-400 block">Correct</span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                {attempt.correct}
              </span>
            </div>

            {/* Incorrect */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[11px] text-slate-400 block">Incorrect</span>
              <span className="text-base font-bold text-rose-400 font-mono">
                {attempt.incorrect}
              </span>
            </div>

            {/* Skipped */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[11px] text-slate-400 block">Skipped</span>
              <span className="text-base font-bold text-slate-300 font-mono">
                {attempt.unattempted}
              </span>
            </div>

            {/* Avg Pace */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 block">Avg Pace</span>
              <span className="text-base font-bold text-indigo-300 font-mono">
                {avgTimePerQ}s <span className="text-[10px] font-normal text-slate-400">/Q</span>
              </span>
            </div>
          </div>
        </div>

        {/* Horizontal Segmented Bar (Simple, clear, no bulky circular dials) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Question Outcome Distribution ({totalQ} Total Questions)</span>
            <span>Total Time: {formatTimeSeconds(attempt.durationSeconds)}</span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
            {attempt.correct > 0 && (
              <div
                style={{ width: `${correctPct}%` }}
                className="bg-emerald-500 h-full"
                title={`Correct: ${attempt.correct} (${correctPct}%)`}
              />
            )}
            {attempt.incorrect > 0 && (
              <div
                style={{ width: `${incorrectPct}%` }}
                className="bg-rose-500 h-full"
                title={`Incorrect: ${attempt.incorrect} (${incorrectPct}%)`}
              />
            )}
            {attempt.unattempted > 0 && (
              <div
                style={{ width: `${skippedPct}%` }}
                className="bg-slate-600 h-full"
                title={`Skipped: ${attempt.unattempted} (${skippedPct}%)`}
              />
            )}
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <strong className="text-emerald-400 font-medium">{attempt.correct} Correct</strong> ({correctPct}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <strong className="text-rose-400 font-medium">{attempt.incorrect} Incorrect</strong> ({incorrectPct}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              <strong className="text-slate-300 font-medium">{attempt.unattempted} Skipped</strong> ({skippedPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* 3. SIMPLE MARKS BREAKDOWN (Direct horizontal comparison of penalties) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Marks Breakdown & Negative Marking Drag
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Gross Marks */}
          <div className="rounded-lg bg-emerald-950/20 border border-emerald-900/40 p-3">
            <div className="text-[11px] font-semibold text-emerald-400">Gross Marks Earned</div>
            <div className="text-2xl font-bold text-emerald-300 font-mono mt-0.5">
              +{grossCorrectMarks}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {attempt.correct} correct × {attempt.correctMarks} marks
            </div>
          </div>

          {/* Penalties */}
          <div className="rounded-lg bg-rose-950/20 border border-rose-900/40 p-3">
            <div className="text-[11px] font-semibold text-rose-400">Marks Deducted (Negative Marking)</div>
            <div className="text-2xl font-bold text-rose-300 font-mono mt-0.5">
              -{negativePenaltyMarks}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {attempt.incorrect} incorrect × {attempt.incorrectMarks} penalty
            </div>
          </div>

          {/* Net Marks */}
          <div className="rounded-lg bg-indigo-950/20 border border-indigo-900/40 p-3">
            <div className="text-[11px] font-semibold text-indigo-300">Final Net Score</div>
            <div className="text-2xl font-bold text-white font-mono mt-0.5">
              {attempt.score} <span className="text-xs font-normal text-slate-400">/ {attempt.maxScore}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {grossCorrectMarks > 0 
                ? `Penalties eroded ${Math.round((negativePenaltyMarks / grossCorrectMarks) * 100)}% of gross marks`
                : 'Scored with official negative marking'
              }
            </div>
          </div>
        </div>
      </div>

      {/* 4 & 5. TIME ANALYSIS & ANSWER CHANGE ANALYSIS (Side-by-side, compact) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* 4. Time Analysis */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Time Analysis
            </div>
            {slowQuestions.length > 0 && (
              <button
                onClick={() => setFilterTab('slow')}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded px-2 py-0.5 transition-colors"
              >
                View {slowQuestions.length} Slow Qs →
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Average Pace</span>
              <span className="font-bold text-white font-mono text-sm">{avgTimePerQ}s / Q</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Pace on Correct Qs</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">
                {avgTimeCorrect > 0 ? `${avgTimeCorrect}s avg` : '—'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Pace on Incorrect Qs</span>
              <span className="font-bold text-rose-400 font-mono text-sm">
                {avgTimeIncorrect > 0 ? `${avgTimeIncorrect}s avg` : '—'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Slow Questions (&gt;90s)</span>
              <span className={`font-bold font-mono text-sm ${slowQuestions.length > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                {slowQuestions.length} questions
              </span>
            </div>
          </div>
          {attempt.idleTimeSeconds !== undefined && attempt.idleTimeSeconds > 0 && (
            <div className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex justify-between">
              <span>Cover & Instructions Reading Buffer:</span>
              <span className="font-mono text-indigo-300">{formatTimeSeconds(attempt.idleTimeSeconds)}</span>
            </div>
          )}
        </div>

        {/* 5. Answer Change Analysis (Second-Guessing Impact) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Answer Changes (Second-Guessing)
            </div>
            {alteredQuestions.length > 0 && (
              <button
                onClick={() => setFilterTab('altered')}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 border border-indigo-800/40 rounded px-2 py-0.5 transition-colors"
              >
                View {alteredQuestions.length} Changed Qs →
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Answers Changed</span>
              <span className="font-bold text-white font-mono text-sm">{alteredQuestions.length} questions</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Wrong → Right</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">+{attempt.alteredBenefitCount || 0} beneficial</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Right → Wrong</span>
              <span className="font-bold text-rose-400 font-mono text-sm">-{attempt.alteredHarmCount || 0} harmful</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block">Net Marks Impact</span>
              <span className={`font-bold font-mono text-sm ${netAlterationMarks > 0 ? 'text-emerald-400' : netAlterationMarks < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {netAlterationMarks > 0 ? `+${netAlterationMarks}` : netAlterationMarks} marks
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
            {alteredQuestions.length === 0 ? (
              <span>No answers were altered during this attempt.</span>
            ) : netAlterationMarks < 0 ? (
              <span className="text-rose-400">Second-guessing cost net marks. Review revised questions below.</span>
            ) : (
              <span className="text-emerald-400">Revisions yielded net positive marks gain.</span>
            )}
          </div>
        </div>
      </div>

      {/* 7. PRACTICAL REVIEW SUMMARY ("What to Review" - Actionable, supported by data) */}
      {reviewSuggestions.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              What to Review
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {reviewSuggestions.map(item => (
              <div 
                key={item.id} 
                className="rounded-lg bg-slate-950 p-3 border border-slate-800/80 flex flex-col justify-between gap-2"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">{item.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                </div>
                <button
                  onClick={() => setFilterTab(item.targetTab)}
                  className="self-start text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors pt-1"
                >
                  Filter questions →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. OVERALL ATTEMPT NOTES */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Overall Attempt Notes
            </h3>
          </div>
          {!editingGeneralNote && (
            <button
              onClick={() => setEditingGeneralNote(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              <Edit3 className="h-3 w-3" /> {attempt.generalNotes ? 'Edit' : '+ Add Note'}
            </button>
          )}
        </div>

        {editingGeneralNote ? (
          <div className="space-y-2 pt-1">
            <textarea
              value={generalNote}
              onChange={e => setGeneralNote(e.target.value)}
              placeholder="Jot down overall strategy observations, time-management challenges, or topics needing revision..."
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingGeneralNote(false)}
                className="rounded px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGeneralNote}
                className="rounded bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-500"
              >
                Save Note
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-300 italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            {attempt.generalNotes || 'No overall notes recorded for this attempt. Click "+ Add Note" to jot down strategy reflections.'}
          </p>
        )}
      </div>

      {/* 6. QUESTION REVIEW — THE MOST IMPORTANT SECTION (Compact, scannable table/list) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-4">
        
        {/* Controls: Filter Tabs & Sorting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">
              Question Review ({filteredQuestions.length} of {attempt.totalQuestions})
            </h3>
            <p className="text-[11px] text-slate-400">
              Click any question row to expand answer comparison and notes
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs overflow-x-auto">
              {[
                { id: 'all' as const, label: `All (${totalQ})`, color: '' },
                { id: 'incorrect' as const, label: `Incorrect (${attempt.incorrect})`, color: 'text-rose-400' },
                { id: 'correct' as const, label: `Correct (${attempt.correct})`, color: 'text-emerald-400' },
                { id: 'skipped' as const, label: `Skipped (${attempt.unattempted})`, color: '' },
                { id: 'flagged' as const, label: `Flagged (${flaggedQuestions.length})`, color: 'text-amber-400' },
                { id: 'altered' as const, label: `Changed (${alteredQuestions.length})`, color: '' },
                { id: 'slow' as const, label: `Slow (${slowQuestions.length})`, color: 'text-amber-400' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  className={`rounded px-2 py-1 transition-colors whitespace-nowrap text-[11px] ${
                    filterTab === tab.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className={filterTab !== tab.id && tab.color ? tab.color : ''}>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
              <ArrowUpDown className="h-3 w-3 text-slate-400" />
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value as any)}
                className="bg-transparent text-slate-300 text-[11px] font-medium focus:outline-none cursor-pointer"
              >
                <option value="qno_asc" className="bg-slate-900">Q1 → Q{totalQ}</option>
                <option value="qno_desc" className="bg-slate-900">Q{totalQ} → Q1</option>
                <option value="time_desc" className="bg-slate-900">Time (Longest First)</option>
                <option value="time_asc" className="bg-slate-900">Time (Fastest First)</option>
              </select>
            </div>

            {/* Expand / Collapse All */}
            <button
              onClick={Object.keys(expandedQuestions).length > 0 ? collapseAll : expandAll}
              className="text-[11px] text-slate-400 hover:text-slate-200 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 transition-colors whitespace-nowrap"
            >
              {Object.keys(expandedQuestions).length > 0 ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        {/* Compact Questions List (Table / List hybrid) */}
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No questions match the selected filter.
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredQuestions.map(q => {
              const isAnswered = q.selected !== null;
              const isCorrect = q.selected && q.isCorrect === true;
              const isWrong = q.selected && q.isCorrect === false;
              const isExpanded = !!expandedQuestions[q.questionNo];
              const isSlow = (q.timeSpentSeconds || 0) >= 90;

              return (
                <div 
                  key={q.questionNo}
                  className={`rounded-lg border transition-all ${
                    isExpanded 
                      ? 'border-indigo-500/40 bg-slate-950' 
                      : 'border-slate-800/80 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  {/* Scannable Row Header */}
                  <div
                    onClick={() => toggleQuestionExpand(q.questionNo)}
                    className="p-2.5 sm:px-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    {/* Left: Q# & Result badge */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-bold font-mono text-xs sm:text-sm text-white w-9 sm:w-11 shrink-0">
                        Q{q.questionNo}
                      </span>

                      {/* Result Badge */}
                      {isCorrect && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Correct
                        </span>
                      )}
                      {isWrong && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                          <XCircle className="h-3 w-3" /> Incorrect
                        </span>
                      )}
                      {!isAnswered && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          Skipped
                        </span>
                      )}

                      {/* Flags & Changed status tags */}
                      {q.flagged && (
                        <span className="hidden xs:inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0">
                          <Bookmark className="h-2.5 w-2.5 fill-amber-400" /> Flagged
                        </span>
                      )}
                      {q.changesCount && q.changesCount > 0 ? (
                        <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">
                          <RotateCcw className="h-2.5 w-2.5" /> Altered ({q.answerHistory?.join('→')})
                        </span>
                      ) : null}
                    </div>

                    {/* Right: Answer comparison & Time */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-xs">
                      {/* Selection vs Key */}
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400 text-[11px]">You:</span>
                        <span className={`font-bold ${isCorrect ? 'text-emerald-400' : isWrong ? 'text-rose-400' : 'text-slate-400'}`}>
                          {q.selected || '—'}
                        </span>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-400 text-[11px]">Key:</span>
                        <span className="font-bold text-emerald-400">
                          {q.correctAnswer || '—'}
                        </span>
                      </div>

                      {/* Time taken */}
                      <div className="w-16 sm:w-20 text-right">
                        {q.timeSpentSeconds && q.timeSpentSeconds > 0 ? (
                          <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                            isSlow 
                              ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' 
                              : 'text-slate-300 bg-slate-900'
                          }`}>
                            <Clock className="h-2.5 w-2.5" />
                            {q.timeSpentSeconds}s
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono text-[11px]">0s</span>
                        )}
                      </div>

                      {/* Note indicator */}
                      {q.note && (
                        <span className="text-indigo-400 hidden sm:inline" title="Has question note">
                          <FileText className="h-3 w-3" />
                        </span>
                      )}

                      {/* Expand Chevron */}
                      <ChevronRight className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 p-3.5 sm:p-4 bg-slate-900/60 space-y-3 text-xs animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Scoring Details */}
                        <div className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Evaluation Impact</span>
                          <div className="text-xs pt-0.5">
                            {isCorrect && (
                              <span className="text-emerald-400 font-semibold">
                                +{correctMarksPerQ} marks gained for correct answer.
                              </span>
                            )}
                            {isWrong && (
                              <span className="text-rose-400 font-semibold">
                                -{incorrectMarksPerQ} marks deducted for incorrect answer (marked &quot;{q.selected}&quot;, official is &quot;{q.correctAnswer}&quot;).
                              </span>
                            )}
                            {!isAnswered && (
                              <span className="text-slate-400">
                                Question unattempted. 0 marks deducted (official key is &quot;{q.correctAnswer}&quot;).
                              </span>
                            )}
                          </div>

                          {q.answerHistory && q.answerHistory.length > 1 && (
                            <div className="text-[11px] text-indigo-300 pt-1">
                              <strong>Answer Sequence:</strong> {q.answerHistory.join(' → ')}
                            </div>
                          )}
                        </div>

                        {/* Pace & Timing Context */}
                        <div className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pacing Context</span>
                          <div className="text-xs pt-0.5 text-slate-300">
                            Time spent: <strong className="font-mono text-white">{q.timeSpentSeconds || 0} seconds</strong>
                            {isSlow ? (
                              <span className="text-amber-400 ml-1">
                                (Slow: exceeded 90s target by {(q.timeSpentSeconds || 0) - 90}s)
                              </span>
                            ) : (
                              <span className="text-slate-400 ml-1">
                                (Within healthy pacing range)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Question Note Section */}
                      <div className="pt-1">
                        {editingQNote === q.questionNo ? (
                          <div className="space-y-2">
                            <textarea
                              value={qNoteText}
                              onChange={e => setQNoteText(e.target.value)}
                              placeholder="Write key learnings or revision notes for Question..."
                              rows={2}
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingQNote(null)}
                                className="rounded px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveQuestionNote(q.questionNo)}
                                className="rounded bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-500"
                              >
                                Save Note
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-slate-300 italic text-[11px] truncate max-w-md">
                              {q.note ? `Note: ${q.note}` : 'No note added for this question.'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingQNote(q.questionNo);
                                setQNoteText(q.note || '');
                              }}
                              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 shrink-0"
                            >
                              {q.note ? 'Edit Note' : '+ Add Note'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detailed Solution Modal */}
      <DetailedSolutionModal
        isOpen={solutionModalOpen}
        onClose={() => setSolutionModalOpen(false)}
        pdfUrl={matchedPaper?.exsUrl}
        paperTitle={attempt.paperLabel}
      />

      {/* User Submission Booklet Modal */}
      <DetailedSolutionModal
        isOpen={submissionModalOpen}
        onClose={() => setSubmissionModalOpen(false)}
        pdfUrl={attempt.userSubmissionPdfUrl}
        paperTitle={`${attempt.paperLabel} - My Answer Booklet`}
      />
    </div>
  );
}

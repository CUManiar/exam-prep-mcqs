'use client';

import React, { useState, useMemo } from 'react';
import { Attempt, QuestionPaper } from '../lib/types';
import { formatTimeSeconds, formatDateTime } from '../lib/defaults';
import { DetailedSolutionModal } from './DetailedSolutionModal';
import { PdfViewer } from './PdfViewer';
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
  ChevronUp,
  ChevronRight,
  ArrowUpDown,
  Filter,
  Lightbulb,
  Columns,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  exportAttemptAsMarkdown, 
  exportAttemptAsJSON, 
  copyAttemptSummaryToClipboard 
} from '../lib/exportUtils';

export type FilterTabType = 'all' | 'sure' | '50-50' | 'guess' | 'incorrect' | 'correct' | 'skipped' | 'flagged' | 'altered' | 'slow';

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
  const [filterTab, setFilterTab] = useState<FilterTabType>('all');
  const [summaryExpanded, setSummaryExpanded] = useState<boolean>(false);
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
  const [showPaperSplit, setShowPaperSplit] = useState<boolean>(true);
  const [mobilePaperModalOpen, setMobilePaperModalOpen] = useState<boolean>(false);

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

  // Confidence Tag metrics
  const sureQuestions = useMemo(() => questionList.filter(q => q.confidence === 'sure'), [questionList]);
  const sureCorrect = useMemo(() => sureQuestions.filter(q => q.selected && q.isCorrect === true).length, [sureQuestions]);
  const sureWrong = useMemo(() => sureQuestions.filter(q => q.selected && q.isCorrect === false).length, [sureQuestions]);
  const sureAccuracy = sureQuestions.length > 0 ? Math.round((sureCorrect / sureQuestions.length) * 100) : 0;

  const fiftyFiftyQuestions = useMemo(() => questionList.filter(q => q.confidence === '50-50'), [questionList]);
  const fiftyFiftyCorrect = useMemo(() => fiftyFiftyQuestions.filter(q => q.selected && q.isCorrect === true).length, [fiftyFiftyQuestions]);
  const fiftyFiftyWrong = useMemo(() => fiftyFiftyQuestions.filter(q => q.selected && q.isCorrect === false).length, [fiftyFiftyQuestions]);
  const fiftyFiftyAccuracy = fiftyFiftyQuestions.length > 0 ? Math.round((fiftyFiftyCorrect / fiftyFiftyQuestions.length) * 100) : 0;

  const guessQuestions = useMemo(() => questionList.filter(q => q.confidence === 'guess'), [questionList]);
  const guessCorrect = useMemo(() => guessQuestions.filter(q => q.selected && q.isCorrect === true).length, [guessQuestions]);
  const guessWrong = useMemo(() => guessQuestions.filter(q => q.selected && q.isCorrect === false).length, [guessQuestions]);
  const guessAccuracy = guessQuestions.length > 0 ? Math.round((guessCorrect / guessQuestions.length) * 100) : 0;

  // Net alteration mark impact
  const benefitGain = (attempt.alteredBenefitCount || 0) * (correctMarksPerQ + incorrectMarksPerQ);
  const harmLoss = (attempt.alteredHarmCount || 0) * (correctMarksPerQ + incorrectMarksPerQ);
  const netAlterationMarks = Math.round((benefitGain - harmLoss) * 100) / 100;

  // Filtered & Sorted questions
  const filteredQuestions = useMemo(() => {
    let list = questionList.filter(q => {
      if (filterTab === 'sure') return q.confidence === 'sure';
      if (filterTab === '50-50') return q.confidence === '50-50';
      if (filterTab === 'guess') return q.confidence === 'guess';
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
    <div className={`mx-auto ${showPaperSplit && matchedPaper?.qpUrl ? 'max-w-[1920px] px-3 sm:px-6' : 'max-w-5xl px-4 sm:px-6'} py-6 space-y-6 text-slate-800 font-sans animate-in fade-in duration-200 print:text-black print:bg-white print:p-0 print:space-y-4 print:max-w-none`}>
      
      {/* =========================================================================
          PRINT & EXPORT PDF REPORT (CLEAN, UNCLUTTERED EXECUTIVE FORMAT)
          Top: Performance widgets summary
          Bottom: Clean tabular format with Question | Right/Wrong | Your Answer | Correct Answer | Marks | Note added
         ========================================================================= */}
      <div className="hidden print:block space-y-6 text-slate-900 bg-white">
        {/* Official Examination Header */}
        <div className="pb-4 border-b-2 border-slate-900 text-center space-y-1">
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-600">
            UNION PUBLIC SERVICE COMMISSION (UPSC)
          </div>
          <div className="text-base font-black text-slate-900 uppercase tracking-wider">
            CIVIL SERVICES EXAMINATION — OFFICIAL CANDIDATE ASSESSMENT REPORT
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 pt-0.5">
            {attempt.paperLabel}
          </h1>
          <div className="flex flex-wrap justify-center items-center gap-3 text-xs font-semibold text-slate-600 pt-2 border-t border-slate-200 mt-2">
            <span><strong>Stage:</strong> {attempt.category.toUpperCase()} ({attempt.examType.toUpperCase()})</span>
            <span>•</span>
            <span><strong>Mode:</strong> {attempt.mode === 'mock' ? 'Timed Mock' : 'Practice Set'}</span>
            <span>•</span>
            <span><strong>Attempted:</strong> {formatDateTime(attempt.startedAt)}</span>
            <span>•</span>
            <span><strong>Duration:</strong> {formatTimeSeconds(attempt.durationSeconds)}</span>
            <span>•</span>
            <span><strong>Reference ID:</strong> {attempt.id}</span>
          </div>
        </div>

        {/* TOP WIDGETS SUMMARY */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Performance & Score Overview
          </div>
          <div className="grid grid-cols-5 gap-3">
            {/* Widget 1: Final Score */}
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Final Score</span>
              <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                {attempt.score} <span className="text-xs font-normal text-slate-500">/ {attempt.maxScore}</span>
              </div>
              <span className="text-[10px] font-semibold text-indigo-700 mt-0.5 block">
                {Math.round((attempt.score / (attempt.maxScore || 1)) * 1000) / 10}% Marks
              </span>
            </div>

            {/* Widget 2: Accuracy */}
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Accuracy</span>
              <div className="text-xl font-extrabold text-emerald-700 font-mono mt-0.5">
                {attempt.accuracyPct}%
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {attempt.correct} / {attempt.answered} answered
              </span>
            </div>

            {/* Widget 3: Correct vs Wrong */}
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Correct / Wrong</span>
              <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                <span className="text-emerald-700">{attempt.correct}</span>
                <span className="text-slate-400 mx-1">/</span>
                <span className="text-rose-700">{attempt.incorrect}</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                +{grossCorrectMarks}m / -{negativePenaltyMarks}m
              </span>
            </div>

            {/* Widget 4: Attempt Coverage */}
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Questions</span>
              <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                {attempt.answered} <span className="text-xs font-normal text-slate-500">/ {attempt.totalQuestions}</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {attempt.unattempted} Skipped
              </span>
            </div>

            {/* Widget 5: Pace */}
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-3 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Average Pace</span>
              <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                {avgTimePerQ}s
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                per attempted question
              </span>
            </div>
          </div>

          {attempt.generalNotes && attempt.generalNotes.trim() && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
              <strong className="text-slate-900">Candidate Reflection Note:</strong> {attempt.generalNotes.trim()}
            </div>
          )}
        </div>

        {/* BOTTOM TABULAR FORMAT */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Question Assessment Table ({attempt.totalQuestions} Questions)
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Correct: +{correctMarksPerQ}m | Negative: -{incorrectMarksPerQ}m
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[11px] uppercase tracking-wider font-bold">
                <th className="py-2 px-2 border-r border-slate-300 text-center w-14">Question</th>
                <th className="py-2 px-2 border-r border-slate-300 text-center w-22">Tag</th>
                <th className="py-2 px-2 border-r border-slate-300 text-center w-24">Right / Wrong</th>
                <th className="py-2 px-2 border-r border-slate-300 text-center w-24">Your Answer</th>
                <th className="py-2 px-2 border-r border-slate-300 text-center w-24">Correct Answer</th>
                <th className="py-2 px-2 border-r border-slate-300 text-center w-16">Marks</th>
                <th className="py-2 px-3">Note Added</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: attempt.totalQuestions }, (_, i) => i + 1).map(qNo => {
                const q = attempt.answers[qNo];
                const isAnswered = q?.selected !== null && q?.selected !== undefined;
                const isCorrect = isAnswered && q?.isCorrect === true;
                const isWrong = isAnswered && q?.isCorrect === false;

                let tagBadge = <span className="text-slate-400 text-[11px] font-normal">—</span>;
                if (q?.confidence === 'sure') {
                  tagBadge = <span className="font-semibold text-emerald-800 text-[11px]">🎯 Sure</span>;
                } else if (q?.confidence === '50-50') {
                  tagBadge = <span className="font-semibold text-amber-800 text-[11px]">⚖️ 50:50</span>;
                } else if (q?.confidence === 'guess') {
                  tagBadge = <span className="font-semibold text-purple-800 text-[11px]">🎲 Guess</span>;
                }

                let statusBadge = (
                  <span className="text-slate-500 font-medium text-[11px]">Skipped</span>
                );
                let marksText = <span className="text-slate-400 font-mono text-[11px]">0.00</span>;

                if (isCorrect) {
                  statusBadge = (
                    <span className="font-bold text-emerald-800 text-[11px]">Right</span>
                  );
                  marksText = (
                    <span className="font-bold text-emerald-700 font-mono text-[11px]">+{correctMarksPerQ}</span>
                  );
                } else if (isWrong) {
                  statusBadge = (
                    <span className="font-bold text-rose-800 text-[11px]">Wrong</span>
                  );
                  marksText = (
                    <span className="font-bold text-rose-700 font-mono text-[11px]">-{incorrectMarksPerQ}</span>
                  );
                }

                return (
                  <tr 
                    key={qNo} 
                    className="border-b border-slate-200 even:bg-slate-50/60 print:break-inside-avoid"
                  >
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-900">
                      Q{qNo}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                      {tagBadge}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                      {statusBadge}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-semibold">
                      {q?.selected ? `Option ${q.selected}` : '—'}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-800">
                      {q?.correctAnswer ? `Option ${q.correctAnswer}` : '—'}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono">
                      {marksText}
                    </td>
                    <td className="py-1.5 px-3 text-slate-700 text-[11px]">
                      {q?.note && q.note.trim() ? (
                        <span className="text-slate-800 font-medium">{q.note.trim()}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="pt-3 text-[10px] text-slate-500 flex justify-between items-center border-t border-slate-200">
            <span>Generated from UPSC CSE Practice Platform</span>
            <span>Attempt Reference: {attempt.id}</span>
          </div>
        </div>
      </div>

      {/* 1. Header Bar & Actions (Clean, restrained, professional) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
                Mock Assessment Report
              </span>
              <span className="text-xs text-slate-500 font-medium">{formatDateTime(attempt.startedAt)}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {attempt.paperLabel}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Question Paper Preview Toggle (Desktop Side-by-Side & Mobile Modal) */}
          {matchedPaper?.qpUrl && (
            <>
              <button
                onClick={() => setShowPaperSplit(!showPaperSplit)}
                className={`hidden lg:flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                  showPaperSplit
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title="Toggle side-by-side view with Question Paper PDF"
              >
                <Columns className="h-3.5 w-3.5" />
                <span>{showPaperSplit ? 'Side-by-Side: ON' : 'Preview Paper PDF'}</span>
              </button>

              <button
                onClick={() => setMobilePaperModalOpen(true)}
                className="flex lg:hidden items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                title="Open Question Paper PDF in modal"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>View Paper PDF</span>
              </button>
            </>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shadow-xs"
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
                <div className="absolute right-0 mt-1.5 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg space-y-1">
                  <button
                    onClick={() => {
                      handlePrint();
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Print / Save as PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      exportAttemptAsMarkdown(attempt);
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Download Markdown (.md)</span>
                  </button>

                  <button
                    onClick={() => {
                      exportAttemptAsJSON(attempt);
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-amber-600" />
                    <span>Download JSON (.json)</span>
                  </button>

                  <button
                    onClick={() => {
                      handleCopySummary();
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Copy Summary to Clipboard</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {matchedPaper?.exsUrl && (
            <button
              onClick={() => setSolutionModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-2xs"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Solution Key</span>
            </button>
          )}

          {attempt.userSubmissionPdfUrl && (
            <button
              onClick={() => setSubmissionModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors shadow-2xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Answer Booklet</span>
            </button>
          )}

          <button
            onClick={() => onDelete(attempt.id)}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors shadow-2xs"
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

      {/* Main Content Area: Split View Container */}
      <div className={`flex flex-col ${showPaperSplit && matchedPaper?.qpUrl ? 'lg:flex-row' : ''} gap-6 items-start print:hidden`}>

        {/* Left Side: Sticky Question Paper PDF Viewer (Desktop Only) */}
        {showPaperSplit && matchedPaper?.qpUrl && (
          <div className="hidden lg:flex flex-col w-full lg:w-1/2 sticky top-20 h-[calc(100vh-6.5rem)] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl shrink-0 print:hidden z-10">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                <span className="truncate max-w-[260px]">{matchedPaper.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase font-mono font-bold">
                  Question Paper
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={matchedPaper.qpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                  title="Open PDF in external browser tab"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Popout</span>
                </a>
                <button
                  onClick={() => setShowPaperSplit(false)}
                  className="text-xs font-bold text-slate-400 hover:text-rose-400 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                  title="Hide question paper split view"
                >
                  ✕ Hide
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-slate-950">
              <PdfViewer url={matchedPaper.qpUrl} title={matchedPaper.label} />
            </div>
          </div>
        )}

        {/* Right Side: Assessment Report & Responses */}
        <div className={`w-full ${showPaperSplit && matchedPaper?.qpUrl ? 'lg:w-1/2' : 'max-w-5xl mx-auto'} space-y-6 min-w-0`}>

      {/* PART 1: ASSESSMENT SUMMARY (COLLAPSIBLE, COLLAPSED BY DEFAULT) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm overflow-hidden">
        {/* Summary Top Bar (Always Visible, click to toggle full analytics) */}
        <div
          onClick={() => setSummaryExpanded(prev => !prev)}
          className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-800/40 transition-colors"
        >
          {/* Final Score */}
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

          <div className="flex items-center gap-3 flex-wrap">
            {/* Key Metric Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-center">
                <span className="text-[10px] text-slate-400 block">Accuracy</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {attempt.accuracyPct}%
                </span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-center">
                <span className="text-[10px] text-slate-400 block">Correct</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {attempt.correct}
                </span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-center">
                <span className="text-[10px] text-slate-400 block">Incorrect</span>
                <span className="text-sm font-bold text-rose-400 font-mono">
                  {attempt.incorrect}
                </span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-center">
                <span className="text-[10px] text-slate-400 block">Skipped</span>
                <span className="text-sm font-bold text-slate-300 font-mono">
                  {attempt.unattempted}
                </span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block">Avg Pace</span>
                <span className="text-sm font-bold text-indigo-300 font-mono">
                  {avgTimePerQ}s
                </span>
              </div>
            </div>

            {/* Toggle Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSummaryExpanded(prev => !prev);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-3 py-2 rounded-lg hover:bg-indigo-900/60 hover:text-indigo-300 transition-colors whitespace-nowrap ml-auto md:ml-0"
            >
              <span>{summaryExpanded ? 'Hide Summary' : 'Summary Details'}</span>
              {summaryExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Detailed Breakdown inside Summary (Revealed when expanded) */}
        {summaryExpanded && (
          <div className="border-t border-slate-800/80 p-5 space-y-5 bg-slate-950/40">
            {/* Outcome Segmented Bar */}
            <div className="space-y-1.5">
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

            {/* Marks Breakdown & Negative Marking Drag */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Marks Breakdown & Negative Marking Drag
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-emerald-950/20 border border-emerald-900/40 p-3">
                  <div className="text-[11px] font-semibold text-emerald-400">Gross Marks Earned</div>
                  <div className="text-2xl font-bold text-emerald-300 font-mono mt-0.5">
                    +{grossCorrectMarks}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {attempt.correct} correct × {attempt.correctMarks} marks
                  </div>
                </div>

                <div className="rounded-lg bg-rose-950/20 border border-rose-900/40 p-3">
                  <div className="text-[11px] font-semibold text-rose-400">Marks Deducted (Negative Marking)</div>
                  <div className="text-2xl font-bold text-rose-300 font-mono mt-0.5">
                    -{negativePenaltyMarks}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {attempt.incorrect} incorrect × {attempt.incorrectMarks} penalty
                  </div>
                </div>

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

            {/* Time Analysis & Answer Changes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Time Analysis */}
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

              {/* Answer Changes */}
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

            {/* What to Review */}
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

            {/* Overall Attempt Notes */}
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
          </div>
        )}
      </div>

      {/* CONFIDENCE & TAG ANALYTICS WIDGETS (INTERACTIVE FILTERS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Sure Widget */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFilterTab(prev => prev === 'sure' ? 'all' : 'sure')}
          className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
            filterTab === 'sure'
              ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/50 shadow-sm'
              : 'border-slate-800 bg-slate-900/80 hover:border-emerald-500/40 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <span>🎯 Sure</span>
              {filterTab === 'sure' && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-semibold lowercase">active</span>
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              {sureQuestions.length} Tagged
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-lg sm:text-xl font-extrabold text-white font-mono">
              {sureCorrect} <span className="text-xs font-normal text-slate-400">/ {sureQuestions.length} Correct</span>
            </div>
            <div className="text-xs font-bold text-emerald-400 font-mono">
              {sureAccuracy}%
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span className="text-rose-400 font-medium">{sureWrong} wrong</span>
            <span className="text-[10px] text-slate-500">Click to filter</span>
          </div>
        </div>

        {/* 50:50 Widget */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFilterTab(prev => prev === '50-50' ? 'all' : '50-50')}
          className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
            filterTab === '50-50'
              ? 'border-amber-500 bg-amber-950/30 ring-1 ring-amber-500/50 shadow-sm'
              : 'border-slate-800 bg-slate-900/80 hover:border-amber-500/40 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <span>⚖️ 50:50</span>
              {filterTab === '50-50' && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold lowercase">active</span>
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              {fiftyFiftyQuestions.length} Tagged
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-lg sm:text-xl font-extrabold text-white font-mono">
              {fiftyFiftyCorrect} <span className="text-xs font-normal text-slate-400">/ {fiftyFiftyQuestions.length} Correct</span>
            </div>
            <div className="text-xs font-bold text-amber-400 font-mono">
              {fiftyFiftyAccuracy}%
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span className="text-rose-400 font-medium">{fiftyFiftyWrong} wrong</span>
            <span className="text-[10px] text-slate-500">Click to filter</span>
          </div>
        </div>

        {/* Guess Widget */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFilterTab(prev => prev === 'guess' ? 'all' : 'guess')}
          className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
            filterTab === 'guess'
              ? 'border-purple-500 bg-purple-950/30 ring-1 ring-purple-500/50 shadow-sm'
              : 'border-slate-800 bg-slate-900/80 hover:border-purple-500/40 hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-wider">
              <span>🎲 Guess</span>
              {filterTab === 'guess' && (
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-semibold lowercase">active</span>
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              {guessQuestions.length} Tagged
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-lg sm:text-xl font-extrabold text-white font-mono">
              {guessCorrect} <span className="text-xs font-normal text-slate-400">/ {guessQuestions.length} Correct</span>
            </div>
            <div className="text-xs font-bold text-purple-400 font-mono">
              {guessAccuracy}%
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
            <span className="text-rose-400 font-medium">{guessWrong} wrong</span>
            <span className="text-[10px] text-slate-500">Click to filter</span>
          </div>
        </div>
      </div>

      {/* PART 2: QUESTION REVIEW (EXPANDED & INTERNAL SCROLLER) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3">
        {/* Controls: Filter Chips & Sorting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">
              Question Review ({filteredQuestions.length} of {attempt.totalQuestions})
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Chips */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs overflow-x-auto max-w-full">
              {[
                { id: 'all' as const, label: `All (${totalQ})`, color: '' },
                { id: 'sure' as const, label: `🎯 Sure (${sureQuestions.length})`, color: 'text-emerald-400' },
                { id: '50-50' as const, label: `⚖️ 50:50 (${fiftyFiftyQuestions.length})`, color: 'text-amber-400' },
                { id: 'guess' as const, label: `🎲 Guess (${guessQuestions.length})`, color: 'text-purple-400' },
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
                  className={`rounded px-2 py-1 transition-colors whitespace-nowrap text-[11px] cursor-pointer ${
                    filterTab === tab.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
              className="text-[11px] text-slate-400 hover:text-slate-200 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              {Object.keys(expandedQuestions).length > 0 ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        {/* Internal Scroller Container for Question Review */}
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            No questions match the selected filter.
          </div>
        ) : (
          <div className="max-h-[calc(100vh-17rem)] min-h-[440px] overflow-y-auto space-y-2 pr-1.5 focus:outline-none scroll-smooth">
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
                    {/* Left: Q# & Result badge & Tag badge */}
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="font-bold font-mono text-xs sm:text-sm text-white w-8 sm:w-10 shrink-0">
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

                      {/* Confidence Tag Pill */}
                      {q.confidence === 'sure' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 shrink-0">
                          🎯 Sure
                        </span>
                      )}
                      {q.confidence === '50-50' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/40 text-amber-300 border border-amber-500/30 shrink-0">
                          ⚖️ 50:50
                        </span>
                      )}
                      {q.confidence === 'guess' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-950/40 text-purple-300 border border-purple-500/30 shrink-0">
                          🎲 Guess
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
      </div>
      </div>

      {/* Mobile Question Paper Modal */}
      <DetailedSolutionModal
        isOpen={mobilePaperModalOpen}
        onClose={() => setMobilePaperModalOpen(false)}
        pdfUrl={matchedPaper?.qpUrl}
        paperTitle={`${attempt.paperLabel} - Question Paper`}
      />

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

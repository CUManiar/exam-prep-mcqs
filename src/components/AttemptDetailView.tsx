'use client';

import React, { useState } from 'react';
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
  Sliders,
  Sparkles,
  Download,
  Printer,
  Copy,
  Check,
  Share2,
  ChevronDown
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
  const [filterTab, setFilterTab] = useState<'all' | 'correct' | 'incorrect' | 'skipped' | 'flagged' | 'altered' | 'slow'>('all');
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

  const questionList = Array.from({ length: attempt.totalQuestions }, (_, i) => i + 1).map(qNo => {
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

  // Calculate scenarios & averages
  const grossCorrectMarks = attempt.correct * attempt.correctMarks;
  const negativePenaltyMarks = attempt.incorrect * attempt.incorrectMarks;

  const avgTimePerQ = attempt.avgTimePerQuestion || 
    (attempt.answered > 0 ? Math.round(attempt.durationSeconds / attempt.answered) : 0);
  const avgTimeCorrect = attempt.avgTimeCorrect || 0;
  const avgTimeIncorrect = attempt.avgTimeIncorrect || 0;

  const alteredQuestions = questionList.filter(q => q.changesCount && q.changesCount > 0);
  const slowQuestions = questionList.filter(q => (q.timeSpentSeconds || 0) >= 90);

  // Filtered list
  const filteredQuestions = questionList.filter(q => {
    if (filterTab === 'correct') return q.selected && q.isCorrect === true;
    if (filterTab === 'incorrect') return q.selected && q.isCorrect === false;
    if (filterTab === 'skipped') return !q.selected;
    if (filterTab === 'flagged') return q.flagged;
    if (filterTab === 'altered') return q.changesCount && q.changesCount > 0;
    if (filterTab === 'slow') return (q.timeSpentSeconds || 0) >= 90;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back to History
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Mock Exam Assessment Report
              </span>
              <span className="text-xs text-slate-500">{formatDateTime(attempt.startedAt)}</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-white tracking-tight">
              {attempt.paperLabel}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export Report Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Export Report</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowExportMenu(false)} 
                />
                <div className="absolute right-0 mt-2 z-50 w-60 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl space-y-1">
                  <button
                    onClick={() => {
                      exportAttemptAsMarkdown(attempt);
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                    <div className="text-left">
                      <div>Download Report (.md)</div>
                      <div className="text-[10px] text-slate-400 font-normal">Formatted text & response sheet</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      handlePrint();
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Printer className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div className="text-left">
                      <div>Print / Save as PDF</div>
                      <div className="text-[10px] text-slate-400 font-normal">Clean high-contrast A4 printout</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      exportAttemptAsJSON(attempt);
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Download className="h-4 w-4 text-amber-400 shrink-0" />
                    <div className="text-left">
                      <div>Download Raw Data (.json)</div>
                      <div className="text-[10px] text-slate-400 font-normal">Full attempt record & questions</div>
                    </div>
                  </button>

                  <div className="border-t border-slate-800 my-1" />

                  <button
                    onClick={() => {
                      handleCopySummary();
                      setShowExportMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Copy className="h-4 w-4 text-violet-400 shrink-0" />
                    <div className="text-left">
                      <div>Copy Summary</div>
                      <div className="text-[10px] text-slate-400 font-normal">Markdown snippet to clipboard</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {matchedPaper?.exsUrl && (
            <button
              onClick={() => setSolutionModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 px-3.5 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all"
            >
              <BookOpen className="h-4 w-4" />
              Detailed Solution
            </button>
          )}
          {attempt.userSubmissionPdfUrl && (
            <button
              onClick={() => setSubmissionModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all"
            >
              <FileText className="h-4 w-4" />
              My Answer Booklet
            </button>
          )}
          <button
            onClick={() => onDelete(attempt.id)}
            className="flex items-center gap-1.5 rounded-xl border border-rose-900/40 bg-rose-950/20 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-900/40 transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      {/* Assessment Completed Banner / Scorecard Ribbon */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-slate-900/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="rounded-xl bg-indigo-500/20 p-2.5 text-indigo-400 shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Assessment Complete & Evaluated</h2>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Official Result
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Scored against the UPSC official answer key with negative marking applied. Review breakdown below or export this specific attempt.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 print:hidden">
          <button
            onClick={() => exportAttemptAsMarkdown(attempt)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" /> Export .md
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <Printer className="h-3.5 w-3.5 text-emerald-400" /> Print PDF
          </button>
        </div>
      </div>

      {/* Copy Notification Toast */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2">
          <Check className="h-4 w-4" />
          <span>Attempt performance summary copied to clipboard!</span>
        </div>
      )}

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        
        {/* Net Score */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Final Net Score</span>
            <Award className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {attempt.score}
            <span className="text-sm font-normal text-slate-500 ml-1.5">/ {attempt.maxScore}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {Math.round((attempt.score / (attempt.maxScore || 1)) * 1000) / 10}% of max score
          </div>
        </div>

        {/* Accuracy */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Accuracy</span>
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {attempt.accuracyPct}%
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {attempt.correct} correct out of {attempt.answered} attempted
          </div>
        </div>

        {/* Avg Time / Q */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Average Pace</span>
            <Clock className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-300 font-mono">
            {avgTimePerQ}s
            <span className="text-xs font-normal text-slate-500 ml-1">/ Q</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Total: {formatTimeSeconds(attempt.durationSeconds)}
          </div>
        </div>

        {/* Questions Breakdown */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Breakdown</span>
            <Zap className="h-4 w-4 text-violet-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            <span className="text-emerald-400">{attempt.correct}C</span> •{' '}
            <span className="text-rose-400">{attempt.incorrect}W</span> •{' '}
            <span className="text-slate-400">{attempt.unattempted}S</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {attempt.unattempted} skipped (0 penalty)
          </div>
        </div>
      </div>

      {/* Scenario Nuance Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Scenario 1: Time Nuances */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Time & Speed Nuances</h3>
              <p className="text-[11px] text-slate-400">Pacing comparison on answers</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Time on Correct Qs:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {avgTimeCorrect > 0 ? `${avgTimeCorrect}s avg` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Time on Incorrect Qs:</span>
              <span className="font-bold text-rose-400 font-mono">
                {avgTimeIncorrect > 0 ? `${avgTimeIncorrect}s avg` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Slow Questions (&gt;90s):</span>
              <span className="font-bold text-amber-400">
                {slowQuestions.length} questions
              </span>
            </div>
          </div>
        </div>

        {/* Scenario 2: Second-Guessing / Alteration Nuances */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Second-Guessing Impact</h3>
              <p className="text-[11px] text-slate-400">Altered answers evaluation</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Total Altered Answers:</span>
              <span className="font-bold text-white">{alteredQuestions.length}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Wrong → Right (Benefited):</span>
              <span className="font-bold text-emerald-400">
                +{attempt.alteredBenefitCount || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Right → Wrong (Harmed):</span>
              <span className="font-bold text-rose-400">
                -{attempt.alteredHarmCount || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Scenario 3: Negative Marking Drag */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Marks & Negative Damage</h3>
              <p className="text-[11px] text-slate-400">Impact of penalties on score</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Gross Marks Gained:</span>
              <span className="font-bold text-emerald-400">+{Math.round(grossCorrectMarks * 100) / 100}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Lost to Negatives:</span>
              <span className="font-bold text-rose-400">-{Math.round(negativePenaltyMarks * 100) / 100}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Net Final Marks:</span>
              <span className="font-bold text-white">{attempt.score}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Attempt Observations & Notes */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Overall Attempt Insights & Notes</h3>
          </div>
          {!editingGeneralNote && (
            <button
              onClick={() => setEditingGeneralNote(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit Note
            </button>
          )}
        </div>

        {editingGeneralNote ? (
          <div className="space-y-2 pt-1">
            <textarea
              value={generalNote}
              onChange={e => setGeneralNote(e.target.value)}
              placeholder="Record takeaways, time-management challenges, or topics needing revision..."
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingGeneralNote(false)}
                className="rounded-lg px-3 py-1 text-xs text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGeneralNote}
                className="rounded-lg bg-indigo-600 px-4 py-1 text-xs font-bold text-white hover:bg-indigo-500"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-300 italic bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            {attempt.generalNotes || 'No notes added for this attempt. Click "Edit Note" to jot down reflections and strategy changes.'}
          </p>
        )}
      </div>

      {/* Per-Question Nuance Explorer */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-5">
        
        {/* Filter Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Nuance Per Question</h3>
            <p className="text-xs text-slate-400">Inspect time spent, response alterations, and notes</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
            {(['all', 'correct', 'incorrect', 'skipped', 'flagged', 'altered', 'slow'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`rounded-lg px-2.5 py-1 capitalize transition-all shrink-0 ${
                  filterTab === tab
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'slow' ? 'Slow (>90s)' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Questions Grid / Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuestions.map(q => {
            const isAnswered = q.selected !== null;
            const isCorrect = q.selected && q.isCorrect === true;
            const isWrong = q.selected && q.isCorrect === false;

            return (
              <div
                key={q.questionNo}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">
                      Q{q.questionNo}
                    </span>
                    {q.flagged && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">
                        <Bookmark className="h-3 w-3 fill-amber-400" /> Flagged
                      </span>
                    )}
                    {q.changesCount && q.changesCount > 0 ? (
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/30 border border-amber-800/30 px-1.5 py-0.5 rounded">
                        Altered {q.changesCount}x ({q.answerHistory?.join('→')})
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    {q.timeSpentSeconds && q.timeSpentSeconds > 0 ? (
                      <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                        q.timeSpentSeconds >= 90 ? 'text-rose-400 bg-rose-950/40' : 'text-indigo-300 bg-slate-900'
                      }`}>
                        ⏱ {q.timeSpentSeconds}s
                      </span>
                    ) : null}

                    {isCorrect && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Correct
                      </span>
                    )}
                    {isWrong && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                        <XCircle className="h-3.5 w-3.5" /> Incorrect
                      </span>
                    )}
                    {!isAnswered && (
                      <span className="text-xs text-slate-500 font-medium px-2 py-0.5 rounded bg-slate-900">
                        Skipped
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                  <div>
                    <span className="text-slate-500">Your Selection: </span>
                    <strong className="text-white text-sm">{q.selected || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Correct Answer: </span>
                    <strong className="text-emerald-400 text-sm">{q.correctAnswer || '—'}</strong>
                  </div>
                </div>

                {/* Per-Question Notes */}
                <div className="pt-2 border-t border-slate-900">
                  {editingQNote === q.questionNo ? (
                    <div className="space-y-2">
                      <textarea
                        value={qNoteText}
                        onChange={e => setQNoteText(e.target.value)}
                        placeholder="Write question note..."
                        rows={2}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingQNote(null)}
                          className="rounded px-2.5 py-0.5 text-xs text-slate-400 hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveQuestionNote(q.questionNo)}
                          className="rounded bg-indigo-600 px-3 py-0.5 text-xs font-bold text-white hover:bg-indigo-500"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 italic truncate max-w-[280px]">
                        {q.note ? `Note: ${q.note}` : 'No question note'}
                      </span>
                      <button
                        onClick={() => {
                          setEditingQNote(q.questionNo);
                          setQNoteText(q.note || '');
                        }}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        {q.note ? 'Edit Note' : '+ Add Note'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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

'use client';

import React, { useState } from 'react';
import { Attempt, QuestionPaper, ActiveSessionDraft } from '../lib/types';
import { formatTimeSeconds, formatDateTime, hasAnswerKey } from '../lib/defaults';
import { 
  Play, 
  Clock, 
  ArrowRight, 
  Search, 
  FileText,
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Target,
  Award,
  Zap,
  TrendingUp,
  BarChart3,
  PieChart,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Filter,
  Check
} from 'lucide-react';

interface DashboardViewProps {
  papers: QuestionPaper[];
  attempts: Attempt[];
  onStartExam: (paper: QuestionPaper, mode: 'practice' | 'mock') => void;
  onNavigatePapers: () => void;
  onNavigateHistory: () => void;
  onViewAttempt: (attempt: Attempt) => void;
  activeDraft?: ActiveSessionDraft | null;
  onResumeDraft?: (draft: ActiveSessionDraft) => void;
  onDiscardDraft?: () => void;
}

export function DashboardView({
  papers,
  attempts,
  onStartExam,
  onNavigatePapers,
  onNavigateHistory,
  onViewAttempt,
  activeDraft,
  onResumeDraft,
  onDiscardDraft,
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'prelims' | 'mains'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Evaluated mock attempts
  const mockAttempts = attempts.filter(a => a.mode === 'mock');
  const totalAttempts = mockAttempts.length;
  const totalDurationSeconds = mockAttempts.reduce((acc, a) => acc + (a.durationSeconds || 0), 0);
  
  const avgAccuracy = totalAttempts > 0 
    ? Math.round((mockAttempts.reduce((acc, a) => acc + (a.accuracyPct || 0), 0) / totalAttempts) * 10) / 10 
    : 0;

  const avgScore = totalAttempts > 0
    ? Math.round((mockAttempts.reduce((acc, a) => acc + (a.score || 0), 0) / totalAttempts) * 100) / 100
    : 0;

  // Question Aggregations
  const totalCorrect = mockAttempts.reduce((acc, a) => acc + (a.correct || 0), 0);
  const totalIncorrect = mockAttempts.reduce((acc, a) => acc + (a.incorrect || 0), 0);
  const totalQuestionsSum = mockAttempts.reduce((acc, a) => acc + (a.totalQuestions || 100), 0);
  const totalAttempted = mockAttempts.reduce((acc, a) => acc + (a.answered || 0), 0);
  const totalSkipped = mockAttempts.reduce((acc, a) => acc + (a.unattempted || 0), 0);
  
  const totalPenalty = Math.round(
    mockAttempts.reduce((acc, a) => acc + ((a.incorrect || 0) * (a.incorrectMarks || 0.667)), 0) * 10
  ) / 10;
  const grossScore = Math.round(
    mockAttempts.reduce((acc, a) => acc + ((a.correct || 0) * (a.correctMarks || 2.0)), 0) * 10
  ) / 10;

  // Pace metric
  const avgSecondsPerQ = totalAttempted > 0
    ? Math.round(totalDurationSeconds / totalAttempted)
    : 72; // default 72 seconds

  // Cutoff zone indicator calculation (UPSC GS-1 out of 200)
  const cutoffTarget = 92; // Typical benchmark cutoff
  const cutoffProgressPct = Math.min(100, Math.max(0, (avgScore / 200) * 100));

  // Filter papers
  const filteredPapers = papers.filter(p => {
    const matchesTab = activeTab === 'all' || p.category === activeTab;
    const matchesSearch = !searchQuery || 
      p.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.year.includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  // Calculate Donut percentages
  const donutTotal = (totalCorrect + totalIncorrect + totalSkipped) || 100;
  const correctPct = totalAttempts > 0 ? (totalCorrect / donutTotal) * 100 : 65;
  const incorrectPct = totalAttempts > 0 ? (totalIncorrect / donutTotal) * 100 : 20;
  const skippedPct = totalAttempts > 0 ? (totalSkipped / donutTotal) * 100 : 15;

  // SVG Donut circumferences (radius = 42, perimeter = 2 * PI * 42 ≈ 263.89)
  const c = 2 * Math.PI * 42;
  const strokeCorrect = (correctPct / 100) * c;
  const strokeIncorrect = (incorrectPct / 100) * c;
  const strokeSkipped = (skippedPct / 100) * c;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      
      {/* 1. Spacious Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Dashboard
          </h1>
        </div>

        {/* Segmented Tab Filter */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs font-semibold self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'all' 
                ? 'bg-white text-indigo-700 shadow-xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Papers ({papers.length})
          </button>
          <button
            onClick={() => setActiveTab('prelims')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'prelims' 
                ? 'bg-white text-indigo-700 shadow-xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Prelims GS
          </button>
          <button
            onClick={() => setActiveTab('mains')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'mains' 
                ? 'bg-white text-indigo-700 shadow-xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mains
          </button>
        </div>
      </div>

      {/* 2. Active Draft Alert (if exam was paused) */}
      {activeDraft && onResumeDraft && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50/80 px-5 py-3.5 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700 font-bold">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-amber-900">Paused Exam In Progress: </span>
              <span className="text-slate-800 font-medium">{activeDraft.paperLabel}</span>
              <span className="text-amber-700 font-mono text-[11px] ml-2 font-semibold">
                (Paused at Question {activeDraft.currentQuestion || 1})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDiscardDraft && (
              <button
                onClick={onDiscardDraft}
                className="px-3 py-1.5 text-slate-500 hover:text-rose-600 font-semibold rounded-lg hover:bg-white/80 transition-colors"
              >
                Discard
              </button>
            )}
            <button
              onClick={() => onResumeDraft(activeDraft)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-xs transition-colors"
            >
              <Play className="h-3 w-3 fill-current" /> Resume Now
            </button>
          </div>
        </div>
      )}

      {/* 3. Executive BI KPI Metrics Bar (4 Spacious Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* KPI 1: Evaluated Mocks */}
        <div className="bi-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Evaluated Mocks
            </span>
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs group-hover:scale-105 transition-transform">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {totalAttempts}
            </span>
            <span className="text-xs text-slate-500 font-medium">completed</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
            <span>{totalAttempts > 0 ? 'Full OMR Reconciled' : 'Ready for 1st Mock'}</span>
          </div>
        </div>

        {/* KPI 2: Average GS Score */}
        <div className="bi-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Average Score
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-105 transition-transform">
              <Target className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {avgScore > 0 ? avgScore : '—'}
            </span>
            <span className="text-xs text-slate-400 font-mono font-medium">/ 200</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold">
            {avgScore >= cutoffTarget ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Above Cutoff ({cutoffTarget})
              </span>
            ) : avgScore > 0 ? (
              <span className="text-amber-700 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {Math.round(cutoffTarget - avgScore)} pts to cutoff
              </span>
            ) : (
              <span className="text-slate-400">Target: 95+ marks</span>
            )}
          </div>
        </div>

        {/* KPI 3: Net Accuracy */}
        <div className="bi-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Net Accuracy
            </span>
            <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-2xs group-hover:scale-105 transition-transform">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-teal-700 font-mono tracking-tight">
              {avgAccuracy > 0 ? `${avgAccuracy}%` : '—'}
            </span>
            <span className="text-xs text-slate-500 font-medium">precision</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span>{totalCorrect} correct</span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-600">{totalIncorrect} incorrect</span>
          </div>
        </div>

        {/* KPI 4: Pace & Time per Question */}
        <div className="bi-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Time & Pace
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-2xs group-hover:scale-105 transition-transform">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {avgSecondsPerQ}s
            </span>
            <span className="text-xs text-slate-500 font-medium">/ question</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span>Logged: <strong className="text-slate-800 font-mono">{formatTimeSeconds(totalDurationSeconds)}</strong></span>
          </div>
        </div>

      </div>

      {/* 4. Interactive BI Visual Analytics & Decision Tools (Charts & Meters) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tool 1: UPSC GS-1 Benchmark Cutoff Gauge & Zone Meter */}
        <div className="bi-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Cutoff Benchmark
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                200 Scale
              </span>
            </div>

            {/* Visual Segmented Spectrum Bar */}
            <div className="mt-6 space-y-2">
              <div className="relative pt-6">
                
                {/* Pointer marker for user's avg score */}
                {totalAttempts > 0 && (
                  <div 
                    className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center transition-all duration-500"
                    style={{ left: `${Math.max(5, Math.min(95, cutoffProgressPct))}%` }}
                  >
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px] font-mono font-bold shadow-xs whitespace-nowrap">
                      {avgScore} pts
                    </span>
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-900"></div>
                  </div>
                )}

                {/* The 4 colored zones */}
                <div className="h-3.5 w-full rounded-full overflow-hidden flex shadow-inner bg-slate-100">
                  <div className="bg-rose-400 w-[37.5%]" title="High Risk: < 75"></div>
                  <div className="bg-amber-400 w-[7%]" title="Marginal: 75 - 88"></div>
                  <div className="bg-indigo-500 w-[5.5%]" title="Cutoff Zone: 88 - 98"></div>
                  <div className="bg-emerald-500 w-[50%]" title="Safe Merit: 100+"></div>
                </div>
              </div>

              {/* Benchmark labels */}
              <div className="flex justify-between text-[10px] font-mono font-semibold text-slate-400 pt-1">
                <span>0</span>
                <span>75</span>
                <span className="text-indigo-600 font-bold">92 Target</span>
                <span>120+</span>
                <span>200</span>
              </div>
            </div>

            {/* Key Zones Summary */}
            <div className="mt-6 grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 font-medium">UPSC Cutoff</span>
                <span className="font-bold text-slate-800 font-mono">~88-95</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                <span className="text-emerald-800 font-medium">Safe Merit</span>
                <span className="font-bold text-emerald-700 font-mono">100+</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tool 2: Answer Distribution BI Donut Chart */}
        <div className="bi-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <PieChart className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Response Mix
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/50">
                Hit Rate
              </span>
            </div>

            {/* Circular SVG Donut */}
            <div className="mt-5 flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#f1f5f9"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  {/* Correct Segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={`${strokeCorrect} ${c}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700"
                  />
                  {/* Incorrect Segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#f43f5e"
                    strokeWidth="12"
                    strokeDasharray={`${strokeIncorrect} ${c}`}
                    strokeDashoffset={`${-strokeCorrect}`}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700"
                  />
                  {/* Skipped Segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#94a3b8"
                    strokeWidth="12"
                    strokeDasharray={`${strokeSkipped} ${c}`}
                    strokeDashoffset={`${-(strokeCorrect + strokeIncorrect)}`}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700"
                  />
                </svg>

                {/* Donut Center Display */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-extrabold font-mono text-slate-900">
                    {totalAttempts > 0 ? `${avgAccuracy}%` : '0%'}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Accuracy
                  </span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-5 flex items-center justify-around text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-2xs"></span>
                <div>
                  <span className="text-slate-500 text-[10px] block">Correct</span>
                  <strong className="text-slate-800 font-mono">{totalCorrect}</strong>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500 shadow-2xs"></span>
                <div>
                  <span className="text-slate-500 text-[10px] block">Wrong</span>
                  <strong className="text-slate-800 font-mono">{totalIncorrect}</strong>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-slate-400 shadow-2xs"></span>
                <div>
                  <span className="text-slate-500 text-[10px] block">Skipped</span>
                  <strong className="text-slate-800 font-mono">{totalSkipped}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tool 3: Negative Marks Bleed & Discipline Card */}
        <div className="bi-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Negative Bleed Audit
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/50">
                Penalty
              </span>
            </div>

            {/* Bleed Breakdown Metrics */}
            <div className="mt-5 space-y-3">
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-900 block">Negative Marks Deducted</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-rose-600 font-mono">
                    -{totalPenalty}
                  </span>
                  <span className="text-[10px] text-slate-500 block">lost</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross</span>
                  <span className="text-sm font-mono font-bold text-slate-800 mt-0.5 block">
                    +{grossScore}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Net</span>
                  <span className="text-sm font-mono font-bold text-indigo-700 mt-0.5 block">
                    {Math.round((grossScore - totalPenalty) * 10) / 10}
                  </span>
                </div>
              </div>

              {/* Discipline Metric */}
              <div className="pt-1">
                <div className="flex justify-between text-xs font-semibold mb-1 text-slate-600">
                  <span>Retention Ratio</span>
                  <span className="font-mono text-slate-800">
                    {grossScore > 0 ? `${Math.round(((grossScore - totalPenalty) / grossScore) * 100)}%` : '100%'}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ 
                      width: grossScore > 0 
                        ? `${Math.max(10, Math.min(100, Math.round(((grossScore - totalPenalty) / grossScore) * 100)))}%` 
                        : '100%' 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Score Performance History / Velocity Bar (If attempts exist) */}
      {mockAttempts.length > 0 && (
        <div className="bi-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Mock Score Trajectory
              </h2>
            </div>
            <button
              onClick={onNavigateHistory}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 self-start sm:self-auto transition-colors"
            >
              Full History Archive <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {mockAttempts.slice(0, 4).map(att => {
              const scorePct = Math.min(100, Math.max(0, (att.score / (att.maxScore || 200)) * 100));
              const isAboveCutoff = att.score >= cutoffTarget;

              return (
                <div
                  key={att.id}
                  onClick={() => onViewAttempt(att)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100 hover:border-slate-200 cursor-pointer transition-all group"
                >
                  <div className="space-y-1 sm:w-1/3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {att.paperLabel}
                      </span>
                      {isAboveCutoff && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Cutoff Cleared
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono block">
                      {formatDateTime(att.startedAt)}
                    </span>
                  </div>

                  {/* Progress bar visual */}
                  <div className="flex-1 max-w-md hidden sm:block">
                    <div className="flex justify-between text-[10px] font-mono font-semibold text-slate-400 mb-1">
                      <span>Score: {att.score} / {att.maxScore}</span>
                      <span>Accuracy: {att.accuracyPct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200/80 overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isAboveCutoff ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${scorePct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right sm:block">
                      <span className="text-sm font-extrabold font-mono text-slate-900 block">
                        {att.score} pts
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatTimeSeconds(att.durationSeconds)}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Review <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Spacious Question Papers Archive & Launchpad */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Question Papers Archive
            </h2>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search year or subject..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
            />
          </div>
        </div>

        {/* Paper cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPapers.slice(0, 12).map(paper => {
            const keyPresent = hasAnswerKey(paper);

            return (
              <div
                key={paper.id}
                className="bi-card p-5 flex flex-col justify-between group hover:border-indigo-300"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {paper.year}
                    </span>
                    <span className="text-[10px] uppercase font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                      {paper.category}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2.5 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {paper.label}
                  </h3>
                  
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium">{paper.totalQuestions} Questions</span>
                    <span className="text-slate-300">•</span>
                    <span>{paper.timeMinutes} Mins</span>
                    <span className="text-slate-300">•</span>
                    <span>{paper.totalMarks} Marks</span>
                  </div>

                  {/* Key status badge */}
                  <div className="mt-3 flex items-center gap-2">
                    {paper.examType === 'objective' && (
                      keyPresent ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Key Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-full">
                          <AlertCircle className="h-3 w-3 text-amber-600" /> Key Needed
                        </span>
                      )
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center gap-2">
                    {keyPresent || paper.examType === 'subjective' ? (
                      <button
                        onClick={() => onStartExam(paper, 'practice')}
                        className="cursor-pointer flex-1 rounded-xl border border-slate-200 bg-slate-50/80 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all text-center"
                      >
                        Practice
                      </button>
                    ) : (
                      <button
                        onClick={onNavigatePapers}
                        title="Practice mode requires an answer key. Click to open Question Papers and attach."
                        className="cursor-pointer flex-1 rounded-xl border border-amber-200 bg-amber-50 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-all text-center"
                      >
                        Practice (Add Key)
                      </button>
                    )}
                    <button
                      onClick={() => onStartExam(paper, 'mock')}
                      className="cursor-pointer flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-all text-center shadow-xs hover:shadow-sm"
                    >
                      Mock Test
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <a
                      href={paper.qpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Preview PDF</span>
                    </a>
                    <button
                      onClick={onNavigatePapers}
                      className="cursor-pointer text-[11px] text-indigo-600 hover:text-indigo-800 font-bold transition-colors"
                    >
                      Manage Paper →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredPapers.length > 12 && (
          <div className="text-center pt-4">
            <button
              onClick={onNavigatePapers}
              className="cursor-pointer inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-indigo-600 hover:bg-slate-50 hover:text-indigo-700 transition-all shadow-xs"
            >
              Browse All {filteredPapers.length} Question Papers
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

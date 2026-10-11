'use client';

import React, { useState } from 'react';
import { Attempt, QuestionPaper, ExamCategory, ActiveSessionDraft } from '../lib/types';
import { formatTimeSeconds, formatDateTime, SUPPORTED_YEARS } from '../lib/defaults';
import { 
  Target, 
  Award, 
  Clock, 
  Play, 
  BookOpen, 
  ChevronRight, 
  Layers, 
  TrendingUp, 
  Search, 
  BarChart3,
  Calendar
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
  const [activeCategory, setActiveCategory] = useState<'all' | 'prelims' | 'mains'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mock attempts only
  const mockAttempts = attempts.filter(a => a.mode === 'mock');
  const totalAttempts = mockAttempts.length;
  const totalDurationSeconds = mockAttempts.reduce((acc, a) => acc + (a.durationSeconds || 0), 0);
  
  const avgAccuracy = totalAttempts > 0 
    ? Math.round((mockAttempts.reduce((acc, a) => acc + (a.accuracyPct || 0), 0) / totalAttempts) * 10) / 10 
    : 0;

  const bestScore = totalAttempts > 0 
    ? Math.max(...mockAttempts.map(a => a.score)) 
    : 0;

  // GS1 vs GS2 Segregated Stats (Prelims only)
  const gs1Attempts = mockAttempts.filter(a => a.category === 'prelims' && a.paperLabel.includes('GS I') && !a.paperLabel.includes('GS II'));
  const gs2Attempts = mockAttempts.filter(a => a.category === 'prelims' && (a.paperLabel.includes('GS II') || a.paperLabel.includes('CSAT')));
  const mainsAttempts = mockAttempts.filter(a => a.category === 'mains');

  const gs1AvgScore = gs1Attempts.length > 0
    ? Math.round((gs1Attempts.reduce((acc, a) => acc + a.score, 0) / gs1Attempts.length) * 10) / 10
    : 0;
  const gs2AvgScore = gs2Attempts.length > 0
    ? Math.round((gs2Attempts.reduce((acc, a) => acc + a.score, 0) / gs2Attempts.length) * 10) / 10
    : 0;

  // Filter papers for library view
  const filteredPapers = papers.filter(p => {
    const matchesCat = activeCategory === 'all' || p.category === activeCategory;
    const matchesYear = selectedYear === 'all' || p.year === selectedYear;
    const matchesSubject = selectedSubject === 'all' || p.subject.toLowerCase().includes(selectedSubject.toLowerCase());
    const matchesSearch = p.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesYear && matchesSubject && matchesSearch;
  });

  const recentAttempts = mockAttempts.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-7 animate-in fade-in duration-200">
      
      {/* Clean Dashboard Top Bar (No duplicate logo or banner) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Performance Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Analytics and test series for Prelims (GS 1 & CSAT) and Mains
          </p>
        </div>

        {/* Category Switcher Tabs */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveCategory('all')}
            className={`rounded-lg px-3.5 py-1.5 transition-all ${
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Exams
          </button>
          <button
            onClick={() => setActiveCategory('prelims')}
            className={`rounded-lg px-3.5 py-1.5 transition-all ${
              activeCategory === 'prelims'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Prelims (Objective)
          </button>
          <button
            onClick={() => setActiveCategory('mains')}
            className={`rounded-lg px-3.5 py-1.5 transition-all ${
              activeCategory === 'mains'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mains (Subjective)
          </button>
        </div>
      </div>

      {/* Ongoing Paused Exam Draft Banner */}
      {activeDraft && onResumeDraft && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Ongoing Paused Mock Exam</span>
                <span className="text-[11px] text-slate-400">
                  {activeDraft.pausedAt ? `Paused ${new Date(activeDraft.pausedAt).toLocaleTimeString()}` : 'In Progress'}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5">{activeDraft.paperLabel}</h2>
              <p className="text-xs text-slate-400">
                Resuming will continue at <strong>{activeDraft.currentQuestion ? `Question ${activeDraft.currentQuestion}` : 'Instructions Overview'}</strong> with your saved answers and exact timer.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {onDiscardDraft && (
              <button
                onClick={onDiscardDraft}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Discard
              </button>
            )}
            <button
              onClick={() => onResumeDraft(activeDraft)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Resume Exam
            </button>
          </div>
        </div>
      )}

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        
        {/* Total Mocks */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Timed Mocks</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalAttempts}</div>
          <div className="mt-1 text-[11px] text-slate-500">Official evaluated sessions</div>
        </div>

        {/* Avg Accuracy */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Accuracy</span>
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{avgAccuracy}%</div>
          <div className="mt-1 text-[11px] text-slate-500">Net correct ratio</div>
        </div>

        {/* Best Score */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Highest Score</span>
            <Award className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{bestScore > 0 ? bestScore : '—'}</div>
          <div className="mt-1 text-[11px] text-slate-500">Best net marks achieved</div>
        </div>

        {/* Exam Hours Logged */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Exam Hours</span>
            <Clock className="h-4 w-4 text-violet-400" />
          </div>
          <div className="text-2xl font-black text-white">{formatTimeSeconds(totalDurationSeconds)}</div>
          <div className="mt-1 text-[11px] text-slate-500">Continuous test duration</div>
        </div>
      </div>

      {/* Segregated Subject Analysis Panels (Objective & Subjective) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* GS I (General Studies) Panel */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-400">
              Prelims GS Paper I
            </span>
            <span className="text-[11px] text-slate-500">100 Qs • 200 Marks</span>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400">Attempts:</span>
              <span className="font-bold text-white">{gs1Attempts.length}</span>
            </div>
            <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400">Avg Score:</span>
              <span className="font-bold text-indigo-300">{gs1AvgScore > 0 ? `${gs1AvgScore} / 200` : '—'}</span>
            </div>
            <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400">Marking Rule:</span>
              <span className="font-semibold text-slate-300">+2.0 / -0.667</span>
            </div>
          </div>
        </div>

        {/* GS II (CSAT) Panel */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
              Prelims GS Paper II (CSAT)
            </span>
            <span className="text-[11px] text-slate-500">80 Qs • 200 Marks</span>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400">Attempts:</span>
              <span className="font-bold text-white">{gs2Attempts.length}</span>
            </div>
            <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400">Avg Score:</span>
              <span className="font-bold text-emerald-300">{gs2AvgScore > 0 ? `${gs2AvgScore} / 200` : '—'}</span>
            </div>
            <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400">Qualifying Benchmark:</span>
              <span className="font-semibold text-amber-300">66.67 Marks (33%)</span>
            </div>
          </div>
        </div>

        {/* Mains (Subjective) Panel */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="rounded-md bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-400">
              Mains (Subjective Exam)
            </span>
            <span className="text-[11px] text-slate-500">20 Qs • 250 Marks</span>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400">Mains Papers Written:</span>
              <span className="font-bold text-white">{mainsAttempts.length}</span>
            </div>
            <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400">Answer Copies Uploaded:</span>
              <span className="font-bold text-violet-300">
                {mainsAttempts.filter(a => a.userSubmissionPdfUrl).length}
              </span>
            </div>
            <div className="flex justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400">Standard Duration:</span>
              <span className="font-semibold text-slate-300">180 Mins (3 Hours)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Filterable Papers Library & Recent Attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        
        {/* Left: Scalable Filterable Question Papers Library (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Question Papers Repository</h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                {filteredPapers.length} Available
              </span>
            </div>
            <button
              onClick={onNavigatePapers}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              All Papers <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search & Segregation Filters */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search paper by name..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Year Dropdown (15+ years) */}
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Years (15+ Yrs)</option>
              {SUPPORTED_YEARS.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>

            {/* Subject Dropdown */}
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Subjects</option>
              <option value="GS I">GS I</option>
              <option value="CSAT">GS II (CSAT)</option>
              <option value="Mains">Mains Papers</option>
            </select>
          </div>

          {/* Papers Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredPapers.map(paper => (
              <div
                key={paper.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-4 hover:border-indigo-500/40 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-200">
                      {paper.year}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      paper.examType === 'subjective'
                        ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {paper.examType === 'subjective' ? 'Mains Subjective' : paper.subject}
                    </span>
                  </div>

                  <h3 className="mt-2.5 text-sm font-bold text-white truncate">
                    {paper.label}
                  </h3>
                  
                  <div className="mt-1 text-[11px] text-slate-400">
                    {paper.totalQuestions} Questions • {paper.timeMinutes} Mins • {paper.totalMarks} Marks
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                  <button
                    onClick={() => onStartExam(paper, 'practice')}
                    className="flex-1 rounded-xl bg-emerald-600/20 border border-emerald-500/30 py-2 text-center text-xs font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all"
                  >
                    Practice
                  </button>
                  <button
                    onClick={() => onStartExam(paper, 'mock')}
                    className="flex-1 rounded-xl bg-indigo-600/20 border border-indigo-500/30 py-2 text-center text-xs font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    Mock Exam
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Attempts (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Recent Mock Attempts</h2>
            </div>
            {mockAttempts.length > 0 && (
              <button
                onClick={onNavigateHistory}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              >
                View all
              </button>
            )}
          </div>

          <div className="space-y-3">
            {recentAttempts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
                <BarChart3 className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <p className="text-xs font-medium text-slate-400">No mock attempts yet</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Launch a timed Mock Exam from the left to start recording scores.
                </p>
              </div>
            ) : (
              recentAttempts.map(att => (
                <div
                  key={att.id}
                  onClick={() => onViewAttempt(att)}
                  className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-700 transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate max-w-[180px]">
                      {att.paperLabel}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {formatTimeSeconds(att.durationSeconds)}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500">Net Score: </span>
                      <strong className="text-white">{att.score}</strong>
                      <span className="text-[10px] text-slate-500"> / {att.maxScore}</span>
                    </div>
                    <div className="font-semibold text-emerald-400">
                      {att.accuracyPct}% Acc
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{formatDateTime(att.startedAt)}</span>
                    <span className="text-indigo-400 group-hover:text-indigo-300 font-semibold">
                      Inspect Nuance →
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

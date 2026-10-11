'use client';

import React, { useState } from 'react';
import { Attempt, QuestionPaper, ActiveSessionDraft } from '../lib/types';
import { formatTimeSeconds, formatDateTime, SUPPORTED_YEARS } from '../lib/defaults';
import { 
  Play, 
  Clock, 
  ArrowRight, 
  Search, 
  FileText,
  CheckCircle2,
  AlertCircle
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

  // Evaluated mock attempts
  const mockAttempts = attempts.filter(a => a.mode === 'mock');
  const totalAttempts = mockAttempts.length;
  const totalDurationSeconds = mockAttempts.reduce((acc, a) => acc + (a.durationSeconds || 0), 0);
  
  const avgAccuracy = totalAttempts > 0 
    ? Math.round((mockAttempts.reduce((acc, a) => acc + (a.accuracyPct || 0), 0) / totalAttempts) * 10) / 10 
    : 0;

  const avgScore = totalAttempts > 0
    ? Math.round((mockAttempts.reduce((acc, a) => acc + (a.score || 0), 0) / totalAttempts) * 100) / 100
    : 0;

  // Filter papers
  const filteredPapers = papers.filter(p => {
    const matchesTab = activeTab === 'all' || p.category === activeTab;
    const matchesSearch = !searchQuery || 
      p.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.year.includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8 text-slate-100 animate-in fade-in duration-150">
      
      {/* 1. Header with clean tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            UPSC Prelims & Mains test preparation and performance tracking
          </p>
        </div>

        {/* Minimal segmented pill switcher */}
        <div className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'all' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Papers
          </button>
          <button
            onClick={() => setActiveTab('prelims')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'prelims' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Prelims
          </button>
          <button
            onClick={() => setActiveTab('mains')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'mains' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mains
          </button>
        </div>
      </div>

      {/* 2. Active Draft Alert (if paused) */}
      {activeDraft && onResumeDraft && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-amber-300">Paused Exam: </span>
              <span className="text-white font-medium">{activeDraft.paperLabel}</span>
              <span className="text-slate-400 ml-2">
                (at Question {activeDraft.currentQuestion || 1})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDiscardDraft && (
              <button
                onClick={onDiscardDraft}
                className="px-2.5 py-1 text-slate-400 hover:text-slate-200"
              >
                Discard
              </button>
            )}
            <button
              onClick={() => onResumeDraft(activeDraft)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400"
            >
              <Play className="h-3 w-3 fill-current" /> Resume
            </button>
          </div>
        </div>
      )}

      {/* 3. Simple Performance Summary (Clean, scannable numbers with breathing room) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Mocks Taken</span>
          <div className="text-2xl font-bold text-white mt-1 font-mono">{totalAttempts}</div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Evaluated attempts</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Avg Score</span>
          <div className="text-2xl font-bold text-white mt-1 font-mono">
            {avgScore > 0 ? avgScore : '—'}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Out of 200 marks</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Avg Accuracy</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {avgAccuracy > 0 ? `${avgAccuracy}%` : '—'}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Net correct ratio</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Time Logged</span>
          <div className="text-2xl font-bold text-white mt-1 font-mono">
            {formatTimeSeconds(totalDurationSeconds)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Total practice hours</span>
        </div>
      </div>

      {/* 4. Recent Evaluated Mocks (If any exist) */}
      {mockAttempts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Recent Mock Tests
            </h2>
            <button
              onClick={onNavigateHistory}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              View all history <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            {mockAttempts.slice(0, 3).map(att => (
              <div
                key={att.id}
                onClick={() => onViewAttempt(att)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{att.paperLabel}</span>
                    <span className="text-[11px] text-slate-400">• {formatDateTime(att.startedAt)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                    <span>Score: <strong className="text-white font-mono">{att.score} / {att.maxScore}</strong></span>
                    <span>Accuracy: <strong className="text-emerald-400 font-mono">{att.accuracyPct}%</strong></span>
                    <span>Time: <strong className="text-slate-300 font-mono">{formatTimeSeconds(att.durationSeconds)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1 hover:text-indigo-300">
                    Review Assessment →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Question Papers Library */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Question Papers Archive
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Launch a timed mock exam with OMR evaluation or start untimed practice
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter by year or name..."
              className="w-full rounded-lg border border-slate-700/80 bg-slate-900/80 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Paper cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredPapers.slice(0, 12).map(paper => (
            <div
              key={paper.id}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-slate-300">{paper.year}</span>
                  <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {paper.category}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white mt-2 truncate">
                  {paper.label}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {paper.totalQuestions} Questions • {paper.timeMinutes} Mins • {paper.totalMarks} Marks
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  onClick={() => onStartExam(paper, 'practice')}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Practice
                </button>
                <button
                  onClick={() => onStartExam(paper, 'mock')}
                  className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
                >
                  Mock Test
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredPapers.length > 12 && (
          <div className="text-center pt-2">
            <button
              onClick={onNavigatePapers}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              View all {filteredPapers.length} question papers →
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

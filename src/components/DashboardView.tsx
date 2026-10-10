'use client';

import React from 'react';
import { Attempt, QuestionPaper } from '../lib/types';
import { formatTimeSeconds, formatDateTime } from '../lib/defaults';
import { 
  Target, 
  Award, 
  TrendingUp, 
  Clock, 
  Play, 
  BookOpen, 
  ChevronRight, 
  CheckCircle2, 
  Zap, 
  Layers, 
  ArrowUpRight 
} from 'lucide-react';

interface DashboardViewProps {
  papers: QuestionPaper[];
  attempts: Attempt[];
  onStartExam: (paper: QuestionPaper, mode: 'practice' | 'mock') => void;
  onNavigatePapers: () => void;
  onNavigateHistory: () => void;
  onViewAttempt: (attempt: Attempt) => void;
}

export function DashboardView({
  papers,
  attempts,
  onStartExam,
  onNavigatePapers,
  onNavigateHistory,
  onViewAttempt,
}: DashboardViewProps) {
  // Aggregate stats
  const totalAttempts = attempts.length;
  const totalDurationSeconds = attempts.reduce((acc, a) => acc + (a.durationSeconds || 0), 0);
  const avgAccuracy = totalAttempts > 0 
    ? Math.round((attempts.reduce((acc, a) => acc + (a.accuracyPct || 0), 0) / totalAttempts) * 10) / 10 
    : 0;
  const bestScore = totalAttempts > 0 
    ? Math.max(...attempts.map(a => a.score)) 
    : 0;

  const recentAttempts = attempts.slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
            <span>Prelims & Competitive Exam Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Track Progress. Master Accuracy. Score Higher.
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Practice actual exam papers with instantaneous feedback or timed mock simulation with negative marking analysis.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {papers[0] && (
              <button
                onClick={() => onStartExam(papers[0], 'practice')}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
              >
                <Play className="h-4 w-4 fill-white" />
                Quick Practice: {papers[0].subject}
              </button>
            )}
            <button
              onClick={onNavigatePapers}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
            >
              Browse Library ({papers.length} Papers)
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
        <div className="absolute right-10 bottom-0 h-48 w-48 rounded-full bg-violet-600/10 blur-2xl pointer-events-none" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        
        {/* Total attempts */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Attempts</span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{totalAttempts}</div>
          <div className="mt-1 text-[11px] text-slate-400">Mock & Practice Sessions</div>
        </div>

        {/* Avg Accuracy */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Accuracy</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{avgAccuracy}%</div>
          <div className="mt-1 text-[11px] text-slate-400">Net correct ratio</div>
        </div>

        {/* Best Score */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Best Score</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400">{bestScore > 0 ? bestScore : '—'}</div>
          <div className="mt-1 text-[11px] text-slate-400">Highest net marks</div>
        </div>

        {/* Time Practiced */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Practice Time</span>
            <div className="rounded-lg bg-violet-500/10 p-2 text-violet-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{formatTimeSeconds(totalDurationSeconds)}</div>
          <div className="mt-1 text-[11px] text-slate-400">Total continuous duration</div>
        </div>
      </div>

      {/* Main Grid: Available Papers & Recent Attempts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* Papers Library Section (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Question Papers</h2>
            </div>
            <button
              onClick={onNavigatePapers}
              className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {papers.slice(0, 4).map(paper => (
              <div
                key={paper.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition-all hover:border-indigo-500/50 hover:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                      {paper.year}
                    </span>
                    <span className="text-[11px] font-medium text-indigo-400">
                      {paper.subject}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {paper.label}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    PDF paper • Answer key configured
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => onStartExam(paper, 'practice')}
                    className="flex-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 py-2 text-center text-xs font-semibold text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all"
                  >
                    Practice Mode
                  </button>
                  <button
                    onClick={() => onStartExam(paper, 'mock')}
                    className="flex-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 py-2 text-center text-xs font-semibold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    Mock Exam
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Performance & History (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Recent Attempts</h2>
            </div>
            {attempts.length > 0 && (
              <button
                onClick={onNavigateHistory}
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                Full History
              </button>
            )}
          </div>

          <div className="space-y-3">
            {recentAttempts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
                <Target className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                <p className="text-xs font-medium text-slate-400">No attempts yet</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Start your first practice or mock exam from above.
                </p>
              </div>
            ) : (
              recentAttempts.map(att => (
                <div
                  key={att.id}
                  onClick={() => onViewAttempt(att)}
                  className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition-all hover:border-slate-700 hover:bg-slate-900 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate max-w-[180px]">
                      {att.paperLabel}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                      att.mode === 'practice' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {att.mode}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400">Score: </span>
                      <span className="font-bold text-white">{att.score}</span>
                      <span className="text-[10px] text-slate-500"> / {att.maxScore}</span>
                    </div>
                    <div className="font-semibold text-emerald-400">
                      {att.accuracyPct}% Acc
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                    <span>{formatDateTime(att.startedAt)}</span>
                    <span>{formatTimeSeconds(att.durationSeconds)}</span>
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

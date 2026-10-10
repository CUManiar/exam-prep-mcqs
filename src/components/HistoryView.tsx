'use client';

import React, { useState } from 'react';
import { Attempt } from '../lib/types';
import { formatTimeSeconds, formatDateTime } from '../lib/defaults';
import { History, Search, Eye, Award, Clock, ArrowRight } from 'lucide-react';

interface HistoryViewProps {
  attempts: Attempt[];
  onViewAttempt: (attempt: Attempt) => void;
  onDeleteAttempt: (attemptId: string) => void;
}

export function HistoryView({ attempts, onViewAttempt, onDeleteAttempt }: HistoryViewProps) {
  const [search, setSearch] = useState('');

  // Practice mode is not counted in History
  const mockAttempts = attempts.filter(a => a.mode === 'mock');

  const filtered = mockAttempts.filter(a => {
    return a.paperLabel.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Mock Exam History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Official timed test attempts with negative marking and question-by-question analytics
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search past exam attempts..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <History className="mx-auto h-10 w-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-300">No mock exam attempts yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Complete a Mock Test to generate official performance records and scenario averages.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(att => (
            <div
              key={att.id}
              onClick={() => onViewAttempt(att)}
              className="cursor-pointer flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-indigo-500/50 hover:bg-slate-900/90 transition-all group shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Timed Mock
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {formatTimeSeconds(att.durationSeconds)}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {att.paperLabel}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDateTime(att.startedAt)}
                </p>

                {/* Score badge */}
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950 p-3 border border-slate-800/80">
                  <div>
                    <span className="text-[11px] text-slate-500">Net Score</span>
                    <div className="text-xl font-bold text-white">
                      {att.score} <span className="text-xs text-slate-500">/ {att.maxScore}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500">Accuracy</span>
                    <div className="text-xl font-bold text-emerald-400">
                      {att.accuracyPct}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {att.correct}C • {att.incorrect}W • {att.unattempted}S
                </span>
                <span className="text-indigo-400 group-hover:text-indigo-300 font-semibold flex items-center gap-1">
                  View Full Nuance <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

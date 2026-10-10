'use client';

import React, { useState } from 'react';
import { Attempt } from '../lib/types';
import { formatTimeSeconds, formatDateTime } from '../lib/defaults';
import { History, Search, Trash2, Eye, Award, CheckCircle2, XCircle } from 'lucide-react';

interface HistoryViewProps {
  attempts: Attempt[];
  onViewAttempt: (attempt: Attempt) => void;
  onDeleteAttempt: (attemptId: string) => void;
}

export function HistoryView({ attempts, onViewAttempt, onDeleteAttempt }: HistoryViewProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'practice' | 'mock'>('all');
  const [search, setSearch] = useState('');

  const filtered = attempts.filter(a => {
    const matchesMode = filterMode === 'all' || a.mode === filterMode;
    const matchesSearch = a.paperLabel.toLowerCase().includes(search.toLowerCase());
    return matchesMode && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Attempt History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review detailed question logs, notes, time taken, and accuracy trends
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            {(['all', 'practice', 'mock'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterMode(tab)}
                className={`rounded-lg px-3 py-1.5 capitalize transition-all ${
                  filterMode === tab 
                    ? 'bg-indigo-600 text-white font-semibold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'all' ? 'All Attempts' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <History className="mx-auto h-10 w-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-300">No attempts found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {attempts.length === 0 ? 'Start practicing from Question Papers.' : 'No attempts match your filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(att => (
            <div
              key={att.id}
              onClick={() => onViewAttempt(att)}
              className="cursor-pointer flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    att.mode === 'practice' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {att.mode}
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
                    <span className="text-[11px] text-slate-500">Score</span>
                    <div className="text-lg font-bold text-white">
                      {att.score} <span className="text-xs text-slate-500">/ {att.maxScore}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500">Accuracy</span>
                    <div className="text-lg font-bold text-emerald-400">
                      {att.accuracyPct}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {att.correct} Correct • {att.incorrect} Wrong
                </span>
                <span className="text-indigo-400 group-hover:text-indigo-300 font-semibold flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> Details
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

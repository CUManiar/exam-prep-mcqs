'use client';

import React, { useState } from 'react';
import { Attempt } from '../lib/types';
import { formatTimeSeconds, formatDateTime } from '../lib/defaults';
import { History, Search, Clock, ArrowRight, Download, Trash2, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { exportAttemptAsMarkdown } from '../lib/exportUtils';

interface HistoryViewProps {
  attempts: Attempt[];
  onViewAttempt: (attempt: Attempt) => void;
  onDeleteAttempt: (attemptId: string) => void;
}

export function HistoryView({ attempts, onViewAttempt, onDeleteAttempt }: HistoryViewProps) {
  const [search, setSearch] = useState('');

  // Only mock mode attempts are counted in official history
  const mockAttempts = attempts.filter(a => a.mode === 'mock');

  const filtered = mockAttempts.filter(a => {
    return a.paperLabel.toLowerCase().includes(search.toLowerCase());
  });

  // Calculate quick metrics if mock attempts exist
  const totalMocks = mockAttempts.length;
  const avgScore = totalMocks > 0 
    ? Math.round((mockAttempts.reduce((acc, a) => acc + a.score, 0) / totalMocks) * 10) / 10 
    : 0;
  const avgAccuracy = totalMocks > 0
    ? Math.round((mockAttempts.reduce((acc, a) => acc + a.accuracyPct, 0) / totalMocks) * 10) / 10
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 font-mono">
              Evaluated Tests Archive
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] text-slate-400 font-mono">
              {totalMocks} {totalMocks === 1 ? 'Attempt' : 'Attempts'} Logged
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Mock Exam History</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Detailed performance logs for timed UPSC test attempts with negative marking reconciliations and per-question pace analysis.
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by paper or year..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500/80 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Aggregate Overview Bar (if attempts exist) */}
      {totalMocks > 0 && !search && (
        <div className="grid grid-cols-3 gap-3 glass-card p-4 rounded-2xl border border-white/[0.06]">
          <div className="border-r border-slate-800/80 pr-2">
            <span className="text-[11px] font-medium text-slate-400">Total Attempts</span>
            <div className="text-lg font-bold text-white font-mono mt-0.5">{totalMocks}</div>
          </div>
          <div className="border-r border-slate-800/80 px-2">
            <span className="text-[11px] font-medium text-slate-400">Average Score</span>
            <div className="text-lg font-bold text-indigo-300 font-mono mt-0.5">{avgScore}</div>
          </div>
          <div className="pl-2">
            <span className="text-[11px] font-medium text-slate-400">Average Accuracy</span>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{avgAccuracy}%</div>
          </div>
        </div>
      )}

      {/* List / Cards */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border-dashed border-slate-800">
          <History className="mx-auto h-10 w-10 text-slate-600 mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">No mock exam attempts found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {search ? 'No past mock tests matched your search.' : 'Start a timed Mock Exam from the Question Papers library to generate your first assessment report.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(att => {
            const isCsat = att.paperLabel.includes('CSAT') || att.paperLabel.includes('GS II');
            const scoreColor = att.score >= 90 ? 'text-emerald-400' : att.score >= 66 ? 'text-amber-400' : 'text-slate-200';
            
            // Cutoff indicator badge
            let cutoffBadge = null;
            if (isCsat) {
              const qualified = att.score >= 66.67;
              cutoffBadge = (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  qualified 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {qualified ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {qualified ? 'CSAT Qualified (33%+)' : 'Below 33% Cutoff'}
                </span>
              );
            } else if (att.category === 'prelims') {
              const competitive = att.score >= 95;
              cutoffBadge = (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                  competitive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
                }`}>
                  {competitive ? 'Target Cutoff Cleared' : 'Prelims Attempt'}
                </span>
              );
            }

            return (
              <div
                key={att.id}
                onClick={() => onViewAttempt(att)}
                className="cursor-pointer flex flex-col justify-between glass-card glass-card-hover rounded-2xl p-5 border border-white/[0.06] group shadow-sm"
              >
                <div>
                  {/* Top row: Status & Duration */}
                  <div className="flex items-center justify-between gap-2">
                    {cutoffBadge || (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        Evaluated Mock
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      {formatTimeSeconds(att.durationSeconds)}
                    </span>
                  </div>

                  {/* Title & Date */}
                  <h3 className="mt-3 text-sm font-bold text-white group-hover:text-indigo-300 transition-colors leading-snug">
                    {att.paperLabel}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDateTime(att.startedAt)}
                  </p>

                  {/* Score & Accuracy Box */}
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950/60 p-3 border border-slate-800/80">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium">Net Score</span>
                      <div className={`text-xl font-bold font-mono ${scoreColor} mt-0.5`}>
                        {att.score} <span className="text-xs text-slate-500 font-normal">/ {att.maxScore}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-medium">Accuracy</span>
                      <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                        {att.accuracyPct}%
                      </div>
                    </div>
                  </div>

                  {/* Question breakdown row */}
                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                    <span>
                      <span className="text-emerald-400 font-medium">{att.correct}</span> Correct
                    </span>
                    <span>•</span>
                    <span>
                      <span className="text-rose-400 font-medium">{att.incorrect}</span> Wrong
                    </span>
                    <span>•</span>
                    <span>
                      <span className="text-slate-500 font-medium">{att.unattempted}</span> Skipped
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportAttemptAsMarkdown(att);
                    }}
                    title="Export Markdown Report"
                    className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    <Download className="h-3 w-3 text-indigo-400" />
                    <span>Export MD</span>
                  </button>

                  <span className="text-indigo-400 group-hover:text-indigo-300 font-semibold text-xs flex items-center gap-1">
                    Review Assessment <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

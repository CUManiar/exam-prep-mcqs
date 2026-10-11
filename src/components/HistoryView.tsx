'use client';

import React, { useState } from 'react';
import { Attempt } from '../lib/types';
import { formatTimeSeconds, formatDateTime } from '../lib/defaults';
import { History, Search, Eye, Award, Clock, ArrowRight, Download, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { exportAttemptAsMarkdown } from '../lib/exportUtils';

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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-7 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-4 w-4 text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono">
              Evaluated Test Archive
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Mock Exam History</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Timed UPSC Prelims & Mains test records with negative mark reconciliation and question timings
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-80 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by paper title or year..."
            className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border-dashed">
          <History className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-200">No mock exam attempts found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {search ? 'No past mock tests matched your search criteria.' : 'Complete a timed Mock Exam from the Questions Papers library to generate your first performance report.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(att => {
            const isCsat = att.paperLabel.includes('CSAT') || att.paperLabel.includes('GS II');
            const scoreColor = att.score >= 90 ? 'text-emerald-400' : att.score >= 66 ? 'text-amber-400' : 'text-rose-400';
            
            // Cutoff indicator badge
            let cutoffBadge = null;
            if (isCsat) {
              const qualified = att.score >= 66.67;
              cutoffBadge = (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
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
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  competitive 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                }`}>
                  {competitive ? 'Target Cutoff Cleared' : 'Evaluated Prelims'}
                </span>
              );
            }

            return (
              <div
                key={att.id}
                onClick={() => onViewAttempt(att)}
                className="cursor-pointer flex flex-col justify-between glass-card glass-card-hover rounded-2xl p-5 group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    {cutoffBadge || (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Evaluated Mock
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      {formatTimeSeconds(att.durationSeconds)}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {att.paperLabel}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDateTime(att.startedAt)}
                  </p>

                  {/* Score badge card */}
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950/70 p-3.5 border border-slate-800/80">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium">Net Final Score</span>
                      <div className={`text-2xl font-black font-mono ${scoreColor}`}>
                        {att.score} <span className="text-xs text-slate-500 font-normal">/ {att.maxScore}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-medium">Accuracy</span>
                      <div className="text-2xl font-black text-emerald-400 font-mono">
                        {att.accuracyPct}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs gap-2">
                  <span className="text-slate-400 truncate text-[11px] font-mono">
                    <span className="text-emerald-400 font-bold">{att.correct}C</span> • <span className="text-rose-400 font-bold">{att.incorrect}W</span> • <span className="text-slate-500 font-bold">{att.unattempted}S</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportAttemptAsMarkdown(att);
                      }}
                      title="Download Markdown Report"
                      className="flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      <Download className="h-3 w-3 text-indigo-400" /> Export
                    </button>
                    <span className="text-indigo-400 group-hover:text-indigo-300 font-bold text-xs flex items-center gap-1">
                      Review <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


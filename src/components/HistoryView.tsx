'use client';

import React, { useState } from 'react';
import { Attempt } from '../lib/types';
import { formatTimeSeconds, formatDateTime } from '../lib/defaults';
import { History, Search, Clock, ArrowRight, Download, CheckCircle2, AlertTriangle, ChevronRight, Award, Target, Zap } from 'lucide-react';
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60 font-mono">
              Evaluated Tests Archive
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-500 font-mono">
              {totalMocks} {totalMocks === 1 ? 'Attempt' : 'Attempts'} Logged
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Mock Exam History</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Detailed performance logs for timed UPSC test attempts with negative marking reconciliations and per-question pace analysis.
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by paper or year..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Aggregate Overview Bar (if attempts exist) */}
      {totalMocks > 0 && !search && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bi-card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Attempts</span>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">{totalMocks}</div>
            </div>
          </div>

          <div className="bi-card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Average Score</span>
              <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">{avgScore} <span className="text-xs text-slate-400 font-normal">/ 200</span></div>
            </div>
          </div>

          <div className="bi-card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shadow-2xs">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Average Accuracy</span>
              <div className="text-2xl font-extrabold text-teal-700 font-mono mt-0.5">{avgAccuracy}%</div>
            </div>
          </div>
        </div>
      )}

      {/* List / Cards */}
      {filtered.length === 0 ? (
        <div className="bi-card rounded-2xl p-12 text-center border-dashed border-slate-300">
          <History className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No mock exam attempts found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {search ? 'No past mock tests matched your search.' : 'Start a timed Mock Exam from the Question Papers library to generate your first assessment report.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(att => {
            const isCsat = att.paperLabel.includes('CSAT') || att.paperLabel.includes('GS II');
            const scoreColor = att.score >= 90 ? 'text-emerald-700' : att.score >= 66 ? 'text-amber-700' : 'text-slate-800';
            
            // Cutoff indicator badge
            let cutoffBadge = null;
            if (isCsat) {
              const qualified = att.score >= 66.67;
              cutoffBadge = (
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  qualified 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                }`}>
                  {qualified ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {qualified ? 'CSAT Qualified (33%+)' : 'Below 33% Cutoff'}
                </span>
              );
            } else if (att.category === 'prelims') {
              const competitive = att.score >= 95;
              cutoffBadge = (
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  competitive 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {competitive ? 'Target Cutoff Cleared' : 'Prelims Attempt'}
                </span>
              );
            }

            return (
              <div
                key={att.id}
                onClick={() => onViewAttempt(att)}
                className="cursor-pointer flex flex-col justify-between bi-card p-5 group hover:border-indigo-300 transition-all shadow-xs"
              >
                <div>
                  {/* Top row: Status & Duration */}
                  <div className="flex items-center justify-between gap-2">
                    {cutoffBadge || (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Evaluated Mock
                      </span>
                    )}
                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1 font-medium">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {formatTimeSeconds(att.durationSeconds)}
                    </span>
                  </div>

                  {/* Title & Date */}
                  <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                    {att.paperLabel}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    {formatDateTime(att.startedAt)}
                  </p>

                  {/* Score & Accuracy Box */}
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3.5 border border-slate-200/70">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Net Score</span>
                      <div className={`text-xl font-extrabold font-mono ${scoreColor} mt-0.5`}>
                        {att.score} <span className="text-xs text-slate-400 font-normal">/ {att.maxScore}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Accuracy</span>
                      <div className="text-xl font-extrabold text-teal-700 font-mono mt-0.5">
                        {att.accuracyPct}%
                      </div>
                    </div>
                  </div>

                  {/* Question breakdown row */}
                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500 px-1 font-semibold">
                    <span>
                      <span className="text-emerald-600">{att.correct}</span> Correct
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>
                      <span className="text-rose-600">{att.incorrect}</span> Wrong
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>
                      <span className="text-slate-400">{att.unattempted}</span> Skipped
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportAttemptAsMarkdown(att);
                    }}
                    title="Export Markdown Report"
                    className="cursor-pointer flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Export MD</span>
                  </button>

                  <span className="text-indigo-600 group-hover:text-indigo-800 font-bold text-xs flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Review Assessment <ChevronRight className="h-3.5 w-3.5" />
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

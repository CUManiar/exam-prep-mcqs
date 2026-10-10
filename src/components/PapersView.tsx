'use client';

import React, { useState } from 'react';
import { QuestionPaper } from '../lib/types';
import { BookOpen, Search, ExternalLink, Play, Clock, CheckCircle, FileText } from 'lucide-react';

interface PapersViewProps {
  papers: QuestionPaper[];
  onStartExam: (paper: QuestionPaper, mode: 'practice' | 'mock') => void;
  onNavigateUpload: () => void;
}

export function PapersView({ papers, onStartExam, onNavigateUpload }: PapersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const years = Array.from(new Set(papers.map(p => p.year))).sort().reverse();

  const filteredPapers = papers.filter(p => {
    const matchesSearch = p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = selectedYear === 'all' || p.year === selectedYear;
    return matchesSearch && matchesYear;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Question Papers</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse official prelims question papers with integrated answer keys and solutions
          </p>
        </div>
        <button
          onClick={onNavigateUpload}
          className="self-start sm:self-auto rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
        >
          + Upload New Paper
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search papers by subject, year or name..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Year Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedYear('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              selectedYear === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Years
          </button>
          {years.map(yr => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                selectedYear === yr
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Papers Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPapers.map(paper => {
          const keyCount = Object.keys(paper.answerKey).length;
          return (
            <div
              key={paper.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">
                    {paper.year}
                  </span>
                  <div className="flex items-center gap-2">
                    {paper.isCustom && (
                      <span className="text-[10px] uppercase font-semibold text-violet-400 bg-violet-950/40 border border-violet-800/40 px-1.5 py-0.5 rounded">
                        Custom
                      </span>
                    )}
                    <span className="text-xs font-medium text-indigo-400">
                      {paper.subject}
                    </span>
                  </div>
                </div>

                <h3 className="mt-3 text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {paper.label}
                </h3>

                <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    {keyCount > 0 ? `${keyCount} Questions` : 'Ready to solve'}
                  </span>
                  {paper.exsUrl && (
                    <span className="text-emerald-400 text-[11px] font-medium">
                      • Solutions Available
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-2 pt-4 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onStartExam(paper, 'practice')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Practice
                  </button>
                  <button
                    onClick={() => onStartExam(paper, 'mock')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 py-2.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Mock Test
                  </button>
                </div>

                <a
                  href={paper.qpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 py-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Original PDF
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

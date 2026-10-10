'use client';

import React, { useState } from 'react';
import { QuestionPaper, ExamCategory } from '../lib/types';
import { SUPPORTED_YEARS } from '../lib/defaults';
import { BookOpen, Search, ExternalLink, Play, Clock, FileText, Filter } from 'lucide-react';

interface PapersViewProps {
  papers: QuestionPaper[];
  onStartExam: (paper: QuestionPaper, mode: 'practice' | 'mock') => void;
  onNavigateUpload: () => void;
}

export function PapersView({ papers, onStartExam, onNavigateUpload }: PapersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'prelims' | 'mains'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const filteredPapers = papers.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesYear = selectedYear === 'all' || p.year === selectedYear;
    const matchesSubject = selectedSubject === 'all' || p.subject.toLowerCase().includes(selectedSubject.toLowerCase());
    const matchesSearch = p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesYear && matchesSubject && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Question Papers Repository</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and practice 15+ years of UPSC Prelims (GS 1 & CSAT) and Mains papers
          </p>
        </div>
        <button
          onClick={onNavigateUpload}
          className="self-start sm:self-auto rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
        >
          + Upload New Paper
        </button>
      </div>

      {/* Filter / Segregation Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search papers by keyword, subject or year..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Category Pill Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedCategory === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedCategory('prelims')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedCategory === 'prelims' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Prelims
          </button>
          <button
            onClick={() => setSelectedCategory('mains')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedCategory === 'mains' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mains
          </button>
        </div>

        {/* Year Dropdown */}
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Years</option>
          {SUPPORTED_YEARS.map(yr => (
            <option key={yr} value={yr}>{yr}</option>
          ))}
        </select>
      </div>

      {/* Papers Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPapers.map(paper => (
          <div
            key={paper.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm hover:border-indigo-500/40 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-200">
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

              <h3 className="mt-3 text-base font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                {paper.label}
              </h3>

              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  {paper.totalQuestions} Questions
                </span>
                <span>• {paper.timeMinutes} Mins</span>
                <span>• {paper.totalMarks} Marks</span>
              </div>

              {paper.examType === 'objective' && (
                <div className="mt-1 text-[11px] text-slate-500">
                  Marking: +{paper.correctMarks} / -{paper.incorrectMarks}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2 pt-4 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onStartExam(paper, 'practice')}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Practice
                </button>
                <button
                  onClick={() => onStartExam(paper, 'mock')}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 py-2.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Mock Exam
                </button>
              </div>

              <a
                href={paper.qpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 py-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                View Paper PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

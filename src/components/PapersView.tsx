'use client';

import React, { useState } from 'react';
import { QuestionPaper, ExamCategory } from '../lib/types';
import { SUPPORTED_YEARS } from '../lib/defaults';
import { BookOpen, Search, ExternalLink, Play, Clock, FileText, Filter } from 'lucide-react';

interface PapersViewProps {
  papers: QuestionPaper[];
  onStartExam: (paper: QuestionPaper, mode: 'practice' | 'mock') => void;
  onNavigateUpload: () => void;
  onDeletePaper?: (paperId: string) => void;
  onUpdatePaper?: (paper: QuestionPaper) => void;
}

export function PapersView({ papers, onStartExam, onNavigateUpload, onDeletePaper, onUpdatePaper }: PapersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'prelims' | 'mains'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Edit paper modal
  const [editingPaper, setEditingPaper] = useState<QuestionPaper | null>(null);
  const [editTotalQuestions, setEditTotalQuestions] = useState<number>(100);
  const [editTotalMarks, setEditTotalMarks] = useState<number>(200);
  const [editCorrectMarks, setEditCorrectMarks] = useState<number>(2.0);
  const [editIncorrectMarks, setEditIncorrectMarks] = useState<number>(0.667);
  const [editTimeMinutes, setEditTimeMinutes] = useState<number>(120);

  const handleOpenEdit = (p: QuestionPaper) => {
    setEditingPaper(p);
    setEditTotalQuestions(p.totalQuestions);
    setEditTotalMarks(p.totalMarks);
    setEditCorrectMarks(p.correctMarks);
    setEditIncorrectMarks(p.incorrectMarks);
    setEditTimeMinutes(p.timeMinutes);
  };

  const handleSaveEdit = () => {
    if (!editingPaper || !onUpdatePaper) return;
    const updated: QuestionPaper = {
      ...editingPaper,
      totalQuestions: editTotalQuestions,
      totalMarks: editTotalMarks,
      correctMarks: editCorrectMarks,
      incorrectMarks: editIncorrectMarks,
      timeMinutes: editTimeMinutes,
    };
    onUpdatePaper(updated);
    setEditingPaper(null);
  };

  const filteredPapers = papers.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesYear = selectedYear === 'all' || p.year === selectedYear;
    const matchesSubject = selectedSubject === 'all' || p.subject.toLowerCase().includes(selectedSubject.toLowerCase());
    const matchesSearch = p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesYear && matchesSubject && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-7 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-indigo-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 font-mono">
              Official Papers Repository
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Question Papers Repository</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Browse, test, and practice 15+ years of UPSC Prelims (GS 1 & CSAT) and Mains question papers
          </p>
        </div>
        <button
          onClick={onNavigateUpload}
          className="self-start sm:self-auto rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 transition-all flex items-center gap-1.5"
        >
          <span>+ Upload Custom Paper</span>
        </button>
      </div>

      {/* Filter / Segregation Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-card p-3.5 rounded-2xl">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search papers by keyword, subject or year..."
            className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Category Pill Switcher */}
        <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedCategory === 'all' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Papers
          </button>
          <button
            onClick={() => setSelectedCategory('prelims')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedCategory === 'prelims' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Prelims
          </button>
          <button
            onClick={() => setSelectedCategory('mains')}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              selectedCategory === 'mains' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mains
          </button>
        </div>

        {/* Year Dropdown */}
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="all">All Years (15+ Yrs)</option>
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
            className="flex flex-col justify-between glass-card glass-card-hover rounded-2xl p-5 shadow-sm group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-md border border-slate-700/80 bg-slate-800/80 px-2.5 py-0.5 text-xs font-bold text-slate-200 font-mono">
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
                <span className="flex items-center gap-1 font-mono">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  {paper.totalQuestions} Questions
                </span>
                <span>• {paper.timeMinutes} Mins</span>
                <span>• {paper.totalMarks} Marks</span>
              </div>

              {paper.examType === 'objective' && (
                <div className="mt-1.5 text-[11px] text-slate-400 font-mono">
                  Marking Scheme: <span className="text-emerald-400">+{paper.correctMarks}</span> / <span className="text-rose-400">-{paper.incorrectMarks}</span>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-2 pt-4 border-t border-slate-800/80">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onStartExam(paper, 'practice')}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Practice
                </button>
                <button
                  onClick={() => onStartExam(paper, 'mock')}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-xs font-bold text-white hover:from-indigo-500 hover:to-violet-500 transition-all shadow-md shadow-indigo-600/20"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Mock Exam
                </button>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={paper.qpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-700/80 bg-slate-800/60 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Preview PDF</span>
                </a>
                {paper.isCustom && onUpdatePaper && (
                  <button
                    onClick={() => handleOpenEdit(paper)}
                    className="rounded-xl border border-slate-700/80 bg-slate-800/60 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    title="Edit Paper Rules"
                  >
                    Edit
                  </button>
                )}
                {paper.isCustom && onDeletePaper && (
                  <button
                    onClick={() => onDeletePaper(paper.id)}
                    className="rounded-xl border border-rose-900/40 bg-rose-950/20 px-2.5 py-1.5 text-[11px] font-semibold text-rose-400 hover:bg-rose-900/40 transition-colors"
                    title="Delete Paper"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>


      {/* Edit Paper Rules Modal */}
      {editingPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              Edit Rules for {editingPaper.label}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Total Questions</label>
                <input
                  type="number"
                  value={editTotalQuestions}
                  onChange={e => setEditTotalQuestions(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Total Marks</label>
                <input
                  type="number"
                  value={editTotalMarks}
                  onChange={e => setEditTotalMarks(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Time (Minutes)</label>
                <input
                  type="number"
                  value={editTimeMinutes}
                  onChange={e => setEditTimeMinutes(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                />
              </div>

              {editingPaper.examType === 'objective' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Correct (+)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editCorrectMarks}
                      onChange={e => setEditCorrectMarks(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Penalty (-)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={editIncorrectMarks}
                      onChange={e => setEditIncorrectMarks(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingPaper(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

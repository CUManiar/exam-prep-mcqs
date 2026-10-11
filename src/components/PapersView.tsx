'use client';

import React, { useState } from 'react';
import { QuestionPaper } from '../lib/types';
import { SUPPORTED_YEARS, hasAnswerKey, hasSolution, parseAnswerKeyText } from '../lib/defaults';
import { attachToPaperOnServer } from '../lib/storage';
import { 
  BookOpen, 
  Search, 
  ExternalLink, 
  Play, 
  Clock, 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Key, 
  AlertCircle, 
  CheckCircle2, 
  FileUp, 
  X,
  AlertTriangle,
  Upload
} from 'lucide-react';

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

  // Edit paper rules modal
  const [editingPaper, setEditingPaper] = useState<QuestionPaper | null>(null);
  const [editTotalQuestions, setEditTotalQuestions] = useState<number>(100);
  const [editTotalMarks, setEditTotalMarks] = useState<number>(200);
  const [editCorrectMarks, setEditCorrectMarks] = useState<number>(2.0);
  const [editIncorrectMarks, setEditIncorrectMarks] = useState<number>(0.667);
  const [editTimeMinutes, setEditTimeMinutes] = useState<number>(120);

  // Dedicated Attach Modal (supports opening directly to 'key' or 'solution')
  const [attachingPaper, setAttachingPaper] = useState<QuestionPaper | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<'key' | 'solution'>('key');
  const [attachAkMode, setAttachAkMode] = useState<'paste' | 'upload'>('paste');
  const [attachAkText, setAttachAkText] = useState<string>('');
  const [attachAkFile, setAttachAkFile] = useState<File | null>(null);
  const [attachExsFile, setAttachExsFile] = useState<File | null>(null);
  const [attachPromptReason, setAttachPromptReason] = useState<string | null>(null);
  const [isSubmittingAttach, setIsSubmittingAttach] = useState<boolean>(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  // Delete confirmation modal
  const [deletingPaper, setDeletingPaper] = useState<QuestionPaper | null>(null);

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

  const handleOpenAttachModal = (paper: QuestionPaper, tab: 'key' | 'solution' = 'key', practicePrompt = false) => {
    setAttachingPaper(paper);
    setModalActiveTab(tab);
    setAttachAkText(paper.answerKeyText || '');
    setAttachAkFile(null);
    setAttachExsFile(null);
    setAttachError(null);
    setAttachPromptReason(
      practicePrompt
        ? 'Practice mode requires an answer key so you can see if choices are correct or wrong immediately. Attach an answer key below to unlock practice.'
        : null
    );
  };

  const handleSaveAttachment = async () => {
    if (!attachingPaper) return;
    setIsSubmittingAttach(true);
    setAttachError(null);

    try {
      const formData = new FormData();
      if (modalActiveTab === 'key') {
        if (attachAkMode === 'paste' && attachAkText.trim()) {
          formData.append('answerKeyText', attachAkText.trim());
        } else if (attachAkMode === 'upload' && attachAkFile) {
          formData.append('akFile', attachAkFile);
        }
      } else {
        if (attachExsFile) {
          formData.append('exsFile', attachExsFile);
        }
      }

      // Also attach both if both provided
      if (modalActiveTab === 'solution' && attachAkText.trim()) {
        formData.append('answerKeyText', attachAkText.trim());
      } else if (modalActiveTab === 'key' && attachExsFile) {
        formData.append('exsFile', attachExsFile);
      }

      const updated = await attachToPaperOnServer(attachingPaper.id, formData);
      if (updated) {
        if (onUpdatePaper) onUpdatePaper(updated);
        setAttachingPaper(null);
      } else {
        setAttachError('Failed to save attachment to server. Please verify files and try again.');
      }
    } catch (err: any) {
      setAttachError(err?.message || 'Failed to save attachment.');
    } finally {
      setIsSubmittingAttach(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingPaper || !onDeletePaper) return;
    onDeletePaper(deletingPaper.id);
    setDeletingPaper(null);
  };

  const filteredPapers = papers.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesYear = selectedYear === 'all' || p.year === selectedYear;
    const matchesSearch = p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesYear && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 font-mono">
              Official Papers Archive
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] text-slate-400 font-mono">
              {papers.length} Papers Available
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Question Papers</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Past 15+ years of UPSC Civil Services Prelims (General Studies & CSAT) and Mains papers. Attach answer keys or solutions directly to any paper.
          </p>
        </div>

        <button
          onClick={onNavigateUpload}
          className="cursor-pointer self-start sm:self-auto flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-700/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
        >
          <Plus className="h-3.5 w-3.5 text-indigo-400" />
          <span>Upload Paper</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-card p-3 rounded-2xl border border-white/[0.06]">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search papers by year, subject, keyword..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500/80 focus:outline-none transition-colors"
          />
        </div>

        {/* Category Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Papers
          </button>
          <button
            onClick={() => setSelectedCategory('prelims')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 transition-colors ${
              selectedCategory === 'prelims'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Prelims
          </button>
          <button
            onClick={() => setSelectedCategory('mains')}
            className={`cursor-pointer rounded-lg px-3 py-1.5 transition-colors ${
              selectedCategory === 'mains'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mains
          </button>
        </div>

        {/* Year Dropdown */}
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="cursor-pointer rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/80 transition-colors"
        >
          <option value="all">All Years</option>
          {SUPPORTED_YEARS.map(yr => (
            <option key={yr} value={yr}>{yr}</option>
          ))}
        </select>
      </div>

      {/* Papers Grid */}
      {filteredPapers.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border-dashed border-slate-800">
          <BookOpen className="mx-auto h-10 w-10 text-slate-600 mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">No question papers match your filter</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting search keyword or selecting &quot;All Years&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPapers.map(paper => {
            const keyPresent = hasAnswerKey(paper);
            const solutionPresent = hasSolution(paper);
            const keyCount = Object.keys(paper.answerKey || {}).length || (keyPresent ? paper.totalQuestions : 0);

            return (
              <div
                key={paper.id}
                className="flex flex-col justify-between glass-card glass-card-hover rounded-2xl p-5 border border-white/[0.06] group shadow-sm"
              >
                <div>
                  {/* Top Header Row: Year & Category Tag */}
                  <div className="flex items-center justify-between">
                    <span className="rounded-md border border-slate-800 bg-slate-900/90 px-2 py-0.5 text-xs font-semibold text-slate-300 font-mono">
                      {paper.year}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                      paper.examType === 'subjective'
                        ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                        : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                    }`}>
                      {paper.examType === 'subjective' ? 'Mains Subjective' : paper.subject}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="mt-3 text-base font-bold text-white group-hover:text-indigo-300 transition-colors leading-snug">
                    {paper.label}
                  </h3>

                  {/* Meta details */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <span>{paper.totalQuestions} Questions</span>
                    <span>•</span>
                    <span>{paper.timeMinutes} mins</span>
                    <span>•</span>
                    <span>{paper.totalMarks} Marks</span>
                  </div>

                  {/* Prominent Resource Status Indicators */}
                  <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                    {/* Answer Key Badge */}
                    {paper.examType === 'objective' && (
                      keyPresent ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Key Attached ({keyCount} Qs)</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                          <span>Key Missing</span>
                        </div>
                      )
                    )}

                    {/* Solution Badge */}
                    {solutionPresent ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Solution Attached</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-400 border border-slate-800">
                        <span>No Solution</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* All Action Buttons */}
                <div className="mt-5 space-y-2.5">
                  
                  {/* Row 1: Practice & Mock Exam */}
                  <div className="grid grid-cols-2 gap-2">
                    {keyPresent || paper.examType === 'subjective' ? (
                      <button
                        onClick={() => onStartExam(paper, 'practice')}
                        className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <Play className="h-3.5 w-3.5 text-slate-400" />
                        <span>Practice</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenAttachModal(paper, 'key', true)}
                        title="Practice mode requires an answer key. Click to attach answer key."
                        className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        <span>Practice (Needs Key)</span>
                      </button>
                    )}

                    <button
                      onClick={() => onStartExam(paper, 'mock')}
                      className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-semibold text-white transition-all shadow-sm"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Mock Exam</span>
                    </button>
                  </div>

                  {/* Row 2: Prominent Attach Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                    {paper.examType === 'objective' && (
                      <button
                        onClick={() => handleOpenAttachModal(paper, 'key')}
                        className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-indigo-500/50 hover:bg-slate-900 py-2 text-xs font-medium text-indigo-300 transition-colors"
                        title="Attach or replace answer key for automatic scoring"
                      >
                        <Key className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{keyPresent ? 'Update Key' : 'Attach Key'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenAttachModal(paper, 'solution')}
                      className={`cursor-pointer flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-indigo-500/50 hover:bg-slate-900 py-2 text-xs font-medium text-slate-300 transition-colors ${
                        paper.examType === 'subjective' ? 'col-span-2' : ''
                      }`}
                      title="Upload or replace official solution PDF booklet"
                    >
                      <FileUp className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{solutionPresent ? 'Update Solution' : 'Upload Solution'}</span>
                    </button>
                  </div>

                  {/* Row 3: Utility Links (PDF preview, Edit Rules, Delete) */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <a
                      href={paper.qpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-indigo-300 transition-colors"
                      title="Open Question Paper PDF in new tab"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>View PDF</span>
                    </a>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(paper)}
                        className="cursor-pointer text-[11px] text-slate-400 hover:text-white transition-colors"
                        title="Edit question count, marks and duration"
                      >
                        Edit Rules
                      </button>

                      {onDeletePaper && (
                        <button
                          onClick={() => setDeletingPaper(paper)}
                          className="cursor-pointer text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                          title="Delete this paper from repository"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attach Answer Key / Solution Modal */}
      {attachingPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="h-4 w-4 text-indigo-400" />
                  Attach Files for {attachingPaper.label}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Attach answer key or official solution PDF booklet</p>
              </div>
              <button
                onClick={() => setAttachingPaper(null)}
                className="cursor-pointer text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              {attachingPaper.examType === 'objective' && (
                <button
                  type="button"
                  onClick={() => setModalActiveTab('key')}
                  className={`cursor-pointer flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    modalActiveTab === 'key' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Key className="h-3.5 w-3.5" />
                  <span>1. Answer Key</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalActiveTab('solution')}
                className={`cursor-pointer flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                  modalActiveTab === 'solution' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>2. Solution PDF</span>
              </button>
            </div>

            {attachPromptReason && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{attachPromptReason}</span>
              </div>
            )}

            {attachError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{attachError}</span>
              </div>
            )}

            {/* Tab 1: Answer Key Form */}
            {modalActiveTab === 'key' && attachingPaper.examType === 'objective' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Answer Key Input</span>
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAttachAkMode('paste')}
                      className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                        attachAkMode === 'paste' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Paste Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttachAkMode('upload')}
                      className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                        attachAkMode === 'upload' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Upload .txt
                    </button>
                  </div>
                </div>

                {attachAkMode === 'upload' ? (
                  <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-xs font-medium text-slate-300 hover:border-indigo-500 transition-colors">
                    <FileUp className="h-6 w-6 text-indigo-400 mb-2" />
                    <span>{attachAkFile ? attachAkFile.name : 'Select .txt answer key file'}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Click to browse your device</span>
                    <input
                      type="file"
                      accept=".txt"
                      onChange={e => setAttachAkFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div>
                    <textarea
                      value={attachAkText}
                      onChange={e => setAttachAkText(e.target.value)}
                      placeholder={`1. a\n2. c\n3. d\n4. b\n...\n100. a`}
                      rows={6}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-3 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                      <span>Recognized: <strong className="text-emerald-400">{Object.keys(parseAnswerKeyText(attachAkText)).length}</strong> questions</span>
                      <span>Target: {attachingPaper.totalQuestions} Questions</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Solution PDF Form */}
            {modalActiveTab === 'solution' && (
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-semibold text-white block">Official Solution Booklet</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Upload a PDF containing detailed model answers and explanations.</p>
                </div>

                <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center hover:border-indigo-500 transition-colors">
                  <FileUp className="h-6 w-6 text-indigo-400 mb-2" />
                  <span className="text-xs font-medium text-slate-200 truncate max-w-[280px]">
                    {attachExsFile ? attachExsFile.name : (attachingPaper.exsUrl ? 'Choose new PDF to replace current solution' : 'Select solution .pdf document')}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">PDF format only</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setAttachExsFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAttachingPaper(null)}
                className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAttach || (modalActiveTab === 'key' && !attachAkText.trim() && !attachAkFile) || (modalActiveTab === 'solution' && !attachExsFile)}
                onClick={handleSaveAttachment}
                className="cursor-pointer px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white disabled:opacity-40 transition-all shadow-sm"
              >
                {isSubmittingAttach ? 'Saving...' : 'Save Attachment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Paper Confirmation Modal */}
      {deletingPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Question Paper?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to delete <span className="text-white font-medium">&quot;{deletingPaper.label}&quot;</span> from your question papers library? All associated PDF and answer key links will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingPaper(null)}
                className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="cursor-pointer px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-all shadow-sm"
              >
                Delete Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Paper Rules Modal */}
      {editingPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Edit Paper Rules
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{editingPaper.label}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Total Questions</label>
                <input
                  type="number"
                  value={editTotalQuestions}
                  onChange={e => setEditTotalQuestions(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Total Marks</label>
                <input
                  type="number"
                  value={editTotalMarks}
                  onChange={e => setEditTotalMarks(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Time (Minutes)</label>
                <input
                  type="number"
                  value={editTimeMinutes}
                  onChange={e => setEditTimeMinutes(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {editingPaper.examType === 'objective' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Correct Marks (+)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editCorrectMarks}
                      onChange={e => setEditCorrectMarks(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Negative Penalty (-)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={editIncorrectMarks}
                      onChange={e => setEditIncorrectMarks(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditingPaper(null)}
                className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="cursor-pointer px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-sm"
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

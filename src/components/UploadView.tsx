'use client';

import React, { useState } from 'react';
import { QuestionPaper, ExamType } from '../lib/types';
import { SUPPORTED_YEARS, hasAnswerKey, hasSolution } from '../lib/defaults';
import { saveCustomPaper, attachToPaperOnServer } from '../lib/storage';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  FileUp, 
  Sliders,
  Check,
  Edit3,
  ExternalLink,
  Trash2,
  Key,
  Paperclip,
  RefreshCw
} from 'lucide-react';

interface UploadViewProps {
  papers?: QuestionPaper[];
  onPaperUploaded: (paper: QuestionPaper) => void;
  onUpdatePaper?: (paper: QuestionPaper) => void;
  onDeletePaper?: (paperId: string) => void;
  onNavigatePapers: () => void;
}

export function UploadView({ 
  papers = [], 
  onPaperUploaded, 
  onUpdatePaper,
  onDeletePaper,
  onNavigatePapers 
}: UploadViewProps) {
  // Main View Mode: 'create' or 'update'
  const [viewMode, setViewMode] = useState<'create' | 'update'>('create');

  // Selected paper for update mode
  const [selectedPaperId, setSelectedPaperId] = useState<string>(papers[0]?.id || '');

  // Step 1: Exam Type
  const [examType, setExamType] = useState<ExamType>('objective');
  
  // Paper rules & metadata
  const [year, setYear] = useState<string>('2026');
  const [subjectPreset, setSubjectPreset] = useState<string>('GS I');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [paperIdentifier, setPaperIdentifier] = useState<string>('prelims_gs_i');
  
  const [totalQuestions, setTotalQuestions] = useState<number>(100);
  const [totalMarks, setTotalMarks] = useState<number>(200);
  const [correctMarks, setCorrectMarks] = useState<number>(2.0);
  const [incorrectMarks, setIncorrectMarks] = useState<number>(0.667);
  const [timeMinutes, setTimeMinutes] = useState<number>(120);

  // Files
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [akFile, setAkFile] = useState<File | null>(null);
  const [akMode, setAkMode] = useState<'upload' | 'paste'>('paste');
  const [akText, setAkText] = useState<string>('');
  const [exsFile, setExsFile] = useState<File | null>(null);

  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Auto-fill rules based on preset selection
  const handlePresetChange = (preset: string) => {
    setSubjectPreset(preset);
    if (preset === 'GS I') {
      setTotalQuestions(100);
      setTotalMarks(200);
      setCorrectMarks(2.0);
      setIncorrectMarks(0.667);
      setTimeMinutes(120);
      setPaperIdentifier('prelims_gs_i');
    } else if (preset === 'GS II CSAT') {
      setTotalQuestions(80);
      setTotalMarks(200);
      setCorrectMarks(2.5);
      setIncorrectMarks(0.833);
      setTimeMinutes(120);
      setPaperIdentifier('prelims_gsii_csat');
    } else if (preset.startsWith('Mains')) {
      setTotalQuestions(20);
      setTotalMarks(250);
      setCorrectMarks(0);
      setIncorrectMarks(0);
      setTimeMinutes(180);
      setPaperIdentifier(preset.toLowerCase().replace(/\s+/g, '_'));
    } else if (preset === 'Custom') {
      setPaperIdentifier(examType === 'objective' ? 'custom_objective_paper' : 'custom_mains_paper');
    }
  };

  const handleExamTypeChange = (type: ExamType) => {
    setExamType(type);
    if (type === 'objective') {
      handlePresetChange('GS I');
    } else {
      handlePresetChange('Mains GS I');
    }
  };

  // Load selected paper data into form when in Update mode
  const handleSelectPaperToUpdate = (paperId: string) => {
    setSelectedPaperId(paperId);
    const p = papers.find(x => x.id === paperId);
    if (!p) return;

    setYear(p.year);
    setExamType(p.examType);
    setTotalQuestions(p.totalQuestions);
    setTotalMarks(p.totalMarks);
    setCorrectMarks(p.correctMarks);
    setIncorrectMarks(p.incorrectMarks);
    setTimeMinutes(p.timeMinutes);
    setPaperIdentifier(p.id.replace(/^[0-9]+_/, ''));
    setSubjectPreset(p.subject);
    setAkText(p.answerKeyText || '');
    setQpFile(null);
    setAkFile(null);
    setExsFile(null);
    setStatusMsg(null);
  };

  const currentSelectedPaper = papers.find(p => p.id === selectedPaperId);

  const cleanYear = year.replace(/[^0-9]/g, '');
  const cleanName = paperIdentifier.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

  // Handle uploading NEW paper
  const handleUploadNewPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanYear || !cleanName) {
      setStatusMsg({ text: 'Please enter a valid Year and Paper Identifier.', isError: true });
      return;
    }
    if (!qpFile) {
      setStatusMsg({ text: 'Please attach a Question Paper PDF file.', isError: true });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const displaySubject = subjectPreset === 'Custom' 
        ? (customSubject.trim() || 'Custom Paper') 
        : subjectPreset;

      const formData = new FormData();
      formData.append('year', cleanYear);
      formData.append('identifier', cleanName);
      formData.append('examType', examType);
      formData.append('subject', displaySubject);
      formData.append('label', `${cleanYear} – ${displaySubject}`);
      formData.append('totalQuestions', String(totalQuestions || (examType === 'objective' ? 100 : 20)));
      formData.append('totalMarks', String(totalMarks || (examType === 'objective' ? 200 : 250)));
      formData.append('correctMarks', String(examType === 'objective' ? correctMarks : 0));
      formData.append('incorrectMarks', String(examType === 'objective' ? incorrectMarks : 0));
      formData.append('timeMinutes', String(timeMinutes || (examType === 'objective' ? 120 : 180)));
      
      formData.append('qpFile', qpFile);
      if (akFile && akMode === 'upload') {
        formData.append('akFile', akFile);
      }
      if (akText && akMode === 'paste') {
        formData.append('answerKeyText', akText);
      }
      if (exsFile) {
        formData.append('exsFile', exsFile);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Server failed to save paper.');
      }

      const newPaper: QuestionPaper = data.paper;
      saveCustomPaper(newPaper);
      onPaperUploaded(newPaper);

      setStatusMsg({ 
        text: `Paper saved successfully: "${newPaper.label}" (${newPaper.totalQuestions} Questions).` 
      });
      setTimeout(() => {
        onNavigatePapers();
      }, 1000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to save paper.', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle UPDATING existing paper files or rules
  const handleUpdateExistingPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedPaper) {
      setStatusMsg({ text: 'Please select a paper to update.', isError: true });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const formData = new FormData();
      if (qpFile) {
        formData.append('qpFile', qpFile);
      }
      if (akFile && akMode === 'upload') {
        formData.append('akFile', akFile);
      } else if (akMode === 'paste' && akText.trim()) {
        formData.append('answerKeyText', akText.trim());
      }
      if (exsFile) {
        formData.append('exsFile', exsFile);
      }

      formData.append('totalQuestions', String(totalQuestions));
      formData.append('totalMarks', String(totalMarks));
      formData.append('correctMarks', String(correctMarks));
      formData.append('incorrectMarks', String(incorrectMarks));
      formData.append('timeMinutes', String(timeMinutes));

      const updated = await attachToPaperOnServer(currentSelectedPaper.id, formData);
      if (updated) {
        if (onUpdatePaper) onUpdatePaper(updated);
        setStatusMsg({ text: `Successfully updated files and rules for "${updated.label}".` });
        setQpFile(null);
        setAkFile(null);
        setExsFile(null);
      } else {
        throw new Error('Failed to update paper files on server.');
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to update paper.', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 font-mono">
              Paper Intake & Management Studio
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Question Papers Studio</h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload new papers or correct files (Question Paper PDF, Answer Key, Solution) on existing papers.
          </p>
        </div>

        {/* View Mode Toggle: Upload New vs Update Existing */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => {
              setViewMode('create');
              setStatusMsg(null);
            }}
            className={`cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors ${
              viewMode === 'create'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Upload New Paper</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('update');
              if (papers.length > 0 && !selectedPaperId) {
                handleSelectPaperToUpdate(papers[0].id);
              } else if (selectedPaperId) {
                handleSelectPaperToUpdate(selectedPaperId);
              }
              setStatusMsg(null);
            }}
            className={`cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors ${
              viewMode === 'update'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Update / Correct Paper</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium border ${
          statusMsg.isError 
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
        }`}>
          {statusMsg.isError ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 1: UPDATE / CORRECT EXISTING PAPER */}
      {/* ============================================================== */}
      {viewMode === 'update' && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-5 border border-white/[0.06] space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Select Paper to Update or Correct
              </label>
              <select
                value={selectedPaperId}
                onChange={e => handleSelectPaperToUpdate(e.target.value)}
                className="cursor-pointer w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {papers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({p.year} • {p.subject} • {p.totalQuestions} Qs)
                  </option>
                ))}
              </select>
            </div>

            {currentSelectedPaper && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">Question Paper PDF</span>
                  <a
                    href={currentSelectedPaper.qpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 mt-0.5"
                  >
                    <ExternalLink className="h-3 w-3" /> Preview Current PDF
                  </a>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block">Answer Key Status</span>
                  {hasAnswerKey(currentSelectedPaper) ? (
                    <span className="text-emerald-400 font-semibold inline-flex items-center gap-1 mt-0.5">
                      <Check className="h-3 w-3" /> Attached ({Object.keys(currentSelectedPaper.answerKey || {}).length || currentSelectedPaper.totalQuestions} Qs)
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold inline-flex items-center gap-1 mt-0.5">
                      <AlertCircle className="h-3 w-3" /> No Answer Key
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block">Detailed Solution</span>
                  {hasSolution(currentSelectedPaper) ? (
                    <a
                      href={currentSelectedPaper.exsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 mt-0.5"
                    >
                      <ExternalLink className="h-3 w-3" /> Attached (PDF)
                    </a>
                  ) : (
                    <span className="text-slate-400 inline-flex items-center gap-1 mt-0.5">
                      Not Uploaded
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {currentSelectedPaper && (
            <form onSubmit={handleUpdateExistingPaper} className="space-y-6">
              
              {/* Replace Files Section */}
              <div className="glass-card rounded-2xl p-5 border border-white/[0.06] space-y-4">
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Replace or Upload Files
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Replace QP PDF */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                    <span className="text-xs font-semibold text-white block">
                      Replace Question Paper PDF
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Upload a new PDF to overwrite the existing paper document.
                    </p>

                    <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-center hover:border-indigo-500 transition-colors">
                      <FileUp className="h-5 w-5 text-indigo-400 mb-1" />
                      <span className="text-xs font-medium text-slate-200 truncate max-w-[220px]">
                        {qpFile ? qpFile.name : 'Choose Replacement PDF'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={e => setQpFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Replace Solution PDF */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                    <span className="text-xs font-semibold text-white block">
                      Upload / Replace Solution PDF
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Attach or update the official solution booklet.
                    </p>

                    <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-center hover:border-slate-500 transition-colors">
                      <FileUp className="h-5 w-5 text-slate-400 mb-1" />
                      <span className="text-xs font-medium text-slate-200 truncate max-w-[220px]">
                        {exsFile ? exsFile.name : 'Choose Solution PDF'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={e => setExsFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Answer Key (Objective) */}
                {currentSelectedPaper.examType === 'objective' && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-semibold text-white">Update Answer Key</h3>
                        <p className="text-[11px] text-slate-400">Provide corrected answer choices for automatic evaluation.</p>
                      </div>

                      <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setAkMode('paste')}
                          className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                            akMode === 'paste' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Paste Text
                        </button>
                        <button
                          type="button"
                          onClick={() => setAkMode('upload')}
                          className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                            akMode === 'upload' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Upload .txt
                        </button>
                      </div>
                    </div>

                    {akMode === 'upload' ? (
                      <label className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-xs font-medium text-slate-300 hover:border-slate-500">
                        <FileUp className="h-4 w-4 text-slate-400" />
                        <span>{akFile ? akFile.name : 'Select .txt answer key file'}</span>
                        <input
                          type="file"
                          accept=".txt"
                          onChange={e => setAkFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <textarea
                        value={akText}
                        onChange={e => setAkText(e.target.value)}
                        placeholder={`1. a\n2. c\n3. d\n4. b\n...\n100. a`}
                        rows={5}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/80 p-3 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Adjust Rules */}
              <div className="glass-card rounded-2xl p-5 border border-white/[0.06] space-y-4">
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Adjust Rules & Duration
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Total Questions</label>
                    <input
                      type="number"
                      value={totalQuestions}
                      onChange={e => setTotalQuestions(parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Duration (Mins)</label>
                    <input
                      type="number"
                      value={timeMinutes}
                      onChange={e => setTimeMinutes(parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  {currentSelectedPaper.examType === 'objective' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Correct Marks (+)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={correctMarks}
                          onChange={e => setCorrectMarks(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Penalty (-)</label>
                        <input
                          type="number"
                          step="0.001"
                          value={incorrectMarks}
                          onChange={e => setIncorrectMarks(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2">
                {onDeletePaper ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-900/40 bg-rose-950/20 text-xs font-semibold text-rose-400 hover:bg-rose-900/40 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete This Paper</span>
                  </button>
                ) : <div />}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-40 transition-all"
                >
                  <RefreshCw className={`h-4 w-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{isSubmitting ? 'Saving Updates...' : 'Save Updates & Replace Files'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Delete Confirm Modal */}
          {showDeleteConfirm && currentSelectedPaper && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Delete Question Paper?</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Are you sure you want to permanently delete &quot;{currentSelectedPaper.label}&quot;?
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeletePaper) onDeletePaper(currentSelectedPaper.id);
                      setShowDeleteConfirm(false);
                      onNavigatePapers();
                    }}
                    className="cursor-pointer px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
                  >
                    Delete Paper
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: UPLOAD NEW PAPER */}
      {/* ============================================================== */}
      {viewMode === 'create' && (
        <form onSubmit={handleUploadNewPaper} className="space-y-6">
          
          {/* Step 1: Exam Type Selector */}
          <div className="glass-card rounded-2xl p-5 border border-white/[0.06] space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Select Exam Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleExamTypeChange('objective')}
                className={`cursor-pointer p-4 rounded-xl border text-left transition-all ${
                  examType === 'objective'
                    ? 'border-indigo-500/80 bg-indigo-500/[0.08] text-white shadow-sm ring-1 ring-indigo-500/30'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white">Objective (Prelims)</span>
                  {examType === 'objective' && <Check className="h-4 w-4 text-indigo-400" />}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Multiple-choice questions with interactive OMR sheet, auto-evaluation, and negative marking.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleExamTypeChange('subjective')}
                className={`cursor-pointer p-4 rounded-xl border text-left transition-all ${
                  examType === 'subjective'
                    ? 'border-indigo-500/80 bg-indigo-500/[0.08] text-white shadow-sm ring-1 ring-indigo-500/30'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white">Subjective (Mains)</span>
                  {examType === 'subjective' && <Check className="h-4 w-4 text-indigo-400" />}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Descriptive answer writing questions with post-exam handwritten PDF submission.
                </p>
              </button>
            </div>
          </div>

          {/* Step 2: Paper Metadata & Scoring Rules */}
          <div className="glass-card rounded-2xl p-5 border border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                2. Paper Metadata & Rules
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Year Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Year
                </label>
                <select
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="cursor-pointer w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {SUPPORTED_YEARS.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Subject Preset */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Paper Preset
                </label>
                <select
                  value={subjectPreset}
                  onChange={e => handlePresetChange(e.target.value)}
                  className="cursor-pointer w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {examType === 'objective' ? (
                    <>
                      <option value="GS I">Prelims GS I (100 Qs • 200 Marks)</option>
                      <option value="GS II CSAT">Prelims GS II CSAT (80 Qs • 200 Marks)</option>
                      <option value="Custom">Custom Objective Paper</option>
                    </>
                  ) : (
                    <>
                      <option value="Mains GS I">Mains GS I (20 Qs • 250 Marks)</option>
                      <option value="Mains GS II">Mains GS II (20 Qs • 250 Marks)</option>
                      <option value="Mains GS III">Mains GS III (20 Qs • 250 Marks)</option>
                      <option value="Mains GS IV">Mains GS IV (Ethics • 250 Marks)</option>
                      <option value="Mains Essay">Mains Essay (250 Marks)</option>
                      <option value="Custom">Custom Subjective Paper</option>
                    </>
                  )}
                </select>
              </div>

              {/* Paper Identifier */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Identifier Tag
                </label>
                <input
                  type="text"
                  value={paperIdentifier}
                  onChange={e => setPaperIdentifier(e.target.value)}
                  placeholder="prelims_gs_i"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>
            </div>

            {/* Custom Subject Name if selected */}
            {subjectPreset === 'Custom' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Custom Subject / Paper Title
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={e => {
                    setCustomSubject(e.target.value);
                    const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
                    if (clean) setPaperIdentifier(clean);
                  }}
                  placeholder="e.g. Sociology Optional Paper 1"
                  className="w-full rounded-xl border border-indigo-500/40 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                  required
                />
              </div>
            )}

            {/* Marking scheme and rules grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Total Questions</label>
                <input
                  type="number"
                  value={totalQuestions}
                  onChange={e => setTotalQuestions(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Time (Minutes)</label>
                <input
                  type="number"
                  value={timeMinutes}
                  onChange={e => setTimeMinutes(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>

              {examType === 'objective' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Correct Marks (+)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={correctMarks}
                      onChange={e => setCorrectMarks(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">Penalty Marks (-)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={incorrectMarks}
                      onChange={e => setIncorrectMarks(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Step 3: Files & Attachments */}
          <div className="glass-card rounded-2xl p-5 border border-white/[0.06] space-y-4">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              3. Documents & Answer Keys
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Question Paper PDF */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Question Paper PDF</span>
                  <span className="text-[10px] text-indigo-400 font-mono">Required</span>
                </div>
                <p className="text-[11px] text-slate-400">Official question paper in PDF format.</p>

                <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-center hover:border-indigo-500 transition-colors">
                  <FileUp className="h-5 w-5 text-indigo-400 mb-1" />
                  <span className="text-xs font-medium text-slate-200 truncate max-w-[220px]">
                    {qpFile ? qpFile.name : 'Choose PDF File'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    {qpFile ? `${(qpFile.size / 1024 / 1024).toFixed(2)} MB` : 'Click to browse'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setQpFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Model Solution / Explanations PDF */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Solution Booklet</span>
                  <span className="text-[10px] text-slate-500 font-mono">Optional</span>
                </div>
                <p className="text-[11px] text-slate-400">Detailed explanation or answer hints PDF.</p>

                <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-center hover:border-slate-500 transition-colors">
                  <FileUp className="h-5 w-5 text-slate-400 mb-1" />
                  <span className="text-xs font-medium text-slate-200 truncate max-w-[220px]">
                    {exsFile ? exsFile.name : 'Choose Solution PDF'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    {exsFile ? `${(exsFile.size / 1024 / 1024).toFixed(2)} MB` : 'Optional'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setExsFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Answer Key (For Objective MCQs only) */}
            {examType === 'objective' && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-white">Answer Key</h3>
                    <p className="text-[11px] text-slate-400">Provide official answer choices for automatic evaluation.</p>
                  </div>

                  {/* Tab Switcher */}
                  <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAkMode('paste')}
                      className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                        akMode === 'paste' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Paste Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setAkMode('upload')}
                      className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                        akMode === 'upload' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Upload .txt
                    </button>
                  </div>
                </div>

                {akMode === 'upload' ? (
                  <label className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-xs font-medium text-slate-300 hover:border-slate-500">
                    <FileUp className="h-4 w-4 text-slate-400" />
                    <span>{akFile ? akFile.name : 'Select .txt answer key file'}</span>
                    <input
                      type="file"
                      accept=".txt"
                      onChange={e => setAkFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <textarea
                    value={akText}
                    onChange={e => setAkText(e.target.value)}
                    placeholder={`1. a\n2. c\n3. d\n4. b\n...\n100. a`}
                    rows={4}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/80 p-3 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !qpFile || !cleanYear || !cleanName}
              className="cursor-pointer flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-40 transition-all"
            >
              <UploadCloud className="h-4 w-4" />
              {isSubmitting ? 'Saving Paper...' : 'Save Paper to Repository'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { QuestionPaper, ExamType } from '../lib/types';
import { SUPPORTED_YEARS } from '../lib/defaults';
import { saveCustomPaper } from '../lib/storage';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  FileUp, 
  Sliders,
  Check,
  X
} from 'lucide-react';

interface UploadViewProps {
  onPaperUploaded: (paper: QuestionPaper) => void;
  onNavigatePapers: () => void;
}

export function UploadView({ onPaperUploaded, onNavigatePapers }: UploadViewProps) {
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

  const cleanYear = year.replace(/[^0-9]/g, '');
  const cleanName = paperIdentifier.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

  const handleUploadAll = async (e: React.FormEvent) => {
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            Paper Management
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Upload Question Paper</h1>
        <p className="text-xs text-slate-400 mt-1">
          Add custom Prelims (Objective MCQs with automated scoring) or Mains (Subjective Answer Writing) papers to your repository.
        </p>
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

      <form onSubmit={handleUploadAll} className="space-y-6">
        
        {/* Step 1: Exam Type Selector */}
        <div className="glass-card rounded-2xl p-5 border border-white/[0.06] space-y-3">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            1. Select Exam Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleExamTypeChange('objective')}
              className={`p-4 rounded-xl border text-left transition-all ${
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
              className={`p-4 rounded-xl border text-left transition-all ${
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
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/80"
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
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/80"
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
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/80 font-mono"
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
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/80"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Time (Minutes)</label>
              <input
                type="number"
                value={timeMinutes}
                onChange={e => setTimeMinutes(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/80"
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
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/80"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Penalty Marks (-)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={incorrectMarks}
                    onChange={e => setIncorrectMarks(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/80"
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

              <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-center cursor-pointer hover:border-indigo-500/80 transition-colors">
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

              <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-center cursor-pointer hover:border-slate-500 transition-colors">
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
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      akMode === 'paste' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setAkMode('upload')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      akMode === 'upload' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Upload .txt
                  </button>
                </div>
              </div>

              {akMode === 'upload' ? (
                <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-4 text-xs font-medium text-slate-300 cursor-pointer hover:border-slate-500">
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
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 p-3 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/80"
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
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            <UploadCloud className="h-4 w-4" />
            {isSubmitting ? 'Saving Paper...' : 'Save Paper to Repository'}
          </button>
        </div>
      </form>
    </div>
  );
}

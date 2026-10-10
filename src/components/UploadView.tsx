'use client';

import React, { useState } from 'react';
import { QuestionPaper, ExamType, ExamCategory } from '../lib/types';
import { parseAnswerKeyText, SUPPORTED_YEARS } from '../lib/defaults';
import { saveCustomPaper } from '../lib/storage';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  FileUp, 
  Sparkles, 
  BookOpen, 
  Sliders,
  HelpCircle
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
  const [paperIdentifier, setPaperIdentifier] = useState<string>('prelims_gs_i');
  
  const [totalQuestions, setTotalQuestions] = useState<number>(100);
  const [totalMarks, setTotalMarks] = useState<number>(200);
  const [correctMarks, setCorrectMarks] = useState<number>(2.0);
  const [incorrectMarks, setIncorrectMarks] = useState<number>(0.667);
  const [timeMinutes, setTimeMinutes] = useState<number>(120);

  // Files
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [akFile, setAkFile] = useState<File | null>(null);
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

  const qpFileName = cleanYear && cleanName ? `qp_${cleanYear}_${cleanName}.pdf` : 'qp_{year}_{file_name}.pdf';
  const akFileName = cleanYear && cleanName ? `ak_${cleanYear}_${cleanName}.txt` : 'ak_{year}_{file_name}.txt';
  const exsFileName = cleanYear && cleanName ? `exs_${cleanYear}_${cleanName}.pdf` : 'exs_{year}_{file_name}.pdf';

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
      const formData = new FormData();
      formData.append('year', cleanYear);
      formData.append('identifier', cleanName);
      formData.append('examType', examType);
      formData.append('subject', subjectPreset);
      formData.append('label', `${cleanYear} – ${subjectPreset}`);
      formData.append('totalQuestions', String(totalQuestions || (examType === 'objective' ? 100 : 20)));
      formData.append('totalMarks', String(totalMarks || (examType === 'objective' ? 200 : 250)));
      formData.append('correctMarks', String(examType === 'objective' ? correctMarks : 0));
      formData.append('incorrectMarks', String(examType === 'objective' ? incorrectMarks : 0));
      formData.append('timeMinutes', String(timeMinutes || (examType === 'objective' ? 120 : 180)));
      
      formData.append('qpFile', qpFile);
      if (akFile) {
        formData.append('akFile', akFile);
      }
      if (akText) {
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
        throw new Error(data.error || 'Server failed to save paper to disk.');
      }

      const newPaper: QuestionPaper = data.paper;
      saveCustomPaper(newPaper);
      onPaperUploaded(newPaper);

      setStatusMsg({ 
        text: `Successfully saved to data folder & repository: "${newPaper.label}" with ${newPaper.totalQuestions} Questions!` 
      });
      setTimeout(() => {
        onNavigatePapers();
      }, 1200);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to save paper.', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight">Upload Examination Paper</h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload Prelims (Objective MCQs) or Mains (Subjective Answer Writing) papers with automated rules
        </p>
      </div>

      {statusMsg && (
        <div className={`flex items-center gap-2 rounded-xl p-3.5 text-xs font-semibold ${
          statusMsg.isError 
            ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300' 
            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
        }`}>
          {statusMsg.isError ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleUploadAll} className="space-y-6">
        
        {/* Step 1: Exam Type Selector */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <label className="block text-xs font-bold text-white uppercase tracking-wider">
            1. Select Exam Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleExamTypeChange('objective')}
              className={`p-4 rounded-xl border text-left transition-all ${
                examType === 'objective'
                  ? 'border-indigo-500 bg-indigo-600/20 text-white ring-2 ring-indigo-500/40'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-sm text-white">Objective Exam (Prelims)</div>
              <div className="text-xs text-slate-400 mt-0.5">MCQ format with OMR sheet, live scoring & negative marking</div>
            </button>

            <button
              type="button"
              onClick={() => handleExamTypeChange('subjective')}
              className={`p-4 rounded-xl border text-left transition-all ${
                examType === 'subjective'
                  ? 'border-indigo-500 bg-indigo-600/20 text-white ring-2 ring-indigo-500/40'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-sm text-white">Subjective Exam (Mains)</div>
              <div className="text-xs text-slate-400 mt-0.5">Answer writing format with post-exam handwritten copy upload</div>
            </button>
          </div>
        </div>

        {/* Step 2: Paper Metadata & Paper-Specific Marking Rules */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-400" />
              2. Paper Parameters & Rules
            </h2>
            <span className="text-[11px] text-slate-400">Rules configured permanently for this paper</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Year Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Year <span className="text-rose-400">*</span>
              </label>
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {SUPPORTED_YEARS.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* Subject Preset */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Paper Preset <span className="text-rose-400">*</span>
              </label>
              <select
                value={subjectPreset}
                onChange={e => handlePresetChange(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {examType === 'objective' ? (
                  <>
                    <option value="GS I">Prelims GS I (100 Qs • 200 Marks)</option>
                    <option value="GS II CSAT">Prelims GS II CSAT (80 Qs • 200 Marks)</option>
                  </>
                ) : (
                  <>
                    <option value="Mains GS I">Mains GS I (20 Qs • 250 Marks)</option>
                    <option value="Mains GS II">Mains GS II (20 Qs • 250 Marks)</option>
                    <option value="Mains GS III">Mains GS III (20 Qs • 250 Marks)</option>
                    <option value="Mains GS IV">Mains GS IV (Ethics • 250 Marks)</option>
                    <option value="Mains Essay">Mains Essay (250 Marks)</option>
                  </>
                )}
              </select>
            </div>

            {/* Paper Identifier */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Identifier Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={paperIdentifier}
                onChange={e => setPaperIdentifier(e.target.value)}
                placeholder="prelims_gs_i"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* Exam Rules Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Total Questions</label>
              <input
                type="number"
                value={totalQuestions}
                onChange={e => setTotalQuestions(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Exam Duration (Mins)</label>
              <input
                type="number"
                value={timeMinutes}
                onChange={e => setTimeMinutes(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
              />
            </div>

            {examType === 'objective' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Correct Marks (+)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={correctMarks}
                    onChange={e => setCorrectMarks(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Penalty Marks (-)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={incorrectMarks}
                    onChange={e => setIncorrectMarks(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step 3: Files Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Question Paper PDF */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[11px] font-bold text-indigo-300">
                prefix: qp_
              </span>
              <span className="text-[11px] text-slate-500">.pdf only</span>
            </div>
            <h3 className="text-sm font-bold text-white">Question Paper (Required)</h3>
            <p className="text-[11px] text-slate-400">PDF of actual question paper</p>

            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/80 p-4 text-center cursor-pointer hover:border-indigo-500 transition-all">
              <FileUp className="h-6 w-6 text-indigo-400 mb-1" />
              <span className="text-xs font-semibold text-slate-200">
                {qpFile ? qpFile.name : 'Choose QP PDF'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {qpFile ? `${(qpFile.size / 1024 / 1024).toFixed(2)} MB` : 'Drop or browse'}
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                prefix: exs_
              </span>
              <span className="text-[11px] text-slate-500">.pdf</span>
            </div>
            <h3 className="text-sm font-bold text-white">Detailed Solution (Optional)</h3>
            <p className="text-[11px] text-slate-400">Official solution & explanations booklet</p>

            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/80 p-4 text-center cursor-pointer hover:border-amber-500 transition-all">
              <FileUp className="h-6 w-6 text-amber-400 mb-1" />
              <span className="text-xs font-semibold text-slate-200">
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

        {/* Step 4: Answer Key (For Objective MCQs only) */}
        {examType === 'objective' && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Answer Key (Upload File OR Paste Below)</h3>
              <span className="text-[11px] text-slate-400">prefix: ak_</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <label className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-200 cursor-pointer hover:bg-slate-800">
                <FileUp className="h-4 w-4 text-emerald-400" />
                {akFile ? akFile.name : 'Upload .txt Key'}
                <input
                  type="file"
                  accept=".txt"
                  onChange={e => setAkFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-slate-500 text-center">or copy-paste text below:</span>
            </div>

            <textarea
              value={akText}
              onChange={e => setAkText(e.target.value)}
              placeholder={`1. d\n2. a\n3. b\n4. d\n...\n100. c`}
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !qpFile || !cleanYear || !cleanName}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            <UploadCloud className="h-4 w-4" />
            {isSubmitting ? 'Configuring Paper...' : 'Save Paper to Repository'}
          </button>
        </div>
      </form>
    </div>
  );
}

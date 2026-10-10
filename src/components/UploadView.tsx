'use client';

import React, { useState } from 'react';
import { QuestionPaper } from '../lib/types';
import { parseAnswerKeyText } from '../lib/defaults';
import { saveCustomPaper } from '../lib/storage';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, FileUp, Sparkles } from 'lucide-react';

interface UploadViewProps {
  onPaperUploaded: (paper: QuestionPaper) => void;
  onNavigatePapers: () => void;
}

export function UploadView({ onPaperUploaded, onNavigatePapers }: UploadViewProps) {
  const [year, setYear] = useState<string>('2026');
  const [rawName, setRawName] = useState<string>('');
  
  // File states
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [akFile, setAkFile] = useState<File | null>(null);
  const [exsFile, setExsFile] = useState<File | null>(null);
  const [akText, setAkText] = useState<string>('');

  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Formatted file identifier: lowercase, alphanumeric and underscores only
  const cleanYear = year.replace(/[^0-9]/g, '');
  const cleanName = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

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
      setStatusMsg({ text: 'Please select a Question Paper PDF file.', isError: true });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      // Create local object URLs for Vercel/browser persistence
      const qpUrl = URL.createObjectURL(qpFile);
      let akUrl: string | undefined = undefined;
      let exsUrl: string | undefined = undefined;
      let answerKeyText = akText;

      if (akFile) {
        answerKeyText = await akFile.text();
        akUrl = URL.createObjectURL(akFile);
      }
      if (exsFile) {
        exsUrl = URL.createObjectURL(exsFile);
      }

      const parsedKey = parseAnswerKeyText(answerKeyText);

      // Formatted label
      const subjectPart = cleanName.split('_').map(w => w.toUpperCase()).join(' ');
      const label = `${cleanYear} – Prelims ${subjectPart}`;

      const newPaper: QuestionPaper = {
        id: `${cleanYear}_${cleanName}`,
        year: cleanYear,
        subject: subjectPart,
        label,
        qpUrl,
        akUrl,
        exsUrl,
        answerKeyText,
        answerKey: parsedKey,
        isCustom: true,
      };

      saveCustomPaper(newPaper);
      onPaperUploaded(newPaper);

      setStatusMsg({ text: `Successfully added paper: "${label}" with ${Object.keys(parsedKey).length} answer keys!` });
      setTimeout(() => {
        onNavigatePapers();
      }, 1200);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Failed to process files.', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white tracking-tight">Upload Question Paper</h1>
        <p className="text-xs text-slate-400 mt-1">
          Add any UPSC Prelims or mock paper with its corresponding answer key and explanations.
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
        
        {/* Metadata Row */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            1. Paper Identification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Year <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="2000"
                max="2099"
                value={year}
                onChange={e => setYear(e.target.value)}
                placeholder="2026"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Paper Identifier <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={rawName}
                onChange={e => setRawName(e.target.value)}
                placeholder="e.g. prelims_gs_i or prelims_gsii_csat"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                required
              />
              <span className="text-[11px] text-slate-500">
                Lowercase and underscores (e.g. prelims_gs_i). Shared across all 3 files.
              </span>
            </div>
          </div>

          {/* Live Filename Preview */}
          <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-indigo-300">Target File Name Format:</span>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              <span className="rounded bg-slate-950 px-2.5 py-1 text-indigo-400 border border-slate-800">
                {qpFileName}
              </span>
              <span className="rounded bg-slate-950 px-2.5 py-1 text-emerald-400 border border-slate-800">
                {akFileName}
              </span>
              <span className="rounded bg-slate-950 px-2.5 py-1 text-amber-400 border border-slate-800">
                {exsFileName}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Upload Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Section 1: Question Paper */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[11px] font-bold text-indigo-300">
                  prefix: qp_
                </span>
                <span className="text-[11px] font-medium text-slate-500">.pdf only</span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-white">Question Paper</h3>
              <p className="text-[11px] text-slate-400">Main PDF containing exam questions</p>
            </div>

            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/80 p-4 text-center cursor-pointer hover:border-indigo-500 hover:bg-slate-950 transition-all">
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

          {/* Section 2: Answer Key */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                  prefix: ak_
                </span>
                <span className="text-[11px] font-medium text-slate-500">.txt</span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-white">Answer Key</h3>
              <p className="text-[11px] text-slate-400">Official answers (1. A, 2. B, ...)</p>
            </div>

            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/80 p-4 text-center cursor-pointer hover:border-emerald-500 hover:bg-slate-950 transition-all">
              <FileUp className="h-6 w-6 text-emerald-400 mb-1" />
              <span className="text-xs font-semibold text-slate-200">
                {akFile ? akFile.name : 'Choose AK .txt'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {akFile ? `${akFile.size} bytes` : 'or paste below'}
              </span>
              <input
                type="file"
                accept=".txt"
                onChange={e => setAkFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>

          {/* Section 3: Solution */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                  prefix: exs_
                </span>
                <span className="text-[11px] font-medium text-slate-500">.pdf</span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-white">Explained Solution</h3>
              <p className="text-[11px] text-slate-400">Explanations & references (Optional)</p>
            </div>

            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/80 p-4 text-center cursor-pointer hover:border-amber-500 hover:bg-slate-950 transition-all">
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

        {/* Textarea for pasting Answer Key directly if no .txt file */}
        {!akFile && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Or Paste Answer Key Text Directly:
            </label>
            <textarea
              value={akText}
              onChange={e => setAkText(e.target.value)}
              placeholder={`1. B\n2. C\n3. A\n4. D\n...`}
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="submit"
            disabled={isSubmitting || !qpFile || !cleanYear || !cleanName}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            <UploadCloud className="h-4 w-4" />
            {isSubmitting ? 'Processing Paper...' : 'Add Paper to Library'}
          </button>
        </div>
      </form>
    </div>
  );
}

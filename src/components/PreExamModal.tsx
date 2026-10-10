'use client';

import React, { useState, useEffect } from 'react';
import { QuestionPaper, ExamSettings } from '../lib/types';
import { X, Play, Clock, CheckCircle2, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface PreExamModalProps {
  isOpen: boolean;
  paper: QuestionPaper | null;
  mode: 'practice' | 'mock';
  settings: ExamSettings;
  onClose: () => void;
  onStart: (config: {
    totalQuestions: number;
    correctMarks: number;
    incorrectMarks: number;
    timeMinutes: number;
    saveAsDefault: boolean;
  }) => void;
}

export function PreExamModal({
  isOpen,
  paper,
  mode,
  settings,
  onClose,
  onStart,
}: PreExamModalProps) {
  const [totalQuestions, setTotalQuestions] = useState<number>(settings.defaultTotalQuestions);
  const [correctMarks, setCorrectMarks] = useState<number>(settings.defaultCorrectMarks);
  const [incorrectMarks, setIncorrectMarks] = useState<number>(settings.defaultIncorrectMarks);
  const [timeMinutes, setTimeMinutes] = useState<number>(settings.defaultTimeMinutes);
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && paper) {
      const detectedCount = Object.keys(paper.answerKey).length;
      setTotalQuestions(detectedCount > 0 ? detectedCount : settings.defaultTotalQuestions);
      setCorrectMarks(settings.defaultCorrectMarks);
      setIncorrectMarks(settings.defaultIncorrectMarks);
      setTimeMinutes(settings.defaultTimeMinutes);
      setSaveAsDefault(false);
    }
  }, [isOpen, paper, settings]);

  if (!isOpen || !paper) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({
      totalQuestions: Math.max(1, totalQuestions || 80),
      correctMarks: Math.max(0.1, correctMarks || 2.0),
      incorrectMarks: Math.max(0, incorrectMarks || 0.66),
      timeMinutes: Math.max(1, timeMinutes || 120),
      saveAsDefault,
    });
  };

  const handleUseQuickDefaults = () => {
    onStart({
      totalQuestions: settings.defaultTotalQuestions,
      correctMarks: settings.defaultCorrectMarks,
      incorrectMarks: settings.defaultIncorrectMarks,
      timeMinutes: settings.defaultTimeMinutes,
      saveAsDefault: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                mode === 'practice' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
              }`}>
                {mode === 'practice' ? 'Practice Mode' : 'Mock Exam'}
              </span>
              <span className="text-xs text-slate-400">Exam Setup</span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-white">
              {paper.label}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick start banner */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-indigo-950/40 border border-indigo-800/40 p-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-400" />
            <span className="text-xs text-indigo-200">
              Default preset: {settings.defaultTotalQuestions} Qs • {settings.defaultTimeMinutes} mins
            </span>
          </div>
          <button
            type="button"
            onClick={handleUseQuickDefaults}
            className="rounded-lg bg-indigo-600/30 border border-indigo-500/40 px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors"
          >
            Start with Defaults
          </button>
        </div>

        {/* Config Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            {/* Total Questions */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Total Questions <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={totalQuestions}
                onChange={e => setTotalQuestions(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            {/* Time in Minutes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Time (Minutes) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="600"
                value={timeMinutes}
                onChange={e => setTimeMinutes(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Correct Marks */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Correct Marks (+) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={correctMarks}
                onChange={e => setCorrectMarks(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                required
              />
              <span className="text-[11px] text-slate-500">e.g. 2.0 or 2.5</span>
            </div>

            {/* Incorrect Marks */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Incorrect Marks (-) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={incorrectMarks}
                onChange={e => setIncorrectMarks(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                required
              />
              <span className="text-[11px] text-slate-500">e.g. 0.66 or 0.833</span>
            </div>
          </div>

          {/* Skipped marks (Always 0) */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-300">Skipped Questions</span>
              <p className="text-[11px] text-slate-500">Unanswered questions carry no penalty</p>
            </div>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-400">
              0 marks
            </span>
          </div>

          {/* Save as default check */}
          <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsDefault}
              onChange={e => setSaveAsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-300">
              Save these values as my default settings for future sessions
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
            >
              <Play className="h-4 w-4 fill-white" />
              Begin {mode === 'practice' ? 'Practice' : 'Mock Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

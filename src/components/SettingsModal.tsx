'use client';

import React, { useState } from 'react';
import { ExamSettings } from '../lib/types';
import { exportAllData, importAllData } from '../lib/storage';
import { X, Save, Download, Upload, Check, AlertCircle, Database, Sliders } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  settings: ExamSettings;
  onClose: () => void;
  onSave: (settings: ExamSettings) => void;
  onDataReload: () => void;
}

export function SettingsModal({
  isOpen,
  settings,
  onClose,
  onSave,
  onDataReload,
}: SettingsModalProps) {
  const [formData, setFormData] = useState<ExamSettings>({ ...settings });
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setStatusMsg({ text: 'Settings successfully saved!' });
    setTimeout(() => {
      setStatusMsg(null);
      onClose();
    }, 800);
  };

  const handleExport = () => {
    try {
      const dataStr = exportAllData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam-prep-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg({ text: 'Data exported successfully!' });
    } catch {
      setStatusMsg({ text: 'Failed to export backup data', isError: true });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content && importAllData(content)) {
        setStatusMsg({ text: 'Backup imported successfully!' });
        onDataReload();
      } else {
        setStatusMsg({ text: 'Failed to parse backup JSON file', isError: true });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Default Exam Settings</h2>
              <p className="text-xs text-slate-400">Configure global defaults to start exams faster</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {statusMsg && (
          <div className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
            statusMsg.isError 
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300' 
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
          }`}>
            {statusMsg.isError ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Total Questions
              </label>
              <input
                type="number"
                min="1"
                value={formData.defaultTotalQuestions}
                onChange={e => setFormData({ ...formData, defaultTotalQuestions: parseInt(e.target.value) || 80 })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Time (Minutes)
              </label>
              <input
                type="number"
                min="1"
                value={formData.defaultTimeMinutes}
                onChange={e => setFormData({ ...formData, defaultTimeMinutes: parseInt(e.target.value) || 120 })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Marks for Correct (+)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.defaultCorrectMarks}
                onChange={e => setFormData({ ...formData, defaultCorrectMarks: parseFloat(e.target.value) || 2.0 })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Marks for Incorrect (-)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={formData.defaultIncorrectMarks}
                onChange={e => setFormData({ ...formData, defaultIncorrectMarks: parseFloat(e.target.value) || 0.66 })}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Fast start bypass checkbox */}
          <div className="rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-3.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.fastStartWithDefaults}
                onChange={e => setFormData({ ...formData, fastStartWithDefaults: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-semibold text-indigo-200">
                  Fast Start: Skip setup dialog and start immediately with defaults
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  When checked, clicking Practice or Mock immediately launches the exam using these default values.
                </p>
              </div>
            </label>
          </div>

          {/* Data Backup & Sync */}
          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-300">Data Backup & Sync</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Your attempts, notes, and uploaded papers are stored persistently. Export anytime to sync across devices.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Export Backup (JSON)
              </button>

              <label className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 cursor-pointer transition-colors">
                <Upload className="h-3.5 w-3.5" />
                Import Backup
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

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
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

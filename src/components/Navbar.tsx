'use client';

import React, { useEffect, useState } from 'react';
import { ActivePage } from '../lib/types';
import { exportAllData, importAllData } from '../lib/storage';
import { 
  LayoutDashboard, 
  BookOpen, 
  History, 
  UploadCloud, 
  Clock, 
  Download, 
  Upload, 
  Database,
  Check
} from 'lucide-react';

interface NavbarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onDataReload?: () => void;
}

export function Navbar({ activePage, onNavigate, onDataReload }: NavbarProps) {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [showBackupMenu, setShowBackupMenu] = useState<boolean>(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setCurrentDateTime(`${dateStr} • ${timeStr}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    try {
      const dataStr = exportAllData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upsc-prep-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg('Backup downloaded!');
      setTimeout(() => setBackupMsg(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content && importAllData(content)) {
        setBackupMsg('Imported successfully!');
        if (onDataReload) onDataReload();
        setTimeout(() => setBackupMsg(null), 2000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        
        {/* Brand / Logo with UPSC Emblem */}
        <button 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 text-left group focus:outline-none shrink-0"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 p-1 group-hover:scale-105 transition-transform overflow-hidden shadow-inner">
            <img
              src="/upsc_logo.png"
              alt="UPSC Logo"
              className="h-full w-full object-contain filter drop-shadow"
            />
          </div>
          <div>
            <span className="block text-sm font-extrabold tracking-tight text-white group-hover:text-indigo-400 transition-colors whitespace-nowrap">
              UPSC Prep Hub
            </span>
            <span className="block text-[10px] font-semibold text-indigo-400 uppercase tracking-wider whitespace-nowrap">
              Prelims • Mains
            </span>
          </div>
        </button>

        {/* Navigation Links - Single line, no wrapping */}
        <nav className="hidden lg:flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              activePage === 'dashboard'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('papers')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              activePage === 'papers'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span>Question Papers</span>
          </button>

          <button
            onClick={() => onNavigate('history')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              activePage === 'history' || activePage === 'attempt-detail'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <History className="h-4 w-4 shrink-0" />
            <span>Mock History</span>
          </button>

          <button
            onClick={() => onNavigate('upload')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              activePage === 'upload'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="h-4 w-4 shrink-0" />
            <span>Upload Paper</span>
          </button>
        </nav>

        {/* Live Date/Time & Backup */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Always Visible Current Date & Time (One Line Only) */}
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-mono text-indigo-300 shadow-inner whitespace-nowrap shrink-0">
            <Clock className="h-3.5 w-3.5 text-indigo-400 animate-pulse shrink-0" />
            <span>{currentDateTime || 'Loading time...'}</span>
          </div>

          {/* Backup & Sync button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowBackupMenu(!showBackupMenu)}
              title="Backup & Export Data"
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:bg-slate-800 transition-all focus:outline-none whitespace-nowrap"
            >
              <Database className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Backup</span>
            </button>

            {showBackupMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-50 animate-in fade-in">
                {backupMsg && (
                  <div className="mb-2 rounded-lg bg-emerald-500/10 p-1.5 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> {backupMsg}
                  </div>
                )}
                <button
                  onClick={handleExport}
                  className="flex w-full items-center gap-2 rounded-xl p-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 text-left"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-400" /> Export JSON
                </button>
                <label className="flex w-full items-center gap-2 rounded-xl p-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 text-left cursor-pointer">
                  <Upload className="h-3.5 w-3.5 text-emerald-400" /> Import JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Medium Screen Nav Bar (Tablet / Smaller desktop) */}
      <div className="flex lg:hidden items-center justify-around border-t border-slate-900 bg-slate-950 px-3 py-2">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
            activePage === 'dashboard' ? 'text-indigo-400 bg-indigo-950/40' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </button>
        <button
          onClick={() => onNavigate('papers')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
            activePage === 'papers' ? 'text-indigo-400 bg-indigo-950/40' : 'text-slate-400'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Papers
        </button>
        <button
          onClick={() => onNavigate('history')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
            activePage === 'history' || activePage === 'attempt-detail' ? 'text-indigo-400 bg-indigo-950/40' : 'text-slate-400'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          History
        </button>
        <button
          onClick={() => onNavigate('upload')}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
            activePage === 'upload' ? 'text-indigo-400 bg-indigo-950/40' : 'text-slate-400'
          }`}
        >
          <UploadCloud className="h-3.5 w-3.5" />
          Upload
        </button>
      </div>
    </header>
  );
}

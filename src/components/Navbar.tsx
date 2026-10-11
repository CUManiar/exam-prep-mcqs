'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  activePage?: ActivePage;
  onNavigate?: (page: ActivePage) => void;
  onDataReload?: () => void;
  isInExam?: boolean;
}

export function Navbar({ activePage, onNavigate, onDataReload, isInExam: propIsInExam }: NavbarProps) {
  const pathname = usePathname();
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [showBackupMenu, setShowBackupMenu] = useState<boolean>(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  // Derive active tab from pathname
  const currentTab = (() => {
    if (activePage) return activePage;
    if (!pathname || pathname === '/') return 'dashboard';
    if (pathname.startsWith('/papers')) return 'papers';
    if (pathname.startsWith('/history')) return 'history';
    if (pathname.startsWith('/upload')) return 'upload';
    if (pathname.startsWith('/exam')) return 'session';
    return 'dashboard';
  })();

  const isInExam = propIsInExam || (pathname ? pathname.startsWith('/exam') : false);

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
      const blob = new Blob(dataStr ? [dataStr] : [], { type: 'application/json' });
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[0_1px_2px_0_rgba(0,0,0,0.03)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        
        {/* Brand / Logo with UPSC Emblem */}
        <Link 
          href="/"
          onClick={() => onNavigate && onNavigate('dashboard')}
          className="cursor-pointer flex items-center gap-3 text-left group focus:outline-none shrink-0"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 p-1 group-hover:scale-105 transition-transform overflow-hidden shadow-xs">
            <img
              src="/upsc_logo.png"
              alt="UPSC Logo"
              className="h-full w-full object-contain filter drop-shadow-xs"
            />
          </div>
          <div>
            <span className="block text-sm font-extrabold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
              UPSC Prep Hub
            </span>
            <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider whitespace-nowrap">
              Prelims • Mains
            </span>
          </div>
        </Link>

        {/* Navigation Links - Single line, spacious & clear */}
        <nav className="hidden lg:flex items-center gap-1.5 shrink-0">
          <Link
            href="/"
            onClick={() => onNavigate && onNavigate('dashboard')}
            className={`cursor-pointer flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              currentTab === 'dashboard'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/papers"
            onClick={() => onNavigate && onNavigate('papers')}
            className={`cursor-pointer flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              currentTab === 'papers'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span>Question Papers</span>
          </Link>

          <Link
            href="/history"
            onClick={() => onNavigate && onNavigate('history')}
            className={`cursor-pointer flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              currentTab === 'history' || currentTab === 'attempt-detail'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <History className="h-4 w-4 shrink-0" />
            <span>Mock History</span>
          </Link>

          <Link
            href="/upload"
            onClick={() => onNavigate && onNavigate('upload')}
            className={`cursor-pointer flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              currentTab === 'upload'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="h-4 w-4 shrink-0" />
            <span>Upload Paper</span>
          </Link>
        </nav>

        {/* Live Date/Time & Backup */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Always Visible Current Date & Time (One Line Only) */}
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs font-mono text-slate-700 shadow-xs whitespace-nowrap shrink-0">
            <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>{currentDateTime || 'Loading time...'}</span>
          </div>

          {/* Backup & Sync button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowBackupMenu(!showBackupMenu)}
              title="Backup & Export Data"
              className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all focus:outline-none whitespace-nowrap shadow-xs"
            >
              <Database className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Backup</span>
            </button>

            {showBackupMenu && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl z-50 animate-in fade-in">
                <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-semibold text-slate-500 flex items-center justify-between">
                  <span>Target Env</span>
                  <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    {(typeof window !== 'undefined' && localStorage.getItem('exam_prep_environment')) || 'PROD'}
                  </span>
                </div>
                {backupMsg && (
                  <div className="mb-2 rounded-lg bg-emerald-50 border border-emerald-200/60 p-1.5 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> {backupMsg}
                  </div>
                )}
                <button
                  onClick={handleExport}
                  className="cursor-pointer flex w-full items-center gap-2.5 rounded-xl p-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 text-left transition-colors"
                >
                  <Download className="h-4 w-4 text-indigo-600" /> Export JSON
                </button>
                <label className="cursor-pointer flex w-full items-center gap-2.5 rounded-xl p-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 text-left transition-colors">
                  <Upload className="h-4 w-4 text-emerald-600" /> Import JSON
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

      {/* Medium/Mobile Nav Bar - Hidden during active exam session */}
      {!isInExam && (
        <div className="flex lg:hidden items-center justify-around border-t border-slate-200 bg-white px-3 py-2">
          <Link
            href="/"
            onClick={() => onNavigate && onNavigate('dashboard')}
            className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
              currentTab === 'dashboard' ? 'text-indigo-700 bg-indigo-50 font-bold' : 'text-slate-600'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <Link
            href="/papers"
            onClick={() => onNavigate && onNavigate('papers')}
            className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
              currentTab === 'papers' ? 'text-indigo-700 bg-indigo-50 font-bold' : 'text-slate-600'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Papers
          </Link>
          <Link
            href="/history"
            onClick={() => onNavigate && onNavigate('history')}
            className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
              currentTab === 'history' || currentTab === 'attempt-detail' ? 'text-indigo-700 bg-indigo-50 font-bold' : 'text-slate-600'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            History
          </Link>
          <Link
            href="/upload"
            onClick={() => onNavigate && onNavigate('upload')}
            className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
              currentTab === 'upload' ? 'text-indigo-700 bg-indigo-50 font-bold' : 'text-slate-600'
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Upload
          </Link>
        </div>
      )}
    </header>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { ActivePage } from '../lib/types';
import { 
  LayoutDashboard, 
  BookOpen, 
  History, 
  UploadCloud, 
  Settings, 
  Clock, 
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface NavbarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onOpenSettings: () => void;
  isInExam?: boolean;
}

export function Navbar({ activePage, onNavigate, onOpenSettings, isInExam }: NavbarProps) {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');

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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                ExamPrep MCQs
              </span>
              <span className="block text-[11px] font-medium text-slate-400">
                UPSC & Competitive Prep
              </span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 ml-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activePage === 'dashboard'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>

            <button
              onClick={() => onNavigate('papers')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activePage === 'papers'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Question Papers
            </button>

            <button
              onClick={() => onNavigate('history')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activePage === 'history'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <History className="h-4 w-4" />
              History & Review
            </button>

            <button
              onClick={() => onNavigate('upload')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activePage === 'upload'
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="h-4 w-4" />
              Upload
            </button>
          </nav>
        </div>

        {/* Live Date/Time & Controls */}
        <div className="flex items-center gap-3">
          
          {/* Always Visible Current Date & Time */}
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-mono text-indigo-300 shadow-inner">
            <Clock className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span>{currentDateTime || 'Loading time...'}</span>
          </div>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            title="Settings & Defaults"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 transition-all focus:outline-none"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="flex md:hidden items-center justify-around border-t border-slate-900 bg-slate-950 px-2 py-2">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center gap-1 p-1.5 text-xs font-medium ${
            activePage === 'dashboard' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </button>
        <button
          onClick={() => onNavigate('papers')}
          className={`flex flex-col items-center gap-1 p-1.5 text-xs font-medium ${
            activePage === 'papers' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Papers
        </button>
        <button
          onClick={() => onNavigate('history')}
          className={`flex flex-col items-center gap-1 p-1.5 text-xs font-medium ${
            activePage === 'history' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <History className="h-4 w-4" />
          History
        </button>
        <button
          onClick={() => onNavigate('upload')}
          className={`flex flex-col items-center gap-1 p-1.5 text-xs font-medium ${
            activePage === 'upload' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <UploadCloud className="h-4 w-4" />
          Upload
        </button>
      </div>
    </header>
  );
}

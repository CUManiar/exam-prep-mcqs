'use client';

import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { PdfViewer } from './PdfViewer';

interface DetailedSolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string;
  paperTitle: string;
}

export function DetailedSolutionModal({
  isOpen,
  onClose,
  pdfUrl,
  paperTitle,
}: DetailedSolutionModalProps) {
  if (!isOpen || !pdfUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[92vh] flex flex-col rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Detailed Solution</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-md">{paperTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Embedded PDF Viewer */}
        <PdfViewer
          url={pdfUrl}
          title={paperTitle || 'Detailed Solution'}
          showToolbar={true}
          className="flex-1 w-full h-full min-h-0"
        />
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Attempt, QuestionPaper } from "../../lib/types";
import { formatDateTime } from "../../lib/defaults";
import {
  ArrowLeft,
  Columns,
  BookOpen,
  Download,
  ChevronDown,
  FileText,
  Printer,
  Copy,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Check,
} from "lucide-react";
import {
  exportAttemptAsPrintPDF,
  exportAttemptWithQuestionPaperAsPrintPDF,
  exportAttemptAsMarkdown,
  exportAttemptAsJSON,
  copyAttemptSummaryToClipboard,
} from "../../lib/exportUtils";

interface ReviewHeaderProps {
  attempt: Attempt;
  displayPaperTitle: string;
  matchedPaper?: QuestionPaper;
  paperDeleted: boolean;
  canPreviewPaper: boolean;
  showPaperSplit: boolean;
  onTogglePaperSplit: () => void;
  onBack: () => void;
  onDelete: (id: string) => void;
  onReattempt?: () => void;
  onOpenSolutionModal?: () => void;
  onOpenSubmissionModal?: () => void;
  effectiveMaxScore: number;
}

export function ReviewHeader({
  attempt,
  displayPaperTitle,
  matchedPaper,
  paperDeleted,
  canPreviewPaper,
  showPaperSplit,
  onTogglePaperSplit,
  onBack,
  onDelete,
  onReattempt,
  onOpenSolutionModal,
  onOpenSubmissionModal,
  effectiveMaxScore,
}: ReviewHeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [isExportingPacket, setIsExportingPacket] = useState(false);

  const handleCopySummary = async () => {
    const success = await copyAttemptSummaryToClipboard(attempt);
    if (success) {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  };

  const handlePrint = () => {
    exportAttemptAsPrintPDF(
      attempt,
      matchedPaper?.explanations,
      displayPaperTitle,
      effectiveMaxScore,
    );
  };

  const handlePrintQuestionPaperAndSummary = async () => {
    if (!matchedPaper) return;
    setIsExportingPacket(true);
    try {
      await exportAttemptWithQuestionPaperAsPrintPDF(
        attempt,
        matchedPaper,
        matchedPaper.explanations,
        displayPaperTitle,
        effectiveMaxScore,
      );
    } finally {
      setIsExportingPacket(false);
    }
  };

  return (
    <header className="screen-only flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/90 bg-white/80 backdrop-blur-md px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-2xs">
      {/* Title & Metadata */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Go back"
          title="Return to tests history"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
            <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] bg-slate-100 px-2 py-0.5 rounded-md">
              {attempt.mode === "mock" ? "Timed Mock" : "Practice"}
            </span>
            <span aria-hidden="true" className="text-slate-300">
              •
            </span>
            <span>{formatDateTime(attempt.startedAt)}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate leading-tight">
            {displayPaperTitle}
          </h1>
          {paperDeleted && (
            <span
              className="mt-0.5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-700"
              title="Original paper record was modified or removed, but local results are fully preserved."
            >
              <AlertTriangle className="h-3 w-3" />
              Original paper detached
            </span>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex shrink-0 items-center justify-end gap-2 flex-wrap">
        {/* Paper split toggle (desktop & tablet) */}
        {canPreviewPaper && (
          <button
            onClick={onTogglePaperSplit}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              showPaperSplit
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            }`}
            title="Toggle original Question Paper preview"
          >
            <Columns className="h-3.5 w-3.5" />
            <span>{showPaperSplit ? "Hide paper" : "View paper"}</span>
          </button>
        )}

        {/* Model Solution PDF modal trigger */}
        {matchedPaper?.exsUrl && onOpenSolutionModal && (
          <button
            onClick={onOpenSolutionModal}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
            <span>Solution Key</span>
          </button>
        )}

        {/* Scanned booklet modal trigger */}
        {attempt.userSubmissionPdfUrl && onOpenSubmissionModal && (
          <button
            onClick={onOpenSubmissionModal}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-violet-600" />
            <span>Answer Copy</span>
          </button>
        )}

        {/* Re-attempt test button */}
        {onReattempt && (
          <button
            onClick={onReattempt}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer shadow-2xs"
            title="Start a fresh attempt for this paper"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Re-attempt</span>
          </button>
        )}

        {/* Export dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white transition-all cursor-pointer shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showExportMenu ? "rotate-180" : ""}`}
            />
          </button>

          {showExportMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowExportMenu(false)}
              />
              <div className="absolute right-0 mt-2 z-50 min-w-[280px] w-max max-w-xs rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl space-y-0.5 animate-in fade-in zoom-in-95">
                {matchedPaper && canPreviewPaper && (
                  <button
                    onClick={() => {
                      void handlePrintQuestionPaperAndSummary();
                      setShowExportMenu(false);
                    }}
                    disabled={isExportingPacket}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap disabled:cursor-wait disabled:opacity-60"
                  >
                    <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>
                      {isExportingPacket
                        ? "Preparing complete packet..."
                        : "Question paper & summary (PDF)"}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => {
                    handlePrint();
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Printer className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Download assessment summary (PDF)</span>
                </button>

                <button
                  onClick={() => {
                    void handleCopySummary();
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Copy className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Copy assessment summary (Markdown)</span>
                </button>

                <button
                  onClick={() => {
                    exportAttemptAsMarkdown(attempt);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Download report (Markdown)</span>
                </button>

                <button
                  onClick={() => {
                    exportAttemptAsJSON(attempt);
                    setShowExportMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Download raw attempt (JSON)</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Delete attempt */}
        <button
          onClick={() => onDelete(attempt.id)}
          className="flex items-center justify-center h-8 w-8 rounded-xl border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shadow-2xs"
          title="Delete this evaluation attempt"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <Check className="h-4 w-4 text-emerald-400" />
          Assessment summary copied to clipboard!
        </div>
      )}
    </header>
  );
}

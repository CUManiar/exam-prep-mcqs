"use client";

import { useState } from "react";
import { Download, FileText, Check, X, BookOpen, Layers } from "lucide-react";
import { StoredSession } from "./RevisionView";
import {
  exportRevisionNotesToMarkdown,
  exportRevisionNotesToPdf,
} from "../../lib/exportUtils";
import { ModalShell } from "../ModalShell";

interface NotesExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: StoredSession[];
  activeSessionId: string;
}

export function NotesExportModal({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
}: NotesExportModalProps) {
  const [scope, setScope] = useState<"all" | "active" | "stage">("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [exportFormat, setExportFormat] = useState<"markdown" | "pdf">(
    "markdown",
  );

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    if (scope === "active") return s.id === activeSessionId;
    if (scope === "stage" && selectedStage !== "all")
      return s.stage === selectedStage;
    return true;
  });

  const totalNotesCount = filteredSessions.reduce(
    (acc, s) => acc + s.messages.filter((m) => m.role === "assistant").length,
    0,
  );

  const handleExecuteExport = () => {
    if (!filteredSessions.length) return;

    if (exportFormat === "markdown") {
      exportRevisionNotesToMarkdown(filteredSessions);
    } else {
      exportRevisionNotesToPdf(filteredSessions);
    }

    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="export-notes-title"
      className="max-w-lg p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2
              id="export-notes-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              Export Revision Notes Dossier
            </h2>
          </div>
        </div>
        {/* Scope Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Export Scope
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                scope === "all"
                  ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              All Sessions ({sessions.length})
            </button>

            <button
              type="button"
              onClick={() => setScope("active")}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                scope === "active"
                  ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              Current Chat
            </button>

            <button
              type="button"
              onClick={() => setScope("stage")}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                scope === "stage"
                  ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                  : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              By Prep Stage
            </button>
          </div>
        </div>

        {/* Stage Filter if scope === 'stage' */}
        {scope === "stage" && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Select Exam Stage
            </label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="all">All Stages</option>
              <option value="prelims">Prelims Elimination</option>
              <option value="mains">Mains Answer Frameworks</option>
              <option value="optional">Optional Subject</option>
              <option value="csat">CSAT Formulas & Hacks</option>
              <option value="concept">First-Principles Concepts</option>
            </select>
          </div>
        )}

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setExportFormat("markdown")}
              className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                exportFormat === "markdown"
                  ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200"
                  : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              <FileText className="h-4 w-4 mt-0.5 text-indigo-600" />
              <div>
                <span className="text-xs font-bold block">Markdown (.md)</span>
                <span className="text-[11px] text-slate-500">
                  Ideal for Obsidian, Notion, or personal digital notes.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat("pdf")}
              className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                exportFormat === "pdf"
                  ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200"
                  : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              <Download className="h-4 w-4 mt-0.5 text-indigo-600" />
              <div>
                <span className="text-xs font-bold block">Printable PDF</span>
                <span className="text-[11px] text-slate-500">
                  Print-ready booklet with table of contents & page numbers.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Summary Dossier Box */}
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
          <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
            <span>Dossier Summary</span>
            <span className="text-indigo-600 dark:text-indigo-400">
              {filteredSessions.length} Topics · {totalNotesCount} AI Notes
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Bundles questions, model answers, elimination traps, and formulas in
            one organized document.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteExport}
            disabled={filteredSessions.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download All Notes ({filteredSessions.length})</span>
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

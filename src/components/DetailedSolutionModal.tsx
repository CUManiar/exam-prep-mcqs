"use client";

import { BookOpen, X } from "lucide-react";
import { PdfViewer } from "./PdfViewer";
import { ModalShell } from "./ModalShell";

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
  if (!pdfUrl) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="solution-modal-title"
      describedBy="solution-modal-description"
      showCloseButton={false}
      className="flex h-[92vh] max-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden p-0"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <BookOpen aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2
              id="solution-modal-title"
              data-modal-initial-focus
              tabIndex={-1}
              className="text-sm font-semibold text-slate-900"
            >
              Solution booklet
            </h2>
            <p
              id="solution-modal-description"
              className="truncate text-xs text-slate-500"
            >
              {paperTitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close solution booklet"
          className="modal-close-static"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </header>
      <PdfViewer
        url={pdfUrl}
        title={paperTitle || "Detailed Solution"}
        showToolbar
        className="h-full min-h-0 w-full flex-1 bg-slate-100"
      />
    </ModalShell>
  );
}

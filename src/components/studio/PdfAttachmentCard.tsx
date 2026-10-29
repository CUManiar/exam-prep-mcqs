"use client";

import React from "react";
import { FileText, FileUp, ExternalLink } from "lucide-react";

interface PdfAttachmentCardProps {
  title: string;
  currentUrl?: string;
  currentFilename?: string;
  selectedFile: File | null;
  onFileSelected: (file: File | null) => void;
  isRequired?: boolean;
}

export function PdfAttachmentCard({
  title,
  currentUrl,
  currentFilename,
  selectedFile,
  onFileSelected,
  isRequired = false,
}: PdfAttachmentCardProps) {
  const hasUploadedFile = Boolean(
    currentUrl && !currentUrl.startsWith("local://"),
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800">
          {title} {isRequired && <span className="text-rose-500">*</span>}
        </span>
        {hasUploadedFile && (
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Preview</span>
          </a>
        )}
      </div>

      {currentFilename && (
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs">
          <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-slate-400 block font-medium">
              Current File
            </span>
            <span className="font-mono text-xs font-bold text-slate-800 truncate block">
              {currentFilename}
            </span>
          </div>
        </div>
      )}

      <label className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white hover:border-indigo-500 hover:bg-slate-50 p-2.5 text-xs font-semibold text-slate-700 transition-colors shadow-2xs">
        <FileUp className="h-4 w-4 text-indigo-600 shrink-0" />
        <span className="truncate max-w-[220px]">
          {selectedFile
            ? `New: ${selectedFile.name}`
            : currentFilename
              ? `Replace ${title}`
              : `Select ${title}`}
        </span>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => onFileSelected(e.target.files?.[0] || null)}
          className="hidden"
        />
      </label>
    </div>
  );
}

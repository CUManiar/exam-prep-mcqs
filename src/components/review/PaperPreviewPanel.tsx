"use client";

import React, { useState } from "react";
import { QuestionPaper, ParsedQuestion, QuestionAnswer } from "../../lib/types";
import { getPaperDisplayTitle } from "../../lib/defaults";
import { PdfViewer } from "../PdfViewer";
import { MarkdownPaperReviewViewer } from "../MarkdownPaperReviewViewer";
import { ParsedMarkdownHeader } from "../../lib/markdownPaperParser";
import { Monitor, ExternalLink, X, FileText } from "lucide-react";

interface PaperPreviewPanelProps {
  matchedPaper?: QuestionPaper;
  isMarkdownPaper: boolean;
  markdownQuestions: ParsedQuestion[];
  markdownHeader?: ParsedMarkdownHeader | string[];
  answers: Record<number, QuestionAnswer>;
  activeQuestionNo: number;
  onSelectQuestion: (qNo: number) => void;
  onClose: () => void;
  attemptFallbackData: {
    paperId: string;
    paperLabel: string;
    category?: string;
    totalQuestions: number;
    maxScore: number;
    correctMarks?: number;
    incorrectMarks?: number;
  };
}

export function PaperPreviewPanel({
  matchedPaper,
  isMarkdownPaper,
  markdownQuestions,
  markdownHeader,
  answers,
  activeQuestionNo,
  onSelectQuestion,
  onClose,
  attemptFallbackData,
}: PaperPreviewPanelProps) {
  const [pdfMode, setPdfMode] = useState<"native" | "canvas">("native");

  const effectivePaper: QuestionPaper = matchedPaper || {
    id: attemptFallbackData.paperId,
    label: attemptFallbackData.paperLabel,
    category: (attemptFallbackData.category as "prelims" | "mains") || "prelims",
    examType: "objective",
    year: "Custom",
    subject: attemptFallbackData.paperLabel,
    totalQuestions: attemptFallbackData.totalQuestions,
    totalMarks: attemptFallbackData.maxScore,
    correctMarks: attemptFallbackData.correctMarks || 2.0,
    incorrectMarks: attemptFallbackData.incorrectMarks || 0.667,
    timeMinutes: 120,
    qpUrl: "local://interactive_markdown",
    answerKey: {},
  };

  const title = getPaperDisplayTitle(effectivePaper);

  return (
    <aside className="flex flex-col w-full h-[calc(100vh-10rem)] xl:h-[calc(100vh-7rem)] rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-md shrink-0 z-10 sticky top-20">
      {isMarkdownPaper ? (
        <MarkdownPaperReviewViewer
          paper={effectivePaper}
          questions={markdownQuestions}
          answers={answers}
          explanations={matchedPaper?.explanations}
          instructions={
            Array.isArray(markdownHeader)
              ? markdownHeader
              : matchedPaper?.instructions
          }
          header={markdownHeader}
          activeQuestionNo={activeQuestionNo}
          onSelectQuestion={onSelectQuestion}
          onClose={onClose}
        />
      ) : (
        <>
          {/* PDF Viewer Header Toolbar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-slate-200 shrink-0 gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 min-w-0">
              <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-[260px]">{title}</span>
              <span className="text-[10px] text-slate-400 font-normal uppercase hidden sm:inline">
                PDF Booklet
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setPdfMode((prev) => (prev === "canvas" ? "native" : "canvas"))}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors shadow-2xs cursor-pointer"
                title={pdfMode === "canvas" ? "Switch to Native viewer" : "Switch to Canvas viewer"}
              >
                <Monitor className="h-3 w-3 text-indigo-600" />
                <span>{pdfMode === "canvas" ? "Native" : "Canvas"}</span>
              </button>

              {matchedPaper?.qpUrl && !matchedPaper.qpUrl.startsWith("local://") && (
                <a
                  href={matchedPaper.qpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                  title="Open PDF in external browser tab"
                >
                  <ExternalLink className="h-3 w-3 text-indigo-600" />
                  <span className="hidden sm:inline">Popout</span>
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close paper split"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* PDF Viewer Body */}
          <div className="flex-1 min-h-0 bg-slate-100 w-full h-full relative">
            <PdfViewer
              url={matchedPaper?.qpUrl || ""}
              title={title}
              showToolbar={false}
              currentMode={pdfMode}
              onModeChange={setPdfMode}
            />
          </div>
        </>
      )}
    </aside>
  );
}


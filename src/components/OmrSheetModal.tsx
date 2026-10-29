"use client";

import React from "react";
import { ModalShell } from "./ModalShell";
import { QuestionAnswer } from "../lib/types";
import { Check, Flag, FileSpreadsheet, X } from "lucide-react";

interface OmrSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalQuestions: number;
  answers: Record<number, QuestionAnswer>;
  currentQuestion: number | null;
  onSelectOption: (qNo: number, option: string) => void;
  onNavigateQuestion: (qNo: number) => void;
  onToggleFlag: (qNo: number) => void;
  paperTitle: string;
}

export function OmrSheetModal({
  isOpen,
  onClose,
  totalQuestions,
  answers,
  currentQuestion,
  onSelectOption,
  onNavigateQuestion,
  onToggleFlag,
  paperTitle,
}: OmrSheetModalProps) {
  const options = ["A", "B", "C", "D"];
  const questionNumbers = Array.from(
    { length: totalQuestions },
    (_, i) => i + 1,
  );

  // Split questions into columns of 25 questions each (standard UPSC OMR format)
  const columnSize = 25;
  const numColumns = Math.ceil(totalQuestions / columnSize);
  const columns = Array.from({ length: numColumns }, (_, colIdx) =>
    questionNumbers.slice(colIdx * columnSize, (colIdx + 1) * columnSize),
  );

  const attemptedCount = Object.values(answers).filter(
    (a) => a.selected !== null && a.selected !== undefined,
  ).length;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="omr-sheet-title"
      describedBy="omr-sheet-desc"
      className="max-w-4xl p-0"
    >
      {/* OMR Header styled like official commission answer sheet */}
      <div className="border-b-2 border-slate-900 bg-amber-50/70 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-900/20 bg-amber-100 text-amber-900 shadow-2xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-amber-900/80">
                OFFICIAL UPSC OMR RESPONSE SHEET
              </div>
              <h2
                id="omr-sheet-title"
                className="text-base font-black tracking-tight text-slate-900 truncate max-w-md"
              >
                {paperTitle}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-amber-300/80 bg-white/90 px-3 py-1 text-right">
              <div className="text-[9px] uppercase font-bold text-slate-500">
                Total Bubbled
              </div>
              <div className="text-sm font-black text-slate-900 font-mono">
                {attemptedCount}{" "}
                <span className="text-xs font-normal text-slate-500">
                  / {totalQuestions}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p
          id="omr-sheet-desc"
          className="mt-2 text-[11px] text-amber-950/80 flex items-center justify-between flex-wrap gap-2"
        >
          <span>
            <strong>Instructions:</strong> Click circles to darken answers. Tap
            the question number to jump to it in the viewer.
          </span>
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-slate-900" />{" "}
              Marked
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full border border-slate-400 bg-white" />{" "}
              Empty
            </span>
          </span>
        </p>
      </div>

      {/* OMR Grid Columns */}
      <div className="max-h-[72vh] overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
        <div
          className={`grid gap-4 sm:gap-6 ${
            columns.length === 1
              ? "grid-cols-1"
              : columns.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : columns.length === 3
                  ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
          }`}
        >
          {columns.map((columnQuestions, colIndex) => (
            <div
              key={colIndex}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs divide-y divide-slate-100"
            >
              <div className="pb-2 mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Q#</span>
                <div className="flex items-center gap-2 pr-1">
                  {options.map((opt) => (
                    <span key={opt} className="w-5 text-center">
                      {opt}
                    </span>
                  ))}
                </div>
              </div>

              {columnQuestions.map((qNo) => {
                const answer = answers[qNo];
                const selected = answer?.selected;
                const isCurrent = currentQuestion === qNo;
                const isFlagged = Boolean(answer?.flagged);

                return (
                  <div
                    key={qNo}
                    className={`flex items-center justify-between py-1.5 transition-colors ${
                      isCurrent
                        ? "bg-blue-50/80 -mx-1.5 px-1.5 rounded-lg font-bold"
                        : "hover:bg-slate-50 -mx-1 px-1 rounded"
                    }`}
                  >
                    {/* Question Number & Flag */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateQuestion(qNo);
                          onClose();
                        }}
                        className={`font-mono text-xs text-left min-w-8 hover:text-blue-600 transition-colors ${
                          isCurrent
                            ? "text-blue-700 font-black"
                            : selected
                              ? "text-slate-900 font-bold"
                              : "text-slate-500 font-medium"
                        }`}
                        title={`Jump to Question ${qNo}`}
                      >
                        {String(qNo).padStart(3, "0")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleFlag(qNo)}
                        title={isFlagged ? "Remove Flag" : "Flag Question"}
                        className={`p-0.5 rounded transition-colors ${
                          isFlagged
                            ? "text-amber-600 hover:text-amber-700"
                            : "text-slate-300 hover:text-slate-500"
                        }`}
                      >
                        <Flag
                          className={`h-3 w-3 ${isFlagged ? "fill-amber-500" : ""}`}
                        />
                      </button>
                    </div>

                    {/* Bubbles A, B, C, D */}
                    <div className="flex items-center gap-2">
                      {options.map((opt) => {
                        const isMarked = selected === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => onSelectOption(qNo, opt)}
                            aria-label={`Question ${qNo}, Option ${opt}`}
                            title={`Question ${qNo}: Option ${opt}${isMarked ? " (Selected - click to clear)" : ""}`}
                            className={`group relative flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                              isMarked
                                ? "bg-slate-950 text-white shadow-inner ring-1 ring-slate-900"
                                : "border border-slate-300 bg-white text-slate-600 hover:border-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            <span
                              className={`transition-opacity ${isMarked ? "opacity-100" : "group-hover:opacity-100"}`}
                            >
                              {opt}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
        <span className="text-xs text-slate-500 font-mono">
          {totalQuestions - attemptedCount} questions unattempted
        </span>
        <button
          type="button"
          onClick={onClose}
          className="button-primary text-xs"
        >
          Return to Exam Viewer
        </button>
      </div>
    </ModalShell>
  );
}

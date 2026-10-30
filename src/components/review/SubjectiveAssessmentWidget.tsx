"use client";

import React from "react";
import { SubjectiveAssessment } from "../../lib/types";
import { Sparkles } from "lucide-react";

interface SubjectiveAssessmentWidgetProps {
  value?: SubjectiveAssessment;
  isAnswered: boolean;
  partialMarks?: number;
  maxPartialMarks: number;
  penaltyMarks?: number;
  onChange: (assessment: SubjectiveAssessment) => void;
  onPartialMarksChange: (marks: number) => void;
}

export function SubjectiveAssessmentWidget({
  value,
  isAnswered,
  partialMarks,
  maxPartialMarks,
  penaltyMarks,
  onChange,
  onPartialMarksChange,
}: SubjectiveAssessmentWidgetProps) {
  const options = [
    {
      value: "strong" as const,
      label: "Exact / Strong",
      points: `+${maxPartialMarks.toFixed(2)} pts`,
      description: "Full marks awarded",
      active: "border-emerald-600 bg-emerald-600 text-white shadow-xs",
      idle: "border-emerald-200 text-emerald-800 hover:bg-emerald-50",
    },
    {
      value: "partial" as const,
      label: "Partial",
      points: `+${(partialMarks !== undefined ? partialMarks : maxPartialMarks * 0.5).toFixed(2)} pts`,
      description: "Half marks / Custom",
      active: "border-amber-500 bg-amber-500 text-white shadow-xs",
      idle: "border-amber-200 text-amber-800 hover:bg-amber-50",
    },
    {
      value: "needs-work" as const,
      label: "Needs Work",
      points: penaltyMarks ? `-${penaltyMarks.toFixed(2)} pts` : "0.00 pts",
      description: penaltyMarks ? "Penalty applied" : "0 marks",
      active: "border-rose-600 bg-rose-600 text-white shadow-xs",
      idle: "border-rose-200 text-rose-800 hover:bg-rose-50",
    },
    {
      value: "no-attempt" as const,
      label: "No attempt",
      points: "0.00 pts",
      description: "Skipped response",
      active: "border-slate-600 bg-slate-600 text-white shadow-xs",
      idle: "border-slate-200 text-slate-700 hover:bg-slate-50",
    },
  ];

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 sm:p-3.5 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div>
          <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            Self-Assessment / Response Evaluation
          </p>
          <p className="text-[11px] text-indigo-900/70">
            Compare candidate response with model solution and grade:
          </p>
        </div>
        {value && (
          <span className="text-[10px] font-bold text-indigo-800 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
            Assessed:{" "}
            {value === "strong"
              ? "Exact Match"
              : value === "partial"
                ? "Partial"
                : value === "needs-work"
                  ? "Incorrect"
                  : "No Attempt"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((option) => {
          const isSelected = value === option.value;
          const disabled = !isAnswered && option.value !== "no-attempt";
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onChange(option.value);
              }}
              className={`rounded-lg border px-2.5 py-2 text-left transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                isSelected ? option.active : `bg-white ${option.idle}`
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold">{option.label}</span>
                {option.value === "partial" && isSelected ? (
                  <span
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-0.5 bg-amber-600 text-white px-1.5 py-0.5 rounded text-[11px] font-mono font-bold shadow-2xs"
                    title="Click to adjust partial score"
                  >
                    <span>+</span>
                    <input
                      type="number"
                      min={0}
                      max={maxPartialMarks}
                      step="0.1"
                      value={
                        partialMarks !== undefined
                          ? partialMarks
                          : maxPartialMarks * 0.5
                      }
                      onChange={(event) => {
                        event.stopPropagation();
                        onPartialMarksChange(
                          Math.min(
                            maxPartialMarks,
                            Math.max(0, Number(event.target.value) || 0),
                          ),
                        );
                      }}
                      className="w-11 bg-white text-center font-mono font-bold text-amber-950 rounded px-1 py-0 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300 border-none"
                    />
                    <span>pts</span>
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isSelected ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {option.points}
                  </span>
                )}
              </div>
              <span
                className={`mt-0.5 block text-[10px] ${
                  isSelected ? "text-white/85" : "text-slate-500"
                }`}
              >
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Check } from "lucide-react";
import { CutoffType } from "../../lib/types";

interface RulesScoringGridProps {
  totalQuestions: string | number;
  onTotalQuestionsChange: ((val: string) => void) | ((val: number) => void);
  timeMinutes: string | number;
  onTimeMinutesChange: ((val: string) => void) | ((val: number) => void);
  correctMarks: string | number;
  onCorrectMarksChange: ((val: string) => void) | ((val: number) => void);
  incorrectMarks: string | number;
  onIncorrectMarksChange: ((val: string) => void) | ((val: number) => void);
  totalMarks: string | number;
  onTotalMarksChange: ((val: string) => void) | ((val: number) => void);
  cutoffEnabled?: boolean;
  onCutoffEnabledChange?: (enabled: boolean) => void;
  cutoffType?: CutoffType;
  onCutoffTypeChange?: (type: CutoffType) => void;
  cutoffValue?: string | number;
  onCutoffValueChange?: ((val: string) => void) | ((val: number) => void);
  instructionsCount?: number;
}

export function RulesScoringGrid({
  totalQuestions,
  onTotalQuestionsChange,
  timeMinutes,
  onTimeMinutesChange,
  correctMarks,
  onCorrectMarksChange,
  incorrectMarks,
  onIncorrectMarksChange,
  totalMarks,
  onTotalMarksChange,
  cutoffEnabled = false,
  onCutoffEnabledChange,
  cutoffType = "percentage",
  onCutoffTypeChange,
  cutoffValue = "",
  onCutoffValueChange,
  instructionsCount = 0,
}: RulesScoringGridProps) {
  return (
    <div className="space-y-3 pt-1 border-t border-slate-100">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Questions <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            max="500"
            value={totalQuestions}
            onChange={(e) => {
              const val = e.target.value;
              (onTotalQuestionsChange as any)(
                typeof totalQuestions === "number" ? parseInt(val) || 0 : val,
              );
            }}
            placeholder="100"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Time (Mins)
          </label>
          <input
            type="number"
            min="1"
            value={timeMinutes}
            onChange={(e) => {
              const val = e.target.value;
              (onTimeMinutesChange as any)(
                typeof timeMinutes === "number" ? parseInt(val) || 0 : val,
              );
            }}
            placeholder="120"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Correct (+) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            step="any"
            value={correctMarks}
            onChange={(e) => {
              const val = e.target.value;
              (onCorrectMarksChange as any)(
                typeof correctMarks === "number" ? parseFloat(val) || 0 : val,
              );
            }}
            placeholder="2"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Penalty (-) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            step="any"
            value={incorrectMarks}
            onChange={(e) => {
              const val = e.target.value;
              (onIncorrectMarksChange as any)(
                typeof incorrectMarks === "number" ? parseFloat(val) || 0 : val,
              );
            }}
            placeholder="0.667"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Total Marks <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            step="any"
            value={totalMarks}
            onChange={(e) => {
              const val = e.target.value;
              (onTotalMarksChange as any)(
                typeof totalMarks === "number" ? parseFloat(val) || 0 : val,
              );
            }}
            placeholder="200"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
            required
          />
        </div>
      </div>

      {onCutoffEnabledChange && onCutoffTypeChange && onCutoffValueChange && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={cutoffEnabled}
              onChange={(e) => onCutoffEnabledChange(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Set qualifying marks / cutoff
          </label>
          {cutoffEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
              <select
                value={cutoffType}
                onChange={(e) =>
                  onCutoffTypeChange(e.target.value as CutoffType)
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                <option value="percentage">Percentage</option>
                <option value="marks">Marks</option>
              </select>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={cutoffValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    (onCutoffValueChange as any)(
                      typeof cutoffValue === "number"
                        ? parseFloat(val) || 0
                        : val,
                    );
                  }}
                  placeholder={
                    cutoffType === "percentage" ? "e.g. 40" : "e.g. 66.67"
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-16 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:outline-none"
                  required
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] text-slate-400">
                  {cutoffType === "percentage" ? "%" : "marks"}
                </span>
              </div>
            </div>
          )}
          <p className="text-[10px] text-slate-500">
            Leave unchecked when this paper has no qualifying threshold.
          </p>
        </div>
      )}

      {instructionsCount > 0 && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900">
          <div className="flex items-center gap-2 truncate">
            <Check className="h-3.5 w-3.5 text-purple-700 shrink-0" />
            <span className="font-semibold truncate">
              {instructionsCount} Exam Instructions & Rules Loaded
            </span>
          </div>
          <span className="text-[10px] text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200 font-mono shrink-0">
            Visible in Preview
          </span>
        </div>
      )}
    </div>
  );
}

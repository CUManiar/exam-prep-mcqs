"use client";

import React from "react";
import { ParsedQuestion } from "../../lib/types";
import { stripMarkdownFormatting } from "../../lib/markdownPaperParser";
import { MatchingItemsTable } from "../MatchingItemsTable";
import { Check, Lightbulb, BookOpen } from "lucide-react";

interface QuestionStreamPreviewProps {
  questions: ParsedQuestion[];
  answers?: Record<number, string>;
  explanations?: Record<number, string>;
}

export function QuestionStreamPreview({
  questions = [],
  answers = {},
  explanations = {},
}: QuestionStreamPreviewProps) {
  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center space-y-2">
        <div className="inline-flex p-2 rounded-xl bg-purple-100 text-purple-700">
          <BookOpen className="h-5 w-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-800">
          Exam Rules & Specifications Active
        </h4>
        <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
          Your rules, scoring scheme, and instructions are loaded above. Switch
          to the <strong>&apos;Markdown Source&apos;</strong> tab to paste or
          write questions separated by <strong>&apos;---&apos;</strong>. MCQs
          can use options (a), (b), (c), (d), while cloze questions can omit
          options and accept a short free-text answer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Question Stream ({questions.length} Questions)
        </span>
        <span className="text-[10px] text-slate-400">
          Scroll to inspect questions & answers
        </span>
      </div>

      {questions.map((q) => {
        const ansLetter = answers[q.questionNo]?.toUpperCase();
        const explanation = explanations[q.questionNo];

        return (
          <div
            key={q.questionNo}
            className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                Q{q.questionNo}
              </span>
              {ansLetter ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                  <Check className="h-3 w-3" /> Answer: Option {ansLetter}
                </span>
              ) : Object.keys(q.options || {}).length === 0 ? (
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Cloze · Free text
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">
                  No answer key
                </span>
              )}
            </div>

            <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
              {stripMarkdownFormatting(q.text)}
            </p>

            <MatchingItemsTable
              items={q.matchingItems}
              headers={q.matchingHeaders}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {Object.entries(q.options).map(([optKey, optText]) => {
                const isCorrect = ansLetter === optKey.toUpperCase();
                return (
                  <div
                    key={optKey}
                    className={`flex items-start gap-1.5 p-1.5 rounded-lg border text-xs leading-relaxed ${
                      isCorrect
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium"
                        : "bg-slate-50/70 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                        isCorrect
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {optKey}
                    </span>
                    <span className="whitespace-pre-wrap">
                      {stripMarkdownFormatting(optText)}
                    </span>
                  </div>
                );
              })}
            </div>

            {explanation && (
              <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-2 text-xs text-amber-950 space-y-0.5">
                <div className="flex items-center gap-1 font-bold text-[10px] text-amber-800">
                  <Lightbulb className="h-3 w-3 text-amber-600" />
                  <span>Explanation:</span>
                </div>
                <p className="text-[11px] leading-relaxed whitespace-pre-wrap pl-4 text-amber-900">
                  {stripMarkdownFormatting(explanation)}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

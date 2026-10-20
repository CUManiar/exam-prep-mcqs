"use client";

import React from "react";
import { Clock, Check } from "lucide-react";

interface ExamCoverCardProps {
  title: string;
  subject?: string;
  timeMinutes: string | number;
  questionsCount: string | number;
  totalMarks: string | number;
  correctMarks: string | number;
  incorrectMarks: string | number;
  mappedAnswersCount?: number;
  instructions?: string[];
}

export function ExamCoverCard({
  title,
  subject,
  timeMinutes,
  questionsCount,
  totalMarks,
  correctMarks,
  incorrectMarks,
  mappedAnswersCount,
  instructions,
}: ExamCoverCardProps) {
  const hasCustomInstructions = instructions && instructions.length > 0;

  return (
    <div className="rounded-xl border border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/60 p-4 space-y-3 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-purple-100">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full font-mono">
              Exam Specifications & Instructions
            </span>
            {subject && (
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                {subject}
              </span>
            )}
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 mt-1">
            {title || "Practice Mock Test"}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-purple-800 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
          <Clock className="h-3.5 w-3.5 text-purple-600" />
          <span>{timeMinutes || "120"} Mins</span>
        </div>
      </div>

      {/* 4-Column Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-white/90 rounded-lg p-2 border border-purple-100">
          <span className="text-[10px] text-slate-400 block font-medium">Questions</span>
          <span className="font-mono font-bold text-slate-800">
            {questionsCount ? `${questionsCount} MCQs` : "—"}
          </span>
        </div>
        <div className="bg-white/90 rounded-lg p-2 border border-purple-100">
          <span className="text-[10px] text-slate-400 block font-medium">Total Marks</span>
          <span className="font-mono font-bold text-slate-800">
            {totalMarks || "200"} Marks
          </span>
        </div>
        <div className="bg-white/90 rounded-lg p-2 border border-purple-100">
          <span className="text-[10px] text-slate-400 block font-medium">Marking</span>
          <span className="font-mono font-bold text-emerald-700">
            +{correctMarks || "2"} / -{incorrectMarks || "0.667"}
          </span>
        </div>
        <div className="bg-white/90 rounded-lg p-2 border border-purple-100">
          <span className="text-[10px] text-slate-400 block font-medium">Answer Key</span>
          <span className="font-mono font-bold text-purple-700">
            {mappedAnswersCount !== undefined ? `${mappedAnswersCount} Mapped` : "—"}
          </span>
        </div>
      </div>

      {/* Instructions list */}
      <div className="bg-white/90 rounded-lg p-2.5 border border-purple-100 space-y-1">
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
          Instructions & Rules:
        </span>
        <ul className="space-y-1 text-xs text-slate-700">
          {hasCustomInstructions ? (
            instructions.map((ins, i) => (
              <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                <Check className="h-3 w-3 text-purple-600 shrink-0 mt-0.5" />
                <span>{ins}</span>
              </li>
            ))
          ) : (
            <>
              <li className="flex items-start gap-1.5 leading-relaxed">
                <Check className="h-3 w-3 text-purple-600 shrink-0 mt-0.5" />
                <span>All {questionsCount || 100} questions are compulsory and carry equal marks.</span>
              </li>
              <li className="flex items-start gap-1.5 leading-relaxed">
                <Check className="h-3 w-3 text-purple-600 shrink-0 mt-0.5" />
                <span>Each correct answer awards +{correctMarks || "2"} marks; each wrong answer incurs a penalty of -{incorrectMarks || "0.667"} marks.</span>
              </li>
              <li className="flex items-start gap-1.5 leading-relaxed">
                <Check className="h-3 w-3 text-purple-600 shrink-0 mt-0.5" />
                <span>Only one option is correct per question. No penalty for unattempted questions.</span>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

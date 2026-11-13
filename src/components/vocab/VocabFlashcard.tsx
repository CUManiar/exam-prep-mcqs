"use client";

import React, { useState } from "react";
import { VocabCard } from "../../lib/vocabTypes";
import {
  RotateCw,
  Lightbulb,
  CheckCircle2,
  Trash2,
  Sparkles,
  BookOpen,
  ArrowRight,
} from "lucide-react";

interface VocabFlashcardProps {
  card: VocabCard;
  onToggleMastery: (id: string) => void;
  onDelete: (id: string) => void;
  onPractice?: (word: string) => void;
}

export function VocabFlashcard({
  card,
  onToggleMastery,
  onDelete,
  onPractice,
}: VocabFlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="perspective-1000 w-full min-h-[300px] select-none group touch-manipulation">
      <div
        className={`relative w-full min-h-[300px] duration-500 transform-style-3d transition-transform ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* FRONT FACE */}
        <div
          onClick={() => setIsFlipped(true)}
          className="absolute inset-0 w-full h-full backface-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all p-5 sm:p-6 flex flex-col justify-between cursor-pointer active:scale-[0.99]"
        >
          {/* Top Status */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                card.mastered
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
              }`}
            >
              {card.mastered ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mastered
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Learning
                </>
              )}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              {card.dateAdded}
            </span>
          </div>

          {/* Word Center */}
          <div className="text-center my-auto py-4">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white capitalize">
              {card.word}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Tap anywhere to see plain meaning & memory hook
            </p>
          </div>

          {/* Bottom Flip Trigger Action */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-medium text-xs">
            <span className="flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Tap to Flip Card</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* BACK FACE */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-white via-slate-50 to-indigo-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 shadow-md p-4 sm:p-5 flex flex-col justify-between overflow-y-auto"
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white capitalize truncate pr-2">
                {card.word}
              </h4>
              <button
                type="button"
                onClick={() => setIsFlipped(false)}
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 active:scale-95 touch-manipulation cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Flip front</span>
              </button>
            </div>

            {/* Meaning */}
            <div className="text-left">
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Plain Meaning
              </p>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-snug mt-0.5">
                {card.meaning}
              </p>
            </div>

            {/* Memory Hook */}
            {card.memoryHook && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 text-left">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Memory Hook</span>
                </div>
                <p className="text-xs text-amber-900 dark:text-amber-200/90 mt-0.5 leading-relaxed">
                  {card.memoryHook}
                </p>
              </div>
            )}

            {/* Practical Usage */}
            {card.example && (
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  How to Use in Answers / Essay
                </p>
                <p className="text-xs italic text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed bg-slate-100/80 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
                  "{card.example}"
                </p>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleMastery(card.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 touch-manipulation cursor-pointer ${
                  card.mastered
                    ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                }`}
              >
                {card.mastered ? "Mark Learning" : "Mark Mastered"}
              </button>

              {onPractice && (
                <button
                  type="button"
                  onClick={() => onPractice(card.word)}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 text-xs font-semibold transition-all flex items-center gap-1 active:scale-95 touch-manipulation cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Practice</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => onDelete(card.id)}
              className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 touch-manipulation cursor-pointer"
              title="Delete card"
              aria-label="Delete card"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

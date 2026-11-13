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
    <div className="perspective-1000 w-full h-[280px] sm:h-[300px] select-none group">
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className={`relative w-full h-full duration-500 transform-style-3d cursor-pointer transition-transform ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* FRONT FACE */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                card.mastered
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
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

          <div className="text-center my-auto px-4">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white capitalize">
              {card.word}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Tap to see meaning, memory hook & practical usage
            </p>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Click to flip card</span>
          </div>
        </div>

        {/* BACK FACE */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-md p-5 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                {card.word}
              </h4>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1"
              >
                <RotateCw className="w-3 h-3" /> Flip back
              </button>
            </div>

            <div className="mt-3 space-y-2.5 text-left">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Plain Meaning
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug mt-0.5">
                  {card.meaning}
                </p>
              </div>

              {card.memoryHook && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40">
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Memory Hook</span>
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-200/90 mt-0.5 leading-relaxed">
                    {card.memoryHook}
                  </p>
                </div>
              )}

              {card.example && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    How to use in Essay / Answers
                  </p>
                  <p className="text-xs italic text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed bg-slate-100 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
                    "{card.example}"
                  </p>
                </div>
              )}
            </div>
          </div>

          <div
            className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleMastery(card.id)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  card.mastered
                    ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                }`}
              >
                {card.mastered ? "Mark Learning" : "Mark Mastered"}
              </button>

              {onPractice && (
                <button
                  type="button"
                  onClick={() => onPractice(card.word)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 font-medium transition-colors flex items-center gap-1"
                >
                  <BookOpen className="w-3 h-3" /> Practice
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => onDelete(card.id)}
              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 transition-colors"
              title="Delete card"
              aria-label="Delete card"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { VocabCard } from "../../lib/vocabTypes";
import { VocabInfographicModal } from "./VocabInfographicModal";
import {
  RotateCw,
  Lightbulb,
  CheckCircle2,
  Trash2,
  Sparkles,
  BookOpen,
  ArrowRight,
  Maximize2,
} from "lucide-react";

interface VocabFlashcardProps {
  card: VocabCard;
  onToggleMastery: (id: string) => void;
  onDelete: (id: string) => void;
  onPractice?: (word: string) => void;
}

function getWordHeadingClasses(word: string): string {
  const len = word.trim().length;
  if (len >= 16) return "text-lg sm:text-xl";
  if (len >= 12) return "text-xl sm:text-2xl";
  if (len >= 9) return "text-2xl sm:text-3xl";
  return "text-2xl sm:text-3xl";
}

export function VocabFlashcard({
  card,
  onToggleMastery,
  onDelete,
  onPractice,
}: VocabFlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showInfographic, setShowInfographic] = useState(false);

  const wordSizeClass = getWordHeadingClasses(card.word);

  return (
    <>
      <div className="perspective-1000 w-full min-h-[340px] sm:min-h-[360px] select-none group touch-manipulation">
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className={`relative w-full min-h-[340px] sm:min-h-[360px] duration-500 transform-style-3d transition-transform cursor-pointer ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* FRONT FACE */}
          <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all p-5 sm:p-6 flex flex-col justify-between active:scale-[0.99]">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  card.mastered
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60"
                    : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60"
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

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfographic(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Expand card view"
                  aria-label="Expand card view"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                  {card.dateAdded}
                </span>
              </div>
            </div>

            {/* Word Center with dynamic font scaling & word wrapping */}
            <div className="text-center my-auto py-4 px-2 w-full max-w-full overflow-hidden">
              <h3
                className={`${wordSizeClass} font-semibold tracking-tight text-slate-800 dark:text-slate-100 capitalize break-words hyphens-auto leading-snug`}
              >
                {card.word}
              </h3>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                Click anywhere to flip and reveal meaning
              </p>
            </div>

            {/* Bottom Flip Trigger Action */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-medium text-xs">
              <span className="flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Click to Flip Card</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* BACK FACE */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-md p-5 sm:p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <h4 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 capitalize break-words line-clamp-1">
                    {card.word}
                  </h4>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowInfographic(true);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Expand card view"
                    aria-label="Expand card view"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <RotateCw className="w-3 h-3" /> Click to flip
                  </span>
                </div>
              </div>

              {/* Meaning with relaxed, non-bold font */}
              <div className="text-left">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Plain Meaning
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-normal leading-relaxed mt-0.5">
                  {card.meaning}
                </p>
              </div>

              {/* Memory Hook */}
              {card.memoryHook && (
                <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-left">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Memory Hook</span>
                  </div>
                  <p className="text-xs text-amber-900/90 dark:text-amber-200/90 font-normal mt-0.5 leading-relaxed">
                    {card.memoryHook}
                  </p>
                </div>
              )}

              {/* Practical Usage */}
              {card.example && (
                <div className="text-left">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    How to Use in Answers / Essay
                  </p>
                  <p className="text-xs sm:text-sm italic text-slate-700 dark:text-slate-300 font-normal mt-0.5 leading-relaxed bg-slate-100/70 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/40 font-serif">
                    "{card.example}"
                  </p>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div
              className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleMastery(card.id)}
                  className={`min-h-[34px] px-3 py-1 rounded-lg border text-xs font-medium transition-all active:scale-95 touch-manipulation cursor-pointer ${
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
                    className="min-h-[34px] px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 text-xs font-medium transition-all flex items-center gap-1 active:scale-95 touch-manipulation cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Practice</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => onDelete(card.id)}
                className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 touch-manipulation cursor-pointer"
                title="Delete card"
                aria-label="Delete card"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen / Large Infographic Modal */}
      <VocabInfographicModal
        card={card}
        isOpen={showInfographic}
        onClose={() => setShowInfographic(false)}
        onToggleMastery={onToggleMastery}
        onStartPractice={onPractice}
      />
    </>
  );
}

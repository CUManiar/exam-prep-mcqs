"use client";

import React from "react";
import { VocabCard } from "../../lib/vocabTypes";
import { ModalShell } from "../ModalShell";
import {
  X,
  Lightbulb,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Share2,
  Zap,
  GraduationCap,
} from "lucide-react";

interface VocabInfographicModalProps {
  card: VocabCard | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleMastery: (id: string) => void;
  onStartPractice?: (word: string) => void;
}

export function VocabInfographicModal({
  card,
  isOpen,
  onClose,
  onToggleMastery,
  onStartPractice,
}: VocabInfographicModalProps) {
  if (!isOpen || !card) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="infographic-title"
      className="max-w-2xl w-full p-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800"
    >
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-6 sm:p-8 relative">
        {/* Background ambient glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                card.mastered
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
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
            <span className="text-xs text-slate-400 font-mono">
              Added: {card.dateAdded}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close infographic"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Word Hero */}
        <div className="mt-6 mb-2 relative z-10">
          <h2
            id="infographic-title"
            className="text-3xl sm:text-4xl font-extrabold tracking-tight capitalize text-white drop-shadow-sm"
          >
            {card.word}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200/80 mt-1 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span>High-Yield Vocabulary Flashcard</span>
          </p>
        </div>
      </div>

      {/* Infographic Visual Pillars */}
      <div className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-900 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Pillar 1: Plain Meaning */}
        <div className="rounded-xl p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1.5">
            <BookOpen className="w-4 h-4" />
            <span>Core Meaning & Concept</span>
          </div>
          <p className="text-base sm:text-lg text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
            {card.meaning}
          </p>
        </div>

        {/* Pillar 2: Memory Hook Infographic Box */}
        {card.memoryHook && (
          <div className="rounded-xl p-5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-2">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Memory Anchor / Mnemonic Hook</span>
            </div>
            <p className="text-sm sm:text-base text-amber-950 dark:text-amber-100 font-semibold leading-relaxed">
              {card.memoryHook}
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-2 italic">
              💡 Tip: Visualize this mental image whenever you encounter this word in an editorial.
            </p>
          </div>
        )}

        {/* Pillar 3: Editorial / Essay Usage */}
        {card.example && (
          <div className="rounded-xl p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              <span className="text-sm">✍️</span>
              <span>How to Apply in UPSC GS / Essay Writing</span>
            </div>
            <div className="pl-4 border-l-4 border-indigo-500 py-1 bg-slate-50 dark:bg-slate-900/60 rounded-r-lg p-3">
              <p className="text-sm sm:text-base italic text-slate-800 dark:text-slate-200 leading-relaxed font-serif">
                "{card.example}"
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onToggleMastery(card.id)}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              card.mastered
                ? "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
            }`}
          >
            {card.mastered ? "Mark as Still Learning" : "Mark as Mastered ✓"}
          </button>

          {onStartPractice && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartPractice(card.word);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Practice This Word Now</span>
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

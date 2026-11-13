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
      className="max-w-2xl w-full p-0 overflow-hidden rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800"
    >
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-6 sm:p-7 relative">
        {/* Background ambient glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide ${
                card.mastered
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
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
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Word Hero */}
        <div className="mt-5 mb-1 relative z-10">
          <h2
            id="infographic-title"
            className="text-2xl sm:text-3xl font-semibold tracking-tight capitalize text-white break-words hyphens-auto"
          >
            {card.word}
          </h2>
          <p className="text-xs text-indigo-300/80 mt-1 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Vocabulary Details</span>
          </p>
        </div>
      </div>

      {/* Visual Breakdown Pillars */}
      <div className="p-6 sm:p-7 bg-slate-50 dark:bg-slate-900 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Pillar 1: Plain Meaning */}
        <div className="rounded-xl p-4 sm:p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Core Meaning</span>
          </div>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 font-normal leading-relaxed">
            {card.meaning}
          </p>
        </div>

        {/* Pillar 2: Memory Hook Box */}
        {card.memoryHook && (
          <div className="rounded-xl p-4 sm:p-5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Memory Anchor / Mnemonic Clue</span>
            </div>
            <p className="text-xs sm:text-sm text-amber-950/90 dark:text-amber-200/90 font-normal leading-relaxed">
              {card.memoryHook}
            </p>
          </div>
        )}

        {/* Pillar 3: Editorial / Essay Usage */}
        {card.example && (
          <div className="rounded-xl p-4 sm:p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              <span>✍️</span>
              <span>How to Apply in Essays & Answers</span>
            </div>
            <div className="pl-3.5 border-l-2 border-indigo-500 py-1 bg-slate-50 dark:bg-slate-900/50 rounded-r-lg p-2.5">
              <p className="text-xs sm:text-sm italic text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
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
            className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              card.mastered
                ? "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
            }`}
          >
            {card.mastered ? "Mark Learning" : "Mark Mastered ✓"}
          </button>

          {onStartPractice && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartPractice(card.word);
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Practice This Word</span>
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

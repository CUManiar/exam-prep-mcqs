"use client";

import { useEffect, useRef, useState } from "react";
import { VocabCard } from "../../lib/vocabTypes";
import { getMemoryStrength } from "../../lib/vocabStorage";
import { speakVocabWord } from "../../lib/vocabSpeech";
import {
  X,
  Lightbulb,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Zap,
  Volume2,
  GitBranch,
  MessageSquareQuote,
  Loader2,
  Copy,
  Check,
  CalendarClock,
} from "lucide-react";

interface VocabInfographicModalProps {
  card: VocabCard | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleMastery: (id: string) => void;
  onStartPractice?: (word: string) => void;
  onEnrichCard?: () => void;
  enriching?: boolean;
}

export function VocabInfographicModal({
  card,
  isOpen,
  onClose,
  onToggleMastery,
  onStartPractice,
  onEnrichCard,
  enriching = false,
}: VocabInfographicModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef(false);
  const [copiedCol, setCopiedCol] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && card) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, card]);

  if (!card) return null;

  const strength = getMemoryStrength(card);
  const needsEnrich =
    !card.rootBreakdown && !card.synonyms?.length && !card.phonetic;

  const isPointerOutside = (e: React.PointerEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return false;
    const rect = dialog.getBoundingClientRect();
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCol(text);
      setTimeout(() => setCopiedCol(null), 1500);
    } catch {
      // Clipboard unavailable
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="infographic-title"
      {...({ closedby: "any" } as Record<string, string>)}
      onClose={onClose}
      onPointerDown={(e) => {
        pressedOutsideRef.current = isPointerOutside(e);
      }}
      onPointerUp={(e) => {
        if (pressedOutsideRef.current && isPointerOutside(e)) {
          dialogRef.current?.close();
        }
        pressedOutsideRef.current = false;
      }}
      className="vocab-modal-dialog m-auto max-w-2xl w-[calc(100%-1.5rem)] p-0 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-transparent backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs"
    >
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-5 sm:p-7 relative">
        <div className="flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                card.mastered
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              }`}
            >
              {card.mastered ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Mastered</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Retention {strength}%</span>
                </>
              )}
            </span>

            {card.partOfSpeech && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-indigo-200">
                {card.partOfSpeech}
              </span>
            )}

            <span className="text-xs text-slate-400 font-mono">
              Added {card.dateAdded}
            </span>
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex items-start justify-between gap-4 relative z-10">
          <div className="min-w-0">
            <h1
              id="infographic-title"
              className="text-2xl sm:text-3xl font-semibold tracking-tight capitalize text-white break-words"
            >
              {card.word}
            </h1>
            {card.phonetic && (
              <p className="text-xs sm:text-sm font-mono text-indigo-300/90 mt-1">
                {card.phonetic}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => speakVocabWord(card.word)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            aria-label={`Pronounce ${card.word}`}
          >
            <Volume2 className="w-4 h-4" aria-hidden="true" />
            <span>Listen</span>
          </button>
        </div>
      </div>

      {/* Deep-Dive Lab Body */}
      <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-900 space-y-3.5 max-h-[70dvh] overflow-y-auto">
        {/* SRS Schedule Telemetry */}
        {card.srs && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Interval
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                {card.srs.intervalDays}d
              </div>
            </div>
            <div className="rounded-xl p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Streak
              </div>
              <div className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {card.srs.reps} reps
              </div>
            </div>
            <div className="rounded-xl p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                <CalendarClock className="w-3 h-3" aria-hidden="true" />
                <span>Next Review</span>
              </div>
              <div className="text-xs sm:text-sm font-mono font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                {card.srs.nextReviewDate}
              </div>
            </div>
          </div>
        )}

        {/* Core Meaning */}
        <div className="rounded-xl p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Core Meaning</span>
          </div>
          <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed">
            {card.meaning}
          </p>
        </div>

        {/* Etymology & Root DNA */}
        {card.rootBreakdown && (
          <div className="rounded-xl p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-1">
              <GitBranch className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Etymology &amp; Root DNA</span>
            </div>
            <p className="text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 leading-relaxed">
              {card.rootBreakdown}
            </p>
          </div>
        )}

        {/* Dual-Coding Memory Anchor */}
        {card.memoryHook && (
          <div className="rounded-xl p-4 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1">
              <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Dual-Coding Memory Hook</span>
            </div>
            <p className="text-xs sm:text-sm text-amber-950 dark:text-amber-200 leading-relaxed">
              {card.memoryHook}
            </p>
          </div>
        )}

        {/* Copyable Essay Collocations & Nuance */}
        {(card.collocations?.length || card.nuanceTip) && (
          <div className="rounded-xl p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            {card.collocations && card.collocations.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Copyable Essay Collocations
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {card.collocations.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handleCopy(col)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-100 hover:bg-indigo-50 dark:bg-slate-700/70 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <span>{col}</span>
                      {copiedCol === col ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-60" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {card.nuanceTip && (
              <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                <strong className="text-slate-800 dark:text-slate-100">
                  Register &amp; Nuance:{" "}
                </strong>
                {card.nuanceTip}
              </p>
            )}
          </div>
        )}

        {/* Editorial / Essay Usage */}
        {card.example && (
          <div className="rounded-xl p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              <MessageSquareQuote className="w-3.5 h-3.5" aria-hidden="true" />
              <span>How to Apply in Essays &amp; Answers</span>
            </div>
            <div className="pl-3.5 border-l-2 border-indigo-500 py-1 bg-slate-50 dark:bg-slate-900/50 rounded-r-lg p-2.5">
              <p className="text-xs sm:text-sm italic text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
                &ldquo;{card.example}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Upgrade Legacy Card Button */}
        {needsEnrich && onEnrichCard && (
          <button
            type="button"
            onClick={onEnrichCard}
            disabled={enriching}
            className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
          >
            {enriching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Root DNA, Synonyms &amp; Phonetics...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Upgrade Card with Roots, Phonetics &amp; Synonyms</span>
              </>
            )}
          </button>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onToggleMastery(card.id)}
              className={`flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                card.mastered
                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
              }`}
            >
              {card.mastered ? "Mark Learning" : "Mark Mastered ✓"}
            </button>

            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

          {onStartPractice && (
            <button
              type="button"
              onClick={() => {
                dialogRef.current?.close();
                onStartPractice(card.word);
              }}
              className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Practice This Word</span>
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}

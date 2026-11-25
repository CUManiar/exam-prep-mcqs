"use client";

import { useRef, useState } from "react";
import { VocabCard } from "../../lib/vocabTypes";
import {
  getMemoryStrength,
  getTodayString,
  isCardDue,
} from "../../lib/vocabStorage";
import { speakVocabWord } from "../../lib/vocabSpeech";
import { getRevisionConfig } from "../../lib/revisionAi";
import { VocabInfographicModal } from "./VocabInfographicModal";
import {
  CheckCircle2,
  Trash2,
  Sparkles,
  BookOpen,
  Maximize2,
  Volume2,
  Loader2,
  Clock,
  Copy,
  Check,
} from "lucide-react";

interface VocabFlashcardProps {
  card: VocabCard;
  onToggleMastery: (id: string) => void;
  onDelete: (id: string) => void;
  onPractice?: (word: string) => void;
  onUpdateCard?: (id: string, updates: Partial<VocabCard>) => void;
}

function getWordHeadingClasses(word: string): string {
  const len = word.trim().length;
  if (len >= 16) return "text-lg sm:text-xl";
  if (len >= 12) return "text-xl sm:text-2xl";
  return "text-2xl sm:text-[26px]";
}

export function VocabFlashcard({
  card,
  onToggleMastery,
  onDelete,
  onPractice,
  onUpdateCard,
}: VocabFlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showInfographic, setShowInfographic] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState(false);

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = getTodayString();
  const due = isCardDue(card, today);
  const strength = getMemoryStrength(card);
  const wordSizeClass = getWordHeadingClasses(card.word);

  const needsDeepEnrichment =
    !card.rootBreakdown && !card.synonyms?.length && !card.phonetic;

  const handleEnrichCard = async () => {
    if (enriching || !onUpdateCard) return;
    setEnriching(true);
    try {
      const config = getRevisionConfig();
      const res = await fetch("/api/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enrich",
          word: card.word,
          providerConfig: config,
        }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        onUpdateCard(card.id, {
          meaning: json.data.meaning || card.meaning,
          memoryHook: json.data.memoryHook || card.memoryHook,
          example: json.data.example || card.example,
          partOfSpeech: json.data.partOfSpeech,
          phonetic: json.data.phonetic,
          rootBreakdown: json.data.rootBreakdown,
          synonyms: Array.isArray(json.data.synonyms)
            ? json.data.synonyms
            : undefined,
          antonyms: Array.isArray(json.data.antonyms)
            ? json.data.antonyms
            : undefined,
          collocations: Array.isArray(json.data.collocations)
            ? json.data.collocations
            : undefined,
          nuanceTip: json.data.nuanceTip,
        });
      }
    } catch (err) {
      console.warn("Failed to enrich existing card:", err);
    } finally {
      setEnriching(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      setIsFlipped((prev) => !prev);
      clickTimerRef.current = null;
    }, 180);
  };

  const handleCardDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setShowInfographic(true);
  };

  const handleCopyPhrase = async (phrase: string) => {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopiedPhrase(true);
      setTimeout(() => setCopiedPhrase(false), 1500);
    } catch {
      // Clipboard unavailable
    }
  };

  const powerPhrase = card.collocations?.[0];

  return (
    <>
      <div className="perspective-1000 w-full group">
        <div
          onClick={handleCardClick}
          onDoubleClick={handleCardDoubleClick}
          className={`grid transform-style-3d transition-all duration-500 ease-out cursor-pointer rounded-2xl ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* FRONT FACE */}
          <article
            style={{ gridArea: "1 / 1" }}
            aria-hidden={isFlipped}
            className={`backface-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs group-hover:border-indigo-400 dark:group-hover:border-indigo-500 group-hover:ring-2 group-hover:ring-indigo-500/20 group-hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500/40 transition-all duration-200 flex flex-col justify-between min-h-[280px] ${
              isFlipped ? "pointer-events-none" : "z-10"
            }`}
          >
            <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                    card.mastered
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60"
                      : due
                        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60"
                        : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60"
                  }`}
                >
                  {card.mastered ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      <span>Mastered</span>
                    </>
                  ) : due ? (
                    <>
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      <span>Due</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      <span>Learning</span>
                    </>
                  )}
                </span>

                {card.partOfSpeech && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {card.partOfSpeech}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => speakVocabWord(card.word)}
                  className="min-h-[36px] min-w-[36px] sm:min-h-[30px] sm:min-w-[30px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer touch-manipulation"
                  aria-label={`Pronounce ${card.word}`}
                >
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowInfographic(true)}
                  className="min-h-[36px] min-w-[36px] sm:min-h-[30px] sm:min-w-[30px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer touch-manipulation"
                  aria-label={`Open full modal for ${card.word}`}
                >
                  <Maximize2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-7 gap-2">
              <h3
                className={`${wordSizeClass} font-semibold tracking-tight text-slate-900 dark:text-slate-100 capitalize break-words leading-snug`}
              >
                {card.word}
              </h3>

              {card.phonetic && (
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                  {card.phonetic}
                </span>
              )}
            </div>

            <footer className="px-4 py-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                <span>Memory strength</span>
                <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
                  {strength}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    strength >= 80
                      ? "bg-emerald-500"
                      : strength >= 40
                        ? "bg-indigo-500"
                        : "bg-amber-500"
                  }`}
                  style={{ width: `${strength}%` }}
                />
              </div>
            </footer>
          </article>

          {/* BACK FACE: 5-Second Contrast & Essay-Ready Snapshot */}
          <article
            style={{ gridArea: "1 / 1" }}
            aria-hidden={!isFlipped}
            className={`backface-hidden rotate-y-180 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-slate-50 dark:bg-slate-900 shadow-sm group-hover:border-indigo-400 dark:group-hover:border-indigo-500 group-hover:ring-2 group-hover:ring-indigo-500/20 group-hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500/40 transition-all duration-200 flex flex-col justify-between min-h-[280px] ${
              isFlipped ? "z-10" : "pointer-events-none"
            }`}
          >
            <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white capitalize truncate">
                  {card.word}
                </h3>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => speakVocabWord(card.word)}
                  className="min-h-[34px] min-w-[34px] sm:min-h-[28px] sm:min-w-[28px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label={`Pronounce ${card.word}`}
                >
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowInfographic(true)}
                  className="min-h-[34px] min-w-[34px] sm:min-h-[28px] sm:min-w-[28px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label={`Open deep dive for ${card.word}`}
                >
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="flex-1 p-4 space-y-3 flex flex-col justify-center">
              {/* Crisp 1-Line Essence */}
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug">
                {card.meaning}
              </p>

              {/* Semantic Contrast: Synonyms vs Antonyms */}
              {(card.synonyms?.length || card.antonyms?.length) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {card.synonyms?.slice(0, 2).map((syn) => (
                    <span
                      key={syn}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40"
                    >
                      ≈ {syn}
                    </span>
                  ))}
                  {card.antonyms?.slice(0, 2).map((ant) => (
                    <span
                      key={ant}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40"
                    >
                      ≠ {ant}
                    </span>
                  ))}
                </div>
              )}

              {/* Essay Power Phrase (1-Click Copy) or Nuance Cue */}
              {powerPhrase ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                      Essay Phrase
                    </span>
                    <span className="text-xs font-medium text-indigo-950 dark:text-indigo-100 truncate block">
                      &ldquo;{powerPhrase}&rdquo;
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyPhrase(powerPhrase)}
                    className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer shrink-0"
                    aria-label="Copy essay phrase"
                  >
                    {copiedPhrase ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ) : (
                needsDeepEnrichment &&
                onUpdateCard && (
                  <button
                    type="button"
                    onClick={handleEnrichCard}
                    disabled={enriching}
                    className="w-full min-h-[34px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {enriching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Enriching Contrast &amp; Phrases...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Synonyms &amp; Essay Phrases</span>
                      </>
                    )}
                  </button>
                )
              )}

              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Double-click for etymology, memory hook &amp; full example
              </p>
            </div>

            <footer className="px-4 py-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => onToggleMastery(card.id)}
                  className={`min-h-[36px] sm:min-h-[32px] px-3 py-1 rounded-lg border text-xs font-medium transition-all active:scale-95 touch-manipulation cursor-pointer ${
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
                    className="min-h-[36px] sm:min-h-[32px] px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 text-xs font-medium transition-all inline-flex items-center gap-1 active:scale-95 touch-manipulation cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Practice</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => onDelete(card.id)}
                className="min-h-[36px] min-w-[36px] sm:min-h-[32px] sm:min-w-[32px] inline-flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 touch-manipulation cursor-pointer"
                aria-label={`Delete ${card.word}`}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </footer>
          </article>
        </div>
      </div>

      {/* Deep-Dive Native Dialog */}
      <VocabInfographicModal
        card={card}
        isOpen={showInfographic}
        onClose={() => setShowInfographic(false)}
        onToggleMastery={onToggleMastery}
        onStartPractice={onPractice}
        onEnrichCard={onUpdateCard ? handleEnrichCard : undefined}
        enriching={enriching}
      />
    </>
  );
}

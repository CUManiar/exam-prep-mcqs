"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ReviewRating, VocabCard } from "../../lib/vocabTypes";
import {
  computeNextSRS,
  formatIntervalLabel,
  getMemoryStrength,
  getTodayString,
  isCardDue,
} from "../../lib/vocabStorage";
import { speakVocabWord } from "../../lib/vocabSpeech";
import {
  Volume2,
  Eye,
  Lightbulb,
  RotateCw,
  CheckCircle2,
  Sparkles,
  Flame,
  ArrowRight,
  Layers,
  BookOpen,
  RotateCcw,
} from "lucide-react";

interface VocabReviewDeckProps {
  cards: VocabCard[];
  onRecordReview: (cardId: string, rating: ReviewRating) => void;
  onPracticeWord?: (word: string) => void;
  onExitToCards?: () => void;
}

type DeckScope = "due" | "learning" | "today" | "all";

function maskWordInExample(example: string, word: string): string {
  if (!example || !word) return example;
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}[a-z]*\\b`, "gi");
  return example.replace(regex, "_____");
}

export function VocabReviewDeck({
  cards,
  onRecordReview,
  onPracticeWord,
  onExitToCards,
}: VocabReviewDeckProps) {
  const today = getTodayString();

  const dueCards = useMemo(
    () => cards.filter((c) => isCardDue(c, today)),
    [cards, today],
  );
  const learningCards = useMemo(
    () => cards.filter((c) => !c.mastered),
    [cards],
  );
  const todayCards = useMemo(
    () => cards.filter((c) => c.dateAdded === today),
    [cards, today],
  );

  const [scope, setScope] = useState<DeckScope>(() =>
    dueCards.length > 0 ? "due" : learningCards.length > 0 ? "learning" : "all",
  );

  // Snapshot the session queue so grading a card doesn't abruptly shift array indices mid-session
  const [sessionQueue, setSessionQueue] = useState<VocabCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showContextClue, setShowContextClue] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Swipe gesture state (pan-y preserved for vertical scrolling)
  const [dragX, setDragX] = useState(0);
  const pointerStartRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const buildQueueForScope = useCallback(
    (targetScope: DeckScope): VocabCard[] => {
      if (targetScope === "due") return [...dueCards];
      if (targetScope === "learning") return [...learningCards];
      if (targetScope === "today") return [...todayCards];
      return [...cards];
    },
    [dueCards, learningCards, todayCards, cards],
  );

  const startSession = useCallback(
    (targetScope: DeckScope) => {
      const q = buildQueueForScope(targetScope);
      setScope(targetScope);
      setSessionQueue(q);
      setCurrentIndex(0);
      setIsRevealed(false);
      setShowContextClue(false);
      setReviewedCount(0);
      setRememberedCount(0);
      setSessionComplete(false);
      setDragX(0);
    },
    [buildQueueForScope],
  );

  useEffect(() => {
    if (sessionQueue.length === 0 && !sessionComplete && cards.length > 0) {
      startSession(scope);
    }
  }, [cards.length]);

  const currentCard = sessionQueue[currentIndex] || null;

  const handleGrade = useCallback(
    (rating: ReviewRating) => {
      if (!currentCard) return;

      onRecordReview(currentCard.id, rating);
      setReviewedCount((prev) => prev + 1);
      if (rating !== "again") {
        setRememberedCount((prev) => prev + 1);
      }

      // If "again", re-queue once at the end of this session for same-session reinforcement
      let nextQueue = sessionQueue;
      if (rating === "again" && sessionQueue.length > 1) {
        const alreadyRequeued = sessionQueue
          .slice(currentIndex + 1)
          .some((c) => c.id === currentCard.id);
        if (!alreadyRequeued) {
          nextQueue = [...sessionQueue, currentCard];
          setSessionQueue(nextQueue);
        }
      }

      setDragX(0);
      setIsRevealed(false);
      setShowContextClue(false);

      if (currentIndex + 1 >= nextQueue.length) {
        setSessionComplete(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    },
    [currentCard, currentIndex, onRecordReview, sessionQueue],
  );

  // Keyboard shortcuts for desktop power users
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (!currentCard || sessionComplete) return;

      if (e.key === " " || e.key === "Enter") {
        if (!isRevealed) {
          e.preventDefault();
          setIsRevealed(true);
        }
      } else if (isRevealed) {
        if (e.key === "1") handleGrade("again");
        else if (e.key === "2") handleGrade("hard");
        else if (e.key === "3") handleGrade("good");
        else if (e.key === "4") handleGrade("easy");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentCard, isRevealed, sessionComplete, handleGrade]);

  // Pointer swipe handlers (only when revealed so accidental swipes don't skip unviewed cards)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isRevealed) return;
    if ((e.target as HTMLElement).closest("button")) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, active: true };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current.active || !isRevealed) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      setDragX(dx);
    }
  };

  const handlePointerUp = () => {
    if (!pointerStartRef.current.active) return;
    pointerStartRef.current.active = false;
    if (dragX > 90) {
      handleGrade("good");
    } else if (dragX < -90) {
      handleGrade("again");
    } else {
      setDragX(0);
    }
  };

  if (cards.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center">
        <Sparkles className="w-9 h-9 mx-auto text-indigo-500 mb-3" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Add words to start your Focus Review
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5">
          Once you add words in your Wordbook, Focus Review schedules them using
          spaced repetition right before you&apos;re about to forget.
        </p>
        {onExitToCards && (
          <button
            type="button"
            onClick={onExitToCards}
            className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Go to Wordbook
          </button>
        )}
      </div>
    );
  }

  // Scope selector pills
  const scopeOptions: { id: DeckScope; label: string; count: number }[] = [
    { id: "due", label: "Due Now", count: dueCards.length },
    { id: "today", label: "Today", count: todayCards.length },
    { id: "learning", label: "Learning", count: learningCards.length },
    { id: "all", label: "All", count: cards.length },
  ];

  const intervalPreviews = currentCard
    ? {
        again: formatIntervalLabel(
          computeNextSRS(currentCard.srs, "again", today).intervalDays,
        ),
        hard: formatIntervalLabel(
          computeNextSRS(currentCard.srs, "hard", today).intervalDays,
        ),
        good: formatIntervalLabel(
          computeNextSRS(currentCard.srs, "good", today).intervalDays,
        ),
        easy: formatIntervalLabel(
          computeNextSRS(currentCard.srs, "easy", today).intervalDays,
        ),
      }
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Scope & Progress Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {scopeOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => startSession(opt.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer touch-manipulation ${
                  scope === opt.id
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {opt.label} ({opt.count})
              </button>
            ))}
          </div>

          {sessionQueue.length > 0 && !sessionComplete && (
            <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
              {Math.min(currentIndex + 1, sessionQueue.length)} /{" "}
              {sessionQueue.length}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {sessionQueue.length > 0 && (
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
              style={{
                width: `${
                  sessionComplete
                    ? 100
                    : Math.round((currentIndex / sessionQueue.length) * 100)
                }%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Empty Queue State for Selected Scope */}
      {sessionQueue.length === 0 && !sessionComplete && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            All caught up for &ldquo;
            {scopeOptions.find((o) => o.id === scope)?.label}&rdquo;!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Zero overdue words right now. You can switch to{" "}
            <strong>Learning</strong> or <strong>All</strong> above for extra
            practice.
          </p>
          {learningCards.length > 0 && scope !== "learning" && (
            <button
              type="button"
              onClick={() => startSession("learning")}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Review Learning Deck ({learningCards.length})
            </button>
          )}
        </div>
      )}

      {/* Session Complete Micro-Reward */}
      {sessionComplete && (
        <div className="bg-gradient-to-br from-emerald-50 via-white to-indigo-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-indigo-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              Session Complete!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Every retrieval strengthens long-term neural pathways.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {reviewedCount}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Cards Reviewed
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {reviewedCount > 0
                  ? Math.round((rememberedCount / reviewedCount) * 100)
                  : 100}
                %
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Recall Rate
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => startSession(scope)}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Review Again</span>
            </button>
            {onExitToCards && (
              <button
                type="button"
                onClick={onExitToCards}
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Back to Wordbook</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Review Card */}
      {currentCard && !sessionComplete && (
        <div className="space-y-3">
          <article
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              transform:
                dragX !== 0
                  ? `translateX(${dragX}px) rotate(${dragX * 0.03}deg)`
                  : undefined,
              touchAction: "pan-y",
            }}
            className={`relative bg-white dark:bg-slate-900 border rounded-3xl p-5 sm:p-7 shadow-sm transition-transform duration-150 ${
              dragX > 60
                ? "border-emerald-400 ring-2 ring-emerald-400/30"
                : dragX < -60
                  ? "border-rose-400 ring-2 ring-rose-400/30"
                  : "border-slate-200 dark:border-slate-800"
            }`}
          >
            {/* Swipe Visual Indicator */}
            {dragX > 60 && (
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                Got It →
              </div>
            )}
            {dragX < -60 && (
              <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-rose-500 text-white text-[11px] font-bold">
                ← Again
              </div>
            )}

            {/* Card Top Metadata */}
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                {currentCard.partOfSpeech && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                    {currentCard.partOfSpeech}
                  </span>
                )}
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Memory Strength: {getMemoryStrength(currentCard)}%
                </span>
              </div>

              <button
                type="button"
                onClick={() => speakVocabWord(currentCard.word)}
                aria-label={`Pronounce ${currentCard.word}`}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer touch-manipulation"
              >
                <Volume2 className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Word Prompt */}
            <div className="py-6 sm:py-8 text-center space-y-2">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white capitalize break-words">
                {currentCard.word}
              </h2>
              {currentCard.phonetic && (
                <p className="text-xs sm:text-sm font-mono text-slate-400 dark:text-slate-500">
                  {currentCard.phonetic}
                </p>
              )}

              {/* Optional Pre-Flip Context Clue */}
              {!isRevealed && currentCard.example && (
                <div className="pt-3">
                  {showContextClue ? (
                    <p className="text-xs sm:text-sm italic text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/60 max-w-lg mx-auto font-serif leading-relaxed">
                      &ldquo;
                      {maskWordInExample(currentCard.example, currentCard.word)}
                      &rdquo;
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowContextClue(true)}
                      className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Need a context clue?</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Revealed Cognitive Breakdown */}
            {isRevealed ? (
              <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Meaning
                  </div>
                  <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 mt-0.5 leading-relaxed">
                    {currentCard.meaning}
                  </p>
                </div>

                {currentCard.memoryHook && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Memory Anchor</span>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-950 dark:text-amber-200 mt-1 leading-relaxed">
                      {currentCard.memoryHook}
                    </p>
                  </div>
                )}

                {currentCard.rootBreakdown && (
                  <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
                    <span className="font-semibold">Root / Etymology: </span>
                    {currentCard.rootBreakdown}
                  </div>
                )}

                {currentCard.example && (
                  <div className="pl-3.5 border-l-2 border-indigo-500 py-1">
                    <p className="text-xs sm:text-sm italic text-slate-700 dark:text-slate-300 font-serif leading-relaxed">
                      &ldquo;{currentCard.example}&rdquo;
                    </p>
                  </div>
                )}

                {(currentCard.synonyms?.length ||
                  currentCard.antonyms?.length) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentCard.synonyms?.map((syn) => (
                      <span
                        key={syn}
                        className="px-2 py-0.5 rounded-md text-[11px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40"
                      >
                        ≈ {syn}
                      </span>
                    ))}
                    {currentCard.antonyms?.map((ant) => (
                      <span
                        key={ant}
                        className="px-2 py-0.5 rounded-md text-[11px] bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40"
                      >
                        ≠ {ant}
                      </span>
                    ))}
                  </div>
                )}

                {onPracticeWord && (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onPracticeWord(currentCard.word)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Write a sentence with this word</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsRevealed(true)}
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-sm font-semibold shadow-sm transition-all cursor-pointer touch-manipulation"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Reveal Meaning &amp; Memory Hook</span>
                </button>
                <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2 hidden sm:block">
                  Tip: Press{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                    Space
                  </kbd>{" "}
                  to flip
                </p>
              </div>
            )}
          </article>

          {/* Thumb-Zone SRS Grading Bar */}
          {isRevealed && intervalPreviews && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm">
              <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mb-2">
                How well did you recall it?{" "}
                <span className="hidden sm:inline">(or swipe left/right)</span>
              </p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleGrade("again")}
                  className="min-h-[48px] flex flex-col items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/50 transition-all active:scale-95 cursor-pointer touch-manipulation"
                >
                  <span className="text-xs font-semibold">Again</span>
                  <span className="text-[10px] opacity-80">
                    {intervalPreviews.again}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGrade("hard")}
                  className="min-h-[48px] flex flex-col items-center justify-center rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50 transition-all active:scale-95 cursor-pointer touch-manipulation"
                >
                  <span className="text-xs font-semibold">Hard</span>
                  <span className="text-[10px] opacity-80">
                    {intervalPreviews.hard}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGrade("good")}
                  className="min-h-[48px] flex flex-col items-center justify-center rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/50 transition-all active:scale-95 cursor-pointer touch-manipulation"
                >
                  <span className="text-xs font-semibold">Good</span>
                  <span className="text-[10px] opacity-80">
                    {intervalPreviews.good}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGrade("easy")}
                  className="min-h-[48px] flex flex-col items-center justify-center rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 transition-all active:scale-95 cursor-pointer touch-manipulation"
                >
                  <span className="text-xs font-semibold">Easy</span>
                  <span className="text-[10px] opacity-80">
                    {intervalPreviews.easy}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

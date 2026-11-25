"use client";

import { useState, useEffect, useMemo } from "react";
import { ReviewRating, VocabCard } from "../../lib/vocabTypes";
import {
  getStoredVocabCards,
  addVocabCard,
  toggleVocabMastery,
  deleteVocabCard,
  getTodayVocabCount,
  syncVocabCardsWithSupabase,
  getTodayString,
  isCardDue,
  getMemoryStrength,
  recordCardReview,
  updateVocabCardDetails,
} from "../../lib/vocabStorage";
import { speakVocabWord } from "../../lib/vocabSpeech";
import { useApp } from "../../context/AppContext";
import { VocabInputBar } from "../vocab/VocabInputBar";
import { VocabFlashcard } from "../vocab/VocabFlashcard";
import { VocabReviewDeck } from "../vocab/VocabReviewDeck";
import { WordPracticeView } from "../vocab/WordPracticeView";
import { VocabGameMode } from "../vocab/VocabGameMode";
import {
  Sparkles,
  BookOpen,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Zap,
  Cloud,
  Loader2,
  Search,
  X,
  Brain,
  Clock,
  LayoutGrid,
  List,
  Volume2,
  ArrowRight,
} from "lucide-react";

export function MiscHubView() {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<
    "review" | "cards" | "practice" | "game"
  >("cards");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cards, setCards] = useState<VocabCard[]>(() =>
    getStoredVocabCards(currentUser?.id),
  );
  const [todayCount, setTodayCount] = useState<number>(() =>
    getTodayVocabCount(currentUser?.id),
  );
  const [filter, setFilter] = useState<
    "all" | "due" | "today" | "learning" | "mastered"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [practiceWord, setPracticeWord] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser?.id) {
      setIsSyncing(true);
      syncVocabCardsWithSupabase(currentUser.id)
        .then((synced) => {
          setCards(synced);
          const today = getTodayString();
          setTodayCount(synced.filter((c) => c.dateAdded === today).length);
        })
        .catch((err) => {
          console.warn("Failed syncing vocab cards on Misc mount:", err);
        })
        .finally(() => {
          setIsSyncing(false);
        });
    } else {
      const loaded = getStoredVocabCards();
      setCards(loaded);
      setTodayCount(getTodayVocabCount());
    }
  }, [currentUser?.id]);

  const handleWordAdded = (newWordData: {
    word: string;
    meaning: string;
    memoryHook: string;
    example: string;
    partOfSpeech?: string;
    phonetic?: string;
    rootBreakdown?: string;
    synonyms?: string[];
    antonyms?: string[];
    collocations?: string[];
    nuanceTip?: string;
  }) => {
    const result = addVocabCard(newWordData, currentUser?.id);
    if (!result.ok && result.error) {
      return result;
    }
    const updated = getStoredVocabCards(currentUser?.id);
    setCards(updated);
    setTodayCount(getTodayVocabCount(currentUser?.id));
    return result;
  };

  const handleToggleMastery = (id: string) => {
    const updated = toggleVocabMastery(id, currentUser?.id);
    setCards(updated);
  };

  const handleDelete = (id: string) => {
    const updated = deleteVocabCard(id, currentUser?.id);
    setCards(updated);
    setTodayCount(getTodayVocabCount(currentUser?.id));
  };

  const handleRecordReview = (id: string, rating: ReviewRating) => {
    const updated = recordCardReview(id, rating, currentUser?.id);
    setCards(updated);
  };

  const handleUpdateCard = (id: string, updates: Partial<VocabCard>) => {
    const updated = updateVocabCardDetails(id, updates, currentUser?.id);
    setCards(updated);
  };

  const handlePracticeCard = (word: string) => {
    setPracticeWord(word);
    setActiveTab("practice");
  };

  const todayStr = getTodayString();

  const stats = useMemo(() => {
    const due = cards.filter((c) => isCardDue(c, todayStr)).length;
    const mastered = cards.filter((c) => c.mastered).length;
    const learning = cards.length - mastered;
    const avgStrength =
      cards.length > 0
        ? Math.round(
            cards.reduce((sum, c) => sum + getMemoryStrength(c), 0) /
              cards.length,
          )
        : 0;
    return { due, mastered, learning, avgStrength };
  }, [cards, todayStr]);

  const filteredCards = cards.filter((card) => {
    if (filter === "due" && !isCardDue(card, todayStr)) return false;
    if (filter === "today" && card.dateAdded !== todayStr) return false;
    if (filter === "learning" && card.mastered) return false;
    if (filter === "mastered" && !card.mastered) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchWord = card.word?.toLowerCase().includes(q);
      const matchMeaning = card.meaning?.toLowerCase().includes(q);
      const matchHook = card.memoryHook?.toLowerCase().includes(q);
      const matchExample = card.example?.toLowerCase().includes(q);
      const matchRoot = card.rootBreakdown?.toLowerCase().includes(q);
      if (
        !matchWord &&
        !matchMeaning &&
        !matchHook &&
        !matchExample &&
        !matchRoot
      ) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-3 sm:pt-6 pb-28 sm:pb-16 space-y-4 sm:space-y-6">
      {/* Header with Responsive Tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" aria-hidden="true" />
            </span>
            <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-white">
              Vocabulary Studio
            </h1>
            {currentUser && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60"
                title="Your vocab cards are backed up and synced to your account"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Cloud Synced</span>
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dual-coded memory hooks, root etymology, spaced repetition &amp;
            active recall drills — built for long-term exam retention.
          </p>
        </div>

        {/* 4-Mode Navigation */}
        <nav
          aria-label="Vocabulary modes"
          className="grid grid-cols-2 sm:flex sm:items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0 gap-1"
        >
          <button
            type="button"
            onClick={() => setActiveTab("cards")}
            className={`flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-medium transition-all touch-manipulation cursor-pointer ${
              activeTab === "cards"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="truncate">Wordbook ({cards.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-medium transition-all touch-manipulation cursor-pointer ${
              activeTab === "review"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Brain className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="truncate">
              Review{stats.due > 0 ? ` (${stats.due})` : ""}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("practice")}
            className={`flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-medium transition-all touch-manipulation cursor-pointer ${
              activeTab === "practice"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="truncate">Practice</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("game")}
            className={`flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-medium transition-all touch-manipulation cursor-pointer ${
              activeTab === "game"
                ? "bg-amber-500 text-slate-950 font-semibold shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="truncate">2-Min Blitz</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: WORDBOOK & FLASHCARDS */}
      {activeTab === "cards" && (
        <div className="space-y-4 sm:space-y-5">
          {/* Quick Input Bar */}
          <VocabInputBar
            onWordAdded={handleWordAdded}
            todayCount={todayCount}
            existingWords={cards.map((c) => c.word)}
          />

          {/* Cognitive Retention & Focus Review CTA Strip */}
          {cards.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Due Today
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">
                    {stats.due}
                  </div>
                </div>
                <Clock
                  className="w-5 h-5 text-amber-500/70"
                  aria-hidden="true"
                />
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Avg Retention
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {stats.avgStrength}%
                  </div>
                </div>
                <Brain
                  className="w-5 h-5 text-indigo-500/70"
                  aria-hidden="true"
                />
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Mastered
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.mastered}
                  </div>
                </div>
                <CheckCircle2
                  className="w-5 h-5 text-emerald-500/70"
                  aria-hidden="true"
                />
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("review")}
                className="bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl p-3 sm:p-3.5 flex items-center justify-between text-left transition-all shadow-xs cursor-pointer touch-manipulation"
              >
                <div>
                  <div className="text-[11px] text-indigo-100 font-medium">
                    Active Recall
                  </div>
                  <div className="text-xs sm:text-sm font-semibold mt-0.5">
                    {stats.due > 0
                      ? `Review ${stats.due} Due`
                      : "Practice Deck"}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Search, Filter Chips, and View Toggle */}
          {cards.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search words, meanings, roots, or examples..."
                    aria-label="Search vocabulary cards"
                    className="w-full min-h-[40px] sm:min-h-[36px] pl-9 pr-8 py-2 text-sm sm:text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {/* Status Filter Chips + View Mode Toggle */}
                <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-medium text-slate-400 hidden md:flex items-center gap-1 shrink-0 mr-0.5">
                      <Filter className="w-3 h-3" aria-hidden="true" /> Filter:
                    </span>
                    <button
                      type="button"
                      onClick={() => setFilter("all")}
                      className={`min-h-[36px] sm:min-h-[32px] text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors touch-manipulation cursor-pointer ${
                        filter === "all"
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      All ({cards.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter("due")}
                      className={`min-h-[36px] sm:min-h-[32px] text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 touch-manipulation cursor-pointer ${
                        filter === "due"
                          ? "bg-amber-500 text-slate-950 font-semibold shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      <Clock className="w-3 h-3" aria-hidden="true" /> Due (
                      {stats.due})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter("today")}
                      className={`min-h-[36px] sm:min-h-[32px] text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 touch-manipulation cursor-pointer ${
                        filter === "today"
                          ? "bg-indigo-600 text-white font-medium shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      <Calendar className="w-3 h-3" aria-hidden="true" /> Today
                      ({todayCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter("learning")}
                      className={`min-h-[36px] sm:min-h-[32px] text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors touch-manipulation cursor-pointer ${
                        filter === "learning"
                          ? "bg-indigo-600 text-white font-medium shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      Learning ({stats.learning})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter("mastered")}
                      className={`min-h-[36px] sm:min-h-[32px] text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 touch-manipulation cursor-pointer ${
                        filter === "mastered"
                          ? "bg-emerald-600 text-white font-medium shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />{" "}
                      Mastered ({stats.mastered})
                    </button>
                  </div>

                  {/* Grid vs Compact List Toggle */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/70 dark:border-slate-700/70 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      aria-label="Card grid view"
                      aria-pressed={viewMode === "grid"}
                      className={`min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                        viewMode === "grid"
                          ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      aria-label="Compact list view"
                      aria-pressed={viewMode === "list"}
                      className={`min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                        viewMode === "list"
                          ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      <List className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              {searchQuery.trim() && (
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                  <span>
                    Found{" "}
                    <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                      {filteredCards.length}
                    </strong>{" "}
                    matching word{filteredCards.length === 1 ? "" : "s"} for
                    &ldquo;{searchQuery.trim()}&rdquo;
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cards Grid OR Compact List */}
          {filteredCards.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
                {filteredCards.map((card) => (
                  <VocabFlashcard
                    key={card.id}
                    card={card}
                    onToggleMastery={handleToggleMastery}
                    onDelete={handleDelete}
                    onPractice={handlePracticeCard}
                    onUpdateCard={handleUpdateCard}
                  />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                {filteredCards.map((card) => {
                  const strength = getMemoryStrength(card);
                  return (
                    <li
                      key={card.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white capitalize">
                            {card.word}
                          </span>
                          {card.phonetic && (
                            <span className="text-xs font-mono text-slate-400">
                              {card.phonetic}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              card.mastered
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                            }`}
                          >
                            {card.mastered ? "Mastered" : `${strength}%`}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {card.meaning}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => speakVocabWord(card.word)}
                          aria-label={`Pronounce ${card.word}`}
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePracticeCard(card.word)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-100 cursor-pointer"
                        >
                          Practice
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleMastery(card.id)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-100 cursor-pointer"
                        >
                          {card.mastered ? "Learning" : "Master"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            <div className="p-8 sm:p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/40">
              <Sparkles className="w-8 h-8 mx-auto text-indigo-400 dark:text-indigo-500 mb-2" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {cards.length === 0
                  ? "Your wordbook is waiting for its first word"
                  : searchQuery.trim()
                    ? `No vocabulary words match "${searchQuery.trim()}"`
                    : "No words match this filter"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                {cards.length === 0
                  ? "Enter any tough or unfamiliar word in the input box above. We'll turn it into an actionable memory card."
                  : searchQuery.trim()
                    ? "Try searching for a different term, meaning, or clear the search to view all flashcards."
                    : "Switch to 'All' to see all your saved vocabulary flashcards."}
              </p>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE RECALL & SPACED REPETITION DECK */}
      {activeTab === "review" && (
        <VocabReviewDeck
          cards={cards}
          onRecordReview={handleRecordReview}
          onPracticeWord={handlePracticeCard}
          onExitToCards={() => setActiveTab("cards")}
        />
      )}

      {/* TAB 3: TWO-WAY WORD PRACTICE */}
      {activeTab === "practice" && (
        <WordPracticeView
          cards={cards}
          initialWord={practiceWord}
          onClearInitialWord={() => setPracticeWord(null)}
        />
      )}

      {/* TAB 4: 2-MINUTE BLITZ GAME MODE */}
      {activeTab === "game" && (
        <VocabGameMode cards={cards} onExitGame={() => setActiveTab("cards")} />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { VocabCard } from "../../lib/vocabTypes";
import {
  getStoredVocabCards,
  addVocabCard,
  toggleVocabMastery,
  deleteVocabCard,
  getTodayVocabCount,
  syncVocabCardsWithSupabase,
  getTodayString,
} from "../../lib/vocabStorage";
import { useApp } from "../../context/AppContext";
import { VocabInputBar } from "../vocab/VocabInputBar";
import { VocabFlashcard } from "../vocab/VocabFlashcard";
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
} from "lucide-react";

export function MiscHubView() {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<"cards" | "practice" | "game">(
    "cards",
  );
  const [cards, setCards] = useState<VocabCard[]>(() =>
    getStoredVocabCards(currentUser?.id),
  );
  const [todayCount, setTodayCount] = useState<number>(() =>
    getTodayVocabCount(currentUser?.id),
  );
  const [filter, setFilter] = useState<
    "all" | "today" | "learning" | "mastered"
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

  const handlePracticeCard = (word: string) => {
    setPracticeWord(word);
    setActiveTab("practice");
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredCards = cards.filter((card) => {
    // 1. Status/Date filter
    if (filter === "today" && card.dateAdded !== todayStr) return false;
    if (filter === "learning" && card.mastered) return false;
    if (filter === "mastered" && !card.mastered) return false;

    // 2. Search query filter across word, meaning, memoryHook, and example
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchWord = card.word?.toLowerCase().includes(q);
      const matchMeaning = card.meaning?.toLowerCase().includes(q);
      const matchHook = card.memoryHook?.toLowerCase().includes(q);
      const matchExample = card.example?.toLowerCase().includes(q);
      if (!matchWord && !matchMeaning && !matchHook && !matchExample) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-3 sm:pt-6 pb-28 sm:pb-16 space-y-4 sm:space-y-6">
      {/* Header with Mobile Responsive Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-white">
              Study Aids & Misc.
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
            Build high-retention vocabulary at 4–5 words a day. Feed only the
            word — AI creates memory hooks, flashcards & 2-min rapid recall
            games.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="grid grid-cols-3 sm:flex sm:items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("cards")}
            className={`flex items-center justify-center gap-1.5 min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-medium transition-all touch-manipulation cursor-pointer ${
              activeTab === "cards"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="truncate">Cards ({cards.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("practice")}
            className={`flex items-center justify-center gap-1.5 min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-medium transition-all touch-manipulation cursor-pointer ${
              activeTab === "practice"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="truncate">Practice</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("game")}
            className={`flex items-center justify-center gap-1.5 min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-medium transition-all touch-manipulation cursor-pointer ${
              activeTab === "game"
                ? "bg-amber-500 text-slate-950 font-semibold shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="truncate">2-Min Game</span>
          </button>
        </div>
      </div>

      {/* TAB 1: VOCAB BUILDER & FLASHCARDS */}
      {activeTab === "cards" && (
        <div className="space-y-4 sm:space-y-5">
          {/* Quick Input Bar with duplicate word prevention */}
          <VocabInputBar
            onWordAdded={handleWordAdded}
            todayCount={todayCount}
            existingWords={cards.map((c) => c.word)}
          />

          {/* Search, Filter Chips, and Quick Game Icon */}
          {cards.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Search Bar in Word List */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search words, meanings, or examples..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter Chips + Blitz Game Icon */}
                <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 shrink-0 mr-0.5">
                      <Filter className="w-3 h-3" /> Filter:
                    </span>
                    <button
                      type="button"
                      onClick={() => setFilter("all")}
                      className={`text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors touch-manipulation cursor-pointer ${
                        filter === "all"
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      All ({cards.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter("today")}
                      className={`text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 touch-manipulation cursor-pointer ${
                        filter === "today"
                          ? "bg-indigo-600 text-white font-medium shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      <Calendar className="w-3 h-3" /> Today ({todayCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter("learning")}
                      className={`text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors touch-manipulation cursor-pointer ${
                        filter === "learning"
                          ? "bg-indigo-600 text-white font-medium shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      Learning ({cards.filter((c) => !c.mastered).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter("mastered")}
                      className={`text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 touch-manipulation cursor-pointer ${
                        filter === "mastered"
                          ? "bg-emerald-600 text-white font-medium shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" /> Mastered (
                      {cards.filter((c) => c.mastered).length})
                    </button>
                  </div>

                  {/* Square Game Icon with Tooltip on Hover */}
                  {cards.length >= 2 && (
                    <div className="relative group shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab("game")}
                        title="2-Minute Blitz Game: Rapid recall under a strict 120s timer"
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 shadow-sm transition-all cursor-pointer"
                        aria-label="2-Minute Blitz Game"
                      >
                        <Zap className="w-4 h-4 fill-slate-950" />
                      </button>

                      {/* Tooltip on Hover */}
                      <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden sm:group-hover:flex flex-col items-end z-50">
                        <div className="whitespace-nowrap rounded-lg bg-slate-900 dark:bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-white dark:text-slate-900 shadow-xl">
                          ⚡ 2-Minute Blitz Game
                        </div>
                        <div className="h-1 w-2 mr-3 -mt-px border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Search active results summary chip */}
              {searchQuery.trim() && (
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                  <span>
                    Found{" "}
                    <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                      {filteredCards.length}
                    </strong>{" "}
                    matching word{filteredCards.length === 1 ? "" : "s"} for &ldquo;{searchQuery.trim()}&rdquo;
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

          {/* Cards Grid with improved dimensions & typography */}
          {filteredCards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filteredCards.map((card) => (
                <VocabFlashcard
                  key={card.id}
                  card={card}
                  onToggleMastery={handleToggleMastery}
                  onDelete={handleDelete}
                  onPractice={handlePracticeCard}
                />
              ))}
            </div>
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

      {/* TAB 2: TWO-WAY WORD PRACTICE */}
      {activeTab === "practice" && (
        <WordPracticeView
          cards={cards}
          initialWord={practiceWord}
          onClearInitialWord={() => setPracticeWord(null)}
        />
      )}

      {/* TAB 3: 2-MINUTE BLITZ GAME MODE */}
      {activeTab === "game" && (
        <VocabGameMode cards={cards} onExitGame={() => setActiveTab("cards")} />
      )}
    </div>
  );
}

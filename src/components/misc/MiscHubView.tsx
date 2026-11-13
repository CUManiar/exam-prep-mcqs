"use client";

import React, { useState, useEffect } from "react";
import { VocabCard } from "../../lib/vocabTypes";
import {
  getStoredVocabCards,
  addVocabCard,
  toggleVocabMastery,
  deleteVocabCard,
  getTodayVocabCount,
} from "../../lib/vocabStorage";
import { VocabInputBar } from "../vocab/VocabInputBar";
import { VocabFlashcard } from "../vocab/VocabFlashcard";
import { WordPracticeView } from "../vocab/WordPracticeView";
import {
  Sparkles,
  BookOpen,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";

export function MiscHubView() {
  const [activeTab, setActiveTab] = useState<"cards" | "practice">("cards");
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "today" | "learning" | "mastered">("all");
  const [practiceWord, setPracticeWord] = useState<string | null>(null);

  useEffect(() => {
    const loaded = getStoredVocabCards();
    setCards(loaded);
    setTodayCount(getTodayVocabCount());
  }, []);

  const handleWordAdded = (newWordData: {
    word: string;
    meaning: string;
    memoryHook: string;
    example: string;
  }) => {
    addVocabCard(newWordData);
    setCards(getStoredVocabCards());
    setTodayCount(getTodayVocabCount());
  };

  const handleToggleMastery = (id: string) => {
    const updated = toggleVocabMastery(id);
    setCards(updated);
  };

  const handleDelete = (id: string) => {
    const updated = deleteVocabCard(id);
    setCards(updated);
    setTodayCount(getTodayVocabCount());
  };

  const handlePracticeCard = (word: string) => {
    setPracticeWord(word);
    setActiveTab("practice");
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredCards = cards.filter((card) => {
    if (filter === "today") return card.dateAdded === todayStr;
    if (filter === "learning") return !card.mastered;
    if (filter === "mastered") return card.mastered;
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
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
              Study Aids & Misc.
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build high-retention vocabulary at 4–5 words a day. Feed only the word — AI creates memory hooks & 2-way practice.
          </p>
        </div>

        {/* Tab switchers - full width on mobile */}
        <div className="grid grid-cols-2 sm:flex sm:items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("cards")}
            className={`flex items-center justify-center gap-1.5 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold transition-all touch-manipulation cursor-pointer ${
              activeTab === "cards"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Flashcards ({cards.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("practice")}
            className={`flex items-center justify-center gap-1.5 min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-semibold transition-all touch-manipulation cursor-pointer ${
              activeTab === "practice"
                ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Word Practice</span>
          </button>
        </div>
      </div>

      {/* TAB 1: VOCAB BUILDER & FLASHCARDS */}
      {activeTab === "cards" && (
        <div className="space-y-5">
          {/* Quick Input Bar */}
          <VocabInputBar onWordAdded={handleWordAdded} todayCount={todayCount} />

          {/* Horizontally scrollable Filter Chips on Mobile */}
          {cards.length > 0 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 w-full sm:w-auto">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
                  <Filter className="w-3 h-3" /> Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors touch-manipulation cursor-pointer ${
                    filter === "all"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  All ({cards.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("today")}
                  className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 touch-manipulation cursor-pointer ${
                    filter === "today"
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  <Calendar className="w-3 h-3" /> Today ({todayCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("learning")}
                  className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors touch-manipulation cursor-pointer ${
                    filter === "learning"
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  Learning ({cards.filter((c) => !c.mastered).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("mastered")}
                  className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 touch-manipulation cursor-pointer ${
                    filter === "mastered"
                      ? "bg-emerald-600 text-white font-semibold shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" /> Mastered ({cards.filter((c) => c.mastered).length})
                </button>
              </div>

              <span className="text-[11px] text-slate-400 hidden lg:inline shrink-0">
                💡 Tap card to flip and reveal memory hook & sentence usage
              </span>
            </div>
          )}

          {/* Cards Grid */}
          {filteredCards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
                  : "No words match this filter"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                {cards.length === 0
                  ? "Enter any tough or unfamiliar word in the input box above. We'll turn it into an actionable memory card."
                  : "Switch to 'All' to see all your saved vocabulary flashcards."}
              </p>
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
    </div>
  );
}

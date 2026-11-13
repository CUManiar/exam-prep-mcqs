"use client";

import React, { useState } from "react";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { getRevisionConfig } from "../../lib/revisionAi";

interface VocabInputBarProps {
  onWordAdded: (card: {
    word: string;
    meaning: string;
    memoryHook: string;
    example: string;
  }) => void;
  todayCount: number;
}

export function VocabInputBar({ onWordAdded, todayCount }: VocabInputBarProps) {
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWord = word.trim();
    if (!cleanWord || loading) return;

    setLoading(true);
    setError(null);

    try {
      const config = getRevisionConfig();
      const res = await fetch("/api/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enrich",
          word: cleanWord,
          providerConfig: config,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to generate flashcard.");
      }

      onWordAdded({
        word: json.data.word || cleanWord,
        meaning: json.data.meaning || "A useful term for academic analysis.",
        memoryHook: json.data.memoryHook || "Recall context clues from your reading.",
        example: json.data.example || `The term ${cleanWord} was applied effectively.`,
      });
      setWord("");
    } catch (err: any) {
      console.error("Vocab add error:", err);
      setError(err.message || "Could not generate flashcard. Please check network or try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      {/* Daily Target Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Daily Digestible Words
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-900/40">
              Target: 4–5 words/day
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Add words you found difficult in newspapers or test series. We'll turn them into memory flashcards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {todayCount} / 5
            </span>
            <span className="text-[11px] text-slate-400 block">Today's goal</span>
          </div>
          <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                todayCount >= 5 ? "bg-emerald-500" : "bg-indigo-600"
              }`}
              style={{ width: `${Math.min((todayCount / 5) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Type just the word (e.g. hegemon, ephemeral, obfuscate)..."
            disabled={loading}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={!word.trim() || loading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium transition-all shadow-sm shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing & Crafting...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Create Flashcard</span>
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}
    </div>
  );
}

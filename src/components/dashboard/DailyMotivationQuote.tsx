"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Quote, Sparkles, Shuffle, Check, Copy, RefreshCw } from "lucide-react";

interface QuoteItem {
  quote: string;
  author: string;
  role?: string;
  tag?: string;
  source?: string;
}

const DEFAULT_UPSC_QUOTE: QuoteItem = {
  quote: "Arise, awake, and stop not till the goal is reached.",
  author: "Swami Vivekananda",
  role: "Indian Visionary",
  tag: "Vision & Consistency",
  source: "curated",
};

const LOCAL_STORAGE_QUOTE_KEY = "upsc_daily_quote_cache_v2";

function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DailyMotivationQuote() {
  const [currentQuote, setCurrentQuote] =
    useState<QuoteItem>(DEFAULT_UPSC_QUOTE);
  const [copied, setCopied] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  // Fetch dynamic quote ONCE PER DAY, cached in localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const todayStr = getTodayDateStr();

    try {
      const cachedRaw = localStorage.getItem(LOCAL_STORAGE_QUOTE_KEY);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        // If already fetched today, use the cached quote with ZERO API calls
        if (parsed?.date === todayStr && parsed?.quote?.quote) {
          setCurrentQuote(parsed.quote);
          return;
        }
      }
    } catch {}

    // Not cached for today yet -> fetch once from API
    let isCancelled = false;

    async function fetchDailyQuote() {
      try {
        const res = await fetch("/api/quote/daily", {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) return;
        const data = await res.json();

        if (!isCancelled && data?.quote && data?.author) {
          const newQuote: QuoteItem = {
            quote: data.quote,
            author: data.author,
            role: data.role || "Daily Inspiration",
            tag: data.tag || "Wisdom",
            source: data.source || "api",
          };

          setCurrentQuote(newQuote);

          // Cache in localStorage with today's date stamp
          localStorage.setItem(
            LOCAL_STORAGE_QUOTE_KEY,
            JSON.stringify({
              date: todayStr,
              quote: newQuote,
            }),
          );
        }
      } catch {
        // Network error/offline: keep initial fallback quote
      }
    }

    fetchDailyQuote();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Manual shuffle: fetches a fresh quote on user demand
  const handleShuffle = async () => {
    setIsShuffling(true);
    try {
      const res = await fetch("/api/quote/daily?random=true", {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.quote && data?.author) {
          setCurrentQuote({
            quote: data.quote,
            author: data.author,
            role: data.role || "Thought of the Moment",
            tag: data.tag || "Inspiration",
            source: data.source || "api",
          });
        }
      }
    } catch {}
    setIsShuffling(false);
  };

  const handleCopyQuote = async () => {
    try {
      await navigator.clipboard.writeText(
        `"${currentQuote.quote}" — ${currentQuote.author}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-amber-50/60 p-4 sm:p-5 shadow-2xs transition-all">
      {/* Decorative background watermark quote mark */}
      <div className="pointer-events-none absolute -right-3 -bottom-5 text-amber-200/40 select-none">
        <Quote className="h-28 w-28 rotate-12 stroke-[1]" />
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 ring-1 ring-amber-300/60">
            <Quote className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Daily Aspirant Digest
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-amber-900 shadow-2xs">
                <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                {currentQuote.tag || "Quote of the Day"}
              </span>
            </div>
            <p className="text-sm font-medium italic text-slate-800 sm:text-base leading-relaxed">
              &ldquo;{currentQuote.quote}&rdquo;
            </p>
            <p className="text-xs font-semibold text-slate-600 pt-0.5">
              — {currentQuote.author}
              {currentQuote.role && (
                <span className="text-slate-400 font-normal">
                  {" "}
                  · {currentQuote.role}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
          <button
            type="button"
            onClick={handleCopyQuote}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-amber-100/60 hover:text-slate-900 cursor-pointer"
            title="Copy quote"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleShuffle}
            disabled={isShuffling}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-amber-100/60 hover:text-slate-900 cursor-pointer disabled:opacity-50"
            title="Get another quote"
          >
            <Shuffle
              className={`h-3.5 w-3.5 text-amber-600 ${isShuffling ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {isShuffling ? "Loading…" : "Shuffle"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

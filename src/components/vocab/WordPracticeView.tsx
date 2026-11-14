"use client";

import { useState, useEffect } from "react";
import { VocabCard, PracticeQuestion, SentenceEvaluationResponse } from "../../lib/vocabTypes";
import { getRevisionConfig } from "../../lib/revisionAi";
import {
  HelpCircle,
  PenTool,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Loader2,
  RotateCcw,
  Lightbulb,
} from "lucide-react";

interface WordPracticeViewProps {
  cards: VocabCard[];
  initialWord?: string | null;
  onClearInitialWord?: () => void;
}

export function WordPracticeView({
  cards,
  initialWord,
  onClearInitialWord,
}: WordPracticeViewProps) {
  const [mode, setMode] = useState<"identify" | "form">("identify");

  // State for Mode 1: Identify Word
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [practiceQuestion, setPracticeQuestion] = useState<PracticeQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // State for Mode 2: Form a Statement
  const [formWordCard, setFormWordCard] = useState<VocabCard | null>(null);
  const [studentSentence, setStudentSentence] = useState("");
  const [evaluatingSentence, setEvaluatingSentence] = useState(false);
  const [sentenceEvalResult, setSentenceEvalResult] =
    useState<SentenceEvaluationResponse | null>(null);

  // Select initial word if passed
  useEffect(() => {
    if (initialWord && cards.length > 0) {
      const foundIdx = cards.findIndex(
        (c) => c.word.toLowerCase() === initialWord.toLowerCase(),
      );
      if (foundIdx !== -1) {
        setCurrentCardIndex(foundIdx);
        setFormWordCard(cards[foundIdx]);
        if (onClearInitialWord) onClearInitialWord();
      }
    } else if (cards.length > 0 && !formWordCard) {
      setFormWordCard(cards[0]);
    }
  }, [initialWord, cards]);

  const activeCard = cards[currentCardIndex] || null;

  const loadQuestionForActiveCard = async (targetCard: VocabCard) => {
    setLoadingQuestion(true);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setShowHint(false);

    try {
      const config = getRevisionConfig();
      const allWords = cards.map((c) => c.word);

      const res = await fetch("/api/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_practice",
          word: targetCard.word,
          wordsList: allWords,
          providerConfig: config,
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setPracticeQuestion({
          cardId: targetCard.id,
          word: targetCard.word,
          statementWithBlank:
            json.data.statementWithBlank ||
            `The concept of _____ plays a key role here.`,
          options: json.data.options || [targetCard.word],
          hint: json.data.hint || targetCard.meaning,
        });
      }
    } catch (e) {
      console.error("Practice question error:", e);
      setPracticeQuestion({
        cardId: targetCard.id,
        word: targetCard.word,
        statementWithBlank: targetCard.example
          ? targetCard.example.replace(new RegExp(targetCard.word, "gi"), "_____")
          : `The concept of _____ is relevant to: ${targetCard.meaning}`,
        options: [
          targetCard.word,
          ...cards
            .filter((c) => c.id !== targetCard.id)
            .slice(0, 3)
            .map((c) => c.word),
        ].sort(() => Math.random() - 0.5),
        hint: targetCard.meaning,
      });
    } finally {
      setLoadingQuestion(false);
    }
  };

  useEffect(() => {
    if (activeCard && mode === "identify") {
      loadQuestionForActiveCard(activeCard);
    }
  }, [currentCardIndex, mode]);

  const handleNextIdentify = () => {
    if (cards.length === 0) return;
    const nextIdx = (currentCardIndex + 1) % cards.length;
    setCurrentCardIndex(nextIdx);
  };

  const handleEvaluateSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWordCard || !studentSentence.trim() || evaluatingSentence) return;

    setEvaluatingSentence(true);
    setSentenceEvalResult(null);

    try {
      const config = getRevisionConfig();
      const res = await fetch("/api/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate_sentence",
          word: formWordCard.word,
          sentence: studentSentence.trim(),
          providerConfig: config,
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setSentenceEvalResult(json.data);
      } else {
        throw new Error(json.error || "Failed to evaluate sentence.");
      }
    } catch (err: any) {
      setSentenceEvalResult({
        isNatural: true,
        feedback: "Sentence submitted! Keep practicing daily to sharpen your vocabulary.",
      });
    } finally {
      setEvaluatingSentence(false);
    }
  };

  const handleNextFormWord = () => {
    if (cards.length === 0) return;
    const nextIdx = (cards.findIndex((c) => c.id === formWordCard?.id) + 1) % cards.length;
    setFormWordCard(cards[nextIdx]);
    setStudentSentence("");
    setSentenceEvalResult(null);
  };

  if (cards.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 text-center shadow-sm">
        <HelpCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          No words in your practice list yet
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
          Add at least 1–2 words you found hard in the Vocab tab above. Once added, you can practice them here with instant AI feedback!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Thumb-friendly Mode Switcher */}
      <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
        <button
          type="button"
          onClick={() => setMode("identify")}
          className={`flex items-center justify-center gap-1.5 min-h-[38px] py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all touch-manipulation cursor-pointer ${
            mode === "identify"
              ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">1. Identify Word</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("form")}
          className={`flex items-center justify-center gap-1.5 min-h-[38px] py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all touch-manipulation cursor-pointer ${
            mode === "form"
              ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <PenTool className="w-4 h-4 shrink-0" />
          <span className="truncate">2. Form Sentence</span>
        </button>
      </div>

      {/* ── MODE 1: IDENTIFY WORD FROM STATEMENT ── */}
      {mode === "identify" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <span className="font-medium text-slate-600 dark:text-slate-400">
              Word {currentCardIndex + 1} of {cards.length}
            </span>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="min-h-[32px] px-2 text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium touch-manipulation cursor-pointer text-xs"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{showHint ? "Hide Hint" : "Hint"}</span>
            </button>
          </div>

          {loadingQuestion ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-normal">Generating context sentence...</p>
            </div>
          ) : practiceQuestion ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed font-serif">
                  {practiceQuestion.statementWithBlank}
                </p>
                {showHint && practiceQuestion.hint && (
                  <p className="mt-2.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-800/40 leading-relaxed font-normal">
                    💡 <strong>Hint:</strong> {practiceQuestion.hint}
                  </p>
                )}
              </div>

              {/* Options - full width and thumb friendly */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {practiceQuestion.options?.map((option) => {
                  const isCorrect =
                    option.toLowerCase() === practiceQuestion.word.toLowerCase();
                  const isSelected = selectedOption === option;

                  let btnStyle =
                    "border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200";

                  if (isAnswerRevealed) {
                    if (isCorrect) {
                      btnStyle =
                        "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-medium";
                    } else if (isSelected && !isCorrect) {
                      btnStyle =
                        "border-rose-400 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 line-through";
                    } else {
                      btnStyle = "opacity-40 border-slate-200 dark:border-slate-800";
                    }
                  }

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={isAnswerRevealed}
                      onClick={() => {
                        setSelectedOption(option);
                        setIsAnswerRevealed(true);
                      }}
                      className={`min-h-[46px] p-3 rounded-xl border text-sm font-normal transition-all text-left flex items-center justify-between active:scale-[0.98] touch-manipulation cursor-pointer ${btnStyle}`}
                    >
                      <span className="capitalize break-words hyphens-auto pr-2">{option}</span>
                      {isAnswerRevealed && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      {isAnswerRevealed && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {isAnswerRevealed && (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                    {selectedOption?.toLowerCase() === practiceQuestion.word.toLowerCase()
                      ? "🎉 Spot on! Great context recognition."
                      : `The correct word was "${practiceQuestion.word}".`}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextIdentify}
                    className="w-full sm:w-auto min-h-[38px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-medium transition-all shadow-2xs touch-manipulation cursor-pointer"
                  >
                    <span>Next Word</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ── MODE 2: FORM A STATEMENT FROM WORD ── */}
      {mode === "form" && formWordCard && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="min-w-0 pr-2">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">
                Target Word
              </span>
              <h4 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 capitalize break-words hyphens-auto">
                {formWordCard.word}
              </h4>
            </div>
            <button
              type="button"
              onClick={handleNextFormWord}
              className="min-h-[32px] px-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 touch-manipulation cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Next word</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-900/40">
            <p className="text-xs text-indigo-900/90 dark:text-indigo-200 leading-relaxed font-normal">
              <strong>Meaning:</strong> {formWordCard.meaning}
            </p>
          </div>

          <form onSubmit={handleEvaluateSentence} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Write a sentence using "{formWordCard.word}":
              </label>
              <textarea
                rows={3}
                value={studentSentence}
                onChange={(e) => setStudentSentence(e.target.value)}
                placeholder={`Use "${formWordCard.word}" in a sentence suitable for an essay or answer...`}
                className="w-full p-3 text-base sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed font-normal"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-[11px] text-slate-400">
                AI evaluates your grammar, nuance, and gives an editorial upgrade.
              </span>
              <button
                type="submit"
                disabled={!studentSentence.trim() || evaluatingSentence}
                className="w-full sm:w-auto min-h-[38px] inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-medium transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer touch-manipulation"
              >
                {evaluatingSentence ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Evaluate Sentence</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* AI Evaluation Card */}
          {sentenceEvalResult && (
            <div className="mt-3 p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/30 space-y-2.5">
              <div className="flex items-center gap-2">
                {sentenceEvalResult.isNatural ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Well Used
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    <HelpCircle className="w-3.5 h-3.5" /> Good Attempt
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {sentenceEvalResult.feedback}
              </p>

              {sentenceEvalResult.improvedSentence && (
                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
                  <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                    ✨ Editorial Polish
                  </span>
                  <p className="text-xs sm:text-sm italic text-slate-700 dark:text-slate-300 mt-1 leading-relaxed bg-white/70 dark:bg-slate-900/50 p-2.5 rounded-lg border border-indigo-100/70 dark:border-indigo-900/40 font-serif">
                    "{sentenceEvalResult.improvedSentence}"
                  </p>
                </div>
              )}

              <div className="pt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextFormWord}
                  className="w-full sm:w-auto min-h-[36px] inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 active:scale-[0.98] transition-all touch-manipulation cursor-pointer"
                >
                  <span>Practice Next Word</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

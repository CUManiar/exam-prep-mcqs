"use client";

import React, { useState, useEffect } from "react";
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

  // Load question for Mode 1 whenever active card changes
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
      // Fallback local question
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

  // Mode 2: Handle Sentence Evaluation
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center shadow-sm">
        <HelpCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          No words in your practice list yet
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
          Add at least 1–2 words you found hard in the Vocab tab above. Once added, you can practice them here in both directions!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
        <button
          type="button"
          onClick={() => setMode("identify")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            mode === "identify"
              ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Identify Word from Context</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("form")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
            mode === "form"
              ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>Form a Sentence from Word</span>
        </button>
      </div>

      {/* ── MODE 1: IDENTIFY WORD FROM STATEMENT ── */}
      {mode === "identify" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-3">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Question {currentCardIndex + 1} of {cards.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {showHint ? "Hide Hint" : "Need a Hint?"}
              </button>
            </div>
          </div>

          {loadingQuestion ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs">Generating context sentence...</p>
            </div>
          ) : practiceQuestion ? (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
                <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-serif">
                  {practiceQuestion.statementWithBlank}
                </p>
                {showHint && practiceQuestion.hint && (
                  <p className="mt-3 text-xs text-amber-700 dark:text-amber-300/90 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
                    💡 <strong>Hint:</strong> {practiceQuestion.hint}
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {practiceQuestion.options?.map((option) => {
                  const isCorrect =
                    option.toLowerCase() === practiceQuestion.word.toLowerCase();
                  const isSelected = selectedOption === option;

                  let btnStyle =
                    "border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200";

                  if (isAnswerRevealed) {
                    if (isCorrect) {
                      btnStyle =
                        "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold";
                    } else if (isSelected && !isCorrect) {
                      btnStyle =
                        "border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 line-through";
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
                      className={`p-3.5 rounded-xl border text-sm font-medium transition-all text-left flex items-center justify-between cursor-pointer ${btnStyle}`}
                    >
                      <span className="capitalize">{option}</span>
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
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedOption?.toLowerCase() === practiceQuestion.word.toLowerCase()
                      ? "🎉 Spot on! Great context recognition."
                      : `The correct word was "${practiceQuestion.word}".`}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextIdentify}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block">
                Target Word
              </span>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                {formWordCard.word}
              </h4>
            </div>
            <button
              type="button"
              onClick={handleNextFormWord}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Practice different word
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
            <p className="text-xs text-indigo-900 dark:text-indigo-200">
              <strong>Meaning:</strong> {formWordCard.meaning}
            </p>
          </div>

          <form onSubmit={handleEvaluateSentence} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Write a sentence using "{formWordCard.word}":
              </label>
              <textarea
                rows={3}
                value={studentSentence}
                onChange={(e) => setStudentSentence(e.target.value)}
                placeholder={`Form a sentence as you would use in an essay, editorial, or daily discussion...`}
                className="w-full p-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                AI evaluates natural usage, context fit, and offers an editorial refinement.
              </span>
              <button
                type="submit"
                disabled={!studentSentence.trim() || evaluatingSentence}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {evaluatingSentence ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Evaluate My Sentence</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* AI Feedback & Upgrade Card */}
          {sentenceEvalResult && (
            <div className="mt-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/30 dark:to-purple-950/20 space-y-3">
              <div className="flex items-center gap-2">
                {sentenceEvalResult.isNatural ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Well Used!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    <HelpCircle className="w-3.5 h-3.5" /> Good Attempt!
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {sentenceEvalResult.feedback}
              </p>

              {sentenceEvalResult.improvedSentence && (
                <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                    ✨ Editorial-Grade Polish
                  </span>
                  <p className="text-xs sm:text-sm italic text-slate-800 dark:text-slate-200 mt-1">
                    "{sentenceEvalResult.improvedSentence}"
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextFormWord}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
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

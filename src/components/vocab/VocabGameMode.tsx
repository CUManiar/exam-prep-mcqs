"use client";

import { useState, useEffect, useRef } from "react";
import { VocabCard } from "../../lib/vocabTypes";
import {
  Timer,
  Trophy,
  Zap,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Flame,
  AlertCircle,
} from "lucide-react";

interface VocabGameModeProps {
  cards: VocabCard[];
  onExitGame: () => void;
}

interface GameQuestion {
  card: VocabCard;
  type: "word-to-meaning" | "meaning-to-word";
  prompt: string;
  correctAnswer: string;
  options: string[];
}

export function VocabGameMode({ cards, onExitGame }: VocabGameModeProps) {
  const TOTAL_TIME_SECONDS = 120; // Strictly maximum 2 minutes

  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME_SECONDS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a random question from the student's saved cards
  const generateRandomQuestion = (excludeId?: string): GameQuestion | null => {
    if (cards.length === 0) return null;

    // Pick random target card
    const availableCards =
      cards.length > 1 && excludeId
        ? cards.filter((c) => c.id !== excludeId)
        : cards;
    const targetCard =
      availableCards[Math.floor(Math.random() * availableCards.length)];

    // 50% chance: Word to Meaning, or Meaning to Word
    const isWordToMeaning = Math.random() > 0.4;

    if (isWordToMeaning) {
      // Prompt: Word -> choose meaning
      const otherMeanings = cards
        .filter((c) => c.id !== targetCard.id)
        .map((c) => c.meaning);

      // Pick up to 3 distractors
      const shuffledDistractors = otherMeanings.sort(() => Math.random() - 0.5).slice(0, 3);

      // Fallback distractors if user has few cards
      while (shuffledDistractors.length < 3) {
        shuffledDistractors.push(
          shuffledDistractors.length === 0
            ? "To deliberately obscure or make unclear"
            : shuffledDistractors.length === 1
            ? "Lasting for a very short or transient time"
            : "Possessing supreme power or authoritative dominion",
        );
      }

      const options = [targetCard.meaning, ...shuffledDistractors].sort(
        () => Math.random() - 0.5,
      );

      return {
        card: targetCard,
        type: "word-to-meaning",
        prompt: targetCard.word,
        correctAnswer: targetCard.meaning,
        options,
      };
    } else {
      // Prompt: Meaning/Hook -> choose word
      const otherWords = cards
        .filter((c) => c.id !== targetCard.id)
        .map((c) => c.word);

      const shuffledDistractors = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
      while (shuffledDistractors.length < 3) {
        shuffledDistractors.push(
          shuffledDistractors.length === 0 ? "Epigram" : shuffledDistractors.length === 1 ? "Hegemony" : "Subsume",
        );
      }

      const options = [targetCard.word, ...shuffledDistractors].sort(
        () => Math.random() - 0.5,
      );

      return {
        card: targetCard,
        type: "meaning-to-word",
        prompt: targetCard.meaning,
        correctAnswer: targetCard.word,
        options,
      };
    }
  };

  const startGame = () => {
    setTimeLeft(TOTAL_TIME_SECONDS);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setQuestionsAnswered(0);
    setCorrectCount(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setGameState("playing");

    const firstQ = generateRandomQuestion();
    setCurrentQuestion(firstQ);
  };

  // Timer loop with strict 2-minute cutoff
  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setGameState("gameover");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const handleSelectOption = (option: string) => {
    if (selectedAnswer !== null || !currentQuestion) return;

    setSelectedAnswer(option);
    const isCorrect =
      option.toLowerCase().trim() ===
      currentQuestion.correctAnswer.toLowerCase().trim();

    setQuestionsAnswered((prev) => prev + 1);

    if (isCorrect) {
      setFeedback("correct");
      setCorrectCount((prev) => prev + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);

      // Streak multiplier bonus
      const bonus = newStreak >= 3 ? 15 : 10;
      setScore((prev) => prev + bonus);
    } else {
      setFeedback("incorrect");
      setStreak(0);
    }

    // Rapid transition to next random question after brief delay
    setTimeout(() => {
      setSelectedAnswer(null);
      setFeedback(null);
      const nextQ = generateRandomQuestion(currentQuestion.card.id);
      setCurrentQuestion(nextQ);
    }, 850);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progressPercent = ((TOTAL_TIME_SECONDS - timeLeft) / TOTAL_TIME_SECONDS) * 100;

  if (cards.length < 2) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-sm">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Need at least 2 words to play Blitz Game
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
          Add at least 2 or more words in your Vocab list first. The Blitz game randomly throws cards from your saved words in an intense 2-minute round!
        </p>
        <button
          type="button"
          onClick={onExitGame}
          className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
        >
          Add Words in Vocab Tab
        </button>
      </div>
    );
  }

  // ── IDLE / READY SCREEN ──
  if (gameState === "idle") {
    return (
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border border-indigo-900/60 rounded-3xl p-6 sm:p-12 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-lg mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Timer className="w-4 h-4 text-amber-400" />
            <span>Strict 2-Minute Time Limit</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Rapid Vocab Blitz
          </h2>

          <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed font-normal">
            Test your memory recall under pressure! Random cards from your saved wordbook will be thrown at you. You have exactly <strong>120 seconds</strong> to score as many points as you can.
          </p>

          <div className="grid grid-cols-3 gap-3 py-2 text-center">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xl font-semibold text-amber-400">120s</span>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Max Duration</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xl font-semibold text-emerald-400">+{cards.length}</span>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Saved Cards</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-xl font-semibold text-indigo-400">Combo</span>
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Streak Bonus</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={startGame}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-semibold shadow-md shadow-amber-500/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 mx-auto"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Start 2-Minute Blitz Now</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── GAME OVER / SUMMARY SCREEN ──
  if (gameState === "gameover") {
    const accuracy =
      questionsAnswered > 0
        ? Math.round((correctCount / questionsAnswered) * 100)
        : 0;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-5 max-w-xl mx-auto">
        <div className="inline-flex p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200 dark:border-amber-800">
          <Trophy className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Time's Up (2-Minute Round Finished)
          </span>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white mt-1">
            Blitz Round Complete
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Here is your rapid recall summary:
          </p>
        </div>

        {/* Score Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/50">
            <span className="text-xl sm:text-2xl font-semibold text-indigo-700 dark:text-indigo-300">
              {score}
            </span>
            <span className="text-[10px] font-medium text-indigo-900/70 dark:text-indigo-400 block mt-0.5">
              Score
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100/80 dark:border-emerald-900/50">
            <span className="text-xl sm:text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
              {correctCount}/{questionsAnswered}
            </span>
            <span className="text-[10px] font-medium text-emerald-900/70 dark:text-emerald-400 block mt-0.5">
              Correct
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100/80 dark:border-amber-900/50">
            <span className="text-xl sm:text-2xl font-semibold text-amber-700 dark:text-amber-300">
              {accuracy}%
            </span>
            <span className="text-[10px] font-medium text-amber-900/70 dark:text-amber-400 block mt-0.5">
              Accuracy
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100/80 dark:border-purple-900/50">
            <span className="text-xl sm:text-2xl font-semibold text-purple-700 dark:text-purple-300">
              {maxStreak}🔥
            </span>
            <span className="text-[10px] font-medium text-purple-900/70 dark:text-purple-400 block mt-0.5">
              Max Streak
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            type="button"
            onClick={startGame}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Play Another 2-Min Round</span>
          </button>

          <button
            type="button"
            onClick={onExitGame}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Back to Flashcards
          </button>
        </div>
      </div>
    );
  }

  // ── ACTIVE GAMEPLAY SCREEN ──
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* HUD Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-4">
        {/* Strict Countdown Timer */}
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl flex items-center justify-center ${
              timeLeft <= 20
                ? "bg-rose-100 text-rose-700 animate-pulse dark:bg-rose-950/60 dark:text-rose-400"
                : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400"
            }`}
          >
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <span
              className={`text-base sm:text-lg font-semibold font-mono tracking-tight ${
                timeLeft <= 20 ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-white"
              }`}
            >
              {formatTimer(timeLeft)}
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">2-Min Blitz</span>
          </div>
        </div>

        {/* Score & Streak */}
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium">
              <Flame className="w-3.5 h-3.5 fill-amber-500" />
              <span>{streak}x Combo</span>
            </span>
          )}

          <div className="text-right">
            <span className="text-base sm:text-lg font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
              {score} pts
            </span>
            <span className="text-[10px] text-slate-400 block">Score</span>
          </div>

          <button
            type="button"
            onClick={() => setGameState("gameover")}
            className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors font-medium"
          >
            End
          </button>
        </div>
      </div>

      {/* Progress Bar of 2-Minute time */}
      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            timeLeft <= 20
              ? "bg-rose-500"
              : timeLeft <= 50
              ? "bg-amber-500"
              : "bg-indigo-600"
          }`}
          style={{ width: `${100 - progressPercent}%` }}
        />
      </div>

      {/* Current Question Card with break-words */}
      {currentQuestion && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-sm space-y-5">
          <div className="text-center space-y-1.5 px-2">
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {currentQuestion.type === "word-to-meaning"
                ? "Select the Matching Meaning:"
                : "Identify the Matching Word:"}
            </span>

            <h3 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 capitalize break-words hyphens-auto leading-snug">
              {currentQuestion.prompt}
            </h3>
          </div>

          {/* Options Grid */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer =
                option.toLowerCase().trim() ===
                currentQuestion.correctAnswer.toLowerCase().trim();

              let btnStyle =
                "border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/70 hover:border-indigo-400 text-slate-800 dark:text-slate-100";

              if (selectedAnswer !== null) {
                if (isCorrectAnswer) {
                  btnStyle =
                    "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 font-medium ring-1 ring-emerald-500/30";
                } else if (isSelected && !isCorrectAnswer) {
                  btnStyle =
                    "border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-100 line-through ring-1 ring-rose-500/30";
                } else {
                  btnStyle = "opacity-40 border-slate-200 dark:border-slate-800";
                }
              }

              return (
                <button
                  key={`${option}-${idx}`}
                  type="button"
                  disabled={selectedAnswer !== null}
                  onClick={() => handleSelectOption(option)}
                  className={`w-full min-h-[48px] p-3.5 rounded-xl border text-left text-sm font-normal transition-all flex items-center justify-between active:scale-[0.98] cursor-pointer touch-manipulation ${btnStyle}`}
                >
                  <span className="pr-3 leading-snug break-words hyphens-auto">{option}</span>
                  {selectedAnswer !== null && isCorrectAnswer && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  {selectedAnswer !== null && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div className="text-center font-medium text-xs pt-1">
              {feedback === "correct" ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  ⚡ Correct! +{streak >= 3 ? "15" : "10"} pts
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400">
                  ✗ Missed. Correct answer: "{currentQuestion.correctAnswer}"
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


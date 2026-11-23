"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  Sparkles,
  Target,
  BarChart3,
  Scale,
} from "lucide-react";
import { MainsAttemptItem } from "@/lib/mainsEvaluation";

interface MainsAttemptComparisonViewProps {
  questionText: string;
  paperType: string;
  optionalSubject?: string;
  maxMarks: number;
  attempts: MainsAttemptItem[];
  onClose: () => void;
  onSelectAttemptForDetail: (attemptIndex: number) => void;
}

export function MainsAttemptComparisonView({
  questionText,
  paperType,
  optionalSubject,
  maxMarks,
  attempts,
  onClose,
  onSelectAttemptForDetail,
}: MainsAttemptComparisonViewProps) {
  // Filter evaluated attempts only
  const evaluatedAttempts = useMemo(
    () =>
      attempts
        .map((att, originalIndex) => ({ att, originalIndex }))
        .filter(
          (item) =>
            item.att.evaluation &&
            typeof item.att.evaluation.marksAwarded === "number",
        ),
    [attempts],
  );

  // Default to comparing the earliest attempt (Attempt 1) with the latest attempt
  const [indexA, setIndexA] = useState<number>(0);
  const [indexB, setIndexB] = useState<number>(
    Math.max(0, evaluatedAttempts.length - 1),
  );

  const itemA = evaluatedAttempts[indexA] || evaluatedAttempts[0];
  const itemB =
    evaluatedAttempts[indexB] ||
    evaluatedAttempts[evaluatedAttempts.length - 1];

  const evalA = itemA?.att.evaluation;
  const evalB = itemB?.att.evaluation;

  const scoreA = evalA?.marksAwarded ?? 0;
  const scoreB = evalB?.marksAwarded ?? 0;
  const deltaScore = Math.round((scoreB - scoreA) * 10) / 10;

  const pctA = evalA?.percentage ?? Math.round((scoreA / maxMarks) * 100);
  const pctB = evalB?.percentage ?? Math.round((scoreB / maxMarks) * 100);
  const deltaPct = pctB - pctA;

  const wordsA =
    evalA?.actualWordCount ||
    itemA?.att.studentAnswer?.trim().split(/\s+/).filter(Boolean).length ||
    0;
  const wordsB =
    evalB?.actualWordCount ||
    itemB?.att.studentAnswer?.trim().split(/\s+/).filter(Boolean).length ||
    0;
  const deltaWords = wordsB - wordsA;

  // Dimension Scores
  const dimDemandA = evalA?.dimensions?.demand?.score ?? 0;
  const dimDemandB = evalB?.dimensions?.demand?.score ?? 0;
  const deltaDemand = Math.round((dimDemandB - dimDemandA) * 10) / 10;

  const dimContentA = evalA?.dimensions?.content?.score ?? 0;
  const dimContentB = evalB?.dimensions?.content?.score ?? 0;
  const deltaContent = Math.round((dimContentB - dimContentA) * 10) / 10;

  const dimStructA = evalA?.dimensions?.structure?.score ?? 0;
  const dimStructB = evalB?.dimensions?.structure?.score ?? 0;
  const deltaStruct = Math.round((dimStructB - dimStructA) * 10) / 10;

  const dimPresA = evalA?.dimensions?.presentation?.score ?? 0;
  const dimPresB = evalB?.dimensions?.presentation?.score ?? 0;
  const deltaPres = Math.round((dimPresB - dimPresA) * 10) / 10;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Detailed Evaluation</span>
        </button>

        {/* Dropdown Selectors if more than 2 evaluated attempts */}
        {evaluatedAttempts.length > 2 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Compare:</span>
            <select
              value={indexA}
              onChange={(e) => setIndexA(Number(e.target.value))}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              {evaluatedAttempts.map((item, idx) => (
                <option key={idx} value={idx}>
                  Attempt {item.att.attemptNumber} (
                  {item.att.evaluation?.marksAwarded} Marks)
                </option>
              ))}
            </select>
            <span className="text-slate-400 font-bold">vs</span>
            <select
              value={indexB}
              onChange={(e) => setIndexB(Number(e.target.value))}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              {evaluatedAttempts.map((item, idx) => (
                <option key={idx} value={idx}>
                  Attempt {item.att.attemptNumber} (
                  {item.att.evaluation?.marksAwarded} Marks)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Score Progression Hero ── */}
      <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Attempt Progression & Delta Analysis
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
              "{questionText}"
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparing Attempt {itemA?.att.attemptNumber} with Attempt{" "}
              {itemB?.att.attemptNumber}
            </p>
          </div>

          {/* Scores Comparison Strip */}
          <div className="flex items-center gap-4 bg-white dark:bg-slate-800/90 p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs shrink-0">
            {/* Attempt A */}
            <div className="text-center space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Attempt {itemA?.att.attemptNumber}
              </span>
              <div className="font-mono text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">
                {scoreA}
                <span className="text-xs font-normal text-slate-400">
                  /{maxMarks}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 block">
                {wordsA} words ({pctA}%)
              </span>
            </div>

            {/* Delta Arrow */}
            <div className="flex flex-col items-center justify-center px-1">
              <ArrowRight className="h-5 w-5 text-indigo-500" />
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full mt-1 ${
                  deltaScore > 0
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                    : deltaScore < 0
                      ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                }`}
              >
                {deltaScore >= 0 ? `+${deltaScore}` : deltaScore}
              </span>
            </div>

            {/* Attempt B */}
            <div className="text-center space-y-0.5">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                Attempt {itemB?.att.attemptNumber}
              </span>
              <div className="font-mono text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {scoreB}
                <span className="text-xs font-normal text-indigo-400 dark:text-indigo-300">
                  /{maxMarks}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 block">
                {wordsB} words ({pctB}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Core Dimensions Progression Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Demand */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Directive & Demand</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                deltaDemand >= 0
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-50 dark:bg-rose-950 text-rose-700"
              }`}
            >
              {deltaDemand >= 0 ? `+${deltaDemand}` : deltaDemand}
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">
              Att {itemA?.att.attemptNumber}: {dimDemandA}/10
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              Att {itemB?.att.attemptNumber}: {dimDemandB}/10
            </span>
          </div>
        </div>

        {/* 2. Content */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Content & Citations</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                deltaContent >= 0
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-50 dark:bg-rose-950 text-rose-700"
              }`}
            >
              {deltaContent >= 0 ? `+${deltaContent}` : deltaContent}
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">
              Att {itemA?.att.attemptNumber}: {dimContentA}/10
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              Att {itemB?.att.attemptNumber}: {dimContentB}/10
            </span>
          </div>
        </div>

        {/* 3. Structure */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Structure & Flow</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                deltaStruct >= 0
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-50 dark:bg-rose-950 text-rose-700"
              }`}
            >
              {deltaStruct >= 0 ? `+${deltaStruct}` : deltaStruct}
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">
              Att {itemA?.att.attemptNumber}: {dimStructA}/10
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              Att {itemB?.att.attemptNumber}: {dimStructB}/10
            </span>
          </div>
        </div>

        {/* 4. Presentation */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Presentation & Time</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                deltaPres >= 0
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-50 dark:bg-rose-950 text-rose-700"
              }`}
            >
              {deltaPres >= 0 ? `+${deltaPres}` : deltaPres}
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400">
              Att {itemA?.att.attemptNumber}: {dimPresA}/10
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              Att {itemB?.att.attemptNumber}: {dimPresB}/10
            </span>
          </div>
        </div>
      </div>

      {/* ── Examiner Verdict Comparison ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Attempt {itemA?.att.attemptNumber} Examiner Verdict
            </span>
            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
              {scoreA}/{maxMarks}
            </span>
          </div>
          <p className="text-xs italic text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            "{evalA?.verdict || "No verdict recorded."}"
          </p>
        </div>

        <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              Attempt {itemB?.att.attemptNumber} Examiner Verdict
            </span>
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {scoreB}/{maxMarks}
            </span>
          </div>
          <p className="text-xs italic text-slate-800 dark:text-slate-200 bg-indigo-50/50 dark:bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
            "{evalB?.verdict || "No verdict recorded."}"
          </p>
        </div>
      </div>

      {/* ── Side-by-Side Answers Comparison ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <span>Side-by-Side Candidate Submissions</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Attempt A Written Answer */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Attempt {itemA?.att.attemptNumber} Written Answer ({wordsA}{" "}
                words)
              </span>
              <button
                type="button"
                onClick={() => onSelectAttemptForDetail(itemA.originalIndex)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Inspect Copy →
              </button>
            </div>
            <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 max-h-96 overflow-y-auto whitespace-pre-wrap font-sans">
              {itemA?.att.studentAnswer ||
                evalA?.studentAnswer ||
                "(Handwritten pages submitted)"}
            </div>
          </div>

          {/* Attempt B Written Answer */}
          <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
              <span className="font-bold text-xs text-indigo-900 dark:text-indigo-200">
                Attempt {itemB?.att.attemptNumber} Written Answer ({wordsB}{" "}
                words)
              </span>
              <button
                type="button"
                onClick={() => onSelectAttemptForDetail(itemB.originalIndex)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Inspect Copy →
              </button>
            </div>
            <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 max-h-96 overflow-y-auto whitespace-pre-wrap font-sans">
              {itemB?.att.studentAnswer ||
                evalB?.studentAnswer ||
                "(Handwritten pages submitted)"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

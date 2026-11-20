"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Target,
  Sparkles,
  TrendingUp,
  Award,
  Zap,
  ChevronDown,
  ChevronUp,
  Gauge,
  Timer,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { MainsEvaluationResult } from "@/lib/mainsEvaluation";

interface MainsDissectionsPanelProps {
  evaluation: MainsEvaluationResult;
}

export function MainsDissectionsPanel({
  evaluation,
}: MainsDissectionsPanelProps) {
  const [showPacingGuide, setShowPacingGuide] = useState(false);
  const marks = evaluation.marksAwarded;
  const max = evaluation.maxMarks;
  const pct = evaluation.percentage;

  // UPSC Mains Evaluation Tier Benchmarking
  const tierInfo = useMemo(() => {
    if (pct >= 55) {
      return {
        name: "Topper Rank-Fetcher Tier",
        desc: "Top 1% answer in UPSC Mains. Balanced analysis, crisp citations & synthesis verdict.",
        color: "text-emerald-700 dark:text-emerald-300",
        bg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800",
        barColor: "bg-emerald-500",
        nextTier: null,
        margin: 0,
      };
    } else if (pct >= 45) {
      return {
        name: "Mains Qualifier Standard",
        desc: "Competitive score within Mains interview-call range. Strengthen citations & value boxes to reach rank-fetching marks.",
        color: "text-indigo-700 dark:text-indigo-300",
        bg: "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800",
        barColor: "bg-indigo-500",
        nextTier: "Topper Tier (55%+)",
        margin: Math.max(0.5, Math.round((max * 0.55 - marks) * 10) / 10),
      };
    } else if (pct >= 32) {
      return {
        name: "Average Attempt Tier",
        desc: "Typical candidate baseline (3.2–4.4/10). Needs sharper operational keyword subheadings, empirical cases, and counterview.",
        color: "text-amber-800 dark:text-amber-300",
        bg: "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800",
        barColor: "bg-amber-500",
        nextTier: "Mains Qualifier (45%+)",
        margin: Math.max(0.5, Math.round((max * 0.45 - marks) * 10) / 10),
      };
    } else {
      return {
        name: "Below Average Tier",
        desc: "Lacks core directive compliance, structure, or contains conceptual inaccuracies. Re-read directive and foundational facts.",
        color: "text-rose-800 dark:text-rose-300",
        bg: "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-900",
        barColor: "bg-rose-500",
        nextTier: "Average Baseline (35%+)",
        margin: Math.max(0.5, Math.round((max * 0.35 - marks) * 10) / 10),
      };
    }
  }, [marks, max, pct]);

  // Word Economy & Pacing Analysis
  const pacingInfo = useMemo(() => {
    const targetWords =
      evaluation.targetWordCount || (max === 10 ? 150 : max === 15 ? 250 : 300);
    const targetTime =
      evaluation.timeLimitMinutes || (max === 10 ? 7 : max === 15 ? 11 : 20);

    const actualWords =
      evaluation.actualWordCount ||
      (evaluation.studentAnswer &&
      !evaluation.studentAnswer.startsWith("(Answer submitted via")
        ? evaluation.studentAnswer.trim().split(/\s+/).filter(Boolean).length
        : 0);

    const compliance =
      targetWords > 0 ? Math.round((actualWords / targetWords) * 100) : 100;
    const isUnder = actualWords > 0 && compliance < 75;
    const isOver = actualWords > 0 && compliance > 125;
    const isOptimal = actualWords > 0 && !isUnder && !isOver;

    const wordsPerMin =
      actualWords > 0 ? Math.round((actualWords / targetTime) * 10) / 10 : 0;

    return {
      targetWords,
      targetTime,
      actualWords,
      compliance,
      isUnder,
      isOver,
      isOptimal,
      wordsPerMin,
    };
  }, [evaluation, max]);

  // Detected Citations, Articles, Thinkers & Case Laws from Marked Copy & Answer
  const detectedCitations = useMemo(() => {
    const fullText = `${evaluation.studentAnswer || ""} ${JSON.stringify(evaluation.markedCopy || [])}`;
    const citations: Array<{
      label: string;
      type: "article" | "case" | "thinker" | "stat";
    }> = [];

    // Articles & Constitutional provisions
    const artMatches = fullText.match(
      /\b(?:Art(?:icle|\.)?\s*\d+(?:\(\w+\))*)/gi,
    );
    if (artMatches) {
      const unique = Array.from(new Set(artMatches.map((m) => m.trim())));
      unique.slice(0, 4).forEach((m) => {
        citations.push({ label: m, type: "article" });
      });
    }

    // Landmark Case Laws
    const caseMatches = fullText.match(
      /\b([A-Z][a-zA-Z\s\.]+\s*(?:v\.|vs\.|case|judgment))/gi,
    );
    if (caseMatches) {
      const unique = Array.from(new Set(caseMatches.map((m) => m.trim())));
      unique.slice(0, 3).forEach((m) => {
        if (!m.toLowerCase().includes("supreme court") && m.length < 40) {
          citations.push({ label: m, type: "case" });
        }
      });
    }

    // Sociological or Administrative Thinkers
    const thinkers = [
      "Weber",
      "Durkheim",
      "Marx",
      "Parsons",
      "Srinivas",
      "Ghurye",
      "Beteille",
      "Desai",
      "Merton",
      "Kautilya",
      "Ambedkar",
      "Gandhi",
    ];
    thinkers.forEach((t) => {
      if (new RegExp(`\\b${t}\\b`, "i").test(fullText)) {
        citations.push({ label: `${t}`, type: "thinker" });
      }
    });

    return citations;
  }, [evaluation]);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-indigo-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Examiner Dissections & UPSC Benchmark
          </h4>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          UPSC Scaling Curve
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. UPSC Scaling Curve Dissection */}
        <div
          className={`p-3.5 rounded-xl border ${tierInfo.bg} flex flex-col justify-between space-y-2`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                UPSC Bell Curve Standard
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tierInfo.color} font-mono`}
              >
                {pct}%
              </span>
            </div>
            <h5
              className={`text-xs font-bold ${tierInfo.color} flex items-center gap-1`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>{tierInfo.name}</span>
            </h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              {tierInfo.desc}
            </p>
          </div>

          {tierInfo.nextTier && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] font-medium text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                <span>To reach {tierInfo.nextTier}:</span>
              </span>
              <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                +{tierInfo.margin} pts
              </span>
            </div>
          )}
        </div>

        {/* 2. Pacing & Word Economy Dissection */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between space-y-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Gauge className="h-3 w-3 text-indigo-500" />
                <span>Pacing & Economy</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPacingGuide((prev) => !prev)}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer transition-colors"
                title="Toggle in-depth pacing and word economy strategy"
              >
                <span>
                  {showPacingGuide ? "Hide Guide" : "Explain Strategy"}
                </span>
                {showPacingGuide ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
                  {pacingInfo.actualWords || "~"}
                </span>
                <span className="text-xs text-slate-500">
                  / {pacingInfo.targetWords} Words Target
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                {pacingInfo.targetTime}m limit
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pacingInfo.isOptimal
                    ? "bg-emerald-500"
                    : pacingInfo.isUnder
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(15, pacingInfo.compliance))}%`,
                }}
              />
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {pacingInfo.isOptimal && (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Ideal word density ({pacingInfo.compliance}%). Calibrated
                  for the {pacingInfo.targetTime}-minute exam-hall slot.
                </span>
              )}
              {pacingInfo.isUnder && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️ Under-attempted ({pacingInfo.compliance}%). Left ~
                  {pacingInfo.targetWords - pacingInfo.actualWords} words
                  unused. Risk of missing dimensions.
                </span>
              )}
              {pacingInfo.isOver && (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  ⚠️ Over-extended ({pacingInfo.compliance}%). Exceeds limit by
                  +{pacingInfo.actualWords - pacingInfo.targetWords} words. Risk
                  of paper incompletion.
                </span>
              )}
              {!pacingInfo.isOptimal &&
                !pacingInfo.isUnder &&
                !pacingInfo.isOver && (
                  <span>Evaluated from submission sheet.</span>
                )}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span>Handwriting Rate:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {pacingInfo.wordsPerMin > 0
                ? `~${pacingInfo.wordsPerMin} wpm`
                : `~${Math.round(pacingInfo.targetWords / pacingInfo.targetTime)} wpm target`}
            </span>
          </div>
        </div>

        {/* 3. Citations & Value-Addition Detected */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between space-y-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Key Citations & Thinkers Audit
              </span>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                {detectedCitations.length} Detected
              </span>
            </div>

            {detectedCitations.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {detectedCitations.map((cit, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs"
                  >
                    <span>{cit.label}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                No constitutional Articles, Case Laws, or Thinkers explicitly
                cited. Value additions directly elevate marks from 3.5 to 5.0+.
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400">
            {evaluation.paperType === "Optional"
              ? "Sociology / Optional: Thinkers & empirical cases fetch topper marks."
              : "GS Papers: Article & Committee citations ensure factual authority."}
          </div>
        </div>
      </div>

      {/* Expanded Pacing & Word Economy Strategy Guide */}
      {showPacingGuide && (
        <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/20 shadow-xs space-y-3.5 transition-all animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-3 border-b border-indigo-100 dark:border-indigo-900/40 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                <Timer className="h-4 w-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>UPSC CSE Exam-Hall Pacing & Word Economy Guide</span>
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Why writing speed and word density dictate marks in the 3-hour
                  exam
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPacingGuide(false)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* 1. Exam Reality & Specific Diagnosis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Real Exam Hall Dynamics */}
            <div className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>The 180-Minute Exam Hall Reality</span>
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                In UPSC Mains, you must write{" "}
                <strong>20 questions (~4,000 words)</strong> in 180 minutes:
              </p>
              <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                <li>
                  <strong>
                    10-Markers ({max === 10 ? "Current" : "150 Words"}):
                  </strong>{" "}
                  Strictly <strong>7 minutes</strong> (~21 wpm). 2 pages
                  provided.
                </li>
                <li>
                  <strong>
                    15-Markers ({max === 15 ? "Current" : "250 Words"}):
                  </strong>{" "}
                  Strictly <strong>11 minutes</strong> (~22-23 wpm). 3 pages
                  provided.
                </li>
              </ul>
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold pt-1">
                ⚠️ Overrunning by just 2 minutes on each question steals 40
                minutes, guaranteeing 2-3 questions left completely unattempted
                (loss of 20-30 marks).
              </p>
            </div>

            {/* Candidate Diagnostic */}
            <div className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Target className="h-3 w-3 text-indigo-600" />
                <span>
                  Diagnostic for Your Attempt ({pacingInfo.actualWords || 0}{" "}
                  words)
                </span>
              </span>
              {pacingInfo.isUnder ? (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  <strong>Under-Density Penalty:</strong> At{" "}
                  {pacingInfo.actualWords} words, you utilized only{" "}
                  {pacingInfo.compliance}% of the space. In UPSC answer sheets,
                  blank margins signal to examiners that key dimensions
                  (counterview, institutional reports, or case studies) were
                  missed, directly capping marks at 2.5–3.5.
                </p>
              ) : pacingInfo.isOver ? (
                <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                  <strong>Over-Length Risk:</strong> At {pacingInfo.actualWords}{" "}
                  words ({pacingInfo.compliance}% of limit), writing this by
                  hand would consume ~
                  {Math.round(
                    ((pacingInfo.actualWords || pacingInfo.targetWords) / 20) *
                      10,
                  ) / 10}{" "}
                  minutes under pressure. This pace is unsustainable across 20
                  questions and risks incomplete answer papers.
                </p>
              ) : (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  <strong>Well-Calibrated Pacing:</strong> Your word count is in
                  the sweet spot ({pacingInfo.compliance}%). This leaves 45–60
                  seconds for initial brainstorming, structural headings, and
                  drawing a high-yield value-addition box without running out of
                  time.
                </p>
              )}
              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Attempted: {pacingInfo.actualWords || 0} words</span>
                <span>Target: {pacingInfo.targetWords} words</span>
              </div>
            </div>
          </div>

          {/* 2. High-Yield Word Economy Tactics */}
          <div className="p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
            <h6 className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              <span>3 Golden Rules of Word Economy in UPSC Mains</span>
            </h6>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <span>1. Anchor-Led Bullets</span>
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Never write narrative prose. Use bold 2-word anchor headings:{" "}
                  <em>* Fiscal Strain:* States shoulder...</em> Saves 25% words
                  and speeds examiner reading.
                </p>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <span>2. Diagrammatic Compression</span>
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Replace 35 words of structural mechanism with a 2-branch
                  flowchart or 2x2 matrix. Takes 15 seconds, saves space, and
                  fetches visual bonus marks.
                </p>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <span>3. Zero-Preamble Intro</span>
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Skip 'Since ancient times...' filler. Jump straight into the
                  core definition or empirical context in strictly ≤20 words.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { Attempt, QuestionPaper } from "../../lib/types";
import { inferPaperStream } from "../../lib/paperStream";
import { AlertTriangle, Target, TrendingDown, Zap, Info } from "lucide-react";

interface StrategicDiagnosticsWidgetProps {
  attempts: Attempt[];
  papers: QuestionPaper[];
}

function normalizeSubject(subj: string): string {
  const s = (subj || "").trim().toLowerCase();
  if (s.includes("polity") || s.includes("constitution")) return "Polity";
  if (s.includes("economy") || s.includes("economics")) return "Economy";
  if (s.includes("geography")) return "Geography";
  if (
    s.includes("history") ||
    s.includes("culture") ||
    s.includes("ancient") ||
    s.includes("modern")
  )
    return "History";
  if (
    s.includes("environment") ||
    s.includes("ecology") ||
    s.includes("biodiversity")
  )
    return "Environment";
  if (s.includes("science") || s.includes("tech")) return "Science & Tech";
  if (s.includes("csat") || s.includes("aptitude") || s.includes("reasoning"))
    return "CSAT";
  return "General Studies";
}

export function StrategicDiagnosticsWidget({
  attempts,
  papers,
}: StrategicDiagnosticsWidgetProps) {
  const completed = useMemo(
    () =>
      [...attempts]
        .filter((a) => Boolean(a.finishedAt))
        .sort(
          (a, b) =>
            new Date(b.finishedAt || b.startedAt).getTime() -
            new Date(a.finishedAt || a.startedAt).getTime(),
        ),
    [attempts],
  );

  // 1. PROJECTED PRELIMS SCORES — SEPARATE GS (92 / 105) & CSAT (66.67 / 75)
  const computeStreamProjection = (
    targetStream: "GS" | "CSAT",
    cutoffBenchmark: number,
    safetyBenchmark: number,
  ) => {
    const mocks = completed.filter((a) => {
      if (a.mode !== "mock") return false;
      const stream =
        a.paperStream ||
        inferPaperStream({
          category: a.category,
          examType: a.examType,
          label: a.paperLabel,
          subject: a.paperLabel,
        }).paperStream;
      return stream === targetStream;
    });
    if (mocks.length === 0) return null;

    // Last 5 mocks with recency weighting (5x, 4x, 3x, 2x, 1x)
    const recent = mocks.slice(0, 5);
    let weightedSum = 0;
    let weightTotal = 0;

    recent.forEach((m, idx) => {
      const weight = recent.length - idx;
      const normalizedScore = m.maxScore > 0 ? (m.score / m.maxScore) * 200 : 0;
      weightedSum += normalizedScore * weight;
      weightTotal += weight;
    });

    const projectedScore =
      Math.round((weightedSum / Math.max(1, weightTotal)) * 10) / 10;
    const cutoffMargin =
      Math.round((projectedScore - cutoffBenchmark) * 10) / 10;
    const safetyMargin =
      Math.round((projectedScore - safetyBenchmark) * 10) / 10;

    return {
      projectedScore,
      cutoffBenchmark,
      safetyBenchmark,
      cutoffMargin,
      safetyMargin,
      isQualifying: projectedScore >= cutoffBenchmark,
      isSafeBuffer: projectedScore >= safetyBenchmark,
      mockCount: recent.length,
      averageMockAccuracy:
        Math.round(
          (recent.reduce((sum, m) => sum + (m.accuracyPct || 0), 0) /
            recent.length) *
            10,
        ) / 10,
    };
  };

  const projectedGS = useMemo(
    () => computeStreamProjection("GS", 92.0, 105.0),
    [completed],
  );
  const projectedCSAT = useMemo(
    () => computeStreamProjection("CSAT", 66.67, 75.0),
    [completed],
  );

  // 2. WRONG ANSWERS TAGGED "SURE" (Overconfidence Trap)
  const sureMistakesAnalysis = useMemo(() => {
    let totalSureAttempts = 0;
    let totalSureMistakes = 0;
    let totalMistakesOverall = 0;
    const subjectSureMistakes: Record<string, number> = {};

    completed.forEach((att) => {
      const matchedPaper = papers.find((p) => p.id === att.paperId);
      const paperSubject = normalizeSubject(
        matchedPaper?.subject || att.paperLabel || "",
      );

      totalMistakesOverall += att.incorrect || 0;

      if (att.answers) {
        Object.values(att.answers).forEach((ans) => {
          if (ans.confidence === "sure") {
            totalSureAttempts++;
            if (ans.isCorrect === false) {
              totalSureMistakes++;
              const subj = normalizeSubject(ans.subject || paperSubject);
              subjectSureMistakes[subj] = (subjectSureMistakes[subj] || 0) + 1;
            }
          }
        });
      }
    });

    const overconfidenceRate =
      totalMistakesOverall > 0
        ? Math.round((totalSureMistakes / totalMistakesOverall) * 100)
        : 0;

    const topBlindspotSubject = Object.entries(subjectSureMistakes).sort(
      (a, b) => b[1] - a[1],
    )[0];

    const marksLostToSureMistakes =
      Math.round(totalSureMistakes * 2.667 * 10) / 10;

    return {
      totalSureAttempts,
      totalSureMistakes,
      overconfidenceRate,
      marksLostToSureMistakes,
      topSubject: topBlindspotSubject ? topBlindspotSubject[0] : null,
      topSubjectCount: topBlindspotSubject ? topBlindspotSubject[1] : 0,
    };
  }, [completed, papers]);

  // 3. MARKS LOST TO NEGATIVES (Negative Leakage Audit)
  const negativeLeakage = useMemo(() => {
    const mocks = completed.filter((a) => a.mode === "mock");
    const sourceAttempts = mocks.length > 0 ? mocks : completed;

    const totalNegatives = sourceAttempts.reduce(
      (sum, a) => sum + (a.incorrect || 0),
      0,
    );
    const penaltyMarks =
      Math.round(
        sourceAttempts.reduce(
          (sum, a) => sum + (a.incorrect || 0) * (a.incorrectMarks || 0.667),
          0,
        ) * 10,
      ) / 10;
    const avgPenaltyPerMock =
      Math.round((penaltyMarks / Math.max(1, sourceAttempts.length)) * 10) / 10;
    const realizedScore = Math.round(
      sourceAttempts.reduce((sum, a) => sum + a.score, 0),
    );
    const cleanPotentialScore = Math.round(realizedScore + penaltyMarks);

    return {
      totalNegatives,
      penaltyMarks,
      avgPenaltyPerMock,
      realizedScore,
      cleanPotentialScore,
      mockCount: sourceAttempts.length,
    };
  }, [completed]);

  // 4. ACCURACY BY SUBJECT (Rolling 4 Weeks / 28 Days)
  const rollingSubjectAccuracy = useMemo(() => {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const minTimestamp = fourWeeksAgo.getTime();

    const recentAttempts = completed.filter((a) => {
      const t = new Date(a.finishedAt || a.startedAt).getTime();
      return !Number.isNaN(t) && t >= minTimestamp;
    });

    const activeAttempts =
      recentAttempts.length > 0 ? recentAttempts : completed.slice(0, 10);
    const isUsingAllFallback = recentAttempts.length === 0;

    let totalQs = 0;
    let totalCorrect = 0;
    const subjectMap: Record<
      string,
      { subject: string; correct: number; total: number }
    > = {};

    activeAttempts.forEach((att) => {
      const matchedPaper = papers.find((p) => p.id === att.paperId);
      const defaultSubj = normalizeSubject(
        matchedPaper?.subject || att.paperLabel || "",
      );

      totalQs += att.answered || 0;
      totalCorrect += att.correct || 0;

      if (att.answers && Object.keys(att.answers).length > 0) {
        Object.values(att.answers).forEach((ans) => {
          if (ans.selected !== null && ans.selected !== undefined) {
            const subj = normalizeSubject(ans.subject || defaultSubj);
            if (!subjectMap[subj]) {
              subjectMap[subj] = { subject: subj, correct: 0, total: 0 };
            }
            subjectMap[subj].total++;
            if (ans.isCorrect) subjectMap[subj].correct++;
          }
        });
      } else {
        if (!subjectMap[defaultSubj]) {
          subjectMap[defaultSubj] = {
            subject: defaultSubj,
            correct: 0,
            total: 0,
          };
        }
        subjectMap[defaultSubj].total += att.answered || 0;
        subjectMap[defaultSubj].correct += att.correct || 0;
      }
    });

    const overallAccuracyPct =
      totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : 0;

    const subjectsList = Object.values(subjectMap)
      .filter((s) => s.total >= 3)
      .map((s) => ({
        ...s,
        accuracyPct: Math.round((s.correct / s.total) * 100),
      }))
      .sort((a, b) => b.accuracyPct - a.accuracyPct);

    return {
      overallAccuracyPct,
      totalQs,
      isUsingAllFallback,
      subjects: subjectsList,
      topSubject: subjectsList[0] || null,
      weakestSubject:
        subjectsList.length > 1 ? subjectsList[subjectsList.length - 1] : null,
    };
  }, [completed, papers]);

  return (
    <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5 w-full min-w-0">
      {/* ── CARD 1A: GS Prelims Predictability (92 Cut-to-Cut / 105 Safe) ── */}
      <div className="group relative surface-card flex items-start gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-indigo-300 hover:shadow-sm transition-all cursor-default min-w-0">
        <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ring-1 bg-indigo-50 ring-indigo-200/70 text-indigo-600">
          <Target className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <span className="block truncate text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              GS Prelims
            </span>
            <Info className="h-3 w-3 text-slate-300 group-hover:text-indigo-500 shrink-0 transition-colors hidden sm:block" />
          </div>
          <span className="mt-0.5 block text-base sm:text-xl font-black tracking-tight text-slate-900 tabular-nums truncate">
            {projectedGS ? `${projectedGS.projectedScore}` : "—"}
            <span className="text-[10px] sm:text-xs font-normal text-slate-400 ml-1">
              / 200
            </span>
          </span>
          {projectedGS ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-medium">
              <span
                className={
                  projectedGS.cutoffMargin >= 0
                    ? "text-emerald-700 font-semibold"
                    : "text-rose-700 font-semibold"
                }
              >
                92: {projectedGS.cutoffMargin >= 0 ? "+" : ""}
                {projectedGS.cutoffMargin}
              </span>
              <span
                className={
                  projectedGS.safetyMargin >= 0
                    ? "text-emerald-700 font-semibold"
                    : "text-amber-700 font-semibold"
                }
              >
                105: {projectedGS.safetyMargin >= 0 ? "+" : ""}
                {projectedGS.safetyMargin}
              </span>
            </div>
          ) : (
            <span className="mt-0.5 block truncate text-[10px] text-slate-500">
              Need ≥1 GS mock
            </span>
          )}
        </div>

        {/* Hover Popover */}
        <div className="pointer-events-none invisible opacity-0 sm:group-hover:visible sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto transition-all duration-200 ease-out absolute z-40 top-full mt-2.5 left-0 w-72 sm:w-80 rounded-2xl bg-slate-900/95 text-slate-100 p-4 shadow-2xl backdrop-blur-md border border-slate-800 text-xs hidden sm:block">
          <div className="absolute -top-1.5 left-8 w-3 h-3 bg-slate-900 border-t border-l border-slate-800 rotate-45" />
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-indigo-400" />
                GS Prelims Predictability
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {projectedGS?.mockCount ?? 0} GS mocks
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Recency-weighted GS Paper-I projection (200 marks) evaluated on
              two factors: Cut-to-Cut (92.0) and Margin of Safety (105.0).
            </p>
            <div className="space-y-1.5 pt-1 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>1. Cut-to-Cut (92.0):</span>
                <span
                  className={
                    projectedGS?.isQualifying
                      ? "text-emerald-400 font-bold"
                      : "text-rose-400 font-bold"
                  }
                >
                  {projectedGS
                    ? `${projectedGS.cutoffMargin >= 0 ? "+" : ""}${projectedGS.cutoffMargin} pts (${projectedGS.isQualifying ? "Pass" : "Short"})`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>2. Margin of Safety (105.0):</span>
                <span
                  className={
                    projectedGS?.isSafeBuffer
                      ? "text-emerald-400 font-bold"
                      : "text-amber-400 font-bold"
                  }
                >
                  {projectedGS
                    ? `${projectedGS.safetyMargin >= 0 ? "+" : ""}${projectedGS.safetyMargin} pts (${projectedGS.isSafeBuffer ? "Safe" : "Gap"})`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GS Mock Accuracy:</span>
                <span className="text-white font-bold">
                  {projectedGS?.averageMockAccuracy ?? 0}%
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[10px] text-indigo-300">
              💡 Tip: Target 105+ to absorb UPSC key variations and tough
              shifts.
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 1B: CSAT Prelims Predictability (66.67 Cut-to-Cut / 75 Safe) ── */}
      <div className="group relative surface-card flex items-start gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-cyan-300 hover:shadow-sm transition-all cursor-default min-w-0">
        <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ring-1 bg-cyan-50 ring-cyan-200/70 text-cyan-700">
          <Target className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <span className="block truncate text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              CSAT Prelims
            </span>
            <Info className="h-3 w-3 text-slate-300 group-hover:text-cyan-600 shrink-0 transition-colors hidden sm:block" />
          </div>
          <span className="mt-0.5 block text-base sm:text-xl font-black tracking-tight text-slate-900 tabular-nums truncate">
            {projectedCSAT ? `${projectedCSAT.projectedScore}` : "—"}
            <span className="text-[10px] sm:text-xs font-normal text-slate-400 ml-1">
              / 200
            </span>
          </span>
          {projectedCSAT ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-medium">
              <span
                className={
                  projectedCSAT.cutoffMargin >= 0
                    ? "text-emerald-700 font-semibold"
                    : "text-rose-700 font-semibold"
                }
              >
                66.7: {projectedCSAT.cutoffMargin >= 0 ? "+" : ""}
                {projectedCSAT.cutoffMargin}
              </span>
              <span
                className={
                  projectedCSAT.safetyMargin >= 0
                    ? "text-emerald-700 font-semibold"
                    : "text-amber-700 font-semibold"
                }
              >
                75: {projectedCSAT.safetyMargin >= 0 ? "+" : ""}
                {projectedCSAT.safetyMargin}
              </span>
            </div>
          ) : (
            <span className="mt-0.5 block truncate text-[10px] text-slate-500">
              Need ≥1 CSAT mock
            </span>
          )}
        </div>

        {/* Hover Popover */}
        <div className="pointer-events-none invisible opacity-0 sm:group-hover:visible sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto transition-all duration-200 ease-out absolute z-40 top-full mt-2.5 right-0 sm:left-0 sm:right-auto w-72 sm:w-80 rounded-2xl bg-slate-900/95 text-slate-100 p-4 shadow-2xl backdrop-blur-md border border-slate-800 text-xs hidden sm:block">
          <div className="absolute -top-1.5 right-8 sm:left-8 sm:right-auto w-3 h-3 bg-slate-900 border-t border-l border-slate-800 rotate-45" />
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-cyan-400" />
                CSAT Prelims Predictability
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {projectedCSAT?.mockCount ?? 0} CSAT mocks
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Recency-weighted CSAT Paper-II projection (200 marks) evaluated on
              Cut-to-Cut (66.67) and Margin of Safety (75.0).
            </p>
            <div className="space-y-1.5 pt-1 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>1. Cut-to-Cut (66.67):</span>
                <span
                  className={
                    projectedCSAT?.isQualifying
                      ? "text-emerald-400 font-bold"
                      : "text-rose-400 font-bold"
                  }
                >
                  {projectedCSAT
                    ? `${projectedCSAT.cutoffMargin >= 0 ? "+" : ""}${projectedCSAT.cutoffMargin} pts (${projectedCSAT.isQualifying ? "Qualifying" : "Risk"})`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>2. Margin of Safety (75.0):</span>
                <span
                  className={
                    projectedCSAT?.isSafeBuffer
                      ? "text-emerald-400 font-bold"
                      : "text-amber-400 font-bold"
                  }
                >
                  {projectedCSAT
                    ? `${projectedCSAT.safetyMargin >= 0 ? "+" : ""}${projectedCSAT.safetyMargin} pts (${projectedCSAT.isSafeBuffer ? "Safe" : "Gap"})`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>CSAT Mock Accuracy:</span>
                <span className="text-white font-bold">
                  {projectedCSAT?.averageMockAccuracy ?? 0}%
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[10px] text-cyan-300">
              💡 Tip: Hold 75+ in CSAT mocks so comprehension ambiguity never
              endangers qualifying.
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 2: Overconfidence Trap ── */}
      <div className="group relative surface-card flex items-start gap-2 sm:gap-3 p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-amber-300 hover:shadow-sm transition-all cursor-default min-w-0">
        <span className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ring-1 bg-amber-50 ring-amber-200/70 text-amber-600">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <span className="block truncate text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              Overconfidence
            </span>
            <Info className="h-3 w-3 text-slate-300 group-hover:text-amber-500 shrink-0 transition-colors hidden sm:block" />
          </div>
          <span className="mt-0.5 block text-base sm:text-2xl font-black tracking-tight text-slate-900 tabular-nums truncate">
            {sureMistakesAnalysis.totalSureMistakes}
            <span className="text-[10px] sm:text-xs font-normal text-slate-400 ml-1">
              blunders
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[10px] sm:text-[11px] font-medium text-amber-800">
            {sureMistakesAnalysis.overconfidenceRate}% of errors tagged
            &ldquo;Sure&rdquo;
          </span>
        </div>

        {/* Hover Popover */}
        <div className="pointer-events-none invisible opacity-0 sm:group-hover:visible sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto transition-all duration-200 ease-out absolute z-40 top-full mt-2.5 right-0 sm:left-1/2 sm:-translate-x-1/2 w-72 sm:w-80 rounded-2xl bg-slate-900/95 text-slate-100 p-4 shadow-2xl backdrop-blur-md border border-slate-800 text-xs hidden sm:block">
          <div className="absolute -top-1.5 right-8 sm:left-1/2 sm:-translate-x-1/2 w-3 h-3 bg-slate-900 border-t border-l border-slate-800 rotate-45" />
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                Overconfidence &amp; Blindspots
              </span>
              <span className="font-mono text-[10px] text-amber-400 font-bold">
                {sureMistakesAnalysis.totalSureMistakes} False Positives
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Questions marked with 100% certainty (&ldquo;Sure&rdquo;) that
              were answered incorrectly in your assessments.
            </p>
            <div className="space-y-1.5 pt-1 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Estimated Marks Lost:</span>
                <span className="text-rose-400 font-bold">
                  ~{sureMistakesAnalysis.marksLostToSureMistakes} marks
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Top Blindspot Area:</span>
                <span className="text-white font-bold">
                  {sureMistakesAnalysis.topSubject
                    ? `${sureMistakesAnalysis.topSubject} (${sureMistakesAnalysis.topSubjectCount})`
                    : "No major blindspot"}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Certainty Accuracy:</span>
                <span className="text-amber-300 font-bold">
                  {sureMistakesAnalysis.totalSureAttempts > 0
                    ? Math.round(
                        ((sureMistakesAnalysis.totalSureAttempts -
                          sureMistakesAnalysis.totalSureMistakes) /
                          sureMistakesAnalysis.totalSureAttempts) *
                          100,
                      )
                    : 100}
                  %
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[10px] text-amber-300">
              💡 Tip: Review &ldquo;Sure&rdquo; mistakes first — eliminate false
              preconceptions before cramming new data.
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 3: Negative Mark Leakage ── */}
      <div className="group relative surface-card flex items-start gap-2 sm:gap-3 p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-rose-300 hover:shadow-sm transition-all cursor-default min-w-0">
        <span className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ring-1 bg-rose-50 ring-rose-200/70 text-rose-600">
          <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <span className="block truncate text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              Negative Leakage
            </span>
            <Info className="h-3 w-3 text-slate-300 group-hover:text-rose-500 shrink-0 transition-colors hidden sm:block" />
          </div>
          <span className="mt-0.5 block text-base sm:text-2xl font-black tracking-tight text-slate-900 tabular-nums truncate">
            -{negativeLeakage.penaltyMarks}
            <span className="text-[10px] sm:text-xs font-normal text-slate-400 ml-1">
              pts
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[10px] sm:text-[11px] font-medium text-rose-700">
            ~{negativeLeakage.avgPenaltyPerMock} pts lost per mock
          </span>
        </div>

        {/* Hover Popover */}
        <div className="pointer-events-none invisible opacity-0 sm:group-hover:visible sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto transition-all duration-200 ease-out absolute z-40 top-full mt-2.5 left-0 sm:left-1/2 sm:-translate-x-1/2 w-72 sm:w-80 rounded-2xl bg-slate-900/95 text-slate-100 p-4 shadow-2xl backdrop-blur-md border border-slate-800 text-xs hidden sm:block">
          <div className="absolute -top-1.5 left-8 sm:left-1/2 sm:-translate-x-1/2 w-3 h-3 bg-slate-900 border-t border-l border-slate-800 rotate-45" />
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                Negative Penalty Leakage
              </span>
              <span className="font-mono text-[10px] text-rose-400 font-bold">
                -{negativeLeakage.penaltyMarks} Marks
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Marks deducted due to negative penalty (-0.667) across your
              attempts.
            </p>
            <div className="space-y-1.5 pt-1 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Realized Score:</span>
                <span className="text-white font-bold">
                  {negativeLeakage.realizedScore} marks
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Clean Potential Score:</span>
                <span className="text-emerald-400 font-bold">
                  {negativeLeakage.cleanPotentialScore} marks
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Recoverable Marks:</span>
                <span className="text-rose-400 font-bold">
                  +{negativeLeakage.penaltyMarks} pts
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[10px] text-rose-300">
              💡 Tip: In tight Prelims margins, eliminating blind 1/4 guesses
              alone recovers 8–15 marks.
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 4: Rolling 4-Week Accuracy ── */}
      <div className="group relative surface-card flex items-start gap-2 sm:gap-3 p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-emerald-300 hover:shadow-sm transition-all cursor-default min-w-0">
        <span className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ring-1 bg-emerald-50 ring-emerald-200/70 text-emerald-600">
          <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <span className="block truncate text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
              Rolling 4W Acc
            </span>
            <Info className="h-3 w-3 text-slate-300 group-hover:text-emerald-500 shrink-0 transition-colors hidden sm:block" />
          </div>
          <span className="mt-0.5 block text-base sm:text-2xl font-black tracking-tight text-slate-900 tabular-nums truncate">
            {rollingSubjectAccuracy.overallAccuracyPct}%
          </span>
          <span className="mt-0.5 block truncate text-[10px] sm:text-[11px] font-medium text-emerald-700">
            Last 28 days ({rollingSubjectAccuracy.totalQs} Qs)
          </span>
        </div>

        {/* Hover Popover */}
        <div className="pointer-events-none invisible opacity-0 sm:group-hover:visible sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto transition-all duration-200 ease-out absolute z-40 top-full mt-2.5 right-0 w-72 sm:w-80 rounded-2xl bg-slate-900/95 text-slate-100 p-4 shadow-2xl backdrop-blur-md border border-slate-800 text-xs hidden sm:block">
          <div className="absolute -top-1.5 right-8 w-3 h-3 bg-slate-900 border-t border-l border-slate-800 rotate-45" />
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                Rolling 4-Week Subject Accuracy
              </span>
              <span className="font-mono text-[10px] text-emerald-400 font-bold">
                {rollingSubjectAccuracy.overallAccuracyPct}% avg
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Subject-wise accuracy breakdown for recent attempts over the last
              28 days.
            </p>
            <div className="space-y-1 pt-1 font-mono text-[11px]">
              {rollingSubjectAccuracy.subjects.slice(0, 4).map((subj) => (
                <div
                  key={subj.subject}
                  className="flex items-center justify-between text-slate-300"
                >
                  <span className="truncate">{subj.subject}:</span>
                  <span
                    className={`font-bold ${
                      subj.accuracyPct >= 70
                        ? "text-emerald-400"
                        : subj.accuracyPct >= 50
                          ? "text-amber-400"
                          : "text-rose-400"
                    }`}
                  >
                    {subj.accuracyPct}% ({subj.total} Qs)
                  </span>
                </div>
              ))}
              {rollingSubjectAccuracy.subjects.length === 0 && (
                <div className="text-slate-400 italic">
                  Complete more assessments to populate subject trends.
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-slate-800 text-[10px] text-emerald-300">
              💡 Tip: Maintain ≥65% accuracy across high-yield subjects (Polity
              &amp; Economy).
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

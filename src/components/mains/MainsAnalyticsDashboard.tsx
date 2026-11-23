"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Target,
  Sparkles,
  ArrowRight,
  ChevronRight,
  BookOpen,
  Filter,
  Layers,
  Flame,
  Info,
} from "lucide-react";
import {
  MainsEvaluationSession,
  MainsAttemptItem,
  MainsEvaluationResult,
  normalizeSessionAttempts,
} from "@/lib/mainsEvaluation";

interface MainsAnalyticsDashboardProps {
  sessions: MainsEvaluationSession[];
  onSelectQuestion: (sessionId: string) => void;
  onBackToBooklet: () => void;
}

export function MainsAnalyticsDashboard({
  sessions,
  onSelectQuestion,
  onBackToBooklet,
}: MainsAnalyticsDashboardProps) {
  const [selectedPaperFilter, setSelectedPaperFilter] = useState<string>("ALL");

  // Aggregated analytics calculation
  const stats = useMemo(() => {
    let totalQuestions = 0;
    let totalAttempts = 0;
    let evaluatedQuestionsCount = 0;
    let totalMarksAwarded = 0;
    let totalMaxMarks = 0;
    let totalActualWords = 0;
    let totalTargetWords = 0;

    let totalDemand = 0;
    let totalContent = 0;
    let totalStructure = 0;
    let totalPresentation = 0;

    let reAttemptCount = 0;
    let reAttemptDeltaSum = 0;

    const paperCounts: Record<
      string,
      { count: number; awarded: number; max: number }
    > = {
      "GS-1": { count: 0, awarded: 0, max: 0 },
      "GS-2": { count: 0, awarded: 0, max: 0 },
      "GS-3": { count: 0, awarded: 0, max: 0 },
      "GS-4": { count: 0, awarded: 0, max: 0 },
      Essay: { count: 0, awarded: 0, max: 0 },
      Optional: { count: 0, awarded: 0, max: 0 },
    };

    const weaknessFreq: Record<string, number> = {};
    const missingDimsFreq: Record<string, number> = {};

    // Tiers according to PO calibration standard:
    // 5+ / 10 (>=50%) = Topper Level
    // 3 - 4.9 / 10 (30 - 49%) = Typical Level
    // < 3 / 10 (<30%) = Needs Foundational Drill
    const tierCounts: Record<string, number> = {
      "Topper Level (5+ Marks / ≥50%)": 0,
      "Typical Candidate (3–4.9 Marks / 30–49%)": 0,
      "Needs Foundational Drill (<3 Marks / <30%)": 0,
    };

    const evaluatedQuestionsList: Array<{
      session: MainsEvaluationSession;
      latestAttempt: MainsAttemptItem;
      evaluation: MainsEvaluationResult;
      attemptsCount: number;
    }> = [];

    sessions.forEach((s) => {
      totalQuestions++;
      const attempts = normalizeSessionAttempts(s);
      totalAttempts += attempts.length;

      const evaluatedAttempts = attempts.filter(
        (a) => a.evaluation && typeof a.evaluation.marksAwarded === "number",
      );

      if (evaluatedAttempts.length > 0) {
        evaluatedQuestionsCount++;
        const latestAttempt = evaluatedAttempts[evaluatedAttempts.length - 1];
        const ev = latestAttempt.evaluation!;

        evaluatedQuestionsList.push({
          session: s,
          latestAttempt,
          evaluation: ev,
          attemptsCount: attempts.length,
        });

        const paperKey = s.paperType in paperCounts ? s.paperType : "Optional";
        paperCounts[paperKey].count++;
        paperCounts[paperKey].awarded += ev.marksAwarded;
        paperCounts[paperKey].max += ev.maxMarks || s.maxMarks || 10;

        totalMarksAwarded += ev.marksAwarded;
        totalMaxMarks += ev.maxMarks || s.maxMarks || 10;

        if (ev.actualWordCount > 0 && ev.targetWordCount > 0) {
          totalActualWords += ev.actualWordCount;
          totalTargetWords += ev.targetWordCount;
        }

        // Percentage-based dimension scoring (0 - 100)
        const getPct = (dim?: { score: number; max?: number }) => {
          if (!dim || typeof dim.score !== "number") return 50;
          return dim.score <= 10 && dim.max === 10 ? dim.score * 10 : dim.score;
        };

        totalDemand += getPct(ev.dimensions?.demand);
        totalContent += getPct(ev.dimensions?.content);
        totalStructure += getPct(ev.dimensions?.structure);
        totalPresentation += getPct(ev.dimensions?.presentation);

        // Tier distribution
        const pct =
          ev.percentage ??
          Math.round((ev.marksAwarded / (ev.maxMarks || 10)) * 100);
        if (pct >= 50) {
          tierCounts["Topper Level (5+ Marks / ≥50%)"]++;
        } else if (pct >= 30) {
          tierCounts["Typical Candidate (3–4.9 Marks / 30–49%)"]++;
        } else {
          tierCounts["Needs Foundational Drill (<3 Marks / <30%)"]++;
        }

        // Weaknesses
        (ev.weaknesses || []).forEach((w) => {
          const clean = w.trim().replace(/^[-•*]\s*/, "");
          if (clean && clean.length > 4) {
            weaknessFreq[clean] = (weaknessFreq[clean] || 0) + 1;
          }
        });

        // Missing Dimensions
        (ev.missingDimensions || []).forEach((m) => {
          const clean = m.trim().replace(/^[-•*]\s*/, "");
          if (clean && clean.length > 4) {
            missingDimsFreq[clean] = (missingDimsFreq[clean] || 0) + 1;
          }
        });

        // Re-attempt delta
        if (evaluatedAttempts.length >= 2) {
          const firstScore = evaluatedAttempts[0].evaluation?.marksAwarded ?? 0;
          const bestScore =
            evaluatedAttempts[evaluatedAttempts.length - 1].evaluation
              ?.marksAwarded ?? 0;
          reAttemptCount++;
          reAttemptDeltaSum += bestScore - firstScore;
        }
      }
    });

    const avgScore =
      evaluatedQuestionsCount > 0
        ? Math.round((totalMarksAwarded / evaluatedQuestionsCount) * 10) / 10
        : 0;
    const avgPercentage =
      totalMaxMarks > 0
        ? Math.round((totalMarksAwarded / totalMaxMarks) * 100)
        : 0;

    const avgWordCompliance =
      totalTargetWords > 0
        ? Math.min(100, Math.round((totalActualWords / totalTargetWords) * 100))
        : 0;

    const avgReattemptGain =
      reAttemptCount > 0
        ? Math.round((reAttemptDeltaSum / reAttemptCount) * 10) / 10
        : 0;

    const dimDemandAvg =
      evaluatedQuestionsCount > 0
        ? Math.round(totalDemand / evaluatedQuestionsCount)
        : 0;
    const dimContentAvg =
      evaluatedQuestionsCount > 0
        ? Math.round(totalContent / evaluatedQuestionsCount)
        : 0;
    const dimStructureAvg =
      evaluatedQuestionsCount > 0
        ? Math.round(totalStructure / evaluatedQuestionsCount)
        : 0;
    const dimPresentationAvg =
      evaluatedQuestionsCount > 0
        ? Math.round(totalPresentation / evaluatedQuestionsCount)
        : 0;

    // Filter bell-curve tiers with no data as per PO guidelines!
    const activeTiers = Object.entries(tierCounts).filter(
      ([_, count]) => count > 0,
    );

    // Top recurring weaknesses sorted by frequency
    const topWeaknesses = Object.entries(weaknessFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([text, count]) => ({ text, count }));

    // Top missing dimensions sorted by frequency
    const topMissingDimensions = Object.entries(missingDimsFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([text, count]) => ({ text, count }));

    return {
      totalQuestions,
      totalAttempts,
      evaluatedQuestionsCount,
      avgScore,
      avgPercentage,
      avgWordCompliance,
      avgReattemptGain,
      paperCounts,
      dimDemandAvg,
      dimContentAvg,
      dimStructureAvg,
      dimPresentationAvg,
      activeTiers,
      topWeaknesses,
      topMissingDimensions,
      evaluatedQuestionsList,
    };
  }, [sessions]);

  // Filter evaluated questions by paper tab
  const filteredQuestions = useMemo(() => {
    if (selectedPaperFilter === "ALL") return stats.evaluatedQuestionsList;
    return stats.evaluatedQuestionsList.filter((item) => {
      if (selectedPaperFilter === "Optional") {
        return item.session.paperType === "Optional";
      }
      return item.session.paperType === selectedPaperFilter;
    });
  }, [stats.evaluatedQuestionsList, selectedPaperFilter]);

  return (
    <div className="max-w-6xl w-full mx-auto p-3.5 sm:p-6 space-y-6 animate-in fade-in duration-200">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="h-5 w-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              Mains Practice & Performance Intelligence
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Holistic UPSC CSE evaluator diagnostics, recurring patterns, and
            paper-wise scoring trends
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToBooklet}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-2xs cursor-pointer transition-colors"
        >
          <BookOpen className="h-4 w-4 text-indigo-600" />
          <span>Back to Practice Booklet</span>
        </button>
      </div>

      {stats.evaluatedQuestionsCount === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
          <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            No Evaluated Questions Yet
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Once you submit your Mains answers for AI UPSC evaluation, your
            multi-dimensional competency scores, paper-wise distribution, and
            weakness patterns will automatically populate here.
          </p>
          <button
            type="button"
            onClick={onBackToBooklet}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Start Evaluating Question 1
          </button>
        </div>
      ) : (
        <>
          {/* ── Key Overview Metric Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Evaluated */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Evaluated Questions
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100">
                  {stats.evaluatedQuestionsCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  ({stats.totalAttempts} attempts)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Target className="h-3 w-3 text-indigo-500" />
                <span>Across {stats.totalQuestions} booklet entries</span>
              </p>
            </div>

            {/* Average Score & Calibration */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Average Evaluated Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {stats.avgScore}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  / 10 Marks
                </span>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  ({stats.avgPercentage}%)
                </span>
              </div>
              <div className="pt-0.5">
                <span
                  className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                    stats.avgScore >= 5
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                      : stats.avgScore >= 3
                        ? "bg-blue-50 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                        : "bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                  }`}
                >
                  {stats.avgScore >= 5
                    ? "Topper Level (5+ Marks)"
                    : stats.avgScore >= 3
                      ? "Typical Candidate (3–4.9 Marks)"
                      : "Needs Foundational Drill"}
                </span>
              </div>
            </div>

            {/* Re-attempt Progression Gain */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Re-attempt Delta Gain
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {stats.avgReattemptGain > 0
                    ? `+${stats.avgReattemptGain}`
                    : stats.avgReattemptGain}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Marks avg
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span>Improvement on second attempts</span>
              </p>
            </div>

            {/* Word Limit Compliance */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Word Limit Compliance
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100">
                  {stats.avgWordCompliance}%
                </span>
                <span className="text-xs text-slate-400">of word limit</span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                <span>Target: 150w (10M) / 250w (15M)</span>
              </p>
            </div>
          </div>

          {/* ── 4-Dimension UPSC Competencies (Graded as Percentages) ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  4-Dimension Core Competencies (Evaluated as Percentages)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Calibrated against authentic UPSC CSE answer standards
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Demand */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Demand Fulfillment
                  </span>
                  <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {stats.dimDemandAvg}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, stats.dimDemandAvg)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Addressing every operational directive & explicit sub-parts
                </p>
              </div>

              {/* Content */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Content & Evidence
                  </span>
                  <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">
                    {stats.dimContentAvg}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, stats.dimContentAvg)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Authentic committee, article, case-law, and empirical
                  citations
                </p>
              </div>

              {/* Structure */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Structure & Synthesis
                  </span>
                  <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {stats.dimStructureAvg}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, stats.dimStructureAvg)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  20w intro, keyword subheadings, counterview, forward-looking
                  end
                </p>
              </div>

              {/* Presentation */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Presentation & Speed
                  </span>
                  <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                    {stats.dimPresentationAvg}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, stats.dimPresentationAvg)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Adherence to word limit and exam-hall time writability
                </p>
              </div>
            </div>
          </div>

          {/* ── Paper-wise Bifurcation Grid ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  Paper-Wise Evaluation Bifurcation
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Score trajectories segmented by syllabus paper
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {Object.entries(stats.paperCounts).map(([paper, pData]) => {
                const avgPaperScore =
                  pData.count > 0
                    ? Math.round((pData.awarded / pData.count) * 10) / 10
                    : 0;
                const avgPaperPct =
                  pData.max > 0
                    ? Math.round((pData.awarded / pData.max) * 100)
                    : 0;
                const hasData = pData.count > 0;

                return (
                  <div
                    key={paper}
                    className={`p-3 rounded-xl border transition-all ${
                      hasData
                        ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                        : "bg-slate-50/30 dark:bg-slate-900/30 border-dashed border-slate-200/60 dark:border-slate-800/60 opacity-60"
                    }`}
                  >
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 block">
                      {paper}
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                        {hasData ? `${avgPaperScore}` : "—"}
                      </span>
                      {hasData && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          / 10 ({avgPaperPct}%)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {pData.count}{" "}
                      {pData.count === 1 ? "question" : "questions"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Active Bell-Curve Tiers (Empty Tiers Dropped as per PO Instruction) ── */}
          {stats.activeTiers.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-amber-500" />
                  <span>Performance Tier Distribution (Active Tiers Only)</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Calibrated to UPSC 3–4 typical / 5+ topper standard
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {stats.activeTiers.map(([tierName, count]) => {
                  const isTopper = tierName.includes("Topper");
                  const isTypical = tierName.includes("Typical");
                  return (
                    <div
                      key={tierName}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                        isTopper
                          ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                          : isTypical
                            ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800"
                            : "bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {tierName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {Math.round(
                            (count / stats.evaluatedQuestionsCount) * 100,
                          )}
                          % of your evaluated copies
                        </p>
                      </div>
                      <span className="text-xl font-mono font-black text-slate-800 dark:text-slate-200">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Overall Patterns & Feedback for Improvisation ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recurring Weaknesses */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  Recurring Rubric Weaknesses & Reductions
                </h3>
              </div>
              {stats.topWeaknesses.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No common recurring weaknesses flagged yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.topWeaknesses.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex items-start justify-between gap-2 text-xs"
                    >
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {item.text}
                      </span>
                      {item.count > 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0">
                          {item.count}× copies
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overlooked Dimensions */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  Frequently Overlooked Dimensions & Citations
                </h3>
              </div>
              {stats.topMissingDimensions.length === 0 ? (
                <p className="text-xs text-slate-400">
                  All critical analytical angles and citations were well
                  addressed.
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.topMissingDimensions.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-start justify-between gap-2 text-xs"
                    >
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {item.text}
                      </span>
                      {item.count > 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                          {item.count}× missed
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Evaluated Practice Booklet Table ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  Evaluated Question Booklet Index
                </h3>
              </div>

              {/* Paper Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-xs">
                {[
                  "ALL",
                  "GS-1",
                  "GS-2",
                  "GS-3",
                  "GS-4",
                  "Essay",
                  "Optional",
                ].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPaperFilter(p)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      selectedPaperFilter === p
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredQuestions.map((item, idx) => {
                const ev = item.evaluation;
                const qText =
                  item.session.question || ev.question || item.session.title;
                return (
                  <div
                    key={item.session.id || idx}
                    className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {item.session.paperType}
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                          {ev.marksAwarded} /{" "}
                          {ev.maxMarks || item.session.maxMarks || 10} Marks
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({ev.percentage}%)
                        </span>
                        {item.attemptsCount > 1 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            {item.attemptsCount} attempts
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium line-clamp-2">
                        {qText}
                      </p>
                      {ev.verdict && (
                        <p className="text-[11px] text-slate-500 italic line-clamp-1">
                          &ldquo;{ev.verdict}&rdquo;
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectQuestion(item.session.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-300 dark:hover:border-indigo-700 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
                    >
                      <span>Drill / Re-evaluate</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

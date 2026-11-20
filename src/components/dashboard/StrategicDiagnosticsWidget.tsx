"use client";

import { useMemo } from "react";
import { Attempt, QuestionPaper } from "../../lib/types";
import { getAttemptPercentage } from "../../lib/defaults";
import {
  AlertTriangle,
  TrendingUp,
  Gauge,
  Zap,
  CheckCircle2,
  Scale,
  Award,
  Sparkles,
  ShieldCheck,
  Target,
  ArrowUpRight,
  TrendingDown,
} from "lucide-react";

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

  // 1. PROJECTED PRELIMS SCORE (From Recent Mocks on 200-Mark Scale)
  const projectedPrelims = useMemo(() => {
    const mocks = completed.filter((a) => a.mode === "mock");
    if (mocks.length === 0) return null;

    // Last 5 mocks with recency weighting (5x, 4x, 3x, 2x, 1x)
    const recent = mocks.slice(0, 5);
    let weightedSum = 0;
    let weightTotal = 0;

    recent.forEach((m, idx) => {
      const weight = recent.length - idx;
      // Normalize to 200-mark UPSC standard scale
      const normalizedScore = m.maxScore > 0 ? (m.score / m.maxScore) * 200 : 0;
      weightedSum += normalizedScore * weight;
      weightTotal += weight;
    });

    const projectedScore =
      Math.round((weightedSum / Math.max(1, weightTotal)) * 10) / 10;
    const UPSC_CUTOFF_BENCHMARK = 92.0; // Standard general category qualifying benchmark
    const margin =
      Math.round((projectedScore - UPSC_CUTOFF_BENCHMARK) * 10) / 10;
    const isQualifying = projectedScore >= UPSC_CUTOFF_BENCHMARK;
    const isSafeBuffer = projectedScore >= UPSC_CUTOFF_BENCHMARK + 10;

    return {
      projectedScore,
      benchmark: UPSC_CUTOFF_BENCHMARK,
      margin,
      isQualifying,
      isSafeBuffer,
      mockCount: recent.length,
      averageMockAccuracy:
        Math.round(
          (recent.reduce((sum, m) => sum + (m.accuracyPct || 0), 0) /
            recent.length) *
            10,
        ) / 10,
    };
  }, [completed]);

  // 2. WRONG ANSWERS TAGGED "SURE" (The Overconfidence Trap / Blindspot Index)
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

    // Penalty marks squandered on high certainty mistakes (approx 0.667 marks penalty + 2.0 marks missed)
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

  // 3. MARKS LOST TO NEGATIVE PENALTIES (Negative Leakage Audit)
  const negativeLeakage = useMemo(() => {
    const mocks = completed.filter((a) => a.mode === "mock");
    if (mocks.length === 0) {
      // Fallback across all completed if no mocks
      const totalNegatives = completed.reduce(
        (sum, a) => sum + (a.incorrect || 0),
        0,
      );
      const penaltyMarks =
        Math.round(
          completed.reduce(
            (sum, a) => sum + (a.incorrect || 0) * (a.incorrectMarks || 0.667),
            0,
          ) * 10,
        ) / 10;
      return {
        totalNegatives,
        penaltyMarks,
        avgPenaltyPerMock:
          Math.round((penaltyMarks / Math.max(1, completed.length)) * 10) / 10,
        realizedScore: Math.round(
          completed.reduce((sum, a) => sum + a.score, 0),
        ),
        cleanPotentialScore: Math.round(
          completed.reduce(
            (sum, a) =>
              sum + a.score + (a.incorrect || 0) * (a.incorrectMarks || 0.667),
            0,
          ),
        ),
      };
    }

    const totalNegatives = mocks.reduce(
      (sum, m) => sum + (m.incorrect || 0),
      0,
    );
    const penaltyMarks =
      Math.round(
        mocks.reduce(
          (sum, m) => sum + (m.incorrect || 0) * (m.incorrectMarks || 0.667),
          0,
        ) * 10,
      ) / 10;
    const avgPenaltyPerMock =
      Math.round((penaltyMarks / mocks.length) * 10) / 10;
    const realizedScore = Math.round(
      mocks.reduce((sum, m) => sum + m.score, 0),
    );
    const cleanPotentialScore = Math.round(realizedScore + penaltyMarks);

    return {
      totalNegatives,
      penaltyMarks,
      avgPenaltyPerMock,
      realizedScore,
      cleanPotentialScore,
      mockCount: mocks.length,
    };
  }, [completed]);

  // 4. ACCURACY BY SUBJECT (Rolling 4 Weeks / Last 28 Days)
  const rollingSubjectAccuracy = useMemo(() => {
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const minTimestamp = fourWeeksAgo.getTime();

    const recentAttempts = completed.filter((a) => {
      const t = new Date(a.finishedAt || a.startedAt).getTime();
      return !Number.isNaN(t) && t >= minTimestamp;
    });

    const subjectMap: Record<
      string,
      {
        subject: string;
        correct: number;
        total: number;
        questionsAttempted: number;
      }
    > = {};

    recentAttempts.forEach((att) => {
      const matchedPaper = papers.find((p) => p.id === att.paperId);
      const defaultSubj = normalizeSubject(
        matchedPaper?.subject || att.paperLabel || "",
      );

      if (att.answers && Object.keys(att.answers).length > 0) {
        Object.values(att.answers).forEach((ans) => {
          if (ans.selected !== null && ans.selected !== undefined) {
            const subj = normalizeSubject(ans.subject || defaultSubj);
            if (!subjectMap[subj]) {
              subjectMap[subj] = {
                subject: subj,
                correct: 0,
                total: 0,
                questionsAttempted: 0,
              };
            }
            subjectMap[subj].questionsAttempted++;
            subjectMap[subj].total++;
            if (ans.isCorrect) subjectMap[subj].correct++;
          }
        });
      } else {
        // Fallback to paper-level stats
        if (!subjectMap[defaultSubj]) {
          subjectMap[defaultSubj] = {
            subject: defaultSubj,
            correct: 0,
            total: 0,
            questionsAttempted: 0,
          };
        }
        subjectMap[defaultSubj].questionsAttempted += att.answered || 0;
        subjectMap[defaultSubj].total += att.answered || 0;
        subjectMap[defaultSubj].correct += att.correct || 0;
      }
    });

    return Object.values(subjectMap)
      .filter((s) => s.total >= 5)
      .map((s) => ({
        ...s,
        accuracyPct: Math.round((s.correct / s.total) * 100),
      }))
      .sort((a, b) => b.accuracyPct - a.accuracyPct);
  }, [completed, papers]);

  // 5. CSAT SPEED VS ACCURACY (The 33% Qualifying Safety Valve)
  const csatDiagnostic = useMemo(() => {
    const csatAttempts = completed.filter((a) => {
      const label = (a.paperLabel || "").toLowerCase();
      const matched = papers.find((p) => p.id === a.paperId);
      const subj = (matched?.subject || "").toLowerCase();
      return (
        label.includes("csat") ||
        subj.includes("csat") ||
        label.includes("paper 2") ||
        label.includes("paper ii")
      );
    });

    if (csatAttempts.length === 0) return null;

    let totalDurationSeconds = 0;
    let totalAnswered = 0;
    let totalCorrect = 0;
    let totalScore = 0;
    let totalMaxScore = 0;

    csatAttempts.forEach((a) => {
      totalDurationSeconds += a.durationSeconds || 0;
      totalAnswered += a.answered || 0;
      totalCorrect += a.correct || 0;
      totalScore += a.score || 0;
      totalMaxScore += a.maxScore || 200;
    });

    const avgSecondsPerQ =
      totalAnswered > 0 ? Math.round(totalDurationSeconds / totalAnswered) : 90;
    const accuracyPct =
      totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const avgScorePct =
      totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    // In CSAT, 33% is the qualifying cut-off (66/200 marks)
    const isQualifying = avgScorePct >= 33;
    const isComfortable = avgScorePct >= 45; // 90+ marks is comfortable

    return {
      attemptsCount: csatAttempts.length,
      avgSecondsPerQ,
      accuracyPct,
      avgScorePct,
      isQualifying,
      isComfortable,
      targetPacingSeconds: 90, // 80 questions in 120 mins = 90 sec/q
    };
  }, [completed, papers]);

  return (
    <section className="space-y-4 pt-1">
      {/* Section Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <p className="page-eyebrow">Strategic Examination Diagnostics</p>
          </div>
          <h2 className="mt-1 text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Performance Intelligence &amp; UPSC Readiness
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-500 font-medium hidden sm:inline">
          {completed.length} Total Assessments Analyzed
        </span>
      </div>

      {/* 5 High-Yield Diagnostic Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ── CARD 1: Projected Prelims Score (Benchmark & Buffer) ── */}
        <div className="surface-card p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3.5 bg-gradient-to-b from-white to-slate-50/50">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                <Target className="h-3 w-3" />
                <span>UPSC GS-1 Scale</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400 font-mono">
                Cutoff: 92.0
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 font-semibold block">
                Projected Prelims Score
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {projectedPrelims ? projectedPrelims.projectedScore : "—"}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / 200 Marks
                </span>
                {projectedPrelims && (
                  <span
                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                      projectedPrelims.isQualifying
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {projectedPrelims.margin >= 0 ? "+" : ""}
                    {projectedPrelims.margin} pts
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {projectedPrelims ? (
                projectedPrelims.isSafeBuffer ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    Safely in qualifying zone (+{projectedPrelims.margin} pts
                    margin over 92.0 cutoff).
                  </span>
                ) : projectedPrelims.isQualifying ? (
                  <span className="text-indigo-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Qualifying buffer achieved across last{" "}
                    {projectedPrelims.mockCount} mocks.
                  </span>
                ) : (
                  <span className="text-rose-700 font-semibold flex items-center gap-1">
                    <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                    Needs +{Math.abs(projectedPrelims.margin)} pts to cross
                    standard 92.0 cutoff.
                  </span>
                )
              ) : (
                "Attempt at least 1 mock exam to compute your weighted projected score."
              )}
            </p>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Recent Mocks Acc:</span>
            <span className="font-mono font-bold text-slate-800">
              {projectedPrelims
                ? `${projectedPrelims.averageMockAccuracy}%`
                : "—"}
            </span>
          </div>
        </div>

        {/* ── CARD 2: Wrong Answers Tagged "Sure" (Overconfidence Trap) ── */}
        <div className="surface-card p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3.5 bg-gradient-to-b from-white to-amber-50/20">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                <AlertTriangle className="h-3 w-3" />
                <span>Overconfidence Trap</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400 font-mono">
                Blindspot Index
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 font-semibold block">
                Wrong Answers Tagged &quot;Sure&quot;
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 font-mono tracking-tight">
                  {sureMistakesAnalysis.totalSureMistakes}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / {sureMistakesAnalysis.totalSureAttempts} &quot;Sure&quot;
                  attempts
                </span>
                {sureMistakesAnalysis.overconfidenceRate > 0 && (
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-800 border border-amber-200">
                    {sureMistakesAnalysis.overconfidenceRate}% of errors
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {sureMistakesAnalysis.totalSureMistakes > 0 ? (
                <>
                  Lost approx{" "}
                  <strong>
                    -{sureMistakesAnalysis.marksLostToSureMistakes} marks
                  </strong>{" "}
                  on questions thought to be 100% safe.{" "}
                  {sureMistakesAnalysis.topSubject && (
                    <span className="text-amber-800 font-medium">
                      Primary vulnerability:{" "}
                      <strong>{sureMistakesAnalysis.topSubject}</strong> (
                      {sureMistakesAnalysis.topSubjectCount} blunders).
                    </span>
                  )}
                </>
              ) : (
                "Zero overconfidence errors detected. Your high-certainty tagging matches your accuracy."
              )}
            </p>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Blindspot Risk:</span>
            <span
              className={`font-semibold ${
                sureMistakesAnalysis.overconfidenceRate > 25
                  ? "text-rose-600 font-bold"
                  : sureMistakesAnalysis.overconfidenceRate > 15
                    ? "text-amber-600"
                    : "text-emerald-600"
              }`}
            >
              {sureMistakesAnalysis.overconfidenceRate > 25
                ? "High Vulnerability"
                : sureMistakesAnalysis.overconfidenceRate > 15
                  ? "Moderate Hazard"
                  : "Well-Calibrated"}
            </span>
          </div>
        </div>

        {/* ── CARD 3: Marks Lost to Negative Penalties (Leakage Audit) ── */}
        <div className="surface-card p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3.5 bg-gradient-to-b from-white to-rose-50/20">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                <Scale className="h-3 w-3" />
                <span>Negative Leakage</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400 font-mono">
                Penalty Audit
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 font-semibold block">
                Marks Lost to Penalties
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-rose-600 font-mono tracking-tight">
                  -{negativeLeakage.penaltyMarks}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  Total Marks
                </span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-rose-100/70 text-rose-800 border border-rose-200">
                  ~{negativeLeakage.avgPenaltyPerMock} pts/test
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Total{" "}
              <strong>
                {negativeLeakage.totalNegatives} incorrect questions
              </strong>{" "}
              deducted penalties. Without reckless guesses, your clean potential
              score is{" "}
              <strong className="text-emerald-700 font-bold">
                {negativeLeakage.cleanPotentialScore} pts
              </strong>{" "}
              (vs {negativeLeakage.realizedScore} realized).
            </p>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Score Recovery Potential:</span>
            <span className="font-mono font-bold text-emerald-600">
              +{negativeLeakage.penaltyMarks} pts gain
            </span>
          </div>
        </div>

        {/* ── CARD 4: Rolling 4-Week Accuracy by Subject ── */}
        <div className="surface-card p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 md:col-span-2 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                <Gauge className="h-3 w-3" />
                <span>Rolling 4 Weeks</span>
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Subject Accuracy &amp; Domain Mastery
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Last 28 Days Performance
            </span>
          </div>

          {rollingSubjectAccuracy.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              Not enough questions recorded across subjects in the last 4 weeks.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {rollingSubjectAccuracy.slice(0, 6).map((item) => {
                const isDominant = item.accuracyPct >= 70;
                const isPriority = item.accuracyPct < 55;
                return (
                  <div
                    key={item.subject}
                    className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        {item.subject}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">
                          {item.accuracyPct}%
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            isDominant
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isPriority
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {isDominant
                            ? "Dominant"
                            : isPriority
                              ? "Priority"
                              : "Stable"}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isDominant
                            ? "bg-emerald-500"
                            : isPriority
                              ? "bg-rose-500"
                              : "bg-indigo-600"
                        }`}
                        style={{ width: `${item.accuracyPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>
                        {item.correct} / {item.total} correct
                      </span>
                      <span>{item.questionsAttempted} Qs in 28d</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── CARD 5: CSAT Speed vs Accuracy (Qualifying Safety Valve) ── */}
        <div className="surface-card p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3.5 bg-gradient-to-b from-white to-sky-50/20">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200/60 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                <Zap className="h-3 w-3" />
                <span>CSAT Paper II</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400 font-mono">
                33% Floor Target
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 font-semibold block">
                CSAT Pacing vs. Accuracy
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-sky-700 font-mono tracking-tight">
                  {csatDiagnostic ? `${csatDiagnostic.avgSecondsPerQ}s` : "—"}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / question pace
                </span>
                {csatDiagnostic && (
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                    {csatDiagnostic.accuracyPct}% Acc
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {csatDiagnostic ? (
                csatDiagnostic.isComfortable ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Comfortable qualifying margin ({csatDiagnostic.avgScorePct}%
                    average vs 33% cutoff).
                  </span>
                ) : csatDiagnostic.isQualifying ? (
                  <span className="text-amber-700 font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Borderline qualifying ({csatDiagnostic.avgScorePct}% vs
                    33%). Accelerate Reading Comprehension.
                  </span>
                ) : (
                  <span className="text-rose-700 font-semibold flex items-center gap-1">
                    <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                    At-Risk: Below 33% qualifying floor (
                    {csatDiagnostic.avgScorePct}% score).
                  </span>
                )
              ) : (
                "Attempt a CSAT Paper II mock to benchmark pacing against the 66-mark (33%) UPSC qualifying threshold."
              )}
            </p>
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Ideal Exam Pace:</span>
            <span className="font-mono font-bold text-slate-800">
              90s/q (80 Qs in 120m)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useMemo } from "react";
import {
  Clock,
  RotateCcw,
  Target,
  Crosshair,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
} from "lucide-react";
import { Attempt, ConfidenceLevel, QuestionPaper } from "../../lib/types";

interface PreparationDirectionBreakdownProps {
  attempts: Attempt[];
  papers: QuestionPaper[];
}

const CONFIDENCE_META: {
  key: ConfidenceLevel;
  label: string;
  barColor: string;
}[] = [
  { key: "sure", label: "Sure", barColor: "bg-emerald-500" },
  { key: "elimination", label: "Elimination", barColor: "bg-indigo-500" },
  { key: "50-50", label: "50:50", barColor: "bg-amber-500" },
  { key: "guess", label: "Guess", barColor: "bg-rose-500" },
];

export function PreparationDirectionBreakdown({
  attempts,
  papers,
}: PreparationDirectionBreakdownProps) {
  const paperMap = useMemo(() => {
    const map = new Map<string, QuestionPaper>();
    for (const p of papers) map.set(p.id, p);
    return map;
  }, [papers]);

  const analytics = useMemo(() => {
    const confStats: Record<
      ConfidenceLevel,
      {
        total: number;
        correct: number;
        incorrect: number;
        netMarks: number;
        maxMarks: number;
      }
    > = {
      sure: { total: 0, correct: 0, incorrect: 0, netMarks: 0, maxMarks: 0 },
      elimination: {
        total: 0,
        correct: 0,
        incorrect: 0,
        netMarks: 0,
        maxMarks: 0,
      },
      "50-50": { total: 0, correct: 0, incorrect: 0, netMarks: 0, maxMarks: 0 },
      guess: { total: 0, correct: 0, incorrect: 0, netMarks: 0, maxMarks: 0 },
    };

    const pacingBuckets = {
      quick: {
        label: "Quick (≤45s)",
        total: 0,
        correct: 0,
        netMarks: 0,
        maxMarks: 0,
      },
      steady: {
        label: "Steady (46–90s)",
        total: 0,
        correct: 0,
        netMarks: 0,
        maxMarks: 0,
      },
      slow: {
        label: "Slow-Burn (>90s)",
        total: 0,
        correct: 0,
        netMarks: 0,
        maxMarks: 0,
      },
    };
    let correctTimeSum = 0;
    let correctTimeCount = 0;
    let wrongTimeSum = 0;
    let wrongTimeCount = 0;

    let totalAltered = 0;
    let totalHelped = 0;
    let totalHurt = 0;
    let alterationNetMarks = 0;

    let sumQuestions = 0;
    let sumAnswered = 0;
    let sumUnattempted = 0;
    let sumCorrect = 0;
    let sumIncorrect = 0;
    let sumScore = 0;
    let sumMaxScore = 0;
    let sumPenaltyMarks = 0;

    const topicMap = new Map<
      string,
      { label: string; total: number; correct: number }
    >();

    for (const att of attempts) {
      const paper = paperMap.get(att.paperId);
      const posMarks =
        paper?.correctMarks && paper.correctMarks > 0
          ? Number(paper.correctMarks)
          : att.correctMarks || 2.0;
      const negMarks =
        paper?.incorrectMarks !== undefined && paper.incorrectMarks >= 0
          ? Number(paper.incorrectMarks)
          : (att.incorrectMarks ?? 0.667);
      const swingPerAlteration = posMarks + negMarks;

      sumQuestions += att.totalQuestions || 0;
      sumAnswered += att.answered || 0;
      sumUnattempted += att.unattempted || 0;
      sumCorrect += att.correct || 0;
      sumIncorrect += att.incorrect || 0;
      sumScore += att.score || 0;
      sumMaxScore += att.maxScore || 0;
      sumPenaltyMarks += (att.incorrect || 0) * negMarks;

      const parsedByQ = new Map(
        (paper?.parsedQuestions || []).map((pq) => [pq.questionNo, pq]),
      );

      if (att.alteredCount) totalAltered += att.alteredCount;
      if (att.alteredBenefitCount) {
        totalHelped += att.alteredBenefitCount;
        alterationNetMarks += att.alteredBenefitCount * swingPerAlteration;
      }
      if (att.alteredHarmCount) {
        totalHurt += att.alteredHarmCount;
        alterationNetMarks -= att.alteredHarmCount * swingPerAlteration;
      }

      for (const ans of Object.values(att.answers || {})) {
        if (
          ans.selected === null ||
          ans.selected === undefined ||
          ans.isCorrect === null ||
          ans.isCorrect === undefined
        ) {
          continue;
        }

        const isCorrect = ans.isCorrect === true;
        const delta =
          ans.subjectiveMarks !== undefined
            ? ans.subjectiveMarks
            : isCorrect
              ? posMarks
              : -negMarks;

        // 1. Confidence calibration
        if (ans.confidence && confStats[ans.confidence]) {
          const c = confStats[ans.confidence];
          c.total += 1;
          if (isCorrect) c.correct += 1;
          else c.incorrect += 1;
          c.netMarks += delta;
          c.maxMarks += posMarks;
        }

        // 2. Pacing buckets
        const t = ans.timeSpentSeconds || 0;
        if (t > 0) {
          if (t <= 45) {
            pacingBuckets.quick.total += 1;
            if (isCorrect) pacingBuckets.quick.correct += 1;
            pacingBuckets.quick.netMarks += delta;
            pacingBuckets.quick.maxMarks += posMarks;
          } else if (t <= 90) {
            pacingBuckets.steady.total += 1;
            if (isCorrect) pacingBuckets.steady.correct += 1;
            pacingBuckets.steady.netMarks += delta;
            pacingBuckets.steady.maxMarks += posMarks;
          } else {
            pacingBuckets.slow.total += 1;
            if (isCorrect) pacingBuckets.slow.correct += 1;
            pacingBuckets.slow.netMarks += delta;
            pacingBuckets.slow.maxMarks += posMarks;
          }

          if (isCorrect) {
            correctTimeSum += t;
            correctTimeCount += 1;
          } else {
            wrongTimeSum += t;
            wrongTimeCount += 1;
          }
        }

        // 3. Micro-topic / chapter radar
        const pq = parsedByQ.get(ans.questionNo);
        const microLabel = (
          ans.chapter ||
          pq?.chapter ||
          ans.topic ||
          pq?.topic ||
          ""
        ).trim();
        if (microLabel && microLabel.length >= 2) {
          const key = microLabel.toLowerCase();
          const existing = topicMap.get(key) || {
            label: microLabel,
            total: 0,
            correct: 0,
          };
          existing.total += 1;
          if (isCorrect) existing.correct += 1;
          topicMap.set(key, existing);
        }
      }
    }

    const totalConfTagged = Object.values(confStats).reduce(
      (s, c) => s + c.total,
      0,
    );
    const totalPaced =
      pacingBuckets.quick.total +
      pacingBuckets.steady.total +
      pacingBuckets.slow.total;

    const qualifiedTopics = Array.from(topicMap.values())
      .filter((t) => t.total >= 3)
      .map((t) => ({
        ...t,
        acc: Math.round((t.correct / t.total) * 100),
      }));

    const weakestTopics = [...qualifiedTopics]
      .sort((a, b) => a.acc - b.acc || b.total - a.total)
      .slice(0, 4);

    const strongestTopics = [...qualifiedTopics]
      .filter((t) => t.acc >= 70)
      .sort((a, b) => b.acc - a.acc || b.total - a.total)
      .slice(0, 2);

    const attemptRatePct =
      sumQuestions > 0 ? Math.round((sumAnswered / sumQuestions) * 100) : 0;
    const skipRatePct =
      sumQuestions > 0 ? Math.round((sumUnattempted / sumQuestions) * 100) : 0;
    const hitRatePct =
      sumAnswered > 0 ? Math.round((sumCorrect / sumAnswered) * 100) : 0;
    const penaltyDragPct =
      sumMaxScore > 0
        ? Math.round((sumPenaltyMarks / sumMaxScore) * 1000) / 10
        : 0;
    const netYieldPct =
      sumMaxScore > 0 ? Math.round((sumScore / sumMaxScore) * 1000) / 10 : 0;

    return {
      confStats,
      totalConfTagged,
      pacingBuckets,
      totalPaced,
      avgCorrectSec:
        correctTimeCount > 0
          ? Math.round(correctTimeSum / correctTimeCount)
          : null,
      avgWrongSec:
        wrongTimeCount > 0 ? Math.round(wrongTimeSum / wrongTimeCount) : null,
      totalAltered,
      totalHelped,
      totalHurt,
      helpedPct:
        totalAltered > 0 ? Math.round((totalHelped / totalAltered) * 100) : 0,
      hurtPct:
        totalAltered > 0 ? Math.round((totalHurt / totalAltered) * 100) : 0,
      alterationNetMarks: Math.round(alterationNetMarks * 10) / 10,
      attemptRatePct,
      skipRatePct,
      hitRatePct,
      penaltyDragPct,
      netYieldPct,
      sumQuestions,
      sumIncorrect,
      weakestTopics,
      strongestTopics,
    };
  }, [attempts, paperMap]);

  if (attempts.length === 0) return null;

  const guessStats = analytics.confStats.guess;
  const fiftyStats = analytics.confStats["50-50"];
  const slowAcc =
    analytics.pacingBuckets.slow.total > 0
      ? Math.round(
          (analytics.pacingBuckets.slow.correct /
            analytics.pacingBuckets.slow.total) *
            100,
        )
      : null;
  const steadyQuickTotal =
    analytics.pacingBuckets.quick.total + analytics.pacingBuckets.steady.total;
  const steadyQuickAcc =
    steadyQuickTotal > 0
      ? Math.round(
          ((analytics.pacingBuckets.quick.correct +
            analytics.pacingBuckets.steady.correct) /
            steadyQuickTotal) *
            100,
        )
      : null;

  return (
    <div className="space-y-3 pt-3 border-t border-slate-100">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* 1. Confidence-Calibrated Yield (%) */}
        {analytics.totalConfTagged > 0 && (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  Attempt Strategy Yield
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                % accuracy &amp; net yield
              </span>
            </div>

            <div className="space-y-2">
              {CONFIDENCE_META.map(({ key, label, barColor }) => {
                const stat = analytics.confStats[key];
                if (stat.total === 0) return null;
                const sharePct = Math.round(
                  (stat.total / analytics.totalConfTagged) * 100,
                );
                const accPct = Math.round((stat.correct / stat.total) * 100);
                const yieldPct =
                  stat.maxMarks > 0
                    ? Math.round((stat.netMarks / stat.maxMarks) * 100)
                    : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {sharePct}% share · {accPct}% acc
                        </span>
                      </div>
                      <span
                        className={`font-mono text-[11px] font-bold ${
                          yieldPct >= 0 ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {yieldPct >= 0 ? `+${yieldPct}%` : `${yieldPct}%`} yield
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${accPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-600 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5">
              {guessStats.total >= 3 && guessStats.netMarks < 0
                ? `Guesses yield ${Math.round((guessStats.netMarks / Math.max(1, guessStats.maxMarks)) * 100)}% — tighten skip threshold.`
                : fiftyStats.total >= 3 && fiftyStats.netMarks > 0
                  ? `50:50 calls hit ${Math.round((fiftyStats.correct / fiftyStats.total) * 100)}% (+${Math.round((fiftyStats.netMarks / Math.max(1, fiftyStats.maxMarks)) * 100)}% yield) — keep attempting.`
                  : "Tag confidence during mocks to calibrate your attempt threshold."}
            </p>
          </div>
        )}

        {/* 2. Pacing & Overthinking Split (%) */}
        {analytics.totalPaced > 0 && (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  Pacing &amp; Overthinking Split
                </h4>
              </div>
              {analytics.avgCorrectSec !== null &&
                analytics.avgWrongSec !== null && (
                  <span className="text-[10px] font-mono text-slate-500">
                    ✓ {analytics.avgCorrectSec}s vs ✗ {analytics.avgWrongSec}s
                  </span>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  analytics.pacingBuckets.quick,
                  analytics.pacingBuckets.steady,
                  analytics.pacingBuckets.slow,
                ] as const
              ).map((bucket) => {
                const sharePct =
                  analytics.totalPaced > 0
                    ? Math.round((bucket.total / analytics.totalPaced) * 100)
                    : 0;
                const accPct =
                  bucket.total > 0
                    ? Math.round((bucket.correct / bucket.total) * 100)
                    : 0;
                const yieldPct =
                  bucket.maxMarks > 0
                    ? Math.round((bucket.netMarks / bucket.maxMarks) * 100)
                    : 0;
                return (
                  <div
                    key={bucket.label}
                    className="rounded-lg border border-slate-200/80 bg-white p-2.5 space-y-1"
                  >
                    <span className="text-[10px] font-semibold text-slate-500 block truncate">
                      {bucket.label}
                    </span>
                    <div className="text-base font-bold font-mono text-slate-900">
                      {bucket.total > 0 ? `${accPct}%` : "—"}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">{sharePct}% Qs</span>
                      <span
                        className={
                          yieldPct >= 0
                            ? "text-emerald-700 font-semibold"
                            : "text-rose-600 font-semibold"
                        }
                      >
                        {bucket.total > 0
                          ? yieldPct >= 0
                            ? `+${yieldPct}%`
                            : `${yieldPct}%`
                          : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-600 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5">
              {slowAcc !== null &&
              steadyQuickAcc !== null &&
              analytics.pacingBuckets.slow.total >= 3 &&
              slowAcc < steadyQuickAcc - 10
                ? `Accuracy drops from ${steadyQuickAcc}% (≤90s) to ${slowAcc}% (>90s) — flag & move past time-sinks.`
                : "Pacing under 90s stays balanced; keep watching slow-burn questions."}
            </p>
          </div>
        )}

        {/* 3. First-Instinct vs Second-Guessing (%) */}
        {analytics.totalAltered > 0 && (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  First-Instinct vs Second-Guessing
                </h4>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  analytics.alterationNetMarks >= 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {analytics.alterationNetMarks >= 0 ? (
                  <TrendingUp className="h-2.5 w-2.5" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5" />
                )}
                {analytics.alterationNetMarks >= 0
                  ? `+${analytics.alterationNetMarks}`
                  : analytics.alterationNetMarks}{" "}
                pts net
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
                <span className="text-[10px] font-semibold text-slate-500 block">
                  Altered Rate
                </span>
                <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                  {analytics.sumQuestions > 0
                    ? `${Math.round((analytics.totalAltered / analytics.sumQuestions) * 1000) / 10}%`
                    : analytics.totalAltered}
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {analytics.totalAltered} edits
                </span>
              </div>
              <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/60 p-2.5">
                <span className="text-[10px] font-semibold text-emerald-700 block">
                  Helped (✗→✓)
                </span>
                <div className="text-base font-bold font-mono text-emerald-800 mt-0.5">
                  {analytics.helpedPct}%
                </div>
                <span className="text-[10px] font-mono text-emerald-700/70">
                  {analytics.totalHelped} Qs
                </span>
              </div>
              <div className="rounded-lg border border-rose-200/80 bg-rose-50/60 p-2.5">
                <span className="text-[10px] font-semibold text-rose-700 block">
                  Hurt (✓→✗)
                </span>
                <div className="text-base font-bold font-mono text-rose-800 mt-0.5">
                  {analytics.hurtPct}%
                </div>
                <span className="text-[10px] font-mono text-rose-700/70">
                  {analytics.totalHurt} Qs
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5">
              {analytics.totalHurt > analytics.totalHelped
                ? `${analytics.hurtPct}% of edits hurt vs ${analytics.helpedPct}% helped — trust your first instinct unless sure of an error.`
                : `${analytics.helpedPct}% of review edits helped vs ${analytics.hurtPct}% hurt — second-pass checks are working.`}
            </p>
          </div>
        )}

        {/* 4. Attempt Coverage & Discipline (%) — Always populated to balance grid */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                Attempt Coverage &amp; Discipline
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {analytics.netYieldPct}% net efficiency
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
              <span className="text-[10px] font-semibold text-slate-500 block">
                Attempted
              </span>
              <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                {analytics.attemptRatePct}%
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {analytics.skipRatePct}% skipped
              </span>
            </div>
            <div className="rounded-lg border border-teal-200/80 bg-teal-50/50 p-2.5">
              <span className="text-[10px] font-semibold text-teal-700 block">
                Hit Rate
              </span>
              <div className="text-base font-bold font-mono text-teal-800 mt-0.5">
                {analytics.hitRatePct}%
              </div>
              <span className="text-[10px] font-mono text-teal-700/70">
                of attempted
              </span>
            </div>
            <div className="rounded-lg border border-rose-200/80 bg-rose-50/50 p-2.5">
              <span className="text-[10px] font-semibold text-rose-700 block">
                Penalty Drag
              </span>
              <div className="text-base font-bold font-mono text-rose-800 mt-0.5">
                -{analytics.penaltyDragPct}%
              </div>
              <span className="text-[10px] font-mono text-rose-700/70">
                of max score
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5">
            {analytics.penaltyDragPct >= 10
              ? `Negative marking erodes ${analytics.penaltyDragPct}% of max score — trim low-conviction attempts.`
              : analytics.attemptRatePct < 65
                ? `Attempt rate is ${analytics.attemptRatePct}% (${analytics.hitRatePct}% hit rate) — room to safely attempt more 50:50s.`
                : `Attempting ${analytics.attemptRatePct}% at ${analytics.hitRatePct}% accuracy keeps penalty drag to ${analytics.penaltyDragPct}%.`}
          </p>
        </div>

        {/* 5. Micro-Topic Focus Radar (Optional full-width row when chapter/topic metadata exists) */}
        {analytics.weakestTopics.length > 0 && (
          <div className="lg:col-span-2 rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Crosshair className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  Micro-Topic Focus Radar
                </h4>
              </div>
              <span className="text-[10px] text-slate-400">min 3 Qs</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {analytics.weakestTopics.map((topic) => (
                <div
                  key={topic.label}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2"
                >
                  <span
                    className="text-xs font-semibold text-slate-800 truncate"
                    title={topic.label}
                  >
                    {topic.label}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500">
                      {topic.correct}/{topic.total}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        topic.acc < 50
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : topic.acc < 70
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {topic.acc}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {analytics.strongestTopics.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Strongholds:
                </span>
                {analytics.strongestTopics.map((topic) => (
                  <span
                    key={topic.label}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
                  >
                    {topic.label} ({topic.acc}%)
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

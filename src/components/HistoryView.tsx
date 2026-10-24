"use client";

import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Grid2X2,
  History,
  Layers,
  List,
  RotateCcw,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { formatDateTime, formatTimeSeconds } from "../lib/defaults";
import { Attempt } from "../lib/types";

interface HistoryViewProps {
  attempts: Attempt[];
  onViewAttempt: (attempt: Attempt) => void;
  onDeleteAttempt: (attemptId: string) => void;
}

export function HistoryView({
  attempts,
  onViewAttempt,
  onDeleteAttempt,
}: HistoryViewProps) {
  const { papers, handleStartExam } = useApp();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"all" | "cumulative">("all");
  const [performanceViewMode, setPerformanceViewMode] = useState<
    "grid" | "list"
  >("grid");
  const [selectedAttemptByPaper, setSelectedAttemptByPaper] = useState<
    Record<string, string>
  >({});

  // Only mock mode attempts are counted in official history
  const mockAttempts = attempts.filter((a) => a.mode === "mock");

  const filtered = mockAttempts.filter((a) => {
    return a.paperLabel.toLowerCase().includes(search.toLowerCase());
  });

  // Chronological attempt index per paper
  const paperAttemptsChronological = useMemo(() => {
    const map = new Map<string, string[]>();
    const sorted = [...mockAttempts].sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );
    sorted.forEach((a) => {
      const list = map.get(a.paperId) || [];
      list.push(a.id);
      map.set(a.paperId, list);
    });
    return map;
  }, [mockAttempts]);

  // Group by paper for cumulative tracking
  const groupedByPaper = useMemo(() => {
    const map = new Map<
      string,
      {
        paperId: string;
        paperLabel: string;
        paper?: (typeof papers)[0];
        attempts: Attempt[];
        initialAttempt: Attempt;
        latestAttempt: Attempt;
        bestAttempt: Attempt;
        scoreDelta: number;
        accuracyDelta: number;
        avgScore: number;
        avgAccuracy: number;
        correctedCount: number;
        persistentWrongCount: number;
      }
    >();

    const sorted = [...mockAttempts].sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );

    sorted.forEach((att) => {
      const existing = map.get(att.paperId);
      const matchedPaper = papers.find((p) => p.id === att.paperId);
      if (!existing) {
        map.set(att.paperId, {
          paperId: att.paperId,
          paperLabel: att.paperLabel,
          paper: matchedPaper,
          attempts: [att],
          initialAttempt: att,
          latestAttempt: att,
          bestAttempt: att,
          scoreDelta: 0,
          accuracyDelta: 0,
          avgScore: att.score,
          avgAccuracy: att.accuracyPct,
          correctedCount: 0,
          persistentWrongCount: 0,
        });
      } else {
        existing.attempts.push(att);
        existing.latestAttempt = att;
        if (att.score > existing.bestAttempt.score) {
          existing.bestAttempt = att;
        }
        existing.scoreDelta =
          Math.round((att.score - existing.initialAttempt.score) * 100) / 100;
        existing.accuracyDelta =
          Math.round(
            (att.accuracyPct - existing.initialAttempt.accuracyPct) * 10,
          ) / 10;
        const sumScore = existing.attempts.reduce((sum, a) => sum + a.score, 0);
        const sumAcc = existing.attempts.reduce(
          (sum, a) => sum + a.accuracyPct,
          0,
        );
        existing.avgScore =
          Math.round((sumScore / existing.attempts.length) * 10) / 10;
        existing.avgAccuracy =
          Math.round((sumAcc / existing.attempts.length) * 10) / 10;

        // Calculate mistake resolutions between initial and latest attempt
        const initialAns = existing.initialAttempt.answers || {};
        const latestAns = att.answers || {};
        let corrected = 0;
        let persistent = 0;
        Object.keys(initialAns).forEach((qKey) => {
          const qNo = Number(qKey);
          const iQ = initialAns[qNo];
          const lQ = latestAns[qNo];
          if (iQ && lQ) {
            if (iQ.isCorrect === false && lQ.isCorrect === true) corrected++;
            else if (iQ.isCorrect === false && lQ.isCorrect === false)
              persistent++;
          }
        });
        existing.correctedCount = corrected;
        existing.persistentWrongCount = persistent;
      }
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.latestAttempt.startedAt).getTime() -
        new Date(a.latestAttempt.startedAt).getTime(),
    );
  }, [mockAttempts, papers]);

  const filteredGrouped = useMemo(() => {
    return groupedByPaper.filter((g) =>
      g.paperLabel.toLowerCase().includes(search.toLowerCase()),
    );
  }, [groupedByPaper, search]);

  // Calculate quick metrics if mock attempts exist
  const totalMocks = mockAttempts.length;
  const avgScore =
    totalMocks > 0
      ? Math.round(
          (mockAttempts.reduce((acc, a) => acc + a.score, 0) / totalMocks) * 10,
        ) / 10
      : 0;
  const avgAccuracy =
    totalMocks > 0
      ? Math.round(
          (mockAttempts.reduce((acc, a) => acc + a.accuracyPct, 0) /
            totalMocks) *
            10,
        ) / 10
      : 0;

  const avgMaxScore =
    totalMocks > 0
      ? Math.round(
          (mockAttempts.reduce((acc, a) => acc + (a.maxScore || 200), 0) /
            totalMocks) *
            10,
        ) / 10
      : 200;

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">Assessment record · {totalMocks} {totalMocks === 1 ? "mock" : "mocks"}</p>
          <h1 className="page-title">Performance</h1>
          <p className="page-description">Review individual results and compare your progress across repeated attempts.</p>
        </div>

        {/* View Mode Toggle & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Segmented Control with inline whitespace-nowrap counts */}
          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-medium shrink-0">
            <button
              onClick={() => setViewMode("all")}
              className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 whitespace-nowrap transition-colors ${
                viewMode === "all"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span>Exam Papers</span>
              <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${viewMode === "all" ? "bg-indigo-50 text-indigo-700" : "bg-slate-200/70 text-slate-600"}`}>
                {groupedByPaper.length}
              </span>
            </button>
            <button
              onClick={() => setViewMode("cumulative")}
              className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 whitespace-nowrap transition-colors ${
                viewMode === "cumulative"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span>Cumulative</span>
              <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${viewMode === "cumulative" ? "bg-indigo-50 text-indigo-700" : "bg-slate-200/70 text-slate-600"}`}>
                {groupedByPaper.length}
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="w-full sm:w-56 relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search paper..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all shadow-xs"
            />
          </div>

          <div
            className="inline-flex items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-100 p-0.5 self-start sm:self-auto"
            aria-label="Performance layout"
          >
            <button
              type="button"
              onClick={() => setPerformanceViewMode("grid")}
              aria-label="Show performance as grid"
              aria-pressed={performanceViewMode === "grid"}
              className={`cursor-pointer rounded-lg p-1.5 transition-colors ${
                performanceViewMode === "grid"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Grid2X2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPerformanceViewMode("list")}
              aria-label="Show performance as list"
              aria-pressed={performanceViewMode === "list"}
              className={`cursor-pointer rounded-lg p-1.5 transition-colors ${
                performanceViewMode === "list"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Overview Bar (if attempts exist) */}
      {totalMocks > 0 && !search && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bi-card p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0">
              <Award className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">
                Total Attempts
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                {totalMocks}
              </div>
            </div>
          </div>

          <div className="bi-card p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0">
              <Target className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">
                Average Score
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                {avgScore}{" "}
                <span className="text-xs text-slate-400 font-normal">
                  / {avgMaxScore}
                </span>
              </div>
            </div>
          </div>

          <div className="bi-card p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-100/80 flex items-center justify-center text-teal-600 shrink-0">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">
                Average Accuracy
              </span>
              <div className="text-xl font-bold text-teal-700 font-mono mt-0.5">
                {avgAccuracy}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE 1: CUMULATIVE BY PAPER VIEW
         ========================================================================= */}
      {viewMode === "cumulative" ? (
        filteredGrouped.length === 0 ? (
          <div className="bi-card rounded-2xl p-12 text-center border-dashed border-slate-300">
            <Layers className="mx-auto h-12 w-12 text-slate-400 mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              No cumulative papers found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {search
                ? "No papers matched your search filter."
                : "Complete mock exams to track repeated attempts and cumulative improvement over time."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredGrouped.map((group) => {
              const hasMultiple = group.attempts.length > 1;
              const paperDeleted = !group.paper;

              return (
                <div
                  key={group.paperId}
                  className="bi-card p-5 sm:p-6 space-y-5 rounded-2xl shadow-xs border border-slate-200 hover:border-indigo-200 transition-all"
                >
                  {/* Header: Title, Attempt Count, and Re-attempt CTA */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60 font-mono">
                          {group.paper?.year || "UPSC"}
                        </span>
                        <span className="text-xs font-medium text-slate-500 font-mono">
                          {group.attempts.length}{" "}
                          {group.attempts.length === 1
                            ? "Attempt Logged"
                            : "Attempts Recorded Separately"}
                        </span>
                        {paperDeleted && (
                          <span
                            className="inline-flex items-center justify-center rounded-md bg-amber-50 p-1 text-amber-600"
                            aria-label="Linked paper deleted"
                            title="The paper linked to this assessment has been deleted."
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <h3
                        title={group.paperLabel}
                        className="text-sm sm:text-base font-semibold text-slate-900 truncate"
                      >
                        {group.paperLabel}
                      </h3>
                    </div>

                    {group.paper && (
                      <button
                        onClick={() => handleStartExam(group.paper!, "mock")}
                        className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-xs self-start sm:self-auto active:scale-[0.98]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Re-attempt Mock</span>
                      </button>
                    )}
                  </div>

                  {/* Cumulative Progress Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
                      <span className="text-[10px] uppercase font-medium text-slate-400 block tracking-wider">
                        Initial Attempt
                      </span>
                      <div className="text-base font-bold text-slate-700 font-mono mt-0.5">
                        {group.initialAttempt.score}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          / {group.initialAttempt.maxScore}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {group.initialAttempt.accuracyPct}% accuracy
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
                      <span className="text-[10px] uppercase font-medium text-slate-400 block tracking-wider">
                        Latest Attempt
                      </span>
                      <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                        {group.latestAttempt.score}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          / {group.latestAttempt.maxScore}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {group.latestAttempt.accuracyPct}% accuracy
                      </span>
                    </div>

                    <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/60 p-3">
                      <span className="text-[10px] uppercase font-medium text-emerald-800 block tracking-wider">
                        Score Trajectory
                      </span>
                      <div className="text-base font-bold font-mono mt-0.5 text-emerald-800 flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        <span>
                          {group.scoreDelta >= 0
                            ? `+${group.scoreDelta}`
                            : group.scoreDelta}{" "}
                          pts
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        {group.accuracyDelta >= 0
                          ? `+${group.accuracyDelta}%`
                          : `${group.accuracyDelta}%`}{" "}
                        accuracy
                      </span>
                    </div>

                    <div className="rounded-xl bg-indigo-50/70 border border-indigo-200/60 p-3">
                      <span className="text-[10px] uppercase font-medium text-indigo-700 block tracking-wider">
                        Personal Best
                      </span>
                      <div className="text-base font-bold text-indigo-900 font-mono mt-0.5">
                        {group.bestAttempt.score}{" "}
                        <span className="text-xs font-normal text-indigo-400">
                          / {group.bestAttempt.maxScore}
                        </span>
                      </div>
                      <span className="text-[10px] text-indigo-600 font-medium">
                        {group.bestAttempt.accuracyPct}% accuracy
                      </span>
                    </div>
                  </div>

                  {/* Learning Insights for Multiple Attempts */}
                  {hasMultiple && (
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {group.correctedCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                            <Check className="h-3 w-3" />
                            <span>
                              {group.correctedCount} Errors Corrected in Latest
                              Attempt
                            </span>
                          </span>
                        )}
                        {group.persistentWrongCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                              {group.persistentWrongCount} Persistent Mistakes
                            </span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        All {group.attempts.length} attempts preserved
                        separately
                      </span>
                    </div>
                  )}

                  {/* Individual Attempt Records Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="py-2.5 px-3">Attempt</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3">Net Score</th>
                          <th className="py-2.5 px-3">Accuracy</th>
                          <th className="py-2.5 px-3">Breakdown</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {group.attempts.map((att, idx) => (
                          <tr
                            key={att.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-2 px-3 font-bold font-mono text-slate-800">
                              #{idx + 1}
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-medium">
                              {formatDateTime(att.startedAt)}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-500">
                              {formatTimeSeconds(att.durationSeconds)}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">
                              {att.score} / {att.maxScore}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-teal-700">
                              {att.accuracyPct}%
                            </td>
                            <td className="py-2 px-3 text-[11px] font-mono text-slate-500">
                              <span className="text-emerald-600">
                                {att.correct}C
                              </span>{" "}
                              /{" "}
                              <span className="text-rose-600">
                                {att.incorrect}W
                              </span>{" "}
                              / <span>{att.unattempted}S</span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => onViewAttempt(att)}
                                className="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                              >
                                Review Report →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : /* =========================================================================
           MODE 2: ALL ATTEMPTS CHRONOLOGICAL CARDS
           ========================================================================= */
      filteredGrouped.length === 0 ? (
        <div className="bi-card rounded-2xl p-12 text-center border-dashed border-slate-300">
          <History className="mx-auto h-12 w-12 text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            No mock exam attempts found
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {search
              ? "No past mock tests matched your search."
              : "Start a timed Mock Exam from the Question Papers library to generate your first assessment report."}
          </p>
        </div>
      ) : (
        <div
          className={
            performanceViewMode === "grid"
              ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {filteredGrouped.map((group) => {
            const hasMultiple = group.attempts.length > 1;
            const activeAttemptId =
              selectedAttemptByPaper[group.paperId] || group.latestAttempt.id;
            const activeAttempt =
              group.attempts.find((a) => a.id === activeAttemptId) ||
              group.latestAttempt;
            const totalPaperAttempts = group.attempts.length;
            const matchedPaper =
              group.paper || papers.find((p) => p.id === group.paperId);
            const paperDeleted = !matchedPaper;

            const isCsat =
              group.paperLabel.includes("CSAT") ||
              group.paperLabel.includes("GS II");
            const scoreColor =
              activeAttempt.score >= 90
                ? "text-emerald-700"
                : activeAttempt.score >= 66
                  ? "text-amber-700"
                  : "text-slate-800";

            // Cutoff indicator badge for active attempt
            let cutoffBadge = null;
            if (isCsat) {
              const qualified = activeAttempt.score >= 66.67;
              cutoffBadge = (
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    qualified
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                      : "bg-rose-50 text-rose-700 border border-rose-200/50"
                  }`}
                >
                  {qualified ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {qualified ? "CSAT Qualified" : "Below Cutoff"}
                </span>
              );
            } else if (activeAttempt.category === "prelims") {
              const competitive = activeAttempt.score >= 95;
              cutoffBadge = (
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                    competitive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                      : "bg-slate-100 text-slate-600 border border-slate-200/60"
                  }`}
                >
                  {competitive ? "Cutoff Cleared" : "Prelims Mock"}
                </span>
              );
            }

            return (
              <div
                key={group.paperId}
                className="relative group/stack flex flex-col"
              >
                {/* Clean, subtle layered shadow for re-attempted papers */}
                {totalPaperAttempts > 2 && (
                  <div
                    aria-hidden="true"
                    className="absolute -bottom-2 -right-2 left-2 top-2 rounded-2xl bg-indigo-50/60 border border-indigo-200/40 -z-20 pointer-events-none"
                  />
                )}
                {hasMultiple && (
                  <div
                    aria-hidden="true"
                    className="absolute -bottom-1 -right-1 left-1 top-1 rounded-2xl bg-slate-100/80 border border-slate-200/60 -z-10 pointer-events-none"
                  />
                )}

                {/* Main Attempt Card */}
                <div
                  onClick={() => onViewAttempt(activeAttempt)}
                  className={`cursor-pointer relative flex justify-between bi-card p-5 group hover:border-indigo-300 transition-all shadow-xs bg-white rounded-2xl h-full flex-1 ${
                    performanceViewMode === "grid"
                      ? "flex-col"
                      : "flex-col md:grid md:grid-cols-[minmax(0,1fr)_minmax(180px,230px)] md:gap-6"
                  }`}
                >
                  <div className="min-w-0 space-y-3">
                    {/* Top row: Status Badge & Attempt Count & Duration */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {cutoffBadge || (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                            Evaluated
                          </span>
                        )}

                        {paperDeleted && (
                          <span
                            className="inline-flex items-center justify-center rounded-md bg-amber-50 p-1 text-amber-600"
                            aria-label="Linked paper deleted"
                            title="The paper linked to this assessment has been deleted."
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </span>
                        )}

                        {hasMultiple ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200 text-[10px] font-mono"
                            title="Switch attempt to inspect"
                          >
                            {group.attempts.map((att, idx) => {
                              const isAttActive = att.id === activeAttempt.id;
                              return (
                                <button
                                  key={att.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedAttemptByPaper((prev) => ({
                                      ...prev,
                                      [group.paperId]: att.id,
                                    }))
                                  }
                                  className={`px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                                    isAttActive
                                      ? "bg-white text-indigo-700 shadow-2xs font-semibold"
                                      : "text-slate-500 hover:text-slate-800"
                                  }`}
                                  title={`View Attempt #${idx + 1}`}
                                >
                                  #{idx + 1}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 font-mono">
                            Attempt 1
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {formatTimeSeconds(activeAttempt.durationSeconds)}
                      </span>
                    </div>

                    {/* Title & Date */}
                    <div>
                      <h3
                        title={group.paperLabel}
                        className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug truncate"
                      >
                        {group.paperLabel}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-slate-400 mt-1 font-normal">
                        <span>{formatDateTime(activeAttempt.startedAt)}</span>
                        {hasMultiple && group.scoreDelta !== 0 && (
                          <span
                            className={`text-[11px] font-medium font-mono ${
                              group.scoreDelta > 0
                                ? "text-emerald-700"
                                : "text-rose-700"
                            }`}
                          >
                            {group.scoreDelta > 0
                              ? `+${group.scoreDelta}`
                              : group.scoreDelta}{" "}
                            pts
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score & Accuracy Box - Clean card style */}
                    <div className="flex items-center justify-between rounded-xl bg-slate-50/80 px-4 py-3 border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                          Score
                        </span>
                        <div
                          className={`text-lg font-bold font-mono ${scoreColor} mt-0.5`}
                        >
                          {activeAttempt.score}{" "}
                          <span className="text-xs text-slate-400 font-normal">
                            / {activeAttempt.maxScore}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                          Accuracy
                        </span>
                        <div className="text-lg font-bold text-teal-700 font-mono mt-0.5">
                          {activeAttempt.accuracyPct}%
                        </div>
                      </div>
                    </div>

                    {/* Question breakdown row */}
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500 px-1 pt-1">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-700 font-semibold">{activeAttempt.correct}</span>
                        <span className="text-slate-400 font-normal">correct</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                        <span className="text-slate-700 font-semibold">{activeAttempt.incorrect}</span>
                        <span className="text-slate-400 font-normal">wrong</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                        <span className="text-slate-700 font-semibold">{activeAttempt.unattempted}</span>
                        <span className="text-slate-400 font-normal">skipped</span>
                      </span>
                    </div>
                  </div>

                  {/* Bottom Actions: Re-attempt Mock + Review Assessment */}
                  <div
                    className={`mt-4 flex items-center justify-between gap-2 text-xs ${
                      performanceViewMode === "grid"
                        ? "border-t border-slate-100 pt-3"
                        : "border-t border-slate-100 pt-3 md:mt-0 md:border-l md:border-t-0 md:pl-5 md:pt-0 md:self-stretch md:flex md:flex-col md:justify-center"
                    }`}
                  >
                    {matchedPaper ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartExam(matchedPaper, "mock");
                        }}
                        className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-xs font-medium transition-colors"
                        title={`Re-attempt ${group.paperLabel} in Mock Exam mode`}
                      >
                        <RotateCcw className="h-3 w-3 text-slate-500 group-hover:text-indigo-600" />
                        <span>Re-attempt</span>
                      </button>
                    ) : <span />}
                    {paperDeleted && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteAttempt(activeAttempt.id);
                        }}
                        className="cursor-pointer rounded-lg p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Delete assessment"
                        title="Delete this assessment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <span className="text-indigo-600 group-hover:text-indigo-700 font-medium text-xs flex items-center gap-0.5 transition-colors">
                      Review <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

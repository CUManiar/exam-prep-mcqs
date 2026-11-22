"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Brain,
  ChevronRight,
  Flame,
  Target,
  Zap,
} from "lucide-react";
import { Attempt, QuestionPaper } from "../../lib/types";
import {
  extractMistakeDiagnostics,
  MistakeItem,
  buildRemediationPrompt,
} from "../../lib/revision/mistakeProfiler";

interface MistakeDossierCardProps {
  attempts: Attempt[];
  papers: QuestionPaper[];
  onSelectRemediation: (prompt: string, topic: string) => void;
}

export function MistakeDossierCard({
  attempts,
  papers,
  onSelectRemediation,
}: MistakeDossierCardProps) {
  const [selectedClusterKey, setSelectedClusterKey] = useState<string | null>(
    null,
  );

  const diagnostics = useMemo(
    () => extractMistakeDiagnostics(attempts, papers),
    [attempts, papers],
  );

  if (diagnostics.totalWrongQuestions === 0) {
    return null;
  }

  const activeCluster =
    diagnostics.clusters.find((c) => c.conceptKey === selectedClusterKey) ||
    diagnostics.clusters[0];

  return (
    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header Stat Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-200/60 dark:border-rose-900/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Mistake-to-Concept Diagnostics</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                {diagnostics.totalWrongQuestions} Weak Spots
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Forfeited ~{diagnostics.totalNegativeMarksLost} marks across your
              test history.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-rose-700 dark:text-rose-300">
          <Flame className="h-4 w-4" />
          <span>High-Yield Revision Priority</span>
        </div>
      </div>

      {/* Concept Clusters Pills */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          Top Weakness Clusters
        </span>
        <div className="flex flex-wrap gap-1.5">
          {diagnostics.clusters.slice(0, 6).map((c) => {
            const isSelected = activeCluster?.conceptKey === c.conceptKey;
            return (
              <button
                key={c.conceptKey}
                type="button"
                onClick={() => setSelectedClusterKey(c.conceptKey)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700"
                }`}
              >
                <span>{c.conceptTitle}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? "bg-rose-700 text-white"
                      : "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300"
                  }`}
                >
                  {c.mistakeCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drill Trigger for Active Cluster */}
      {activeCluster && (
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Cluster: {activeCluster.conceptTitle}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {activeCluster.mistakeCount} questions missed • Lost ~
                {activeCluster.totalNegativeMarks.toFixed(1)} marks
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const sample = activeCluster.sampleQuestions[0];
                if (sample) {
                  onSelectRemediation(
                    buildRemediationPrompt(sample),
                    activeCluster.conceptTitle,
                  );
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-2xs cursor-pointer"
            >
              <Brain className="h-3.5 w-3.5" />
              <span>Drill Concept with AI</span>
            </button>
          </div>

          {/* Sample Missed Question */}
          {activeCluster.sampleQuestions.slice(0, 2).map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {item.paperTitle} • Q#{item.questionNo}
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  Selected ({item.studentSelected}) ➔ Correct (
                  {item.correctAnswer})
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 line-clamp-2">
                {item.questionText}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

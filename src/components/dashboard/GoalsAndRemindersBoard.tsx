"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Edit2,
  Flame,
  Sparkles,
  Target,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

interface GoalsAndRemindersBoardProps {
  todayAnsweredCount: number;
  weekMocksCount: number;
  onNavigatePapers: () => void;
}

function formatCompletionDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Recently";
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) return "Today";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently";
  }
}

export function GoalsAndRemindersBoard({
  todayAnsweredCount,
  weekMocksCount,
  onNavigatePapers,
}: GoalsAndRemindersBoardProps) {
  const { syllabusItems = [] } = useApp();

  // 1. Daily MCQ Target
  const [dailyTarget, setDailyTarget] = useState<number>(() => {
    if (typeof window === "undefined") return 50;
    const saved = localStorage.getItem("exam_prep_daily_target");
    return saved ? parseInt(saved, 10) || 50 : 50;
  });
  const [isEditingDaily, setIsEditingDaily] = useState(false);
  const [tempDailyTarget, setTempDailyTarget] = useState(dailyTarget);

  // 2. Weekly Mock Goal
  const [weeklyMockGoal, setWeeklyMockGoal] = useState<number>(() => {
    if (typeof window === "undefined") return 3;
    const saved = localStorage.getItem("exam_prep_weekly_mock_goal");
    return saved ? parseInt(saved, 10) || 3 : 3;
  });
  const [isEditingWeekly, setIsEditingWeekly] = useState(false);
  const [tempWeeklyGoal, setTempWeeklyGoal] = useState(weeklyMockGoal);

  // 3. Recently completed syllabus leaf items (no sections, no duplicates)
  const completedSyllabusItems = useMemo(() => {
    // Identify all parent IDs to exclude entire parent sections
    const parentIdSet = new Set(
      syllabusItems.map((s) => s.parentId).filter(Boolean),
    );

    // Only keep completed leaf items
    const leaves = syllabusItems.filter(
      (item) => item.completed && !parentIdSet.has(item.id),
    );

    // Sort by newest updatedAt or createdAt first
    const sorted = [...leaves].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    // Deduplicate by clean title
    const seenTitles = new Set<string>();
    const unique: Array<{ id: string; title: string; completedAt: string }> =
      [];

    for (const item of sorted) {
      const norm = item.title.trim().toLowerCase();
      if (!seenTitles.has(norm)) {
        seenTitles.add(norm);
        unique.push({
          id: item.id,
          title: item.title.trim(),
          completedAt:
            item.updatedAt || item.createdAt || new Date().toISOString(),
        });
      }
    }

    return unique;
  }, [syllabusItems]);

  // Persist daily target
  const handleSaveDailyTarget = (val: number) => {
    const clamped = Math.max(5, Math.min(val, 500));
    setDailyTarget(clamped);
    if (typeof window !== "undefined") {
      localStorage.setItem("exam_prep_daily_target", clamped.toString());
    }
    setIsEditingDaily(false);
  };

  // Persist weekly mock goal
  const handleSaveWeeklyGoal = (val: number) => {
    const clamped = Math.max(1, Math.min(val, 20));
    setWeeklyMockGoal(clamped);
    if (typeof window !== "undefined") {
      localStorage.setItem("exam_prep_weekly_mock_goal", clamped.toString());
    }
    setIsEditingWeekly(false);
  };

  const dailyProgressPct = Math.min(
    100,
    Math.round((todayAnsweredCount / dailyTarget) * 100),
  );
  const weeklyProgressPct = Math.min(
    100,
    Math.round((weekMocksCount / weeklyMockGoal) * 100),
  );

  return (
    <div className="surface-card flex flex-col justify-between p-3 sm:p-6 space-y-3.5 sm:space-y-6 w-full max-w-full min-w-0 overflow-hidden">
      {/* Board Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-300/60 shrink-0">
            <Target className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 truncate">
              Goals &amp; Syllabus Progress
            </h2>
            <p className="text-[11px] text-slate-500 line-clamp-1 sm:line-clamp-none">
              Daily practice quotas and milestones finished.
            </p>
          </div>
        </div>
      </div>

      {/* Target Meters Section */}
      <div className="space-y-4">
        {/* Daily MCQ Goal Card */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              Daily MCQ Target
            </span>
            {isEditingDaily ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={tempDailyTarget}
                  onChange={(e) =>
                    setTempDailyTarget(parseInt(e.target.value, 10) || 5)
                  }
                  className="w-16 rounded border border-blue-400 bg-white px-1.5 py-0.5 text-xs font-bold text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSaveDailyTarget(tempDailyTarget)}
                  className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-blue-700 cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTempDailyTarget(dailyTarget);
                  setIsEditingDaily(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-700 transition-colors cursor-pointer"
              >
                <Edit2 className="h-3 w-3" />
                <span>{dailyTarget} MCQs</span>
              </button>
            )}
          </div>

          <div className="flex items-baseline justify-between text-xs font-medium">
            <span className="text-slate-600">
              <strong className="text-slate-900 font-bold">
                {todayAnsweredCount}
              </strong>{" "}
              / {dailyTarget} completed today
            </span>
            <span className="font-mono font-bold text-slate-800">
              {dailyProgressPct}%
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                todayAnsweredCount >= dailyTarget
                  ? "bg-emerald-500"
                  : "bg-amber-500"
              }`}
              style={{ width: `${dailyProgressPct}%` }}
            />
          </div>
        </div>

        {/* Weekly Mock Goal Card */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
              Weekly Mocks Quota
            </span>
            {isEditingWeekly ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={tempWeeklyGoal}
                  onChange={(e) =>
                    setTempWeeklyGoal(parseInt(e.target.value, 10) || 1)
                  }
                  className="w-14 rounded border border-blue-400 bg-white px-1.5 py-0.5 text-xs font-bold text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSaveWeeklyGoal(tempWeeklyGoal)}
                  className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTempWeeklyGoal(weeklyMockGoal);
                  setIsEditingWeekly(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                <Edit2 className="h-3 w-3" />
                <span>{weeklyMockGoal} mocks</span>
              </button>
            )}
          </div>

          <div className="flex items-baseline justify-between text-xs font-medium">
            <span className="text-slate-600">
              <strong className="text-slate-900 font-bold">
                {weekMocksCount}
              </strong>{" "}
              / {weeklyMockGoal} mocks this week
            </span>
            <span className="font-mono font-bold text-slate-800">
              {weeklyProgressPct}%
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                weekMocksCount >= weeklyMockGoal
                  ? "bg-emerald-500"
                  : "bg-indigo-500"
              }`}
              style={{ width: `${weeklyProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* What I Just Finished: Recently completed syllabus topics */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              What I Just Finished
            </h3>
          </div>
          <Link
            href="/syllabus"
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5 transition-colors cursor-pointer"
          >
            <span>{completedSyllabusItems.length} finished</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Completed Syllabus Items List */}
        <div className="space-y-1.5 max-h-[14rem] overflow-y-auto pr-1">
          {completedSyllabusItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center space-y-2">
              <CheckCircle2 className="h-6 w-6 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                Ready to conquer your syllabus!
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Check off topics in your personal Syllabus Tracker as you
                complete them to celebrate your progress here.
              </p>
              <Link
                href="/syllabus"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 pt-1 cursor-pointer"
              >
                <span>Open Syllabus Tracker</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            completedSyllabusItems.slice(0, 10).map((item) => (
              <Link
                key={item.id}
                href={`/syllabus#syllabus-item-${item.id}`}
                prefetch={false}
                className="flex items-center justify-between gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-100/70 p-2.5 text-xs transition-colors group cursor-pointer"
                title={`Jump to ${item.title} in syllabus tracker`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span
                    className="min-w-0 truncate font-semibold text-slate-800 block text-xs group-hover:text-emerald-900"
                    title={item.title}
                  >
                    {item.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-[10px] font-medium text-emerald-800 bg-emerald-100/70 border border-emerald-200/60 px-2 py-0.5 rounded-md whitespace-nowrap">
                    {formatCompletionDate(item.completedAt)}
                  </span>
                  <ArrowRight className="h-3 w-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

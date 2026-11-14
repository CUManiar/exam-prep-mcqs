"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Edit2,
  Flame,
  ListTodo,
  Plus,
  Target,
  Trash2,
} from "lucide-react";

interface ReminderItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

interface GoalsAndRemindersBoardProps {
  todayAnsweredCount: number;
  weekMocksCount: number;
  onNavigatePapers: () => void;
}

const DEFAULT_REMINDERS: ReminderItem[] = [
  {
    id: "rem-1",
    text: "Analyze incorrect questions from last GS Paper 1 mock",
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "rem-2",
    text: "Practice 1 CSAT Reading Comprehension passage",
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "rem-3",
    text: "Revise Constitutional Bodies (Articles 324-329)",
    completed: true,
    createdAt: new Date().toISOString(),
  },
];

const QUICK_ADD_TEMPLATES = [
  "Revise Modern History Spectrum",
  "CSAT Speed Math Practice",
  "Economy PYQs Analysis",
  "Environment & Biodiversity notes",
];

export function GoalsAndRemindersBoard({
  todayAnsweredCount,
  weekMocksCount,
  onNavigatePapers,
}: GoalsAndRemindersBoardProps) {
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

  // 3. Reminders / To-Do Checklist
  const [reminders, setReminders] = useState<ReminderItem[]>(() => {
    if (typeof window === "undefined") return DEFAULT_REMINDERS;
    try {
      const saved = localStorage.getItem("exam_prep_aspirant_reminders_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_REMINDERS;
  });

  const [newReminderText, setNewReminderText] = useState("");

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

  // Persist reminders to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "exam_prep_aspirant_reminders_v1",
        JSON.stringify(reminders),
      );
    }
  }, [reminders]);

  const handleAddReminder = (textToAdd?: string) => {
    const text = (textToAdd || newReminderText).trim();
    if (!text) return;

    const newItem: ReminderItem = {
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setReminders((prev) => [newItem, ...prev]);
    if (!textToAdd) setNewReminderText("");
  };

  const handleToggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r)),
    );
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const dailyProgressPct = Math.min(
    100,
    Math.round((todayAnsweredCount / dailyTarget) * 100),
  );
  const weeklyProgressPct = Math.min(
    100,
    Math.round((weekMocksCount / weeklyMockGoal) * 100),
  );

  const completedRemindersCount = reminders.filter((r) => r.completed).length;

  return (
    <div className="surface-card flex flex-col justify-between p-5 sm:p-6 space-y-6">
      {/* Board Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-300/60">
            <Target className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Goals &amp; Study Reminders
            </h2>
            <p className="text-[11px] text-slate-500">
              Set actionable study quotas and keep track of revision goals.
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
                  className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-blue-700"
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
                  className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-indigo-700"
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

      {/* Reminders / To-Do Checklist */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ListTodo className="h-4 w-4 text-slate-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Reminders &amp; Revision To-Dos
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {completedRemindersCount}/{reminders.length} done
          </span>
        </div>

        {/* Input to add reminder */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddReminder();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={newReminderText}
            onChange={(e) => setNewReminderText(e.target.value)}
            placeholder="Add revision task or topic..."
            className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
          />
          <button
            type="submit"
            disabled={!newReminderText.trim()}
            className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer"
            title="Add reminder"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {QUICK_ADD_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl}
              type="button"
              onClick={() => handleAddReminder(tmpl)}
              className="text-[10px] font-medium text-slate-500 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2 py-0.5 rounded-md border border-slate-200/60 transition-colors cursor-pointer"
            >
              + {tmpl}
            </button>
          ))}
        </div>

        {/* Reminder Items List */}
        <div className="space-y-1.5 max-h-[13rem] overflow-y-auto pr-1">
          {reminders.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-3">
              No pending reminders. Add topics to revise above!
            </p>
          ) : (
            reminders.map((r) => (
              <div
                key={r.id}
                className={`group flex items-start justify-between gap-2 rounded-lg border p-2 text-xs transition-colors ${
                  r.completed
                    ? "border-slate-100 bg-slate-50/50 text-slate-400"
                    : "border-slate-200/80 bg-white text-slate-800 hover:border-slate-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleReminder(r.id)}
                  className="flex items-start gap-2 min-w-0 text-left flex-1 cursor-pointer"
                >
                  <span className="mt-0.5 shrink-0">
                    {r.completed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-400" />
                    )}
                  </span>
                  <span
                    className={`min-w-0 truncate text-xs ${
                      r.completed
                        ? "line-through text-slate-400"
                        : "font-medium"
                    }`}
                  >
                    {r.text}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteReminder(r.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer"
                  title="Delete reminder"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

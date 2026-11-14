"use client";

import { useState, useMemo } from "react";
import { Attempt } from "../../lib/types";
import {
  Flame,
  ChevronLeft,
  ChevronRight,
  Calendar as Award,
} from "lucide-react";

interface StrikeCalendarProps {
  attempts: Attempt[];
  onSelectDate?: (dateStr: string) => void;
}

interface DayActivity {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  mcqCount: number;
  mockCount: number;
  practiceCount: number;
  attemptsCount: number;
  accuracy: number | null;
  totalScore: number;
  maxScore: number;
}

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function StrikeCalendar({
  attempts,
  onSelectDate,
}: StrikeCalendarProps) {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [hoveredDay, setHoveredDay] = useState<DayActivity | null>(null);

  // Group attempts by date
  const activityMap = useMemo(() => {
    const map = new Map<
      string,
      {
        mcqCount: number;
        mockCount: number;
        practiceCount: number;
        attemptsCount: number;
        correctCount: number;
        totalAnswered: number;
        totalScore: number;
        maxScore: number;
      }
    >();

    attempts.forEach((a) => {
      const rawDate = a.finishedAt || a.startedAt;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (Number.isNaN(d.getTime())) return;
      const key = formatDateKey(d);

      const existing = map.get(key) || {
        mcqCount: 0,
        mockCount: 0,
        practiceCount: 0,
        attemptsCount: 0,
        correctCount: 0,
        totalAnswered: 0,
        totalScore: 0,
        maxScore: 0,
      };

      existing.mcqCount += a.answered || 0;
      existing.attemptsCount += 1;
      if (a.mode === "mock") {
        existing.mockCount += 1;
      } else {
        existing.practiceCount += 1;
      }
      existing.correctCount += a.correct || 0;
      existing.totalAnswered += a.answered || 0;
      existing.totalScore += a.score || 0;
      existing.maxScore += a.maxScore || 0;

      map.set(key, existing);
    });

    return map;
  }, [attempts]);

  // Compute overall streaks
  const streakStats = useMemo(() => {
    const dates = Array.from(activityMap.keys()).sort();
    if (dates.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalActiveDays: 0,
        isActiveToday: false,
      };
    }

    const today = new Date();
    const todayStr = formatDateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateKey(yesterday);

    const dateSet = new Set(dates);
    const isActiveToday = dateSet.has(todayStr);

    // Current streak
    let current = 0;
    let checkDate = isActiveToday ? today : yesterday;
    if (isActiveToday || dateSet.has(yesterdayStr)) {
      while (dateSet.has(formatDateKey(checkDate))) {
        current++;
        const prev = new Date(checkDate);
        prev.setDate(prev.getDate() - 1);
        checkDate = prev;
      }
    }

    // Longest streak
    let longest = 0;
    let tempStreak = 0;
    let prevTime: number | null = null;

    dates.forEach((dStr) => {
      const [y, m, d] = dStr.split("-").map(Number);
      const currTime = new Date(y, m - 1, d).getTime();

      if (prevTime === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round(
          (currTime - prevTime) / (1000 * 60 * 60 * 24),
        );
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      prevTime = currTime;
      if (tempStreak > longest) longest = tempStreak;
    });

    return {
      currentStreak: current,
      longestStreak: Math.max(longest, current),
      totalActiveDays: dates.length,
      isActiveToday,
    };
  }, [activityMap]);

  // Calendar days grid for the selected month
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const today = new Date();
    const todayStr = formatDateKey(today);

    // First day of month & total days in month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Day of week for first day (0=Sunday, 1=Monday). Adjust so Monday is 0
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: DayActivity[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const pDate = new Date(year, month - 1, pDay);
      const pKey = formatDateKey(pDate);
      const data = activityMap.get(pKey);
      days.push({
        dateStr: pKey,
        dayNumber: pDay,
        isCurrentMonth: false,
        isToday: pKey === todayStr,
        isFuture: pDate.getTime() > today.getTime(),
        mcqCount: data?.mcqCount || 0,
        mockCount: data?.mockCount || 0,
        practiceCount: data?.practiceCount || 0,
        attemptsCount: data?.attemptsCount || 0,
        accuracy:
          data && data.totalAnswered > 0
            ? Math.round((data.correctCount / data.totalAnswered) * 100)
            : null,
        totalScore: data?.totalScore || 0,
        maxScore: data?.maxScore || 0,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const cDate = new Date(year, month, d);
      const cKey = formatDateKey(cDate);
      const data = activityMap.get(cKey);
      days.push({
        dateStr: cKey,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: cKey === todayStr,
        isFuture: cDate.getTime() > today.getTime(),
        mcqCount: data?.mcqCount || 0,
        mockCount: data?.mockCount || 0,
        practiceCount: data?.practiceCount || 0,
        attemptsCount: data?.attemptsCount || 0,
        accuracy:
          data && data.totalAnswered > 0
            ? Math.round((data.correctCount / data.totalAnswered) * 100)
            : null,
        totalScore: data?.totalScore || 0,
        maxScore: data?.maxScore || 0,
      });
    }

    // Next month padding to fill complete weeks (up to 35 or 42 cells)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nDate = new Date(year, month + 1, d);
      const nKey = formatDateKey(nDate);
      const data = activityMap.get(nKey);
      days.push({
        dateStr: nKey,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: nKey === todayStr,
        isFuture: nDate.getTime() > today.getTime(),
        mcqCount: data?.mcqCount || 0,
        mockCount: data?.mockCount || 0,
        practiceCount: data?.practiceCount || 0,
        attemptsCount: data?.attemptsCount || 0,
        accuracy:
          data && data.totalAnswered > 0
            ? Math.round((data.correctCount / data.totalAnswered) * 100)
            : null,
        totalScore: data?.totalScore || 0,
        maxScore: data?.maxScore || 0,
      });
    }

    return days;
  }, [currentMonthDate, activityMap]);

  // Current month active days count
  const monthActiveDays = useMemo(() => {
    return calendarDays.filter((d) => d.isCurrentMonth && d.mcqCount > 0)
      .length;
  }, [calendarDays]);

  const monthTotalMcqs = useMemo(() => {
    return calendarDays
      .filter((d) => d.isCurrentMonth)
      .reduce((sum, d) => sum + d.mcqCount, 0);
  }, [calendarDays]);

  const handlePrevMonth = () => {
    setCurrentMonthDate(
      new Date(
        currentMonthDate.getFullYear(),
        currentMonthDate.getMonth() - 1,
        1,
      ),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(
      new Date(
        currentMonthDate.getFullYear(),
        currentMonthDate.getMonth() + 1,
        1,
      ),
    );
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const monthLabel = currentMonthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="surface-card p-5 sm:p-6 space-y-5">
      {/* Header with Title and Streak Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 ring-1 ring-amber-300/60">
              <Flame className="h-4 w-4" />
            </span>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              Strike &amp; Practice Calendar
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Track daily study consistency, question volume, and your active
            learning streak.
          </p>
        </div>

        {/* Quick Streak KPI Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/70 px-3 py-1 text-xs font-bold text-amber-900">
            <Flame
              className={`h-4 w-4 ${
                streakStats.isActiveToday
                  ? "text-amber-500 fill-amber-500 animate-pulse"
                  : "text-amber-400"
              }`}
            />
            <span>{streakStats.currentStreak} Day Streak</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/70 px-3 py-1 text-xs font-semibold text-indigo-900">
            <Award className="h-3.5 w-3.5 text-indigo-600" />
            <span>Best: {streakStats.longestStreak}d</span>
          </div>
        </div>
      </div>

      {/* Month Navigation & Month Stats Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-slate-800 min-w-[8.5rem] text-center">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleCurrentMonth}
            className="ml-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100/70 px-2 py-1 rounded-md border border-blue-200 transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>
            Active:{" "}
            <strong className="font-semibold text-slate-800">
              {monthActiveDays}
            </strong>{" "}
            days
          </span>
          <span className="text-slate-300">·</span>
          <span>
            Month MCQs:{" "}
            <strong className="font-semibold text-slate-800">
              {monthTotalMcqs}
            </strong>
          </span>
        </div>
      </div>

      {/* 7-column calendar grid */}
      <div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span className="text-rose-400 font-extrabold">Sun</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {calendarDays.map((day) => {
            const hasActivity = day.mcqCount > 0;

            // Compute background intensity based on questions solved
            let bgClass =
              "bg-slate-50/70 border-slate-200/60 text-slate-600 hover:border-slate-300";
            if (!day.isCurrentMonth) {
              bgClass =
                "bg-slate-50/30 border-slate-100 text-slate-300 hover:border-slate-200";
            } else if (hasActivity) {
              if (day.mcqCount >= 100) {
                bgClass =
                  "bg-emerald-600 border-emerald-700 text-white font-bold shadow-xs hover:bg-emerald-700";
              } else if (day.mcqCount >= 50) {
                bgClass =
                  "bg-emerald-500 border-emerald-600 text-white font-semibold hover:bg-emerald-600";
              } else if (day.mcqCount >= 25) {
                bgClass =
                  "bg-emerald-200 border-emerald-300 text-emerald-950 font-medium hover:bg-emerald-300";
              } else {
                bgClass =
                  "bg-emerald-100/80 border-emerald-200 text-emerald-900 font-medium hover:bg-emerald-200/70";
              }
            }

            const isTodayClass = day.isToday
              ? "ring-2 ring-blue-500 ring-offset-1 font-bold"
              : "";

            return (
              <div
                key={day.dateStr}
                onClick={() => onSelectDate?.(day.dateStr)}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`relative flex flex-col justify-between h-14 sm:h-16 p-1.5 rounded-xl border transition-all cursor-pointer ${bgClass} ${isTodayClass}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-semibold tabular-nums leading-none">
                    {day.dayNumber}
                  </span>
                  {hasActivity && (
                    <Flame
                      className={`h-3 w-3 ${
                        day.mcqCount >= 50
                          ? "text-amber-200 fill-amber-300"
                          : "text-amber-500"
                      }`}
                    />
                  )}
                </div>

                {hasActivity ? (
                  <div className="mt-auto">
                    <span className="block text-[10px] sm:text-[11px] font-bold tabular-nums leading-tight truncate">
                      {day.mcqCount}
                      <span className="text-[9px] font-normal opacity-85 ml-0.5 hidden sm:inline">
                        Q
                      </span>
                    </span>
                    {day.mockCount > 0 && (
                      <span
                        className={`text-[8px] font-extrabold uppercase px-1 py-0.2 rounded leading-none inline-block ${
                          day.mcqCount >= 50
                            ? "bg-white/20 text-white"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {day.mockCount} mock{day.mockCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                ) : (
                  day.isCurrentMonth && (
                    <span className="text-[10px] text-slate-300 font-mono text-center mb-0.5">
                      ·
                    </span>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip / Active Inspection Preview */}
      {hoveredDay ? (
        <div className="rounded-xl border border-blue-200/80 bg-blue-50/70 p-3 sm:p-4 text-xs space-y-1 transition-all">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900">
              {new Date(`${hoveredDay.dateStr}T00:00:00`).toLocaleDateString(
                undefined,
                {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                },
              )}
              {hoveredDay.isToday && " (Today)"}
            </span>
            <span className="font-semibold text-blue-700">
              {hoveredDay.mcqCount > 0
                ? "Practice Recorded"
                : "No Study Recorded"}
            </span>
          </div>
          {hoveredDay.mcqCount > 0 ? (
            <div className="flex flex-wrap items-center gap-3 pt-1 text-slate-600">
              <span>
                MCQs Solved:{" "}
                <strong className="text-slate-900">
                  {hoveredDay.mcqCount}
                </strong>
              </span>
              <span>·</span>
              <span>
                Tests:{" "}
                <strong className="text-slate-900">
                  {hoveredDay.mockCount} mocks, {hoveredDay.practiceCount}{" "}
                  practice
                </strong>
              </span>
              {hoveredDay.accuracy !== null && (
                <>
                  <span>·</span>
                  <span>
                    Avg Accuracy:{" "}
                    <strong
                      className={
                        hoveredDay.accuracy >= 70
                          ? "text-emerald-700"
                          : hoveredDay.accuracy >= 50
                            ? "text-amber-700"
                            : "text-rose-700"
                      }
                    >
                      {hoveredDay.accuracy}%
                    </strong>
                  </span>
                </>
              )}
            </div>
          ) : (
            <p className="text-slate-500 pt-0.5">
              No assessments recorded on this date. Keep your momentum by
              practicing daily.
            </p>
          )}
        </div>
      ) : (
        /* Legend */
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span className="font-medium text-slate-600">
            Question Intensity:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-slate-100 border border-slate-200/80" />
            <span className="text-[10px] text-slate-400 mr-2">0</span>
            <span className="h-3 w-3 rounded bg-emerald-100 border border-emerald-200" />
            <span className="text-[10px] text-slate-500 mr-2">1–24</span>
            <span className="h-3 w-3 rounded bg-emerald-300 border border-emerald-400" />
            <span className="text-[10px] text-slate-600 mr-2">25–49</span>
            <span className="h-3 w-3 rounded bg-emerald-500" />
            <span className="text-[10px] text-slate-700 mr-2">50–99</span>
            <span className="h-3 w-3 rounded bg-emerald-600 ring-1 ring-emerald-300" />
            <span className="text-[10px] text-slate-800 font-bold">100+</span>
          </div>
        </div>
      )}
    </div>
  );
}

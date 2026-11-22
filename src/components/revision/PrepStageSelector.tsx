"use client";

import { PrepStage } from "../../lib/types";
import { PREP_PERSONAS } from "../../lib/revision/tutorPersonas";
import { UPSC_OPTIONAL_SUBJECTS } from "../../lib/optionalSubjects";

interface PrepStageSelectorProps {
  currentStage: PrepStage;
  onSelectStage: (stage: PrepStage) => void;
  selectedOptional?: string;
  onSelectOptional?: (optional: string) => void;
}

export function PrepStageSelector({
  currentStage,
  onSelectStage,
  selectedOptional = "Political Science & International Relations (PSIR)",
  onSelectOptional,
}: PrepStageSelectorProps) {
  const stages: PrepStage[] = [
    "prelims",
    "mains",
    "optional",
    "csat",
    "concept",
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
        {stages.map((stg) => {
          const cfg = PREP_PERSONAS[stg];
          const isActive = currentStage === stg;
          return (
            <button
              key={stg}
              type="button"
              onClick={() => onSelectStage(stg)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>{cfg.icon}</span>
              <span className="hidden sm:inline">
                {cfg.label
                  .replace(" Specialist", "")
                  .replace(" Mentor", "")
                  .replace(" Architect", "")
                  .replace(" Coach", "")
                  .replace(" Partner", "")}
              </span>
              <span className="sm:hidden">{cfg.badge.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {currentStage === "optional" && onSelectOptional && (
        <div className="flex items-center gap-1.5">
          <select
            value={selectedOptional}
            onChange={(e) => onSelectOptional(e.target.value)}
            className="text-xs font-medium px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
          >
            {UPSC_OPTIONAL_SUBJECTS.map((subj) => (
              <option
                key={subj}
                value={subj}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                {subj}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

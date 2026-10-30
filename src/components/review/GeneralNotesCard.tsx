"use client";

import React, { useState } from "react";
import { Edit3, FileText, Check, X } from "lucide-react";

interface GeneralNotesCardProps {
  initialNotes?: string;
  onSaveNotes: (notes: string) => void;
}

export function GeneralNotesCard({
  initialNotes = "",
  onSaveNotes,
}: GeneralNotesCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes);

  const handleSave = () => {
    onSaveNotes(notes);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNotes(initialNotes);
    setIsEditing(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Attempt Strategy Notes & Reflections
          </h3>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>{notes.trim() ? "Edit Notes" : "+ Add Note"}</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2.5">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Jot down overall reflections, syllabus areas to revise, pacing lessons, or elimination takeaways..."
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs leading-relaxed text-slate-800 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all resize-y"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Save Reflection</span>
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-600 leading-relaxed font-normal bg-slate-50/60 p-3 rounded-xl border border-slate-200/80 whitespace-pre-wrap">
          {notes.trim() ||
            "No overall strategy notes recorded for this attempt. Click '+ Add Note' to record conceptual blindspots or elimination rules for next time."}
        </p>
      )}
    </div>
  );
}


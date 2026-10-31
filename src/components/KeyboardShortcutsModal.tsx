"use client";

import React from "react";
import { ModalShell } from "./ModalShell";
import { Keyboard, Sparkles } from "lucide-react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  badge?: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  const groups: ShortcutGroup[] = [
    {
      title: "Answering Questions",
      items: [
        {
          keys: ["A", "B", "C", "D"],
          description: "Select Option A, B, C, or D",
        },
        {
          keys: ["T"],
          description:
            "Focus Cloze answer field (Cloze questions only • Esc to exit)",
        },
        { keys: ["Backspace"], description: "Clear selected answer" },
      ],
    },
    {
      title: "Navigation & Scratchpad",
      items: [
        { keys: ["←", "J"], description: "Previous question (backward)" },
        { keys: ["→", "K"], description: "Next question (forward)" },
        {
          keys: ["S"],
          description: "Toggle focus on rough Scratchpad (Esc to exit)",
        },
      ],
    },
    {
      title: "Confidence & Review Tagging",
      items: [
        { keys: ["1"], description: "Tag as 🎯 Sure confidence" },
        { keys: ["2"], description: "Tag as ⚖️ 50:50 elimination" },
        { keys: ["3"], description: "Tag as ✂️ Elimination guess" },
        { keys: ["4"], description: "Tag as 🎲 Blind guess" },
        { keys: ["F"], description: "Toggle review Flag (🚩)" },
      ],
    },
    {
      title: "Help & Shortcuts",
      items: [
        { keys: ["?", "H"], description: "Toggle keyboard shortcuts guide" },
        { keys: ["Esc"], description: "Close dialogs" },
      ],
    },
  ];

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="keyboard-shortcuts-title"
      describedBy="keyboard-shortcuts-desc"
      className="max-w-lg p-0"
    >
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <Keyboard className="h-5 w-5" />
        </div>
        <div>
          <h2
            id="keyboard-shortcuts-title"
            className="text-base font-bold text-slate-900"
          >
            Keyboard Shortcuts
          </h2>
          <p id="keyboard-shortcuts-desc" className="text-xs text-slate-500">
            Speed up your practice without lifting your hands from the keys.
          </p>
        </div>
      </div>

      <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              {group.title}
            </h3>
            <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-2">
              {group.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-2xs"
                >
                  <span className="flex items-center gap-1.5 text-slate-700">
                    {item.description}
                    {item.badge && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[9px] font-semibold text-blue-700">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((k, kIdx) => (
                      <React.Fragment key={kIdx}>
                        {kIdx > 0 && (
                          <span className="text-[10px] text-slate-400">or</span>
                        )}
                        <kbd className="min-w-6 rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-center font-mono text-[11px] font-bold text-slate-800 shadow-2xs">
                          {k}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Shortcuts are
          automatically paused when writing notes.
        </span>
        <button
          type="button"
          onClick={onClose}
          className="button-primary text-xs"
        >
          Got it
        </button>
      </div>
    </ModalShell>
  );
}

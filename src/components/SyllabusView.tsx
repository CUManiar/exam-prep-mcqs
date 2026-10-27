"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ChevronRight,
  FileText,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { SyllabusItem } from "../lib/types";
import { useApp } from "../context/AppContext";
import {
  getSyllabusCompletion,
  getSyllabusItemDateStatus,
  getSyllabusPace,
  getSyllabusProgress,
} from "../lib/syllabusMarkdown";
import { PageHeader } from "./PageHeader";

const SAMPLE_MARKDOWN = `# GS Paper 1
## History [30 Nov 2026]
- Ancient India
  - Indus Valley Civilization [20 Nov 2026]
  - Vedic Age
- Medieval India
## Polity
- Constitution
  - Fundamental Rights`;

const paceLabels = {
  leading: "Leading",
  "on-track": "On track",
  lagging: "Lagging",
  "no-date": "No dates yet",
} as const;

const paceStyles = {
  leading: "border-emerald-200 bg-emerald-50 text-emerald-800",
  "on-track": "border-blue-200 bg-blue-50 text-blue-800",
  lagging: "border-amber-200 bg-amber-50 text-amber-900",
  "no-date": "border-slate-200 bg-slate-50 text-slate-600",
} as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function SyllabusView() {
  const {
    syllabusItems,
    syllabusMarkdown,
    handleImportSyllabusMarkdown,
    handleClearSyllabus,
    handleToggleSyllabusItem,
  } = useApp();
  const [draft, setDraft] = useState(syllabusMarkdown);
  const [isEditing, setIsEditing] = useState(!syllabusMarkdown.trim());
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const activeItems = syllabusMarkdown.trim() ? syllabusItems : [];
  const progress = getSyllabusProgress(activeItems);
  const pace = getSyllabusPace(activeItems);

  useEffect(() => {
    setDraft(syllabusMarkdown);
    if (!syllabusMarkdown.trim()) setIsEditing(true);
  }, [syllabusMarkdown]);

  const childrenByParent = useMemo(() => {
    const result = new Map<string | null | undefined, SyllabusItem[]>();
    activeItems.forEach((item) => {
      result.set(item.parentId, [...(result.get(item.parentId) || []), item]);
    });
    result.forEach((items) => items.sort((a, b) => a.order - b.order));
    return result;
  }, [activeItems]);

  const showMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(""), 2200);
  };

  const importMarkdown = async () => {
    if (!draft.trim()) {
      showMessage("Paste a Markdown outline first.");
      return;
    }
    await handleImportSyllabusMarkdown(draft);
    setIsEditing(false);
    showMessage("Markdown tree saved.");
  };

  const toggleCollapsed = (itemId: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const renderTree = (items: SyllabusItem[], depth = 0): ReactNode =>
    items.map((item) => {
      const children = childrenByParent.get(item.id) || [];
      const completed = getSyllabusCompletion(item, activeItems);
      const dateStatus = getSyllabusItemDateStatus(item, activeItems);
      const isParent = children.length > 0;
      const isCollapsed = collapsedIds.has(item.id);
      return (
        <div
          key={item.id}
          className={depth ? "ml-4 border-l border-slate-200 pl-3" : ""}
        >
          <div className="flex items-start gap-2 py-1.5">
            <input
              type="checkbox"
              checked={completed}
              onChange={() => void handleToggleSyllabusItem(item.id)}
              aria-label={`${completed ? "Mark incomplete" : "Mark complete"}: ${item.title}`}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600"
            />
            {isParent && (
              <button
                type="button"
                onClick={() => toggleCollapsed(item.id)}
                aria-label={
                  isCollapsed
                    ? `Expand ${item.title}`
                    : `Collapse ${item.title}`
                }
                aria-expanded={!isCollapsed}
                className="-ml-1 mt-0.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <ChevronRight
                  className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p
                  className={`text-sm ${completed ? "text-slate-400 line-through" : "text-slate-800"}`}
                >
                  {item.title}
                </p>
                {item.dueDate && (
                  <span className="text-xs text-slate-400">
                    due {formatDate(item.dueDate)}
                  </span>
                )}
                {dateStatus === "lagging" && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                    <AlertTriangle className="h-3 w-3" /> lagging
                  </span>
                )}
              </div>
            </div>
          </div>
          {children.length > 0 &&
            !isCollapsed &&
            renderTree(children, depth + 1)}
        </div>
      );
    });

  const hasSavedSyllabus = Boolean(syllabusMarkdown.trim());
  const datedSummary = pace.datedTopics
    ? `${pace.completedTopics} of ${pace.datedTopics} dated topics complete${pace.overdueTopics ? ` · ${pace.overdueTopics} overdue` : ""}`
    : "Add dates in square brackets to compare your pace.";

  return (
    <div className="page-container space-y-6">
      <PageHeader
        eyebrow="Markdown-powered study tree"
        title="Custom syllabus tracker"
        description="Paste a Markdown outline. Dates in square brackets set due dates; missing child dates inherit the nearest parent date."
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] md:items-start">
        <section className="surface-card order-1 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Syllabus tree
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Check a chapter to complete all of its leaf topics, or check
                topics individually.
              </p>
            </div>
            {message && !isEditing && (
              <span className="text-sm text-emerald-700">{message}</span>
            )}
          </div>
          <div className="mt-3">
            {activeItems.length > 0 ? (
              renderTree(childrenByParent.get(null) || [])
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                Paste a Markdown outline above to create your tracker.
              </div>
            )}
          </div>
        </section>

        <aside className="order-2 space-y-4 md:sticky md:top-4">
          <section className="surface-card flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div
                className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#2563eb ${progress.percentage}%, #e2e8f0 0)`,
                }}
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-xs font-semibold text-slate-900">
                  {progress.percentage}%
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  Study status
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {datedSummary}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {progress.completed} / {progress.total} leaf topics
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${paceStyles[pace.status]}`}
            >
              {paceLabels[pace.status]}
            </span>
          </section>

          {isEditing || !hasSavedSyllabus ? (
            <section className="surface-card space-y-3 p-4">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 text-blue-700" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Paste your .md syllabus
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Example: <code>## History [30 Nov 2026]</code>
                  </p>
                </div>
              </div>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Paste Markdown here..."
                className="min-h-64 w-full rounded-lg border border-slate-200 bg-slate-950 px-3 py-2 font-mono text-xs leading-5 text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                spellCheck={false}
              />
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(SAMPLE_MARKDOWN)}
                  className="button-secondary w-full justify-center"
                >
                  <FileText className="h-4 w-4" /> Use sample template
                </button>
                <button
                  type="button"
                  onClick={() => void importMarkdown()}
                  className="button-primary w-full justify-center"
                >
                  <FileText className="h-4 w-4" /> Save Markdown tree
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(syllabusMarkdown)}
                  className="button-secondary w-full justify-center"
                >
                  <RotateCcw className="h-4 w-4" /> Reset editor
                </button>
                {hasSavedSyllabus && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="button-secondary w-full justify-center"
                  >
                    Cancel
                  </button>
                )}
                {message && (
                  <span className="text-xs text-emerald-700">{message}</span>
                )}
              </div>
            </section>
          ) : (
            <section className="surface-card space-y-3 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Syllabus source saved
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {activeItems.length} topics tracked from your Markdown.
                </p>
              </div>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="button-secondary w-full justify-center"
                >
                  <Pencil className="h-4 w-4" /> Edit Markdown
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    void handleClearSyllabus();
                  }}
                  className="button-secondary w-full justify-center text-rose-700"
                >
                  <Trash2 className="h-4 w-4" /> Clear tracker
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

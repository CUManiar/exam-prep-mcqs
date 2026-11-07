"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleDashed,
  Download,
  ExternalLink,
  FileText,
  Layers3,
  Pencil,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { SyllabusItem } from "../lib/types";
import { useApp } from "../context/AppContext";
import {
  getSyllabusCompletion,
  getEffectiveSyllabusDueDate,
  getSyllabusItemDateStatus,
  getSyllabusPace,
  getSyllabusProgress,
} from "../lib/syllabusMarkdown";
import {
  exportSyllabusAsPDF,
  exportSyllabusAsPrintPDF,
} from "../lib/exportUtils";
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

const dateStatusStyles = {
  leading: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "on-track": "border-blue-200 bg-blue-50 text-blue-700",
  lagging: "border-amber-200 bg-amber-50 text-amber-800",
  "no-date": "border-slate-200 bg-slate-50 text-slate-500",
} as const;

const dateStatusLabels = {
  leading: "Ahead of pace",
  "on-track": "On pace",
  lagging: "Needs attention",
  "no-date": "No due date",
} as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function highlightMatch(title: string, query: string): ReactNode {
  if (!query.trim()) return title;
  const q = query.trim().toLowerCase();
  const lower = title.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return title;

  const before = title.slice(0, idx);
  const match = title.slice(idx, idx + q.length);
  const after = title.slice(idx + q.length);

  return (
    <>
      {before}
      <mark className="rounded bg-amber-100 text-amber-950 font-semibold px-0.5 not-italic">
        {match}
      </mark>
      {highlightMatch(after, query)}
    </>
  );
}

export function SyllabusView() {
  const {
    syllabusItems,
    syllabusMarkdown,
    handleImportSyllabusMarkdown,
    handleClearSyllabus,
    handleToggleSyllabusItem,
  } = useApp();
  const activeItems = syllabusMarkdown.trim() ? syllabusItems : [];
  const [draft, setDraft] = useState(syllabusMarkdown);
  const [isEditing, setIsEditing] = useState(!syllabusMarkdown.trim());
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () =>
      new Set(
        activeItems
          .filter((item) =>
            activeItems.some((candidate) => candidate.parentId === item.id),
          )
          .map((item) => item.id),
      ),
  );
  const [message, setMessage] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const progress = getSyllabusProgress(activeItems);
  const pace = getSyllabusPace(activeItems);
  const remainingTopics = Math.max(progress.total - progress.completed, 0);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const itemBreadcrumbMap = useMemo(() => {
    const itemMap = new Map<string, SyllabusItem>();
    activeItems.forEach((it) => itemMap.set(it.id, it));

    const trailMap = new Map<string, { id: string; title: string }[]>();
    activeItems.forEach((it) => {
      const parts: { id: string; title: string }[] = [];
      let curr = it.parentId ? itemMap.get(it.parentId) : undefined;
      while (curr) {
        parts.unshift({ id: curr.id, title: curr.title });
        curr = curr.parentId ? itemMap.get(curr.parentId) : undefined;
      }
      trailMap.set(it.id, parts);
    });
    return trailMap;
  }, [activeItems]);

  const expandAndScrollToItem = (itemId: string, clearSearch = true) => {
    if (clearSearch) {
      setSearchQuery("");
    }

    const parentMap = new Map<string, string>();
    activeItems.forEach((it) => {
      if (it.parentId) parentMap.set(it.id, it.parentId);
    });

    const toExpand = new Set<string>();
    toExpand.add(itemId);

    let curr = parentMap.get(itemId);
    while (curr) {
      toExpand.add(curr);
      curr = parentMap.get(curr);
    }

    setCollapsedIds((prev) => {
      const next = new Set(prev);
      toExpand.forEach((id) => next.delete(id));
      return next;
    });

    setHighlightedId(itemId);

    setTimeout(() => {
      const el = document.getElementById(`syllabus-item-${itemId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 60);

    setTimeout(() => {
      setHighlightedId((curr) => (curr === itemId ? null : curr));
    }, 2400);
  };

  const directMatchIds = useMemo(() => {
    if (!normalizedQuery) return new Set<string>();
    const matches = new Set<string>();
    activeItems.forEach((item) => {
      if (item.title.toLowerCase().includes(normalizedQuery)) {
        matches.add(item.id);
      }
    });
    return matches;
  }, [activeItems, normalizedQuery]);

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

  const parentIds = useMemo(
    () =>
      activeItems
        .filter((item) =>
          activeItems.some((candidate) => candidate.parentId === item.id),
        )
        .map((item) => item.id)
        .sort(),
    [activeItems],
  );
  const parentIdsKey = parentIds.join("|");

  useEffect(() => {
    setCollapsedIds(new Set(parentIds));
  }, [parentIdsKey, syllabusMarkdown]);

  const [forceVisibleIds, setForceVisibleIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    setForceVisibleIds(new Set());
  }, [normalizedQuery]);

  // Set of item IDs to show in tree (item itself matches, or any descendant matches, or unhidden via click)
  const visibleItemIds = useMemo(() => {
    if (!normalizedQuery) return null; // null means show all
    const visible = new Set<string>();

    const checkItem = (item: SyllabusItem): boolean => {
      const children = childrenByParent.get(item.id) || [];
      const hasChildMatch = children.some((child) => checkItem(child));
      const isDirectMatch = directMatchIds.has(item.id);
      const isForced = forceVisibleIds.has(item.id);
      if (isDirectMatch || hasChildMatch || isForced) {
        visible.add(item.id);
        return true;
      }
      return false;
    };

    activeItems.forEach((item) => {
      if (!item.parentId) {
        checkItem(item);
      }
    });

    const addDescendants = (pId: string) => {
      const ch = childrenByParent.get(pId) || [];
      ch.forEach((c) => {
        visible.add(c.id);
        addDescendants(c.id);
      });
    };
    forceVisibleIds.forEach((id) => {
      visible.add(id);
      addDescendants(id);
    });

    return visible;
  }, [
    activeItems,
    childrenByParent,
    directMatchIds,
    forceVisibleIds,
    normalizedQuery,
  ]);

  // When search query changes, automatically expand all parent nodes of matching items
  useEffect(() => {
    if (!normalizedQuery) return;
    const parentMap = new Map<string, string>();
    activeItems.forEach((it) => {
      if (it.parentId) parentMap.set(it.id, it.parentId);
    });

    const toExpand = new Set<string>();
    directMatchIds.forEach((id) => {
      let curr = parentMap.get(id);
      while (curr) {
        toExpand.add(curr);
        curr = parentMap.get(curr);
      }
    });

    setCollapsedIds((prev) => {
      const next = new Set(prev);
      toExpand.forEach((pId) => next.delete(pId));
      return next;
    });
  }, [normalizedQuery, directMatchIds, activeItems]);

  // Deep-link navigation via URL query params (?section=... or ?topic=...) or hash (#...)
  useEffect(() => {
    if (typeof window === "undefined" || !activeItems.length) return;
    const url = new URL(window.location.href);
    const targetSection =
      url.searchParams.get("section") ||
      url.searchParams.get("topic") ||
      url.searchParams.get("item");
    const targetQuery =
      url.searchParams.get("q") || url.searchParams.get("search");
    const hash = window.location.hash.replace("#", "");

    if (targetQuery && !searchQuery) {
      setSearchQuery(targetQuery);
    }

    const targetId = targetSection || hash;
    if (targetId) {
      const decoded = decodeURIComponent(targetId).toLowerCase();
      const matched = activeItems.find(
        (it) =>
          it.id === targetId ||
          it.id === targetId.replace(/^syllabus-item-/, "") ||
          it.title.toLowerCase() === decoded,
      );
      if (matched) {
        expandAndScrollToItem(matched.id, false);
      }
    }
  }, [activeItems]);

  const showMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(""), 2200);
  };

  const handleExportPDF = (
    action: "download" | "open" | "print" = "download",
  ) => {
    if (!activeItems.length) {
      showMessage("Add syllabus topics first to export.");
      return;
    }
    setIsExporting(true);
    try {
      exportSyllabusAsPDF(activeItems, {
        markdown: syllabusMarkdown,
        action,
      });
      if (action === "download") {
        showMessage("Syllabus PDF downloaded.");
      } else if (action === "open") {
        showMessage("Opening PDF in new tab...");
      } else if (action === "print") {
        showMessage("Opening print view...");
      }
    } catch (err) {
      console.error("Failed to export syllabus PDF:", err);
      showMessage("Could not export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
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

  const hasCompletedDescendant = (item: SyllabusItem): boolean => {
    const children = childrenByParent.get(item.id) || [];
    return children.some(
      (child) =>
        getSyllabusCompletion(child, activeItems) ||
        hasCompletedDescendant(child),
    );
  };

  const handleRowClick = (item: SyllabusItem) => {
    const isParent = (childrenByParent.get(item.id) || []).length > 0;
    const parentId = item.parentId;

    // Sibling items that share the same parentId (if inside a parent section)
    const siblings = parentId
      ? activeItems.filter((candidate) => candidate.parentId === parentId)
      : [];

    // Direct children of this item
    const itemChildren = childrenByParent.get(item.id) || [];

    // If search is active, unhide the clicked item, its parent, its siblings, and their children
    if (normalizedQuery) {
      setForceVisibleIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        if (parentId) next.add(parentId);
        siblings.forEach((s) => {
          next.add(s.id);
          const sCh = childrenByParent.get(s.id) || [];
          sCh.forEach((c) => next.add(c.id));
        });
        itemChildren.forEach((c) => next.add(c.id));
        return next;
      });
    }

    setCollapsedIds((prev) => {
      const next = new Set(prev);
      const isCurrentlyCollapsed = next.has(item.id);

      if (isCurrentlyCollapsed || !isParent) {
        // Expand the clicked item itself
        if (isParent) next.delete(item.id);

        // Ensure parent is expanded
        if (parentId) next.delete(parentId);

        // Expand all siblings under the same parent
        siblings.forEach((s) => {
          const sHasChildren = (childrenByParent.get(s.id) || []).length > 0;
          if (sHasChildren) {
            next.delete(s.id);
          }
        });

        // Also expand any child sections
        itemChildren.forEach((c) => {
          const cHasChildren = (childrenByParent.get(c.id) || []).length > 0;
          if (cHasChildren) {
            next.delete(c.id);
          }
        });
      } else {
        // If clicking an already expanded parent row, collapse it
        next.add(item.id);
      }

      return next;
    });

    setHighlightedId(item.id);
    setTimeout(() => {
      setHighlightedId((curr) => (curr === item.id ? null : curr));
    }, 2000);
  };

  const renderTree = (items: SyllabusItem[], depth = 0): ReactNode => {
    const filteredItems = visibleItemIds
      ? items.filter((item) => visibleItemIds.has(item.id))
      : items;

    if (items.length > 0 && filteredItems.length === 0 && depth === 0) {
      return (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-center space-y-2">
          <Search className="mx-auto h-7 w-7 text-slate-300" />
          <p className="text-sm font-semibold text-slate-800">
            No topics match &quot;{searchQuery}&quot;
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try a different term or clear the search to view all sections.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear search</span>
          </button>
        </div>
      );
    }

    return filteredItems.map((item) => {
      const children = childrenByParent.get(item.id) || [];
      const visibleChildren = visibleItemIds
        ? children.filter((child) => visibleItemIds.has(child.id))
        : children;
      const completed = getSyllabusCompletion(item, activeItems);
      const dateStatus = getSyllabusItemDateStatus(item, activeItems);
      const effectiveDueDate = getEffectiveSyllabusDueDate(item, activeItems);
      const isParent = children.length > 0;
      const partiallyCompleted =
        isParent && !completed && hasCompletedDescendant(item);
      const isCollapsed = collapsedIds.has(item.id);
      const breadcrumbs = itemBreadcrumbMap.get(item.id) || [];

      return (
        <div
          key={item.id}
          id={`syllabus-item-${item.id}`}
          className={`transition-all duration-200 ${
            depth ? "ml-3 border-l-2 border-blue-100 pl-3" : ""
          }`}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest("label, input, button, a")) return;
              handleRowClick(item);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                const target = e.target as HTMLElement;
                if (target.closest("label, input, button, a")) return;
                e.preventDefault();
                handleRowClick(item);
              }
            }}
            className={`group rounded-xl border p-3 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              highlightedId === item.id
                ? "ring-2 ring-blue-500 border-blue-400 bg-blue-50/60 shadow-sm"
                : completed
                  ? "border-emerald-200 bg-emerald-50/45 hover:border-emerald-300"
                  : "border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <label
                onClick={(e) => e.stopPropagation()}
                className="mt-1 grid h-4 w-4 shrink-0 cursor-pointer place-items-center"
              >
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={() => void handleToggleSyllabusItem(item.id)}
                  aria-label={`${completed ? "Mark incomplete" : partiallyCompleted ? "Complete all" : "Mark complete"}: ${item.title}`}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`grid h-4 w-4 place-items-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-200 ${
                    completed
                      ? "border-blue-600 bg-blue-600 text-white"
                      : partiallyCompleted
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-300 bg-white group-hover:border-blue-400"
                  }`}
                >
                  {completed && <Check className="h-3 w-3" strokeWidth={3} />}
                  {partiallyCompleted && (
                    <span className="h-1.5 w-1.5 rounded-sm bg-blue-600" />
                  )}
                </span>
              </label>
              {isParent && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapsed(item.id);
                  }}
                  aria-label={
                    isCollapsed
                      ? `Expand ${item.title}`
                      : `Collapse ${item.title}`
                  }
                  aria-expanded={!isCollapsed}
                  className="-ml-1 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                  />
                </button>
              )}
              {!isParent && (
                <span className="h-6 w-6 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                {normalizedQuery && breadcrumbs.length > 0 && (
                  <nav
                    aria-label="Topic hierarchy"
                    className="mb-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-400"
                  >
                    {breadcrumbs.map((crumb, idx) => (
                      <span
                        key={crumb.id}
                        className="inline-flex items-center gap-1"
                      >
                        {idx > 0 && <span className="text-slate-300">›</span>}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const crumbItem = activeItems.find(
                              (it) => it.id === crumb.id,
                            );
                            if (crumbItem) {
                              handleRowClick(crumbItem);
                            }
                          }}
                          className="font-medium text-slate-500 transition-colors hover:text-blue-600 hover:underline cursor-pointer"
                          title={`Click to expand ${crumb.title}`}
                        >
                          {crumb.title}
                        </button>
                      </span>
                    ))}
                  </nav>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm font-medium ${
                      completed
                        ? "text-slate-400 line-through"
                        : "text-slate-800 group-hover:text-blue-900"
                    }`}
                  >
                    {highlightMatch(item.title, searchQuery)}
                  </p>
                  {isParent && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {children.length}{" "}
                      {children.length === 1 ? "subtopic" : "subtopics"}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    {effectiveDueDate ? (
                      <>
                        <CalendarDays className="h-3 w-3" />
                        due {formatDate(effectiveDueDate)}
                        {!item.dueDate && " · inherited"}
                      </>
                    ) : (
                      <>
                        <CircleDashed className="h-3 w-3" />
                        No due date
                      </>
                    )}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${dateStatusStyles[dateStatus]}`}
                  >
                    {dateStatus === "lagging" && (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {dateStatus === "leading" && (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    {dateStatusLabels[dateStatus]}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {children.length > 0 && !isCollapsed && (
            <div className="mt-2 space-y-2">
              {renderTree(children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const hasSavedSyllabus = Boolean(syllabusMarkdown.trim());
  const rootItems = childrenByParent.get(null) || [];
  const datedSummary = pace.datedTopics
    ? `${pace.completedTopics} of ${pace.datedTopics} dated topics complete${pace.overdueTopics ? ` · ${pace.overdueTopics} overdue` : ""}`
    : "Add dates in square brackets to compare your pace.";

  return (
    <div className="page-container space-y-5">
      <PageHeader
        title="Syllabus tracker"
        description={
          activeItems.length > 0
            ? `${progress.percentage}% complete · ${progress.completed} of ${progress.total} topics done · ${remainingTopics} topics left`
            : "Track UPSC syllabus completion topic by topic."
        }
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] md:items-start">
        <section className="surface-card order-1 overflow-hidden p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Syllabus tree
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {rootItems.length} sections · {progress.total} leaf topics ·
                check off what you finish
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setCollapsedIds(new Set())}
                  disabled={!parentIds.length}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-white hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Expand every syllabus section"
                >
                  <ChevronsDownUp className="h-3.5 w-3.5" />
                  <span>Expand full</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsedIds(new Set(parentIds))}
                  disabled={!parentIds.length}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-white hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Collapse every syllabus section"
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                  <span>Collapse full</span>
                </button>
              </div>

              {/* Export PDF Split Button & Dropdown */}
              <div className="relative inline-block text-left">
                <div className="inline-flex rounded-lg border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => handleExportPDF("download")}
                    disabled={!activeItems.length || isExporting}
                    className="inline-flex items-center gap-1.5 rounded-l-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-blue-50/50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    title={
                      activeItems.length
                        ? "Export and download syllabus as PDF"
                        : "Add syllabus outline to export"
                    }
                  >
                    <Download className="h-3.5 w-3.5 text-blue-600" />
                    <span>{isExporting ? "Exporting..." : "Export PDF"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExportMenu((v) => !v)}
                    disabled={!activeItems.length || isExporting}
                    className="inline-flex items-center rounded-r-lg border-l border-slate-200 px-1.5 py-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="More export options"
                    aria-expanded={showExportMenu}
                  >
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${showExportMenu ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {showExportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div className="absolute right-0 z-50 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          handleExportPDF("download");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Download className="h-4 w-4 text-blue-600 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900">
                            Download PDF file
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Save vector PDF to your device
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          handleExportPDF("open");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4 text-slate-500 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900">
                            Open PDF in new tab
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Preview PDF in browser viewer
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          exportSyllabusAsPrintPDF(activeItems, {
                            markdown: syllabusMarkdown,
                          });
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Printer className="h-4 w-4 text-slate-500 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900">
                            Print / Browser PDF
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Open system print dialog
                          </div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {message && !isEditing && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {message}
                </span>
              )}
            </div>
          </div>

          {/* Real-time Syllabus Search & Filter Bar */}
          {activeItems.length > 0 && (
            <div className="pt-3">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search topics to mark tick or review (e.g. Fundamental Rights, Indus Valley, Monsoon)..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-24 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                />
                <div className="absolute right-2.5 flex items-center gap-1.5">
                  {searchQuery && (
                    <>
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        {directMatchIds.size}{" "}
                        {directMatchIds.size === 1 ? "match" : "matches"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {activeItems.length > 0 ? (
              renderTree(rootItems)
            ) : (
              <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/45 px-5 py-12 text-center">
                <BookOpenCheck className="mx-auto h-8 w-8 text-blue-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Your study tree is waiting for its first chapter.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Paste a Markdown outline in the editor to create your tracker.
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="order-2 space-y-4 md:sticky md:top-4">
          <section className="surface-card overflow-hidden">
            <div className="flex items-center justify-between gap-4 bg-slate-50/80 p-4">
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
            </div>
            <div className="grid grid-cols-3 divide-x border-t border-slate-100 bg-white">
              <div className="px-3 py-3 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  {progress.completed}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                  Done
                </p>
              </div>
              <div className="px-3 py-3 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  {remainingTopics}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                  Remaining
                </p>
              </div>
              <div className="px-3 py-3 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  {pace.datedTopics}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                  Dated
                </p>
              </div>
            </div>
          </section>

          {isEditing || !hasSavedSyllabus ? (
            <section className="surface-card overflow-hidden">
              <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/80 p-4">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-700">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Markdown source
                    </h2>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                      Editor
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Use headings, bullets, and dates like{" "}
                    <code>[30 Nov 2026]</code>.
                  </p>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Paste Markdown here..."
                  className="min-h-64 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 font-mono text-xs leading-5 text-slate-100 shadow-inner outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              </div>
            </section>
          ) : (
            <section className="surface-card overflow-hidden">
              <div className="flex items-start gap-3 border-b border-slate-100 bg-emerald-50/55 p-4">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Syllabus source saved
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {activeItems.length} topics tracked from your Markdown.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 p-4">
                <button
                  type="button"
                  onClick={() => handleExportPDF("download")}
                  disabled={!activeItems.length || isExporting}
                  className="button-primary w-full justify-center"
                >
                  <Download className="h-4 w-4" /> Export syllabus as PDF
                </button>
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

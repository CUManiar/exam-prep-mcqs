"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { CutoffType, QuestionPaper, Attempt } from "../lib/types";
import {
  SUPPORTED_YEARS,
  hasAnswerKey,
  hasSolution,
  parseAnswerKeyText,
  parseAnswerKeyDetailed,
  isPaperFree,
  isUserUploadedPaper,
  getPaperDisplayTitle,
  getPaperDownloadFilename,
  getAttemptPercentage,
  getPaperCutoffStatus,
} from "../lib/defaults";
import { attachToPaperOnServer } from "../lib/storage";
import { exportQuestionPaperAsPDF } from "../lib/exportUtils";
import { DetailedSolutionModal } from "./DetailedSolutionModal";
import { useApp } from "../context/AppContext";
import { PageHeader } from "./PageHeader";
import {
  BookOpen,
  Search,
  ExternalLink,
  Play,
  Clock,
  FileText,
  Plus,
  Key,
  AlertCircle,
  CheckCircle2,
  FileUp,
  X,
  AlertTriangle,
  Upload,
  Trash2,
  Settings2,
  ChevronRight,
  Lock,
  Grid2X2,
  List,
} from "lucide-react";

interface PapersViewProps {
  papers: QuestionPaper[];
  onStartExam: (paper: QuestionPaper, mode: "practice" | "mock") => void;
  onNavigateUpload: () => void;
  onDeletePaper?: (paperId: string) => void;
  onUpdatePaper?: (paper: QuestionPaper) => void;
}

const PAPERS_FILTER_STORAGE_KEY = "upsc_papers_filter_state";

interface PapersFilterState {
  searchQuery?: string;
  selectedCategory?: "all" | "prelims" | "mains" | "custom";
  selectedSource?: "all" | "custom" | "predefined";
  selectedYear?: string;
  selectedAttemptFilter?:
    "all" | "attempted" | "unattempted" | "mock" | "practice";
  paperViewMode?: "grid" | "list";
}

function getStoredPapersFilter(): PapersFilterState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PAPERS_FILTER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function PapersView({
  papers,
  onStartExam,
  onNavigateUpload,
  onDeletePaper,
  onUpdatePaper,
}: PapersViewProps) {
  const { isPro, openProUpgradeModal, attempts = [] } = useApp();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "prelims" | "mains"
  >("all");
  const [selectedSource, setSelectedSource] = useState<
    "all" | "custom" | "predefined"
  >("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedAttemptFilter, setSelectedAttemptFilter] = useState<
    "all" | "attempted" | "unattempted" | "mock" | "practice"
  >("all");
  const [paperViewMode, setPaperViewMode] = useState<"grid" | "list">("grid");
  const [mounted, setMounted] = useState(false);
  const [viewingSolutionPaper, setViewingSolutionPaper] =
    useState<QuestionPaper | null>(null);

  // Restore filter state from localStorage on mount (hydration-safe)
  useEffect(() => {
    setMounted(true);
    const saved = getStoredPapersFilter();
    if (typeof saved.searchQuery === "string" && saved.searchQuery) {
      setSearchQuery(saved.searchQuery);
    }
    const tab = searchParams?.get("tab");
    if (tab === "custom") {
      setSelectedSource("custom");
    } else if (
      saved.selectedCategory &&
      ["all", "prelims", "mains"].includes(saved.selectedCategory)
    ) {
      setSelectedCategory(saved.selectedCategory as "all" | "prelims" | "mains");
    }
    if (
      saved.selectedSource &&
      ["all", "custom", "predefined"].includes(saved.selectedSource)
    ) {
      setSelectedSource(saved.selectedSource as "all" | "custom" | "predefined");
    }
    if (
      typeof saved.selectedYear === "string" &&
      saved.selectedYear !== "all"
    ) {
      setSelectedYear(saved.selectedYear);
    }
    if (
      saved.selectedAttemptFilter &&
      ["all", "attempted", "unattempted", "mock", "practice"].includes(
        saved.selectedAttemptFilter,
      ) &&
      saved.selectedAttemptFilter !== "all"
    ) {
      setSelectedAttemptFilter(saved.selectedAttemptFilter);
    }
    if (saved.paperViewMode === "list" || saved.paperViewMode === "grid") {
      setPaperViewMode(saved.paperViewMode);
    }
  }, [searchParams]);

  // Persist filter state across page reloads / app switches
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(
        PAPERS_FILTER_STORAGE_KEY,
        JSON.stringify({
          searchQuery,
          selectedCategory,
          selectedSource,
          selectedYear,
          selectedAttemptFilter,
          paperViewMode,
        }),
      );
    } catch {}
  }, [
    mounted,
    searchQuery,
    selectedCategory,
    selectedSource,
    selectedYear,
    selectedAttemptFilter,
    paperViewMode,
  ]);

  // Edit paper rules modal
  const [editingPaper, setEditingPaper] = useState<QuestionPaper | null>(null);
  const [editTotalQuestions, setEditTotalQuestions] = useState<number>(100);
  const [editTotalMarks, setEditTotalMarks] = useState<number>(200);
  const [editCorrectMarks, setEditCorrectMarks] = useState<number>(2.0);
  const [editIncorrectMarks, setEditIncorrectMarks] = useState<number>(0.667);
  const [editTimeMinutes, setEditTimeMinutes] = useState<number>(120);
  const [editCutoffEnabled, setEditCutoffEnabled] = useState(false);
  const [editCutoffType, setEditCutoffType] =
    useState<CutoffType>("percentage");
  const [editCutoffValue, setEditCutoffValue] = useState<number | "">("");

  // Dedicated Attach Modal (supports opening directly to 'key' or 'solution')
  const [attachingPaper, setAttachingPaper] = useState<QuestionPaper | null>(
    null,
  );
  const [modalActiveTab, setModalActiveTab] = useState<"key" | "solution">(
    "key",
  );
  const [attachAkMode, setAttachAkMode] = useState<"paste" | "upload">("paste");
  const [attachAkText, setAttachAkText] = useState<string>("");
  const [attachAkFile, setAttachAkFile] = useState<File | null>(null);
  const [attachExsFile, setAttachExsFile] = useState<File | null>(null);
  const [attachPromptReason, setAttachPromptReason] = useState<string | null>(
    null,
  );
  const [isSubmittingAttach, setIsSubmittingAttach] = useState<boolean>(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  const handleOpenEdit = (p: QuestionPaper) => {
    setEditingPaper(p);
    setEditTotalQuestions(p.totalQuestions);
    setEditTotalMarks(p.totalMarks);
    setEditCorrectMarks(p.correctMarks);
    setEditIncorrectMarks(p.incorrectMarks);
    setEditTimeMinutes(p.timeMinutes);
    setEditCutoffEnabled(Boolean(p.cutoffEnabled));
    setEditCutoffType(p.cutoffType || "percentage");
    setEditCutoffValue(
      typeof p.cutoffValue === "number" && Number.isFinite(p.cutoffValue)
        ? p.cutoffValue
        : "",
    );
  };

  const handleSaveEdit = () => {
    if (!editingPaper || !onUpdatePaper) return;
    const updated: QuestionPaper = {
      ...editingPaper,
      totalQuestions: editTotalQuestions,
      totalMarks: editTotalMarks,
      correctMarks: editCorrectMarks,
      incorrectMarks: editIncorrectMarks,
      timeMinutes: editTimeMinutes,
      cutoffEnabled: editCutoffEnabled,
      cutoffType: editCutoffType,
      cutoffValue:
        editCutoffEnabled && editCutoffValue !== ""
          ? Number(editCutoffValue)
          : undefined,
    };
    onUpdatePaper(updated);
    setEditingPaper(null);
  };

  const handleOpenAttachModal = (
    paper: QuestionPaper,
    tab: "key" | "solution" = "key",
    practicePrompt = false,
  ) => {
    setAttachingPaper(paper);
    setModalActiveTab(tab);
    setAttachAkText(paper.answerKeyText || "");
    setAttachAkFile(null);
    setAttachExsFile(null);
    setAttachError(null);
    setAttachPromptReason(
      practicePrompt
        ? "Practice mode requires an answer key so you can see if choices are correct or wrong immediately. Attach an answer key below to unlock practice."
        : null,
    );
  };

  const handleSaveAttachment = async () => {
    if (!attachingPaper) return;
    setIsSubmittingAttach(true);
    setAttachError(null);

    try {
      const formData = new FormData();
      if (modalActiveTab === "key") {
        if (attachAkMode === "paste" && attachAkText.trim()) {
          formData.append("answerKeyText", attachAkText.trim());
        } else if (attachAkMode === "upload" && attachAkFile) {
          formData.append("akFile", attachAkFile);
        }
      } else {
        if (attachExsFile) {
          formData.append("exsFile", attachExsFile);
        }
      }

      // Also attach both if both provided
      if (modalActiveTab === "solution" && attachAkText.trim()) {
        formData.append("answerKeyText", attachAkText.trim());
      } else if (modalActiveTab === "key" && attachExsFile) {
        formData.append("exsFile", attachExsFile);
      }

      const updated = await attachToPaperOnServer(attachingPaper.id, formData);
      if (updated) {
        if (onUpdatePaper) onUpdatePaper(updated);
        setAttachingPaper(null);
      } else {
        setAttachError(
          "Failed to save attachment to server. Please verify files and try again.",
        );
      }
    } catch (err: any) {
      setAttachError(err?.message || "Failed to save attachment.");
    } finally {
      setIsSubmittingAttach(false);
    }
  };

  const customPapersCount = useMemo(
    () => papers.filter(isUserUploadedPaper).length,
    [papers],
  );
  const predefinedPapersCount = useMemo(
    () => papers.length - customPapersCount,
    [papers, customPapersCount],
  );
  const prelimsCount = useMemo(
    () => papers.filter((p) => p.category === "prelims").length,
    [papers],
  );
  const mainsCount = useMemo(
    () => papers.filter((p) => p.category === "mains").length,
    [papers],
  );

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    SUPPORTED_YEARS.forEach((yr) => set.add(yr));
    papers.forEach((p) => {
      if (p.year && p.year !== "custom") set.add(p.year);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [papers]);

  const attemptsByPaperId = useMemo(() => {
    const map = new Map<string, Attempt[]>();
    attempts.forEach((a) => {
      const list = map.get(a.paperId) || [];
      list.push(a);
      map.set(a.paperId, list);
    });
    return map;
  }, [attempts]);

  const attemptedCount = useMemo(() => {
    return papers.filter((p) => (attemptsByPaperId.get(p.id) || []).length > 0)
      .length;
  }, [papers, attemptsByPaperId]);

  const unattemptedCount = useMemo(() => {
    return papers.filter(
      (p) => (attemptsByPaperId.get(p.id) || []).length === 0,
    ).length;
  }, [papers, attemptsByPaperId]);

  const mockAttemptedCount = useMemo(() => {
    return papers.filter((p) =>
      (attemptsByPaperId.get(p.id) || []).some((a) => a.mode === "mock"),
    ).length;
  }, [papers, attemptsByPaperId]);

  const practiceAttemptedCount = useMemo(() => {
    return papers.filter((p) =>
      (attemptsByPaperId.get(p.id) || []).some((a) => a.mode === "practice"),
    ).length;
  }, [papers, attemptsByPaperId]);

  const filteredPapers = papers.filter((p) => {
    // 1. Source filter: Uploaded vs Pre-defined
    const isUploaded = isUserUploadedPaper(p);
    if (selectedSource === "custom" && !isUploaded) return false;
    if (selectedSource === "predefined" && isUploaded) return false;

    // 2. Category filter: Prelims vs Mains vs All
    if (selectedCategory === "prelims" && p.category !== "prelims") return false;
    if (selectedCategory === "mains" && p.category !== "mains") return false;

    // 3. Year filter
    if (selectedYear !== "all" && p.year !== selectedYear) return false;

    // 4. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        p.label.toLowerCase().includes(q) ||
        p.subject.toLowerCase().includes(q) ||
        p.year.includes(q);
      if (!matchSearch) return false;
    }

    // 5. Attempt filter: Attempted vs Unattempted vs All
    const paperAtts = attemptsByPaperId.get(p.id) || [];
    if (selectedAttemptFilter === "attempted" && paperAtts.length === 0) return false;
    if (selectedAttemptFilter === "unattempted" && paperAtts.length > 0) return false;
    if (selectedAttemptFilter === "mock" && !paperAtts.some((a) => a.mode === "mock")) return false;
    if (selectedAttemptFilter === "practice" && !paperAtts.some((a) => a.mode === "practice")) return false;

    return true;
  });

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== "all" ||
    selectedSource !== "all" ||
    selectedYear !== "all" ||
    selectedAttemptFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedSource("all");
    setSelectedYear("all");
    setSelectedAttemptFilter("all");
  };

  return (
    <div className="page-container space-y-5">
      <PageHeader
        eyebrow={`UPSC Assessment Repository · ${papers.length} Papers Total`}
        title="Question Papers & Mock Tests"
        description="Comprehensive collection of UPSC Civil Services past exams and imported mock sets. Practice with instant feedback or simulate timed exam conditions."
        actions={
          <button
            type="button"
            onClick={onNavigateUpload}
            className="button-primary cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Upload Paper</span>
          </button>
        }
      />

      {/* Search & Multi-Criteria Filter Panel */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Top: Search Bar + View Toggle */}
        <div className="p-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search papers by subject, keyword, or year (e.g., GS I, CSAT, Polity)..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer transition-colors"
                  title="Clear search text"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Layout Toggle */}
            <div
              className="inline-flex items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-100 p-0.5 shrink-0"
              aria-label="View layout mode"
            >
              <button
                type="button"
                onClick={() => setPaperViewMode("grid")}
                aria-label="Show papers as grid"
                aria-pressed={paperViewMode === "grid"}
                title="Grid layout"
                className={`cursor-pointer rounded-lg p-1.5 transition-colors ${
                  paperViewMode === "grid"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Grid2X2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPaperViewMode("list")}
                aria-label="Show papers as list"
                aria-pressed={paperViewMode === "list"}
                title="List layout"
                className={`cursor-pointer rounded-lg p-1.5 transition-colors ${
                  paperViewMode === "list"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Current Filtered Criteria in Small Text Right Below Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 px-0.5 text-[11px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-400">Current filters:</span>
              {hasActiveFilters ? (
                <>
                  {selectedAttemptFilter !== "all" && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {selectedAttemptFilter === "attempted" ? "Attempted" : "Unattempted"}
                    </span>
                  )}
                  {selectedSource !== "all" && (
                    <>
                      {selectedAttemptFilter !== "all" && (
                        <span className="text-[10px] font-bold text-slate-400">AND</span>
                      )}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-[11px] bg-purple-50 text-purple-800 border border-purple-200">
                        {selectedSource === "custom" ? "Uploaded" : "Pre-Defined"}
                      </span>
                    </>
                  )}
                  {selectedCategory !== "all" && (
                    <>
                      {(selectedAttemptFilter !== "all" || selectedSource !== "all") && (
                        <span className="text-[10px] font-bold text-slate-400">AND</span>
                      )}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-[11px] bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {selectedCategory === "prelims" ? "Prelims" : "Mains"}
                      </span>
                    </>
                  )}
                  {selectedYear !== "all" && (
                    <>
                      {(selectedAttemptFilter !== "all" ||
                        selectedSource !== "all" ||
                        selectedCategory !== "all") && (
                        <span className="text-[10px] font-bold text-slate-400">AND</span>
                      )}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-[11px] bg-amber-50 text-amber-900 border border-amber-200">
                        Year {selectedYear}
                      </span>
                    </>
                  )}
                  {searchQuery.trim() && (
                    <>
                      {(selectedAttemptFilter !== "all" ||
                        selectedSource !== "all" ||
                        selectedCategory !== "all" ||
                        selectedYear !== "all") && (
                        <span className="text-[10px] font-bold text-slate-400">AND</span>
                      )}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                        &ldquo;{searchQuery.trim()}&rdquo;
                      </span>
                    </>
                  )}
                  <span className="text-slate-400 font-normal">
                    &bull; {filteredPapers.length} of {papers.length} {filteredPapers.length === 1 ? "paper" : "papers"} shown
                  </span>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="cursor-pointer font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors ml-1"
                  >
                    Reset all
                  </button>
                </>
              ) : (
                <span className="text-slate-400">
                  Showing all {papers.length} papers &bull; No active restrictions
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 hidden sm:block">
              Combine filters using AND logic
            </div>
          </div>
        </div>

        {/* Filter Rows with Small Gap and Distinct Highlighting */}
        <div className="p-2.5 sm:p-3 bg-slate-50/50 space-y-2">
          {/* Row 1: Attempted, Unattempted */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 w-24 shrink-0">
              Attempt:
            </span>
            <div className="inline-flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedAttemptFilter("all")}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedAttemptFilter === "all"
                    ? "bg-slate-900 text-white shadow-2xs font-semibold"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                All Papers
                <span
                  className={`text-[10px] font-mono rounded px-1 ${
                    selectedAttemptFilter === "all"
                      ? "bg-white/20 text-white"
                      : "text-slate-400 bg-slate-100"
                  }`}
                >
                  {papers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedAttemptFilter(
                    selectedAttemptFilter === "attempted" ? "all" : "attempted",
                  )
                }
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedAttemptFilter === "attempted"
                    ? "border border-emerald-500 bg-emerald-500 text-white font-semibold shadow-xs ring-1 ring-emerald-500"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    selectedAttemptFilter === "attempted"
                      ? "bg-white"
                      : "bg-emerald-500"
                  }`}
                />
                Attempted
                <span
                  className={`text-[10px] font-mono rounded px-1 ${
                    selectedAttemptFilter === "attempted"
                      ? "bg-emerald-600 text-white"
                      : "text-emerald-700 bg-emerald-50"
                  }`}
                >
                  {attemptedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedAttemptFilter(
                    selectedAttemptFilter === "unattempted"
                      ? "all"
                      : "unattempted",
                  )
                }
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedAttemptFilter === "unattempted"
                    ? "border border-slate-700 bg-slate-700 text-white font-semibold shadow-xs ring-1 ring-slate-700"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    selectedAttemptFilter === "unattempted"
                      ? "bg-white"
                      : "bg-slate-400"
                  }`}
                />
                Unattempted
                <span
                  className={`text-[10px] font-mono rounded px-1 ${
                    selectedAttemptFilter === "unattempted"
                      ? "bg-slate-800 text-white"
                      : "text-slate-600 bg-slate-100"
                  }`}
                >
                  {unattemptedCount}
                </span>
              </button>
            </div>
          </div>

          {/* Row Divider with AND badge */}
          <div className="flex items-center gap-2 pl-4 sm:pl-6">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-200/80 rounded px-1.5 py-0.5">
              AND
            </span>
            <div className="h-px bg-slate-200/80 flex-1" />
          </div>

          {/* Row 2: Uploaded, Pre-Defined */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 w-24 shrink-0">
              Source:
            </span>
            <div className="inline-flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedSource("all")}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedSource === "all"
                    ? "bg-slate-900 text-white shadow-2xs font-semibold"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                All Sources
                <span
                  className={`text-[10px] font-mono rounded px-1 ${
                    selectedSource === "all"
                      ? "bg-white/20 text-white"
                      : "text-slate-400 bg-slate-100"
                  }`}
                >
                  {papers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedSource(
                    selectedSource === "custom" ? "all" : "custom",
                  )
                }
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedSource === "custom"
                    ? "border border-purple-600 bg-purple-600 text-white font-semibold shadow-xs ring-1 ring-purple-600"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:text-purple-700"
                }`}
              >
                <FileUp className="h-3 w-3" />
                Uploaded
                <span
                  className={`text-[10px] font-mono rounded px-1 ${
                    selectedSource === "custom"
                      ? "bg-purple-700 text-white"
                      : "text-purple-700 bg-purple-50"
                  }`}
                >
                  {customPapersCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedSource(
                    selectedSource === "predefined" ? "all" : "predefined",
                  )
                }
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedSource === "predefined"
                    ? "border border-blue-600 bg-blue-600 text-white font-semibold shadow-xs ring-1 ring-blue-600"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                <BookOpen className="h-3 w-3" />
                Pre-Defined
                <span
                  className={`text-[10px] font-mono rounded px-1 ${
                    selectedSource === "predefined"
                      ? "bg-blue-700 text-white"
                      : "text-blue-700 bg-blue-50"
                  }`}
                >
                  {predefinedPapersCount}
                </span>
              </button>
            </div>
          </div>

          {/* Row Divider with AND badge */}
          <div className="flex items-center gap-2 pl-4 sm:pl-6">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-200/80 rounded px-1.5 py-0.5">
              AND
            </span>
            <div className="h-px bg-slate-200/80 flex-1" />
          </div>

          {/* Row 3: All, Prelims, Mains, Years */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 w-24 shrink-0">
              Stage &amp; Year:
            </span>
            <div className="inline-flex items-center gap-1.5 flex-wrap flex-1">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedCategory === "all"
                    ? "bg-indigo-600 text-white shadow-2xs font-semibold"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700"
                }`}
              >
                All Stages
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === "prelims" ? "all" : "prelims",
                  )
                }
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedCategory === "prelims"
                    ? "border border-indigo-600 bg-indigo-600 text-white font-semibold shadow-xs ring-1 ring-indigo-600"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                }`}
              >
                Prelims
                <span
                  className={`text-[10px] font-mono rounded px-1 ${
                    selectedCategory === "prelims"
                      ? "bg-indigo-700 text-white"
                      : "text-slate-400 bg-slate-100"
                  }`}
                >
                  {prelimsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === "mains" ? "all" : "mains",
                  )
                }
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedCategory === "mains"
                    ? "border border-indigo-600 bg-indigo-600 text-white font-semibold shadow-xs ring-1 ring-indigo-600"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                }`}
              >
                Mains
                <span
                  className={`text-[10px] font-mono rounded px-1 ${
                    selectedCategory === "mains"
                      ? "bg-indigo-700 text-white"
                      : "text-slate-400 bg-slate-100"
                  }`}
                >
                  {mainsCount}
                </span>
              </button>

              {/* Vertical Divider */}
              <div className="h-4 w-px bg-slate-300 mx-1" />

              {/* Year Chips */}
              <button
                type="button"
                onClick={() => setSelectedYear("all")}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedYear === "all"
                    ? "bg-amber-600 text-white shadow-2xs font-semibold"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:text-amber-800"
                }`}
              >
                All Years
              </button>

              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() =>
                    setSelectedYear(selectedYear === yr ? "all" : yr)
                  }
                  className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition-all ${
                    selectedYear === yr
                      ? "border border-amber-500 bg-amber-500 text-white font-semibold shadow-xs ring-1 ring-amber-500"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-800"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Papers Grid */}
      {filteredPapers.length === 0 ? (
        <div className="bi-card rounded-2xl p-12 text-center border-dashed border-slate-300">
          {selectedSource === "custom" ? (
            <>
              <FileUp className="mx-auto h-12 w-12 text-purple-400 mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                No user-uploaded papers match your filter
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {customPapersCount === 0
                  ? "You haven't uploaded any custom test papers yet. Upload mock test papers with custom question counts and scoring rules anytime."
                  : "No uploaded assessments matched the combined search, attempt, and year filters."}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    Reset filters
                  </button>
                )}
                <button
                  onClick={onNavigateUpload}
                  className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-xs transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Upload Custom Paper</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <BookOpen className="mx-auto h-12 w-12 text-slate-400 mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                No question papers match your filters
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No papers found matching the combined criteria. Try clearing the search term or resetting some filters.
              </p>
              {hasActiveFilters && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                  >
                    Reset all filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div
          className={
            paperViewMode === "grid"
              ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {filteredPapers.map((paper) => {
            const keyPresent = hasAnswerKey(paper);
            const solutionPresent = hasSolution(paper);
            const keyCount =
              Object.keys(paper.answerKey || {}).length ||
              (keyPresent ? paper.totalQuestions : 0);

            const isLocked = !isPro && !isPaperFree(paper);

            const paperAtts = attemptsByPaperId.get(paper.id) || [];
            const hasAttempt = paperAtts.length > 0;
            const mockAtts = paperAtts.filter((a) => a.mode === "mock");
            const practiceAtts = paperAtts.filter((a) => a.mode === "practice");
            const hasMock = mockAtts.length > 0;
            const hasPractice = practiceAtts.length > 0;
            const finishedAttempts = paperAtts.filter((attempt) =>
              Boolean(attempt.finishedAt),
            );
            const latestAttempt = (
              finishedAttempts.length > 0 ? finishedAttempts : paperAtts
            ).sort(
              (a, b) =>
                new Date(b.finishedAt || b.startedAt).getTime() -
                new Date(a.finishedAt || a.startedAt).getTime(),
            )[0];
            const cutoffStatus =
              hasAttempt && latestAttempt
                ? getPaperCutoffStatus(paper, latestAttempt)
                : null;

            return (
              <div
                key={paper.id}
                className={`flex overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 group hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer ${
                  paperViewMode === "grid"
                    ? "flex-col h-full"
                    : "flex-col md:grid md:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] md:gap-5"
                }`}
              >
                <div className="flex flex-col flex-1 min-w-0">
                  {/* Fixed-height Header Bar (Year on left, Attempt & Cutoff badges on right) */}
                  <div className="flex h-7 items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 font-mono">
                        {paper.year}
                      </span>
                      {hasAttempt && (
                        <span
                          role="img"
                          aria-label="Attempted"
                          title="Attempted"
                          className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-100"
                        />
                      )}
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                          <Lock className="h-2.5 w-2.5 text-amber-600" />
                          <span>PRO</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-1.5 shrink-0 text-[10px] font-semibold">
                      {hasMock && (
                        <span
                          aria-label={`${mockAtts.length} mock ${mockAtts.length === 1 ? "attempt" : "attempts"}`}
                          className="inline-flex items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-indigo-700"
                        >
                          {mockAtts.length}{" "}
                          {mockAtts.length === 1 ? "mock" : "mocks"}
                        </span>
                      )}

                      {hasPractice && (
                        <span
                          aria-label={`${practiceAtts.length} practice ${practiceAtts.length === 1 ? "session" : "sessions"}`}
                          className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700"
                        >
                          {practiceAtts.length}{" "}
                          {practiceAtts.length === 1 ? "practice" : "practices"}
                        </span>
                      )}

                      {cutoffStatus?.hasCutoff && (
                        <span
                          title={
                            cutoffStatus.isCsat &&
                            cutoffStatus.cutoffValue === 33.33
                              ? `UPSC CSAT Qualifying benchmark: 33.3% (${cutoffStatus.cutoffCleared ? "Cleared" : "Below"})`
                              : `Cutoff benchmark: ${cutoffStatus.cutoffValue}${cutoffStatus.cutoffType === "percentage" ? "%" : " marks"} (${cutoffStatus.cutoffCleared ? "Cleared" : "Below"})`
                          }
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${
                            cutoffStatus.cutoffCleared
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}
                        >
                          {cutoffStatus.cutoffCleared ? (
                            <CheckCircle2 className="h-2.5 w-2.5" />
                          ) : (
                            <AlertTriangle className="h-2.5 w-2.5" />
                          )}
                          <span>{cutoffStatus.badgeText}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Clean Title Container - strictly 44px (h-11) across every card */}
                  <div className="mt-2.5 h-11 flex items-start overflow-hidden">
                    <h3
                      className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2"
                      title={getPaperDisplayTitle(paper)}
                    >
                      {getPaperDisplayTitle(paper)}
                    </h3>
                  </div>

                  {/* Meta details row - strictly 20px (h-5) */}
                  <div className="mt-1.5 h-5 flex items-center gap-2 text-xs text-slate-400 font-normal truncate">
                    <span>{paper.totalQuestions} Questions</span>
                    <span>•</span>
                    <span>{paper.timeMinutes} mins</span>
                    <span>•</span>
                    <span>{paper.totalMarks} Marks</span>
                    {paper.createdAt && isUserUploadedPaper(paper) && (
                      <>
                        <span>•</span>
                        <span title={new Date(paper.createdAt).toLocaleString()}>
                          {new Date(paper.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Status Indicators row - strictly 28px (h-7) */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 h-7 flex items-center gap-1.5 overflow-hidden text-[11px]">
                    {paper.examType === "objective" ? (
                      <>
                        {keyPresent ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50/70 text-emerald-700 border border-emerald-200/60 shrink-0">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Key ({keyCount} Qs)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50/70 text-amber-700 border border-amber-200/60 shrink-0">
                            <AlertCircle className="h-3 w-3 text-amber-600" />
                            <span>No Key</span>
                          </div>
                        )}
                        {paper.explanations &&
                          Object.keys(paper.explanations).length > 0 && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50/70 text-indigo-700 border border-indigo-200/60 shrink-0">
                              <BookOpen className="h-3 w-3 text-indigo-600" />
                              <span>Explanations</span>
                            </div>
                          )}
                      </>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-50/70 text-violet-700 border border-violet-200/60 shrink-0">
                        <span>Subjective</span>
                      </div>
                    )}

                    {solutionPresent ? (
                      <button
                        onClick={() => setViewingSolutionPaper(paper)}
                        className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
                        title="Click to view attached solution booklet"
                      >
                        <FileText className="h-3 w-3 text-slate-500" />
                        <span>Solution</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 shrink-0">
                        No Solution
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Action Area: Uniformly anchored to bottom */}
                <div
                  className={`space-y-2 ${
                    paperViewMode === "grid"
                      ? "mt-auto pt-3 border-t border-slate-100"
                      : "mt-4 border-t border-slate-100 pt-3 md:mt-0 md:border-l md:border-t-0 md:pl-5 md:pt-0 md:self-stretch md:flex md:flex-col md:justify-center"
                  }`}
                >
                  {/* Primary Test Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    {isLocked ? (
                      <>
                        <button
                          onClick={() => openProUpgradeModal(paper.label)}
                          className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                        >
                          <Lock className="h-3.5 w-3.5 text-amber-600" />
                          <span>Practice</span>
                        </button>
                        <button
                          onClick={() => openProUpgradeModal(paper.label)}
                          className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 py-2 text-xs font-semibold text-white transition-all shadow-xs"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Mock</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {keyPresent || paper.examType === "subjective" ? (
                          <button
                            onClick={() => onStartExam(paper, "practice")}
                            className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
                          >
                            <Play className="h-3.5 w-3.5 text-slate-500" />
                            <span>Practice</span>
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleOpenAttachModal(paper, "key", true)
                            }
                            title="Practice mode requires an answer key"
                            className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            <span>Add Key</span>
                          </button>
                        )}

                        <button
                          onClick={() => onStartExam(paper, "mock")}
                          className="cursor-pointer flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2 text-xs font-semibold text-white transition-all shadow-xs"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          <span>Mock Exam</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Clean Utility Footer */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2">
                      {paper.qpUrl?.startsWith("local://") ? (
                        <button
                          type="button"
                          onClick={() => exportQuestionPaperAsPDF(paper)}
                          className="cursor-pointer inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
                          title="Export Markdown question paper as PDF"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>PDF</span>
                        </button>
                      ) : (
                        <a
                          href={`/api/paper-download?url=${encodeURIComponent(paper.qpUrl)}&filename=${encodeURIComponent(getPaperDownloadFilename(paper))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
                          title="Open Question Paper PDF in new tab; downloads use the paper name"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>PDF</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleOpenAttachModal(paper, "key")}
                        className="cursor-pointer inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 transition-colors"
                        title="Attach or replace answer key"
                      >
                        <Key className="h-3 w-3" />
                        <span>{keyPresent ? "Key" : "Add Key"}</span>
                      </button>

                      <button
                        onClick={() => handleOpenAttachModal(paper, "solution")}
                        className="cursor-pointer inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 transition-colors"
                        title="Upload solution booklet"
                      >
                        <FileUp className="h-3 w-3" />
                        <span>Solution</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(paper)}
                        className="cursor-pointer text-[11px] text-slate-400 hover:text-slate-700 transition-colors"
                        title="Edit question count, marks and duration"
                      >
                        <Settings2 className="h-3 w-3" />
                      </button>

                      {onDeletePaper && (
                        <button
                          onClick={() => onDeletePaper(paper.id)}
                          className="cursor-pointer text-[11px] text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove this paper"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attach Answer Key / Solution Modal */}
      {attachingPaper &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex min-h-full items-start sm:items-center justify-center p-3 sm:p-6 py-8 sm:py-12 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="relative my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="h-4.5 w-4.5 text-indigo-600" />
                    Attach Files for {attachingPaper.label}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Attach answer key or official solution PDF booklet
                  </p>
                </div>
                <button
                  onClick={() => setAttachingPaper(null)}
                  className="cursor-pointer text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Modal Tab Switcher */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold">
                {attachingPaper.examType === "objective" && (
                  <button
                    type="button"
                    onClick={() => setModalActiveTab("key")}
                    className={`cursor-pointer flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                      modalActiveTab === "key"
                        ? "bg-white text-indigo-700 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Key className="h-3.5 w-3.5" />
                    <span>1. Answer Key</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalActiveTab("solution")}
                  className={`cursor-pointer flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                    modalActiveTab === "solution"
                      ? "bg-white text-indigo-700 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>2. Solution PDF</span>
                </button>
              </div>

              {attachPromptReason && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>{attachPromptReason}</span>
                </div>
              )}

              {attachError && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{attachError}</span>
                </div>
              )}

              {/* Tab 1: Answer Key Form */}
              {modalActiveTab === "key" &&
                attachingPaper.examType === "objective" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Answer Key Input
                      </span>
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setAttachAkMode("paste")}
                          className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                            attachAkMode === "paste"
                              ? "bg-white text-indigo-700 font-bold shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Paste Text
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttachAkMode("upload")}
                          className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                            attachAkMode === "upload"
                              ? "bg-white text-indigo-700 font-bold shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Upload .txt
                        </button>
                      </div>
                    </div>

                    {attachAkMode === "upload" ? (
                      <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-xs font-medium text-slate-700 hover:border-indigo-500 hover:bg-slate-100/60 transition-colors">
                        <FileUp className="h-7 w-7 text-indigo-600 mb-2" />
                        <span className="font-semibold">
                          {attachAkFile
                            ? attachAkFile.name
                            : "Select .txt answer key file"}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Click to browse your device
                        </span>
                        <input
                          type="file"
                          accept=".txt"
                          onChange={(e) =>
                            setAttachAkFile(e.target.files?.[0] || null)
                          }
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div>
                        <textarea
                          value={attachAkText}
                          onChange={(e) => setAttachAkText(e.target.value)}
                          placeholder={`1. a\n2. c\n3. d\n4. b\n...\n100. a`}
                          rows={6}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                        />
                        {(() => {
                          const detailed = parseAnswerKeyDetailed(attachAkText);
                          const ansCount = Object.keys(detailed.answers).length;
                          const expCount = Object.keys(
                            detailed.explanations,
                          ).length;
                          return (
                            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 mt-1 font-mono gap-1">
                              <span>
                                Recognized:{" "}
                                <strong className="text-emerald-700 font-bold">
                                  {ansCount}
                                </strong>{" "}
                                answers
                                {expCount > 0 && (
                                  <span className="ml-1.5 text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                                    💡 {expCount} explanations
                                  </span>
                                )}
                              </span>
                              <span>
                                Target: {attachingPaper.totalQuestions}{" "}
                                Questions
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

              {/* Tab 2: Solution PDF Form */}
              {modalActiveTab === "solution" && (
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Official Solution Booklet
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Upload a PDF containing detailed model answers and
                      explanations.
                    </p>
                  </div>

                  <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-indigo-500 hover:bg-slate-100/60 transition-colors">
                    <FileUp className="h-7 w-7 text-indigo-600 mb-2" />
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[280px]">
                      {attachExsFile
                        ? attachExsFile.name
                        : attachingPaper.exsUrl
                          ? "Choose new PDF to replace current solution"
                          : "Select solution .pdf document"}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      PDF format only
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setAttachExsFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAttachingPaper(null)}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    isSubmittingAttach ||
                    (modalActiveTab === "key" &&
                      !attachAkText.trim() &&
                      !attachAkFile) ||
                    (modalActiveTab === "solution" && !attachExsFile)
                  }
                  onClick={handleSaveAttachment}
                  className="cursor-pointer px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white disabled:opacity-40 transition-all shadow-xs"
                >
                  {isSubmittingAttach ? "Saving..." : "Save Attachment"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Edit Paper Rules Modal */}
      {editingPaper &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex min-h-full items-start sm:items-center justify-center p-3 sm:p-6 py-8 sm:py-12 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="relative my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Paper Rules
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingPaper.label}
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">
                    Total Questions
                  </label>
                  <input
                    type="number"
                    value={editTotalQuestions}
                    onChange={(e) =>
                      setEditTotalQuestions(parseInt(e.target.value) || 0)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={editTotalMarks}
                    onChange={(e) =>
                      setEditTotalMarks(parseFloat(e.target.value) || 0)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">
                    Time (Minutes)
                  </label>
                  <input
                    type="number"
                    value={editTimeMinutes}
                    onChange={(e) =>
                      setEditTimeMinutes(parseInt(e.target.value) || 0)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                {editingPaper.examType === "objective" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 mb-1 font-bold">
                        Correct Marks (+)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editCorrectMarks}
                        onChange={(e) =>
                          setEditCorrectMarks(parseFloat(e.target.value) || 0)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1 font-bold">
                        Negative Penalty (-)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={editIncorrectMarks}
                        onChange={(e) =>
                          setEditIncorrectMarks(parseFloat(e.target.value) || 0)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editCutoffEnabled}
                      onChange={(e) => setEditCutoffEnabled(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Set qualifying marks / cutoff
                  </label>
                  {editCutoffEnabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={editCutoffType}
                        onChange={(e) =>
                          setEditCutoffType(e.target.value as CutoffType)
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="marks">Marks</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editCutoffValue}
                        onChange={(e) =>
                          setEditCutoffValue(parseFloat(e.target.value) || "")
                        }
                        placeholder={
                          editCutoffType === "percentage"
                            ? "e.g. 40"
                            : "e.g. 66.67"
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500">
                    Leave unchecked when this paper has no cutoff.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setEditingPaper(null)}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="cursor-pointer px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-all shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Detailed Solution Modal */}
      <DetailedSolutionModal
        isOpen={!!viewingSolutionPaper}
        onClose={() => setViewingSolutionPaper(null)}
        pdfUrl={viewingSolutionPaper?.exsUrl}
        paperTitle={`${viewingSolutionPaper?.label || ""} - Solution Key`}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { QuestionPaper, Attempt } from "../lib/types";
import {
  SUPPORTED_YEARS,
  hasAnswerKey,
  hasSolution,
  parseAnswerKeyText,
  parseAnswerKeyDetailed,
  isPaperFree,
  isUserUploadedPaper,
  getPaperDisplayTitle,
} from "../lib/defaults";
import { attachToPaperOnServer } from "../lib/storage";
import { DetailedSolutionModal } from "./DetailedSolutionModal";
import { useApp } from "../context/AppContext";
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
  Sparkles,
} from "lucide-react";

interface PapersViewProps {
  papers: QuestionPaper[];
  onStartExam: (paper: QuestionPaper, mode: "practice" | "mock") => void;
  onNavigateUpload: () => void;
  onDeletePaper?: (paperId: string) => void;
  onUpdatePaper?: (paper: QuestionPaper) => void;
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
    "all" | "prelims" | "mains" | "custom"
  >("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedAttemptFilter, setSelectedAttemptFilter] = useState<
    "all" | "attempted" | "unattempted" | "mock" | "practice"
  >("all");
  const [mounted, setMounted] = useState(false);
  const [viewingSolutionPaper, setViewingSolutionPaper] =
    useState<QuestionPaper | null>(null);

  useEffect(() => {
    setMounted(true);
    const tab = searchParams?.get("tab");
    if (tab === "custom") {
      setSelectedCategory("custom");
    }
  }, [searchParams]);

  // Edit paper rules modal
  const [editingPaper, setEditingPaper] = useState<QuestionPaper | null>(null);
  const [editTotalQuestions, setEditTotalQuestions] = useState<number>(100);
  const [editTotalMarks, setEditTotalMarks] = useState<number>(200);
  const [editCorrectMarks, setEditCorrectMarks] = useState<number>(2.0);
  const [editIncorrectMarks, setEditIncorrectMarks] = useState<number>(0.667);
  const [editTimeMinutes, setEditTimeMinutes] = useState<number>(120);

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

  const customPapersCount = papers.filter(isUserUploadedPaper).length;

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
    let matchesCat = true;
    if (selectedCategory === "prelims")
      matchesCat = p.category === "prelims";
    else if (selectedCategory === "mains")
      matchesCat = p.category === "mains";
    else if (selectedCategory === "custom") matchesCat = isUserUploadedPaper(p);

    const matchesYear =
      selectedCategory === "custom" ||
      isUserUploadedPaper(p) ||
      selectedYear === "all" ||
      p.year === selectedYear;
    const matchesSearch =
      p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subject.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesAttempt = true;
    const paperAtts = attemptsByPaperId.get(p.id) || [];
    if (selectedAttemptFilter === "attempted") {
      matchesAttempt = paperAtts.length > 0;
    } else if (selectedAttemptFilter === "unattempted") {
      matchesAttempt = paperAtts.length === 0;
    } else if (selectedAttemptFilter === "mock") {
      matchesAttempt = paperAtts.some((a) => a.mode === "mock");
    } else if (selectedAttemptFilter === "practice") {
      matchesAttempt = paperAtts.some((a) => a.mode === "practice");
    }

    return matchesCat && matchesYear && matchesSearch && matchesAttempt;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 font-mono">
              Papers Archive
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-mono">
              {papers.length} Papers
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Question Papers
          </h1>
        </div>

        <button
          onClick={onNavigateUpload}
          className="cursor-pointer self-start sm:self-auto flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-all shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Upload Paper</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search papers by year, subject, keyword..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Category Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-medium flex-wrap">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 transition-colors ${
              selectedCategory === "all"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedCategory("prelims")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 transition-colors ${
              selectedCategory === "prelims"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Prelims
          </button>
          <button
            onClick={() => setSelectedCategory("mains")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 transition-colors ${
              selectedCategory === "mains"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mains
          </button>
          <button
            onClick={() => setSelectedCategory("custom")}
            className={`cursor-pointer flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
              selectedCategory === "custom"
                ? "bg-white text-purple-700 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileUp className="h-3.5 w-3.5 text-purple-600" />
            <span>Uploaded</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedCategory === "custom"
                  ? "bg-purple-100 text-purple-800 font-semibold"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {customPapersCount}
            </span>
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedAttemptFilter}
            onChange={(e) => setSelectedAttemptFilter(e.target.value as any)}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
          >
            <option value="all">All Attempts ({papers.length})</option>
            <option value="attempted">Attempted ({attemptedCount})</option>
            <option value="unattempted">Unattempted ({unattemptedCount})</option>
            <option value="mock">Mock Only ({mockAttemptedCount})</option>
            <option value="practice">Practice Only ({practiceAttemptedCount})</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
          >
            <option value="all">All Years</option>
            {SUPPORTED_YEARS.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Freemium Vault Announcement Banner */}
      {!isPro && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-indigo-50/40 to-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700 shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5 text-amber-600 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Free Tier: 2026 Prelims Papers (GS I & CSAT)
                </h3>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.2 text-[10px] font-extrabold">
                  FREE FOREVER
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Full real-time countdown timer, answer keys, confidence tagging
                & automated evaluation included. Unlock the complete 2024, 2025,
                and 2026 Prelims & Mains archive + unlimited custom paper
                uploads with Lifetime Pro (₹999).
              </p>
            </div>
          </div>
          <button
            onClick={() => openProUpgradeModal()}
            className="cursor-pointer shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] px-4 py-2.5 text-xs font-bold text-white transition-all shadow-xs flex items-center justify-center gap-1.5"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Unlock Pro Vault (₹999)</span>
          </button>
        </div>
      )}

      {/* Papers Grid */}
      {filteredPapers.length === 0 ? (
        <div className="bi-card rounded-2xl p-12 text-center border-dashed border-slate-300">
          {selectedCategory === "custom" ? (
            <>
              <FileUp className="mx-auto h-12 w-12 text-purple-400 mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                No user uploaded papers found
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You haven&apos;t uploaded any custom test papers yet. Upload
                mock test papers with custom question counts and scoring rules
                anytime.
              </p>
              <div className="mt-4">
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
                No question papers match your filter
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Try resetting search keyword or selecting &quot;All Years&quot;.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPapers.map((paper) => {
            const keyPresent = hasAnswerKey(paper);
            const solutionPresent = hasSolution(paper);
            const isCustom = isUserUploadedPaper(paper);
            const keyCount =
              Object.keys(paper.answerKey || {}).length ||
              (keyPresent ? paper.totalQuestions : 0);

            const isLocked = !isPro && !isPaperFree(paper);

            const paperAtts = attemptsByPaperId.get(paper.id) || [];
            const mockAtts = paperAtts.filter((a) => a.mode === "mock");
            const practiceAtts = paperAtts.filter((a) => a.mode === "practice");
            const hasMock = mockAtts.length > 0;
            const hasPractice = practiceAtts.length > 0;
            const bestMock = mockAtts.reduce(
              (best, cur) => (cur.score > (best?.score ?? -999) ? cur : best),
              null as Attempt | null,
            );

            return (
              <div
                key={paper.id}
                className="flex flex-col h-full justify-between bg-white rounded-2xl border border-slate-200/80 p-5 group hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div>
                  {/* Top Header Row: Clean, quiet badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 font-mono">
                        {paper.year}
                      </span>
                      {isCustom && (
                        <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                          Uploaded
                        </span>
                      )}
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                          <Lock className="h-2.5 w-2.5 text-amber-600" />
                          <span>PRO</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {((paper.parsedQuestions && paper.parsedQuestions.length > 0) ||
                        paper.markdownContent ||
                        paper.qpUrl?.startsWith("local://")) ? (
                        <span className="text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-purple-600" />
                          <span>Interactive</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                          {paper.examType === "subjective" ? "Mains" : "PDF"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Clean Title Container with subtle attempt badges */}
                  <div className="mt-3 min-h-[40px] flex items-start gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2 flex-1">
                      {getPaperDisplayTitle(paper)}
                    </h3>

                    {/* Subtle Attempt Count Chips */}
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      {hasMock && (
                        <span
                          title={`Mock Attempted: ${mockAtts.length} ${mockAtts.length === 1 ? "time" : "times"}${bestMock ? ` • Best Score: ${bestMock.score}/${paper.totalMarks}` : ""}`}
                          className="inline-flex items-center justify-center px-1.5 h-5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-mono font-medium cursor-default"
                        >
                          M{mockAtts.length}
                        </span>
                      )}

                      {hasPractice && (
                        <span
                          title={`Practiced: ${practiceAtts.length} ${practiceAtts.length === 1 ? "session" : "sessions"}`}
                          className="inline-flex items-center justify-center px-1.5 h-5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-medium cursor-default"
                        >
                          P{practiceAtts.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meta details */}
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400 font-normal">
                    <span>{paper.totalQuestions} Questions</span>
                    <span>•</span>
                    <span>{paper.timeMinutes} mins</span>
                    <span>•</span>
                    <span>{paper.totalMarks} Marks</span>
                  </div>

                  {/* Status Indicators - Clean, Quiet Visual Badges */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                    {paper.examType === "objective" ? (
                      <>
                        {keyPresent ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50/70 text-emerald-700 border border-emerald-200/60">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Key ({keyCount} Qs)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50/70 text-amber-700 border border-amber-200/60">
                            <AlertCircle className="h-3 w-3 text-amber-600" />
                            <span>No Key</span>
                          </div>
                        )}
                        {paper.explanations && Object.keys(paper.explanations).length > 0 && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50/70 text-indigo-700 border border-indigo-200/60">
                            <BookOpen className="h-3 w-3 text-indigo-600" />
                            <span>Explanations</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-50/70 text-violet-700 border border-violet-200/60">
                        <span>Subjective</span>
                      </div>
                    )}

                    {solutionPresent ? (
                      <button
                        onClick={() => setViewingSolutionPaper(paper)}
                        className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        title="Click to view attached solution booklet"
                      >
                        <FileText className="h-3 w-3 text-slate-500" />
                        <span>Solution</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">No Solution</span>
                    )}
                  </div>
                </div>

                {/* Bottom Action Area: Clean & Uncluttered */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
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
                            onClick={() => handleOpenAttachModal(paper, "key", true)}
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
                      <a
                        href={paper.qpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
                        title="Open Question Paper PDF in new tab"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>PDF</span>
                      </a>

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

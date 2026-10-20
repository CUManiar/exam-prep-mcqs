"use client";

import React, { useState, useMemo, useCallback } from "react";
import { QuestionPaper, ExamType } from "../lib/types";
import {
  SUPPORTED_YEARS,
  hasAnswerKey,
  hasSolution,
  getPaperDisplayTitle,
  isUserUploadedPaper,
} from "../lib/defaults";
import { saveCustomPaper, attachToPaperOnServer } from "../lib/storage";
import { useApp } from "../context/AppContext";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Sliders,
  Check,
  Edit3,
  ExternalLink,
  Trash2,
  Key,
  Paperclip,
  RefreshCw,
  Zap,
  Search,
  ChevronDown,
  X,
  Sparkles,
  BookOpen,
  Eye,
  EyeOff,
  Lightbulb,
  Play,
  Clock,
  ArrowRight,
  FileCode,
  HelpCircle,
  Copy,
} from "lucide-react";
import { parseQuestionnaireMarkdown, parseMarkdownHeader } from "../lib/markdownPaperParser";
import { parseAnswerKeyDetailed } from "../lib/defaults";
import {
  SAMPLE_QUESTIONNAIRE_TEXT,
  SAMPLE_ANSWER_KEY_TEXT,
} from "../data/sampleMarkdownPaper";
import { MarkdownFormatGuideModal } from "./MarkdownFormatGuideModal";
import {
  MARKDOWN_PAPER_TEMPLATE,
  ANSWER_KEY_TEMPLATE,
  AI_GENERATION_PROMPT,
} from "../data/markdownHelperTemplates";

interface UploadViewProps {
  papers?: QuestionPaper[];
  onPaperUploaded: (paper: QuestionPaper) => void;
  onUpdatePaper?: (paper: QuestionPaper) => void;
  onDeletePaper?: (paperId: string) => void;
  onNavigatePapers: () => void;
  onStartExam?: (paper: QuestionPaper, mode: "practice" | "mock") => void;
}

export function UploadView({
  papers = [],
  onPaperUploaded,
  onUpdatePaper,
  onDeletePaper,
  onNavigatePapers,
  onStartExam,
}: UploadViewProps) {
  const { currentUser } = useApp();
  // Main View Mode: 'custom' (Fast practice upload) | 'preset' (Official UPSC) | 'update'
  const [viewMode, setViewMode] = useState<"custom" | "preset" | "update">(
    "custom",
  );

  // FAST CUSTOM PAPER STATES
  const [customPaperName, setCustomPaperName] = useState<string>("");
  const [customTotalQuestions, setCustomTotalQuestions] = useState<string>("");
  const [customPositiveMarks, setCustomPositiveMarks] = useState<string>("2");
  const [customNegativeMarks, setCustomNegativeMarks] =
    useState<string>("0.667");
  const [customTotalMarks, setCustomTotalMarks] = useState<string>("");
  const [customTotalMarksEdited, setCustomTotalMarksEdited] =
    useState<boolean>(false);
  const [customTimeMinutes, setCustomTimeMinutes] = useState<string>("");
  const [customQpFormat, setCustomQpFormat] = useState<"pdf" | "markdown">(
    "pdf",
  );
  const [customQpMarkdown, setCustomQpMarkdown] = useState<string>("");
  const [customQpFile, setCustomQpFile] = useState<File | null>(null);

  const detectedQuestions = useMemo(() => {
    if (!customQpMarkdown.trim()) return [];
    return parseQuestionnaireMarkdown(customQpMarkdown);
  }, [customQpMarkdown]);

  const detectedQuestionsCount = detectedQuestions.length;

  const detectedHeader = useMemo(() => {
    if (!customQpMarkdown.trim()) return null;
    const h = parseMarkdownHeader(customQpMarkdown);
    // Only return header if it has at least one structured field
    if (!h.exam && !h.subject && !h.instructions?.length && !h.time && !h.totalQuestions) return null;
    return h;
  }, [customQpMarkdown]);

  const handleApplyDetectedHeader = useCallback(() => {
    if (!detectedHeader) return;
    if (detectedHeader.exam) {
      setCustomPaperName(detectedHeader.exam);
    }
    if (detectedHeader.totalQuestions) {
      handleCustomQuestionsChange(String(detectedHeader.totalQuestions));
    }
    if (detectedHeader.totalMarks) {
      handleCustomTotalMarksChange(String(detectedHeader.totalMarks));
    }
    if (detectedHeader.time) {
      const mins = parseInt(detectedHeader.time, 10);
      if (!isNaN(mins) && mins > 0) {
        setCustomTimeMinutes(String(mins));
      }
    }
    if (detectedHeader.negativeMarking) {
      const match = detectedHeader.negativeMarking.match(/([\d\.]+)/);
      if (match) {
        setCustomNegativeMarks(match[1]);
      }
    }
  }, [detectedHeader]);

  const [customAkMode, setCustomAkMode] = useState<"upload" | "paste">("paste");
  const [customAkText, setCustomAkText] = useState<string>("");
  const [customAkFile, setCustomAkFile] = useState<File | null>(null);
  const [customExsFile, setCustomExsFile] = useState<File | null>(null);

  const detectedAnswerKey = useMemo(() => {
    if (!customAkText.trim()) return { answers: {}, explanations: {} };
    return parseAnswerKeyDetailed(customAkText);
  }, [customAkText]);

  const [showMarkdownPreview, setShowMarkdownPreview] = useState<boolean>(true);
  const [formatGuideModalOpen, setFormatGuideModalOpen] = useState<boolean>(false);
  const [formatGuideModalTab, setFormatGuideModalTab] = useState<"template" | "ai_prompt">("template");

  // Selected paper for update mode
  const [selectedPaperId, setSelectedPaperId] = useState<string>(
    papers[0]?.id || "",
  );
  const [paperSearchQuery, setPaperSearchQuery] = useState<string>("");
  const [isSearchSelectOpen, setIsSearchSelectOpen] = useState<boolean>(false);

  // Filtered papers for Search-Select component in Update mode
  const filteredUpdatePapers = useMemo(() => {
    if (!paperSearchQuery.trim()) return papers;
    const q = paperSearchQuery.toLowerCase().trim();
    return papers.filter((p) => {
      const displayTitle = getPaperDisplayTitle(p).toLowerCase();
      const label = (p.label || "").toLowerCase();
      const subject = (p.subject || "").toLowerCase();
      const year = (p.year || "").toLowerCase();
      const id = (p.id || "").toLowerCase();
      return (
        displayTitle.includes(q) ||
        label.includes(q) ||
        subject.includes(q) ||
        year.includes(q) ||
        id.includes(q)
      );
    });
  }, [papers, paperSearchQuery]);

  // Preset Mode: Step 1 Exam Type
  const [examType, setExamType] = useState<ExamType>("objective");

  // Preset Mode: Paper rules & metadata
  const [year, setYear] = useState<string>("2026");
  const [subjectPreset, setSubjectPreset] = useState<string>("GS I");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [paperIdentifier, setPaperIdentifier] =
    useState<string>("prelims_gs_i");

  const [totalQuestions, setTotalQuestions] = useState<number>(100);
  const [totalMarks, setTotalMarks] = useState<number>(200);
  const [correctMarks, setCorrectMarks] = useState<number>(2.0);
  const [incorrectMarks, setIncorrectMarks] = useState<number>(0.667);
  const [timeMinutes, setTimeMinutes] = useState<number>(120);

  // Preset Mode Files
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [akFile, setAkFile] = useState<File | null>(null);
  const [akMode, setAkMode] = useState<"upload" | "paste">("paste");
  const [akText, setAkText] = useState<string>("");
  const [exsFile, setExsFile] = useState<File | null>(null);

  const [statusMsg, setStatusMsg] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Auto-fill rules based on preset selection
  const handlePresetChange = (preset: string) => {
    setSubjectPreset(preset);
    if (preset === "GS I") {
      setTotalQuestions(100);
      setTotalMarks(200);
      setCorrectMarks(2.0);
      setIncorrectMarks(0.667);
      setTimeMinutes(120);
      if (!paperIdentifier) setPaperIdentifier("UPSC Prelims GS I");
    } else if (preset === "GS II CSAT") {
      setTotalQuestions(80);
      setTotalMarks(200);
      setCorrectMarks(2.5);
      setIncorrectMarks(0.833);
      setTimeMinutes(120);
      if (!paperIdentifier) setPaperIdentifier("UPSC Prelims GS II CSAT");
    } else if (preset.startsWith("Mains")) {
      setTotalQuestions(20);
      setTotalMarks(250);
      setCorrectMarks(0);
      setIncorrectMarks(0);
      setTimeMinutes(180);
      if (!paperIdentifier) setPaperIdentifier(preset);
    } else if (preset === "Custom") {
      if (!paperIdentifier) {
        setPaperIdentifier(
          examType === "objective"
            ? "Custom Practice Test"
            : "Custom Mains Paper",
        );
      }
    }
  };

  const handleExamTypeChange = (type: ExamType) => {
    setExamType(type);
    if (type === "objective") {
      handlePresetChange("GS I");
    } else {
      handlePresetChange("Mains GS I");
    }
  };

  // Fast custom paper handlers with automatic Total Marks calculation (user can override)
  const handleCustomQuestionsChange = (val: string) => {
    setCustomTotalQuestions(val);
    if (!customTotalMarksEdited) {
      const q = parseFloat(val);
      const pos = parseFloat(customPositiveMarks);
      if (!isNaN(q) && q > 0 && !isNaN(pos) && pos > 0) {
        setCustomTotalMarks(String(Math.round(q * pos * 10) / 10));
      } else if (!val) {
        setCustomTotalMarks("");
      }
    }
  };

  const handleCustomPositiveMarksChange = (val: string) => {
    setCustomPositiveMarks(val);
    if (!customTotalMarksEdited) {
      const q = parseFloat(customTotalQuestions);
      const pos = parseFloat(val);
      if (!isNaN(q) && q > 0 && !isNaN(pos) && pos > 0) {
        setCustomTotalMarks(String(Math.round(q * pos * 10) / 10));
      } else if (!val) {
        setCustomTotalMarks("");
      }
    }
  };

  const handleCustomTotalMarksChange = (val: string) => {
    setCustomTotalMarksEdited(true);
    setCustomTotalMarks(val);
  };

  // Load selected paper data into form when in Update mode
  const handleSelectPaperToUpdate = (paperId: string) => {
    setSelectedPaperId(paperId);
    const p = papers.find((x) => x.id === paperId);
    if (!p) return;

    setYear(p.year);
    setExamType(p.examType);
    setTotalQuestions(p.totalQuestions);
    setTotalMarks(p.totalMarks);
    setCorrectMarks(p.correctMarks);
    setIncorrectMarks(p.incorrectMarks);
    setTimeMinutes(p.timeMinutes);
    setPaperIdentifier(p.id.replace(/^[0-9]+_/, ""));
    setSubjectPreset(p.subject);
    setAkText(p.answerKeyText || "");
    setQpFile(null);
    setAkFile(null);
    setExsFile(null);
    setStatusMsg(null);
  };

  const currentSelectedPaper = papers.find((p) => p.id === selectedPaperId);

  const cleanYear = year.replace(/[^0-9]/g, "");
  const cleanName = paperIdentifier
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  // Handle uploading NEW paper
  const handleUploadNewPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanYear || !cleanName) {
      setStatusMsg({
        text: "Please enter a valid Year and Paper Identifier.",
        isError: true,
      });
      return;
    }
    if (!qpFile) {
      setStatusMsg({
        text: "Please attach a Question Paper PDF file.",
        isError: true,
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const displaySubject =
        subjectPreset === "Custom"
          ? customSubject.trim() || "Custom Paper"
          : subjectPreset;

      const userIdentifier = paperIdentifier.trim();
      const paperTitle =
        userIdentifier ||
        (subjectPreset === "Custom" ? customSubject.trim() : "") ||
        `${cleanYear} – ${displaySubject}`;

      const formData = new FormData();
      formData.append("year", cleanYear);
      formData.append("identifier", userIdentifier || cleanName);
      formData.append("examType", examType);
      formData.append("subject", userIdentifier || displaySubject);
      formData.append("label", paperTitle);
      formData.append("title", paperTitle);
      formData.append("isCustom", "true");
      formData.append(
        "totalQuestions",
        String(totalQuestions || (examType === "objective" ? 100 : 20)),
      );
      formData.append(
        "totalMarks",
        String(
          totalMarks ||
            (examType === "objective"
              ? (totalQuestions || 100) * (correctMarks || 2)
              : 250),
        ),
      );
      formData.append(
        "correctMarks",
        String(examType === "objective" ? correctMarks : 0),
      );
      formData.append(
        "incorrectMarks",
        String(examType === "objective" ? incorrectMarks : 0),
      );
      formData.append(
        "timeMinutes",
        String(timeMinutes || (examType === "objective" ? 120 : 180)),
      );

      formData.append("qpFile", qpFile);
      if (akFile && akMode === "upload") {
        formData.append("akFile", akFile);
      }
      if (akText && akMode === "paste") {
        formData.append("answerKeyText", akText);
      }
      if (exsFile) {
        formData.append("exsFile", exsFile);
      }
      if (currentUser?.id) {
        formData.append("userId", currentUser.id);
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Server failed to save paper.");
      }

      const newPaper: QuestionPaper = data.paper;
      saveCustomPaper(newPaper);
      onPaperUploaded(newPaper);

      setStatusMsg({
        text: `Paper saved successfully: "${newPaper.label}" (${newPaper.totalQuestions} Questions).`,
      });
      setTimeout(() => {
        onNavigatePapers();
      }, 1000);
    } catch (err: any) {
      setStatusMsg({
        text: err.message || "Failed to save paper.",
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle FAST CUSTOM paper upload (Nothing prefilled, instant practice setup)
  const handleUploadFastCustomPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = customPaperName.trim();
    const parsedQCount = parseInt(customTotalQuestions, 10);
    const qCount =
      !isNaN(parsedQCount) && parsedQCount > 0
        ? parsedQCount
        : customQpFormat === "markdown"
          ? detectedQuestionsCount
          : 0;

    const parsedPos = parseFloat(customPositiveMarks);
    const posMarks = !isNaN(parsedPos) && parsedPos >= 0 ? parsedPos : 2.0;

    const parsedNeg = parseFloat(customNegativeMarks);
    const negMarks = !isNaN(parsedNeg) && parsedNeg >= 0 ? parsedNeg : 0.667;

    const time = parseInt(customTimeMinutes, 10) || 120;

    if (!name) {
      setStatusMsg({
        text: "Please enter the Name of the paper.",
        isError: true,
      });
      return;
    }
    if (!qCount || qCount <= 0) {
      setStatusMsg({
        text: "Please enter or provide questions (e.g. 5, 50, 100 MCQs).",
        isError: true,
      });
      return;
    }

    if (customQpFormat === "pdf" && !customQpFile) {
      setStatusMsg({
        text: "Please attach the Question Paper PDF file.",
        isError: true,
      });
      return;
    }

    if (customQpFormat === "markdown" && !customQpMarkdown.trim()) {
      setStatusMsg({
        text: "Please provide the questions in Markdown/Text format.",
        isError: true,
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const parsedTotalMarks = parseFloat(customTotalMarks);
      const finalTotalMarks =
        !isNaN(parsedTotalMarks) && parsedTotalMarks > 0
          ? parsedTotalMarks
          : Math.round(qCount * posMarks * 10) / 10 || 100;

      // MARKDOWN FORMAT PATH: Local interactive question paper
      if (customQpFormat === "markdown") {
        const parsedQuestions = parseQuestionnaireMarkdown(customQpMarkdown);
        if (parsedQuestions.length === 0) {
          throw new Error(
            "Could not detect questions. Separate each question with '---' and specify options (a), (b), (c), (d).",
          );
        }

        // Parse header block (EXAM:, INSTRUCTIONS:, etc.) for instructions metadata
        const mdHeader = parseMarkdownHeader(customQpMarkdown);

        // Reuse existing answer key parser & text
        const { answers, explanations } = parseAnswerKeyDetailed(customAkText);
        const paperId = `custom_md_${Date.now()}`;

        let newPaper: QuestionPaper = {
          id: paperId,
          year: String(new Date().getFullYear()),
          category: "prelims",
          examType: "objective",
          subject: name,
          label: name,
          title: name,
          totalQuestions: qCount,
          totalMarks: finalTotalMarks,
          correctMarks: posMarks,
          incorrectMarks: negMarks,
          timeMinutes: time,
          qpUrl: "local://interactive_markdown",
          answerKey: answers,
          explanations: explanations,
          parsedQuestions: parsedQuestions,
          markdownContent: customQpMarkdown,
          answerKeyText: customAkText,
          isCustom: true,
          userId: currentUser?.id,
          instructions: mdHeader.instructions,
        };

        // Sync to server upload API so it is saved in papers.json and Supabase
        try {
          const curYear = String(new Date().getFullYear());
          const formData = new FormData();
          formData.append("year", curYear);
          formData.append("identifier", name);
          formData.append("examType", "objective");
          formData.append("subject", name);
          formData.append("label", name);
          formData.append("title", name);
          formData.append("totalQuestions", String(qCount));
          formData.append("totalMarks", String(finalTotalMarks));
          formData.append("correctMarks", String(posMarks));
          formData.append("incorrectMarks", String(negMarks));
          formData.append("timeMinutes", String(time));
          formData.append("isCustom", "true");
          formData.append("markdownContent", customQpMarkdown);
          formData.append("parsedQuestions", JSON.stringify(parsedQuestions));
          if (customAkText.trim()) {
            formData.append("answerKeyText", customAkText.trim());
          }
          if (currentUser?.id) {
            formData.append("userId", currentUser.id);
          }

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (res.ok && data.ok && data.paper) {
            newPaper = { ...newPaper, ...data.paper };
          }
        } catch (serverErr) {
          console.warn(
            "Could not sync markdown paper to server, using local store:",
            serverErr,
          );
        }

        saveCustomPaper(newPaper);
        onPaperUploaded(newPaper);

        setStatusMsg({
          text: `Paper "${newPaper.label}" (${newPaper.totalQuestions} Questions) saved! Starting Practice...`,
        });
        setTimeout(() => {
          if (onStartExam) {
            onStartExam(newPaper, "practice");
          } else {
            onNavigatePapers();
          }
        }, 700);
        return;
      }

      // PDF FORMAT PATH: Existing server upload
      const curYear = String(new Date().getFullYear());
      const formData = new FormData();
      formData.append("year", curYear);
      formData.append("identifier", name);
      formData.append("examType", "objective");
      formData.append("subject", name);
      formData.append("label", name);
      formData.append("title", name);
      formData.append("totalQuestions", String(qCount));
      formData.append("totalMarks", String(finalTotalMarks));
      formData.append("correctMarks", String(posMarks));
      formData.append("incorrectMarks", String(negMarks));
      formData.append("timeMinutes", String(time));
      formData.append("isCustom", "true");

      if (customQpFile) {
        formData.append("qpFile", customQpFile);
      }
      if (customAkFile && customAkMode === "upload") {
        formData.append("akFile", customAkFile);
      }
      if (customAkText.trim() && customAkMode === "paste") {
        formData.append("answerKeyText", customAkText.trim());
      }
      if (customExsFile) {
        formData.append("exsFile", customExsFile);
      }
      if (currentUser?.id) {
        formData.append("userId", currentUser.id);
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Server failed to save paper.");
      }

      const newPaper: QuestionPaper = data.paper;
      saveCustomPaper(newPaper);
      onPaperUploaded(newPaper);

      setStatusMsg({
        text: `Custom paper "${newPaper.label}" (${newPaper.totalQuestions} Questions) saved! Redirecting to Papers...`,
      });
      setTimeout(() => {
        onNavigatePapers();
      }, 900);
    } catch (err: any) {
      setStatusMsg({
        text: err.message || "Failed to save custom paper.",
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle UPDATING existing paper files or rules
  const handleUpdateExistingPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedPaper) {
      setStatusMsg({ text: "Please select a paper to update.", isError: true });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const formData = new FormData();
      if (qpFile) {
        formData.append("qpFile", qpFile);
      }
      if (akFile && akMode === "upload") {
        formData.append("akFile", akFile);
      } else if (akMode === "paste" && akText.trim()) {
        formData.append("answerKeyText", akText.trim());
      }
      if (exsFile) {
        formData.append("exsFile", exsFile);
      }

      formData.append("totalQuestions", String(totalQuestions));
      formData.append("totalMarks", String(totalMarks));
      formData.append("correctMarks", String(correctMarks));
      formData.append("incorrectMarks", String(incorrectMarks));
      formData.append("timeMinutes", String(timeMinutes));

      const updated = await attachToPaperOnServer(
        currentSelectedPaper.id,
        formData,
      );
      if (updated) {
        if (onUpdatePaper) onUpdatePaper(updated);
        setStatusMsg({
          text: `Successfully updated files and rules for "${updated.label}".`,
        });
        setQpFile(null);
        setAkFile(null);
        setExsFile(null);
      } else {
        throw new Error("Failed to update paper files on server.");
      }
    } catch (err: any) {
      setStatusMsg({
        text: err.message || "Failed to update paper.",
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60 font-mono">
              Paper Intake & Management Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Question Papers Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Upload new papers or correct files (Question Paper PDF, Answer Key,
            Solution) on existing papers.
          </p>
        </div>

        {/* View Mode Toggle: Fast Custom Upload vs UPSC Preset vs Update Existing */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setViewMode("custom");
              setStatusMsg(null);
            }}
            className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              viewMode === "custom"
                ? "bg-white text-indigo-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Zap className="h-4 w-4 text-amber-500 fill-amber-400" />
            <span>Fast Custom Paper</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("preset");
              setStatusMsg(null);
            }}
            className={`cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors ${
              viewMode === "preset"
                ? "bg-white text-indigo-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders className="h-4 w-4 text-slate-500" />
            <span>Official UPSC Preset</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("update");
              if (papers.length > 0 && !selectedPaperId) {
                handleSelectPaperToUpdate(papers[0].id);
              } else if (selectedPaperId) {
                handleSelectPaperToUpdate(selectedPaperId);
              }
              setStatusMsg(null);
            }}
            className={`cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors ${
              viewMode === "update"
                ? "bg-white text-indigo-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Edit3 className="h-4 w-4" />
            <span>Update / Correct Paper</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3.5 text-xs font-semibold border ${
            statusMsg.isError
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {statusMsg.isError ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 1: UPDATE / CORRECT EXISTING PAPER */}
      {/* ============================================================== */}
      {viewMode === "update" && (
        <div className="space-y-6">
          <div className="bi-card p-6 space-y-4">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Paper to Update or Correct
              </label>

              {/* Search-Select Interactive Trigger */}
              <button
                type="button"
                onClick={() => setIsSearchSelectOpen((prev) => !prev)}
                className="cursor-pointer w-full flex items-center justify-between rounded-xl border border-slate-300 bg-white hover:bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0 border border-indigo-100">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="text-left truncate">
                    {currentSelectedPaper ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">
                          {getPaperDisplayTitle(currentSelectedPaper)}
                        </span>
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {currentSelectedPaper.year} •{" "}
                          {currentSelectedPaper.subject} •{" "}
                          {currentSelectedPaper.totalQuestions} Qs
                        </span>
                        {isUserUploadedPaper(currentSelectedPaper) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            User Paper
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal">
                        Click to search and select a paper...
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isSearchSelectOpen ? "rotate-180 text-indigo-600" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Search-Select Popover Menu */}
              {isSearchSelectOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsSearchSelectOpen(false)}
                  />
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl animate-in fade-in duration-150">
                    {/* Live search input filter */}
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        value={paperSearchQuery}
                        onChange={(e) => setPaperSearchQuery(e.target.value)}
                        placeholder="Search paper name, subject, year..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      {paperSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setPaperSearchQuery("")}
                          className="cursor-pointer absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filtered List of Papers */}
                    <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                      {filteredUpdatePapers.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No papers found matching &quot;{paperSearchQuery}
                          &quot;
                        </div>
                      ) : (
                        filteredUpdatePapers.map((p) => {
                          const isSelected = p.id === selectedPaperId;
                          const isUser = isUserUploadedPaper(p);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                handleSelectPaperToUpdate(p.id);
                                setIsSearchSelectOpen(false);
                                setPaperSearchQuery("");
                              }}
                              className={`cursor-pointer w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                                isSelected
                                  ? "bg-indigo-50/90 text-indigo-900 font-bold border border-indigo-200"
                                  : "hover:bg-slate-50 text-slate-700 border border-transparent"
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-slate-900">
                                    {getPaperDisplayTitle(p)}
                                  </span>
                                  {isUser ? (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                      User Upload
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                      {p.category.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                                  {p.year} • {p.subject} • {p.totalQuestions} Qs
                                  • {p.timeMinutes || 120} mins
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="h-4 w-4 text-indigo-600 shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {currentSelectedPaper && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Question Paper PDF
                  </span>
                  <a
                    href={currentSelectedPaper.qpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 mt-0.5"
                  >
                    <ExternalLink className="h-3 w-3" /> Preview Current PDF
                  </a>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Answer Key Status
                  </span>
                  {hasAnswerKey(currentSelectedPaper) ? (
                    <span className="text-emerald-700 font-bold inline-flex items-center gap-1 mt-0.5">
                      <Check className="h-3.5 w-3.5" /> Attached (
                      {Object.keys(currentSelectedPaper.answerKey || {})
                        .length || currentSelectedPaper.totalQuestions}{" "}
                      Qs)
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold inline-flex items-center gap-1 mt-0.5">
                      <AlertCircle className="h-3.5 w-3.5" /> No Answer Key
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Detailed Solution
                  </span>
                  {hasSolution(currentSelectedPaper) ? (
                    <a
                      href={currentSelectedPaper.exsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 mt-0.5"
                    >
                      <ExternalLink className="h-3 w-3" /> Attached (PDF)
                    </a>
                  ) : (
                    <span className="text-slate-400 inline-flex items-center gap-1 mt-0.5">
                      Not Uploaded
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {currentSelectedPaper && (
            <form onSubmit={handleUpdateExistingPaper} className="space-y-6">
              {/* Replace Files Section */}
              <div className="bi-card p-6 space-y-4">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Replace or Upload Files
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Replace QP PDF */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      Replace Question Paper PDF
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Upload a new PDF to overwrite the existing paper document.
                    </p>

                    <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center hover:border-indigo-500 hover:bg-slate-50 transition-colors shadow-2xs">
                      <FileUp className="h-6 w-6 text-indigo-600 mb-1" />
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[220px]">
                        {qpFile ? qpFile.name : "Choose Replacement PDF"}
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setQpFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Replace Solution PDF */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      Upload / Replace Solution PDF
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Attach or update the official solution booklet.
                    </p>

                    <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center hover:border-slate-500 hover:bg-slate-50 transition-colors shadow-2xs">
                      <FileUp className="h-6 w-6 text-slate-500 mb-1" />
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[220px]">
                        {exsFile ? exsFile.name : "Choose Solution PDF"}
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) =>
                          setExsFile(e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Answer Key (Objective) */}
                {currentSelectedPaper.examType === "objective" && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800">
                          Update Answer Key
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Provide corrected answer choices for automatic
                          evaluation.
                        </p>
                      </div>

                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setAkMode("paste")}
                          className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                            akMode === "paste"
                              ? "bg-white text-indigo-700 font-bold shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Paste Text
                        </button>
                        <button
                          type="button"
                          onClick={() => setAkMode("upload")}
                          className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                            akMode === "upload"
                              ? "bg-white text-indigo-700 font-bold shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Upload .txt
                        </button>
                      </div>
                    </div>

                    {akMode === "upload" ? (
                      <label className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs font-semibold text-slate-700 hover:border-slate-500 shadow-2xs">
                        <FileUp className="h-4 w-4 text-slate-500" />
                        <span>
                          {akFile ? akFile.name : "Select .txt answer key file"}
                        </span>
                        <input
                          type="file"
                          accept=".txt"
                          onChange={(e) =>
                            setAkFile(e.target.files?.[0] || null)
                          }
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="space-y-1.5">
                        <textarea
                          value={akText}
                          onChange={(e) => setAkText(e.target.value)}
                          placeholder={`1. a,\n2. c """ Explanations can be enclosed in triple quotes """,\n3. d,\n4. b """ multiline\nexplanation also supported """`}
                          rows={6}
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs leading-relaxed"
                        />
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Format:{" "}
                          <code className="font-mono bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[10px]">
                            1. a,
                          </code>{" "}
                          or with explanation:{" "}
                          <code className="font-mono bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[10px]">
                            1. a &quot;&quot;&quot; optional explanation
                            &quot;&quot;&quot;,
                          </code>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Adjust Rules */}
              <div className="bi-card p-6 space-y-4">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Adjust Rules & Duration
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Total Questions
                    </label>
                    <input
                      type="number"
                      value={totalQuestions}
                      onChange={(e) =>
                        setTotalQuestions(parseInt(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Duration (Mins)
                    </label>
                    <input
                      type="number"
                      value={timeMinutes}
                      onChange={(e) =>
                        setTimeMinutes(parseInt(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  {currentSelectedPaper.examType === "objective" && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Correct Marks (+)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={correctMarks}
                          onChange={(e) =>
                            setCorrectMarks(parseFloat(e.target.value) || 0)
                          }
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Penalty (-)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={incorrectMarks}
                          onChange={(e) =>
                            setIncorrectMarks(parseFloat(e.target.value) || 0)
                          }
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2">
                {onDeletePaper ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete This Paper</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs disabled:opacity-40 transition-all"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isSubmitting ? "animate-spin" : ""}`}
                  />
                  <span>
                    {isSubmitting
                      ? "Saving Updates..."
                      : "Save Updates & Replace Files"}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Delete Confirm Modal */}
          {showDeleteConfirm && currentSelectedPaper && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 shrink-0">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Delete Question Paper?
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Are you sure you want to permanently delete &quot;
                      {currentSelectedPaper.label}&quot;?
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeletePaper) onDeletePaper(currentSelectedPaper.id);
                      setShowDeleteConfirm(false);
                      onNavigatePapers();
                    }}
                    className="cursor-pointer px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-all shadow-xs"
                  >
                    Delete Paper
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 1: FAST CUSTOM PRACTICE PAPER (NOTHING PREFILLED) */}
      {/* ============================================================== */}
      {viewMode === "custom" && (
        <form onSubmit={handleUploadFastCustomPaper} className="space-y-6">
          {/* Section 1: Paper Details & Scoring Rules */}
          <div className="bi-card p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-200/60">
                  <Zap className="h-4 w-4 text-amber-500 fill-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Fast Custom Practice Paper
                  </h2>
                  <p className="text-xs text-slate-500">
                    Direct practice upload. Name, total questions, positive &
                    negative marking — no presets, nothing prefilled.
                  </p>
                </div>
              </div>
            </div>

            {/* Paper Title / Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Name of the Paper <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customPaperName}
                onChange={(e) => setCustomPaperName(e.target.value)}
                placeholder="e.g. Vision IAS Full Length Mock 1 / Forum IAS Simulator 2 / Modern History Test"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
                required
                autoFocus
              />
            </div>

            {/* Rules Grid: Total Questions, Positive Marks, Negative Marks, Total Marks, Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Total Questions <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={customTotalQuestions}
                  onChange={(e) => handleCustomQuestionsChange(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  e.g. 50, 100 MCQs
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Positive Marks (+) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={customPositiveMarks}
                  onChange={(e) =>
                    handleCustomPositiveMarksChange(e.target.value)
                  }
                  placeholder="e.g. 2"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Per correct answer
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Negative Penalty (-) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={customNegativeMarks}
                  onChange={(e) => setCustomNegativeMarks(e.target.value)}
                  placeholder="e.g. 0.667 or 0"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Per wrong MCQ (0 if none)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Total Marks <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={customTotalMarks}
                  onChange={(e) => handleCustomTotalMarksChange(e.target.value)}
                  placeholder="e.g. 200 or 100"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Max marks (customizable)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Time (Minutes){" "}
                  <span className="text-slate-400 font-normal">(Opt)</span>
                </label>
                <input
                  type="number"
                  value={customTimeMinutes}
                  onChange={(e) => setCustomTimeMinutes(e.target.value)}
                  placeholder="120"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Defaults to 120 mins
                </span>
              </div>
            </div>

            {/* Live Calculation Preview Banner */}
            {Boolean(
              customTotalQuestions && (customPositiveMarks || customTotalMarks),
            ) && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
                <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">Paper Scoring Scheme:</span>
                  <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                    {customTotalMarks ||
                      Math.round(
                        Number(customTotalQuestions) *
                          Number(customPositiveMarks) *
                          10,
                      ) / 10 ||
                      0}{" "}
                    Total Marks
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>{customTotalQuestions} MCQs</span>
                  <span className="text-slate-400">•</span>
                  <span>
                    +{customPositiveMarks || 0} / -{customNegativeMarks || 0}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>{customTimeMinutes || 120} Mins</span>
                  {customTotalMarksEdited && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      User Defined
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Documents & Answer Key */}
          <div className="bi-card p-6 space-y-5">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Documents & Answer Keys
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Question Paper: Format selector (PDF or Interactive Markdown) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Question Paper
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 font-mono ml-2">
                      Required
                    </span>
                  </div>

                  {/* Format Toggle */}
                  <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setCustomQpFormat("pdf")}
                      className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                        customQpFormat === "pdf"
                          ? "bg-white text-indigo-700 font-bold shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      PDF File
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomQpFormat("markdown");
                        if (!customPositiveMarks) setCustomPositiveMarks("2");
                        if (!customNegativeMarks)
                          setCustomNegativeMarks("0.667");
                      }}
                      className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                        customQpFormat === "markdown"
                          ? "bg-white text-purple-700 font-bold shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Markdown / Text
                    </button>
                  </div>
                </div>

                {customQpFormat === "pdf" ? (
                  <>
                    <p className="text-[11px] text-slate-500">
                      Official practice / coaching test paper in PDF format.
                    </p>

                    <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center hover:border-indigo-500 hover:bg-slate-50 transition-colors shadow-2xs">
                      <FileUp className="h-6 w-6 text-indigo-600 mb-1" />
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[220px]">
                        {customQpFile
                          ? customQpFile.name
                          : "Choose Question Paper PDF"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {customQpFile
                          ? `${(customQpFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace`
                          : "Click to browse (.pdf)"}
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) =>
                          setCustomQpFile(e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />
                    </label>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-[11px] text-slate-500">
                        Optional header (EXAM:, INSTRUCTIONS:) above first{" "}
                        <code className="font-mono bg-slate-200/60 px-1 py-0.5 rounded text-[10px]">---</code>.
                        Each question block separated by{" "}
                        <code className="font-mono bg-slate-200/60 px-1 py-0.5 rounded text-[10px]">---</code>.
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Format Guide / Template Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setFormatGuideModalTab("template");
                            setFormatGuideModalOpen(true);
                          }}
                          className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs transition-colors shrink-0"
                          title="View exact markdown rules, formatting structure, and question paper template"
                        >
                          <FileCode className="h-3 w-3 text-indigo-600" />
                          <span>Format Template</span>
                        </button>

                        {/* Pre-made AI Prompt Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setFormatGuideModalTab("ai_prompt");
                            setFormatGuideModalOpen(true);
                          }}
                          className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-md border border-purple-200 shadow-2xs transition-colors shrink-0"
                          title="Copy a pre-made prompt for ChatGPT, Claude, or Gemini to generate tests in our exact format"
                        >
                          <Sparkles className="h-3 w-3 text-purple-600" />
                          <span>AI Prompt Helper</span>
                        </button>

                        {/* Load Sample Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setCustomPaperName(
                              "2026 – High-Yield Mock (Markdown Interactive)",
                            );
                            setCustomTotalQuestions("5");
                            setCustomPositiveMarks("2");
                            setCustomNegativeMarks("0.667");
                            setCustomTotalMarks("10");
                            setCustomTimeMinutes("15");
                            setCustomQpMarkdown(SAMPLE_QUESTIONNAIRE_TEXT);
                            setCustomAkText(SAMPLE_ANSWER_KEY_TEXT);
                            setShowMarkdownPreview(true);
                          }}
                          className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 bg-transparent hover:bg-slate-100 px-2 py-1 rounded-md transition-colors shrink-0"
                          title="Load 5 pre-made sample questions into the form"
                        >
                          <span>Load Sample</span>
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={customQpMarkdown}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomQpMarkdown(val);
                        const count = parseQuestionnaireMarkdown(val).length;
                        if (count > 0) {
                          handleCustomQuestionsChange(String(count));
                        }
                      }}
                      placeholder={`EXAM: My Mock Test\nSUBJECT: General Studies\nINSTRUCTIONS:\n- Each question carries 2 marks\n- 1/3rd negative marking\n---\nQuestion text here...\n(a) Option A\n(b) Option B\n(c) Option C\n(d) Option D\n---\nSecond question...\n(a) Option A\n(b) Option B\n(c) Option C\n(d) Option D`}
                      rows={8}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 shadow-2xs leading-relaxed"
                    />

                    {/* Exam Rules & Info Banner — Prominently styled */}
                    {detectedHeader && (
                      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/70 p-4 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-indigo-100">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-2xs">
                              <BookOpen className="h-4 w-4" />
                            </span>
                            <div>
                              <span className="text-xs font-black text-indigo-950 uppercase tracking-wide block">
                                Exam Rules & Test Specifications Detected
                              </span>
                              <span className="text-[10px] text-indigo-600/80 font-medium">
                                Auto-parsed from markdown header above first ---
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleApplyDetectedHeader}
                            className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-100/90 hover:bg-indigo-200 px-3 py-1.5 rounded-xl border border-indigo-200 transition-colors shadow-2xs"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Auto-Fill Form from Rules</span>
                          </button>
                        </div>

                        {/* Metadata chips */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {detectedHeader.exam && (
                            <div className="bg-white/90 rounded-xl border border-indigo-100 p-2.5 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Exam Name
                              </span>
                              <span className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5 block">
                                {detectedHeader.exam}
                              </span>
                            </div>
                          )}
                          {detectedHeader.subject && (
                            <div className="bg-white/90 rounded-xl border border-indigo-100 p-2.5 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Subject
                              </span>
                              <span className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5 block">
                                {detectedHeader.subject}
                              </span>
                            </div>
                          )}
                          {detectedHeader.time && (
                            <div className="bg-white/90 rounded-xl border border-indigo-100 p-2.5 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Time Limit
                              </span>
                              <span className="text-xs font-bold text-indigo-700 font-mono mt-0.5 block">
                                {detectedHeader.time}
                              </span>
                            </div>
                          )}
                          {detectedHeader.totalQuestions && (
                            <div className="bg-white/90 rounded-xl border border-indigo-100 p-2.5 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Questions
                              </span>
                              <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block">
                                {detectedHeader.totalQuestions} MCQs
                              </span>
                            </div>
                          )}
                          {detectedHeader.totalMarks && (
                            <div className="bg-white/90 rounded-xl border border-indigo-100 p-2.5 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Total Marks
                              </span>
                              <span className="text-xs font-bold text-emerald-700 font-mono mt-0.5 block">
                                {detectedHeader.totalMarks} Marks
                              </span>
                            </div>
                          )}
                          {detectedHeader.negativeMarking && (
                            <div className="bg-white/90 rounded-xl border border-indigo-100 p-2.5 shadow-2xs">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Negative Penalty
                              </span>
                              <span className="text-xs font-bold text-rose-700 font-mono mt-0.5 block">
                                {detectedHeader.negativeMarking}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Rules / Instructions list */}
                        {detectedHeader.instructions && detectedHeader.instructions.length > 0 && (
                          <div className="bg-white/85 rounded-xl border border-indigo-100 p-3 space-y-1.5">
                            <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                              Exam Instructions & Rules:
                            </span>
                            <ul className="space-y-1">
                              {detectedHeader.instructions.map((rule, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{rule}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px]">
                      {detectedQuestionsCount > 0 ? (
                        <span className="font-semibold text-emerald-700 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />
                          {detectedQuestionsCount} Questions Detected
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Paste or upload your questionnaire above
                        </span>
                      )}

                      <label className="cursor-pointer text-indigo-600 hover:underline font-semibold inline-flex items-center gap-1">
                        <FileUp className="h-3 w-3" />
                        <span>Upload .md / .txt</span>
                        <input
                          type="file"
                          accept=".md,.txt"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const text = await file.text();
                              setCustomQpMarkdown(text);
                              const count =
                                parseQuestionnaireMarkdown(text).length;
                              if (count > 0) {
                                handleCustomQuestionsChange(String(count));
                              }
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Solution Booklet PDF (Optional) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Solution Booklet
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-medium">
                    Optional
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Optional detailed explanations or hints PDF document.
                </p>

                <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center hover:border-slate-500 hover:bg-slate-50 transition-colors shadow-2xs">
                  <FileUp className="h-6 w-6 text-slate-500 mb-1" />
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[220px]">
                    {customExsFile ? customExsFile.name : "Choose Solution PDF"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {customExsFile
                      ? `${(customExsFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace`
                      : "Optional (.pdf)"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) =>
                      setCustomExsFile(e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Answer Key (Paste text / upload) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 pt-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-slate-800">
                      Answer Key
                    </h3>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200/60">
                      Recommended for Practice
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Enables immediate correct/wrong answers feedback during
                    Practice mode & auto-evaluation.
                  </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setCustomAkMode("paste")}
                    className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                      customAkMode === "paste"
                        ? "bg-white text-indigo-700 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomAkMode("upload")}
                    className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                      customAkMode === "upload"
                        ? "bg-white text-indigo-700 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Upload .txt
                  </button>
                </div>
              </div>

              {customAkMode === "upload" ? (
                <label className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs font-semibold text-slate-700 hover:border-slate-500 shadow-2xs">
                  <FileUp className="h-4 w-4 text-slate-500" />
                  <span>
                    {customAkFile
                      ? customAkFile.name
                      : "Select .txt answer key file"}
                  </span>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={(e) =>
                      setCustomAkFile(e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-1.5">
                  <textarea
                    value={customAkText}
                    onChange={(e) => setCustomAkText(e.target.value)}
                    placeholder={`1. a,\n2. c """ Explanations can be enclosed in triple quotes """,\n3. d,\n4. b """ multiline\nexplanation also supported """`}
                    rows={5}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs leading-relaxed"
                  />
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Format:{" "}
                      <code className="font-mono bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[10px]">
                        1. a,
                      </code>{" "}
                      or with explanation:{" "}
                      <code className="font-mono bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[10px]">
                        1. a &quot;&quot;&quot; explanation &quot;&quot;&quot;
                      </code>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFormatGuideModalTab("template");
                          setFormatGuideModalOpen(true);
                        }}
                        className="cursor-pointer text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                      >
                        <FileCode className="h-3 w-3" />
                        <span>Key Template</span>
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormatGuideModalTab("ai_prompt");
                          setFormatGuideModalOpen(true);
                        }}
                        className="cursor-pointer text-[11px] font-semibold text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>AI Prompt</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Markdown Live Parser & Question Inspection */}
            {customQpFormat === "markdown" && (
              <div className="rounded-xl border border-purple-200/90 bg-gradient-to-b from-purple-50/50 to-white p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        Parser Inspection & Live Preview
                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full border border-purple-200">
                          Live Validation
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Real-time verification of parsed questions, options, and
                        answer keys.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {detectedQuestionsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowMarkdownPreview((prev) => !prev)}
                        className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 shadow-2xs transition-colors"
                      >
                        {showMarkdownPreview ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Hide Preview</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            <span>Show Preview ({detectedQuestionsCount})</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Questions Detected
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      {detectedQuestionsCount > 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-sm font-extrabold text-slate-800 font-mono">
                        {detectedQuestionsCount}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Answers Found
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      {Object.keys(detectedAnswerKey.answers).length > 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-300" />
                      )}
                      <span className="text-sm font-extrabold text-slate-800 font-mono">
                        {Object.keys(detectedAnswerKey.answers).length}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Explanations Found
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-extrabold text-slate-800 font-mono">
                        {Object.keys(detectedAnswerKey.explanations).length}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Key Alignment
                    </span>
                    <div className="mt-1">
                      {detectedQuestionsCount > 0 &&
                      detectedQuestionsCount ===
                        Object.keys(detectedAnswerKey.answers).length ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Check className="h-3 w-3" /> 100% Matched
                        </span>
                      ) : detectedQuestionsCount > 0 &&
                        Object.keys(detectedAnswerKey.answers).length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Partial (
                          {Object.keys(detectedAnswerKey.answers).length}/
                          {detectedQuestionsCount})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          {detectedQuestionsCount > 0
                            ? "Pending Key"
                            : "Awaiting Input"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Question Cards Accordion / List */}
                {detectedQuestionsCount > 0 ? (
                  showMarkdownPreview && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-1">
                        <span>Parsed Question Items:</span>
                        <span>{detectedQuestionsCount} questions ready</span>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {detectedQuestions.map((q) => {
                          const ansLetter =
                            detectedAnswerKey.answers[
                              q.questionNo
                            ]?.toUpperCase();
                          const explanation =
                            detectedAnswerKey.explanations[q.questionNo];

                          return (
                            <div
                              key={q.questionNo}
                              className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs hover:border-purple-300 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200">
                                    Q{q.questionNo}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {Object.keys(q.options).length} options
                                    detected
                                  </span>
                                </div>

                                {ansLetter ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    <Check className="h-3 w-3" /> Answer: Option{" "}
                                    {ansLetter}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    No answer key
                                  </span>
                                )}
                              </div>

                              {/* Question prompt */}
                              <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                                {q.text}
                              </p>

                              {/* Options grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {Object.entries(q.options).map(
                                  ([optKey, optText]) => {
                                    const isCorrect =
                                      ansLetter === optKey.toUpperCase();
                                    return (
                                      <div
                                        key={optKey}
                                        className={`flex items-start gap-2 p-2 rounded-lg border text-xs leading-relaxed transition-all ${
                                          isCorrect
                                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium shadow-2xs"
                                            : "bg-slate-50/70 border-slate-200 text-slate-700"
                                        }`}
                                      >
                                        <span
                                          className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                            isCorrect
                                              ? "bg-emerald-600 text-white"
                                              : "bg-slate-200 text-slate-700"
                                          }`}
                                        >
                                          {optKey}
                                        </span>
                                        <span className="whitespace-pre-wrap">
                                          {optText}
                                        </span>
                                      </div>
                                    );
                                  },
                                )}
                              </div>

                              {/* Explanation callout */}
                              {explanation && (
                                <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-2.5 text-xs text-amber-950 space-y-1">
                                  <div className="flex items-center gap-1 font-bold text-[11px] text-amber-800">
                                    <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                                    <span>Explanation:</span>
                                  </div>
                                  <p className="text-[11px] leading-relaxed whitespace-pre-wrap pl-4 text-amber-900">
                                    {explanation}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="rounded-xl border border-dashed border-purple-200 bg-purple-50/30 p-4 text-center space-y-2">
                    <p className="text-xs font-semibold text-slate-600">
                      Paste or upload your questions in the box above to see the
                      live preview.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Separate questions with{" "}
                      <code className="font-mono bg-white px-1 py-0.5 rounded border border-purple-200 text-purple-700">
                        ---
                      </code>{" "}
                      and label options as (a), (b), (c), (d).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomPaperName(
                          "2026 – High-Yield Mock (Markdown Interactive)",
                        );
                        setCustomTotalQuestions("5");
                        setCustomPositiveMarks("2");
                        setCustomNegativeMarks("0.667");
                        setCustomTotalMarks("10");
                        setCustomTimeMinutes("15");
                        setCustomQpMarkdown(SAMPLE_QUESTIONNAIRE_TEXT);
                        setCustomAkText(SAMPLE_ANSWER_KEY_TEXT);
                        setShowMarkdownPreview(true);
                      }}
                      className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-white hover:bg-purple-100 px-3 py-1 rounded-lg border border-purple-200 shadow-2xs transition-colors mt-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Load 5-Q Working Sample</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !customPaperName.trim() ||
                !(
                  customTotalQuestions.trim() ||
                  (customQpFormat === "markdown" && detectedQuestionsCount > 0)
                ) ||
                (customQpFormat === "pdf" && !customQpFile) ||
                (customQpFormat === "markdown" && !customQpMarkdown.trim())
              }
              className="cursor-pointer flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs disabled:opacity-40 transition-all"
            >
              <UploadCloud className="h-4 w-4" />
              {isSubmitting
                ? "Saving Paper..."
                : "Save Custom Paper & Start Practice"}
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* MODE 2: OFFICIAL UPSC PRESET (OPTIONAL ARCHIVAL) */}
      {/* ============================================================== */}
      {viewMode === "preset" && (
        <form onSubmit={handleUploadNewPaper} className="space-y-6">
          {/* Step 1: Exam Type Selector */}
          <div className="bi-card p-6 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Select Exam Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleExamTypeChange("objective")}
                className={`cursor-pointer p-4 rounded-xl border text-left transition-all ${
                  examType === "objective"
                    ? "border-indigo-500 bg-indigo-50/60 text-slate-900 shadow-xs ring-1 ring-indigo-500/20"
                    : "border-slate-200 bg-slate-50/60 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">
                    Objective (Prelims)
                  </span>
                  {examType === "objective" && (
                    <Check className="h-4.5 w-4.5 text-indigo-600" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Multiple-choice questions with interactive OMR sheet,
                  auto-evaluation, and negative marking.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleExamTypeChange("subjective")}
                className={`cursor-pointer p-4 rounded-xl border text-left transition-all ${
                  examType === "subjective"
                    ? "border-indigo-500 bg-indigo-50/60 text-slate-900 shadow-xs ring-1 ring-indigo-500/20"
                    : "border-slate-200 bg-slate-50/60 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">
                    Subjective (Mains)
                  </span>
                  {examType === "subjective" && (
                    <Check className="h-4.5 w-4.5 text-indigo-600" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Descriptive answer writing questions with post-exam
                  handwritten PDF submission.
                </p>
              </button>
            </div>
          </div>

          {/* Step 2: Paper Metadata & Scoring Rules */}
          <div className="bi-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-600" />
                2. Paper Metadata & Rules
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Year Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="cursor-pointer w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  {SUPPORTED_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Preset */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Paper Preset
                </label>
                <select
                  value={subjectPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="cursor-pointer w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  {examType === "objective" ? (
                    <>
                      <option value="GS I">
                        Prelims GS I (100 Qs • 200 Marks)
                      </option>
                      <option value="GS II CSAT">
                        Prelims GS II CSAT (80 Qs • 200 Marks)
                      </option>
                      <option value="Custom">Custom Objective Paper</option>
                    </>
                  ) : (
                    <>
                      <option value="Mains GS I">
                        Mains GS I (20 Qs • 250 Marks)
                      </option>
                      <option value="Mains GS II">
                        Mains GS II (20 Qs • 250 Marks)
                      </option>
                      <option value="Mains GS III">
                        Mains GS III (20 Qs • 250 Marks)
                      </option>
                      <option value="Mains GS IV">
                        Mains GS IV (Ethics • 250 Marks)
                      </option>
                      <option value="Mains Essay">
                        Mains Essay (250 Marks)
                      </option>
                      <option value="Custom">Custom Subjective Paper</option>
                    </>
                  )}
                </select>
              </div>

              {/* Paper Identifier */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Paper Title / Identifier
                </label>
                <input
                  type="text"
                  value={paperIdentifier}
                  onChange={(e) => setPaperIdentifier(e.target.value)}
                  placeholder="e.g. Vision IAS Mock 1, Polity Sectional, Test Series 4"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                  required
                />
              </div>
            </div>

            {/* Custom Subject Name if selected */}
            {subjectPreset === "Custom" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Subject / Paper Title
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => {
                    setCustomSubject(e.target.value);
                    const clean = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, "_")
                      .replace(/_+/g, "_");
                    if (clean) setPaperIdentifier(clean);
                  }}
                  placeholder="e.g. Sociology Optional Paper 1"
                  className="w-full rounded-xl border border-indigo-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  required
                />
              </div>
            )}

            {/* Marking scheme and rules grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Total Questions
                </label>
                <input
                  type="number"
                  value={totalQuestions}
                  onChange={(e) =>
                    setTotalQuestions(parseInt(e.target.value) || 0)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Time (Minutes)
                </label>
                <input
                  type="number"
                  value={timeMinutes}
                  onChange={(e) =>
                    setTimeMinutes(parseInt(e.target.value) || 0)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                />
              </div>

              {examType === "objective" && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Correct Marks (+)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={correctMarks}
                      onChange={(e) =>
                        setCorrectMarks(parseFloat(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Penalty Marks (-)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={incorrectMarks}
                      onChange={(e) =>
                        setIncorrectMarks(parseFloat(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Step 3: Files & Attachments */}
          <div className="bi-card p-6 space-y-4">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              3. Documents & Answer Keys
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Question Paper PDF */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Question Paper PDF
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 font-mono">
                    Required
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Official question paper in PDF format.
                </p>

                <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center hover:border-indigo-500 hover:bg-slate-50 transition-colors shadow-2xs">
                  <FileUp className="h-6 w-6 text-indigo-600 mb-1" />
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[220px]">
                    {qpFile ? qpFile.name : "Choose PDF File"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {qpFile
                      ? `${(qpFile.size / 1024 / 1024).toFixed(2)} MB`
                      : "Click to browse"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setQpFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Model Solution / Explanations PDF */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Solution Booklet
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-medium">
                    Optional
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Detailed explanation or answer hints PDF.
                </p>

                <label className="cursor-pointer flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center hover:border-slate-500 hover:bg-slate-50 transition-colors shadow-2xs">
                  <FileUp className="h-6 w-6 text-slate-500 mb-1" />
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[220px]">
                    {exsFile ? exsFile.name : "Choose Solution PDF"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {exsFile
                      ? `${(exsFile.size / 1024 / 1024).toFixed(2)} MB`
                      : "Optional"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setExsFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Answer Key (For Objective MCQs only) */}
            {examType === "objective" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      Answer Key
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Provide official answer choices for automatic evaluation.
                    </p>
                  </div>

                  {/* Tab Switcher */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setAkMode("paste")}
                      className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                        akMode === "paste"
                          ? "bg-white text-indigo-700 font-bold shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Paste Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setAkMode("upload")}
                      className={`cursor-pointer px-2.5 py-1 rounded-md transition-colors ${
                        akMode === "upload"
                          ? "bg-white text-indigo-700 font-bold shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Upload .txt
                    </button>
                  </div>
                </div>

                {akMode === "upload" ? (
                  <label className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs font-semibold text-slate-700 hover:border-slate-500 shadow-2xs">
                    <FileUp className="h-4 w-4 text-slate-500" />
                    <span>
                      {akFile ? akFile.name : "Select .txt answer key file"}
                    </span>
                    <input
                      type="file"
                      accept=".txt"
                      onChange={(e) => setAkFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <textarea
                    value={akText}
                    onChange={(e) => setAkText(e.target.value)}
                    placeholder={`1. a\n2. c\n3. d\n4. b\n...\n100. a`}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !qpFile || !cleanYear || !cleanName}
              className="cursor-pointer flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs disabled:opacity-40 transition-all"
            >
              <UploadCloud className="h-4 w-4" />
              {isSubmitting ? "Saving Paper..." : "Save Paper to Repository"}
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* SECTION: YOUR UPLOADED PAPERS REPOSITORY & INSTANT TEST */}
      {/* ============================================================== */}
      {papers.filter(isUserUploadedPaper).length > 0 && (
        <div className="pt-8 border-t border-slate-200/90 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-purple-600 text-white shadow-2xs">
                  <FileUp className="h-4 w-4" />
                </span>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Your Uploaded Papers ({papers.filter(isUserUploadedPaper).length})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Practice interactively, take timed mocks, or manage your custom question papers repository.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigatePapers}
              className="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs transition-colors"
            >
              <span>View in Papers Archive</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {papers.filter(isUserUploadedPaper).map((paper) => {
              const isMarkdown =
                Boolean(paper.parsedQuestions && paper.parsedQuestions.length > 0) ||
                Boolean(paper.markdownContent) ||
                paper.qpUrl?.startsWith("local://");

              return (
                <div
                  key={paper.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        {paper.year}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isMarkdown
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {isMarkdown ? (
                          <>
                            <Sparkles className="h-2.5 w-2.5" />
                            <span>Interactive Mock</span>
                          </>
                        ) : (
                          <span>PDF Document</span>
                        )}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                      {getPaperDisplayTitle(paper)}
                    </h3>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium flex-wrap">
                      <span>{paper.totalQuestions} Questions</span>
                      <span className="text-slate-300">•</span>
                      <span>{paper.timeMinutes} mins</span>
                      <span className="text-slate-300">•</span>
                      <span>{paper.totalMarks} Marks</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onStartExam?.(paper, "practice")}
                      className="cursor-pointer flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200/80 transition-colors shadow-2xs"
                    >
                      <Play className="h-3.5 w-3.5 text-purple-600" />
                      <span>Practice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartExam?.(paper, "mock")}
                      className="cursor-pointer flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Mock</span>
                    </button>
                    {onDeletePaper && (
                      <button
                        type="button"
                        onClick={() => onDeletePaper(paper.id)}
                        className="cursor-pointer p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Paper"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Markdown Format & AI Prompt Guide Modal */}
      <MarkdownFormatGuideModal
        isOpen={formatGuideModalOpen}
        onClose={() => setFormatGuideModalOpen(false)}
        defaultTab={formatGuideModalTab}
        onApplyTemplate={(qpTemplate, akTemplate) => {
          setCustomPaperName("UPSC Prelims Mock Test (Interactive Markdown)");
          setCustomTotalQuestions("5");
          setCustomPositiveMarks("2");
          setCustomNegativeMarks("0.667");
          setCustomTotalMarks("10");
          setCustomTimeMinutes("15");
          setCustomQpMarkdown(qpTemplate);
          setCustomAkText(akTemplate);
          setShowMarkdownPreview(true);
        }}
      />
    </div>
  );
}

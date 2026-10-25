"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { CutoffType, QuestionPaper, ExamType } from "../lib/types";
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
  RefreshCw,
  Zap,
  Search,
  ChevronDown,
  X,
  Sparkles,
  BookOpen,
  Eye,
  Lightbulb,
  Play,
  Clock,
  ArrowRight,
  FileCode,
} from "lucide-react";
import {
  parseQuestionnaireMarkdown,
  parseMarkdownHeader,
  ParsedMarkdownHeader,
} from "../lib/markdownPaperParser";
import { parseAnswerKeyDetailed } from "../lib/defaults";
import { getAuthHeaders } from "../lib/supabase";
import {
  SAMPLE_QUESTIONNAIRE_TEXT,
  SAMPLE_ANSWER_KEY_TEXT,
} from "../data/sampleMarkdownPaper";
import { MarkdownFormatGuideModal } from "./MarkdownFormatGuideModal";
import { RulesScoringGrid } from "./studio/RulesScoringGrid";
import { ExamCoverCard } from "./studio/ExamCoverCard";
import { QuestionStreamPreview } from "./studio/QuestionStreamPreview";
import { AnswerKeyWidget } from "./studio/AnswerKeyWidget";
import { PdfAttachmentCard } from "./studio/PdfAttachmentCard";
import { PageHeader } from "./PageHeader";

interface UploadViewProps {
  papers?: QuestionPaper[];
  onPaperUploaded: (paper: QuestionPaper) => void;
  onUpdatePaper?: (paper: QuestionPaper) => void;
  onDeletePaper?: (paperId: string) => void;
  onNavigatePapers: () => void;
  onStartExam?: (paper: QuestionPaper, mode: "practice" | "mock") => void;
}

// Helper: Reconstruct markdown questionnaire text if not saved directly
function getOrReconstructMarkdown(paper?: QuestionPaper | null): string {
  if (!paper) return "";
  if (paper.markdownContent && paper.markdownContent.trim()) {
    return paper.markdownContent;
  }
  if (paper.parsedQuestions && paper.parsedQuestions.length > 0) {
    let out = "";
    if (paper.title || paper.label) {
      out += `EXAM: ${paper.title || paper.label}\n`;
    }
    if (paper.subject) {
      out += `SUBJECT: ${paper.subject}\n`;
    }
    if (paper.timeMinutes) {
      out += `TIME: ${paper.timeMinutes} mins\n`;
    }
    if (paper.totalQuestions) {
      out += `TOTAL_QUESTIONS: ${paper.totalQuestions}\n`;
    }
    if (paper.totalMarks) {
      out += `TOTAL_MARKS: ${paper.totalMarks}\n`;
    }
    if (paper.incorrectMarks) {
      out += `NEGATIVE_MARKING: ${paper.incorrectMarks}\n`;
    }
    if (paper.instructions && paper.instructions.length > 0) {
      out += `INSTRUCTIONS:\n`;
      paper.instructions.forEach((ins) => {
        out += `- ${ins}\n`;
      });
    }
    out += `---\n\n`;

    paper.parsedQuestions.forEach((q, idx) => {
      out += `${q.text}\n\n`;
      if (q.matchingItems?.length) {
        out += `${q.matchingHeaders?.left || "List-I"} : ${q.matchingHeaders?.right || "List-II"}\n`;
        q.matchingItems.forEach((item) => {
          out += `${item.label}. ${item.left} : ${item.rightLabel}. ${item.right}\n`;
        });
        out += `\n`;
      }
      const opts = ["A", "B", "C", "D"];
      opts.forEach((optKey) => {
        if (q.options[optKey]) {
          out += `(${optKey.toLowerCase()}) ${q.options[optKey]}\n`;
        }
      });
      if (idx < (paper.parsedQuestions?.length || 0) - 1) {
        out += `\n---\n\n`;
      }
    });
    return out;
  }
  return "";
}

// Helper: Extract friendly filename from URL
function getFilenameFromUrl(url?: string, fallbackLabel?: string): string {
  if (!url) return "";
  if (url.startsWith("local://")) return "Interactive Questionnaire";
  try {
    const clean = url.split("?")[0];
    const parts = clean.split("/");
    const last = decodeURIComponent(parts[parts.length - 1] || "");
    if (last && last.toLowerCase().endsWith(".pdf")) return last;
  } catch {
    // fallback
  }
  if (fallbackLabel) {
    const slug = fallbackLabel.toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/_+/g, "_");
    return `${slug}.pdf`;
  }
  return "document.pdf";
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

  // Mode: 'custom' (Fast practice upload) | 'preset' (Official UPSC) | 'update'
  const [viewMode, setViewMode] = useState<"custom" | "preset" | "update">("custom");

  // =========================================================================
  // SEGMENT 1: RULES & SETTINGS (Custom Mode)
  // =========================================================================
  const [customPaperName, setCustomPaperName] = useState<string>("");
  const [customTotalQuestions, setCustomTotalQuestions] = useState<string>("");
  const [customPositiveMarks, setCustomPositiveMarks] = useState<string>("2");
  const [customNegativeMarks, setCustomNegativeMarks] = useState<string>("0.667");
  const [customTotalMarks, setCustomTotalMarks] = useState<string>("");
  const [customTotalMarksEdited, setCustomTotalMarksEdited] = useState<boolean>(false);
  const [customTimeMinutes, setCustomTimeMinutes] = useState<string>("120");
  const [customCutoffEnabled, setCustomCutoffEnabled] = useState(false);
  const [customCutoffType, setCustomCutoffType] = useState<CutoffType>("percentage");
  const [customCutoffValue, setCustomCutoffValue] = useState<string>("");

  // Automatic calculation helpers
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

  // =========================================================================
  // SEGMENT 2: QUESTIONNAIRE (Custom Mode)
  // =========================================================================
  const [customQpFormat, setCustomQpFormat] = useState<"pdf" | "markdown">("markdown");
  const [customQpMarkdown, setCustomQpMarkdown] = useState<string>("");
  const [customQpFile, setCustomQpFile] = useState<File | null>(null);
  const [customExsFile, setCustomExsFile] = useState<File | null>(null);
  const [customViewTab, setCustomViewTab] = useState<"editor" | "preview">("editor");

  const detectedQuestions = useMemo(() => {
    if (!customQpMarkdown.trim()) return [];
    return parseQuestionnaireMarkdown(customQpMarkdown);
  }, [customQpMarkdown]);

  const detectedQuestionsCount = detectedQuestions.length;

  const detectedHeader = useMemo(() => {
    if (!customQpMarkdown.trim()) return null;
    const h = parseMarkdownHeader(customQpMarkdown);
    if (!h.exam && !h.subject && !h.instructions?.length && !h.time && !h.totalQuestions) return null;
    return h;
  }, [customQpMarkdown]);

  // =========================================================================
  // SEGMENT 3: ANSWER KEY (Custom Mode)
  // =========================================================================
  const [customAkMode, setCustomAkMode] = useState<"upload" | "paste">("paste");
  const [customAkText, setCustomAkText] = useState<string>("");
  const [customAkFile, setCustomAkFile] = useState<File | null>(null);

  const detectedAnswerKey = useMemo(() => {
    if (!customAkText.trim()) return { answers: {}, explanations: {} };
    return parseAnswerKeyDetailed(customAkText);
  }, [customAkText]);

  // Helpers Modal
  const [formatGuideModalOpen, setFormatGuideModalOpen] = useState<boolean>(false);
  const [formatGuideModalTab, setFormatGuideModalTab] = useState<"template" | "ai_prompt">("template");

  // Instructions loaded from rules/headers
  const [customInstructions, setCustomInstructions] = useState<string[]>([]);
  const [updateInstructions, setUpdateInstructions] = useState<string[]>([]);

  // Track visual feedback for "Apply Rules" button
  const [headerRulesApplied, setHeaderRulesApplied] = useState<boolean>(false);

  // Apply detected rules to Segment 1
  const handleApplyRules = (hdr: ParsedMarkdownHeader | null, targetMode: "custom" | "update") => {
    if (!hdr) return;
    if (targetMode === "custom") {
      if (hdr.exam) setCustomPaperName(hdr.exam);
      if (hdr.totalQuestions) {
        handleCustomQuestionsChange(String(hdr.totalQuestions));
      }
      if (hdr.totalMarks) {
        handleCustomTotalMarksChange(String(hdr.totalMarks));
      }
      if (hdr.positiveMarks) {
        setCustomPositiveMarks(String(hdr.positiveMarks));
      }
      if (hdr.time) {
        const mins = parseInt(hdr.time, 10);
        if (!isNaN(mins) && mins > 0) setCustomTimeMinutes(String(mins));
      }
      if (hdr.negativeMarking) {
        const match = hdr.negativeMarking.match(/([\d\.]+)/);
        if (match) setCustomNegativeMarks(match[1]);
      }
      if (hdr.instructions && hdr.instructions.length > 0) {
        setCustomInstructions(hdr.instructions);
      }
    } else {
      if (hdr.totalQuestions) setTotalQuestions(hdr.totalQuestions);
      if (hdr.totalMarks) setTotalMarks(hdr.totalMarks);
      if (hdr.positiveMarks) setCorrectMarks(hdr.positiveMarks);
      if (hdr.time) {
        const mins = parseInt(hdr.time, 10);
        if (!isNaN(mins) && mins > 0) setTimeMinutes(mins);
      }
      if (hdr.negativeMarking) {
        const match = hdr.negativeMarking.match(/([\d\.]+)/);
        if (match) setIncorrectMarks(parseFloat(match[1]) || 0.667);
      }
      if (hdr.instructions && hdr.instructions.length > 0) {
        setUpdateInstructions(hdr.instructions);
      }
    }

    setHeaderRulesApplied(true);
    setStatusMsg({ text: "Applied rules from markdown header to the Rules segment." });
    setTimeout(() => setHeaderRulesApplied(false), 2500);
  };

  // =========================================================================
  // UPDATE / EDIT PAPER STATES (All 3 Segments)
  // =========================================================================
  const [selectedPaperId, setSelectedPaperId] = useState<string>(papers[0]?.id || "");
  const [paperSearchQuery, setPaperSearchQuery] = useState<string>("");
  const [isSearchSelectOpen, setIsSearchSelectOpen] = useState<boolean>(false);

  // Update mode: Segment 1 (Rules)
  const [examType, setExamType] = useState<ExamType>("objective");
  const [year, setYear] = useState<string>("2026");
  const [subjectPreset, setSubjectPreset] = useState<string>("GS I");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [paperIdentifier, setPaperIdentifier] = useState<string>("prelims_gs_i");
  const [totalQuestions, setTotalQuestions] = useState<number>(100);
  const [totalMarks, setTotalMarks] = useState<number>(200);
  const [correctMarks, setCorrectMarks] = useState<number>(2.0);
  const [incorrectMarks, setIncorrectMarks] = useState<number>(0.667);
  const [timeMinutes, setTimeMinutes] = useState<number>(120);
  const [cutoffEnabled, setCutoffEnabled] = useState(false);
  const [cutoffType, setCutoffType] = useState<CutoffType>("percentage");
  const [cutoffValue, setCutoffValue] = useState<number | "">("");

  // Update mode: Segment 2 (Questionnaire)
  const [updateQpFormat, setUpdateQpFormat] = useState<"pdf" | "markdown">("markdown");
  const [updateMarkdown, setUpdateMarkdown] = useState<string>("");
  const [updateViewTab, setUpdateViewTab] = useState<"editor" | "preview">("editor");
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [exsFile, setExsFile] = useState<File | null>(null);

  // Update mode: Segment 3 (Answer Key)
  const [akFile, setAkFile] = useState<File | null>(null);
  const [akMode, setAkMode] = useState<"upload" | "paste">("paste");
  const [akText, setAkText] = useState<string>("");

  const currentSelectedPaper = useMemo(
    () => papers.find((p) => p.id === selectedPaperId),
    [papers, selectedPaperId],
  );

  const isSelectedPaperMarkdown = useMemo(() => {
    if (!currentSelectedPaper) return false;
    return (
      Boolean(currentSelectedPaper.parsedQuestions && currentSelectedPaper.parsedQuestions.length > 0) ||
      Boolean(currentSelectedPaper.markdownContent) ||
      currentSelectedPaper.qpUrl?.startsWith("local://") ||
      currentSelectedPaper.id?.startsWith("custom_md_")
    );
  }, [currentSelectedPaper]);

  const filteredUpdatePapers = useMemo(() => {
    if (!paperSearchQuery.trim()) return papers;
    const q = paperSearchQuery.toLowerCase().trim();
    return papers.filter((p) => {
      const displayTitle = getPaperDisplayTitle(p).toLowerCase();
      const label = (p.label || "").toLowerCase();
      const subject = (p.subject || "").toLowerCase();
      const yr = (p.year || "").toLowerCase();
      const id = (p.id || "").toLowerCase();
      return (
        displayTitle.includes(q) ||
        label.includes(q) ||
        subject.includes(q) ||
        yr.includes(q) ||
        id.includes(q)
      );
    });
  }, [papers, paperSearchQuery]);

  const detectedUpdateQuestions = useMemo(() => {
    if (!updateMarkdown.trim()) return [];
    return parseQuestionnaireMarkdown(updateMarkdown);
  }, [updateMarkdown]);

  const detectedUpdateHeader = useMemo(() => {
    if (!updateMarkdown.trim()) return null;
    const h = parseMarkdownHeader(updateMarkdown);
    if (!h.exam && !h.subject && !h.instructions?.length && !h.time && !h.totalQuestions) return null;
    return h;
  }, [updateMarkdown]);

  const detectedUpdateAnswerKey = useMemo(() => {
    if (!akText.trim()) return { answers: {}, explanations: {} };
    return parseAnswerKeyDetailed(akText);
  }, [akText]);

  const [statusMsg, setStatusMsg] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const uploadAndStartRef = useRef(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Select paper in update mode and populate segments
  const handleSelectPaperToUpdate = useCallback(
    (paperId: string) => {
      setSelectedPaperId(paperId);
      const p = papers.find((x) => x.id === paperId);
      if (!p) return;

      // Segment 1
      setYear(p.year || "2026");
      setExamType(p.examType || "objective");
      setTotalQuestions(p.totalQuestions || 100);
      setTotalMarks(p.totalMarks || 200);
      setCorrectMarks(p.correctMarks || 2.0);
      setIncorrectMarks(p.incorrectMarks || 0.667);
      setTimeMinutes(p.timeMinutes || 120);
      setCutoffEnabled(Boolean(p.cutoffEnabled));
      setCutoffType(p.cutoffType || "percentage");
      setCutoffValue(
        typeof p.cutoffValue === "number" && Number.isFinite(p.cutoffValue)
          ? p.cutoffValue
          : "",
      );
      setPaperIdentifier(p.id.replace(/^[0-9]+_/, ""));
      setSubjectPreset(p.subject || "GS I");
      setUpdateInstructions(p.instructions || []);

      // Segment 2
      const isMd =
        Boolean(p.parsedQuestions && p.parsedQuestions.length > 0) ||
        Boolean(p.markdownContent) ||
        p.qpUrl?.startsWith("local://") ||
        p.id?.startsWith("custom_md_");

      setUpdateQpFormat(isMd ? "markdown" : "pdf");
      const md = getOrReconstructMarkdown(p);
      setUpdateMarkdown(md);
      setQpFile(null);
      setExsFile(null);

      // Segment 3
      setAkText(p.answerKeyText || "");
      setAkFile(null);
      setStatusMsg(null);
    },
    [papers],
  );

  useEffect(() => {
    if (viewMode === "update") {
      const targetId = selectedPaperId || papers[0]?.id;
      if (targetId) {
        handleSelectPaperToUpdate(targetId);
      }
    }
  }, [viewMode, selectedPaperId, papers, handleSelectPaperToUpdate]);

  // Preset mode preset picker
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

  const cleanYear = year.replace(/[^0-9]/g, "");
  const cleanName = paperIdentifier
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  // =========================================================================
  // SUBMISSIONS
  // =========================================================================

  // Save Fast Custom Paper
  const handleUploadFastCustomPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    const shouldStartAfterUpload = uploadAndStartRef.current;
    uploadAndStartRef.current = false;
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
        text: "Please enter the Name of the paper in the Rules segment.",
        isError: true,
      });
      return;
    }
    if (!qCount || qCount <= 0) {
      setStatusMsg({
        text: "Please enter or provide questions in the Rules/Questionnaire segment.",
        isError: true,
      });
      return;
    }

    if (customQpFormat === "pdf" && !customQpFile) {
      setStatusMsg({
        text: "Please attach the Question Paper PDF file in the Questionnaire segment.",
        isError: true,
      });
      return;
    }

    if (customQpFormat === "markdown" && !customQpMarkdown.trim()) {
      setStatusMsg({
        text: "Please provide the questions in Markdown format in the Questionnaire segment.",
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

      // MARKDOWN FORMAT PATH
      if (customQpFormat === "markdown") {
        const parsedQuestions = parseQuestionnaireMarkdown(customQpMarkdown);
        if (parsedQuestions.length === 0) {
          throw new Error(
            "Could not detect questions. Separate questions with '---' and specify options (a), (b), (c), (d).",
          );
        }

        const mdHeader = parseMarkdownHeader(customQpMarkdown);
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
          cutoffEnabled: customCutoffEnabled,
          cutoffType: customCutoffType,
          cutoffValue:
            customCutoffEnabled && customCutoffValue !== ""
              ? parseFloat(customCutoffValue)
              : undefined,
        };

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
          formData.append("cutoffEnabled", String(customCutoffEnabled));
          formData.append("cutoffType", customCutoffType);
          if (customCutoffEnabled && customCutoffValue !== "") {
            formData.append("cutoffValue", customCutoffValue);
          }
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
            headers: await getAuthHeaders(),
            body: formData,
          });
          const data = await res.json();
          if (res.ok && data.ok && data.paper) {
            newPaper = { ...newPaper, ...data.paper };
          }
        } catch (serverErr) {
          console.warn("Could not sync markdown paper to server, using local store:", serverErr);
        }

        saveCustomPaper(newPaper);
        onPaperUploaded(newPaper);

        setStatusMsg({
          text: shouldStartAfterUpload
            ? `Paper "${newPaper.label}" (${newPaper.totalQuestions} Questions) saved! Starting Practice...`
            : `Paper "${newPaper.label}" (${newPaper.totalQuestions} Questions) uploaded successfully.`,
        });
        setTimeout(() => {
          if (shouldStartAfterUpload && onStartExam) {
            onStartExam(newPaper, "practice");
          } else {
            onNavigatePapers();
          }
        }, 700);
        return;
      }

      // PDF FORMAT PATH
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
      formData.append("cutoffEnabled", String(customCutoffEnabled));
      formData.append("cutoffType", customCutoffType);
      if (customCutoffEnabled && customCutoffValue !== "") {
        formData.append("cutoffValue", customCutoffValue);
      }
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
        headers: await getAuthHeaders(),
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
        text: shouldStartAfterUpload
          ? `Custom paper "${newPaper.label}" (${newPaper.totalQuestions} Questions) saved! Starting Practice...`
          : `Custom paper "${newPaper.label}" (${newPaper.totalQuestions} Questions) uploaded successfully.`,
      });
      setTimeout(() => {
        if (shouldStartAfterUpload && onStartExam) {
          onStartExam(newPaper, "practice");
        } else {
          onNavigatePapers();
        }
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

  // Update existing paper
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
      let calculatedQCount = totalQuestions;

      if (updateQpFormat === "markdown" && updateMarkdown.trim()) {
        formData.append("markdownContent", updateMarkdown.trim());
        const parsed = parseQuestionnaireMarkdown(updateMarkdown.trim());
        if (parsed.length > 0) {
          formData.append("parsedQuestions", JSON.stringify(parsed));
          calculatedQCount = parsed.length;
        }
      } else if (qpFile) {
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

      formData.append("totalQuestions", String(calculatedQCount));
      formData.append("totalMarks", String(totalMarks));
      formData.append("correctMarks", String(correctMarks));
      formData.append("incorrectMarks", String(incorrectMarks));
      formData.append("timeMinutes", String(timeMinutes));
      formData.append("cutoffEnabled", String(cutoffEnabled));
      formData.append("cutoffType", cutoffType);
      if (cutoffEnabled && cutoffValue !== "") {
        formData.append("cutoffValue", String(cutoffValue));
      }

      let updated = await attachToPaperOnServer(
        currentSelectedPaper.id,
        formData,
      );

      // Fallback local update if server is offline
      if (!updated) {
        const parsed =
          updateQpFormat === "markdown" && updateMarkdown.trim()
            ? parseQuestionnaireMarkdown(updateMarkdown.trim())
            : currentSelectedPaper.parsedQuestions;
        const { answers, explanations } = akText.trim()
          ? parseAnswerKeyDetailed(akText.trim())
          : {
              answers: currentSelectedPaper.answerKey,
              explanations: currentSelectedPaper.explanations,
            };

        updated = {
          ...currentSelectedPaper,
          totalQuestions: parsed && parsed.length > 0 ? parsed.length : calculatedQCount,
          totalMarks: totalMarks,
          correctMarks: correctMarks,
          incorrectMarks: incorrectMarks,
          timeMinutes: timeMinutes,
          cutoffEnabled,
          cutoffType,
          cutoffValue:
            cutoffEnabled && cutoffValue !== ""
              ? Number(cutoffValue)
              : undefined,
          markdownContent:
            updateQpFormat === "markdown"
              ? updateMarkdown.trim()
              : currentSelectedPaper.markdownContent,
          parsedQuestions: parsed,
          answerKey: answers,
          explanations: explanations,
          answerKeyText: akText.trim() || currentSelectedPaper.answerKeyText,
          qpUrl:
            updateQpFormat === "markdown"
              ? "local://interactive_markdown"
              : currentSelectedPaper.qpUrl,
        };
      }

      if (updated) {
        saveCustomPaper(updated);
        if (onUpdatePaper) onUpdatePaper(updated);
        setStatusMsg({
          text: `Successfully updated "${updated.label}".`,
        });
        setQpFile(null);
        setAkFile(null);
        setExsFile(null);
        setUpdateMarkdown(getOrReconstructMarkdown(updated));
      } else {
        throw new Error("Failed to update paper files.");
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

  // Preset Mode Upload
  const handleUploadNewPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    const shouldStartAfterUpload = uploadAndStartRef.current;
    uploadAndStartRef.current = false;
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
      formData.append("cutoffEnabled", String(cutoffEnabled));
      formData.append("cutoffType", cutoffType);
      if (cutoffEnabled && cutoffValue !== "") {
        formData.append("cutoffValue", String(cutoffValue));
      }

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
        headers: await getAuthHeaders(),
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
        text: shouldStartAfterUpload
          ? `Paper saved successfully: "${newPaper.label}" (${newPaper.totalQuestions} Questions). Starting Practice...`
          : `Paper uploaded successfully: "${newPaper.label}" (${newPaper.totalQuestions} Questions).`,
      });
      setTimeout(() => {
        if (shouldStartAfterUpload && onStartExam) {
          onStartExam(newPaper, "practice");
        } else {
          onNavigatePapers();
        }
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Paper library"
        title="Question Papers Studio"
        description="Configure rules, questionnaire, and answer key in three clear segments."
        actions={
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setViewMode("custom");
              setStatusMsg(null);
            }}
            className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "custom"
                ? "bg-white text-indigo-700 font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
            <span>Fast Custom</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("preset");
              setStatusMsg(null);
            }}
            className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "preset"
                ? "bg-white text-indigo-700 font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-slate-500" />
            <span>UPSC Preset</span>
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
            className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "update"
                ? "bg-white text-indigo-700 font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
            <span>Update Paper</span>
          </button>
          </div>
        }
      />

      {/* Global Status Message */}
      {statusMsg && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium border ${
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

      {/* =================================================================== */}
      {/* 3-SEGMENT WORKSPACE: FAST CUSTOM PRACTICE PAPER */}
      {/* =================================================================== */}
      {viewMode === "custom" && (
        <form onSubmit={handleUploadFastCustomPaper} className="space-y-5">
          {/* ------------------------------------------------------------- */}
          {/* SEGMENT 1: RULES & SCORING SCHEME */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-[11px] font-bold border border-indigo-200">
                  1
                </span>
                Rules & Scoring Scheme
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Paper Name / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customPaperName}
                onChange={(e) => setCustomPaperName(e.target.value)}
                placeholder="e.g. Vision IAS Full Mock 1 / Ancient History Practice Test"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                required
                autoFocus
              />
            </div>

            {/* 5-Column Compact Rules Grid Widget */}
            <RulesScoringGrid
              totalQuestions={customTotalQuestions}
              onTotalQuestionsChange={handleCustomQuestionsChange}
              timeMinutes={customTimeMinutes}
              onTimeMinutesChange={setCustomTimeMinutes}
              correctMarks={customPositiveMarks}
              onCorrectMarksChange={handleCustomPositiveMarksChange}
              incorrectMarks={customNegativeMarks}
              onIncorrectMarksChange={setCustomNegativeMarks}
              totalMarks={customTotalMarks}
              onTotalMarksChange={handleCustomTotalMarksChange}
              cutoffEnabled={customCutoffEnabled}
              onCutoffEnabledChange={setCustomCutoffEnabled}
              cutoffType={customCutoffType}
              onCutoffTypeChange={setCustomCutoffType}
              cutoffValue={customCutoffValue}
              onCutoffValueChange={setCustomCutoffValue}
              instructionsCount={
                (customInstructions.length > 0
                  ? customInstructions
                  : detectedHeader?.instructions || []
                ).length
              }
            />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SEGMENT 2: QUESTIONNAIRE */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-xs">
            {/* Header: Left format chips + Right helpers */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mr-1">
                  <span className="h-5 w-5 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center text-[11px] font-bold border border-purple-200">
                    2
                  </span>
                  Questionnaire
                </span>

                <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomQpFormat("markdown");
                      if (!customPositiveMarks) setCustomPositiveMarks("2");
                      if (!customNegativeMarks) setCustomNegativeMarks("0.667");
                    }}
                    className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                      customQpFormat === "markdown"
                        ? "bg-white text-purple-700 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    <span>Interactive Markdown</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomQpFormat("pdf")}
                    className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                      customQpFormat === "pdf"
                        ? "bg-white text-indigo-700 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 text-indigo-600" />
                    <span>PDF Document</span>
                  </button>
                </div>
              </div>

              {customQpFormat === "markdown" && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFormatGuideModalTab("template");
                      setFormatGuideModalOpen(true);
                    }}
                    className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors"
                  >
                    <FileCode className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormatGuideModalTab("ai_prompt");
                      setFormatGuideModalOpen(true);
                    }}
                    className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    <span>AI Prompt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomPaperName("High-Yield Practice Mock (Markdown Interactive)");
                      setCustomTotalQuestions("5");
                      setCustomPositiveMarks("2");
                      setCustomNegativeMarks("0.667");
                      setCustomTotalMarks("10");
                      setCustomTimeMinutes("15");
                      setCustomQpMarkdown(SAMPLE_QUESTIONNAIRE_TEXT);
                      setCustomAkText(SAMPLE_ANSWER_KEY_TEXT);
                      handleApplyRules(parseMarkdownHeader(SAMPLE_QUESTIONNAIRE_TEXT), "custom");
                    }}
                    className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors"
                  >
                    <span>Load Sample</span>
                  </button>
                </div>
              )}
            </div>

            {/* Markdown Workspace */}
            {customQpFormat === "markdown" ? (
              <div className="space-y-3.5">
                {/* Auto-detected rules header banner with direct visual feedback */}
                {detectedHeader && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900">
                    <div className="flex items-center gap-2 truncate">
                      <BookOpen className="h-4 w-4 text-purple-600 shrink-0" />
                      <span className="truncate">
                        Rules detected in header: {detectedHeader.exam || "Mock Test"}
                        {detectedHeader.totalQuestions ? ` • ${detectedHeader.totalQuestions} Qs` : ""}
                        {detectedHeader.time ? ` • ${detectedHeader.time}` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyRules(detectedHeader, "custom")}
                      className={`cursor-pointer shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-lg border shadow-2xs transition-all ${
                        headerRulesApplied
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "text-purple-700 bg-white hover:bg-purple-100 border-purple-200"
                      }`}
                    >
                      {headerRulesApplied ? (
                        <>
                          <Check className="h-3 w-3 text-white" />
                          <span>Applied to Rules!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 text-purple-600" />
                          <span>Apply Rules</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Left View Chips */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setCustomViewTab("editor")}
                      className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                        customViewTab === "editor"
                          ? "bg-white text-slate-900 font-bold shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Markdown Source</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomViewTab("preview")}
                      className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                        customViewTab === "preview"
                          ? "bg-white text-purple-700 font-bold shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Preview ({detectedQuestionsCount} Qs)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {detectedQuestionsCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium">
                        <Check className="h-3 w-3" />
                        <span>{detectedQuestionsCount} Questions detected</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">
                        Separate questions with &apos;---&apos;
                      </span>
                    )}

                    <label className="cursor-pointer text-indigo-600 hover:underline font-semibold inline-flex items-center gap-1 text-xs">
                      <FileUp className="h-3 w-3" />
                      <span>Upload .md</span>
                      <input
                        type="file"
                        accept=".md,.txt"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const text = await file.text();
                            setCustomQpMarkdown(text);
                            const count = parseQuestionnaireMarkdown(text).length;
                            if (count > 0) handleCustomQuestionsChange(String(count));
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Editor Tab */}
                {customViewTab === "editor" && (
                  <textarea
                    value={customQpMarkdown}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomQpMarkdown(val);
                      const count = parseQuestionnaireMarkdown(val).length;
                      if (count > 0) handleCustomQuestionsChange(String(count));
                    }}
                    placeholder={`EXAM: My Practice Test\nSUBJECT: General Studies\nINSTRUCTIONS:\n- 2 marks per question\n- 0.667 negative penalty\n---\nQuestion 1 text here...\n(a) Option A\n(b) Option B\n(c) Option C\n(d) Option D\n---\nQuestion 2 text here...\n(a) Option A\n(b) Option B\n(c) Option C\n(d) Option D`}
                    rows={12}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white p-3.5 font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 shadow-2xs leading-relaxed transition-colors"
                  />
                )}

                {/* Preview Tab */}
                {customViewTab === "preview" && (
                  <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                    <ExamCoverCard
                      title={customPaperName.trim() || detectedHeader?.exam || "Custom Practice Test"}
                      subject={detectedHeader?.subject}
                      timeMinutes={customTimeMinutes || detectedHeader?.time || "120"}
                      questionsCount={detectedQuestionsCount > 0 ? detectedQuestionsCount : (customTotalQuestions || "—")}
                      totalMarks={customTotalMarks || "100"}
                      correctMarks={customPositiveMarks || "2"}
                      incorrectMarks={customNegativeMarks || "0.667"}
                      mappedAnswersCount={Object.keys(detectedAnswerKey.answers).length}
                      instructions={
                        customInstructions.length > 0
                          ? customInstructions
                          : detectedHeader?.instructions
                      }
                    />
                    <QuestionStreamPreview
                      questions={detectedQuestions}
                      answers={detectedAnswerKey.answers}
                      explanations={detectedAnswerKey.explanations}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* PDF Workspace */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <PdfAttachmentCard
                  title="Question Paper PDF"
                  selectedFile={customQpFile}
                  onFileSelected={setCustomQpFile}
                  isRequired
                />
                <PdfAttachmentCard
                  title="Solution Booklet PDF (Optional)"
                  selectedFile={customExsFile}
                  onFileSelected={setCustomExsFile}
                />
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SEGMENT 3: ANSWER KEY */}
          {/* ------------------------------------------------------------- */}
          <AnswerKeyWidget
            mode={customAkMode}
            onModeChange={setCustomAkMode}
            textValue={customAkText}
            onTextChange={setCustomAkText}
            fileValue={customAkFile}
            onFileChange={setCustomAkFile}
            mappedCount={Object.keys(detectedAnswerKey.answers).length}
          />

          {/* Submit Action */}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="submit"
              onClick={() => {
                uploadAndStartRef.current = false;
              }}
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
              className="cursor-pointer flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs disabled:opacity-40 transition-all"
            >
              <UploadCloud className="h-4 w-4" />
              <span>{isSubmitting ? "Uploading..." : "Upload"}</span>
            </button>
            <button
              type="submit"
              onClick={() => {
                uploadAndStartRef.current = true;
              }}
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
              className="cursor-pointer flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs disabled:opacity-40 transition-all"
            >
              <Play className="h-4 w-4" />
              <span>{isSubmitting ? "Uploading..." : "Upload and Start"}</span>
            </button>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* 3-SEGMENT WORKSPACE: UPDATE / CORRECT EXISTING PAPER */}
      {/* =================================================================== */}
      {viewMode === "update" && (
        <div className="space-y-5">
          {/* Paper Picker with Search & Dropdown */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3.5 shadow-xs">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSearchSelectOpen((prev) => !prev)}
                className="cursor-pointer w-full flex items-center justify-between rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
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
                          {currentSelectedPaper.year} • {currentSelectedPaper.subject} • {currentSelectedPaper.totalQuestions} Qs
                        </span>
                        {isUserUploadedPaper(currentSelectedPaper) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Custom Paper
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal">
                        Select a paper to edit or update...
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                    isSearchSelectOpen ? "rotate-180 text-indigo-600" : ""
                  }`}
                />
              </button>

              {isSearchSelectOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsSearchSelectOpen(false)}
                  />
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl animate-in fade-in duration-150">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        value={paperSearchQuery}
                        onChange={(e) => setPaperSearchQuery(e.target.value)}
                        placeholder="Search paper name, subject, year..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
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

                    <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                      {filteredUpdatePapers.length === 0 ? (
                        <div className="py-5 text-center text-xs text-slate-400">
                          No papers found
                        </div>
                      ) : (
                        filteredUpdatePapers.map((p) => {
                          const isSelected = p.id === selectedPaperId;
                          const isUser = isUserUploadedPaper(p);
                          const isMd =
                            Boolean(p.parsedQuestions && p.parsedQuestions.length > 0) ||
                            Boolean(p.markdownContent) ||
                            p.qpUrl?.startsWith("local://");

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                handleSelectPaperToUpdate(p.id);
                                setIsSearchSelectOpen(false);
                                setPaperSearchQuery("");
                              }}
                              className={`cursor-pointer w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                                isSelected
                                  ? "bg-indigo-50/90 text-indigo-900 font-bold border border-indigo-200"
                                  : "hover:bg-slate-50 text-slate-700 border border-transparent"
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-900">
                                    {getPaperDisplayTitle(p)}
                                  </span>
                                  {isMd && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                      Markdown
                                    </span>
                                  )}
                                  {isUser ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                      Custom
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                      {p.category.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                                  {p.year} • {p.subject} • {p.totalQuestions} Qs • {p.timeMinutes || 120}m
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

            {/* Quick Paper Status Strip */}
            {currentSelectedPaper && (
              <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium border border-slate-200">
                  <FileText className="h-3 w-3 text-slate-500" />
                  <span>
                    {currentSelectedPaper.qpUrl?.startsWith("local://") ||
                    (currentSelectedPaper.parsedQuestions && currentSelectedPaper.parsedQuestions.length > 0)
                      ? `Interactive Markdown (${currentSelectedPaper.totalQuestions} Qs)`
                      : "PDF Document"}
                  </span>
                  {currentSelectedPaper.qpUrl && !currentSelectedPaper.qpUrl.startsWith("local://") && (
                    <a
                      href={currentSelectedPaper.qpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 ml-1 inline-flex items-center"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium border ${
                    hasAnswerKey(currentSelectedPaper)
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {hasAnswerKey(currentSelectedPaper) ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span>
                        Key Attached ({Object.keys(currentSelectedPaper.answerKey || {}).length} Qs)
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 text-amber-600" />
                      <span>No Answer Key</span>
                    </>
                  )}
                </span>

                {hasSolution(currentSelectedPaper) ? (
                  <a
                    href={currentSelectedPaper.exsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium hover:bg-indigo-100 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Solution PDF</span>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 border border-slate-200 font-medium">
                    No Solution PDF
                  </span>
                )}
              </div>
            )}
          </div>

          {currentSelectedPaper && (
            <form onSubmit={handleUpdateExistingPaper} className="space-y-5">
              {/* ----------------------------------------------------------- */}
              {/* SEGMENT 1: RULES & DURATION */}
              {/* ----------------------------------------------------------- */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3 shadow-xs">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-[11px] font-bold border border-indigo-200">
                    1
                  </span>
                  Rules & Duration
                </span>

                <RulesScoringGrid
                  totalQuestions={totalQuestions}
                  timeMinutes={timeMinutes}
                  correctMarks={correctMarks}
                  incorrectMarks={incorrectMarks}
                  totalMarks={totalMarks}
                  onTotalQuestionsChange={setTotalQuestions}
                  onTimeMinutesChange={setTimeMinutes}
                  onCorrectMarksChange={setCorrectMarks}
                  onIncorrectMarksChange={setIncorrectMarks}
                  onTotalMarksChange={setTotalMarks}
                  cutoffEnabled={cutoffEnabled}
                  onCutoffEnabledChange={setCutoffEnabled}
                  cutoffType={cutoffType}
                  onCutoffTypeChange={setCutoffType}
                  cutoffValue={cutoffValue}
                  onCutoffValueChange={setCutoffValue}
                  instructionsCount={(updateInstructions.length > 0 ? updateInstructions : (detectedUpdateHeader?.instructions || currentSelectedPaper.instructions || [])).length}
                />
              </div>

              {/* ----------------------------------------------------------- */}
              {/* SEGMENT 2: QUESTIONNAIRE */}
              {/* ----------------------------------------------------------- */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mr-1">
                      <span className="h-5 w-5 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center text-[11px] font-bold border border-purple-200">
                        2
                      </span>
                      Questionnaire
                    </span>

                    {/* In Update mode format is locked to the paper's inherent type: Hide markdown button on PDF papers */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold">
                      {isSelectedPaperMarkdown ? (
                        <span className="inline-flex items-center gap-1.5 text-purple-700">
                          <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                          <span>Interactive Markdown Paper</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-indigo-700">
                          <FileText className="h-3.5 w-3.5 text-indigo-600" />
                          <span>PDF Document Paper</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelectedPaperMarkdown && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setFormatGuideModalTab("template");
                          setFormatGuideModalOpen(true);
                        }}
                        className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-colors"
                      >
                        <FileCode className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Template</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormatGuideModalTab("ai_prompt");
                          setFormatGuideModalOpen(true);
                        }}
                        className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                        <span>AI Prompt</span>
                      </button>
                    </div>
                  )}
                </div>

                {updateQpFormat === "markdown" ? (
                  <div className="space-y-3.5">
                    {/* Header Rules Alert Banner if present */}
                    {detectedUpdateHeader && (
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900">
                        <div className="flex items-center gap-2 truncate">
                          <BookOpen className="h-4 w-4 text-purple-600 shrink-0" />
                          <span className="truncate">
                            Rules detected in header: {detectedUpdateHeader.exam || "Paper"}
                            {detectedUpdateHeader.totalQuestions ? ` • ${detectedUpdateHeader.totalQuestions} Qs` : ""}
                            {detectedUpdateHeader.time ? ` • ${detectedUpdateHeader.time}` : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyRules(detectedUpdateHeader, "update")}
                          className={`cursor-pointer shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-lg border shadow-2xs transition-all ${
                            headerRulesApplied
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "text-purple-700 bg-white hover:bg-purple-100 border-purple-200"
                          }`}
                        >
                          {headerRulesApplied ? (
                            <>
                              <Check className="h-3 w-3 text-white" />
                              <span>Applied to Rules!</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 text-purple-600" />
                              <span>Apply Rules</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => setUpdateViewTab("editor")}
                          className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                            updateViewTab === "editor"
                              ? "bg-white text-slate-900 font-bold shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Markdown Source</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpdateViewTab("preview")}
                          className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                            updateViewTab === "preview"
                              ? "bg-white text-purple-700 font-bold shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Preview ({detectedUpdateQuestions.length} Qs)</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        {detectedUpdateQuestions.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium">
                            <Check className="h-3 w-3" />
                            <span>{detectedUpdateQuestions.length} Questions detected</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            Separate questions with &apos;---&apos;
                          </span>
                        )}

                        <label className="cursor-pointer text-indigo-600 hover:underline font-semibold inline-flex items-center gap-1 text-xs">
                          <FileUp className="h-3 w-3" />
                          <span>Import .md</span>
                          <input
                            type="file"
                            accept=".md,.txt"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const text = await file.text();
                                setUpdateMarkdown(text);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {updateViewTab === "editor" && (
                      <textarea
                        value={updateMarkdown}
                        onChange={(e) => setUpdateMarkdown(e.target.value)}
                        placeholder={`EXAM: Mock Test\nSUBJECT: General Studies\nINSTRUCTIONS:\n- 2 marks per question\n---\nQuestion 1 prompt here...\n(a) Option A\n(b) Option B\n(c) Option C\n(d) Option D\n---\nQuestion 2 prompt...\n(a) Option A\n(b) Option B\n(c) Option C\n(d) Option D`}
                        rows={12}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white p-3.5 font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 shadow-2xs leading-relaxed transition-colors"
                      />
                    )}

                    {updateViewTab === "preview" && (
                      <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                        <ExamCoverCard
                          title={getPaperDisplayTitle(currentSelectedPaper)}
                          subject={detectedUpdateHeader?.subject || currentSelectedPaper.subject}
                          timeMinutes={timeMinutes || currentSelectedPaper.timeMinutes || 120}
                          questionsCount={detectedUpdateQuestions.length > 0 ? detectedUpdateQuestions.length : (totalQuestions || currentSelectedPaper.totalQuestions)}
                          totalMarks={totalMarks || currentSelectedPaper.totalMarks}
                          correctMarks={correctMarks}
                          incorrectMarks={incorrectMarks}
                          mappedAnswersCount={Object.keys(detectedUpdateAnswerKey.answers).length || Object.keys(currentSelectedPaper.answerKey || {}).length}
                          instructions={updateInstructions.length > 0 ? updateInstructions : (detectedUpdateHeader?.instructions || currentSelectedPaper.instructions || [])}
                        />

                        <QuestionStreamPreview
                          questions={detectedUpdateQuestions}
                          answers={detectedUpdateAnswerKey.answers}
                          explanations={detectedUpdateAnswerKey.explanations}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <PdfAttachmentCard
                      title="Question Paper PDF"
                      currentFilename={getFilenameFromUrl(currentSelectedPaper.qpUrl, currentSelectedPaper.label)}
                      currentUrl={currentSelectedPaper.qpUrl}
                      selectedFile={qpFile}
                      onFileSelected={setQpFile}
                    />

                    <PdfAttachmentCard
                      title="Solution Booklet PDF"
                      currentFilename={hasSolution(currentSelectedPaper) ? getFilenameFromUrl(currentSelectedPaper.exsUrl, `${currentSelectedPaper.label}_solution`) : undefined}
                      currentUrl={hasSolution(currentSelectedPaper) ? currentSelectedPaper.exsUrl : undefined}
                      selectedFile={exsFile}
                      onFileSelected={setExsFile}
                    />
                  </div>
                )}
              </div>

              {/* ----------------------------------------------------------- */}
              {/* SEGMENT 3: ANSWER KEY */}
              {/* ----------------------------------------------------------- */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3 shadow-xs">
                <AnswerKeyWidget
                  mode={akMode}
                  onModeChange={setAkMode}
                  textValue={akText}
                  onTextChange={setAkText}
                  fileValue={akFile}
                  onFileChange={setAkFile}
                  mappedCount={Object.keys(detectedUpdateAnswerKey.answers).length}
                />
              </div>

              {/* Bottom Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                {onDeletePaper ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Paper</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs disabled:opacity-40 transition-all"
                >
                  <RefreshCw className={`h-4 w-4 ${isSubmitting ? "animate-spin" : ""}`} />
                  <span>{isSubmitting ? "Saving Updates..." : "Save Updates"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Delete Confirm Modal */}
          {showDeleteConfirm && currentSelectedPaper && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 shrink-0">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Delete Question Paper?
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Are you sure you want to permanently delete &quot;{currentSelectedPaper.label}&quot;?
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
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
                    className="cursor-pointer px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs"
                  >
                    Delete Paper
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 3-SEGMENT WORKSPACE: OFFICIAL UPSC PRESET */}
      {/* =================================================================== */}
      {viewMode === "preset" && (
        <form onSubmit={handleUploadNewPaper} className="space-y-5">
          {/* SEGMENT 1: RULES & PRESET */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-xs">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-[11px] font-bold border border-indigo-200">
                1
              </span>
              Rules & Preset
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleExamTypeChange("objective")}
                className={`cursor-pointer p-3.5 rounded-xl border text-left transition-all ${
                  examType === "objective"
                    ? "border-indigo-500 bg-indigo-50/60 text-slate-900 shadow-2xs ring-1 ring-indigo-500/20"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Objective (Prelims)</span>
                  {examType === "objective" && <Check className="h-4 w-4 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Interactive OMR practice, auto-evaluation, and negative marking.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleExamTypeChange("subjective")}
                className={`cursor-pointer p-3.5 rounded-xl border text-left transition-all ${
                  examType === "subjective"
                    ? "border-indigo-500 bg-indigo-50/60 text-slate-900 shadow-2xs ring-1 ring-indigo-500/20"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Subjective (Mains)</span>
                  {examType === "subjective" && <Check className="h-4 w-4 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Descriptive answer writing questions with handwritten PDF submission.
                </p>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="cursor-pointer w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  {SUPPORTED_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Preset
                </label>
                <select
                  value={subjectPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="cursor-pointer w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  {examType === "objective" ? (
                    <>
                      <option value="GS I">Prelims GS I (100 Qs • 200 Marks)</option>
                      <option value="GS II CSAT">Prelims GS II CSAT (80 Qs • 200 Marks)</option>
                      <option value="Custom">Custom Paper</option>
                    </>
                  ) : (
                    <>
                      <option value="Mains GS I">Mains GS I (20 Qs • 250 Marks)</option>
                      <option value="Mains GS II">Mains GS II (20 Qs • 250 Marks)</option>
                      <option value="Mains GS III">Mains GS III (20 Qs • 250 Marks)</option>
                      <option value="Mains GS IV">Mains GS IV (Ethics • 250 Marks)</option>
                      <option value="Mains Essay">Mains Essay (250 Marks)</option>
                      <option value="Custom">Custom Subjective</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Identifier
                </label>
                <input
                  type="text"
                  value={paperIdentifier}
                  onChange={(e) => setPaperIdentifier(e.target.value)}
                  placeholder="e.g. UPSC Prelims GS I"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
                  required
                />
              </div>
            </div>

            {/* Rules Strip */}
            <div className="pt-3 border-t border-slate-100">
              <RulesScoringGrid
                totalQuestions={totalQuestions}
                timeMinutes={timeMinutes}
                correctMarks={correctMarks}
                incorrectMarks={incorrectMarks}
                totalMarks={totalMarks}
                onTotalQuestionsChange={setTotalQuestions}
                onTimeMinutesChange={setTimeMinutes}
                onCorrectMarksChange={setCorrectMarks}
                onIncorrectMarksChange={setIncorrectMarks}
                onTotalMarksChange={setTotalMarks}
                cutoffEnabled={cutoffEnabled}
                onCutoffEnabledChange={setCutoffEnabled}
                cutoffType={cutoffType}
                onCutoffTypeChange={setCutoffType}
                cutoffValue={cutoffValue}
                onCutoffValueChange={setCutoffValue}
              />
            </div>
          </div>

          {/* SEGMENT 2: QUESTIONNAIRE */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4 shadow-xs">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center text-[11px] font-bold border border-purple-200">
                2
              </span>
              Questionnaire
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <PdfAttachmentCard
                title="Question Paper PDF"
                selectedFile={qpFile}
                onFileSelected={setQpFile}
                isRequired
              />

              <PdfAttachmentCard
                title="Solution Booklet PDF (Optional)"
                selectedFile={exsFile}
                onFileSelected={setExsFile}
              />
            </div>
          </div>

          {/* SEGMENT 3: ANSWER KEY */}
          {examType === "objective" && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3 shadow-xs">
              <AnswerKeyWidget
                mode={akMode}
                onModeChange={setAkMode}
                textValue={akText}
                onTextChange={setAkText}
                fileValue={akFile}
                onFileChange={setAkFile}
                mappedCount={0}
              />
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="submit"
              onClick={() => {
                uploadAndStartRef.current = false;
              }}
              disabled={isSubmitting || !qpFile || !cleanYear || !cleanName}
              className="cursor-pointer flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs disabled:opacity-40 transition-all"
            >
              <UploadCloud className="h-4 w-4" />
              <span>{isSubmitting ? "Uploading..." : "Upload"}</span>
            </button>
            <button
              type="submit"
              onClick={() => {
                uploadAndStartRef.current = true;
              }}
              disabled={isSubmitting || !qpFile || !cleanYear || !cleanName}
              className="cursor-pointer flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs disabled:opacity-40 transition-all"
            >
              <Play className="h-4 w-4" />
              <span>{isSubmitting ? "Uploading..." : "Upload and Start"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* SECTION: YOUR UPLOADED PAPERS REPOSITORY & INSTANT TEST */}
      {/* ============================================================== */}
      {papers.filter(isUserUploadedPaper).length > 0 && (
        <div className="pt-6 border-t border-slate-200 space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Your Custom Papers ({papers.filter(isUserUploadedPaper).length})
              </h2>
              <p className="text-xs text-slate-500">
                Practice interactively or take timed mocks.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigatePapers}
              className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs transition-colors"
            >
              <span>View in Archive</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {papers.filter(isUserUploadedPaper).map((paper) => {
              const isMarkdown =
                Boolean(paper.parsedQuestions && paper.parsedQuestions.length > 0) ||
                Boolean(paper.markdownContent) ||
                paper.qpUrl?.startsWith("local://");

              return (
                <div
                  key={paper.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs hover:border-purple-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {paper.year}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isMarkdown
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {isMarkdown ? (
                          <>
                            <Sparkles className="h-2.5 w-2.5" />
                            <span>Interactive</span>
                          </>
                        ) : (
                          <span>PDF</span>
                        )}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                      {getPaperDisplayTitle(paper)}
                    </h3>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium flex-wrap">
                      <span>{paper.totalQuestions} Qs</span>
                      <span className="text-slate-300">•</span>
                      <span>{paper.timeMinutes}m</span>
                      <span className="text-slate-300">•</span>
                      <span>{paper.totalMarks} Marks</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onStartExam?.(paper, "practice")}
                      className="cursor-pointer flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200/80 transition-colors shadow-2xs"
                    >
                      <Play className="h-3 w-3 text-purple-600" />
                      <span>Practice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartExam?.(paper, "mock")}
                      className="cursor-pointer flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-2xs"
                    >
                      <Clock className="h-3 w-3" />
                      <span>Mock</span>
                    </button>
                    {onDeletePaper && (
                      <button
                        type="button"
                        onClick={() => onDeletePaper(paper.id)}
                        className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
          if (viewMode === "update") {
            setUpdateMarkdown(qpTemplate);
            setAkText(akTemplate);
            setUpdateQpFormat("markdown");
            setUpdateViewTab("editor");
            handleApplyRules(parseMarkdownHeader(qpTemplate), "update");
          } else {
            setCustomPaperName("UPSC Prelims Mock Test (Interactive Markdown)");
            setCustomTotalQuestions("5");
            setCustomPositiveMarks("2");
            setCustomNegativeMarks("0.667");
            setCustomTotalMarks("10");
            setCustomTimeMinutes("15");
            setCustomQpMarkdown(qpTemplate);
            setCustomAkText(akTemplate);
            setCustomQpFormat("markdown");
            setCustomViewTab("editor");
            handleApplyRules(parseMarkdownHeader(qpTemplate), "custom");
          }
        }}
      />
    </div>
  );
}

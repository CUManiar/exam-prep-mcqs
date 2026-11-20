"use client";

import { useEffect, useState, useRef } from "react";
import {
  FileText,
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  BookOpen,
  Send,
  Loader2,
  Trash2,
  Plus,
  Copy,
  Check,
  ChevronRight,
  Maximize2,
  HelpCircle,
  FileCheck,
  XCircle,
  Image as ImageIcon,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  ArrowRight,
  X,
  Settings2,
  Pencil,
} from "lucide-react";
import {
  MainsEvaluationResult,
  MainsEvaluationSession,
  MainsQuestionItem,
  loadMainsSessions,
  saveMainsSessions,
  normalizeSessionQuestions,
  isImageBlankOrNegligible,
  formatMainsDefaultTitle,
} from "@/lib/mainsEvaluation";
import { useApp } from "@/context/AppContext";
import { OptionalSubjectSelect } from "../OptionalSubjectSelect";
import {
  getRevisionConfig,
  getProviderVault,
  switchActiveProvider,
  RevisionProviderConfig,
} from "@/lib/revisionAi";
import { RevisionMarkdownRenderer } from "../revision/RevisionMarkdownRenderer";
import { RevisionSettingsModal } from "../revision/RevisionSettingsModal";
import { MainsDiagramRenderer } from "./MainsDiagramRenderer";
import { MainsDissectionsPanel } from "./MainsDissectionsPanel";

const SAMPLE_QUESTIONS = [
  {
    paper: "GS-2",
    marks: 10,
    text: "Examine the scope of Article 356 of the Constitution in light of judicial pronouncements. Has the misuse of President's Rule been effectively curbed? (150 words)",
  },
  {
    paper: "GS-3",
    marks: 15,
    text: "What are the structural bottlenecks in India's agricultural supply chain? Critically examine the role of PM-KISAN and e-NAM in enhancing farm income. (250 words)",
  },
  {
    paper: "GS-4",
    marks: 10,
    text: "'Conflict of interest is not merely a legal violation but an ethical compromise.' Discuss with real-life administrative examples. (150 words)",
  },
];

export function MainsEvaluationView() {
  const {
    optionalSubject: globalOptionalSubject,
    setOptionalSubject: setGlobalOptionalSubject,
  } = useApp();

  const [sessions, setSessions] = useState<MainsEvaluationSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Session Chat Renaming State
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState<string>("");
  const [isHeaderRenaming, setIsHeaderRenaming] = useState<boolean>(false);
  const [headerRenameText, setHeaderRenameText] = useState<string>("");

  // Multi-Question State per booklet/session
  const [questions, setQuestions] = useState<MainsQuestionItem[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [isFormExpanded, setIsFormExpanded] = useState<boolean>(true);

  // Input states (bound to active question)
  const [inputMode, setInputMode] = useState<"text" | "upload">("text");
  const [question, setQuestion] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [paperType, setPaperType] = useState<
    "GS-1" | "GS-2" | "GS-3" | "GS-4" | "Optional"
  >("GS-2");
  const [optionalSubject, setOptionalSubject] = useState("");
  const [maxMarks, setMaxMarks] = useState<10 | 15 | 20>(10);
  const [uploadedImages, setUploadedImages] = useState<
    Array<{ mimeType: string; data: string; name: string }>
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  // Processing & evaluation state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"feedback" | "model" | "chat">(
    "feedback",
  );
  const [evaluation, setEvaluation] = useState<MainsEvaluationResult | null>(
    null,
  );
  const [activeProvider, setActiveProvider] = useState<string>("");
  const [vault, setVault] = useState<Record<string, string>>({});
  const [aiConfig, setAiConfig] = useState<RevisionProviderConfig | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Follow-up chat state
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedModel, setCopiedModel] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Auto-close sidebar on small screens
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Synchronize active AI provider config across window events and modal changes
  useEffect(() => {
    const syncConfig = () => {
      const cfg = getRevisionConfig();
      setAiConfig(cfg);
      setActiveProvider(cfg?.provider || "");
      setVault(getProviderVault());
    };

    syncConfig();
    window.addEventListener("upsc-ai-config-changed", syncConfig);
    window.addEventListener("storage", syncConfig);
    window.addEventListener("focus", syncConfig);

    return () => {
      window.removeEventListener("upsc-ai-config-changed", syncConfig);
      window.removeEventListener("storage", syncConfig);
      window.removeEventListener("focus", syncConfig);
    };
  }, []);

  // Load saved sessions on mount
  useEffect(() => {
    const loaded = loadMainsSessions();
    if (loaded.length > 0) {
      setSessions(loaded);
      loadSession(loaded[0]);
    } else {
      handleNewEvaluation();
    }
  }, []);

  const loadSession = (sess: MainsEvaluationSession) => {
    setCurrentSessionId(sess.id);
    const normalizedQs = normalizeSessionQuestions(sess);
    setQuestions(normalizedQs);
    setActiveQuestionIndex(0);

    const firstQ = normalizedQs[0] || {
      id: `${sess.id}_q1`,
      questionNumber: 1,
      question: sess.question || "",
      studentAnswer: sess.studentAnswer || "",
      paperType: sess.paperType || "GS-2",
      optionalSubject: sess.optionalSubject || globalOptionalSubject,
      maxMarks: sess.maxMarks || 10,
    };

    setQuestion(firstQ.question || "");
    setAnswerText(firstQ.studentAnswer || "");
    setPaperType(firstQ.paperType || sess.paperType || "GS-2");
    setOptionalSubject(
      firstQ.paperType === "Optional"
        ? firstQ.optionalSubject ||
            sess.optionalSubject ||
            globalOptionalSubject ||
            ""
        : sess.optionalSubject || globalOptionalSubject || "",
    );
    setMaxMarks(firstQ.maxMarks || 10);
    setUploadedImages(firstQ.attachedImages || []);
    setEvaluation(firstQ.evaluation || null);
    setIsFormExpanded(!firstQ.evaluation); // Collapse input form if answer already evaluated
    setChatMessages([]);
    setErrorMsg(null);
    if (firstQ.evaluation) {
      setActiveTab("feedback");
    }
  };

  const selectQuestion = (idx: number) => {
    if (idx < 0 || idx >= questions.length) return;

    // Save current active question changes before switching so no drafts or edits are lost
    const currentQs = [...questions];
    if (currentQs[activeQuestionIndex]) {
      currentQs[activeQuestionIndex] = {
        ...currentQs[activeQuestionIndex],
        question,
        studentAnswer: answerText,
        paperType,
        optionalSubject: paperType === "Optional" ? optionalSubject : undefined,
        maxMarks,
        attachedImages: uploadedImages,
        evaluation,
      };
      setQuestions(currentQs);
      setSessions((prev) => {
        const updated = prev.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              questions: currentQs,
            };
          }
          return s;
        });
        saveMainsSessions(updated);
        return updated;
      });
    }

    setActiveQuestionIndex(idx);
    const q = currentQs[idx];
    setQuestion(q.question || "");
    setAnswerText(q.studentAnswer || "");
    setPaperType(q.paperType || "GS-2");
    setOptionalSubject(
      q.paperType === "Optional"
        ? q.optionalSubject || globalOptionalSubject || ""
        : globalOptionalSubject || "",
    );
    setMaxMarks(q.maxMarks || 10);
    setUploadedImages(q.attachedImages || []);
    setEvaluation(q.evaluation || null);
    setIsFormExpanded(!q.evaluation);
    setChatMessages([]);
    setErrorMsg(null);
    if (q.evaluation) {
      setActiveTab("feedback");
    }
  };

  const handleAddNewQuestion = () => {
    // Restrict maximum 5 questions in a single session
    if (questions.length >= 5) {
      setErrorMsg(
        "Maximum limit of 5 questions reached for this evaluation session.",
      );
      return;
    }

    // Persist current question draft before adding new
    const currentQs = [...questions];
    if (currentQs[activeQuestionIndex]) {
      currentQs[activeQuestionIndex] = {
        ...currentQs[activeQuestionIndex],
        question,
        studentAnswer: answerText,
        paperType,
        optionalSubject: paperType === "Optional" ? optionalSubject : undefined,
        maxMarks,
        attachedImages: uploadedImages,
        evaluation,
      };
    }

    const nextNum = currentQs.length + 1;
    const newQ: MainsQuestionItem = {
      id: `${currentSessionId}_q${Date.now()}`,
      questionNumber: nextNum,
      question: "",
      studentAnswer: "",
      paperType: paperType || "GS-2",
      optionalSubject:
        paperType === "Optional"
          ? optionalSubject || globalOptionalSubject
          : undefined,
      maxMarks: 10,
      attachedImages: [],
      evaluation: undefined,
    };
    const updatedQs = [...currentQs, newQ];
    setQuestions(updatedQs);
    setActiveQuestionIndex(updatedQs.length - 1);
    setQuestion("");
    setAnswerText("");
    setMaxMarks(10);
    setUploadedImages([]);
    setEvaluation(null);
    setIsFormExpanded(true); // Open submission form for new question
    setErrorMsg(null);
    setChatMessages([]);

    setSessions((prev) => {
      const existing = prev.find((s) => s.id === currentSessionId);
      const updatedSession: MainsEvaluationSession = {
        ...(existing || {
          id: currentSessionId,
          title: formatMainsDefaultTitle(new Date()),
          updatedAt: new Date().toISOString(),
          paperType,
        }),
        updatedAt: new Date().toISOString(),
        questions: updatedQs,
      };
      const filtered = prev.filter((s) => s.id !== currentSessionId);
      const updated = [updatedSession, ...filtered];
      saveMainsSessions(updated);
      return updated;
    });
  };

  const handleDeleteQuestion = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (questions.length <= 1) return;
    const updatedQs = questions
      .filter((_, i) => i !== idx)
      .map((q, i) => ({ ...q, questionNumber: i + 1 }));
    setQuestions(updatedQs);
    const nextIdx = Math.min(activeQuestionIndex, updatedQs.length - 1);
    selectQuestion(nextIdx);

    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            updatedAt: new Date().toISOString(),
            questions: updatedQs,
          };
        }
        return s;
      });
      saveMainsSessions(updated);
      return updated;
    });
  };

  const handleNewEvaluation = () => {
    const newId = `mains_${Date.now()}`;
    const initialQ: MainsQuestionItem = {
      id: `${newId}_q1`,
      questionNumber: 1,
      question: "",
      studentAnswer: "",
      paperType: "GS-2",
      maxMarks: 10,
      attachedImages: [],
    };
    const defaultTitle = formatMainsDefaultTitle(new Date());
    const newSession: MainsEvaluationSession = {
      id: newId,
      title: defaultTitle,
      isCustomTitle: false,
      updatedAt: new Date().toISOString(),
      paperType: "GS-2",
      maxMarks: 10,
      questions: [initialQ],
      question: "",
      studentAnswer: "",
    };
    setCurrentSessionId(newId);
    setQuestions([initialQ]);
    setActiveQuestionIndex(0);
    setQuestion("");
    setAnswerText("");
    setPaperType("GS-2");
    setOptionalSubject(globalOptionalSubject || "");
    setMaxMarks(10);
    setUploadedImages([]);
    setEvaluation(null);
    setIsFormExpanded(true);
    setChatMessages([]);
    setErrorMsg(null);
    setInputMode("text");

    setSessions((prev) => {
      const updated = [newSession, ...prev.filter((s) => s.id !== newId)];
      saveMainsSessions(updated);
      return updated;
    });
  };

  // Renaming chat sessions
  const handleStartRename = (
    id: string,
    currentTitle: string,
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();
    setEditingSessionId(id);
    setEditingTitleText(currentTitle);
  };

  const handleSaveRename = (
    id: string,
    customTitle?: string,
    e?: React.MouseEvent | React.FormEvent,
  ) => {
    e?.stopPropagation();
    e?.preventDefault();
    const finalTitle = (customTitle ?? editingTitleText).trim();
    if (!finalTitle) {
      setEditingSessionId(null);
      setIsHeaderRenaming(false);
      return;
    }
    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            title: finalTitle,
            isCustomTitle: true,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });
      saveMainsSessions(updated);
      return updated;
    });
    setEditingSessionId(null);
    setIsHeaderRenaming(false);
  };

  const handleCancelRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSessionId(null);
    setIsHeaderRenaming(false);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    saveMainsSessions(updated);
    if (currentSessionId === id) {
      if (updated.length > 0) {
        loadSession(updated[0]);
      } else {
        handleNewEvaluation();
      }
    }
  };

  // Helper to load PDF.js dynamically
  const loadPdfJs = async (): Promise<any> => {
    if (typeof window === "undefined") return null;
    if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

    return new Promise((resolve) => {
      const existing = document.querySelector(
        'script[src="/vendor/pdfjs/pdf.min.js"]',
      );
      if (existing) {
        existing.addEventListener("load", () => {
          const lib = (window as any).pdfjsLib;
          if (lib)
            lib.GlobalWorkerOptions.workerSrc =
              "/vendor/pdfjs/pdf.worker.min.js";
          resolve(lib || null);
        });
        return;
      }
      const script = document.createElement("script");
      script.src = "/vendor/pdfjs/pdf.min.js";
      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
        }
        resolve(lib || null);
      };
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  };

  const processIncomingFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);
    setInputMode("upload");
    setErrorMsg(null);

    const newAttachments: Array<{
      mimeType: string;
      data: string;
      name: string;
    }> = [];

    for (const file of files) {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        try {
          const pdfjsLib = await loadPdfJs();
          if (pdfjsLib) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer })
              .promise;

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              const page = await pdf.getPage(pageNum);
              const viewport = page.getViewport({ scale: 1.5 });
              const canvas = document.createElement("canvas");
              canvas.width = Math.ceil(viewport.width);
              canvas.height = Math.ceil(viewport.height);
              const ctx = canvas.getContext("2d");
              if (ctx) {
                await page.render({ canvasContext: ctx, viewport }).promise;
                const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
                newAttachments.push({
                  mimeType: "image/jpeg",
                  data: dataUrl,
                  name: `${file.name} (P.${pageNum}/${pdf.numPages})`,
                });
              }
            }
            continue;
          }
        } catch (pdfErr) {
          console.warn(
            "Failed to render PDF pages as images, falling back to raw PDF:",
            pdfErr,
          );
        }

        // Fallback: Read raw PDF as data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        newAttachments.push({
          mimeType: "application/pdf",
          data: dataUrl,
          name: file.name,
        });
      } else {
        // Image files
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        newAttachments.push({
          mimeType: file.type || "image/jpeg",
          data: dataUrl,
          name: file.name,
        });
      }
    }

    setUploadedImages((prev) => [...prev, ...newAttachments]);
    setIsProcessingFiles(false);
  };

  // Handle image / PDF file selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processIncomingFiles(Array.from(files));
    e.target.value = "";
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Execute Mains Evaluation
  const handleEvaluate = async () => {
    const trimmedAnswer = answerText.trim();
    const hasAnyText = Boolean(trimmedAnswer);
    const hasUploads = uploadedImages.length > 0;

    if (!hasAnyText && !hasUploads) {
      setErrorMsg(
        "Please type or paste your written answer, or upload an answer sheet image/PDF.",
      );
      return;
    }

    // Pre-flight check: Text mode minimum length
    if (inputMode === "text" && trimmedAnswer.length < 20) {
      setErrorMsg(
        "Answer text is too short (minimum 20 characters required). Please enter your complete answer before evaluating.",
      );
      return;
    }

    // Pre-flight check: Upload mode blank sheet detection
    if (inputMode === "upload") {
      if (uploadedImages.length === 0) {
        setErrorMsg(
          "Please upload at least one written answer sheet image or PDF.",
        );
        return;
      }

      // Fast client-side image blank check to save user tokens
      if (uploadedImages[0]?.data.startsWith("data:image/")) {
        const isBlank = await isImageBlankOrNegligible(uploadedImages[0].data);
        if (isBlank) {
          setErrorMsg(
            "The uploaded image appears completely blank or unwritten. Please upload a clear photo of your handwritten answer sheet to avoid wasting tokens.",
          );
          return;
        }
      }
    }

    const config = getRevisionConfig();
    setActiveProvider(config?.provider || "");

    // Early client-side check: Groq is text-only and cannot process uploaded sheets without text
    if (hasUploads && !trimmedAnswer && config?.provider === "groq") {
      setEvaluation(null);
      setErrorMsg(
        "Groq Cloud currently only supports text evaluation and does not support image or handwritten OCR. Please select Google Gemini (free at aistudio.google.com) in AI Revision Settings, or type/paste your answer directly in the text tab.",
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/mains/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          answerText: trimmedAnswer,
          paperType,
          optionalSubject:
            paperType === "Optional" ? optionalSubject : undefined,
          maxMarks,
          images: uploadedImages.map((img) => ({
            mimeType: img.mimeType,
            data: img.data,
          })),
          providerConfig: config,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            "Evaluation failed. Please verify your settings or retry.",
        );
      }

      const evalResult: MainsEvaluationResult = data.evaluation;
      setEvaluation(evalResult);
      if (!question.trim() && evalResult.question) {
        setQuestion(evalResult.question);
      }
      setIsFormExpanded(false); // Collapse form once evaluated!
      setActiveTab("feedback");

      // Update question in questions array
      const updatedQs = questions.map((q, idx) => {
        if (idx === activeQuestionIndex) {
          return {
            ...q,
            question: evalResult.question || question,
            studentAnswer: answerText,
            paperType,
            optionalSubject:
              paperType === "Optional" ? optionalSubject : undefined,
            maxMarks,
            attachedImages: uploadedImages,
            evaluation: evalResult,
          };
        }
        return q;
      });
      setQuestions(updatedQs);

      // Save to sessions
      const existingSession = sessions.find((s) => s.id === currentSessionId);
      const sessionTitle =
        existingSession?.isCustomTitle && existingSession.title
          ? existingSession.title
          : formatMainsDefaultTitle(new Date());

      const sessionObj: MainsEvaluationSession = {
        id: currentSessionId,
        title: sessionTitle,
        isCustomTitle: Boolean(existingSession?.isCustomTitle),
        updatedAt: new Date().toISOString(),
        paperType,
        optionalSubject: paperType === "Optional" ? optionalSubject : undefined,
        questions: updatedQs,
        // Legacy fallback fields
        question: updatedQs[0]?.question,
        studentAnswer: updatedQs[0]?.studentAnswer,
        maxMarks: updatedQs[0]?.maxMarks,
        evaluation: updatedQs[0]?.evaluation,
      };

      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== currentSessionId);
        const updated = [sessionObj, ...filtered];
        saveMainsSessions(updated);
        return updated;
      });
    } catch (err: any) {
      setEvaluation(null);
      setErrorMsg(err?.message || "An error occurred during evaluation.");
    } finally {
      setIsLoading(false);
    }
  };

  // Follow-up examiner chat
  const handleSendFollowUp = async () => {
    if (!followUpPrompt.trim() || isChatLoading || !evaluation) return;

    const userMessage = followUpPrompt.trim();
    setFollowUpPrompt("");
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);
    setIsChatLoading(true);

    try {
      const config = getRevisionConfig();
      const promptContext = `You are evaluating this candidate's UPSC Mains Answer.
Question: "${evaluation.question}"
Student Score: ${evaluation.marksAwarded} / ${evaluation.maxMarks} (${evaluation.verdict})
Directive: ${evaluation.directive}
Candidate Follow-up query: "${userMessage}"

Answer strictly as an expert UPSC CSE examiner. Give concrete examples, model points, or constitutional citations as requested.`;

      const res = await fetch("/api/revision/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: promptContext }],
          providerConfig: config,
        }),
      });

      const data = await res.json();
      if (data.text) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.text },
        ]);
      } else {
        throw new Error(data.error || "Failed to receive follow-up response.");
      }
    } catch (e: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Failed to get follow-up response: ${e?.message || "Please retry."}`,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const sanitizeModelAnswerText = (raw: string): string => {
    if (!raw) return "";
    let text = raw.trim();

    if (
      text.startsWith("{") ||
      text.includes('"modelAnswer"') ||
      text.includes('"question":') ||
      text.includes('"marksAwarded":')
    ) {
      const match =
        text.match(
          /"modelAnswer"\s*:\s*"([\s\S]*?)(?:",\s*"[a-zA-Z]+"|"\s*\}|$)/i,
        ) || text.match(/"modelAnswer"\s*:\s*"([\s\S]*)/i);
      if (match) {
        let clean = match[1]
          .replace(/"\s*,\s*"[a-zA-Z]+".*$/s, "")
          .replace(/"\s*\}\s*$/, "")
          .replace(/"\s*$/, "");
        clean = clean
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\t/g, "\t")
          .trim();
        if (clean && !clean.startsWith("{") && clean.length > 40) {
          return clean;
        }
      }

      // If text is raw JSON and we cannot extract modelAnswer, return clean topper structure
      const currentQ = evaluation?.question || question || "UPSC Question";
      const targetWordCount = maxMarks === 10 ? 150 : 250;
      return `### Topper-Grade Model Answer (${targetWordCount} Words)

#### 1. Introduction & Context (20 Words)
The question engages with a foundational theme under **${paperType}${optionalSubject ? ` (${optionalSubject})` : ""}**. Addressing this requires examining institutional frameworks, core principles, and pragmatic dimensions.

#### 2. Core Arguments & Multi-Dimensional Analysis
* **Structural & Substantive Dimensions:**
  * Fundamental principles, statutory benchmarks, and institutional responsibilities.
  * Inter-relationship between policy directives, executive mandates, and socio-economic outcomes.
* **Operational Challenges & Institutional Friction:**
  * Procedural delays, resource asymmetries, and federal/administrative bottlenecks.
  * Checks and balances required to uphold accountability and rule-of-law principles.
* **Judicial Precedents & Empirical Insights:**
  * Landmark rulings and committee doctrines emphasize transparency, equity, and institutional resilience.

#### 3. Balanced Conclusion & Forward Path (25 Words)
To advance constitutional morality and responsive governance, administrative execution must align statutory fidelity with progressive jurisprudence, safeguarding democratic equilibrium.

---
> **Topper Value-Addition Box**
> * **Landmark Reference:** Supreme Court directives, constitutional articles, and statutory safeguards.
> * **2nd ARC / Committee Recommendation:** Strengthen independent institutional oversight to eliminate discretion-driven ambiguity.`;
    }

    if (text.startsWith("{") || text.endsWith("}")) {
      return text.replace(/^\{+/, "").replace(/\}+$/, "").trim();
    }

    return text.replace(/\\n/g, "\n").replace(/\\"/g, '"');
  };

  const handleCopyModelAnswer = () => {
    if (!evaluation?.modelAnswer) return;
    navigator.clipboard.writeText(
      sanitizeModelAnswerText(evaluation.modelAnswer),
    );
    setCopiedModel(true);
    setTimeout(() => setCopiedModel(false), 2000);
  };

  const wordCount = answerText.trim()
    ? answerText.trim().split(/\s+/).length
    : 0;
  const targetWords = maxMarks === 10 ? 150 : maxMarks === 15 ? 250 : 300;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* ── 1. SIDEBAR (History of Evaluations) ── */}
      <aside
        className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 shrink-0 z-20 ${
          isSidebarOpen
            ? "w-72 sm:w-80 fixed inset-y-16 left-0 sm:static sm:inset-auto"
            : "w-0 overflow-hidden"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Evaluations ({sessions.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={handleNewEvaluation}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            title="Start New Evaluation"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Saved Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No evaluations yet. Start by entering a Mains question and answer!
            </div>
          ) : (
            sessions.map((sess) => {
              const isSelected = sess.id === currentSessionId;
              const sessionQs =
                sess.questions && sess.questions.length > 0
                  ? sess.questions
                  : sess.evaluation
                    ? [
                        {
                          evaluation: sess.evaluation,
                          maxMarks: sess.maxMarks || 10,
                        },
                      ]
                    : [];
              const evaluatedList = sessionQs.filter(
                (q) =>
                  q.evaluation && typeof q.evaluation.marksAwarded === "number",
              );
              const hasEvaluated = evaluatedList.length > 0;
              const totalAwarded = evaluatedList.reduce(
                (sum, q) => sum + (q.evaluation?.marksAwarded || 0),
                0,
              );
              const totalMax = evaluatedList.reduce(
                (sum, q) => sum + (q.maxMarks || 10),
                0,
              );
              const avgAwarded =
                evaluatedList.length > 0
                  ? totalAwarded / evaluatedList.length
                  : 0;
              const avgMax =
                evaluatedList.length > 0 ? totalMax / evaluatedList.length : 10;

              return (
                <div
                  key={sess.id}
                  onClick={() => {
                    if (editingSessionId === sess.id) return;
                    loadSession(sess);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`group p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between gap-2 ${
                    isSelected
                      ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 shadow-2xs"
                      : "bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {sess.paperType === "Optional" && sess.optionalSubject
                          ? `Optional (${sess.optionalSubject})`
                          : sess.paperType}
                      </span>
                      {hasEvaluated && (
                        <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
                          {evaluatedList.length > 1
                            ? `Avg ${Math.round(avgAwarded * 10) / 10} / ${Math.round(avgMax * 10) / 10}`
                            : `${evaluatedList[0].evaluation?.marksAwarded} / ${evaluatedList[0].maxMarks || 10}`}
                        </span>
                      )}
                    </div>
                    {editingSessionId === sess.id ? (
                      <form
                        onSubmit={(e) =>
                          handleSaveRename(sess.id, undefined, e)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 mt-1"
                      >
                        <input
                          type="text"
                          value={editingTitleText}
                          onChange={(e) => setEditingTitleText(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Escape") handleCancelRename();
                          }}
                          className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden"
                        />
                        <button
                          type="submit"
                          className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950 cursor-pointer"
                          title="Save title"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <p className="text-xs font-semibold truncate leading-snug">
                          {sess.title || "Untitled Evaluation"}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          {sess.questions && sess.questions.length > 1
                            ? `${sess.questions.length} questions • ${new Date(sess.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                            : new Date(sess.updatedAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                },
                              )}
                        </span>
                      </>
                    )}
                  </div>
                  {editingSessionId !== sess.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={(e) =>
                          handleStartRename(sess.id, sess.title, e)
                        }
                        className="text-slate-400 hover:text-indigo-600 p-1 rounded transition-colors cursor-pointer"
                        title="Rename evaluation"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                        title="Delete evaluation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Mobile Backdrop for Drawer */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="sm:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-10"
        />
      )}

      {/* ── 2. MAIN EVALUATION WORKSPACE ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto touch-pan-y pb-28 sm:pb-20">
        {/* Top Controls Bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Toggle sidebar"
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <Award className="h-5 w-5 text-indigo-600 shrink-0" />
              {isHeaderRenaming ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (headerRenameText.trim()) {
                      handleSaveRename(
                        currentSessionId,
                        headerRenameText.trim(),
                      );
                    }
                    setIsHeaderRenaming(false);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={headerRenameText}
                    onChange={(e) => setHeaderRenameText(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setIsHeaderRenaming(false);
                    }}
                    className="bg-white dark:bg-slate-800 border border-indigo-500 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer"
                    title="Save title"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHeaderRenaming(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0">
                  <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {sessions.find((s) => s.id === currentSessionId)?.title ||
                      formatMainsDefaultTitle(new Date())}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderRenameText(
                        sessions.find((s) => s.id === currentSessionId)
                          ?.title || formatMainsDefaultTitle(new Date()),
                      );
                      setIsHeaderRenaming(true);
                    }}
                    className="text-slate-400 hover:text-indigo-600 p-1 rounded transition-colors cursor-pointer"
                    title="Rename this evaluation session"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {Object.keys(vault).filter((k) => Boolean(vault[k])).length > 1 ? (
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 p-0.5 text-xs">
                {Object.keys(vault)
                  .filter((k) => Boolean(vault[k]))
                  .map((p) => {
                    const isCurrent = activeProvider === p;
                    const label =
                      p === "gemini"
                        ? "Gemini"
                        : p === "groq"
                          ? "Groq"
                          : p === "openai"
                            ? "OpenAI"
                            : p === "anthropic"
                              ? "Claude"
                              : p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          switchActiveProvider(p);
                          setErrorMsg(null);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                        title={`Switch to ${label}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            isCurrent
                              ? "bg-emerald-500 animate-pulse"
                              : "bg-slate-400"
                          }`}
                        />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Configure Keys"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                title="Configure AI Provider & API Key"
              >
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    activeProvider
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                />
                <span className="font-semibold text-xs">
                  {activeProvider === "gemini"
                    ? "Google Gemini"
                    : activeProvider === "groq"
                      ? "Groq"
                      : activeProvider === "openai"
                        ? "OpenAI"
                        : activeProvider === "anthropic"
                          ? "Claude"
                          : "Free AI"}
                </span>
                <Settings2 className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}

            <button
              type="button"
              onClick={handleNewEvaluation}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-indigo-600" />
              <span className="hidden sm:inline">New Question</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="max-w-5xl w-full mx-auto p-3.5 sm:p-6 space-y-5">
          {/* ── A. MULTI-QUESTION SWITCHER & TEST SCORE BAR ── */}
          <div className="flex items-center justify-between flex-wrap gap-2.5 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              {questions.map((q, idx) => {
                const isActive = idx === activeQuestionIndex;
                const hasScore = q.evaluation?.marksAwarded !== undefined;
                return (
                  <div
                    key={q.id || idx}
                    className="flex items-center gap-0.5 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => selectQuestion(idx)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60"
                      }`}
                    >
                      <span>Q{idx + 1}</span>
                      {hasScore ? (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                          }`}
                        >
                          {q.evaluation?.marksAwarded}/{q.evaluation?.maxMarks}
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-medium ${
                            isActive ? "text-indigo-200" : "text-amber-500"
                          }`}
                        >
                          Draft
                        </span>
                      )}
                    </button>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteQuestion(idx, e)}
                        className="text-slate-300 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                        title={`Remove Question ${idx + 1}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {questions.length < 5 ? (
                <button
                  type="button"
                  onClick={handleAddNewQuestion}
                  className="px-3 py-1.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  title="Add next question to this test booklet (max 5)"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Question</span>
                </button>
              ) : (
                <span
                  className="px-2.5 py-1 text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0"
                  title="Maximum 5 questions limit reached for this session"
                >
                  5/5 Questions Max
                </span>
              )}
            </div>

            {/* Aggregated Test Score / Average Marks across Available Questions */}
            {(() => {
              const evaluatedList = questions.filter(
                (q) =>
                  q.evaluation && typeof q.evaluation.marksAwarded === "number",
              );
              if (evaluatedList.length === 0) return null;

              const totalAwarded = evaluatedList.reduce(
                (sum, q) => sum + (q.evaluation?.marksAwarded || 0),
                0,
              );
              const totalMax = evaluatedList.reduce(
                (sum, q) => sum + (q.evaluation?.maxMarks || q.maxMarks || 10),
                0,
              );
              const avgAwarded = totalAwarded / evaluatedList.length;
              const avgMax = totalMax / evaluatedList.length;

              return (
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                  {evaluatedList.length > 1 ? (
                    <>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 uppercase font-sans font-bold">
                        Avg:
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-black">
                        {Math.round(avgAwarded * 10) / 10} /{" "}
                        {Math.round(avgMax * 10) / 10}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">
                        |
                      </span>
                      <span className="text-[11px] text-slate-400 uppercase font-sans font-semibold">
                        Total:
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {totalAwarded} / {totalMax} Marks
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] text-slate-400 uppercase font-sans font-semibold">
                        Test Score:
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-black">
                        {totalAwarded}
                      </span>
                      <span className="text-slate-400 font-normal">
                        / {totalMax} Marks
                      </span>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── B. EVALUATED QUESTION SUMMARY CARD (When answer evaluated & form collapsed) ── */}
          {evaluation && !isFormExpanded && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-mono">
                    Question {activeQuestionIndex + 1} of {questions.length}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    {paperType}{" "}
                    {paperType === "Optional" && optionalSubject
                      ? `(${optionalSubject})`
                      : ""}{" "}
                    • {maxMarks} Marks ({targetWords} Words)
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">
                  {evaluation.question || question || "UPSC CSE Mains Question"}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsFormExpanded(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                  title="Edit answer or re-evaluate"
                >
                  <span>✏️ Edit / Re-evaluate</span>
                </button>
                {questions.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddNewQuestion}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                    title="Add next question to evaluate (max 5)"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Question</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── C. SUBMISSION FORM (Shown when not evaluated or when explicitly expanded) ── */}
          {(isFormExpanded || !evaluation) && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsDragging(false);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  processIncomingFiles(Array.from(e.dataTransfer.files));
                }
              }}
              className={`rounded-2xl border bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm space-y-4 transition-all ${
                isDragging
                  ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    <span>
                      1. Question & Exam Configuration (Q
                      {activeQuestionIndex + 1})
                    </span>
                  </span>
                  {evaluation && (
                    <button
                      type="button"
                      onClick={() => setIsFormExpanded(false)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      Cancel / View Result
                    </button>
                  )}
                </div>

                {/* Sample Question Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Try Sample:
                  </span>
                  {SAMPLE_QUESTIONS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQuestion(sample.text);
                        setPaperType(sample.paper as any);
                        setMaxMarks(sample.marks as any);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors shrink-0"
                    >
                      {sample.paper} ({sample.marks}M)
                    </button>
                  ))}
                </div>
              </div>

              {/* Exam Configuration Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    PAPER TYPE
                  </label>
                  <select
                    value={paperType}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setPaperType(newType);
                      if (newType === "Optional" && !optionalSubject) {
                        setOptionalSubject(
                          globalOptionalSubject || "Sociology",
                        );
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold focus:border-indigo-500 outline-none"
                  >
                    <option value="GS-1">GS-1 (History, Society, Geo)</option>
                    <option value="GS-2">GS-2 (Polity, Governance, IR)</option>
                    <option value="GS-3">GS-3 (Economy, Env, Security)</option>
                    <option value="GS-4">
                      GS-4 (Ethics, Integrity, Aptitude)
                    </option>
                    <option value="Optional">Optional Subject</option>
                  </select>
                </div>

                {paperType === "Optional" && (
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      OPTIONAL SUBJECT (SYNCED)
                    </label>
                    <OptionalSubjectSelect
                      value={
                        optionalSubject || globalOptionalSubject || "Sociology"
                      }
                      onChange={(sub) => {
                        setOptionalSubject(sub);
                        setGlobalOptionalSubject(sub);
                      }}
                      placeholder="Select Optional Subject..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    MARKS WEIGHTAGE
                  </label>
                  <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setMaxMarks(10)}
                      className={`flex-1 py-1 rounded-md font-bold text-[11px] transition-colors ${
                        maxMarks === 10
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      10 Marks
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaxMarks(15)}
                      className={`flex-1 py-1 rounded-md font-bold text-[11px] transition-colors ${
                        maxMarks === 15
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      15 Marks
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    TARGET WORD LIMIT
                  </label>
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {targetWords} Words
                  </div>
                </div>
              </div>

              {/* Question Textarea */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    QUESTION PROMPT
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {uploadedImages.length > 0
                      ? "✨ Auto-transcribed from answer sheet if left empty"
                      : "Optional if already in your answer text below"}
                  </span>
                </div>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={2}
                  placeholder={
                    uploadedImages.length > 0
                      ? "Leave blank to auto-read question from your uploaded sheet, or type here to override..."
                      : "Paste question here, or leave blank if already included in your answer below..."
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-3 text-xs sm:text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Answer Input Method Selector */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-indigo-600" />
                    <span>2. Candidate Answer Submission</span>
                  </span>

                  <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setInputMode("text")}
                      className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer text-center ${
                        inputMode === "text"
                          ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Type / Paste Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode("upload")}
                      className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                        inputMode === "upload"
                          ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-bold"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Image / PDF</span>
                    </button>
                  </div>
                </div>

                {inputMode === "text" ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      rows={8}
                      placeholder="Type or paste your complete written answer here (Introduction, sub-headings, body points, conclusion)..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-3.5 text-xs sm:text-sm font-sans leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>
                        Words: <strong>{wordCount}</strong> / {targetWords}{" "}
                        target
                      </span>
                      <span
                        className={
                          wordCount > targetWords + 30
                            ? "text-rose-500 font-bold"
                            : wordCount < targetWords - 40
                              ? "text-amber-500"
                              : "text-emerald-600"
                        }
                      >
                        {wordCount > targetWords + 30
                          ? `Exceeds target by ${wordCount - targetWords} words`
                          : `${Math.round((wordCount / targetWords) * 100)}% of word limit`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Hidden inputs */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf,.pdf"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Unified Upload & Camera Drop Zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(true);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);
                        if (
                          e.dataTransfer.files &&
                          e.dataTransfer.files.length > 0
                        ) {
                          processIncomingFiles(
                            Array.from(e.dataTransfer.files),
                          );
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-5 sm:p-7 text-center transition-all space-y-3 ${
                        isDragging
                          ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 scale-[1.01] shadow-md"
                          : "border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40"
                      }`}
                    >
                      <div className="h-12 w-12 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                        {isProcessingFiles ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <Upload className="h-6 w-6" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          {isProcessingFiles
                            ? "Processing & preparing answer sheets..."
                            : isDragging
                              ? "Drop image or PDF files here!"
                              : "Upload handwritten answer pages or PDF booklet"}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                          Supports photo snapshots (JPG, PNG) or multi-page PDF
                          documents. The question on the sheet is
                          auto-transcribed.
                        </p>
                      </div>

                      {/* Dual Action Buttons (Camera & File Browser) */}
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1 max-w-md mx-auto">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                        >
                          <Camera className="h-4 w-4" />
                          <span>Take Photo (Camera)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Choose Images / PDF</span>
                        </button>
                      </div>
                    </div>

                    {uploadedImages.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {activeProvider === "groq" && !answerText.trim() && (
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                              <div className="space-y-0.5">
                                <p className="font-bold">Groq is text-only</p>
                                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                  Groq does not support handwritten image OCR.
                                  For uploaded sheets or PDFs, please switch to
                                  Google Gemini (free at aistudio.google.com) or
                                  type your answer in the &quot;Type / Paste
                                  Text&quot; tab.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (vault.gemini) {
                                  switchActiveProvider("gemini");
                                  setErrorMsg(null);
                                } else {
                                  setShowSettingsModal(true);
                                }
                              }}
                              className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
                            >
                              {vault.gemini
                                ? "⚡ Switch to Gemini (Saved Key)"
                                : "Set up Google Gemini"}
                            </button>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Uploaded Pages ({uploadedImages.length})
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add page</span>
                            </button>
                            <span className="text-slate-300 dark:text-slate-700">
                              |
                            </span>
                            <button
                              type="button"
                              onClick={() => setUploadedImages([])}
                              className="text-slate-400 hover:text-rose-600 transition-colors text-[11px]"
                            >
                              Clear all
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {uploadedImages.map((img, idx) => (
                            <div
                              key={idx}
                              className="relative group p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2 text-xs shadow-2xs hover:border-indigo-300 transition-all"
                            >
                              {img.data.startsWith("data:image/") ? (
                                <img
                                  src={img.data}
                                  alt={img.name}
                                  className="h-10 w-10 object-cover rounded-lg border border-slate-100 dark:border-slate-700"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600">
                                  <FileText className="h-5 w-5" />
                                </div>
                              )}
                              <div className="min-w-0 pr-1">
                                <p className="max-w-[130px] truncate text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                                  {img.name}
                                </p>
                                <span className="text-[10px] text-slate-400">
                                  {img.mimeType.includes("pdf")
                                    ? "PDF Doc"
                                    : "Page Sheet"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeUploadedImage(idx)}
                                aria-label={`Remove ${img.name}`}
                                className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Action Trigger */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleEvaluate}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Evaluating Strict UPSC Criteria...</span>
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4" />
                      <span>Evaluate Mains Answer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── 3. EVALUATION RESULTS CONTAINER ── */}
          {evaluation && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Score Hero Banner */}
              <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      UPSC Examiner Evaluation
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg uppercase shadow-2xs border ${
                        evaluation.percentage >= 50
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                          : evaluation.percentage >= 35
                            ? "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                            : "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                      }`}
                    >
                      {evaluation.percentage >= 50
                        ? "Topper Tier"
                        : evaluation.percentage >= 35
                          ? "Average Attempt"
                          : "Below Average"}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      • Q{activeQuestionIndex + 1}
                    </span>
                  </div>

                  <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-500 font-medium text-xs">
                      Directive:
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                      {evaluation.directive}
                    </span>
                  </div>

                  {/* Examiner One-Line Verdict Quote */}
                  {evaluation.verdict && (
                    <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 shadow-2xs">
                      <span className="text-base shrink-0 select-none">🖋️</span>
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 block font-mono">
                          Examiner One-Line Verdict
                        </span>
                        <p className="font-semibold italic leading-relaxed text-xs text-amber-900 dark:text-amber-100">
                          &ldquo;{evaluation.verdict}&rdquo;
                        </p>
                      </div>
                    </div>
                  )}

                  {evaluation.directiveAnalysis && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-0.5">
                      {evaluation.directiveAnalysis}
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-auto flex items-center justify-between sm:block text-right bg-white dark:bg-slate-800 px-5 py-3.5 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-2xs shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] font-bold uppercase text-slate-400 block">
                      Marks Awarded
                    </span>
                    <span className="text-[11px] font-mono text-emerald-600 font-bold block sm:hidden">
                      {evaluation.percentage}% Score
                    </span>
                  </div>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400">
                      {evaluation.marksAwarded}
                    </span>
                    <span className="text-slate-400 font-bold text-sm">
                      / {evaluation.maxMarks}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-600 font-bold hidden sm:block">
                    {evaluation.percentage}% Score
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 gap-1 text-xs shadow-2xs overflow-x-auto no-scrollbar scroll-smooth">
                <button
                  type="button"
                  onClick={() => setActiveTab("feedback")}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "feedback"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Rubric & Feedback</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("model")}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "model"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Topper Model Answer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "chat"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Ask Examiner</span>
                </button>
              </div>

              {/* Tab 1: Detailed Rubric & Breakdown */}
              {activeTab === "feedback" && (
                <div className="space-y-4">
                  {/* UPSC Benchmark & Pacing Dissections */}
                  <MainsDissectionsPanel evaluation={evaluation} />

                  {/* 4 Core Dimensions Scored Strictly /10 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Demand */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            1. Demand & Directive Compliance
                          </span>
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                            {evaluation.dimensions?.demand?.score ??
                              Math.round(
                                (evaluation.marksAwarded /
                                  evaluation.maxMarks) *
                                  10 *
                                  10,
                              ) / 10}{" "}
                            <span className="text-slate-400 font-normal">
                              / 10
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              (evaluation.dimensions?.demand?.score ?? 5) >= 6
                                ? "bg-emerald-500"
                                : (evaluation.dimensions?.demand?.score ?? 5) >=
                                    4
                                  ? "bg-indigo-500"
                                  : "bg-amber-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  ((evaluation.dimensions?.demand?.score ??
                                    (evaluation.marksAwarded /
                                      evaluation.maxMarks) *
                                      10) /
                                    10) *
                                    100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {evaluation.dimensions?.demand?.comment ||
                          evaluation.directiveAnalysis ||
                          "Demand and directive compliance addressed."}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            2. Content & Citation Depth
                          </span>
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                            {evaluation.dimensions?.content?.score ??
                              (evaluation.rubric?.bodyContent?.score
                                ? Math.round(
                                    (evaluation.rubric.bodyContent.score /
                                      evaluation.rubric.bodyContent.max) *
                                      10 *
                                      10,
                                  ) / 10
                                : Math.round(
                                    (evaluation.marksAwarded /
                                      evaluation.maxMarks) *
                                      10 *
                                      10,
                                  ) / 10)}{" "}
                            <span className="text-slate-400 font-normal">
                              / 10
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              (evaluation.dimensions?.content?.score ?? 5) >= 6
                                ? "bg-emerald-500"
                                : (evaluation.dimensions?.content?.score ??
                                      5) >= 4
                                  ? "bg-indigo-500"
                                  : "bg-amber-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  ((evaluation.dimensions?.content?.score ??
                                    (evaluation.marksAwarded /
                                      evaluation.maxMarks) *
                                      10) /
                                    10) *
                                    100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {evaluation.dimensions?.content?.comment ||
                          evaluation.rubric?.bodyContent?.comment ||
                          "Coverage of core analytical dimensions, judgments, and empirical data."}
                      </p>
                    </div>

                    {/* Structure */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            3. Structure & Keyword Headings
                          </span>
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                            {evaluation.dimensions?.structure?.score ??
                              (evaluation.rubric?.structurePresentation?.score
                                ? Math.round(
                                    (evaluation.rubric.structurePresentation
                                      .score /
                                      evaluation.rubric.structurePresentation
                                        .max) *
                                      10 *
                                      10,
                                  ) / 10
                                : Math.round(
                                    (evaluation.marksAwarded /
                                      evaluation.maxMarks) *
                                      10 *
                                      10,
                                  ) / 10)}{" "}
                            <span className="text-slate-400 font-normal">
                              / 10
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              (evaluation.dimensions?.structure?.score ?? 5) >=
                              6
                                ? "bg-emerald-500"
                                : (evaluation.dimensions?.structure?.score ??
                                      5) >= 4
                                  ? "bg-indigo-500"
                                  : "bg-amber-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  ((evaluation.dimensions?.structure?.score ??
                                    (evaluation.marksAwarded /
                                      evaluation.maxMarks) *
                                      10) /
                                    10) *
                                    100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {evaluation.dimensions?.structure?.comment ||
                          evaluation.rubric?.structurePresentation?.comment ||
                          "Intro, keyword headings, numbered arguments, counterview, and verdict."}
                      </p>
                    </div>

                    {/* Presentation */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            4. Presentation & Time Writability
                          </span>
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                            {evaluation.dimensions?.presentation?.score ??
                              Math.round(
                                (evaluation.marksAwarded /
                                  evaluation.maxMarks) *
                                  10 *
                                  10,
                              ) / 10}{" "}
                            <span className="text-slate-400 font-normal">
                              / 10
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              (evaluation.dimensions?.presentation?.score ??
                                5) >= 6
                                ? "bg-emerald-500"
                                : (evaluation.dimensions?.presentation?.score ??
                                      5) >= 4
                                  ? "bg-indigo-500"
                                  : "bg-amber-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  ((evaluation.dimensions?.presentation
                                    ?.score ??
                                    (evaluation.marksAwarded /
                                      evaluation.maxMarks) *
                                      10) /
                                    10) *
                                    100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {evaluation.dimensions?.presentation?.comment ||
                          `Word limit compliance and realistic writability in ${evaluation.timeLimitMinutes || (evaluation.maxMarks === 10 ? 7 : 11)} minutes.`}
                      </p>
                    </div>
                  </div>

                  {/* Examiner Marked Copy & Line-by-Line Script Audit */}
                  {evaluation.markedCopy &&
                    evaluation.markedCopy.length > 0 && (
                      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-indigo-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                              Examiner Script Audit (Line-by-Line Marked Copy)
                            </h4>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                              {evaluation.markedCopy.length} Annotations
                            </span>
                            {(() => {
                              const correctCount = evaluation.markedCopy.filter(
                                (m) => m.type === "correct",
                              ).length;
                              const incorrectCount =
                                evaluation.markedCopy.filter(
                                  (m) => m.type === "incorrect",
                                ).length;
                              const verifyCount = evaluation.markedCopy.filter(
                                (m) => m.type === "verify",
                              ).length;
                              return (
                                <>
                                  {correctCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold">
                                      {correctCount} Accurate
                                    </span>
                                  )}
                                  {incorrectCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-semibold">
                                      {incorrectCount} Wrong/Errors
                                    </span>
                                  )}
                                  {verifyCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-semibold">
                                      {verifyCount} Unverified
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="space-y-3">
                          {evaluation.markedCopy.map((item, idx) => {
                            const isCorrect = item.type === "correct";
                            const isIncorrect = item.type === "incorrect";
                            const isVerify = item.type === "verify";

                            const cardBorder = isCorrect
                              ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60"
                              : isIncorrect
                                ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/60"
                                : isVerify
                                  ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60"
                                  : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60";

                            const quoteBorder = isCorrect
                              ? "border-emerald-500"
                              : isIncorrect
                                ? "border-rose-500"
                                : isVerify
                                  ? "border-amber-500"
                                  : "border-indigo-400";

                            const badgeStyle = isCorrect
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                              : isIncorrect
                                ? "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300"
                                : isVerify
                                  ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300"
                                  : "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300";

                            const badgeText = isCorrect
                              ? "✓ Accurate & Fits"
                              : isIncorrect
                                ? "✗ Factually Wrong / Error"
                                : isVerify
                                  ? "⚠️ Verify Fact"
                                  : "Examiner Note";

                            const noteColor = isCorrect
                              ? "text-emerald-800 dark:text-emerald-300 font-semibold"
                              : isIncorrect
                                ? "text-rose-700 dark:text-rose-300 font-semibold"
                                : isVerify
                                  ? "text-amber-800 dark:text-amber-300 font-semibold"
                                  : "text-slate-700 dark:text-slate-300 font-semibold";

                            return (
                              <div
                                key={idx}
                                className={`p-3.5 rounded-xl border space-y-2 text-xs transition-colors ${cardBorder}`}
                              >
                                <div
                                  className={`text-slate-800 dark:text-slate-200 font-serif italic pl-3 border-l-2 leading-relaxed text-xs sm:text-[13px] ${quoteBorder}`}
                                >
                                  &ldquo;{item.quote}&rdquo;
                                </div>
                                <div className="flex items-start gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/40">
                                  <span
                                    className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${badgeStyle}`}
                                  >
                                    {badgeText}
                                  </span>
                                  <span
                                    className={`leading-relaxed ${noteColor}`}
                                  >
                                    {item.note}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Strengths, Flaws, and Missing Dimensions Grid */}
                  {(() => {
                    const validStrengths = (evaluation.strengths || []).filter(
                      (str) =>
                        Boolean(str && str.trim()) &&
                        !str
                          .toLowerCase()
                          .includes("directly attempted the core prompt"),
                    );
                    const hasStrengths = validStrengths.length > 0;

                    return (
                      <div
                        className={`grid grid-cols-1 ${hasStrengths ? "md:grid-cols-3" : "md:grid-cols-2"} gap-3`}
                      >
                        {/* 1. What Worked (Strengths that earned marks) */}
                        {hasStrengths && (
                          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/40 space-y-2 flex flex-col justify-between">
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span>What Worked (Keep This Up)</span>
                              </h4>
                              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                                {validStrengths.map((str, idx) => (
                                  <li
                                    key={idx}
                                    className="leading-relaxed font-medium"
                                  >
                                    {str}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-medium pt-1">
                              ✓ Earned marks; retain in future answers
                            </span>
                          </div>
                        )}

                        {/* 2. Specific Flaws (Blunt) */}
                        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/40 space-y-2 flex flex-col justify-between">
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                              <AlertTriangle className="h-4 w-4 text-rose-600" />
                              <span>This Answer&apos;s Specific Flaws</span>
                            </h4>
                            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                              {evaluation.weaknesses &&
                              evaluation.weaknesses.length > 0 ? (
                                evaluation.weaknesses.map((w, idx) => (
                                  <li
                                    key={idx}
                                    className="leading-relaxed font-medium"
                                  >
                                    {w}
                                  </li>
                                ))
                              ) : (
                                <li className="text-slate-400">
                                  None flagged.
                                </li>
                              )}
                            </ul>
                          </div>
                          <span className="text-[10px] text-rose-700 dark:text-rose-400 font-mono font-medium pt-1">
                            ✗ Flaws to eliminate
                          </span>
                        </div>

                        {/* 3. Missing Dimensions & Citations */}
                        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/40 space-y-2 flex flex-col justify-between">
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                              <BookOpen className="h-4 w-4 text-amber-600" />
                              <span>Missing Dimensions & Citations</span>
                            </h4>
                            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                              {evaluation.missingDimensions &&
                              evaluation.missingDimensions.length > 0 ? (
                                evaluation.missingDimensions.map((dim, idx) => (
                                  <li key={idx} className="leading-relaxed">
                                    {dim}
                                  </li>
                                ))
                              ) : (
                                <li className="text-slate-400">
                                  None flagged.
                                </li>
                              )}
                            </ul>
                          </div>
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-medium pt-1">
                            + High-yield value addition
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Actionable Roadmap & Drawn Micro-Diagram */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-indigo-600" />
                      <span>Actionable Roadmap for Next Attempt</span>
                    </h4>
                    <div className="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                      {evaluation.actionableRoadmap.map((act, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="font-bold font-mono text-indigo-700 dark:text-indigo-300">
                            {idx + 1}.
                          </span>
                          <span className="leading-relaxed">{act}</span>
                        </div>
                      ))}
                    </div>

                    {/* Examiner-Approved Micro-Diagram: Visual Flowchart or clean Schema */}
                    <MainsDiagramRenderer
                      diagramIdea={evaluation.diagramIdea}
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Model Answer */}
              {activeTab === "model" && (
                <div className="p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        Topper-Grade Model Answer ({targetWords} words)
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyModelAnswer}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {copiedModel ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Model Answer</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm">
                    <RevisionMarkdownRenderer
                      content={sanitizeModelAnswerText(evaluation.modelAnswer)}
                    />
                  </div>
                </div>
              )}

              {/* Tab 4: Interactive Follow-up Chat with Examiner */}
              {activeTab === "chat" && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Examiner Consultation (Ask Questions About Your
                      Evaluation)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Ask the evaluator for alternative introductions, specific
                      committee cites, or how to address the directive better.
                    </p>
                  </div>

                  {/* Chat Messages */}
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-indigo-600 text-white ml-auto max-w-xl"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-auto max-w-2xl border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <RevisionMarkdownRenderer content={msg.content} />
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        <span>Examiner is reviewing...</span>
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <input
                      type="text"
                      value={followUpPrompt}
                      onChange={(e) => setFollowUpPrompt(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSendFollowUp()
                      }
                      placeholder="e.g. How can I shorten my introduction while keeping the data point?"
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-medium outline-none focus:border-indigo-500 bg-slate-50 dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      disabled={isChatLoading || !followUpPrompt.trim()}
                      onClick={handleSendFollowUp}
                      className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 cursor-pointer transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <RevisionSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentConfig={aiConfig}
        onSave={(cfg) => {
          setAiConfig(cfg);
          setActiveProvider(cfg.provider);
          setShowSettingsModal(false);
          setErrorMsg(null);
        }}
        onClear={() => {
          setAiConfig(null);
          setActiveProvider("");
          setShowSettingsModal(false);
          setErrorMsg(null);
        }}
      />
    </div>
  );
}

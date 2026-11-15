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
  Image as ImageIcon,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  ArrowRight,
  X,
  Settings2,
} from "lucide-react";
import {
  MainsEvaluationResult,
  MainsEvaluationSession,
  loadMainsSessions,
  saveMainsSessions,
} from "@/lib/mainsEvaluation";
import {
  getRevisionConfig,
  getProviderVault,
  switchActiveProvider,
  RevisionProviderConfig,
} from "@/lib/revisionAi";
import { MainsScorecardCanvas } from "./MainsScorecardCanvas";
import { RevisionMarkdownRenderer } from "../revision/RevisionMarkdownRenderer";
import { RevisionSettingsModal } from "../revision/RevisionSettingsModal";

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
  const [sessions, setSessions] = useState<MainsEvaluationSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Input states
  const [inputMode, setInputMode] = useState<"text" | "upload">("text");
  const [question, setQuestion] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [paperType, setPaperType] = useState<"GS-1" | "GS-2" | "GS-3" | "GS-4" | "Optional">("GS-2");
  const [optionalSubject, setOptionalSubject] = useState("");
  const [maxMarks, setMaxMarks] = useState<10 | 15 | 20>(10);
  const [uploadedImages, setUploadedImages] = useState<Array<{ mimeType: string; data: string; name: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  // Processing & evaluation state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"feedback" | "scorecard" | "model" | "chat">("feedback");
  const [evaluation, setEvaluation] = useState<MainsEvaluationResult | null>(null);
  const [activeProvider, setActiveProvider] = useState<string>("");
  const [vault, setVault] = useState<Record<string, string>>({});
  const [aiConfig, setAiConfig] = useState<RevisionProviderConfig | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Follow-up chat state
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
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
    setQuestion(sess.question || "");
    setAnswerText(sess.studentAnswer || "");
    setPaperType(sess.paperType || "GS-2");
    setOptionalSubject(sess.optionalSubject || "");
    setMaxMarks(sess.maxMarks || 10);
    setEvaluation(sess.evaluation || null);
    setChatMessages([]);
    setErrorMsg(null);
    if (sess.evaluation) {
      setActiveTab("feedback");
    }
  };

  const handleNewEvaluation = () => {
    const newId = `mains_${Date.now()}`;
    const newSession: MainsEvaluationSession = {
      id: newId,
      title: "New Evaluation",
      updatedAt: new Date().toISOString(),
      question: "",
      studentAnswer: "",
      paperType: "GS-2",
      maxMarks: 10,
    };
    setCurrentSessionId(newId);
    setQuestion("");
    setAnswerText("");
    setPaperType("GS-2");
    setOptionalSubject("");
    setMaxMarks(10);
    setUploadedImages([]);
    setEvaluation(null);
    setChatMessages([]);
    setErrorMsg(null);
    setInputMode("text");
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
      const existing = document.querySelector('script[src="/vendor/pdfjs/pdf.min.js"]');
      if (existing) {
        existing.addEventListener("load", () => {
          const lib = (window as any).pdfjsLib;
          if (lib) lib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
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

    const newAttachments: Array<{ mimeType: string; data: string; name: string }> = [];

    for (const file of files) {
      const isPdf =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        try {
          const pdfjsLib = await loadPdfJs();
          if (pdfjsLib) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

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
          console.warn("Failed to render PDF pages as images, falling back to raw PDF:", pdfErr);
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
    const hasAnyText = Boolean(question.trim() || answerText.trim());
    const hasUploads = uploadedImages.length > 0;

    if (!hasAnyText && !hasUploads) {
      setErrorMsg("Please provide your written answer text or upload an answer sheet image/PDF.");
      return;
    }

    const config = getRevisionConfig();
    setActiveProvider(config?.provider || "");

    // Early client-side check: Groq is text-only and cannot process uploaded sheets without text
    if (hasUploads && !answerText.trim() && config?.provider === "groq") {
      setEvaluation(null);
      setErrorMsg(
        "Groq Cloud currently only supports text evaluation and does not support image or handwritten OCR. Please select Google Gemini (free at aistudio.google.com) in AI Revision Settings, or type/paste your answer directly in the text tab."
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
          answerText: answerText.trim(),
          paperType,
          optionalSubject: paperType === "Optional" ? optionalSubject : undefined,
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
        throw new Error(data.error || "Evaluation failed. Please verify your settings or retry.");
      }

      const evalResult: MainsEvaluationResult = data.evaluation;
      setEvaluation(evalResult);
      if (!question.trim() && evalResult.question) {
        setQuestion(evalResult.question);
      }
      setActiveTab("feedback");

      // Save to sessions
      const bestTitle = evalResult.question || question || "Mains Evaluation";
      const autoTitle =
        bestTitle.slice(0, 38).trim() + (bestTitle.length > 38 ? "..." : "");
      const sessionObj: MainsEvaluationSession = {
        id: currentSessionId,
        title: autoTitle || "Mains Evaluation",
        updatedAt: new Date().toISOString(),
        question: evalResult.question || question,
        studentAnswer: answerText,
        paperType,
        optionalSubject: paperType === "Optional" ? optionalSubject : undefined,
        maxMarks,
        evaluation: evalResult,
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
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
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
        text.match(/"modelAnswer"\s*:\s*"([\s\S]*?)(?:",\s*"[a-zA-Z]+"|"\s*\}|$)/i) ||
        text.match(/"modelAnswer"\s*:\s*"([\s\S]*)/i);
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
    navigator.clipboard.writeText(sanitizeModelAnswerText(evaluation.modelAnswer));
    setCopiedModel(true);
    setTimeout(() => setCopiedModel(false), 2000);
  };

  const wordCount = answerText.trim() ? answerText.trim().split(/\s+/).length : 0;
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
              const hasScore = sess.evaluation?.marksAwarded !== undefined;
              return (
                <div
                  key={sess.id}
                  onClick={() => {
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
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {sess.paperType}
                      </span>
                      {hasScore && (
                        <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {sess.evaluation?.marksAwarded} / {sess.maxMarks}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold truncate leading-snug">
                      {sess.title || "Untitled Question"}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                      {new Date(sess.updatedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(sess.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 rounded transition-opacity"
                    title="Delete evaluation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-600 shrink-0" />
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                <span className="hidden sm:inline">UPSC CSE Mains Answer Evaluation</span>
                <span className="sm:hidden">Mains Evaluation Desk</span>
              </h1>
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
                            isCurrent ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
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
                    activeProvider ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
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
        <div className="max-w-5xl w-full mx-auto p-3.5 sm:p-6 space-y-6">
          {/* Submission Card (When not evaluated yet, or editable above) */}
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
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>1. Question & Exam Configuration</span>
              </span>

              {/* Sample Question Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="text-[11px] text-slate-400 font-medium">Try Sample:</span>
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
                  onChange={(e) => setPaperType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold focus:border-indigo-500 outline-none"
                >
                  <option value="GS-1">GS-1 (History, Society, Geo)</option>
                  <option value="GS-2">GS-2 (Polity, Governance, IR)</option>
                  <option value="GS-3">GS-3 (Economy, Env, Security)</option>
                  <option value="GS-4">GS-4 (Ethics, Integrity, Aptitude)</option>
                  <option value="Optional">Optional Subject</option>
                </select>
              </div>

              {paperType === "Optional" && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    OPTIONAL SUBJECT
                  </label>
                  <input
                    type="text"
                    value={optionalSubject}
                    onChange={(e) => setOptionalSubject(e.target.value)}
                    placeholder="e.g. Sociology, PSIR, Geography"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold focus:border-indigo-500 outline-none"
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
                      Words: <strong>{wordCount}</strong> / {targetWords} target
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
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        processIncomingFiles(Array.from(e.dataTransfer.files));
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
                        Supports photo snapshots (JPG, PNG) or multi-page PDF documents. The question on the sheet is auto-transcribed.
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
                                Groq does not support handwritten image OCR. For uploaded sheets or PDFs, please switch to Google Gemini (free at aistudio.google.com) or type your answer in the &quot;Type / Paste Text&quot; tab.
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
                            {vault.gemini ? "⚡ Switch to Gemini (Saved Key)" : "Set up Google Gemini"}
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
                          <span className="text-slate-300 dark:text-slate-700">|</span>
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
                                {img.mimeType.includes("pdf") ? "PDF Doc" : "Page Sheet"}
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

          {/* ── 3. EVALUATION RESULTS CONTAINER ── */}
          {evaluation && (
            <div className="space-y-5 animate-in fade-in duration-300">
              {/* Score Hero Banner */}
              <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                      UPSC Examiner Evaluation
                    </span>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase shadow-2xs ${
                        evaluation.percentage >= 55
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : evaluation.percentage >= 45
                            ? "bg-blue-100 text-blue-800 border border-blue-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {evaluation.verdict}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Directive: {evaluation.directive.toUpperCase()}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                    {evaluation.directiveAnalysis}
                  </p>
                </div>

                <div className="w-full sm:w-auto flex items-center justify-between sm:block text-right bg-white dark:bg-slate-800 px-5 py-3 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-2xs shrink-0">
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
                  onClick={() => setActiveTab("scorecard")}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === "scorecard"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Scorecard Image</span>
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
                  {/* 5-Component Rubric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Intro */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          1. Introduction & Context
                        </span>
                        <span className="font-mono font-bold text-xs text-indigo-600">
                          {evaluation.rubric.introduction.score} / {evaluation.rubric.introduction.max}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {evaluation.rubric.introduction.comment}
                      </p>
                    </div>

                    {/* Body */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          2. Body Content & Multi-Dimensions
                        </span>
                        <span className="font-mono font-bold text-xs text-indigo-600">
                          {evaluation.rubric.bodyContent.score} / {evaluation.rubric.bodyContent.max}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {evaluation.rubric.bodyContent.comment}
                      </p>
                    </div>

                    {/* Structure */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          3. Structure & Presentation
                        </span>
                        <span className="font-mono font-bold text-xs text-indigo-600">
                          {evaluation.rubric.structurePresentation.score} / {evaluation.rubric.structurePresentation.max}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {evaluation.rubric.structurePresentation.comment}
                      </p>
                    </div>

                    {/* Value Addition */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          4. Value-Add (Articles / Judgements / Data)
                        </span>
                        <span className="font-mono font-bold text-xs text-indigo-600">
                          {evaluation.rubric.valueAddition.score} / {evaluation.rubric.valueAddition.max}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {evaluation.rubric.valueAddition.comment}
                      </p>
                    </div>
                  </div>

                  {/* Strengths & Missing Dimensions Dual Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/40 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Key Strengths</span>
                      </h4>
                      <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                        {evaluation.strengths.map((str, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {str}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/40 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Missing Dimensions & Blindspots</span>
                      </h4>
                      <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                        {evaluation.missingDimensions.map((dim, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {dim}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actionable Roadmap (+2 Marks Leap) */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/40 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-amber-600" />
                      <span>Actionable Roadmap to Gain +2.0 Marks</span>
                    </h4>
                    <div className="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                      {evaluation.actionableRoadmap.map((act, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="font-bold font-mono text-amber-700 dark:text-amber-300">
                            {idx + 1}.
                          </span>
                          <span className="leading-relaxed">{act}</span>
                        </div>
                      ))}
                    </div>
                    {evaluation.diagramIdea && (
                      <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 text-xs">
                        <span className="font-bold text-indigo-600 block mb-1">
                          📊 High-Yield Micro-Diagram Idea:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300">
                          {evaluation.diagramIdea}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Visual Scorecard Image */}
              {activeTab === "scorecard" && (
                <div className="p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <MainsScorecardCanvas evaluation={evaluation} />
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
                    <RevisionMarkdownRenderer content={sanitizeModelAnswerText(evaluation.modelAnswer)} />
                  </div>
                </div>
              )}

              {/* Tab 4: Interactive Follow-up Chat with Examiner */}
              {activeTab === "chat" && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Examiner Consultation (Ask Questions About Your Evaluation)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Ask the evaluator for alternative introductions, specific committee cites, or how to address the directive better.
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
                      onKeyDown={(e) => e.key === "Enter" && handleSendFollowUp()}
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

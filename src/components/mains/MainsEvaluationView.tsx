"use client";

import { useEffect, useState, useRef } from "react";
import {
  FileText,
  Upload,
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
} from "lucide-react";
import {
  MainsEvaluationResult,
  MainsEvaluationSession,
  loadMainsSessions,
  saveMainsSessions,
} from "@/lib/mainsEvaluation";
import { getRevisionConfig, RevisionProviderConfig } from "@/lib/revisionAi";
import { MainsScorecardCanvas } from "./MainsScorecardCanvas";
import { RevisionMarkdownRenderer } from "../revision/RevisionMarkdownRenderer";

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

  // Processing & evaluation state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"feedback" | "scorecard" | "model" | "chat">("feedback");
  const [evaluation, setEvaluation] = useState<MainsEvaluationResult | null>(null);

  // Follow-up chat state
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedModel, setCopiedModel] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-close sidebar on small screens
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
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

  // Handle image / PDF file selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setUploadedImages((prev) => [
          ...prev,
          {
            mimeType: file.type || "image/jpeg",
            data: base64,
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Execute Mains Evaluation
  const handleEvaluate = async () => {
    if (!question.trim()) {
      setErrorMsg("Please enter the Mains question prompt.");
      return;
    }
    if (!answerText.trim() && uploadedImages.length === 0) {
      setErrorMsg("Please enter your answer text or upload an answer sheet image/PDF.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const config = getRevisionConfig();
      const res = await fetch("/api/mains/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answerText,
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
      setActiveTab("feedback");

      // Save to sessions
      const autoTitle =
        question.slice(0, 38).trim() + (question.length > 38 ? "..." : "");
      const sessionObj: MainsEvaluationSession = {
        id: currentSessionId,
        title: autoTitle || "Mains Evaluation",
        updatedAt: new Date().toISOString(),
        question,
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

  const handleCopyModelAnswer = () => {
    if (!evaluation?.modelAnswer) return;
    navigator.clipboard.writeText(evaluation.modelAnswer);
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

      {/* ── 2. MAIN EVALUATION WORKSPACE ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
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
              <Award className="h-5 w-5 text-indigo-600" />
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                UPSC CSE Mains Answer Evaluation
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNewEvaluation}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5 text-indigo-600" />
              <span>New Question</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="max-w-5xl w-full mx-auto p-3.5 sm:p-6 space-y-6">
          {/* Submission Card (When not evaluated yet, or editable above) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm space-y-4">
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
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                QUESTION PROMPT
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                placeholder="Paste or type the UPSC Mains question prompt here (include directive e.g. Discuss, Critically Examine)..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-3 text-xs sm:text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Answer Input Method Selector */}
            <div className="pt-2">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="h-4 w-4 text-indigo-600" />
                  <span>2. Candidate Answer Submission</span>
                </span>

                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setInputMode("text")}
                    className={`px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                      inputMode === "text"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Type / Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("upload")}
                    className={`px-3 py-1 rounded-md font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                      inputMode === "upload"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Upload className="h-3 w-3" />
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
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer transition-all space-y-2"
                  >
                    <div className="h-10 w-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Click to upload handwritten answer pages or PDF
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Supports JPG, PNG, WEBP photos of answer sheets, or PDF document
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {uploadedImages.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {uploadedImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative group p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2 text-xs"
                        >
                          <ImageIcon className="h-4 w-4 text-indigo-600" />
                          <span className="max-w-[140px] truncate text-slate-700 dark:text-slate-200 font-medium">
                            {img.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(idx)}
                            className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
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

                <div className="text-right sm:text-right bg-white dark:bg-slate-800 px-5 py-3 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-2xs shrink-0">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block">
                    Marks Awarded
                  </span>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400">
                      {evaluation.marksAwarded}
                    </span>
                    <span className="text-slate-400 font-bold text-sm">
                      / {evaluation.maxMarks}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-600 font-bold">
                    {evaluation.percentage}% Score
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 gap-1 text-xs shadow-2xs overflow-x-auto">
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
                    <RevisionMarkdownRenderer content={evaluation.modelAnswer} />
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
    </div>
  );
}

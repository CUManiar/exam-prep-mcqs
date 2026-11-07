"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  Compass,
  Copy,
  ExternalLink,
  Flame,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Layers,
  Lightbulb,
  MessageSquare,
  Paperclip,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  PRESET_ACTIONS,
  PresetAction,
  RevisionProviderConfig,
  getRevisionConfig,
  sendRevisionQuery,
  RevisionApiError,
} from "../../lib/revisionAi";
import {
  ParsedQuestion,
  QuestionPaper,
  RevisionContext,
  RevisionMessage,
  SyllabusItem,
} from "../../lib/types";
import { RevisionMarkdownRenderer } from "./RevisionMarkdownRenderer";
import { RevisionSettingsModal } from "./RevisionSettingsModal";
import { PageHeader } from "../PageHeader";
import { getPaperDisplayTitle } from "../../lib/defaults";

interface StarterTopic {
  topic: string;
  category: "GS-I" | "GS-II" | "GS-III";
  hint: string;
}

const STARTER_TOPICS: StarterTopic[] = [
  {
    topic: "Federal Structure of India",
    category: "GS-II",
    hint: "Articles 245-263, S.R. Bommai, 16th FC, Governor assent (Art. 200)",
  },
  {
    topic: "Economic Planning in India",
    category: "GS-III",
    hint: "Planning Commission to NITI Aayog, Five-Year Plans, Indicative Planning",
  },
  {
    topic: "Basic Structure Doctrine",
    category: "GS-II",
    hint: "Kesavananda Bharati, Minerva Mills, Judicial Review & limits",
  },
  {
    topic: "16th Finance Commission & Fiscal Federalism",
    category: "GS-III",
    hint: "Article 280, vertical/horizontal devolution, cess & surcharge issues",
  },
  {
    topic: "1857 Revolt & Administrative Shifts",
    category: "GS-I",
    hint: "Government of India Act 1858, Queen's Proclamation, military changes",
  },
  {
    topic: "Monetary Policy & Inflation Targeting",
    category: "GS-III",
    hint: "RBI Act 1934, MPC mandate, Headline vs Core CPI",
  },
];

export function RevisionView() {
  const searchParams = useSearchParams();
  const { papers, attempts, syllabusItems } = useApp();

  // Settings State
  const [config, setConfig] = useState<RevisionProviderConfig | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Active Mode: 'general' (default free chat), 'paper' (chat with test paper), 'syllabus' (anchored to syllabus item)
  const [mode, setMode] = useState<"general" | "paper" | "syllabus">("general");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedPaperId, setSelectedPaperId] = useState<string>("");
  const [selectedQuestionNo, setSelectedQuestionNo] = useState<number | null>(null);

  // Chat State
  const [messages, setMessages] = useState<RevisionMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved config on mount
  useEffect(() => {
    const saved = getRevisionConfig();
    setConfig(saved);
  }, []);

  // Handle URL search params on mount
  useEffect(() => {
    const topicParam = searchParams.get("topic");
    const paperIdParam = searchParams.get("paperId");
    const qParam = searchParams.get("q");

    if (paperIdParam) {
      setMode("paper");
      setSelectedPaperId(paperIdParam);
      if (qParam) setSelectedQuestionNo(Number(qParam));
    } else if (topicParam) {
      setMode("syllabus");
      setSelectedTopic(topicParam);
    }
  }, [searchParams]);

  // Resolve currently active paper & question
  const activePaper = useMemo<QuestionPaper | undefined>(() => {
    if (!selectedPaperId) return undefined;
    return papers.find((p) => p.id === selectedPaperId);
  }, [papers, selectedPaperId]);

  const activeQuestion = useMemo<ParsedQuestion | undefined>(() => {
    if (!activePaper || !selectedQuestionNo) return undefined;
    return (activePaper.parsedQuestions || []).find(
      (q) => q.questionNo === selectedQuestionNo,
    );
  }, [activePaper, selectedQuestionNo]);

  // Construct active context
  const activeContext = useMemo<RevisionContext>(() => {
    if (mode === "paper") {
      const paperAttempts = attempts.filter((a) => a.paperId === selectedPaperId);
      const latestAttempt = paperAttempts[paperAttempts.length - 1];
      const studentAns = selectedQuestionNo && latestAttempt
        ? latestAttempt.answers?.[selectedQuestionNo]
        : undefined;

      return {
        mode: "paper",
        paperId: selectedPaperId,
        paperTitle: activePaper ? getPaperDisplayTitle(activePaper) : undefined,
        questionNo: selectedQuestionNo || undefined,
        question: activeQuestion,
        userAnswer: studentAns,
        attemptId: latestAttempt?.id,
      };
    }

    if (mode === "syllabus" && selectedTopic.trim()) {
      return {
        mode: "topic",
        topic: selectedTopic.trim(),
      };
    }

    return {
      mode: "open",
      topic: selectedTopic.trim() || undefined,
    };
  }, [
    mode,
    selectedTopic,
    selectedPaperId,
    selectedQuestionNo,
    activePaper,
    activeQuestion,
    attempts,
  ]);

  // Auto-scroll chat
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        130,
      )}px`;
    }
  };

  // Dispatch prompt
  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || isLoading) return;

    // Guard: Require API key
    if (!config?.apiKey?.trim()) {
      setShowSettingsModal(true);
      return;
    }

    const userMessage: RevisionMessage = {
      id: `msg_u_${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString(),
      contextSnapshot: {
        mode: activeContext.mode,
        topic: activeContext.topic,
        paperTitle: activeContext.paperTitle,
        questionNo: activeContext.questionNo,
      },
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputPrompt("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);

    try {
      const reply = await sendRevisionQuery(nextMessages, activeContext, config);
      const assistantMessage: RevisionMessage = {
        id: `msg_a_${Date.now()}`,
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages([...nextMessages, assistantMessage]);
    } catch (err: any) {
      if (err.needsApiKey) {
        setShowSettingsModal(true);
      }
      const errorMsg: RevisionMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Unable to complete query**: ${err.message || "An unexpected error occurred."}\n\n*Please verify your API key in settings or test your connection.*`,
        timestamp: new Date().toISOString(),
      };
      setMessages([...nextMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Preset trigger
  const handleTriggerPreset = (preset: PresetAction) => {
    if (!config?.apiKey?.trim()) {
      setShowSettingsModal(true);
      return;
    }

    const candidateTopic = inputPrompt.trim() || selectedTopic.trim() || activeContext.topic;
    if (!candidateTopic && messages.length === 0) {
      if (textareaRef.current) {
        textareaRef.current.placeholder = `Type a topic first (e.g. Federalism, Inflation), then click "${preset.label}"...`;
        textareaRef.current.focus();
      }
      return;
    }
    const effectiveCtx = candidateTopic
      ? { ...activeContext, topic: candidateTopic }
      : activeContext;
    const prompt = preset.generatePrompt(effectiveCtx);
    handleSend(prompt);
  };

  // Copy text to clipboard
  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setToastMsg("Copied revision notes to clipboard!");
    setTimeout(() => {
      setCopiedId(null);
      setToastMsg(null);
    }, 2500);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full w-full max-w-6xl mx-auto px-3 sm:px-6 pt-3 pb-2 overflow-hidden">
      {/* 1. Header & Controls (shrink-0) */}
      <div className="shrink-0 space-y-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <PageHeader
          title="Revision workspace"
          description="Exam-calibrated study assistant: Constitutional articles, landmark SC judgements, PIB policies, and question dissection."
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mode Controls */}
              <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMode("general")}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    mode === "general"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>General Revision</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("paper")}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    mode === "paper"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>Chat with Paper</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("syllabus")}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    mode === "syllabus"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Syllabus Track</span>
                </button>
              </div>

              {/* Model / Key Status Pill */}
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-2xs cursor-pointer ${
                  config?.apiKey
                    ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200"
                    : "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-900 dark:text-amber-200 font-bold"
                }`}
              >
                {config?.apiKey ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {config.provider === "gemini" ? "Gemini 2.0 Flash" : "Groq Llama 3.3"}
                    </span>
                    <Settings2 className="h-3.5 w-3.5 text-slate-400 ml-1" />
                  </>
                ) : (
                  <>
                    <KeyRound className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Connect Free Key (30s)</span>
                  </>
                )}
              </button>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          }
        />

        {/* Paper / Syllabus Context Bar */}
        {mode === "paper" && (
          <div className="surface-card p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center gap-2.5 text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
              <Paperclip className="h-4 w-4 text-indigo-500" /> Select Paper & Question:
            </span>

            <select
              value={selectedPaperId}
              onChange={(e) => {
                setSelectedPaperId(e.target.value);
                setSelectedQuestionNo(null);
              }}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium min-w-[240px]"
            >
              <option value="">Select Paper from Library...</option>
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {getPaperDisplayTitle(p)}
                </option>
              ))}
            </select>

            {activePaper && (activePaper.parsedQuestions?.length ?? 0) > 0 && (
              <select
                value={selectedQuestionNo || ""}
                onChange={(e) =>
                  setSelectedQuestionNo(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium max-w-[300px]"
              >
                <option value="">All Paper Questions (General)</option>
                {activePaper.parsedQuestions?.map((q) => (
                  <option key={q.questionNo} value={q.questionNo}>
                    Q#{q.questionNo}: {q.text.slice(0, 48)}...
                  </option>
                ))}
              </select>
            )}

            {activeQuestion && (
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900">
                Active: Question #{activeQuestion.questionNo}
              </span>
            )}
          </div>
        )}

        {mode === "syllabus" && (
          <div className="surface-card p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center gap-2.5 text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-indigo-500" /> Syllabus Topic:
            </span>

            {syllabusItems.length > 0 ? (
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium min-w-[260px]"
              >
                <option value="">Choose a tracked syllabus item...</option>
                {syllabusItems.map((item) => (
                  <option key={item.id} value={item.title}>
                    {item.title}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-slate-500 italic">
                No syllabus outline saved yet. Go to Syllabus tab to paste an outline, or use General Revision.
              </span>
            )}

            {selectedTopic && (
              <button
                type="button"
                onClick={() => setSelectedTopic("")}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Clear topic selection"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Action Chips */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
            Exam Actions:
          </span>
          {PRESET_ACTIONS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleTriggerPreset(preset)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 font-medium flex items-center gap-2 animate-in fade-in duration-200 shrink-0 mt-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 2. Central Scrollable Chat Feed (flex-1 min-h-0 overflow-y-auto) */}
      <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-4 pr-1">
        {/* If no API key configured, show an attention alert at top of the scroll feed */}
        {!config?.apiKey && (
          <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 mt-0.5 sm:mt-0">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-sm">Free Google Gemini API Key Required</div>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Google provides 100% free Gemini Flash access (15 requests/min, zero charges, no card). Connect in 30 seconds to begin revising.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
            >
              Connect Free Key (30s)
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          /* First-Time Landing Guidance Hub */
          <div className="max-w-3xl mx-auto my-2 space-y-6">
            {/* Guidance Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-indigo-100 dark:border-indigo-950/80 shadow-xs text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="p-3 rounded-2xl bg-indigo-600 text-white shrink-0 shadow-md">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    UPSC Civil Services AI Revision Mentor
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    A syllabus-centered study companion designed for Prelims and Mains. Ask any topic or question to receive exact Constitutional Articles, landmark Supreme Court rulings, contemporary PIB updates, and interactive flowcharts.
                  </p>
                </div>
              </div>

              {/* 3 Step Guidance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-indigo-100 dark:border-slate-800">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" /> 1. Ask Any Topic
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Type any theme (e.g. <em>Economic Planning</em>, <em>Basic Structure</em>, <em>Inflation</em>) in the box below.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5" /> 2. Chat with Papers
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Switch to <em>Chat with Paper</em> to dissect question traps and understand 50-50 elimination logic.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" /> 3. Exam Actions
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Click <em>Articles</em>, <em>Judgements</em>, <em>PIB</em>, or <em>Infographic</em> for rapid high-yield synthesis.
                  </p>
                </div>
              </div>
            </div>

            {/* High-Yield Starter Suggestions */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Or click a high-yield topic to start:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STARTER_TOPICS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (!config?.apiKey?.trim()) {
                        setShowSettingsModal(true);
                        return;
                      }
                      handleSend(
                        `Comprehensive UPSC revision for "${item.topic}": constitutional/statutory provisions, landmark and recent judgements, contemporary PIB policy touchpoints, and an interactive Mermaid flowchart.`,
                      );
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/20 text-left transition-all shadow-2xs group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.topic}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.hint}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-3xl rounded-xl p-4 shadow-xs text-xs sm:text-sm ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white font-medium ml-12"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 w-full"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div>
                    <RevisionMarkdownRenderer content={msg.content} />

                    {/* Action Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>{copiedId === msg.id ? "Copied!" : "Copy Notes"}</span>
                      </button>

                      {/* Follow-up Quick Prompts */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            handleSend(
                              "Provide 2 high-probability UPSC Mains questions on this topic with model answer outlines.",
                            )
                          }
                          className="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
                        >
                          + 2 Mains questions
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleSend(
                              "Give me 3 tricky Prelims statement-based questions to test my elimination skills.",
                            )
                          }
                          className="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
                        >
                          + 3 Prelims drills
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 items-start animate-in fade-in">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="h-4 w-4 animate-bounce" />
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1.5 max-w-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                Synthesizing UPSC dossier...
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grounding in Constitutional Articles, SC Judgements & PIB touchpoints.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Bottom Chat Input Box (shrink-0) */}
      <div className="shrink-0 pt-2 pb-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex flex-col gap-2"
        >
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputPrompt}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                mode === "paper" && activeQuestion
                  ? `Ask about Question #${activeQuestion.questionNo} (e.g. Why is (C) correct? What was the elimination trap?)...`
                  : mode === "paper"
                    ? "Ask anything about this question paper..."
                    : selectedTopic
                      ? `Ask anything on ${selectedTopic} (e.g. Articles, recent SC judgements, PIB updates)...`
                      : "Ask any UPSC topic or doubt (e.g. Economic Planning in India, Basic Structure, Money Bill)..."
              }
              className="w-full resize-none px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal leading-relaxed shadow-xs"
            />
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>Press Enter to send, Shift+Enter for newline</span>
              {activeContext.topic && (
                <span className="hidden sm:inline-block text-[11px] bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-medium">
                  Topic: {activeContext.topic}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Ask Mentor</span>
            </button>
          </div>
        </form>
      </div>

      {/* Settings Modal */}
      <RevisionSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentConfig={config}
        onSave={(newCfg) => setConfig(newCfg)}
        onClear={() => setConfig(null)}
      />
    </div>
  );
}

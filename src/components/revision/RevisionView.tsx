"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  Compass,
  Copy,
  ExternalLink,
  Flame,
  GraduationCap,
  HelpCircle,
  History,
  Layers,
  KeyRound,
  Lightbulb,
  MessageSquare,
  Paperclip,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Share2,
  Sparkles,
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
  DEFAULT_GEMINI_MODEL,
} from "../../lib/revisionAi";
import {
  ParsedQuestion,
  QuestionPaper,
  RevisionContext,
  RevisionMessage,
  RevisionSession,
  SyllabusItem,
} from "../../lib/types";
import { RevisionMarkdownRenderer } from "./RevisionMarkdownRenderer";
import { RevisionSettingsModal } from "./RevisionSettingsModal";
import { PageHeader } from "../PageHeader";
import { getPaperDisplayTitle } from "../../lib/defaults";
import { saveCustomSyllabus } from "../../lib/storage";

const POPULAR_UPSC_TOPICS = [
  {
    topic: "Federal Structure of India",
    subject: "Polity (GS-II)",
    hint: "Articles 245-263, S.R. Bommai, 16th FC, Governor assent",
  },
  {
    topic: "Economic Planning in India",
    subject: "Indian Economy (GS-III)",
    hint: "Five-Year Plans, Planning Commission to NITI Aayog, Indicative Planning",
  },
  {
    topic: "Basic Structure Doctrine",
    subject: "Constitutional Law (GS-II)",
    hint: "Kesavananda Bharati, Minerva Mills, Judicial Review",
  },
  {
    topic: "Fiscal Federalism & 16th Finance Commission",
    subject: "Economy & Governance (GS-II/III)",
    hint: "Article 280, vertical & horizontal devolution, cess & surcharges",
  },
  {
    topic: "Fundamental Rights vs DPSPs",
    subject: "Polity (GS-II)",
    hint: "Articles 12-35, Minerva Mills harmony, reasonable restrictions",
  },
  {
    topic: "Monetary Policy & Inflation Targeting",
    subject: "Indian Economy (GS-III)",
    hint: "RBI Act 1934, MPC framework, headline vs core CPI",
  },
];

export function RevisionView() {
  const searchParams = useSearchParams();
  const {
    papers,
    attempts,
    syllabusItems,
    currentUser,
    handleUpdateAttempt,
    addNotification,
  } = useApp();

  // Settings State
  const [config, setConfig] = useState<RevisionProviderConfig | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Active Context State
  const [mode, setMode] = useState<"topic" | "paper" | "open">("topic");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedPaperId, setSelectedPaperId] = useState<string>("");
  const [selectedQuestionNo, setSelectedQuestionNo] = useState<number | null>(null);

  // Chat State
  const [messages, setMessages] = useState<RevisionMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved config on mount
  useEffect(() => {
    const saved = getRevisionConfig();
    setConfig(saved);
  }, []);

  // Handle URL search params on mount or change
  useEffect(() => {
    const topicParam = searchParams.get("topic");
    const subjectParam = searchParams.get("subject");
    const paperIdParam = searchParams.get("paperId");
    const qParam = searchParams.get("q");

    if (paperIdParam) {
      setMode("paper");
      setSelectedPaperId(paperIdParam);
      if (qParam) {
        setSelectedQuestionNo(Number(qParam));
      }
    } else if (topicParam) {
      setMode("topic");
      setSelectedTopic(topicParam);
      if (subjectParam) setSelectedSubject(subjectParam);
    }
  }, [searchParams]);

  // Resolve currently active paper & question objects
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

  // Construct unified context object
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

    if (mode === "topic") {
      return {
        mode: "topic",
        topic: selectedTopic.trim() || undefined,
        subject: selectedSubject.trim() || undefined,
      };
    }

    return { mode: "open" };
  }, [
    mode,
    selectedTopic,
    selectedSubject,
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
        180,
      )}px`;
    }
  };

  // Dispatch prompt
  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || isLoading) return;

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
      const errorMsg: RevisionMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Unable to complete query**: ${err.message || "An unexpected error occurred."}\n\n*Please verify your connection or try again.*`,
        timestamp: new Date().toISOString(),
      };
      setMessages([...nextMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick preset trigger
  const handleTriggerPreset = (preset: PresetAction) => {
    const prompt = preset.generatePrompt(activeContext);
    handleSend(prompt);
  };

  // Copy text to clipboard
  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Save revision takeaway to Question Notes or Syllabus Item Notes
  const handleSaveToNotes = async (content: string) => {
    try {
      if (mode === "paper" && activeContext.paperId && activeContext.questionNo) {
        const paperAttempts = attempts.filter((a) => a.paperId === activeContext.paperId);
        const latestAttempt = paperAttempts[paperAttempts.length - 1];
        if (latestAttempt) {
          const answers = { ...(latestAttempt.answers || {}) };
          const cur = answers[activeContext.questionNo] || {
            questionNo: activeContext.questionNo,
            selected: null,
          };
          const existing = cur.note?.trim();
          cur.note = existing ? `${existing}\n\n${content}` : content;
          answers[activeContext.questionNo] = cur;
          const updatedAttempt = { ...latestAttempt, answers };
          await handleUpdateAttempt(updatedAttempt);
          setSaveSuccessMsg(`Saved directly to Question #${activeContext.questionNo} notes!`);
          addNotification({
            type: "system",
            title: "Revision Note Saved",
            message: `Saved revision notes to Question #${activeContext.questionNo} on ${activePaper?.label || "paper"}.`,
          });
          setTimeout(() => setSaveSuccessMsg(null), 3500);
          return;
        }
      }

      if (mode === "topic" && activeContext.topic) {
        const topicLower = activeContext.topic.toLowerCase();
        const item = syllabusItems.find(
          (s) =>
            s.title.toLowerCase().includes(topicLower) ||
            topicLower.includes(s.title.toLowerCase()),
        );
        if (item) {
          const existing = item.notes?.trim();
          item.notes = existing ? `${existing}\n\n${content}` : content;
          item.updatedAt = new Date().toISOString();
          saveCustomSyllabus(syllabusItems, currentUser?.id);
          setSaveSuccessMsg(`Saved to syllabus topic "${item.title}" notes!`);
          addNotification({
            type: "system",
            title: "Revision Note Saved",
            message: `Saved revision notes to topic "${item.title}".`,
          });
          setTimeout(() => setSaveSuccessMsg(null), 3500);
          return;
        }
      }

      setSaveSuccessMsg("Revision note copied to clipboard.");
      navigator.clipboard.writeText(content);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch {
      setSaveSuccessMsg("Could not save automatically. Text copied to clipboard.");
      navigator.clipboard.writeText(content);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="page-container space-y-4">
      {/* 1. Standard Page Header */}
      <PageHeader
        title="Revision workspace"
        description="Syllabus-focused study, landmark SC judgements, PIB updates, and question dissection."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode Controls */}
            <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode("topic")}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  mode === "topic"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Syllabus Topic</span>
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
                onClick={() => setMode("open")}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  mode === "open"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Open Doubt</span>
              </button>
            </div>

            {/* Model Status Pill */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs text-slate-700 dark:text-slate-200 font-medium transition-all shadow-2xs"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {config?.apiKey
                  ? config.provider === "gemini"
                    ? "Gemini Flash"
                    : "Groq Llama 3.3"
                  : "Free AI Active"}
              </span>
              <Settings2 className="h-3.5 w-3.5 text-slate-400 ml-1" />
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear conversation"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        }
      />

      {/* 2. Context Filter Subbar */}
      <div className="surface-card p-3 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 font-medium flex items-center gap-1">
          <Compass className="h-3.5 w-3.5 text-indigo-500" /> Focus Target:
        </span>

        {mode === "topic" && (
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <input
              type="text"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              placeholder="Enter topic (e.g. Economic Planning, Federal Structure, Inflation)..."
              className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-indigo-500 min-w-[240px] flex-1 sm:flex-none"
            />

            {syllabusItems.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) setSelectedTopic(e.target.value);
                }}
                className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                value=""
              >
                <option value="" disabled>
                  Pick from your Syllabus...
                </option>
                {syllabusItems.map((item) => (
                  <option key={item.id} value={item.title}>
                    {item.title}
                  </option>
                ))}
              </select>
            )}

            {selectedTopic && (
              <button
                type="button"
                onClick={() => setSelectedTopic("")}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Clear topic filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {mode === "paper" && (
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <select
              value={selectedPaperId}
              onChange={(e) => {
                setSelectedPaperId(e.target.value);
                setSelectedQuestionNo(null);
              }}
              className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium min-w-[240px]"
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
                className="px-2 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">All Paper (General)</option>
                {activePaper.parsedQuestions?.map((q) => (
                  <option key={q.questionNo} value={q.questionNo}>
                    Q#{q.questionNo}: {q.text.slice(0, 45)}...
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {mode === "open" && (
          <span className="text-slate-600 dark:text-slate-300 italic">
            General UPSC Doubt & Guidance. Ask any question across Prelims, Mains, or Optional.
          </span>
        )}
      </div>

      {/* 3. Action Chips */}
      <div className="overflow-x-auto pb-1 flex items-center gap-2 shrink-0 scrollbar-none">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
          Exam Actions:
        </span>
        {PRESET_ACTIONS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleTriggerPreset(preset)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs whitespace-nowrap transition-all disabled:opacity-50"
          >
            <span>{preset.icon}</span>
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Save Notification Toast */}
      {saveSuccessMsg && (
        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 4. Chat Feed */}
      <div className="min-h-[380px] max-h-[calc(100vh-22rem)] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 p-4 space-y-4">
        {messages.length === 0 ? (
          /* Empty State */
          <div className="max-w-2xl mx-auto my-6 text-center space-y-4">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 ring-8 ring-indigo-50 dark:ring-indigo-950/30">
              <GraduationCap className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                What would you like to revise today?
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Type any topic below or click a high-yield suggestion to start real-time revision with articles, case laws, PIB updates, and infographics.
              </p>
            </div>

            {/* Topic Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
              {POPULAR_UPSC_TOPICS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedTopic(item.topic);
                    setSelectedSubject(item.subject);
                    handleSend(
                      `Comprehensive UPSC revision for "${item.topic}": constitutional/statutory basis, landmark judgements, recent PIB updates, and mindmap.`,
                    );
                  }}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 transition-all text-xs"
                >
                  <div className="font-bold text-slate-900 dark:text-white mb-0.5">
                    {item.topic}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {item.hint}
                  </div>
                </button>
              ))}
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
                {msg.role === "user" && msg.contextSnapshot?.topic && (
                  <div className="text-[10px] font-mono opacity-80 mb-1">
                    [Topic: {msg.contextSnapshot.topic}]
                  </div>
                )}

                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div>
                    <RevisionMarkdownRenderer content={msg.content} />

                    {/* Action Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveToNotes(msg.content)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-medium transition-colors"
                        >
                          <Save className="h-3 w-3" />
                          <span>
                            {mode === "paper" && activeContext.questionNo
                              ? `Save to Q#${activeContext.questionNo} Notes`
                              : "Save to Topic Notes"}
                          </span>
                        </button>
                      </div>

                      {/* Follow-up Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            handleSend(
                              "Provide 2 high-probability UPSC Mains questions on this topic with model answer outlines.",
                            )
                          }
                          className="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
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
                          className="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
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

      {/* 5. Chat Input Box */}
      <div className="surface-card p-3 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
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
                  : selectedTopic
                    ? `Ask anything on ${selectedTopic} (e.g. Articles, recent SC judgements, PIB updates)...`
                    : "Ask any UPSC topic or question (e.g. Economic Planning in India, Basic Structure, Money Bill)..."
              }
              className="w-full resize-none px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Target:
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-medium">
                {mode === "paper"
                  ? activeQuestion
                    ? `Q#${activeQuestion.questionNo} on ${activePaper?.label || "Paper"}`
                    : activePaper?.label || "Select Paper"
                  : selectedTopic || "Open Topic"}
              </span>
              <span className="hidden sm:inline text-slate-400">
                (Press Enter to send, Shift+Enter for newline)
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-xs"
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

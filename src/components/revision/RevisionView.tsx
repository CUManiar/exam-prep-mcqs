"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Bot,
  Brain,
  Check,
  ChevronDown,
  Cloud,
  Copy,
  Download,
  Flame,
  GraduationCap,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  clearRevisionConfig,
  getRevisionConfig,
  RevisionProviderConfig,
  sendRevisionQuery,
} from "../../lib/revisionAi";
import {
  loadRevisionSessions,
  saveRevisionSessions,
} from "../../lib/revisionStorage";
import {
  ParsedQuestion,
  PrepStage,
  QuestionPaper,
  ResponseFormat,
  RevisionAttemptSummary,
  RevisionContext,
  RevisionMessage,
} from "../../lib/types";
import { PREP_PERSONAS } from "../../lib/revision/tutorPersonas";
import { RevisionMarkdownRenderer } from "./RevisionMarkdownRenderer";
import { RevisionSettingsModal } from "./RevisionSettingsModal";
import { PrepStageSelector } from "./PrepStageSelector";
import { OutputFormatSelector } from "./OutputFormatSelector";
import { MistakeDossierCard } from "./MistakeDossierCard";
import { extractMistakeDiagnostics } from "../../lib/revision/mistakeProfiler";
import { FirstPrinciplesGuideCard } from "./FirstPrinciplesGuideCard";
import { getPaperDisplayTitle } from "../../lib/defaults";
import { NotesExportModal } from "./NotesExportModal";

export interface StoredSession {
  id: string;
  title: string;
  stage: PrepStage;
  format: ResponseFormat;
  optionalSubject?: string;
  messages: RevisionMessage[];
  updatedAt: string;
  topic?: string;
  paperId?: string;
  questionNo?: number | null;
}

const MAX_SAVED_SESSIONS = 25;

interface StarterPrompt {
  label: string;
  prompt: string;
  icon: string;
  stage: PrepStage;
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    stage: "prelims",
    label: "Governor Assent & Art. 200 Traps",
    prompt:
      "Dissect the subtle UPSC Prelims elimination traps in Article 200 & 201 (Governor's assent and reservation of bills). Generate 2 statement-based questions testing tricky options.",
    icon: "🏛️",
  },
  {
    stage: "prelims",
    label: "Statutory vs Constitutional Bodies",
    prompt:
      "Highlight the common UPSC traps distinguishing Statutory bodies (NHRC, CVC, NGT) from Constitutional bodies (ECI, Finance Commission, UPSC).",
    icon: "⚖️",
  },
  {
    stage: "mains",
    label: "16th Finance Commission Framework",
    prompt:
      "Frame a 15-Mark (250 words) GS-II Mains model answer on the challenges before the 16th Finance Commission regarding fiscal federalism and cess/surcharge devolution.",
    icon: "✍️",
  },
  {
    stage: "mains",
    label: "Basic Structure & Judicial Review",
    prompt:
      "Provide an exemplary 10-Mark Mains blueprint on the evolution of the Basic Structure doctrine from Kesavananda Bharati to contemporary rulings.",
    icon: "⚖️",
  },
  {
    stage: "optional",
    label: "Core Theoretical Debates",
    prompt:
      "Provide an authoritative academic breakdown of the foundational scholarly debates in this optional subject, linking Paper-I theoretical frameworks to contemporary Indian case studies.",
    icon: "🎓",
  },
  {
    stage: "csat",
    label: "Permutations & Combinations Hack",
    prompt:
      "Explain the core logic of circular seating and identical items in Permutations & Combinations. Provide standard formula, 30-second speed hacks, and eliminate trap options.",
    icon: "⚡",
  },
  {
    stage: "concept",
    label: "Inflation Targeting Explained Simply",
    prompt:
      "Explain Monetary Policy Committee (MPC) and Inflation Targeting from absolute first principles using everyday household analogies, without dense economics jargon.",
    icon: "💡",
  },
  {
    stage: "concept",
    label: "Federalism & 7th Schedule Mechanics",
    prompt:
      "Explain the legislative distribution under the 7th Schedule (Union, State, Concurrent Lists) using simple real-world analogies, highlighting why conflicts arise.",
    icon: "💡",
  },
];

export function RevisionView() {
  const searchParams = useSearchParams();
  const { papers, attempts, currentUser } = useApp();

  // Settings State
  const [config, setConfig] = useState<RevisionProviderConfig | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Stage & Format Selectors
  const [stage, setStage] = useState<PrepStage>("prelims");
  const [format, setFormat] = useState<ResponseFormat>("crisp_notes");
  const [optionalSubject, setOptionalSubject] = useState<string>(
    "Political Science & International Relations (PSIR)",
  );

  // Sidebar & Search State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMistakesBanner, setShowMistakesBanner] = useState(false);

  // Weak Spots Diagnostics
  const mistakeDiagnostics = useMemo(
    () => extractMistakeDiagnostics(attempts, papers),
    [attempts, papers],
  );

  // Sessions State
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(
    () => `sess_${Date.now()}`,
  );
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Context State
  const [activeTopic, setActiveTopic] = useState("");
  const [activePaperId, setActivePaperId] = useState("");
  const [activeQuestionNo, setActiveQuestionNo] = useState<number | null>(null);

  // Chat State
  const [messages, setMessages] = useState<RevisionMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mobile drawer responsiveness
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Sync format with stage default when stage changes
  const handleStageChange = (newStage: PrepStage) => {
    setStage(newStage);
    const persona = PREP_PERSONAS[newStage];
    if (persona && !persona.supportedFormats.includes(format)) {
      setFormat(persona.defaultFormat);
    }
  };

  // Load config on mount
  useEffect(() => {
    setConfig(getRevisionConfig());
  }, []);

  // Restore saved sessions (Cloud synced with local cache fallback)
  useEffect(() => {
    let isMounted = true;
    const initSessions = async () => {
      setIsCloudSyncing(true);
      try {
        const loaded = await loadRevisionSessions(currentUser?.id);
        if (!isMounted) return;
        if (Array.isArray(loaded) && loaded.length > 0) {
          setSessions(loaded);
          const first = loaded[0];
          setCurrentSessionId(first.id);
          setMessages(first.messages || []);
          if (first.stage) setStage(first.stage);
          if (first.format) setFormat(first.format);
          if (first.optionalSubject) setOptionalSubject(first.optionalSubject);
          if (first.topic) setActiveTopic(first.topic);
          if (first.paperId) setActivePaperId(first.paperId);
          if (first.questionNo !== undefined)
            setActiveQuestionNo(first.questionNo);
        }
      } catch (e) {
        console.warn("Failed to load revision sessions:", e);
      } finally {
        if (isMounted) setIsCloudSyncing(false);
      }
    };

    initSessions();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // Auto-persist active session (Cloud & Local)
  useEffect(() => {
    if (messages.length === 0) return;

    setSessions((prev) => {
      const existing = prev.find((s) => s.id === currentSessionId);
      const firstUser =
        messages.find((m) => m.role === "user")?.content || "Revision Notes";
      const autoTitle =
        activeTopic ||
        firstUser
          .replace(
            /^(help me revise|revise|explain|what is|tell me about)\s+/i,
            "",
          )
          .replace(/[`"'“]/g, "")
          .slice(0, 36)
          .trim();

      const activeSession: StoredSession = {
        id: currentSessionId,
        title: existing?.title || autoTitle || "Revision Session",
        stage,
        format,
        optionalSubject: stage === "optional" ? optionalSubject : undefined,
        messages,
        updatedAt: new Date().toISOString(),
        topic: activeTopic || undefined,
        paperId: activePaperId || undefined,
        questionNo: activeQuestionNo || undefined,
      };

      const remaining = prev.filter((s) => s.id !== currentSessionId);
      const updated = [activeSession, ...remaining].slice(
        0,
        MAX_SAVED_SESSIONS,
      );

      saveRevisionSessions(updated, currentUser?.id).catch((e) =>
        console.warn("Failed saving revision sessions:", e),
      );

      return updated;
    });
  }, [
    messages,
    currentSessionId,
    stage,
    format,
    optionalSubject,
    activeTopic,
    activePaperId,
    activeQuestionNo,
    currentUser?.id,
  ]);

  // URL search params linking
  const lastParamsRef = useRef("");
  useEffect(() => {
    const topicParam = searchParams.get("topic");
    const paperIdParam = searchParams.get("paperId");
    const qParam = searchParams.get("q");

    if (!topicParam && !paperIdParam) return;
    const currentKey = `${topicParam || ""}_${paperIdParam || ""}_${qParam || ""}`;
    if (lastParamsRef.current === currentKey) return;
    lastParamsRef.current = currentKey;

    const newId = `sess_${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    setInputPrompt("");

    if (paperIdParam) {
      setActivePaperId(paperIdParam);
      if (qParam) setActiveQuestionNo(Number(qParam));
      setStage("prelims");
    } else if (topicParam) {
      setActiveTopic(topicParam);
    }
  }, [searchParams]);

  // Active paper & question resolution
  const activePaper = useMemo<QuestionPaper | undefined>(() => {
    if (!activePaperId) return undefined;
    return papers.find((p) => p.id === activePaperId);
  }, [papers, activePaperId]);

  const activeQuestion = useMemo<ParsedQuestion | undefined>(() => {
    if (!activePaper || !activeQuestionNo) return undefined;
    return (activePaper.parsedQuestions || []).find(
      (q) => q.questionNo === activeQuestionNo,
    );
  }, [activePaper, activeQuestionNo]);

  // Active Context
  const activeContext = useMemo<RevisionContext>(() => {
    const paperAttempts = activePaperId
      ? attempts.filter((a) => a.paperId === activePaperId)
      : [];
    const latestAttempt = paperAttempts[paperAttempts.length - 1];
    const studentAns =
      activeQuestionNo && latestAttempt
        ? latestAttempt.answers?.[activeQuestionNo]
        : undefined;

    let attemptSummary: RevisionAttemptSummary | undefined = undefined;
    if (latestAttempt) {
      const wrongQuestions: Array<{
        questionNo: number;
        text: string;
        studentSelected?: string;
        correctAnswer?: string;
      }> = [];

      if (activePaper?.parsedQuestions) {
        for (const q of activePaper.parsedQuestions) {
          const ans = latestAttempt.answers?.[q.questionNo];
          if (ans && !ans.isCorrect && ans.selected) {
            wrongQuestions.push({
              questionNo: q.questionNo,
              text: q.text,
              studentSelected: ans.selected,
              correctAnswer: q.answer,
            });
          }
        }
      }

      attemptSummary = {
        score: latestAttempt.score,
        totalMarks: latestAttempt.maxScore || latestAttempt.totalMarks,
        correctCount: latestAttempt.correct,
        incorrectCount: latestAttempt.incorrect,
        unansweredCount: latestAttempt.unattempted,
        accuracy: Math.round(
          latestAttempt.accuracyPct ||
            (latestAttempt.correct / (latestAttempt.answered || 1)) * 100,
        ),
        completedAt: latestAttempt.finishedAt,
        wrongQuestions: wrongQuestions.slice(0, 8),
      };
    }

    return {
      mode: activePaperId ? "paper" : activeTopic ? "topic" : "open",
      stage,
      format,
      optionalSubject: stage === "optional" ? optionalSubject : undefined,
      topic: activeTopic || undefined,
      paperId: activePaperId || undefined,
      paperTitle: activePaper ? getPaperDisplayTitle(activePaper) : undefined,
      questionNo: activeQuestionNo || undefined,
      question: activeQuestion,
      userAnswer: studentAns,
      attemptId: latestAttempt?.id,
      attemptSummary,
    };
  }, [
    stage,
    format,
    optionalSubject,
    activeTopic,
    activePaperId,
    activeQuestionNo,
    activePaper,
    activeQuestion,
    attempts,
  ]);

  // Handle New Chat
  const handleCreateNewChat = () => {
    const newId = `sess_${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    setInputPrompt("");
    setActiveTopic("");
    setActivePaperId("");
    setActiveQuestionNo(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  // Switch session
  const handleSwitchSession = (s: StoredSession) => {
    setCurrentSessionId(s.id);
    setMessages(s.messages || []);
    if (s.stage) setStage(s.stage);
    if (s.format) setFormat(s.format);
    if (s.optionalSubject) setOptionalSubject(s.optionalSubject);
    setActiveTopic(s.topic || "");
    setActivePaperId(s.paperId || "");
    setActiveQuestionNo(s.questionNo || null);
  };

  // Delete session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    saveRevisionSessions(updated, currentUser?.id).catch((err) =>
      console.warn("Failed saving after session deletion:", err),
    );
    if (id === currentSessionId) {
      if (updated.length > 0) handleSwitchSession(updated[0]);
      else handleCreateNewChat();
    }
  };

  // Save session title rename
  const handleSaveRename = (id: string, e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const trimmed = editingTitle.trim();
    if (trimmed) {
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === id ? { ...s, title: trimmed } : s,
        );
        saveRevisionSessions(updated, currentUser?.id).catch((err) =>
          console.warn("Failed saving after session rename:", err),
        );
        return updated;
      });
    }
    setEditingSessionId(null);
    setEditingTitle("");
  };

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Dispatch query
  const handleSend = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputPrompt).trim();
    if (!promptToSend || isLoading) return;

    const userMessage: RevisionMessage = {
      id: `msg_u_${Date.now()}`,
      role: "user",
      content: promptToSend,
      timestamp: new Date().toISOString(),
      contextSnapshot: {
        stage,
        format,
        topic: activeContext.topic,
        paperTitle: activeContext.paperTitle,
        questionNo: activeContext.questionNo,
      },
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputPrompt("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsLoading(true);

    try {
      const res = await sendRevisionQuery(nextMessages, activeContext, config);
      const assistantMessage: RevisionMessage = {
        id: `msg_a_${Date.now()}`,
        role: "assistant",
        content: res.text,
        timestamp: new Date().toISOString(),
      };
      setMessages([...nextMessages, assistantMessage]);
    } catch (err: any) {
      const errorMsg: RevisionMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Unable to complete revision query**: ${err.message || "An unexpected error occurred."}\n\nPlease verify your AI settings.`,
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages([...nextMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy message
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToastMsg("Copied notes to clipboard!");
    setTimeout(() => {
      setCopiedId(null);
      setToastMsg(null);
    }, 2000);
  };

  // Retry query with optional prompt override
  const handleRetry = (promptOverride?: string) => {
    let promptToRetry = promptOverride;
    if (!promptToRetry) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          promptToRetry = messages[i].content;
          break;
        }
      }
    }
    if (promptToRetry) {
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].isError) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      handleSend(promptToRetry);
    }
  };

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  return (
    <div className="flex-1 min-h-0 flex h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          {toastMsg}
        </div>
      )}

      {/* ── LEFT SIDEBAR: SAVED REVISION SESSIONS ── */}
      <aside
        className={`${
          isSidebarOpen ? "flex" : "hidden"
        } fixed inset-y-0 left-0 z-40 w-72 md:relative md:z-auto border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col h-full shrink-0 shadow-xl md:shadow-none transition-all`}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCreateNewChat}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Revision Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-2.5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search revision notes..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Sessions ({filteredSessions.length})</span>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 space-y-2">
              <MessageSquare className="h-5 w-5 mx-auto text-slate-300 dark:text-slate-700" />
              <p>No revision sessions found.</p>
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isActive = s.id === currentSessionId;
              const isEditing = s.id === editingSessionId;
              const persona = PREP_PERSONAS[s.stage] || PREP_PERSONAS.prelims;

              return (
                <div
                  key={s.id}
                  onClick={() => !isEditing && handleSwitchSession(s)}
                  className={`group relative p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-1.5 cursor-pointer ${
                    isActive
                      ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 shadow-2xs font-medium"
                      : "border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleSaveRename(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(s.id, e);
                          if (e.key === "Escape") setEditingSessionId(null);
                        }}
                        autoFocus
                        className="w-full text-xs font-semibold px-1.5 py-0.5 rounded border border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{persona.icon}</span>
                          <span className="text-xs font-medium truncate block">
                            {s.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{persona.badge}</span>
                          <span>•</span>
                          <span>{s.messages.length} notes</span>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-all"
                    title="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: Export All Notes */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Export All Notes</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN WORKSPACE ── */}
      <main className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Top Control Bar */}
        <header className="px-2 sm:px-5 py-1.5 sm:py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-1.5 sm:gap-2.5 shadow-2xs shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                title="Open sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}

            <PrepStageSelector
              currentStage={stage}
              onSelectStage={handleStageChange}
              selectedOptional={optionalSubject}
              onSelectOptional={(s) => setOptionalSubject(s)}
              mistakeCount={mistakeDiagnostics.totalWrongQuestions}
              isMistakesOpen={showMistakesBanner}
              onToggleMistakes={() => setShowMistakesBanner((prev) => !prev)}
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Cloud Sync Status Indicator */}
            <div
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300"
              title={
                currentUser
                  ? "Chats and revision notes are automatically synced to your cloud account."
                  : "Chats are cached locally. Sign in to sync across devices."
              }
            >
              <Cloud
                className={`h-3.5 w-3.5 ${
                  isCloudSyncing
                    ? "text-indigo-500 animate-pulse"
                    : "text-emerald-500"
                }`}
              />
              <span>
                {isCloudSyncing
                  ? "Syncing..."
                  : currentUser
                    ? "Cloud Synced"
                    : "Local"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Export all chat notes"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export Notes</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Configure AI Provider & Key"
            >
              <Settings2 className="h-3.5 w-3.5 text-slate-500" />
              <span className="capitalize hidden sm:inline">
                {config?.provider || "Configure AI"}
              </span>
            </button>
          </div>
        </header>

        {/* Secondary Bar: Output Format Selector */}
        <div className="px-2 sm:px-5 py-1.5 sm:py-2 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs flex items-center justify-between gap-2 shrink-0">
          <OutputFormatSelector
            currentFormat={format}
            onSelectFormat={(f) => setFormat(f)}
            allowedFormats={PREP_PERSONAS[stage]?.supportedFormats}
          />

          {mistakeDiagnostics.totalWrongQuestions > 0 && (
            <button
              type="button"
              onClick={() => setShowMistakesBanner(!showMistakesBanner)}
              className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Flame className="h-3.5 w-3.5" />
              <span>
                {showMistakesBanner
                  ? "Hide Weak Spots"
                  : `Show Weak Spots (${mistakeDiagnostics.totalWrongQuestions})`}
              </span>
            </button>
          )}
        </div>

        {/* Chat / Message Stream Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Diagnostic Mistakes Widget */}
          {showMistakesBanner && attempts.length > 0 && (
            <div className="max-w-4xl mx-auto w-full transition-all duration-300">
              <MistakeDossierCard
                attempts={attempts}
                papers={papers}
                onClose={() => setShowMistakesBanner(false)}
                onSelectRemediation={(prompt, topic) => {
                  setActiveTopic(topic);
                  handleSend(prompt);
                }}
              />
            </div>
          )}

          {/* First-Principles Guidance Card */}
          {stage === "concept" && (
            <div className="max-w-3xl mx-auto w-full">
              <FirstPrinciplesGuideCard onSelectPrompt={(p) => handleSend(p)} />
            </div>
          )}

          {/* Empty State / Starters */}
          {messages.length === 0 && (
            <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-6 text-center">
              {stage !== "concept" && (
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
                  <Brain className="h-7 w-7" />
                </div>
              )}

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {PREP_PERSONAS[stage].label}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                  {stage === "concept"
                    ? "Clear concepts from first principles without reading 800-page textbooks page by page."
                    : stage === "optional"
                      ? `Scholarly depth, seminal theorists, and comparative frameworks for ${optionalSubject}.`
                      : stage === "mains"
                        ? "Structured 10M/15M answer blueprints with committee and case law value-adds."
                        : stage === "csat"
                          ? "Formula shortcuts, 30-second speed hacks, and elimination techniques."
                          : "Sharpen option elimination, trap detection, and factual precision for Prelims GS-1."}
                </p>
              </div>

              {/* Starter Prompts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left pt-2">
                {STARTER_PROMPTS.filter(
                  (sp) => sp.stage === stage || sp.stage === "prelims",
                )
                  .slice(0, 4)
                  .map((sp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(sp.prompt)}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-sm transition-all text-left space-y-1 group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{sp.icon}</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {sp.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {sp.prompt}
                      </p>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Active Messages */}
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl mx-auto ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-1">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`relative p-4 rounded-2xl text-sm leading-relaxed max-w-[88%] shadow-2xs ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-xs"
                      : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs"
                  }`}
                >
                  {isUser ? (
                    <div className="space-y-1.5">
                      <div className="whitespace-pre-wrap font-medium text-xs sm:text-sm">
                        {msg.content}
                      </div>
                      <div className="flex items-center justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setInputPrompt(msg.content);
                            if (textareaRef.current) {
                              textareaRef.current.focus();
                              textareaRef.current.style.height = "auto";
                              textareaRef.current.style.height = `${Math.min(
                                textareaRef.current.scrollHeight,
                                120,
                              )}px`;
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-200 hover:text-white transition-colors cursor-pointer"
                          title="Edit prompt and re-send"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Edit Prompt</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <RevisionMarkdownRenderer content={msg.content} />
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {msg.isError ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRetry()}
                              disabled={isLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Retry Query</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowSettingsModal(true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            >
                              <Settings2 className="h-3 w-3" />
                              <span>Switch AI / Key</span>
                            </button>
                          </div>
                        ) : (
                          <div />
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-auto cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {copiedId === msg.id ? "Copied" : "Copy Notes"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-3xl mx-auto items-center">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs animate-pulse">
                <Bot className="h-4 w-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Sparkles className="h-4 w-4 animate-spin text-indigo-600" />
                <span>Synthesizing UPSC revision analysis...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── INPUT FOOTER ── */}
        <footer className="px-2.5 py-1.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-1.5 sm:p-2 shadow-2xs focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={(e) => {
                  setInputPrompt(e.target.value);
                  if (textareaRef.current) {
                    textareaRef.current.style.height = "auto";
                    textareaRef.current.style.height = `${Math.min(
                      textareaRef.current.scrollHeight,
                      120,
                    )}px`;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  stage === "concept"
                    ? "Ask to explain any UPSC concept from first principles without reading book page by page..."
                    : stage === "optional"
                      ? `Ask anything on ${optionalSubject} Paper I & II...`
                      : "Ask topic, paste question prompt, or request elimination drill..."
                }
                rows={1}
                className="flex-1 bg-transparent border-0 resize-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden p-1 min-h-[36px] max-h-[120px]"
              />

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputPrompt.trim() || isLoading}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition-all shadow-xs cursor-pointer shrink-0"
                title="Send query (Enter)"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </footer>
      </main>

      {/* Settings Modal */}
      <RevisionSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentConfig={config}
        onSave={(updated) => setConfig(updated)}
        onClear={() => setConfig(null)}
      />

      {/* Notes Export Modal */}
      <NotesExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        sessions={sessions}
        activeSessionId={currentSessionId}
      />
    </div>
  );
}

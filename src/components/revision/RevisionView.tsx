"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Bot,
  Check,
  Copy,
  GraduationCap,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
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
  RevisionProviderConfig,
  getRevisionConfig,
  sendRevisionQuery,
} from "../../lib/revisionAi";
import {
  ParsedQuestion,
  QuestionPaper,
  RevisionAttemptSummary,
  RevisionContext,
  RevisionMessage,
} from "../../lib/types";
import { RevisionMarkdownRenderer } from "./RevisionMarkdownRenderer";
import { RevisionSettingsModal } from "./RevisionSettingsModal";
import { getPaperDisplayTitle } from "../../lib/defaults";

interface StoredSession {
  id: string;
  title: string;
  messages: RevisionMessage[];
  updatedAt: string;
  mode: "general" | "paper" | "syllabus";
  selectedTopic?: string;
  selectedPaperId?: string;
  selectedQuestionNo?: number | null;
}

const MAX_SAVED_SESSIONS = 5;
const SESSIONS_STORAGE_KEY = "upsc_revision_sessions_v2";

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
    topic: "Permutation & Combination (CSAT)",
    category: "GS-III",
    hint: "Formulas, circular seating, identical objects & elimination traps",
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

  // Sidebar visibility (left column) - start closed on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-close sidebar on small screens on initial mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsSidebarOpen(false);
    }
  }, []);

  const closeSidebarOnMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsSidebarOpen(false);
    }
  };

  // Active Mode: 'general' (default free chat), 'paper' (chat with test paper), 'syllabus' (anchored to syllabus item)
  const [mode, setMode] = useState<"general" | "paper" | "syllabus">("general");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedPaperId, setSelectedPaperId] = useState<string>("");
  const [selectedQuestionNo, setSelectedQuestionNo] = useState<number | null>(
    null,
  );

  // Multi-Session State (Up to 5 chats saved in local storage)
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(
    () => `sess_${Date.now()}`,
  );
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Chat State
  const [messages, setMessages] = useState<RevisionMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved provider config on mount
  useEffect(() => {
    const saved = getRevisionConfig();
    setConfig(saved);
  }, []);

  // Restore saved sessions from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (raw) {
        const parsed: StoredSession[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          // Load the most recent session
          const mostRecent = parsed[0];
          setCurrentSessionId(mostRecent.id);
          setMessages(mostRecent.messages || []);
          if (mostRecent.mode) setMode(mostRecent.mode);
          if (mostRecent.selectedTopic)
            setSelectedTopic(mostRecent.selectedTopic);
          if (mostRecent.selectedPaperId)
            setSelectedPaperId(mostRecent.selectedPaperId);
          if (mostRecent.selectedQuestionNo !== undefined) {
            setSelectedQuestionNo(mostRecent.selectedQuestionNo);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load saved revision sessions:", e);
    }
  }, []);

  // Auto-persist active session to localStorage (capped at 5 sessions)
  useEffect(() => {
    if (messages.length === 0) return;

    try {
      setSessions((prevSessions) => {
        const existing = prevSessions.find((s) => s.id === currentSessionId);
        const firstUser =
          messages.find((m) => m.role === "user")?.content || "Revision Chat";
        const autoTitle =
          selectedTopic ||
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
          title:
            existing?.title ||
            (autoTitle.length > 0 ? autoTitle : "Revision Topic"),
          messages,
          updatedAt: new Date().toISOString(),
          mode,
          selectedTopic: selectedTopic || undefined,
          selectedPaperId: selectedPaperId || undefined,
          selectedQuestionNo: selectedQuestionNo || undefined,
        };

        const filtered = prevSessions.filter((s) => s.id !== currentSessionId);
        const updated = [activeSession, ...filtered].slice(
          0,
          MAX_SAVED_SESSIONS,
        );

        try {
          localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}

        return updated;
      });
    } catch (e) {
      console.warn("Failed to persist revision session:", e);
    }
  }, [
    messages,
    currentSessionId,
    mode,
    selectedTopic,
    selectedPaperId,
    selectedQuestionNo,
  ]);

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

  // Create New Chat (starts fresh session, preserving previous in history)
  const handleCreateNewChat = () => {
    closeSidebarOnMobile();
    const newId = `sess_${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    setInputPrompt("");
    setMode("general");
    setSelectedTopic("");
    setSelectedPaperId("");
    setSelectedQuestionNo(null);
    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Switch to a saved session
  const handleSwitchSession = (session: StoredSession) => {
    closeSidebarOnMobile();
    setCurrentSessionId(session.id);
    setMessages(session.messages || []);
    setMode(session.mode || "general");
    setSelectedTopic(session.selectedTopic || "");
    setSelectedPaperId(session.selectedPaperId || "");
    setSelectedQuestionNo(session.selectedQuestionNo || null);
  };

  // Delete a saved session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    if (sessionId === currentSessionId) {
      if (updated.length > 0) {
        handleSwitchSession(updated[0]);
      } else {
        handleCreateNewChat();
      }
    }
  };

  // Start renaming a session inline
  const handleStartRename = (session: StoredSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  // Save renamed session title
  const handleSaveRename = (sessionId: string, e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const trimmed = editingTitle.trim();
    if (trimmed.length > 0) {
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === sessionId ? { ...s, title: trimmed } : s,
        );
        try {
          localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
    setEditingSessionId(null);
    setEditingTitle("");
  };

  // Cancel renaming
  const handleCancelRename = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSessionId(null);
    setEditingTitle("");
  };

  // Resolve currently active paper & question
  const activePaper = useMemo<QuestionPaper | undefined>(() => {
    if (!selectedPaperId || mode !== "paper") return undefined;
    return papers.find((p) => p.id === selectedPaperId);
  }, [papers, selectedPaperId, mode]);

  const activeQuestion = useMemo<ParsedQuestion | undefined>(() => {
    if (!activePaper || !selectedQuestionNo || mode !== "paper")
      return undefined;
    return (activePaper.parsedQuestions || []).find(
      (q) => q.questionNo === selectedQuestionNo,
    );
  }, [activePaper, selectedQuestionNo, mode]);

  // Construct active context
  const activeContext = useMemo<RevisionContext>(() => {
    if (mode === "paper") {
      const paperAttempts = attempts.filter(
        (a) => a.paperId === selectedPaperId,
      );
      const latestAttempt = paperAttempts[paperAttempts.length - 1];
      const studentAns =
        selectedQuestionNo && latestAttempt
          ? latestAttempt.answers?.[selectedQuestionNo]
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
          wrongQuestions: wrongQuestions.slice(0, 10),
        };
      }

      return {
        mode: "paper",
        paperId: selectedPaperId,
        paperTitle: activePaper ? getPaperDisplayTitle(activePaper) : undefined,
        questionNo: selectedQuestionNo || undefined,
        question: activeQuestion,
        userAnswer: studentAns,
        attemptId: latestAttempt?.id,
        attemptSummary,
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
      topic: undefined,
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
      const res = await sendRevisionQuery(nextMessages, activeContext, config);
      const reply = typeof res === "string" ? res : res.text;

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
        content: `⚠️ **Unable to complete query**: ${err.message || "An unexpected error occurred."}\n\n*Please verify your connection or check AI settings.*`,
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages([...nextMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
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

  const handleClearActiveChat = () => {
    setMessages([]);
    handleDeleteSession(currentSessionId, { stopPropagation: () => {} } as any);
    setToastMsg("Chat cleared.");
    setTimeout(() => setToastMsg(null), 2500);
  };

  return (
    <div className="flex-1 min-h-0 flex h-full w-full overflow-hidden bg-slate-100/60 dark:bg-slate-950 relative">
      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── LEFT SIDEBAR: SAVED CHATS COLUMN (Store up to 5) ── */}
      <aside
        className={`${
          isSidebarOpen ? "flex" : "hidden"
        } fixed inset-y-0 left-0 z-50 w-72 sm:relative sm:z-auto sm:inset-auto ${
          isSidebarOpen ? "sm:flex" : "sm:hidden"
        } border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col h-full shrink-0 shadow-2xl sm:shadow-none transition-all`}
      >
        {/* Sidebar Header: New Chat */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCreateNewChat}
            className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
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

        {/* Saved Sessions List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1">
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Saved Chats ({sessions.length}/5)</span>
          </div>

          {sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 italic space-y-1">
              <MessageSquare className="h-5 w-5 mx-auto text-slate-300 dark:text-slate-700 mb-1" />
              <p>No saved chats yet.</p>
              <p className="text-[11px]">
                Ask any UPSC topic to automatically store up to 5 chats.
              </p>
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === currentSessionId;
              const isEditing = s.id === editingSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => !isEditing && handleSwitchSession(s)}
                  className={`group relative p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-1.5 ${
                    isActive
                      ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 shadow-2xs font-medium"
                      : "border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                  } ${isEditing ? "cursor-default" : "cursor-pointer"}`}
                >
                  {isEditing ? (
                    <form
                      onSubmit={(e) => handleSaveRename(s.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 w-full py-0.5"
                    >
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Escape") handleCancelRename();
                        }}
                        className="flex-1 text-xs px-2 py-1 rounded-md border border-indigo-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
                      />
                      <button
                        type="submit"
                        className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded cursor-pointer shrink-0"
                        title="Save name"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRename}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded cursor-pointer shrink-0"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <MessageSquare
                          className={`h-4 w-4 shrink-0 mt-0.5 ${
                            isActive
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-slate-400 group-hover:text-slate-600"
                          }`}
                        />
                        <div className="truncate flex-1">
                          <div className="text-xs truncate font-semibold leading-snug">
                            {s.title}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>{s.messages.length} msgs</span>
                            <span>•</span>
                            <span>
                              {new Date(s.updatedAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(s, e)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-all cursor-pointer"
                          title="Rename chat"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer"
                          title="Delete chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: Provider Status & Settings */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="w-full flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs text-slate-700 dark:text-slate-200 font-medium transition-all shadow-2xs cursor-pointer"
            title="Configure AI Provider & API Key"
          >
            <div className="flex items-center gap-2 truncate">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  config?.apiKey
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-amber-500"
                }`}
              />
              <span
                className={`font-semibold truncate ${
                  config?.apiKey
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {config?.apiKey
                  ? config.provider === "gemini"
                    ? "Google Gemini"
                    : config.provider === "openai"
                      ? "OpenAI"
                      : config.provider === "anthropic"
                        ? "Claude"
                        : config.provider === "groq"
                          ? "Groq"
                          : "Custom AI"
                  : "API Key / Provider"}
              </span>
            </div>
            <Settings2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          </button>
        </div>
      </aside>

      {/* ── RIGHT MAIN COLUMN: ACTIVE CHAT WORKSPACE ── */}
      <main className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
        {/* Main Workspace Header */}
        <div className="shrink-0 px-3 sm:px-6 py-2 sm:py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          {/* Top row on mobile / Left group on desktop */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer ${
                  isSidebarOpen ? "sm:hidden" : ""
                }`}
                title="Toggle saved chats"
              >
                <PanelLeftOpen className="h-4 w-4 text-indigo-600" />
                <span className="hidden sm:inline">Saved Chats</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">
                  {sessions.length}/5
                </span>
              </button>

              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Revision workspace
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Syllabus-focused study, landmark SC judgements, PIB updates, and
                  question dissection.
                </p>
              </div>
            </div>

            {/* Mobile actions: AI Settings & Clear */}
            <div className="flex sm:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 font-medium shadow-2xs"
                title="Configure AI Provider & API Key"
              >
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    config?.apiKey ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <span className="text-[11px] font-semibold">
                  {config?.apiKey
                    ? config.provider === "gemini"
                      ? "Gemini"
                      : config.provider === "openai"
                        ? "OpenAI"
                        : config.provider === "anthropic"
                          ? "Claude"
                          : config.provider === "groq"
                            ? "Groq"
                            : "AI"
                    : "API Key"}
                </span>
                <Settings2 className="h-3 w-3 text-slate-400" />
              </button>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearActiveChat}
                  title="Clear current conversation"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Controls: Mode Switcher + Desktop actions */}
          <div className="flex items-center justify-between sm:justify-end gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
            <div className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMode("general");
                  setSelectedTopic("");
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  mode === "general"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>General Revision</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("paper")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  mode === "paper"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>Chat with Paper</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("syllabus")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  mode === "syllabus"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Syllabus Track</span>
              </button>
            </div>

            {/* Desktop-only: AI Provider & Clear */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs text-slate-700 dark:text-slate-200 font-medium transition-all shadow-2xs cursor-pointer"
                title="Configure AI Provider & API Key"
              >
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    config?.apiKey
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-amber-500"
                  }`}
                />
                <span
                  className={`font-semibold ${
                    config?.apiKey
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {config?.apiKey
                    ? config.provider === "gemini"
                      ? "Gemini"
                      : config.provider === "openai"
                        ? "OpenAI"
                        : config.provider === "anthropic"
                          ? "Claude"
                          : config.provider === "groq"
                            ? "Groq"
                            : "Custom AI"
                    : "API Key"}
                </span>
                <Settings2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </button>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearActiveChat}
                  title="Clear current conversation"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Paper / Syllabus Sub-Context Bar (When Selected) */}
        {mode === "paper" && (
          <div className="shrink-0 px-3 sm:px-6 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5 shrink-0">
              <Paperclip className="h-4 w-4 text-indigo-500" /> Select Paper & Question:
            </span>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
              <select
                value={selectedPaperId}
                onChange={(e) => {
                  setSelectedPaperId(e.target.value);
                  setSelectedQuestionNo(null);
                }}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium w-full sm:w-auto sm:min-w-[220px] max-w-full sm:max-w-xs"
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
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium w-full sm:w-auto sm:max-w-[280px] max-w-full"
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
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900 self-start sm:self-auto shrink-0">
                  Active: Question #{activeQuestion.questionNo}
                </span>
              )}
            </div>
          </div>
        )}

        {mode === "syllabus" && (
          <div className="shrink-0 px-3 sm:px-6 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5 shrink-0">
              <BookOpen className="h-4 w-4 text-indigo-500" /> Syllabus Topic:
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 min-w-0">
              {syllabusItems.length > 0 ? (
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium w-full sm:w-auto sm:min-w-[240px] max-w-full sm:max-w-md"
                >
                  <option value="">Choose a tracked syllabus item...</option>
                  {syllabusItems.map((item) => (
                    <option key={item.id} value={item.title}>
                      {item.title}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-slate-500 italic text-[11px]">
                  No syllabus outline saved yet. Go to Syllabus tab to paste an outline.
                </span>
              )}

              {selectedTopic && (
                <button
                  type="button"
                  onClick={() => setSelectedTopic("")}
                  className="text-slate-400 hover:text-slate-600 p-1 shrink-0"
                  title="Clear topic selection"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMsg && (
          <div className="mx-4 mt-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 font-medium flex items-center gap-2 animate-in fade-in duration-200 shrink-0">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Central Scrollable Chat Feed */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-4 space-y-4">
          {messages.length === 0 ? (
            /* First-Time / Blank Chat State */
            <div className="max-w-2xl mx-auto my-6 space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-indigo-100 dark:border-indigo-950/80 shadow-xs text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="p-3 rounded-2xl bg-indigo-600 text-white shrink-0 shadow-md">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      UPSC Civil Services AI Revision Mentor
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      Syllabus-focused mentor for Prelims, Mains, and CSAT. Ask
                      any topic or question to receive exact Constitutional
                      Articles, landmark Supreme Court rulings, contemporary PIB
                      updates, and KaTeX mathematical formulas.
                    </p>
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setShowSettingsModal(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Settings2 className="h-3.5 w-3.5 text-indigo-500" />
                        <span>
                          {config?.apiKey
                            ? `Connected: ${config.provider === "gemini" ? "Google Gemini" : config.provider === "openai" ? "OpenAI" : config.provider === "anthropic" ? "Claude" : "Groq"}`
                            : "Configure API Key & Provider (Gemini, Groq, OpenAI, Claude)"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* High-Yield Starter Suggestions */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Click any topic to explore:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STARTER_TOPICS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        handleSend(
                          `Comprehensive UPSC revision for "${item.topic}": constitutional/statutory provisions, landmark judgements, contemporary PIB policy touchpoints, and practical problem-solving rules.`,
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
                  className={`rounded-2xl p-3.5 sm:p-4 shadow-xs text-xs sm:text-sm ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white font-medium ml-4 sm:ml-12 max-w-[88%] sm:max-w-2xl"
                      : msg.isError || msg.content.startsWith("⚠️")
                        ? "bg-rose-50/75 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-slate-800 dark:text-slate-200 w-full"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 w-full"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  ) : msg.isError || msg.content.startsWith("⚠️") ? (
                    <div className="space-y-3">
                      <RevisionMarkdownRenderer content={msg.content} />
                      <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <span className="text-rose-600 dark:text-rose-400 font-medium text-[11px]">
                          Generation stopped
                        </span>
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          {config?.apiKey && (
                            <button
                              type="button"
                              onClick={() => {
                                clearRevisionConfig();
                                setConfig(null);
                                setToastMsg("Switched to Free AI. Retrying...");
                                const lastUser = [...messages]
                                  .reverse()
                                  .find((m) => m.role === "user");
                                if (lastUser) {
                                  handleSend(lastUser.content);
                                }
                              }}
                              disabled={isLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Switch to Free AI</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const lastUser = [...messages]
                                .reverse()
                                .find((m) => m.role === "user");
                              if (lastUser) {
                                handleSend(lastUser.content);
                              }
                            }}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Retry</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowSettingsModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            <span>AI Settings</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <RevisionMarkdownRenderer content={msg.content} />

                      {/* Clean Copy Action */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
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
                          <span>
                            {copiedId === msg.id ? "Copied!" : "Copy Notes"}
                          </span>
                        </button>
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
                  Synthesizing response...
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Grounding in UPSC syllabus, judgements & formulas.
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Message Input Box */}
        <div className="shrink-0 p-2.5 sm:p-3 sm:px-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex flex-col gap-2 max-w-4xl mx-auto"
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
                    ? `Ask about Question #${activeQuestion.questionNo}...`
                    : mode === "paper"
                      ? "Ask anything about this question paper..."
                      : mode === "syllabus" && selectedTopic
                        ? `Ask anything on ${selectedTopic}...`
                        : "Ask any UPSC topic or doubt..."
                }
                className="w-full resize-none px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-normal leading-relaxed shadow-xs"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
                <span className="hidden sm:inline">Press Enter to send, Shift+Enter for newline</span>
                {mode === "syllabus" && selectedTopic && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded text-indigo-700 dark:text-indigo-300 font-medium truncate max-w-[200px] sm:max-w-none">
                    <span className="truncate">Topic: {selectedTopic}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTopic("")}
                      className="p-0.5 hover:text-rose-600 rounded cursor-pointer shrink-0"
                      title="Clear syllabus topic"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !inputPrompt.trim()}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Ask Mentor</span>
              </button>
            </div>
          </form>
        </div>
      </main>

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

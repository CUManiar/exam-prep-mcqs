"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  ExternalLink,
  Loader2,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  User,
  X,
} from "lucide-react";
import {
  clearRevisionConfig,
  getRevisionConfig,
  RevisionProviderConfig,
  saveRevisionConfig,
} from "../lib/revisionAi";
import { RevisionMessage } from "../lib/types";
import { RevisionMarkdownRenderer } from "./revision/RevisionMarkdownRenderer";
import { RevisionSettingsModal } from "./revision/RevisionSettingsModal";

export interface InlineQuestionOption {
  id: string;
  text: string;
}

interface InlineQuestionAiChatProps {
  paperId: string;
  paperTitle?: string;
  questionNo: number;
  questionText: string;
  options?: InlineQuestionOption[];
  userAnswer?: string | null;
  correctAnswer?: string | null;
  explanation?: string;
  studentNote?: string;
  onClose: () => void;
}

interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

export function InlineQuestionAiChat({
  paperId,
  paperTitle,
  questionNo,
  questionText,
  options = [],
  userAnswer,
  correctAnswer,
  explanation,
  studentNote,
  onClose,
}: InlineQuestionAiChatProps) {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<RevisionProviderConfig | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConfig(getRevisionConfig());
  }, []);

  // Reset inline thread if user navigates to a different question
  useEffect(() => {
    setMessages([]);
    setInput("");
    setIsLoading(false);
  }, [paperId, questionNo]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, isLoading]);

  const buildQuestionContextBlock = () => {
    const optsText = options.map((o) => `  ${o.id}) ${o.text}`).join("\n");
    return [
      `[QUESTION CONTEXT — Q${questionNo}${paperTitle ? ` from "${paperTitle}"` : ""}]`,
      `Question: ${questionText}`,
      optsText ? `Options:\n${optsText}` : "",
      userAnswer
        ? `Student's Answer: ${userAnswer}`
        : "Student's Answer: Unattempted",
      correctAnswer ? `Correct Answer: ${correctAnswer}` : "",
      studentNote ? `Student's Note: ${studentNote}` : "",
      explanation ? `Reference Explanation: ${explanation}` : "",
      `Instruction: Answer concisely and clearly for a quick inline doubt (bullet points, no fluff).`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const sendQuery = async (
    promptText?: string,
    overrideHistory?: ChatItem[],
  ) => {
    const text = (promptText ?? input).trim();
    if (!text || isLoading) return;

    const currentHistory = overrideHistory ?? messages;
    const userMsg: ChatItem = {
      id: `q-${Date.now()}-u`,
      role: "user",
      content: text,
    };

    const nextMessages = [...currentHistory, userMsg];
    setMessages(nextMessages);
    if (!promptText) setInput("");
    setIsLoading(true);

    const activeConfig = getRevisionConfig();
    setConfig(activeConfig);

    // Attach question context to the first message sent to the stateless API
    const contextBlock = buildQuestionContextBlock();
    const apiMessages: RevisionMessage[] = nextMessages.map((m, idx) => ({
      id: m.id,
      role: m.role,
      content:
        idx === 0 && m.role === "user"
          ? `${contextBlock}\n\nStudent Doubt: ${m.content}`
          : m.content,
      timestamp: new Date().toISOString(),
    }));

    try {
      const res = await fetch("/api/revision/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          context: {
            mode: "open",
            topic: `Q${questionNo} Quick Doubt`,
          },
          providerConfig: activeConfig,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to get AI response.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `q-${Date.now()}-a`,
          role: "assistant",
          content: data.text || "No response received.",
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `q-${Date.now()}-err`,
          role: "assistant",
          content:
            err?.message ||
            "Could not reach AI mentor. Please verify your AI key or try again.",
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    const lastUserIdx = [...messages]
      .reverse()
      .findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const actualIdx = messages.length - 1 - lastUserIdx;
    const promptToRetry = messages[actualIdx].content;
    const priorHistory = messages.slice(0, actualIdx);
    sendQuery(promptToRetry, priorHistory);
  };

  const quickPrompts = [
    userAnswer && correctAnswer && userAnswer !== correctAnswer
      ? "Why is my option wrong?"
      : "Explain the core concept simply",
    "Elimination trick for this?",
    "Give a quick memory hook",
  ];

  return (
    <div className="mt-3 rounded-xl border border-indigo-200 bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-indigo-50/80 border-b border-indigo-100">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          <span className="text-xs font-bold text-indigo-950 truncate">
            Quick Doubt · Q{questionNo}
          </span>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-indigo-200 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100/60 transition-colors cursor-pointer shrink-0"
            title="Switch AI Provider or API Key"
          >
            <Settings2 className="h-2.5 w-2.5" />
            <span className="capitalize">{config?.provider || "Free AI"}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={`/revision?paperId=${encodeURIComponent(paperId)}&q=${questionNo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
            title="Open in full Revision Chat"
          >
            <span className="hidden sm:inline">Full Chat</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer"
            title="Close quick AI Q&A"
            aria-label="Close quick AI Q&A"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Starter Chips */}
      {messages.length === 0 && (
        <div className="px-3 pt-2.5 pb-1 flex flex-wrap gap-1.5">
          {quickPrompts.map((qp) => (
            <button
              key={qp}
              type="button"
              disabled={isLoading}
              onClick={() => sendQuery(qp)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-[11px] font-medium text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer"
            >
              {qp}
            </button>
          ))}
        </div>
      )}

      {/* Messages Thread */}
      {messages.length > 0 && (
        <div className="px-3 py-2.5 space-y-2.5 max-h-72 overflow-y-auto bg-slate-50/40">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {m.role === "assistant" && (
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white font-medium"
                    : m.isError
                      ? "bg-rose-50 border border-rose-200 text-rose-800 space-y-1.5"
                      : "bg-white border border-slate-200 text-slate-800 shadow-2xs"
                }`}
              >
                {m.role === "user" ? (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                ) : (
                  <>
                    <RevisionMarkdownRenderer content={m.content} />
                    {m.isError && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-semibold cursor-pointer"
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                          <span>Retry</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowSettings(true)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-700 text-[10px] font-semibold cursor-pointer"
                        >
                          <Settings2 className="h-2.5 w-2.5" />
                          <span>Switch AI</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {m.role === "user" && (
                <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </div>
              <span>Thinking...</span>
            </div>
          )}
          <div ref={listEndRef} />
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendQuery();
        }}
        className="flex items-center gap-1.5 p-2 border-t border-slate-100 bg-white"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask 2–3 quick follow-up doubts right here..."
          disabled={isLoading}
          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0"
          title="Send question"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>

      <RevisionSettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          setConfig(getRevisionConfig());
        }}
        currentConfig={config}
        onSave={(newCfg) => {
          saveRevisionConfig(newCfg);
          setConfig(newCfg);
          setShowSettings(false);
        }}
        onClear={() => {
          clearRevisionConfig();
          setConfig(getRevisionConfig());
        }}
      />
    </div>
  );
}

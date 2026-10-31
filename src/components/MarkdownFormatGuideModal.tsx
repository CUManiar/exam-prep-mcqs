"use client";

import { useState } from "react";
import {
  X,
  Copy,
  Check,
  FileCode,
  Sparkles,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Download,
} from "lucide-react";
import {
  MARKDOWN_PAPER_TEMPLATE,
  ANSWER_KEY_TEMPLATE,
  AI_GENERATION_PROMPT,
} from "../data/markdownHelperTemplates";
import { ModalShell } from "./ModalShell";

interface MarkdownFormatGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate?: (template: string, answerKey: string) => void;
  defaultTab?: "template" | "ai_prompt";
}

export function MarkdownFormatGuideModal({
  isOpen,
  onClose,
  onApplyTemplate,
  defaultTab = "template",
}: MarkdownFormatGuideModalProps) {
  const [activeTab, setActiveTab] = useState<"template" | "ai_prompt">(
    defaultTab,
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="markdown-guide-title"
      describedBy="markdown-guide-description"
      showCloseButton={false}
      className="flex w-full max-w-3xl flex-col overflow-hidden p-0"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-50/70 via-white to-blue-50/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-700 p-2 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="markdown-guide-title"
                data-modal-initial-focus
                tabIndex={-1}
                className="text-base font-semibold tracking-tight text-slate-900"
              >
                Markdown Paper & AI Prompt Helper
              </h2>
              <p
                id="markdown-guide-description"
                className="text-xs font-medium text-slate-500"
              >
                Everything you need to format custom tests or prompt AI in
                seconds
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Markdown guide"
            className="modal-close-static"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 bg-slate-50/80 border-b border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("template")}
            className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "template"
                ? "bg-blue-700 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>1. Format Template & Rules</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai_prompt")}
            className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "ai_prompt"
                ? "bg-blue-700 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>2. Pre-Made AI Prompt (ChatGPT/Claude/Gemini)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-700 leading-relaxed">
          {activeTab === "template" ? (
            <div className="space-y-5">
              {/* Rules Overview Callout */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <span>How the Markdown Parser Works</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>
                    <strong>Optional Exam Header:</strong> Put metadata (e.g.{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px]">
                      EXAM:
                    </code>
                    ,{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px]">
                      SUBJECT:
                    </code>
                    ,{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px]">
                      INSTRUCTIONS:
                    </code>
                    ) before the very first{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px]">
                      ---
                    </code>
                    .
                  </li>
                  <li>
                    <strong>Question Separator:</strong> Separate each question
                    block using a line with only{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px]">
                      ---
                    </code>
                    .
                  </li>
                  <li>
                    <strong>Options Format:</strong> Mark 4 options as{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px]">
                      (a)
                    </code>
                    ,{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px]">
                      (b)
                    </code>
                    ,{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px]">
                      (c)
                    </code>
                    ,{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px]">
                      (d)
                    </code>
                    .
                  </li>
                  <li>
                    <strong>Answer Key Syntax:</strong> Paste answers like{" "}
                    <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px]">
                      1. b &quot;&quot;&quot; explanation / HTML &quot;&quot;&quot;
                    </code>{" "}
                    for auto-evaluation and rich reviews. Rich HTML formatting (e.g. &lt;b&gt;, &lt;ul&gt;, &lt;table&gt;) inside triple quotes is fully supported and converted automatically.
                  </li>
                </ul>
              </div>

              {/* Template Section 1: Questionnaire */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-blue-700" />
                    Questionnaire (.md) Structure Template
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(MARKDOWN_PAPER_TEMPLATE, "qp_template")
                      }
                      className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      {copiedKey === "qp_template" ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Template</span>
                        </>
                      )}
                    </button>
                    {onApplyTemplate && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyTemplate(
                            MARKDOWN_PAPER_TEMPLATE,
                            ANSWER_KEY_TEMPLATE,
                          );
                          onClose();
                        }}
                        className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg shadow-2xs transition-colors"
                      >
                        <ArrowRight className="h-3 w-3" />
                        <span>Insert into Form</span>
                      </button>
                    )}
                  </div>
                </div>
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-56 leading-relaxed border border-slate-800 shadow-inner">
                  {MARKDOWN_PAPER_TEMPLATE}
                </pre>
              </div>

              {/* Template Section 2: Answer Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Answer Key & Detailed Explanations (.txt) Template
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(ANSWER_KEY_TEMPLATE, "ak_template")
                    }
                    className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
                  >
                    {copiedKey === "ak_template" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Key</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-36 leading-relaxed border border-slate-800 shadow-inner">
                  {ANSWER_KEY_TEMPLATE}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* AI Prompt Header Card */}
              <div className="space-y-2 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-blue-700 p-1 text-white shadow-2xs">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-bold text-blue-950">
                    Instant AI Question Generator
                  </span>
                </div>
                <p className="text-slate-600">
                  Copy this prompt into <strong>ChatGPT</strong>,{" "}
                  <strong>Claude</strong>, or <strong>Gemini</strong>. Replace
                  the bracketed topic with your syllabus subject or coaching
                  notes, and the AI will output the exact format this app
                  requires.
                </p>
              </div>

              {/* Prompt Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    Pre-Made AI Master Prompt:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(AI_GENERATION_PROMPT, "ai_prompt")
                    }
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-800"
                  >
                    {copiedKey === "ai_prompt" ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Prompt Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Full AI Prompt</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <pre className="max-h-72 overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-blue-200">
                    {AI_GENERATION_PROMPT}
                  </pre>
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">
                  💡 Quick Workflow Tip:
                </p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>
                    Click <strong>Copy Full AI Prompt</strong> above.
                  </li>
                  <li>
                    Paste it into Claude, ChatGPT, or Gemini and specify your
                    topic.
                  </li>
                  <li>
                    Copy the AI&apos;s generated test into the{" "}
                    <strong>Question Paper</strong> box and the answer key into
                    the <strong>Answer Key</strong> box!
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-[11px] text-slate-500">
            Supports UPSC Prelims GS-I, GS-II CSAT, and custom coaching test
            series.
          </span>
          <button type="button" onClick={onClose} className="button-secondary">
            Close
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

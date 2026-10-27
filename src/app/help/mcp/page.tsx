"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clipboard,
  ExternalLink,
  FileText,
  KeyRound,
  ListChecks,
  MessageSquareText,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { DEFAULT_PROD_URL } from "../../../lib/config";

const promptExamples = [
  "Show my overall progress and the papers I have not attempted yet.",
  "What was my average score across my last 3 CSAT exams?",
  "Replace my custom syllabus with this Markdown tree: [paste your .md outline]",
  "Search my papers for questions about federalism.",
  "Record 87 out of 200 for my Prelims GS1 mock.",
];

const faqItems = [
  {
    question: "What does the AI connection let me do?",
    answer:
      "It lets ChatGPT, Claude, or another compatible assistant read your papers, progress, syllabus, and attempts. With your approval, it can also import papers, update completion, record results, and hide pre-loaded papers.",
  },
  {
    question: "Do students need to run a command or install anything?",
    answer:
      "No. Students only copy the remote MCP URL, add it in their chatbot, and complete the portal sign-in. Any database setup is a one-time maintainer task for the deployed portal.",
  },
  {
    question: "How do I add dates to my syllabus?",
    answer:
      "Put a date in square brackets at the end of a heading or topic, for example ## History [30 Nov 2026]. Undated children inherit the nearest parent date. The portal uses those dates to show leading, on track, or lagging.",
  },
  {
    question: "Can the chatbot change my data without asking?",
    answer:
      "Write actions require the portal write permission, and your chatbot should ask for confirmation before saving them. You can revoke the connection from your account settings.",
  },
  {
    question: "Why can’t I see my uploaded paper?",
    answer:
      "Open account preferences and check whether Show only my uploaded papers is enabled. If it is enabled, pre-loaded papers are intentionally hidden while your papers remain available.",
  },
  {
    question: "How are 'last N exams' calculated?",
    answer:
      "Attempt history is newest-first and counts the latest attempt from each distinct paper by default. That means the last 3 CSAT exams are three different paper sets, even if you retried one of them several times. Ask explicitly for every attempt when you want retries included.",
  },
  {
    question: "Can Markdown papers contain cloze questions?",
    answer:
      'Yes. Leave out all options and write a one- or two-line prompt. The student gets a free-text answer box. In the answer key, use only the question number and a quoted explanation, such as 1. """Reference explanation""".',
  },
];

const helpTopics = [
  {
    title: "Getting started",
    description: "Connect your AI assistant in a few minutes.",
    icon: Rocket,
    href: "#connect",
    tone: "bg-violet-50 text-violet-700",
  },
  {
    title: "Syllabus & progress",
    description: "Use Markdown, dates, and natural-language updates.",
    icon: ListChecks,
    href: "#syllabus",
    tone: "bg-blue-50 text-blue-700",
  },
  {
    title: "Security & access",
    description: "Understand permissions and revoke access.",
    icon: KeyRound,
    href: "#security",
    tone: "bg-emerald-50 text-emerald-700",
  },
];

const connectionSteps = [
  {
    number: "01",
    title: "Add the URL",
    description: "Open your chatbot’s connector or remote MCP settings.",
  },
  {
    number: "02",
    title: "Authorize",
    description: "Sign in and approve the access requested by the portal.",
  },
  {
    number: "03",
    title: "Start asking",
    description: "Select the connection and ask about your own study data.",
  },
];

export default function McpHelpPage() {
  const endpoint = `${DEFAULT_PROD_URL}/mcp`;
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");

  const filteredFaqs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return faqItems;
    return faqItems.filter(({ question, answer }) =>
      `${question} ${answer}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  const copyEndpoint = async () => {
    await navigator.clipboard.writeText(endpoint);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const searchHelp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="page-container max-w-6xl space-y-7">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to overview
      </Link>

      <section className="relative overflow-hidden rounded-[1.75rem] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 px-6 py-8 shadow-sm sm:px-10 sm:py-11">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" /> AI Help
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Need a smarter study assistant?
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Connect your preferred AI assistant to UPSC Prep Hub and get help
            with papers, progress, syllabus planning, and revision—without
            leaving your study workspace.
          </p>
          <form
            onSubmit={searchHelp}
            className="mt-7 flex max-w-2xl flex-col gap-2 sm:flex-row"
          >
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search help topics..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white/90 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </label>
            <button type="submit" className="button-primary h-11 px-5">
              Search help <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {helpTopics.map(({ title, description, icon: Icon, href, tone }) => (
          <a
            key={title}
            href={href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
          >
            <span
              className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-sm font-semibold text-slate-900">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-violet-700">
              Explore{" "}
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </a>
        ))}
      </div>

      <section id="connect" className="scroll-mt-24 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
              01 · Connect
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              One connection. Your whole study workspace.
            </h2>
          </div>
          <WandSparkles className="hidden h-7 w-7 text-violet-500 sm:block" />
        </div>
        <div className="overflow-hidden rounded-3xl border border-violet-200/80 bg-white shadow-sm shadow-violet-100/70">
          <div className="flex flex-col gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-blue-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-xs font-bold text-white shadow-sm shadow-violet-200">
                01
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Connect your study workspace
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Three steps · no installation required
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700">
              Remote MCP
            </span>
          </div>

          <div className="p-3 sm:p-4">
            <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-200 sm:p-6">
              <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">
                  Server URL
                </p>
                <h3 className="mt-2 text-lg font-semibold sm:text-xl">
                  Copy this into your chatbot
                </h3>
                <div className="mt-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <code className="min-w-0 overflow-x-auto whitespace-nowrap rounded-xl border border-white/10 bg-white/[0.08] px-3 py-3 font-mono text-xs leading-5 text-slate-200">
                    {endpoint}
                  </code>
                  <button
                    type="button"
                    onClick={copyEndpoint}
                    aria-label="Copy MCP server URL"
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:ring-offset-2 focus:ring-offset-slate-950"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Clipboard className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied" : "Copy URL"}
                  </button>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-400">
                  No command or installation. Sign in when the assistant opens
                  the UPSC Prep Hub authorization screen.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {connectionSteps.map(({ number, title, description }) => (
                <div
                  key={number}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-violet-200 hover:bg-white hover:shadow-sm sm:p-5"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-xs font-bold text-violet-700">
                    {number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {description}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="syllabus"
        className="scroll-mt-24 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:p-7"
      >
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              02 · Syllabus & progress
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Give your assistant the outline you already use.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Paste Markdown into Syllabus. Nested headings become the tree,
              exact duplicate topics share completion, and dates flow down to
              undated children.
            </p>
            <Link
              href="/syllabus"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              Open syllabus tracker <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
          <pre className="overflow-x-auto rounded-2xl border border-blue-100 bg-slate-950 p-5 text-xs leading-6 text-slate-100 shadow-lg shadow-blue-100 sm:text-sm">
            <code>{`# GS Paper 1
## History [30 Nov 2026]
- Ancient India
  - Indus Valley Civilization [20 Nov 2026]
  - Vedic Age
## Polity
- Constitution`}</code>
          </pre>
        </div>
      </section>

      <section
        id="security"
        className="scroll-mt-24 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]"
      >
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                03 · Security & access
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                You stay in control.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                The assistant can only access the signed-in student’s data. Read
                and write permissions are separated, and you can revoke access
                from account settings.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <MessageSquareText className="mt-0.5 h-5 w-5 text-violet-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Try asking
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Natural language works best. Ask for a preview before any write
                action.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {promptExamples.slice(0, 2).map((prompt) => (
              <span
                key={prompt}
                className="rounded-full bg-violet-50 px-3 py-2 text-xs leading-5 text-violet-800"
              >
                “{prompt}”
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Quick answers
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Frequently asked questions
            </h2>
          </div>
          <span className="text-sm text-slate-400">
            {filteredFaqs.length} results
          </span>
        </div>
        <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {filteredFaqs.length ? (
            filteredFaqs.map(({ question, answer }, index) => (
              <details
                key={question}
                open={Boolean(query) || index === 0}
                className="group p-4 sm:p-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-800 marker:hidden">
                  {question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <p className="max-w-3xl pt-3 text-sm leading-6 text-slate-500">
                  {answer}
                </p>
              </details>
            ))
          ) : (
            <p className="p-6 text-sm text-slate-500">
              No help topic matched “{query}”.
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-slate-950 px-5 py-6 text-center text-white sm:flex-row sm:px-7 sm:text-left">
        <div>
          <h2 className="text-lg font-semibold">
            Ready to study with less friction?
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Connect your assistant and keep your attention on the syllabus.
          </p>
        </div>
        <Link
          href="#connect"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-violet-50"
        >
          Connect now <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

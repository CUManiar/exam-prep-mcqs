"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  FileUp,
  Mail,
  Play,
  Sparkles,
  Target,
  FileCheck,
  Layers,
  Bot,
  Compass,
  Brain,
  Award,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { QuestionPaper } from "../lib/types";
import { isPaperFree, isUserUploadedPaper } from "../lib/defaults";

interface LandingViewProps {
  papers: QuestionPaper[];
  onStartExam: (paper: QuestionPaper, mode: "practice" | "mock") => void;
  onOpenAuth: () => void;
}

export function LandingView({
  papers,
  onStartExam,
  onOpenAuth,
}: LandingViewProps) {
  const featuredPaper =
    papers.find(
      (paper) =>
        paper.year === "2026" &&
        paper.category === "prelims" &&
        paper.examType === "objective" &&
        isPaperFree(paper) &&
        !isUserUploadedPaper(paper),
    ) ||
    papers.find(
      (paper) =>
        paper.examType === "objective" &&
        isPaperFree(paper) &&
        !isUserUploadedPaper(paper),
    );

  return (
    <div className="public-home">
      {/* ── 1. HERO SECTION ── */}
      <section className="public-hero page-container">
        <div className="public-hero-copy">
          <p className="page-eyebrow">
            UPSC CSE Assessment Workspace · Prelims &amp; Mains
          </p>
          <h1 className="public-title">
            The complete workspace for serious civil services preparation.
          </h1>
          <p className="public-intro">
            From simulated Prelims mocks with question-by-question AI scratchpad
            auditing, targeted mistake re-tests, and longitudinal score
            trajectories, to line-by-line Mains answer evaluation, free AI
            revision dossiers, and Claude &amp; ChatGPT MCP integration.
          </p>
          <div className="public-actions">
            {featuredPaper && (
              <button
                type="button"
                onClick={() => onStartExam(featuredPaper, "practice")}
                className="button-primary cursor-pointer"
              >
                <Play aria-hidden="true" className="h-4 w-4" />
                Try free practice test
              </button>
            )}
            <Link href="/mains" className="button-secondary cursor-pointer">
              <FileCheck
                aria-hidden="true"
                className="h-4 w-4 text-indigo-600"
              />
              Evaluate Mains Answer
            </Link>
          </div>
          <p className="public-note">
            {featuredPaper
              ? `${featuredPaper.label} is available to try immediately in practice mode.`
              : "Sign in or explore available papers, revision dossiers, and study aids."}
          </p>
          <div className="public-hero-points" aria-label="Platform highlights">
            <span>
              <Check aria-hidden="true" /> Prelims &amp; Mains
            </span>
            <span>
              <Check aria-hidden="true" /> AI Scratchpad Audit
            </span>
            <span>
              <Check aria-hidden="true" /> Mistake Re-Test Mode
            </span>
            <span>
              <Check aria-hidden="true" /> Score Trajectories
            </span>
            <span>
              <Check aria-hidden="true" /> Claude &amp; ChatGPT MCP
            </span>
          </div>
        </div>

        {/* Hero Interactive Visual Snapshot */}
        <aside
          className="public-feature-card public-hero-visual"
          aria-label="Assessment workflow preview"
        >
          <div className="public-visual-orb public-visual-orb-one" />
          <div className="public-visual-orb public-visual-orb-two" />
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Integrated Preparation Loop
              </p>
              <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                Prelims Diagnostics + Mains Evaluation
              </h2>
            </div>
            <span className="public-ready-pill">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Live Ready
            </span>
          </div>

          {/* Snapshot 1: Mains Examiner Audit */}
          <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span>Mains Script Audit Excerpt</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                Score: 4.5 / 10
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/40 text-xs space-y-1.5">
              <p className="font-serif italic text-slate-700 dark:text-slate-300 border-l-2 border-indigo-500 pl-2 text-[11px] leading-relaxed">
                &ldquo;Durkheim established social facts as external sui generis
                realities...&rdquo;
              </p>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold uppercase font-mono">
                  ✓ Accurate
                </span>
                <span className="text-emerald-700 font-medium">
                  Conceptually precise sociological attribution that earned
                  marks.
                </span>
              </div>
            </div>
          </div>

          {/* Snapshot 2: Prelims Decision Metrics & AI Question Evaluation */}
          <div className="public-review-preview pt-1">
            <div className="flex items-center justify-between gap-3">
              <span className="public-review-preview-label">
                AI Scratchpad Audit &amp; Decision Metrics
              </span>
              <Target aria-hidden="true" className="h-4 w-4 text-blue-600" />
            </div>
            <div className="public-review-metrics">
              <span>
                <strong>Net Marks</strong>
                <small>+112.67 / 200</small>
              </span>
              <span>
                <strong>Accuracy</strong>
                <small>74% across 88 Qs</small>
              </span>
              <span>
                <strong>Mistake Re-Test</strong>
                <small>1-Click Practice</small>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              AI audits candidate scratchpad math, checks elimination logic, and
              generates instant re-test practice sessions from errors.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/mains"
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition-colors"
            >
              <span>Explore Mains Desk</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/revision"
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors"
            >
              <span>AI Revision Dossiers</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </section>

      {/* ── 2. SIX CORE PLATFORM PILLARS ── */}
      <section className="public-section page-container" id="features">
        <div className="public-section-heading">
          <p className="page-eyebrow">Comprehensive Platform Capabilities</p>
          <h2>Six purpose-built pillars for every stage of UPSC.</h2>
          <p>
            Eliminate guesswork. Every test, question, and revision note feeds
            an evidence-based record of your actual preparation readiness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Pillar 1: Mains Examiner Evaluation */}
          <article className="public-benefit-card flex flex-col justify-between">
            <div>
              <span className="public-benefit-icon">
                <FileCheck aria-hidden="true" className="text-indigo-600" />
              </span>
              <h3>UPSC Mains AI Examiner</h3>
              <p>
                Strict, uncompromising evaluation across 4 core dimensions:
                Directive Compliance, Citation Depth, Keyword Structure, and
                Exam-Time Writability. Includes full line-by-line script audits,
                factual error corrections, and topper model answers.
              </p>
            </div>
            <Link
              href="/mains"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>Launch Mains Desk</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>

          {/* Pillar 2: Prelims Simulated Mocks, AI Audits & Re-Tests */}
          <article className="public-benefit-card flex flex-col justify-between">
            <div>
              <span className="public-benefit-icon">
                <Clock3 aria-hidden="true" className="text-blue-600" />
              </span>
              <h3>Prelims Mocks, AI Audits &amp; Re-Tests</h3>
              <p>
                Experience genuine exam conditions with simulated timers,
                negative marks (1/3rd penalty), and CSAT qualification bars. Run
                batch AI audits on your calculations and rough scratchpads, or
                launch 1-click mistake re-tests to immediately master questions
                you got wrong.
              </p>
            </div>
            <Link
              href="/papers"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>Browse Question Papers</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>

          {/* Pillar 3: AI Revision & Topic Dossiers */}
          <article className="public-benefit-card flex flex-col justify-between">
            <div>
              <span className="public-benefit-icon">
                <Brain aria-hidden="true" className="text-purple-600" />
              </span>
              <h3>Free AI Revision Tutor</h3>
              <p>
                Zero-cost BYOK integration with Google Gemini Flash. Generate
                structured revision dossiers with Constitutional Articles,
                landmark Supreme Court rulings, committee reports, and PIB
                updates. Chat directly with your test performance.
              </p>
            </div>
            <Link
              href="/revision"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
            >
              <span>Open AI Revision</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>

          {/* Pillar 4: Longitudinal Trends & 3-Tier Topic Diagnostics */}
          <article className="public-benefit-card flex flex-col justify-between">
            <div>
              <span className="public-benefit-icon">
                <BarChart3 aria-hidden="true" className="text-emerald-600" />
              </span>
              <h3>Longitudinal Trends &amp; Diagnostics</h3>
              <p>
                Track your score progression and accuracy curves over time with
                statutory CSAT (66.67) and GS-1 benchmark cutoff lines.
                Multi-tier hierarchy (Subject &gt; Chapter &gt; Topic)
                automatically aggregates weak spots, and lets you export
                filtered mistake booklets to print-ready PDF.
              </p>
            </div>
            <Link
              href="/history"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span>View Past Analytics</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>

          {/* Pillar 5: Study Aids & Daily Vocabulary */}
          <article className="public-benefit-card flex flex-col justify-between">
            <div>
              <span className="public-benefit-icon">
                <Layers aria-hidden="true" className="text-amber-600" />
              </span>
              <h3>Study Aids &amp; Vocabulary</h3>
              <p>
                Build high-retention editorial vocabulary with a 4–5 words a day
                habit. Enter any word to automatically receive intuitive
                mnemonics, UPSC editorial usage sentences, fill-in-the-blank
                recall quizzes, and daily civil services inspiration.
              </p>
            </div>
            <Link
              href="/misc"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
            >
              <span>Open Study Aids</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>

          {/* Pillar 6: Model Context Protocol (MCP) */}
          <article className="public-benefit-card flex flex-col justify-between">
            <div>
              <span className="public-benefit-icon">
                <Bot aria-hidden="true" className="text-cyan-600" />
              </span>
              <h3>Claude &amp; ChatGPT MCP Server</h3>
              <p>
                Connect Claude Desktop, ChatGPT, or autonomous agents directly
                to your UPSC Prep Hub via MCP. Assistants can inspect past test
                history, re-grade answers with current paper marks, quiz you on
                unmastered vocabulary, and generate targeted revision plans.
              </p>
            </div>
            <Link
              href="/help/mcp"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              <span>Explore MCP Setup</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>
        </div>
      </section>

      {/* ── 3. FEATURE SPOTLIGHT: MAINS EVALUATION & PSYCHOLOGICAL ANALYTICS ── */}
      <section className="public-section page-container bg-slate-50/60 dark:bg-slate-900/40 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Exam-Hall Realism
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
              Honest Mains evaluations. No inflated praise.
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Most online evaluation engines give vague, 7/10 grades to every
              generic attempt. Our examiner engine is calibrated strictly
              against UPSC CSE benchmarks: 3.0–4.0/10 is typical average,
              5.0+/10 is reserved for genuine topper-level execution.
            </p>
            <div className="space-y-2.5 pt-2">
              <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Line-by-line Script Audit:</strong> 5–10+ substantive
                  excerpts analyzed across Intro, Body, and Conclusion.
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Factual Misattribution Checks:</strong> Catch wrong
                  articles, erroneous thinkers, or fabricated statistics with ⚠️
                  VERIFY flags.
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Topper Model Answer:</strong> Clean, writable model
                  answer matching exact word counts and 7–11 minute time limits.
                </span>
              </div>
            </div>
            <div className="pt-2">
              <Link
                href="/mains"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <span>Try Mains Answer Evaluation</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Visual Showcase Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Examiner Scorecard &amp; Rubric
                </h4>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                GS-2 Polity (10M / 150W)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/40">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
                  1. Demand Compliance
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  4.5 / 10
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Directive &apos;Give Reasons&apos; satisfied with pros and
                  cons.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/40">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
                  2. Citation Depth
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  4.0 / 10
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Missing key empirical studies &amp; landmark cases.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/60 text-xs space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-rose-700 dark:text-rose-300 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Identified Factual Error</span>
              </span>
              <p className="text-[11px] text-slate-700 dark:text-slate-300">
                &ldquo;Auguste Comte formulated social facts as objective
                things...&rdquo;
              </p>
              <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                Correction: Émile Durkheim coined and formulated social facts in
                Rules of Sociological Method (1895), not Comte.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. TRANSPARENT PRICING & TIERS ── */}
      <section className="public-section page-container" id="pricing">
        <div className="public-pricing-board">
          <div className="public-pricing-board-header">
            <div className="public-pricing-board-copy">
              <p className="page-eyebrow">Clear &amp; Accessible</p>
              <h2>Start free. Upgrade when you need full history.</h2>
              <p>
                Experience the complete practice, evaluation, and AI revision
                loop with free sample assessments. Unlock unlimited custom
                uploads and perpetual progress tracking with Pro.
              </p>
            </div>
            <div className="public-pricing-board-note">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              <span>Free tier requires no credit card</span>
            </div>
          </div>

          <div className="public-plan-grid">
            {/* Free Tier */}
            <article className="public-plan-card">
              <div className="public-plan-topline">
                <span className="public-plan-kicker">Free Tier</span>
                <span className="public-plan-context">No credit card</span>
              </div>
              <h3>Explore All Core Tools</h3>
              <div className="public-plan-price">
                ₹0 <span>free forever</span>
              </div>
              <p>
                Test-drive the full platform workflow: take timed mocks,
                evaluate Mains answers, and explore AI revision.
              </p>
              <ul className="public-plan-features">
                <li>
                  <Check aria-hidden="true" /> Complete practice test &amp;
                  mistake re-test
                </li>
                <li>
                  <Check aria-hidden="true" /> Question AI audit &amp;
                  scratchpad evaluation
                </li>
                <li>
                  <Check aria-hidden="true" /> Mains answer evaluation demo
                </li>
                <li>
                  <Check aria-hidden="true" /> AI Revision tutor with free
                  Gemini key
                </li>
                <li>
                  <Check aria-hidden="true" /> Full Claude &amp; ChatGPT MCP
                  integration
                </li>
              </ul>
              {featuredPaper && (
                <button
                  type="button"
                  onClick={() => onStartExam(featuredPaper, "practice")}
                  className="public-plan-action public-plan-action-light cursor-pointer"
                >
                  Start free practice paper
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </article>

            {/* Individual Pro */}
            <article className="public-plan-card public-plan-card-primary">
              <div className="public-plan-topline">
                <span className="public-plan-kicker">Individual Aspirant</span>
                <span className="public-plan-badge">Most Popular</span>
              </div>
              <h3>Full Unrestricted Access</h3>
              <div className="public-plan-price">
                ₹999 <span>/ 1 full year</span>
              </div>
              <p>
                Unlimited paper imports, unlimited Mains script audits,
                cross-attempt diagnostic trends, and cloud synchronization.
              </p>
              <ul className="public-plan-features">
                <li>
                  <Check aria-hidden="true" /> Unlimited PDF &amp; Markdown test
                  uploads
                </li>
                <li>
                  <Check aria-hidden="true" /> Unlimited Mains evaluations &amp;
                  booklets
                </li>
                <li>
                  <Check aria-hidden="true" /> Longitudinal score trends &amp;
                  cutoff tracking
                </li>
                <li>
                  <Check aria-hidden="true" /> Print-ready mistake review PDF
                  booklets
                </li>
                <li>
                  <Check aria-hidden="true" /> Synced cloud storage for attempts
                  &amp; notes
                </li>
                <li>
                  <Check aria-hidden="true" /> Remote MCP write &amp; re-grading
                  permissions
                </li>
              </ul>
              <button
                type="button"
                onClick={onOpenAuth}
                className="public-plan-action public-plan-action-primary cursor-pointer"
              >
                Get Started with Pro
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </article>

            {/* Institutes */}
            <article className="public-plan-card public-plan-card-enterprise">
              <div className="public-plan-topline">
                <span className="public-plan-kicker">
                  Coaching &amp; Mentors
                </span>
                <span className="public-plan-context">Cohort Solutions</span>
              </div>
              <h3>Institutes &amp; Study Groups</h3>
              <div className="public-plan-price public-plan-price-talk">
                Custom cohorts
              </div>
              <p>
                Deploy standardized test sets, answer evaluation rubrics, and
                cohort diagnostic benchmarks across your students.
              </p>
              <ul className="public-plan-features">
                <li>
                  <Check aria-hidden="true" /> Batch student performance
                  oversight
                </li>
                <li>
                  <Check aria-hidden="true" /> Custom question paper
                  distribution
                </li>
                <li>
                  <Check aria-hidden="true" /> Tailored Mains evaluation rubrics
                </li>
              </ul>
              <a
                href="mailto:hi@chikoochi.com?subject=UPSC%20Prep%20Hub%20Institute%20Inquiry"
                className="public-plan-action public-plan-action-light"
              >
                Contact us
                <Mail aria-hidden="true" className="h-4 w-4" />
              </a>
            </article>
          </div>
        </div>
      </section>

      {/* ── 5. WHO IT'S FOR ── */}
      <section className="public-audience-section">
        <div className="page-container">
          <div className="public-section-heading">
            <p className="page-eyebrow">Targeted Solutions</p>
            <h2>Built specifically for serious civil services aspirants.</h2>
          </div>
          <div className="public-audience-grid">
            <article className="public-audience-card">
              <div className="flex items-center gap-3">
                <span className="public-benefit-icon">
                  <BookOpen aria-hidden="true" />
                </span>
                <h3>Self-Directed Aspirants</h3>
              </div>
              <p>
                Eliminate coaching dependency. Upload test series from any
                institute, simulate genuine exam pressure, diagnose
                psychological trap tendencies, and evaluate your handwritten
                answers anytime.
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="public-text-link cursor-pointer"
              >
                Create your account{" "}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </article>
            <article className="public-audience-card">
              <div className="flex items-center gap-3">
                <span className="public-benefit-icon">
                  <Bot aria-hidden="true" />
                </span>
                <h3>AI-Powered Learners (MCP)</h3>
              </div>
              <p>
                Use Claude Desktop or ChatGPT as your personal 24/7 UPSC mentor.
                Connect our MCP server to let your AI tutor grade your papers,
                generate targeted recall quizzes, and update study flashcards.
              </p>
              <Link href="/help/mcp" className="public-text-link">
                View MCP Setup Guide{" "}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* ── 6. COMPREHENSIVE FAQ ── */}
      <section className="public-section page-container" id="questions">
        <div className="public-section-heading">
          <p className="page-eyebrow">Clarity First</p>
          <h2>Frequently asked questions</h2>
        </div>
        <div className="public-faq-list">
          <details>
            <summary>How does the UPSC Mains Answer Evaluation work?</summary>
            <p>
              You can type your answer or upload handwritten answer sheets
              (photos or multi-page PDFs). Our evaluation engine checks the
              operational directive, performs a line-by-line script audit,
              scores 4 dimensions (Demand, Content, Structure, Presentation)
              without mark inflation, flags factual inaccuracies, and provides a
              topper-grade model answer with value-addition citations.
            </p>
          </details>
          <details>
            <summary>
              Is the AI Revision Tutor really 100% free with no hidden charges?
            </summary>
            <p>
              Yes. The AI Revision feature (/revision) uses a Bring-Your-Own-Key
              (BYOK) model directly in your browser. Google AI Studio provides a
              free tier for Gemini Flash with no credit card required. Your key
              connects directly to Google, so neither you nor the platform
              incurs any server or API charges.
            </p>
          </details>
          <details>
            <summary>Can I upload my own institute question papers?</summary>
            <p>
              Yes! You can upload custom question papers using standard PDFs
              along with an answer key, or import papers formatted in Markdown.
              Both Prelims MCQs, Cloze free-text questions, and Mains subjective
              questions are supported.
            </p>
          </details>
          <details>
            <summary>
              How does the Claude / ChatGPT MCP integration work?
            </summary>
            <p>
              The platform exposes a native Model Context Protocol (MCP) server.
              You simply copy your unique remote MCP URL, add it to Claude
              Desktop or ChatGPT, and sign in. Your AI assistant can then read
              your past test results, grade subjective answers using the
              paper&apos;s current marks, quiz you on unmastered vocabulary, and
              diagnose weak topics.
            </p>
          </details>
          <details>
            <summary>Can I try tests before creating an account?</summary>
            <p>
              Yes. You can immediately attempt free practice or mock papers and
              explore the Mains evaluation desk. Your result opens for review
              immediately; create an account only when you want to save attempts
              to your cloud history.
            </p>
          </details>
        </div>
      </section>

      {/* ── 7. FINAL CALL TO ACTION ── */}
      <section className="public-final-section page-container pt-0">
        <div className="public-final-cta">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
              Transform Your Preparation
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              Stop guessing your readiness. Build an evidence-backed record.
            </h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {featuredPaper && (
              <button
                type="button"
                onClick={() => onStartExam(featuredPaper, "practice")}
                className="button-light cursor-pointer"
              >
                <Play aria-hidden="true" className="h-4 w-4" /> Try free
                practice
              </button>
            )}
            <Link href="/mains" className="button-outline-light cursor-pointer">
              <FileCheck aria-hidden="true" className="h-4 w-4" /> Evaluate
              Mains
            </Link>
            <button
              type="button"
              onClick={onOpenAuth}
              className="button-outline-light cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </div>
      </section>

      {/* ── 8. FOOTER ── */}
      <footer className="public-footer">
        <div className="page-container">
          <div className="public-footer-main">
            <div className="public-footer-brand-block">
              <div className="public-footer-brand">
                <span className="app-brand-mark flex items-center justify-center p-0.5">
                  <img
                    src="/favicon.svg"
                    alt="UPSC Prep Hub"
                    className="w-5 h-5"
                  />
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  UPSC Prep Hub
                </span>
              </div>
              <p>
                An executive assessment &amp; revision workspace for serious
                UPSC CSE preparation.
              </p>
              <a
                href="https://chikoochi.com"
                target="_blank"
                rel="noreferrer"
                className="public-footer-owner"
              >
                A Chikoochi product
              </a>
            </div>
            <nav className="public-footer-links" aria-label="Footer navigation">
              <Link href="/mains">Mains Desk</Link>
              <Link href="/revision">AI Revision</Link>
              <Link href="/misc">Study Aids</Link>
              <Link href="/syllabus">Syllabus</Link>
              <Link href="/help/mcp">MCP Agent Help</Link>
              <a href="#pricing">Pricing</a>
              <a href="mailto:hi@chikoochi.com">Contact</a>
            </nav>
          </div>
          <div className="public-footer-bottom">
            <span>© 2026 chikoochi.com · UPSC Prep Hub</span>
            <span>Practice with intent. Review with evidence.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

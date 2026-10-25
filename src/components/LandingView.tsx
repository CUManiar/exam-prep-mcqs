"use client";

import React from "react";
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
      <section className="public-hero page-container">
        <div className="public-hero-copy">
          <p className="page-eyebrow">
            UPSC practice workspace · Built for clarity
          </p>
          <h1 className="public-title">
            Make every paper count.
          </h1>
          <p className="public-intro">
            Attempt with focus. Review with evidence. Build a better next
            attempt from every question you answer.
          </p>
          <div className="public-actions">
            {featuredPaper && (
              <button
                type="button"
                onClick={() => onStartExam(featuredPaper, "practice")}
                className="button-primary"
              >
                <Play aria-hidden="true" className="h-4 w-4" />
                Try a free practice paper
              </button>
            )}
            <button
              type="button"
              onClick={onOpenAuth}
              className="button-secondary"
            >
              Create an account
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <p className="public-note">
            {featuredPaper
              ? `${featuredPaper.label} is available to try in practice mode.`
              : "Sign in to browse the available papers and practice options."}
          </p>
          <div className="public-hero-points" aria-label="Platform highlights">
            <span>
              <Check aria-hidden="true" /> Free to start
            </span>
            <span>
              <Check aria-hidden="true" /> PDF + Markdown
            </span>
            <span>
              <Check aria-hidden="true" /> Review every attempt
            </span>
          </div>
        </div>

        <aside
          className="public-feature-card public-hero-visual"
          aria-label="Assessment workflow preview"
        >
          <div className="public-visual-orb public-visual-orb-one" />
          <div className="public-visual-orb public-visual-orb-two" />
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Your practice loop
              </p>
              <h2 className="mt-1 text-base font-semibold text-slate-900">
                From paper to progress
              </h2>
            </div>
            <span className="public-ready-pill">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Ready
            </span>
          </div>
          <div className="public-review-preview">
            <div className="flex items-center justify-between gap-3">
              <span className="public-review-preview-label">Review snapshot</span>
              <Target aria-hidden="true" className="h-4 w-4 text-blue-600" />
            </div>
            <div className="public-review-metrics">
              <span>
                <strong>Marks</strong>
                <small>Net score</small>
              </span>
              <span>
                <strong>Accuracy</strong>
                <small>Answer quality</small>
              </span>
              <span>
                <strong>Pace</strong>
                <small>Time insight</small>
              </span>
            </div>
            <div className="public-review-progress" aria-hidden="true">
              <span />
            </div>
            <p>One result. The signals that make the next attempt better.</p>
          </div>
          <ol className="mt-2 divide-y divide-slate-100">
            <li className="public-workflow-step">
              <span className="public-step-number">01</span>
              <span>
                <strong>Choose a paper</strong>
                <small>Use an available set or your own.</small>
              </span>
              <BookOpen aria-hidden="true" className="h-4 w-4 text-slate-400" />
            </li>
            <li className="public-workflow-step">
              <span className="public-step-number">02</span>
              <span>
                <strong>Attempt in your mode</strong>
                <small>Timed mock or flexible practice.</small>
              </span>
              <Clock3 aria-hidden="true" className="h-4 w-4 text-slate-400" />
            </li>
            <li className="public-workflow-step">
              <span className="public-step-number">03</span>
              <span>
                <strong>Review the result</strong>
                <small>Score, accuracy, pace, and answers.</small>
              </span>
              <BarChart3
                aria-hidden="true"
                className="h-4 w-4 text-slate-400"
              />
            </li>
          </ol>
          {featuredPaper && (
            <button
              type="button"
              onClick={() => onStartExam(featuredPaper, "practice")}
              className="public-feature-link"
            >
              Start with {featuredPaper.label}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </aside>
      </section>

      <section className="public-section page-container" id="how-it-works">
        <div className="public-section-heading">
          <p className="page-eyebrow">One clear workflow</p>
          <h2>Practice, evaluate, improve.</h2>
          <p>
            Spend less time setting up each session and more time understanding
            what the result tells you.
          </p>
        </div>
        <div className="public-benefit-grid">
          <article className="public-benefit-card">
            <span className="public-benefit-icon">
              <FileUp aria-hidden="true" />
            </span>
            <h3>Start with familiar papers</h3>
            <p>
              Browse available UPSC sets, or add a question paper with its
              answer key using the current PDF or Markdown workflow.
            </p>
          </article>
          <article className="public-benefit-card">
            <span className="public-benefit-icon">
              <Clock3 aria-hidden="true" />
            </span>
            <h3>Choose the right attempt</h3>
            <p>
              Use practice mode to work through questions at your own pace, or
              choose a timed mock for a full assessment.
            </p>
          </article>
          <article className="public-benefit-card">
            <span className="public-benefit-icon">
              <CheckCircle2 aria-hidden="true" />
            </span>
            <h3>Review more than a score</h3>
            <p>
              See correct, incorrect, and skipped answers alongside accuracy,
              time spent, confidence, and your attempt history.
            </p>
          </article>
        </div>
      </section>

      <section className="public-section page-container" id="pricing">
        <div className="public-section-heading">
          <p className="page-eyebrow">Simple access</p>
          <h2>Start free. Upgrade when you need more.</h2>
          <p>
            Try the assessment workflow first. Upgrade for unlimited paper
            uploads and self-paced practice.
          </p>
        </div>
        <div className="public-pricing-grid">
          <article className="public-pricing-card">
            <p className="public-pricing-label">Free</p>
            <h3>One mock attempt</h3>
            <p>
              Take a free mock to understand the platform, finish the test,
              and review your result.
            </p>
            <ul className="public-pricing-features">
              <li><Check aria-hidden="true" /> Try the full workflow</li>
              <li><Check aria-hidden="true" /> Review your result</li>
            </ul>
            {featuredPaper && (
              <button
                type="button"
                onClick={() => onStartExam(featuredPaper, "mock")}
                className="public-text-link"
              >
                Try the free mock
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </article>
          <article className="public-pricing-card public-pricing-card-featured">
            <div className="flex w-full items-start justify-between gap-3">
              <p className="public-pricing-label">Individual</p>
              <span className="public-popular-pill">Most useful</span>
            </div>
            <h3>
              ₹999 <span>/ year</span>
            </h3>
            <p>
              Upload unlimited PDF or Markdown papers and practise without
              limits.
            </p>
            <ul className="public-pricing-features">
              <li><Check aria-hidden="true" /> Unlimited paper uploads</li>
              <li><Check aria-hidden="true" /> Unlimited practice</li>
              <li><Check aria-hidden="true" /> Saved assessment history</li>
            </ul>
            <button
              type="button"
              onClick={onOpenAuth}
              className="public-text-link"
            >
              Create an account
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </article>
          <article className="public-pricing-card">
            <p className="public-pricing-label">Institutes & enterprise</p>
            <h3>Let&apos;s discuss your workflow</h3>
            <p>
              For institutes or other enterprise-level solutions, contact us
              for a tailored conversation.
            </p>
            <ul className="public-pricing-features">
              <li><Check aria-hidden="true" /> Discuss your workflow</li>
              <li><Check aria-hidden="true" /> Plan for your learners</li>
            </ul>
            <a href="mailto:hi@chikoochi.com" className="public-text-link">
              hi@chikoochi.com <Mail aria-hidden="true" className="h-4 w-4" />
            </a>
          </article>
        </div>
      </section>

      <section className="public-audience-section">
        <div className="page-container">
          <div className="public-section-heading">
            <p className="page-eyebrow">Who it’s for</p>
            <h2>Useful for learners and the teams that prepare them.</h2>
          </div>
          <div className="public-audience-grid">
            <article className="public-audience-card">
              <div className="flex items-center gap-3">
                <span className="public-benefit-icon">
                  <BookOpen aria-hidden="true" />
                </span>
                <h3>Independent aspirants</h3>
              </div>
              <p>
                Build a regular test habit, continue saved sessions, and use
                detailed review to decide what to revisit next.
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="public-text-link"
              >
                Set up your workspace{" "}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </article>
            <article className="public-audience-card">
              <div className="flex items-center gap-3">
                <span className="public-benefit-icon">
                  <BarChart3 aria-hidden="true" />
                </span>
                <h3>Institutes and educators</h3>
              </div>
              <p>
                Explore the paper setup, timed attempt, and result-review
                workflow with a sample assessment before planning a wider
                rollout.
              </p>
              <a
                href="mailto:support@chikoochi.com?subject=Assessment%20platform%20demo"
                className="public-text-link"
              >
                Discuss an institute demo{" "}
                <Mail aria-hidden="true" className="h-4 w-4" />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section className="public-section page-container" id="questions">
        <div className="public-section-heading">
          <p className="page-eyebrow">Before you begin</p>
          <h2>Common questions</h2>
        </div>
        <div className="public-faq-list">
          <details>
            <summary>Can I try a test before creating an account?</summary>
            <p>
              Yes. Try a free practice or mock paper. Your result opens for
              review immediately; sign in only if you want to save it to your
              account history.
            </p>
          </details>
          <details>
            <summary>Can I use my institute’s own question paper?</summary>
            <p>
              Custom papers can be added with a PDF and answer key, or in the
              provided Markdown format. Institute-wide class management is not
              part of the current workflow; contact us to discuss a demo and
              requirements.
            </p>
          </details>
          <details>
            <summary>What can I review after an attempt?</summary>
            <p>
              Results include marks and accuracy, question-level answers, time
              spent, and confidence information where it was recorded.
            </p>
          </details>
        </div>
      </section>

      <section className="page-container pt-0">
        <div className="public-final-cta">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
              Your next assessment
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Start with one paper. Build a clearer record over time.
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {featuredPaper && (
              <button
                type="button"
                onClick={() => onStartExam(featuredPaper, "practice")}
                className="button-light"
              >
                <Play aria-hidden="true" className="h-4 w-4" /> Try practice
              </button>
            )}
            <button
              type="button"
              onClick={onOpenAuth}
              className="button-outline-light"
            >
              Sign in
            </button>
          </div>
        </div>
      </section>

      <footer className="public-footer">
        <div className="page-container">
          <div className="public-footer-main">
            <div className="public-footer-brand-block">
              <div className="public-footer-brand">
                <span className="public-footer-mark">UP</span>
                <span>UPSC Prep Hub</span>
              </div>
              <p>
                A focused assessment workspace for serious UPSC preparation.
              </p>
            </div>
            <nav className="public-footer-links" aria-label="Footer navigation">
              <a href="#how-it-works">How it works</a>
              <a href="#pricing">Pricing</a>
              <a href="#questions">Questions</a>
              <a href="mailto:hi@chikoochi.com">Contact</a>
            </nav>
          </div>
          <div className="public-footer-bottom">
            <span>© 2026 UPSC Prep Hub</span>
            <span>Practice with intent. Review with evidence.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

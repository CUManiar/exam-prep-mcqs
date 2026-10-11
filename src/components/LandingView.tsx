'use client';

import React from 'react';
import { QuestionPaper } from '../lib/types';
import {
  Clock,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Play,
  FileText,
  Upload,
  UserCheck,
  Award,
  Zap,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  FileUp,
} from 'lucide-react';

interface LandingViewProps {
  papers: QuestionPaper[];
  onStartExam: (paper: QuestionPaper, mode: 'practice' | 'mock') => void;
  onOpenAuth: () => void;
  onOpenProModal: () => void;
  isPro?: boolean;
}

export function LandingView({
  papers,
  onStartExam,
  onOpenAuth,
  onOpenProModal,
  isPro,
}: LandingViewProps) {
  // Find the official free 2026 Prelims papers
  const free2026Gs = papers.find(
    (p) => p.year === '2026' && p.category === 'prelims' && p.subject.toLowerCase().includes('gs')
  ) || papers.find((p) => p.year === '2026' && p.category === 'prelims');

  const free2026Csat = papers.find(
    (p) => p.year === '2026' && p.category === 'prelims' && p.subject.toLowerCase().includes('csat')
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-slate-200/80 bg-gradient-to-b from-white via-indigo-50/20 to-slate-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/90 px-3.5 py-1 text-xs font-bold text-indigo-700 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 fill-indigo-400" />
            <span>UPSC Civil Services Prelims Simulator</span>
            <span className="text-indigo-300">•</span>
            <span className="text-emerald-700 font-extrabold">2026 Prelims Free Forever</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight sm:leading-none">
            Master Real Exam Conditions <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 bg-clip-text text-transparent">
              Before Prelims Day.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Attempt official UPSC CSE question papers (2024, 2025, 2026) with authentic 120-minute countdowns, official negative marking, confidence tagging, and instant accuracy evaluation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            {free2026Gs && (
              <button
                onClick={() => onStartExam(free2026Gs, 'mock')}
                className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] px-6 py-3.5 text-sm font-bold text-white transition-all shadow-md hover:shadow-indigo-500/25"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Start Free 2026 GS Mock Test</span>
              </button>
            )}

            <button
              onClick={onOpenAuth}
              className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] px-6 py-3.5 text-sm font-bold text-slate-700 transition-all shadow-xs"
            >
              <UserCheck className="h-4 w-4 text-indigo-600" />
              <span>Sign In / Create Free Account</span>
            </button>
          </div>

          <p className="text-xs text-slate-600 font-medium">
            No credit card required. Free tier includes 2026 GS I & CSAT with full timer & analytics.
          </p>
        </div>
      </section>

      {/* Free 2026 Mock Tests Showcase */}
      <section className="py-14 sm:py-20 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 font-mono">
              Free Access Forever
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Official 2026 Prelims Papers
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Experience the simulator right now without paying anything. Complete the test, then sign in to keep your review intact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* GS Paper 1 */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 sm:p-7 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-md bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-800 font-mono">
                    2026
                  </span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 text-xs font-extrabold">
                    100% FREE
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {free2026Gs?.label || '2026 – Prelims GS I'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  General Studies Paper I: History, Polity, Geography, Economy, Environment & Current Affairs.
                </p>

                <div className="mt-4 flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span>100 Questions</span>
                  <span>•</span>
                  <span>120 mins</span>
                  <span>•</span>
                  <span>200 Marks (-0.66 neg)</span>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200/80 flex items-center gap-3">
                {free2026Gs && (
                  <>
                    <button
                      onClick={() => onStartExam(free2026Gs, 'practice')}
                      className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <Play className="h-3.5 w-3.5 text-slate-500" />
                      <span>Practice</span>
                    </button>
                    <button
                      onClick={() => onStartExam(free2026Gs, 'mock')}
                      className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2.5 text-xs font-bold text-white transition-all shadow-xs"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Mock Exam</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* CSAT Paper 2 */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 sm:p-7 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-md bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-800 font-mono">
                    2026
                  </span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 text-xs font-extrabold">
                    100% FREE
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {free2026Csat?.label || '2026 – Prelims GS II CSAT'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  General Studies Paper II CSAT: Reading Comprehension, Logical Reasoning & Quantitative Aptitude.
                </p>

                <div className="mt-4 flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span>80 Questions</span>
                  <span>•</span>
                  <span>120 mins</span>
                  <span>•</span>
                  <span>200 Marks (-0.83 neg)</span>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200/80 flex items-center gap-3">
                {free2026Csat && (
                  <>
                    <button
                      onClick={() => onStartExam(free2026Csat, 'practice')}
                      className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <Play className="h-3.5 w-3.5 text-slate-500" />
                      <span>Practice</span>
                    </button>
                    <button
                      onClick={() => onStartExam(free2026Csat, 'mock')}
                      className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2.5 text-xs font-bold text-white transition-all shadow-xs"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Mock Exam</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simulator Features */}
      <section className="py-16 sm:py-24 border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60 font-mono">
              Engineered for Serious Aspirants
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900">
              Why Practice With Our Simulator?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Stop guessing your negative marks. Get deep behavioural diagnostics and real exam temperament.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bi-card p-6 rounded-3xl space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Official Countdown & Time Tracking
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Strict 120-minute countdown with sound alerts at 15m, 5m, and 1m warnings. Auto-submission prevents exam overrun.
              </p>
            </div>

            <div className="bi-card p-6 rounded-3xl space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Confidence & Changed Answers
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tag questions as Sure, 50-50, or Guess. Track whether your second thoughts harmed or improved your final score.
              </p>
            </div>

            <div className="bi-card p-6 rounded-3xl space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                <FileUp className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Upload Custom Papers & Sets
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Add coaching test series or state PCS papers with custom sets (A, B, C, D) and attach your own answer keys.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Honest Pricing & Pro Vault Terms */}
      <section className="py-16 sm:py-24 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60 font-mono">
              Simple & Transparent Pricing
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900">
              Practice Free, or Upgrade to Lifetime Pro
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Clear scope, no subscriptions, no recurring billing surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-8 space-y-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Free Tier</h3>
                  <span className="text-xs font-bold text-slate-500 uppercase font-mono">Standard</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">₹0</span>
                  <span className="text-xs text-slate-500">/ forever</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ideal for practicing the latest official 2026 Prelims papers without any cost.
                </p>

                <ul className="space-y-2.5 text-xs text-slate-700 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>2026 Prelims GS I (100 Qs) with Answer Key</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>2026 Prelims GS II CSAT (80 Qs) with Answer Key</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Full 120-min countdown timer & warning alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Detailed accuracy & negative marks report</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onOpenAuth}
                className="cursor-pointer w-full flex items-center justify-center py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors"
              >
                Sign In to Start Free
              </button>
            </div>

            {/* Pro Vault Tier Card */}
            <div className="relative rounded-3xl border-2 border-indigo-600 bg-gradient-to-b from-indigo-50/40 via-white to-white p-7 sm:p-8 space-y-6 shadow-xl flex flex-col justify-between">
              <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-500 to-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                Most Popular
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Lifetime Pro Vault</h3>
                  <span className="text-xs font-extrabold text-indigo-700 uppercase font-mono">One-Time</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">₹999</span>
                  <span className="text-xs text-slate-500">one-time payment</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Full 3-year archive (2024, 2025, 2026) + unlimited custom paper uploads with your own sets & keys.
                </p>

                <ul className="space-y-2.5 text-xs text-slate-700 pt-2">
                  <li className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>All 2024, 2025 & 2026 Prelims papers</span>
                  </li>
                  <li className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>All 2024, 2025 & 2026 Mains Subjective papers</span>
                  </li>
                  <li className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>Upload your own papers & sets with custom answer keys</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>Unlimited attempts as many times as you want</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={onOpenProModal}
                  className="cursor-pointer w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-xs font-bold text-white transition-all shadow-md hover:shadow-indigo-500/25"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                  <span>Unlock Lifetime Pro (₹999)</span>
                </button>

                {/* Important Policy Notice */}
                <div className="rounded-xl bg-slate-100 p-3 text-[11px] text-slate-500 leading-snug space-y-1">
                  <p className="font-semibold text-slate-700 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 text-amber-600" />
                    <span>Terms & No Refund Policy</span>
                  </p>
                  <p>
                    One-time payment covers unlimited practice for the 2024, 2025, and 2026 paper repository. Any future papers, syllabus changes, or platform additions are at our sole discretion and may incur extra cost. Strict No Refund policy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-14 sm:py-20 border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Everything you need to know about papers, scoring, and account sync.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bi-card p-5 rounded-2xl space-y-2">
              <h4 className="font-bold text-slate-900">Which papers are included in the archive?</h4>
              <p className="text-slate-500 leading-relaxed">
                Our archive contains official UPSC CSE papers for 2024, 2025, and 2026. Free tier gives full unlimited access to 2026 Prelims GS I and CSAT. Pro unlocks 2024 and 2025.
              </p>
            </div>

            <div className="bi-card p-5 rounded-2xl space-y-2">
              <h4 className="font-bold text-slate-900">Can I upload my coaching test series papers?</h4>
              <p className="text-slate-500 leading-relaxed">
                Yes! With Pro, you can upload any custom question paper PDF, specify whatever set (A, B, C, D) you want, and attach your own answer key for instant automatic evaluation.
              </p>
            </div>

            <div className="bi-card p-5 rounded-2xl space-y-2">
              <h4 className="font-bold text-slate-900">How do I preserve my score after attempting as a guest?</h4>
              <p className="text-slate-500 leading-relaxed">
                When you finish an exam session, our completion dialog allows you to sign up or log in. Your answers, score, and question review are immediately synced to your cloud account.
              </p>
            </div>

            <div className="bi-card p-5 rounded-2xl space-y-2">
              <h4 className="font-bold text-slate-900">What is the refund policy?</h4>
              <p className="text-slate-500 leading-relaxed">
                We maintain a strict No Refund policy. We recommend attempting the free 2026 Prelims papers first to test the interface, timer, and features before upgrading.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white text-center text-xs text-slate-500 border-t border-slate-200">
        <div className="mx-auto max-w-4xl px-4 space-y-2">
          <p className="font-semibold text-slate-700">
            UPSC CSE Prelims & Mains Exam Simulator
          </p>
          <p className="text-[11px] text-slate-400">
            Not affiliated with Union Public Service Commission. All trademarks and official papers belong to their respective authorities.
          </p>
          <p className="text-[11px] text-slate-400 pt-1">
            © {new Date().getFullYear()} UPSC Practice. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

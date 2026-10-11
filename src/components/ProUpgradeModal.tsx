"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Check,
  X,
  Lock,
  ShieldCheck,
  CreditCard,
  Loader2,
  Award,
  Zap,
} from "lucide-react";
import { openRazorpayCheckout } from "../lib/razorpay";

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  targetPaperLabel?: string;
}

export function ProUpgradeModal({
  isOpen,
  onClose,
  onSuccess,
  targetPaperLabel,
}: ProUpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successPaid, setSuccessPaid] = useState(false);

  if (!isOpen) return null;

  const handlePay = async () => {
    setLoading(true);
    setErrorMsg(null);

    await openRazorpayCheckout({
      amountPaise: 99900, // ₹999 in paise
      name: "Upsc-Practice",
      description: "Lifetime Access - 2024-2026 UPSC Papers Vault",
      onSuccess: () => {
        setLoading(false);
        setSuccessPaid(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1800);
      },
      onDismiss: () => {
        setLoading(false);
      },
      onError: (err) => {
        setLoading(false);
        setErrorMsg(
          err.message || "Payment could not be completed. Please try again.",
        );
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex min-h-full items-start sm:items-center justify-center p-3 sm:p-6 py-8 sm:py-12 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative my-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6 overflow-hidden">
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-indigo-600 to-purple-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {successPaid ? (
          <div className="py-8 text-center space-y-4 animate-in zoom-in-95">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Payment Verified!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                You now have Lifetime Pro Access. Unlocking the complete paper
                vault...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                <span>Upsc-Practice Pro Vault</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {targetPaperLabel
                  ? `Unlock ${targetPaperLabel}`
                  : "Unlock 2024–2026 Vault & Custom Uploads"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Free tier includes 2026 Prelims papers. Upgrade to Pro for
                unlimited practice across our 2024, 2025, and 2026 papers, plus
                your own custom paper uploads.
              </p>
            </div>

            {/* Feature List */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <div className="rounded-full bg-emerald-100 p-0.5 text-emerald-700 mt-0.5 shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span>
                  <strong>2024, 2025 & 2026 Paper Sets:</strong> Unlimited
                  practice attempts across all available Prelims and Mains
                  papers in our repository.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="rounded-full bg-emerald-100 p-0.5 text-emerald-700 mt-0.5 shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span>
                  <strong>Add Your Own Custom Papers:</strong> Upload any custom
                  question set and attach your own answer key for instant
                  automated scoring.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="rounded-full bg-emerald-100 p-0.5 text-emerald-700 mt-0.5 shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span>
                  <strong>Behavioral BI Analytics:</strong> Cognitive breakdown
                  across 🎯 Sure, ⚖️ 50:50, and 🎲 Guess questions with pacing
                  analysis.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="rounded-full bg-amber-100 p-0.5 text-amber-800 mt-0.5 shrink-0">
                  <ShieldCheck className="h-3 w-3 stroke-[3]" />
                </div>
                <span className="text-[11px] text-slate-500">
                  <strong>Terms & No-Refund Policy:</strong> Covers current
                  2024–2026 paper sets. Future additions or updates are at
                  platform discretion and may carry separate pricing. All sales
                  are final; no refunds.
                </span>
              </div>
            </div>

            {/* Price Box */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
                  One-Time Fee
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                    ₹999
                  </span>
                  <span className="text-xs text-slate-400 line-through font-mono">
                    ₹2,499
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                    60% OFF
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">
                  Secured by
                </span>
                <span className="text-xs font-bold text-indigo-900 font-mono">
                  Razorpay UPI & Cards
                </span>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
                {errorMsg}
              </div>
            )}

            {/* CTA Button */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={handlePay}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] py-3.5 text-sm font-bold text-white transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Connecting to Razorpay...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>Pay ₹999 & Unlock Lifetime Vault</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  Instant activation • 100% secure Razorpay checkout (UPI, GPay,
                  PhonePe, Cards)
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

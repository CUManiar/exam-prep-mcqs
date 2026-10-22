"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Check,
  CreditCard,
  FileUp,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { openRazorpayCheckout } from "../lib/razorpay";
import { ModalShell } from "./ModalShell";

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

  useEffect(() => {
    if (isOpen) return;
    setLoading(false);
    setErrorMsg(null);
    setSuccessPaid(false);
  }, [isOpen]);

  const handlePay = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      await openRazorpayCheckout({
        amountPaise: 99900,
        name: "Upsc-Practice",
        description: "Lifetime Access - 2024-2026 UPSC Papers Vault",
        onSuccess: () => {
          setLoading(false);
          setSuccessPaid(true);
          window.setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 1200);
        },
        onDismiss: () => setLoading(false),
        onError: (error) => {
          setLoading(false);
          setErrorMsg(
            error.message ||
              "Payment could not be completed. Please try again.",
          );
        },
      });
    } catch (error: unknown) {
      setLoading(false);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Payment could not be completed. Please try again.",
      );
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="access-modal-title"
      describedBy="access-modal-description"
      className="w-full max-w-xl p-5 sm:p-7"
    >
      {successPaid ? (
        <div className="py-10 text-center">
          <span
            className="modal-status-icon modal-status-success mx-auto"
            aria-hidden="true"
          >
            <Check className="h-6 w-6" />
          </span>
          <h2
            id="access-modal-title"
            data-modal-initial-focus
            tabIndex={-1}
            className="mt-4 text-xl font-semibold text-slate-900"
          >
            Payment confirmed
          </h2>
          <p
            id="access-modal-description"
            className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600"
          >
            Your access is being activated. This may take a moment.
          </p>
        </div>
      ) : (
        <>
          <div className="pr-7">
            <p className="page-eyebrow">UPSC Prep Hub · Access plan</p>
            <h2
              id="access-modal-title"
              data-modal-initial-focus
              tabIndex={-1}
              className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
            >
              {targetPaperLabel
                ? `Unlock ${targetPaperLabel}`
                : "Expand your paper library"}
            </h2>
            <p
              id="access-modal-description"
              className="mt-2 text-sm leading-6 text-slate-600"
            >
              Access the available 2024–2026 Prelims and Mains papers, and add
              your own papers with answer keys for automated evaluation.
            </p>
          </div>

          <div className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200">
            <div className="flex items-start gap-3 px-4 py-3.5">
              <BookOpen
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-700"
              />
              <p className="text-sm leading-5 text-slate-700">
                <strong className="font-semibold text-slate-900">
                  Question papers
                </strong>
                <br />
                Available Prelims and Mains sets from 2024–2026.
              </p>
            </div>
            <div className="flex items-start gap-3 px-4 py-3.5">
              <FileUp
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-700"
              />
              <p className="text-sm leading-5 text-slate-700">
                <strong className="font-semibold text-slate-900">
                  Your own papers
                </strong>
                <br />
                Upload a paper and attach an answer key for scoring.
              </p>
            </div>
            <div className="flex items-start gap-3 px-4 py-3.5">
              <BarChart3
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-700"
              />
              <p className="text-sm leading-5 text-slate-700">
                <strong className="font-semibold text-slate-900">
                  Detailed review
                </strong>
                <br />
                Compare accuracy, time spent, and confidence across attempts.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3.5">
            <div>
              <p className="text-xs font-medium text-slate-500">One-time fee</p>
              <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
                ₹999
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Payment methods</p>
              <p className="mt-0.5 text-sm font-medium text-slate-700">
                UPI · Cards · Razorpay
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Covers the currently listed 2024–2026 sets. Future additions may be
            priced separately. All sales are final; no refunds.
          </p>

          {errorMsg && (
            <div role="alert" className="form-message form-message-error mt-4">
              <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Payment wasn’t completed</p>
                <p className="mt-0.5">{errorMsg}</p>
                <a
                  className="mt-1 inline-flex items-center gap-1 font-medium underline underline-offset-2"
                  href="mailto:support@chikoochi.com?subject=Payment%20Assistance%20-%20Upsc-Practice"
                >
                  <Mail className="h-3.5 w-3.5" /> Contact support
                </a>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handlePay}
            className="button-primary mt-5 w-full"
          >
            {loading ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard aria-hidden="true" className="h-4 w-4" />
            )}
            {loading ? "Connecting to payment…" : "Continue to secure payment"}
          </button>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck
              aria-hidden="true"
              className="h-3.5 w-3.5 text-emerald-700"
            />
            Payment is processed by Razorpay.
          </p>
        </>
      )}
    </ModalShell>
  );
}

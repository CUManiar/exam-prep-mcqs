"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { getSupabaseClient } from "../lib/supabase";
import { ModalShell } from "./ModalShell";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMsg(
        "Sign-in is temporarily unavailable. Please try again later.",
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;

        if (data?.session) {
          setSuccessMsg("Account created. Preparing your workspace…");
          window.setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 900);
        } else {
          setSuccessMsg(
            "Check your email for a verification link to finish creating your account.",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg("Signed in. Preparing your workspace…");
        window.setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 900);
      }
    } catch (error: unknown) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "We couldn’t complete sign-in. Check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const isSigningIn = mode === "signin";

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="auth-modal-title"
      describedBy="auth-modal-description"
      className="w-full max-w-4xl overflow-hidden p-0"
    >
      <div className="grid min-h-[31rem] sm:grid-cols-[0.82fr_1.18fr]">
        <aside className="auth-overview-panel">
          <div>
            <div className="auth-product-mark">
              <BookOpen aria-hidden="true" className="h-5 w-5" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-200">
              Assessment workspace
            </p>
            <h2 className="mt-2 text-xl font-semibold leading-snug text-white">
              Make each attempt easier to learn from.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Keep your question papers, timed mocks, and performance record
              together.
            </p>
          </div>
          <ul className="mt-7 space-y-4 text-sm text-slate-200">
            <li className="flex items-start gap-3">
              <BookOpen
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-300"
              />
              <span>Practice with available or personal question sets.</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-300"
              />
              <span>Review scores, answers, accuracy, and time spent.</span>
            </li>
            <li className="flex items-start gap-3">
              <BarChart3
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-300"
              />
              <span>Return to your saved mock history and progress.</span>
            </li>
          </ul>
          <p className="mt-auto hidden pt-8 text-xs leading-5 text-slate-400 sm:block">
            Built around UPSC preparation, with a workflow that can support
            other objective assessments.
          </p>
        </aside>

        <div className="auth-form-panel">
          <div className="mb-6">
            <p className="page-eyebrow">
              {isSigningIn ? "Welcome back" : "Get started"}
            </p>
            <h2
              id="auth-modal-title"
              data-modal-initial-focus
              tabIndex={-1}
              className="mt-1 text-2xl font-semibold tracking-tight text-slate-900"
            >
              {isSigningIn ? "Sign in" : "Create your account"}
            </h2>
            <p
              id="auth-modal-description"
              className="mt-2 max-w-sm text-sm leading-6 text-slate-600"
            >
              {isSigningIn
                ? "Access your saved assessments and personal progress."
                : "Save your mock results and continue your preparation across sessions."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isSigningIn && (
              <div>
                <label htmlFor="auth-full-name" className="form-label">
                  Name
                </label>
                <div className="form-input-wrap">
                  <UserRound aria-hidden="true" className="form-input-icon" />
                  <input
                    id="auth-full-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your name"
                    className="form-input"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="form-label">
                Email address
              </label>
              <div className="form-input-wrap">
                <Mail aria-hidden="true" className="form-input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="form-label">
                Password
              </label>
              <div className="form-input-wrap">
                <LockKeyhole aria-hidden="true" className="form-input-icon" />
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={
                    isSigningIn ? "current-password" : "new-password"
                  }
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className="form-input"
                />
              </div>
            </div>

            {errorMsg && (
              <div role="alert" className="form-message form-message-error">
                <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div role="status" className="form-message form-message-success">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="button-primary w-full"
            >
              {loading
                ? "Please wait…"
                : isSigningIn
                  ? "Sign in"
                  : "Create account"}
              {!loading && (
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            {isSigningIn ? "New to the platform?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(isSigningIn ? "signup" : "signin");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="font-semibold text-blue-700 underline-offset-4 hover:underline"
            >
              {isSigningIn ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </ModalShell>
  );
}

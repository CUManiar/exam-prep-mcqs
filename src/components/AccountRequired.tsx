"use client";

import React from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";

export function AccountRequired({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { currentUser, isLoading, openAuthModal } = useApp();

  if (isLoading) {
    return (
      <div className="page-container py-20">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
      </div>
    );
  }
  if (currentUser) return <>{children}</>;

  return (
    <div className="page-container py-12 sm:py-20">
      <section className="surface-card mx-auto max-w-xl p-6 sm:p-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <button
          type="button"
          onClick={openAuthModal}
          className="button-primary mt-5"
        >
          <LogIn className="h-4 w-4" /> Sign in to continue
        </button>
      </section>
    </div>
  );
}

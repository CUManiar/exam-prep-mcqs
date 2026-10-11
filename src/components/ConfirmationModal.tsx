"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, Info, X } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen || !mounted) return null;

  const iconVariants = {
    danger: {
      bg: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      btn: "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30 text-white",
      icon: <Trash2 className="h-6 w-6" />,
    },
    warning: {
      bg: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      btn: "bg-amber-500 hover:bg-amber-400 shadow-amber-500/30 text-slate-950 font-bold",
      icon: <AlertTriangle className="h-6 w-6" />,
    },
    info: {
      bg: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
      btn: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 text-white",
      icon: <Info className="h-6 w-6" />,
    },
  };

  const currentVariant = iconVariants[variant];

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto flex min-h-full items-start sm:items-center justify-center p-3 sm:p-6 py-8 sm:py-12 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="relative my-auto w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border shrink-0 ${currentVariant.bg}`}
          >
            {currentVariant.icon}
          </div>

          <div className="space-y-1 pr-4">
            <h3 className="text-base font-bold text-white tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-5 py-2 text-xs font-bold shadow-lg transition-all ${currentVariant.btn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

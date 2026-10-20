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
      bg: "bg-rose-50 text-rose-600 border-rose-200",
      btn: "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 text-white",
      icon: <Trash2 className="h-6 w-6" />,
    },
    warning: {
      bg: "bg-amber-50 text-amber-600 border-amber-200",
      btn: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20 text-white font-bold",
      icon: <AlertTriangle className="h-6 w-6" />,
    },
    info: {
      bg: "bg-indigo-50 text-indigo-600 border-indigo-200",
      btn: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 text-white",
      icon: <Info className="h-6 w-6" />,
    },
  };

  const currentVariant = iconVariants[variant];

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto flex min-h-full items-start sm:items-center justify-center p-3 sm:p-6 py-8 sm:py-12 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative my-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150 space-y-5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent Bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 ${
            variant === "danger"
              ? "bg-rose-500"
              : variant === "warning"
                ? "bg-amber-500"
                : "bg-indigo-600"
          }`}
        />

        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4 pt-1">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border shrink-0 ${currentVariant.bg}`}
          >
            {currentVariant.icon}
          </div>

          <div className="space-y-1 pr-4">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`cursor-pointer rounded-xl px-5 py-2 text-xs font-bold shadow-xs transition-all ${currentVariant.btn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

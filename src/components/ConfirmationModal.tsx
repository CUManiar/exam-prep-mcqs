"use client";

import React from "react";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import { ModalShell } from "./ModalShell";

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
  const Icon =
    variant === "danger"
      ? Trash2
      : variant === "warning"
        ? AlertTriangle
        : Info;
  const tone =
    variant === "danger"
      ? "modal-status-danger"
      : variant === "warning"
        ? "modal-status-warning"
        : "modal-status-info";

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      labelledBy="confirmation-modal-title"
      describedBy="confirmation-modal-description"
      className="w-full max-w-md p-6 sm:p-7"
    >
      <div className="flex items-start gap-4 pr-6">
        <span className={`modal-status-icon ${tone}`} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="page-eyebrow">Please confirm</p>
          <h2
            id="confirmation-modal-title"
            data-modal-initial-focus
            tabIndex={-1}
            className="mt-1 text-lg font-semibold tracking-tight text-slate-900"
          >
            {title}
          </h2>
          <p
            id="confirmation-modal-description"
            className="mt-2 text-sm leading-6 text-slate-600"
          >
            {message}
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="button-secondary">
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={
            variant === "danger"
              ? "button-danger"
              : variant === "warning"
                ? "button-warning"
                : "button-primary"
          }
        >
          {confirmText}
        </button>
      </div>
    </ModalShell>
  );
}

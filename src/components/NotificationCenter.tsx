"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, FileText, GraduationCap, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { AppNotification } from "../lib/types";

function formatNotificationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  if (elapsedMinutes < 1440) return `${Math.floor(elapsedMinutes / 60)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "result") return <GraduationCap className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export function NotificationCenter() {
  const router = useRouter();
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.reduce(
    (count, notification) => count + (notification.read ? 0 : 1),
    0,
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleOpenNotification = (notification: AppNotification) => {
    markNotificationRead(notification.id);
    setIsOpen(false);
    if (notification.href) router.push(notification.href);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={
          unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <section
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+0.625rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Notifications
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Exam and paper updates
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close notifications"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Bell className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-800">
                You’re all caught up
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Results and paper updates will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="max-h-[min(26rem,60vh)] overflow-y-auto">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleOpenNotification(notification)}
                    className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3.5 text-left transition hover:bg-slate-50 ${
                      notification.read ? "bg-white" : "bg-blue-50/50"
                    }`}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <NotificationIcon type={notification.type} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-900">
                          {notification.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-500">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-600">
                        {notification.message}
                      </span>
                    </span>
                    {!notification.read && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  disabled={unreadCount === 0}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-default disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
                <button
                  type="button"
                  onClick={clearNotifications}
                  className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  Clear
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  LayoutDashboard,
  ListChecks,
  LogIn,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { NotificationCenter } from "./NotificationCenter";
import { ProfileSettingsModal } from "./ProfileSettingsModal";

const navigation = [
  {
    href: "/",
    label: "Overview",
    mobileLabel: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/papers",
    label: "Question papers",
    mobileLabel: "Papers",
    icon: BookOpen,
  },
  {
    href: "/history",
    label: "Performance",
    mobileLabel: "History",
    icon: BarChart3,
  },
  {
    href: "/syllabus",
    label: "Syllabus",
    mobileLabel: "Syllabus",
    icon: ListChecks,
  },
  {
    href: "/help/mcp",
    label: "AI Help",
    mobileLabel: "AI Help",
    icon: Sparkles,
    isAi: true,
  },
];

export function Navbar() {
  const pathname = usePathname() || "/";
  const { currentUser, openAuthModal, theme, setTheme } = useApp();
  const [showProfile, setShowProfile] = useState(false);

  if (pathname.startsWith("/exam")) return null;

  return (
    <>
      <header className="app-header print:hidden">
        <div className="app-header-inner">
          <Link
            href="/"
            className="app-brand"
            aria-label="UPSC Prep Hub overview"
          >
            <span className="app-brand-mark">
              <img src="/upsc_logo.png" alt="" />
            </span>
            <span className="min-w-0">
              <span className="app-brand-name">UPSC Prep Hub</span>
              <span className="app-brand-caption">Assessment workspace</span>
            </span>
          </Link>

          <nav className="app-primary-nav" aria-label="Main navigation">
            {navigation.map(({ href, label, icon: Icon, isAi }) => {
              const active =
                Boolean(currentUser) &&
                (href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(`${href}/`));
              if (!currentUser && href !== "/" && href !== "/help/mcp") {
                return (
                  <button
                    key={href}
                    type="button"
                    onClick={openAuthModal}
                    className={`app-nav-link ${isAi ? "ai-help-link" : ""}`}
                  >
                    <Icon aria-hidden="true" />
                    {label}
                  </button>
                );
              }
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`app-nav-link ${isAi ? "ai-help-link" : ""} ${active ? "is-active" : ""}`}
                >
                  <Icon aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="app-header-actions">
            {/* Quick Reading Theme Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextTheme =
                  theme === "light"
                    ? "sepia"
                    : theme === "sepia"
                      ? "dark"
                      : "light";
                setTheme(nextTheme);
              }}
              title={`Switch visual comfort theme (Current: ${theme})`}
              aria-label={`Switch visual comfort theme. Current theme: ${theme}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {theme === "light" ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : theme === "sepia" ? (
                <BookOpen className="h-4 w-4 text-amber-700" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-400" />
              )}
            </button>

            <NotificationCenter />
            {currentUser ? (
              <button
                type="button"
                className="app-account-button"
                onClick={() => setShowProfile(true)}
                aria-label="Open account and preferences"
              >
                <span className="app-account-avatar" aria-hidden="true">
                  {(
                    currentUser.user_metadata?.full_name ||
                    currentUser.email ||
                    "A"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </span>
                <span className="app-account-label">Account</span>
              </button>
            ) : (
              <button
                type="button"
                className="app-sign-in"
                onClick={openAuthModal}
              >
                <LogIn aria-hidden="true" />
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <nav
        className="app-mobile-nav print:hidden"
        aria-label="Mobile bottom navigation"
      >
        {navigation.map(({ href, label, mobileLabel, icon: Icon, isAi }) => {
          const active =
            Boolean(currentUser) &&
            (href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`));
          if (!currentUser && href !== "/" && href !== "/help/mcp") {
            return (
              <button
                type="button"
                key={href}
                onClick={openAuthModal}
                className={`app-mobile-nav-link ${isAi ? "ai-help-link" : ""}`}
              >
                <Icon aria-hidden="true" />
                <span>{mobileLabel || label}</span>
              </button>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`app-mobile-nav-link ${isAi ? "ai-help-link" : ""} ${active ? "is-active" : ""}`}
            >
              <Icon aria-hidden="true" />
              <span>{mobileLabel || label}</span>
            </Link>
          );
        })}
      </nav>
      <ProfileSettingsModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </>
  );
}

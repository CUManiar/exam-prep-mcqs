"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActivePage } from "../lib/types";
import { useApp } from "../context/AppContext";
import { ProfileSettingsModal } from "./ProfileSettingsModal";
import {
  LayoutDashboard,
  BookOpen,
  History,
  UploadCloud,
  Clock,
  Sparkles,
  LogIn,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  Lock,
} from "lucide-react";

interface NavbarProps {
  activePage?: ActivePage;
  onNavigate?: (page: ActivePage) => void;
  onDataReload?: () => void;
  isInExam?: boolean;
}

export function Navbar({
  activePage,
  onNavigate,
  onDataReload,
  isInExam: propIsInExam,
}: NavbarProps) {
  const pathname = usePathname();
  const {
    isPro,
    openProUpgradeModal,
    currentUser,
    openAuthModal,
    handleSignOut,
  } = useApp();
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [profileModalTab, setProfileModalTab] = useState<
    "profile" | "settings"
  >("profile");

  // Derive active tab from pathname
  const currentTab = (() => {
    if (activePage) return activePage;
    if (!pathname || pathname === "/") return "dashboard";
    if (pathname.startsWith("/papers")) return "papers";
    if (pathname.startsWith("/history")) return "history";
    if (pathname.startsWith("/upload")) return "upload";
    if (pathname.startsWith("/exam")) return "session";
    return "dashboard";
  })();

  const isInExam =
    propIsInExam || (pathname ? pathname.startsWith("/exam") : false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setCurrentDateTime(`${dateStr} • ${timeStr}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[0_1px_2px_0_rgba(0,0,0,0.03)] print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        {/* Brand / Logo with UPSC Emblem */}
        <Link
          href="/"
          onClick={() => onNavigate && onNavigate("dashboard")}
          className="cursor-pointer flex items-center gap-3 text-left group focus:outline-none shrink-0"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 p-1 group-hover:scale-105 transition-transform overflow-hidden shadow-xs">
            <img
              src="/upsc_logo.png"
              alt="UPSC Logo"
              className="h-full w-full object-contain filter drop-shadow-xs"
            />
          </div>
          <div>
            <span className="block text-sm font-extrabold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
              UPSC Prep Hub
            </span>
            <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider whitespace-nowrap">
              Prelims • Mains
            </span>
          </div>
        </Link>

        {/* Navigation Links - Single line, spacious & clear */}
        <nav className="hidden lg:flex items-center gap-1.5 shrink-0">
          <Link
            href="/"
            onClick={() => onNavigate && onNavigate("dashboard")}
            className={`cursor-pointer flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
              currentTab === "dashboard"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-xs"
                : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>{currentUser ? "Dashboard" : "Home"}</span>
          </Link>

          {currentUser ? (
            <>
              <Link
                href="/papers"
                onClick={() => onNavigate && onNavigate("papers")}
                className={`cursor-pointer flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                  currentTab === "papers"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-xs"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                <span>Question Papers</span>
              </Link>

              <Link
                href="/history"
                onClick={() => onNavigate && onNavigate("history")}
                className={`cursor-pointer flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                  currentTab === "history" || currentTab === "attempt-detail"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-xs"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <History className="h-4 w-4 shrink-0" />
                <span>Mock History</span>
              </Link>

              <Link
                href="/upload"
                onClick={() => onNavigate && onNavigate("upload")}
                className={`cursor-pointer flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                  currentTab === "upload"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-xs"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <UploadCloud className="h-4 w-4 shrink-0" />
                <span>Upload Paper</span>
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuthModal()}
                className="cursor-pointer flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-slate-100/80 transition-all whitespace-nowrap"
                title="Sign in to access Question Papers Archive"
              >
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Question Papers</span>
              </button>

              <button
                onClick={() => openAuthModal()}
                className="cursor-pointer flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-slate-100/80 transition-all whitespace-nowrap"
                title="Sign in to view your test history"
              >
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Mock History</span>
              </button>

              <button
                onClick={() => openAuthModal()}
                className="cursor-pointer flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-slate-100/80 transition-all whitespace-nowrap"
                title="Sign in to upload custom papers"
              >
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Upload Paper</span>
              </button>
            </>
          )}
        </nav>

        {/* Live Date/Time & Backup */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Always Visible Current Date & Time (One Line Only) */}
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs font-mono text-slate-700 shadow-xs whitespace-nowrap shrink-0">
            <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>{currentDateTime || "Loading time..."}</span>
          </div>

          {/* Freemium Pro Status / Upgrade CTA */}
          {currentUser && isPro ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/90 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs whitespace-nowrap shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-400 shrink-0" />
              <span>PRO Member</span>
            </div>
          ) : (
            <button
              onClick={() => openProUpgradeModal()}
              className="cursor-pointer flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-700 hover:from-amber-600 hover:to-indigo-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:shadow-sm transition-all whitespace-nowrap shrink-0 active:scale-[0.98]"
              title="Unlock complete 2024–2026 UPSC paper vault & custom uploads with Razorpay"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-200 fill-amber-200 shrink-0" />
              <span>Upgrade (₹999)</span>
            </button>
          )}

          {/* User Auth Profile / Sign In */}
          {currentUser ? (
            <div className="relative shrink-0">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 px-2.5 py-1.5 text-xs font-semibold text-indigo-900 transition-colors shadow-2xs"
              >
                <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                  {currentUser.email ? currentUser.email[0] : "U"}
                </div>
                <span className="hidden md:inline max-w-[120px] truncate text-[11px]">
                  {currentUser.user_metadata?.full_name ||
                    currentUser.email?.split("@")[0]}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl z-50 animate-in fade-in">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {currentUser.user_metadata?.full_name || "Aspirant"}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate font-mono">
                      {currentUser.email}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPro
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isPro ? "⭐ Lifetime Pro Vault" : "Free Tier (2026)"}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileModalTab("profile");
                        setShowProfileModal(true);
                        setShowUserMenu(false);
                      }}
                      className="cursor-pointer flex w-full items-center gap-2 rounded-xl p-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 text-left transition-colors"
                    >
                      <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileModalTab("settings");
                        setShowProfileModal(true);
                        setShowUserMenu(false);
                      }}
                      className="cursor-pointer flex w-full items-center gap-2 rounded-xl p-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 text-left transition-colors"
                    >
                      <SettingsIcon className="h-3.5 w-3.5 text-slate-500" />
                      <span>Preferences & Settings</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={async () => {
                        setShowUserMenu(false);
                        await handleSignOut();
                      }}
                      className="cursor-pointer flex w-full items-center gap-2 rounded-xl p-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 text-left transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuthModal()}
              className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors whitespace-nowrap shrink-0"
              title="Sign in to save your personal test history to the cloud"
            >
              <LogIn className="h-3.5 w-3.5 text-slate-500" />
              <span>Sign In</span>
            </button>
          )}

          {/* Quick Settings Icon Button - Logged in users only */}
          {currentUser && (
            <button
              onClick={() => {
                setProfileModalTab("settings");
                setShowProfileModal(true);
              }}
              title="Preferences & Settings"
              className="cursor-pointer flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-2xs shrink-0"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <ProfileSettingsModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        initialTab={profileModalTab}
      />

      {/* Medium/Mobile Nav Bar - Hidden during active exam session */}
      {!isInExam && (
        <div className="flex lg:hidden items-center justify-around border-t border-slate-200 bg-white px-3 py-2">
          <Link
            href="/"
            onClick={() => onNavigate && onNavigate("dashboard")}
            className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
              currentTab === "dashboard"
                ? "text-indigo-700 bg-indigo-50 font-bold"
                : "text-slate-600"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            {currentUser ? "Dashboard" : "Home"}
          </Link>

          {currentUser ? (
            <>
              <Link
                href="/papers"
                onClick={() => onNavigate && onNavigate("papers")}
                className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
                  currentTab === "papers"
                    ? "text-indigo-700 bg-indigo-50 font-bold"
                    : "text-slate-600"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Papers
              </Link>
              <Link
                href="/history"
                onClick={() => onNavigate && onNavigate("history")}
                className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
                  currentTab === "history" || currentTab === "attempt-detail"
                    ? "text-indigo-700 bg-indigo-50 font-bold"
                    : "text-slate-600"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                History
              </Link>
              <Link
                href="/upload"
                onClick={() => onNavigate && onNavigate("upload")}
                className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
                  currentTab === "upload"
                    ? "text-indigo-700 bg-indigo-50 font-bold"
                    : "text-slate-600"
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuthModal()}
                className="cursor-pointer flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-indigo-600"
              >
                <Lock className="h-3 w-3 text-slate-400" />
                Papers
              </button>
              <button
                onClick={() => openAuthModal()}
                className="cursor-pointer flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-indigo-600"
              >
                <Lock className="h-3 w-3 text-slate-400" />
                History
              </button>
              <button
                onClick={() => openAuthModal()}
                className="cursor-pointer flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-indigo-600"
              >
                <Lock className="h-3 w-3 text-slate-400" />
                Upload
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronDown,
  GraduationCap,
  Layers,
  LayoutDashboard,
  ListChecks,
  LogIn,
  Menu,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { NotificationCenter } from "./NotificationCenter";
import { ProfileSettingsModal } from "./ProfileSettingsModal";

interface NavDropdownItem {
  href: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

interface NavGroup {
  id: "practice" | "study";
  label: string;
  icon: React.ElementType;
  items: NavDropdownItem[];
}

const navGroups: NavGroup[] = [
  {
    id: "practice",
    label: "Practice",
    icon: BookOpen,
    items: [
      {
        href: "/papers",
        label: "Question Papers & Mocks",
        desc: "Prelims simulator, PYQs, custom tests & re-tests",
        icon: BookOpen,
        iconColor: "text-blue-600 dark:text-blue-400",
        iconBg:
          "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
      },
      {
        href: "/mains",
        label: "Mains Answer Desk",
        desc: "Line-by-line script evaluation & model answers",
        icon: Award,
        iconColor: "text-indigo-600 dark:text-indigo-400",
        iconBg:
          "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800",
      },
    ],
  },
  {
    id: "study",
    label: "Study & Revision",
    icon: GraduationCap,
    items: [
      {
        href: "/syllabus",
        label: "Syllabus Tracker",
        desc: "GS & CSAT syllabus progress & matching questions",
        icon: ListChecks,
        iconColor: "text-emerald-600 dark:text-emerald-400",
        iconBg:
          "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
      },
      {
        href: "/revision",
        label: "AI Revision Tutor",
        desc: "Active recall flashcards, dossiers & exam chat",
        icon: GraduationCap,
        iconColor: "text-purple-600 dark:text-purple-400",
        iconBg:
          "bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800",
      },
      {
        href: "/misc",
        label: "Vocabulary & Study Aids",
        desc: "Editorial vocab builder, mnemonics & quotes",
        icon: Layers,
        iconColor: "text-amber-600 dark:text-amber-400",
        iconBg:
          "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
      },
    ],
  },
];

const mobilePrimaryNavigation = [
  {
    href: "/",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/papers",
    label: "Papers",
    icon: BookOpen,
  },
  {
    href: "/mains",
    label: "Mains",
    icon: Award,
  },
  {
    href: "/revision",
    label: "Revision",
    icon: GraduationCap,
  },
];

export function Navbar() {
  const pathname = usePathname() || "/";
  const { currentUser, openAuthModal, theme, setTheme } = useApp();
  const [showProfile, setShowProfile] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"practice" | "study" | null>(
    null,
  );
  const navContainerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
  }, [pathname]);

  // Click outside to dismiss dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        navContainerRef.current &&
        !navContainerRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleMouseEnter = (groupId: "practice" | "study") => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpenDropdown(groupId);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 150);
  };

  if (pathname.startsWith("/exam") || pathname.match(/^\/history\/[^/]+$/)) {
    return null;
  }

  return (
    <>
      <header className="app-header print:hidden">
        <div className="app-header-inner">
          {/* Brand Logo & Title */}
          <Link
            href="/"
            className="app-brand"
            aria-label="UPSC Prep Hub overview"
          >
            <span className="app-brand-mark">
              <img src="/favicon.svg" alt="UPSC Prep Hub" />
            </span>
            <span className="min-w-0">
              <span className="app-brand-name">UPSC Prep Hub</span>
              <span className="app-brand-caption">Assessment workspace</span>
            </span>
          </Link>

          {/* Grouped, Categorized Desktop Navigation */}
          <nav
            ref={navContainerRef}
            className="app-primary-nav"
            aria-label="Main navigation"
          >
            {/* 1. Overview */}
            <Link
              href="/"
              aria-current={
                pathname === "/" && currentUser ? "page" : undefined
              }
              className={`app-nav-link ${
                pathname === "/" && currentUser ? "is-active" : ""
              }`}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              <span>Overview</span>
            </Link>

            {/* 2. Grouped Dropdowns: Practice & Study */}
            {navGroups.map((group) => {
              const isGroupActive =
                Boolean(currentUser) &&
                group.items.some(
                  (item) =>
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`),
                );
              const GroupIcon = group.icon;
              const isOpen = openDropdown === group.id;

              return (
                <div
                  key={group.id}
                  className="relative"
                  onMouseEnter={() => handleMouseEnter(group.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenDropdown((prev) =>
                        prev === group.id ? null : group.id,
                      )
                    }
                    aria-expanded={isOpen}
                    className={`app-nav-link inline-flex items-center gap-1.5 cursor-pointer ${
                      isGroupActive ? "is-active" : ""
                    } ${isOpen ? "bg-slate-100 dark:bg-slate-800" : ""}`}
                  >
                    <GroupIcon className="h-4 w-4" aria-hidden="true" />
                    <span>{group.label}</span>
                    <ChevronDown
                      className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                        isOpen
                          ? "rotate-180 text-slate-700 dark:text-slate-200"
                          : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu Popover */}
                  {isOpen && (
                    <div className="absolute top-full left-0 mt-1 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {group.label} Tools
                      </div>
                      {group.items.map((item) => {
                        const isItemActive =
                          Boolean(currentUser) &&
                          (pathname === item.href ||
                            pathname.startsWith(`${item.href}/`));
                        const ItemIcon = item.icon;

                        const content = (
                          <div
                            className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors group text-left cursor-pointer ${
                              isItemActive
                                ? "bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/70"
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-2xs ${item.iconBg} ${item.iconColor}`}
                            >
                              <ItemIcon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-xs font-semibold block ${
                                    isItemActive
                                      ? "text-indigo-700 dark:text-indigo-300 font-bold"
                                      : "text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                                  }`}
                                >
                                  {item.label}
                                </span>
                                {isItemActive && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        );

                        if (!currentUser && item.href !== "/") {
                          return (
                            <button
                              key={item.href}
                              type="button"
                              onClick={() => {
                                setOpenDropdown(null);
                                openAuthModal();
                              }}
                              className="w-full text-left"
                            >
                              {content}
                            </button>
                          );
                        }

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpenDropdown(null)}
                            className="block"
                          >
                            {content}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 3. Analytics & Performance */}
            <Link
              href="/history"
              onClick={(e) => {
                if (!currentUser) {
                  e.preventDefault();
                  openAuthModal();
                }
              }}
              aria-current={
                pathname.startsWith("/history") && currentUser
                  ? "page"
                  : undefined
              }
              className={`app-nav-link ${
                pathname.startsWith("/history") && currentUser
                  ? "is-active"
                  : ""
              }`}
            >
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              <span>Analytics</span>
            </Link>
          </nav>

          {/* Action Tools & User Profile */}
          <div className="app-header-actions">
            {/* 4. AI Agent (Right-aligned) */}
            <Link
              href="/help/mcp"
              aria-current={
                pathname.startsWith("/help/mcp") ? "page" : undefined
              }
              className={`app-nav-link ai-help-link hidden sm:inline-flex ${
                pathname.startsWith("/help/mcp") ? "is-active" : ""
              }`}
              title="Connect Claude, ChatGPT or local agents via MCP"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>AI Agent</span>
            </Link>

            {/* Quick Reading Theme Toggle: Shown only to logged-in students */}
            {currentUser && (
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
            )}

            {/* Notifications: Shown only to logged-in students */}
            {currentUser && <NotificationCenter />}

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

      {/* Mobile Bottom Navigation */}
      <nav
        className="app-mobile-nav print:hidden"
        aria-label="Mobile bottom navigation"
      >
        {mobilePrimaryNavigation.map(({ href, label, icon: Icon }) => {
          const active =
            Boolean(currentUser) &&
            (href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`));
          if (!currentUser && href !== "/" && href !== "/mains") {
            return (
              <button
                type="button"
                key={href}
                onClick={openAuthModal}
                className="app-mobile-nav-link"
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`app-mobile-nav-link ${active ? "is-active" : ""}`}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* 5th Action: More / Menu Side Panel */}
        <button
          type="button"
          onClick={() => setShowProfile(true)}
          aria-label="Open side menu and settings"
          className={`app-mobile-nav-link ${
            showProfile ||
            pathname.startsWith("/history") ||
            pathname.startsWith("/syllabus") ||
            pathname.startsWith("/misc") ||
            pathname.startsWith("/help/mcp")
              ? "is-active"
              : ""
          }`}
        >
          <Menu aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>
      <ProfileSettingsModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </>
  );
}

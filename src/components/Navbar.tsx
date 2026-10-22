"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, LayoutDashboard, LogIn } from "lucide-react";
import { useApp } from "../context/AppContext";
import { NotificationCenter } from "./NotificationCenter";
import { ProfileSettingsModal } from "./ProfileSettingsModal";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/papers", label: "Question papers", icon: BookOpen },
  { href: "/history", label: "Performance", icon: BarChart3 },
];

export function Navbar() {
  const pathname = usePathname() || "/";
  const { currentUser, openAuthModal } = useApp();
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
            {navigation.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(`${href}/`);
              if (!currentUser && href !== "/") {
                return (
                  <button
                    key={href}
                    type="button"
                    onClick={openAuthModal}
                    className="app-nav-link"
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
                  className={`app-nav-link ${active ? "is-active" : ""}`}
                >
                  <Icon aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="app-header-actions">
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
        <nav className="app-mobile-nav" aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            if (!currentUser && href !== "/") {
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
        </nav>
      </header>
      <ProfileSettingsModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </>
  );
}

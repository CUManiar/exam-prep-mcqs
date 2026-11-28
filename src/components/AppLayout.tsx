"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AppProvider } from "../context/AppContext";
import { Navbar } from "./Navbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const navTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setIsNavigating(false);
    if (navTimerRef.current !== null) {
      window.clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    const startNav = () => {
      setIsNavigating(true);
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current);
      }
      navTimerRef.current = window.setTimeout(() => {
        setIsNavigating(false);
        navTimerRef.current = null;
      }, 8000);
    };

    const handleDocumentClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === pathname) return;
        startNav();
      } catch {}
    };

    const handleNavStartEvent = () => startNav();

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("app-navigation-start", handleNavStartEvent);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("app-navigation-start", handleNavStartEvent);
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current);
      }
    };
  }, [pathname]);

  const isExamView = pathname ? pathname.startsWith("/exam") : false;
  const isReviewDetail = pathname
    ? Boolean(pathname.match(/^\/history\/[^/]+$/))
    : false;
  const isRevision = pathname ? pathname.startsWith("/revision") : false;
  const isMains = pathname ? pathname.startsWith("/mains") : false;
  const hideNavbar = isExamView || isReviewDetail;

  return (
    <AppProvider>
      {!hideNavbar && <Navbar />}
      {isNavigating && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/15 backdrop-blur-[1.5px]"
          role="status"
          aria-live="polite"
          aria-label="Loading page"
        >
          <div className="fixed top-0 inset-x-0 h-1 bg-indigo-600/80 animate-pulse" />
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-xl">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
            Loading…
          </div>
        </div>
      )}
      <main
        className={
          isExamView
            ? "exam-app-main"
            : isReviewDetail
              ? "h-screen h-[100dvh] w-full overflow-hidden"
              : isRevision
                ? "h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)] pb-[3.15rem] md:pb-0 overflow-hidden flex flex-col w-full max-w-full"
                : isMains
                  ? "min-h-[calc(100dvh-3.5rem)] pb-24 md:pb-8 w-full max-w-full overflow-x-hidden"
                  : "min-h-[calc(100vh-7rem)] sm:min-h-[calc(100vh-4rem)] pb-16 md:pb-0 w-full max-w-full overflow-x-hidden"
        }
      >
        {children}
      </main>
    </AppProvider>
  );
}

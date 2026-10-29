"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppProvider } from "../context/AppContext";
import { Navbar } from "./Navbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreenView = pathname
    ? pathname.startsWith("/exam") ||
      Boolean(pathname.match(/^\/history\/[^/]+$/))
    : false;

  return (
    <AppProvider>
      {!isFullscreenView && <Navbar />}
      <main
        className={
          isFullscreenView
            ? "exam-app-main"
            : "min-h-[calc(100vh-7rem)] sm:min-h-[calc(100vh-4rem)] pb-16 md:pb-0"
        }
      >
        {children}
      </main>
    </AppProvider>
  );
}

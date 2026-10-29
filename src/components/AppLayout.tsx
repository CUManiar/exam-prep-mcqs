"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppProvider } from "../context/AppContext";
import { Navbar } from "./Navbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isExamView = pathname ? pathname.startsWith("/exam") : false;
  const isReviewDetail = pathname
    ? Boolean(pathname.match(/^\/history\/[^/]+$/))
    : false;
  const hideNavbar = isExamView || isReviewDetail;

  return (
    <AppProvider>
      {!hideNavbar && <Navbar />}
      <main
        className={
          isExamView
            ? "exam-app-main"
            : isReviewDetail
              ? "min-h-screen w-full"
              : "min-h-[calc(100vh-7rem)] sm:min-h-[calc(100vh-4rem)] pb-16 md:pb-0"
        }
      >
        {children}
      </main>
    </AppProvider>
  );
}

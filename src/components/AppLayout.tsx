"use client";
import { usePathname } from "next/navigation";
import { AppProvider } from "../context/AppContext";
import { Navbar } from "./Navbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isExamView = pathname ? pathname.startsWith("/exam") : false;
  const isReviewDetail = pathname
    ? Boolean(pathname.match(/^\/history\/[^/]+$/))
    : false;
  const isRevision = pathname ? pathname.startsWith("/revision") : false;
  const hideNavbar = isExamView || isReviewDetail;

  return (
    <AppProvider>
      {!hideNavbar && <Navbar />}
      <main
        className={
          isExamView
            ? "exam-app-main"
            : isReviewDetail
              ? "h-screen h-[100dvh] w-full overflow-hidden"
              : isRevision
                ? "h-[calc(100dvh-7.75rem)] md:h-[calc(100dvh-4rem)] overflow-hidden flex flex-col"
                : "min-h-[calc(100vh-7rem)] sm:min-h-[calc(100vh-4rem)] pb-16 md:pb-0"
        }
      >
        {children}
      </main>
    </AppProvider>
  );
}

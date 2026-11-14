"use client";

import { Suspense } from "react";
import { MiscHubView } from "../../components/misc/MiscHubView";
import { Loader2 } from "lucide-react";

export default function MiscPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            <span>Loading Study Aids...</span>
          </div>
        </div>
      }
    >
      <MiscHubView />
    </Suspense>
  );
}

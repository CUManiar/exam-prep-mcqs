"use client";

import { Suspense } from "react";
import { RevisionView } from "../../components/revision/RevisionView";
import { AccountRequired } from "../../components/AccountRequired";
import { Loader2 } from "lucide-react";

export default function RevisionPage() {
  return (
    <AccountRequired
      title="Flashcards & AI Revision"
      description="Sign in to generate personalized revision dossiers, practice active recall flashcards, and sync your study progress across devices."
    >
      <Suspense
        fallback={
          <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              <span>Loading Revision Workspace...</span>
            </div>
          </div>
        }
      >
        <RevisionView />
      </Suspense>
    </AccountRequired>
  );
}

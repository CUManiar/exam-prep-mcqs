"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { PapersView } from "../../components/PapersView";
import { UploadView } from "../../components/UploadView";
import { AccountRequired } from "../../components/AccountRequired";

function PapersWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    papers,
    handleStartExam,
    handleDeletePaper,
    handleUpdatePaper,
    handlePaperUploaded,
  } = useApp();

  return (
    <AccountRequired
      title={
        searchParams.get("view") === "upload"
          ? "Add a question paper"
          : "Your question papers"
      }
      description="Sign in to manage your paper library, create assessments, and keep your results with your account."
    >
      {searchParams.get("view") === "upload" ? (
        <UploadView
          papers={papers}
          onPaperUploaded={handlePaperUploaded}
          onUpdatePaper={handleUpdatePaper}
          onDeletePaper={handleDeletePaper}
          onNavigatePapers={() => router.push("/papers?tab=custom")}
          onStartExam={handleStartExam}
        />
      ) : (
        <PapersView
          papers={papers}
          onStartExam={handleStartExam}
          onNavigateUpload={() => router.push("/papers?view=upload")}
          onDeletePaper={handleDeletePaper}
          onUpdatePaper={handleUpdatePaper}
        />
      )}
    </AccountRequired>
  );
}

export default function QuestionPapersPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container py-20 text-sm text-slate-500">
          Loading paper library…
        </div>
      }
    >
      <PapersWorkspace />
    </Suspense>
  );
}

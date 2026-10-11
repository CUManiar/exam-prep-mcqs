"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../../context/AppContext";
import { PapersView } from "../../components/PapersView";

export default function QuestionPapersPage() {
  const router = useRouter();
  const { papers, handleStartExam, handleDeletePaper, handleUpdatePaper } =
    useApp();

  return (
    <PapersView
      papers={papers}
      onStartExam={handleStartExam}
      onNavigateUpload={() => router.push("/upload")}
      onDeletePaper={handleDeletePaper}
      onUpdatePaper={handleUpdatePaper}
    />
  );
}

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import { UploadView } from '../../components/UploadView';

export default function UploadPage() {
  const router = useRouter();
  const {
    papers,
    handlePaperUploaded,
    handleUpdatePaper,
    handleDeletePaper,
  } = useApp();

  return (
    <UploadView
      papers={papers}
      onPaperUploaded={handlePaperUploaded}
      onUpdatePaper={handleUpdatePaper}
      onDeletePaper={handleDeletePaper}
      onNavigatePapers={() => router.push('/papers')}
    />
  );
}

'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { HistoryView } from '../../components/HistoryView';

export default function MockHistoryPage() {
  const {
    attempts,
    handleViewAttemptDetail,
    handleDeleteAttempt,
  } = useApp();

  return (
    <HistoryView
      attempts={attempts}
      onViewAttempt={handleViewAttemptDetail}
      onDeleteAttempt={handleDeleteAttempt}
    />
  );
}

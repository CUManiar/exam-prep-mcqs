'use client';

import React, { useState, useEffect } from 'react';
import { ActivePage, QuestionPaper, Attempt } from '../lib/types';
import { 
  getAttempts, 
  loadAttemptsFromServer,
  saveAttempt, 
  updateAttempt, 
  deleteAttempt, 
  getAllPapers,
  deletePaperFromServer,
  updatePaperOnServer 
} from '../lib/storage';

import { Navbar } from '../components/Navbar';
import { DashboardView } from '../components/DashboardView';
import { PapersView } from '../components/PapersView';
import { HistoryView } from '../components/HistoryView';
import { UploadView } from '../components/UploadView';
import { ExamSessionView } from '../components/ExamSessionView';
import { AttemptDetailView } from '../components/AttemptDetailView';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  // Active exam session
  const [activeSession, setActiveSession] = useState<{
    paper: QuestionPaper;
    mode: 'practice' | 'mock';
  } | null>(null);

  // Selected Attempt for Dedicated Detail View
  const [selectedAttemptForDetail, setSelectedAttemptForDetail] = useState<Attempt | null>(null);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    // 1. Initial local cache for instant render
    setAttempts(getAttempts());
    
    // 2. Fetch server persisted attempts & papers
    const [serverAttempts, loadedPapers] = await Promise.all([
      loadAttemptsFromServer(),
      getAllPapers()
    ]);
    setAttempts(serverAttempts);
    setPapers(loadedPapers);
  };

  // Launching an exam uses the paper's preconfigured rules directly!
  const handleStartExam = (paper: QuestionPaper, mode: 'practice' | 'mock') => {
    setActiveSession({ paper, mode });
    setActivePage('session');
  };

  // Finishing an exam session
  const handleFinishExamSession = (attempt: Attempt) => {
    // Practice mode is not saved to official History
    if (attempt.mode === 'mock') {
      saveAttempt(attempt);
      setAttempts(getAttempts());
    }
    setActiveSession(null);
    setSelectedAttemptForDetail(attempt);
    setActivePage('attempt-detail');
  };

  const handleExitExamSession = () => {
    if (confirm('Are you sure you want to exit the current exam? Progress will not be saved.')) {
      setActiveSession(null);
      setActivePage('papers');
    }
  };

  // Inspecting an attempt on dedicated page
  const handleViewAttemptDetail = (attempt: Attempt) => {
    setSelectedAttemptForDetail(attempt);
    setActivePage('attempt-detail');
  };

  // Updating an attempt (notes, edits)
  const handleUpdateAttempt = (updated: Attempt) => {
    if (updated.mode === 'mock') {
      updateAttempt(updated.id, () => updated);
      setAttempts(getAttempts());
    }
    setSelectedAttemptForDetail(updated);
  };

  // Deleting an attempt
  const handleDeleteAttempt = (attemptId: string) => {
    deleteAttempt(attemptId);
    setAttempts(getAttempts());
    if (selectedAttemptForDetail?.id === attemptId) {
      setSelectedAttemptForDetail(null);
    }
    setActivePage('history');
  };

  // Paper uploaded handler - reload from server
  const handlePaperUploaded = async (newPaper: QuestionPaper) => {
    const freshPapers = await getAllPapers();
    setPapers(freshPapers);
  };

  // Delete paper from repository & server files
  const handleDeletePaper = async (paperId: string) => {
    if (confirm('Are you sure you want to delete this paper and its files from the repository?')) {
      await deletePaperFromServer(paperId);
      const freshPapers = await getAllPapers();
      setPapers(freshPapers);
    }
  };

  // Update paper rules
  const handleUpdatePaper = async (paper: QuestionPaper) => {
    await updatePaperOnServer(paper.id, paper);
    const freshPapers = await getAllPapers();
    setPapers(freshPapers);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navbar with UPSC Emblem */}
      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
        onDataReload={loadAllData}
        isInExam={activePage === 'session'}
      />

      {/* Main Content Areas */}
      <main className="flex-1">
        {activePage === 'dashboard' && (
          <DashboardView
            papers={papers}
            attempts={attempts}
            onStartExam={handleStartExam}
            onNavigatePapers={() => setActivePage('papers')}
            onNavigateHistory={() => setActivePage('history')}
            onViewAttempt={handleViewAttemptDetail}
          />
        )}

        {activePage === 'papers' && (
          <PapersView
            papers={papers}
            onStartExam={handleStartExam}
            onNavigateUpload={() => setActivePage('upload')}
            onDeletePaper={handleDeletePaper}
            onUpdatePaper={handleUpdatePaper}
          />
        )}

        {activePage === 'history' && (
          <HistoryView
            attempts={attempts}
            onViewAttempt={handleViewAttemptDetail}
            onDeleteAttempt={handleDeleteAttempt}
          />
        )}

        {activePage === 'upload' && (
          <UploadView
            onPaperUploaded={handlePaperUploaded}
            onNavigatePapers={() => setActivePage('papers')}
          />
        )}

        {activePage === 'session' && activeSession && (
          <ExamSessionView
            paper={activeSession.paper}
            mode={activeSession.mode}
            onFinish={handleFinishExamSession}
            onExit={handleExitExamSession}
          />
        )}

        {activePage === 'attempt-detail' && selectedAttemptForDetail && (
          <AttemptDetailView
            attempt={selectedAttemptForDetail}
            papers={papers}
            onBack={() => setActivePage(selectedAttemptForDetail.mode === 'mock' ? 'history' : 'papers')}
            onUpdate={handleUpdateAttempt}
            onDelete={handleDeleteAttempt}
          />
        )}
      </main>
    </div>
  );
}

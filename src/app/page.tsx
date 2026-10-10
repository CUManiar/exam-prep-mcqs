'use client';

import React, { useState, useEffect } from 'react';
import { ActivePage, QuestionPaper, Attempt, ExamSettings } from '../lib/types';
import { 
  getSettings, 
  saveSettings, 
  getAttempts, 
  saveAttempt, 
  updateAttempt, 
  deleteAttempt, 
  getAllPapers 
} from '../lib/storage';
import { DEFAULT_SETTINGS } from '../lib/defaults';

import { Navbar } from '../components/Navbar';
import { DashboardView } from '../components/DashboardView';
import { PapersView } from '../components/PapersView';
import { HistoryView } from '../components/HistoryView';
import { UploadView } from '../components/UploadView';
import { ExamSessionView } from '../components/ExamSessionView';
import { PreExamModal } from '../components/PreExamModal';
import { SettingsModal } from '../components/SettingsModal';
import { AttemptDetailModal } from '../components/AttemptDetailModal';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [settings, setSettings] = useState<ExamSettings>(DEFAULT_SETTINGS);

  // Pre-exam modal state
  const [selectedPaperForExam, setSelectedPaperForExam] = useState<QuestionPaper | null>(null);
  const [examMode, setExamMode] = useState<'practice' | 'mock'>('practice');
  const [isPreExamModalOpen, setIsPreExamModalOpen] = useState<boolean>(false);

  // Active exam session
  const [activeExamConfig, setActiveExamConfig] = useState<{
    paper: QuestionPaper;
    mode: 'practice' | 'mock';
    totalQuestions: number;
    correctMarks: number;
    incorrectMarks: number;
    timeMinutes: number;
  } | null>(null);

  // Settings & Detail modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [inspectedAttempt, setInspectedAttempt] = useState<Attempt | null>(null);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const loadedSettings = getSettings();
    setSettings(loadedSettings);
    const loadedAttempts = getAttempts();
    setAttempts(loadedAttempts);
    const loadedPapers = await getAllPapers();
    setPapers(loadedPapers);
  };

  // Launching an exam
  const handleRequestExamStart = (paper: QuestionPaper, mode: 'practice' | 'mock') => {
    setSelectedPaperForExam(paper);
    setExamMode(mode);

    // If fast start with defaults is enabled in Settings, launch directly!
    if (settings.fastStartWithDefaults) {
      const qCount = Object.keys(paper.answerKey).length || settings.defaultTotalQuestions;
      setActiveExamConfig({
        paper,
        mode,
        totalQuestions: qCount,
        correctMarks: settings.defaultCorrectMarks,
        incorrectMarks: settings.defaultIncorrectMarks,
        timeMinutes: settings.defaultTimeMinutes,
      });
      setActivePage('session');
    } else {
      setIsPreExamModalOpen(true);
    }
  };

  const handleConfirmExamStart = (config: {
    totalQuestions: number;
    correctMarks: number;
    incorrectMarks: number;
    timeMinutes: number;
    saveAsDefault: boolean;
  }) => {
    if (!selectedPaperForExam) return;

    if (config.saveAsDefault) {
      const newSettings: ExamSettings = {
        ...settings,
        defaultTotalQuestions: config.totalQuestions,
        defaultCorrectMarks: config.correctMarks,
        defaultIncorrectMarks: config.incorrectMarks,
        defaultTimeMinutes: config.timeMinutes,
      };
      saveSettings(newSettings);
      setSettings(newSettings);
    }

    setActiveExamConfig({
      paper: selectedPaperForExam,
      mode: examMode,
      totalQuestions: config.totalQuestions,
      correctMarks: config.correctMarks,
      incorrectMarks: config.incorrectMarks,
      timeMinutes: config.timeMinutes,
    });

    setIsPreExamModalOpen(false);
    setActivePage('session');
  };

  // Finishing an exam
  const handleFinishExamSession = (attempt: Attempt) => {
    saveAttempt(attempt);
    setAttempts(getAttempts());
    setActiveExamConfig(null);
    setInspectedAttempt(attempt);
    setActivePage('history');
  };

  const handleExitExamSession = () => {
    if (confirm('Are you sure you want to exit the current exam? Progress will not be saved.')) {
      setActiveExamConfig(null);
      setActivePage('papers');
    }
  };

  // Updating an attempt (notes, edits)
  const handleUpdateAttempt = (updated: Attempt) => {
    updateAttempt(updated.id, () => updated);
    setAttempts(getAttempts());
    setInspectedAttempt(updated);
  };

  // Deleting an attempt
  const handleDeleteAttempt = (attemptId: string) => {
    deleteAttempt(attemptId);
    setAttempts(getAttempts());
    if (inspectedAttempt?.id === attemptId) {
      setInspectedAttempt(null);
    }
  };

  // Paper uploaded handler
  const handlePaperUploaded = (newPaper: QuestionPaper) => {
    setPapers(prev => [newPaper, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        activePage={activePage}
        onNavigate={setActivePage}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isInExam={activePage === 'session'}
      />

      {/* Main Content Areas */}
      <main className="flex-1">
        {activePage === 'dashboard' && (
          <DashboardView
            papers={papers}
            attempts={attempts}
            onStartExam={handleRequestExamStart}
            onNavigatePapers={() => setActivePage('papers')}
            onNavigateHistory={() => setActivePage('history')}
            onViewAttempt={att => setInspectedAttempt(att)}
          />
        )}

        {activePage === 'papers' && (
          <PapersView
            papers={papers}
            onStartExam={handleRequestExamStart}
            onNavigateUpload={() => setActivePage('upload')}
          />
        )}

        {activePage === 'history' && (
          <HistoryView
            attempts={attempts}
            onViewAttempt={att => setInspectedAttempt(att)}
            onDeleteAttempt={handleDeleteAttempt}
          />
        )}

        {activePage === 'upload' && (
          <UploadView
            onPaperUploaded={handlePaperUploaded}
            onNavigatePapers={() => setActivePage('papers')}
          />
        )}

        {activePage === 'session' && activeExamConfig && (
          <ExamSessionView
            paper={activeExamConfig.paper}
            mode={activeExamConfig.mode}
            config={activeExamConfig}
            onFinish={handleFinishExamSession}
            onExit={handleExitExamSession}
          />
        )}
      </main>

      {/* Pre-Exam Questions Modal */}
      <PreExamModal
        isOpen={isPreExamModalOpen}
        paper={selectedPaperForExam}
        mode={examMode}
        settings={settings}
        onClose={() => setIsPreExamModalOpen(false)}
        onStart={handleConfirmExamStart}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={newS => {
          saveSettings(newS);
          setSettings(newS);
        }}
        onDataReload={loadAllData}
      />

      {/* Attempt Review & Edit Modal */}
      <AttemptDetailModal
        isOpen={!!inspectedAttempt}
        attempt={inspectedAttempt}
        onClose={() => setInspectedAttempt(null)}
        onUpdate={handleUpdateAttempt}
        onDelete={handleDeleteAttempt}
      />
    </div>
  );
}

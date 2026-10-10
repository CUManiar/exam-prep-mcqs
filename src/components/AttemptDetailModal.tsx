'use client';

import React, { useState } from 'react';
import { Attempt, QuestionAnswer } from '../lib/types';
import { formatTimeSeconds, formatDateTime } from '../lib/defaults';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Edit3, 
  Save, 
  Trash2, 
  Bookmark, 
  FileText 
} from 'lucide-react';

interface AttemptDetailModalProps {
  attempt: Attempt | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: Attempt) => void;
  onDelete: (attemptId: string) => void;
}

export function AttemptDetailModal({
  attempt,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: AttemptDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'correct' | 'incorrect' | 'skipped'>('all');
  const [editingGeneralNote, setEditingGeneralNote] = useState<boolean>(false);
  const [generalNote, setGeneralNote] = useState<string>('');
  const [editingQNote, setEditingQNote] = useState<number | null>(null);
  const [qNoteText, setQNoteText] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  React.useEffect(() => {
    if (attempt) {
      setGeneralNote(attempt.generalNotes || '');
      setEditingGeneralNote(false);
      setEditingQNote(null);
    }
  }, [attempt]);

  if (!isOpen || !attempt) return null;

  const handleSaveGeneralNote = () => {
    const updated = { ...attempt, generalNotes: generalNote };
    onUpdate(updated);
    setEditingGeneralNote(false);
  };

  const handleSaveQuestionNote = (qNo: number) => {
    const updatedAnswers = { ...attempt.answers };
    if (updatedAnswers[qNo]) {
      updatedAnswers[qNo] = { ...updatedAnswers[qNo], note: qNoteText };
    }
    const updated = { ...attempt, answers: updatedAnswers };
    onUpdate(updated);
    setEditingQNote(null);
  };

  const questionList = Array.from({ length: attempt.totalQuestions }, (_, i) => i + 1).map(qNo => {
    return attempt.answers[qNo] || {
      questionNo: qNo,
      selected: null,
      correctAnswer: undefined,
      isCorrect: null,
      flagged: false,
      note: '',
    };
  });

  const filteredQuestions = questionList.filter(q => {
    if (activeTab === 'correct') return q.selected && q.isCorrect === true;
    if (activeTab === 'incorrect') return q.selected && q.isCorrect === false;
    if (activeTab === 'skipped') return !q.selected;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 p-5 bg-slate-950/60 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                attempt.mode === 'practice' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
              }`}>
                {attempt.mode} Exam Review
              </span>
              <span className="text-xs text-slate-400">{formatDateTime(attempt.startedAt)}</span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-white">
              {attempt.paperLabel}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-2 text-rose-400 hover:bg-rose-900/40 transition-colors"
              title="Delete attempt"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Score & KPI Overview Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-slate-900/40 border-b border-slate-800 shrink-0">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-[11px] text-slate-400">Total Score</div>
            <div className="text-xl font-bold text-white">
              {attempt.score} <span className="text-xs text-slate-500">/ {attempt.maxScore}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-[11px] text-slate-400">Accuracy</div>
            <div className="text-xl font-bold text-emerald-400">{attempt.accuracyPct}%</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-[11px] text-slate-400">Attempted Breakdown</div>
            <div className="text-sm font-semibold text-slate-200 mt-1">
              <span className="text-emerald-400">{attempt.correct}C</span> •{' '}
              <span className="text-rose-400">{attempt.incorrect}W</span> •{' '}
              <span className="text-slate-400">{attempt.unattempted}S</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-[11px] text-slate-400">Time Taken</div>
            <div className="text-xl font-bold text-indigo-300 font-mono">
              {formatTimeSeconds(attempt.durationSeconds)}
            </div>
          </div>
        </div>

        {/* General Notes Section */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/30 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-indigo-400" />
              Attempt Notes & Insights
            </span>
            {!editingGeneralNote && (
              <button
                onClick={() => setEditingGeneralNote(true)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Edit3 className="h-3 w-3" /> Edit Note
              </button>
            )}
          </div>

          {editingGeneralNote ? (
            <div className="space-y-2">
              <textarea
                value={generalNote}
                onChange={e => setGeneralNote(e.target.value)}
                placeholder="Add overall observations, weak areas, time-management learnings..."
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingGeneralNote(false)}
                  className="rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGeneralNote}
                  className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              {attempt.generalNotes || 'No notes added for this attempt yet. Click "Edit Note" to record insights.'}
            </p>
          )}
        </div>

        {/* Question Filter Tabs */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900 shrink-0">
          <span className="text-xs font-bold text-white">Question Responses</span>
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            {(['all', 'correct', 'incorrect', 'skipped'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded px-2.5 py-1 capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Question Breakdown List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredQuestions.map(q => {
            const isAnswered = q.selected !== null;
            const isCorrect = q.selected && q.isCorrect === true;
            const isWrong = q.selected && q.isCorrect === false;

            return (
              <div
                key={q.questionNo}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-white text-sm">
                      Question {q.questionNo}
                    </span>
                    {q.flagged && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">
                        <Bookmark className="h-3 w-3 fill-amber-400" /> Flagged
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isCorrect && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" /> Correct
                      </span>
                    )}
                    {isWrong && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-rose-400">
                        <XCircle className="h-4 w-4" /> Incorrect
                      </span>
                    )}
                    {!isAnswered && (
                      <span className="text-xs text-slate-500 font-medium">
                        Skipped
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Your Selection: </span>
                    <strong className="text-white">{q.selected || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Correct Answer: </span>
                    <strong className="text-emerald-400">{q.correctAnswer || '—'}</strong>
                  </div>
                </div>

                {/* Question Note */}
                <div className="pt-2 border-t border-slate-800/60">
                  {editingQNote === q.questionNo ? (
                    <div className="space-y-2 mt-1">
                      <textarea
                        value={qNoteText}
                        onChange={e => setQNoteText(e.target.value)}
                        placeholder="Write note for this question..."
                        rows={2}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingQNote(null)}
                          className="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveQuestionNote(q.questionNo)}
                          className="rounded bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white hover:bg-indigo-500"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 italic">
                        {q.note ? `Note: ${q.note}` : 'No question note'}
                      </span>
                      <button
                        onClick={() => {
                          setEditingQNote(q.questionNo);
                          setQNoteText(q.note || '');
                        }}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300"
                      >
                        {q.note ? 'Edit Note' : '+ Add Note'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 max-w-sm w-full space-y-3">
            <h4 className="text-sm font-bold text-white">Delete Attempt?</h4>
            <p className="text-xs text-slate-400">
              This will permanently delete this attempt and its notes.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(attempt.id);
                  onClose();
                }}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

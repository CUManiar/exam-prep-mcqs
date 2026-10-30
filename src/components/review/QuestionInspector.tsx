"use client";

import React, { useState } from "react";
import { QuestionAnswer, ParsedQuestion, SubjectiveAssessment } from "../../lib/types";
import { formatTimeSeconds } from "../../lib/defaults";
import { MatchingItemsTable } from "../MatchingItemsTable";
import { SubjectiveAssessmentWidget } from "./SubjectiveAssessmentWidget";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  FileText,
  Lightbulb,
  Edit3,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  Bookmark,
  ArrowRight,
  Eye,
} from "lucide-react";

interface QuestionInspectorProps {
  question: QuestionAnswer;
  parsedQuestion?: ParsedQuestion;
  totalQuestions: number;
  isAssessmentQuestion: (qNo: number) => boolean;
  isClozeQuestion: (qNo: number) => boolean;
  getFullMarks: (qNo: number) => number;
  incorrectMarksPerQ: number;
  onSaveQuestionNote: (qNo: number, note: string) => void;
  onSetSubjectiveAssessment: (
    qNo: number,
    assessment: SubjectiveAssessment,
    marks?: number,
  ) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onJumpToNextMistake?: () => void;
  hasNextMistake?: boolean;
  canPreviewPaper?: boolean;
  showPaperSplit?: boolean;
  onTogglePaperSplit?: () => void;
}

export function QuestionInspector({
  question,
  parsedQuestion,
  totalQuestions,
  isAssessmentQuestion,
  isClozeQuestion,
  getFullMarks,
  incorrectMarksPerQ,
  onSaveQuestionNote,
  onSetSubjectiveAssessment,
  onNavigatePrev,
  onNavigateNext,
  onJumpToNextMistake,
  hasNextMistake,
  canPreviewPaper,
  showPaperSplit,
  onTogglePaperSplit,
}: QuestionInspectorProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(question.note || "");

  const qNo = question.questionNo;
  const isEvaluable = isAssessmentQuestion(qNo);
  const isCloze = isClozeQuestion(qNo);
  const subjectiveAssessment = question.subjectiveAssessment;
  const isAnswered = isCloze
    ? Boolean(question.selected?.trim() && question.selected !== "attempted")
    : question.selected !== null && question.selected !== undefined;

  const isCorrect = isEvaluable
    ? subjectiveAssessment === "strong"
    : Boolean(question.selected && question.isCorrect === true);
  const isWrong = isEvaluable
    ? subjectiveAssessment === "needs-work"
    : Boolean(question.selected && question.isCorrect === false);
  const isPartial = isEvaluable && subjectiveAssessment === "partial";
  const isSkipped = !isAnswered && !subjectiveAssessment;
  const isSlow = (question.timeSpentSeconds || 0) >= 90;

  const fullMarks = getFullMarks(qNo);
  const rawExpected = (parsedQuestion?.answer || question.correctAnswer || "").trim();
  const expectedAnswer = rawExpected.replace(/[\(\)\[\]\.\s]/g, "").toUpperCase();
  const rawCandidate = (question.selected || "").trim();
  const candidateAnswer = rawCandidate.replace(/[\(\)\[\]\.\s]/g, "").toUpperCase();
  const officialExplanation = parsedQuestion?.explanation || question.explanation;

  const handleSaveNote = () => {
    onSaveQuestionNote(qNo, noteText);
    setIsEditingNote(false);
  };

  const handleCancelNote = () => {
    setNoteText(question.note || "");
    setIsEditingNote(false);
  };

  const hasParsedOptions = Boolean(
    parsedQuestion?.options && Object.keys(parsedQuestion.options).length > 0,
  );

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden flex flex-col justify-between min-h-[580px]">
      {/* 1. Header Bar: Q.No, Outcome, Marks, Time, Confidence */}
      <div className="border-b border-slate-200/90 bg-slate-50/70 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Question No & Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center justify-center px-3 py-1 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs shadow-2xs">
            Question {qNo}
          </span>
          <span className="text-xs font-medium text-slate-400">
            of {totalQuestions}
          </span>

          {/* Outcome Pill */}
          {isCorrect && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Correct (+{fullMarks.toFixed(1)} pts)
            </span>
          )}
          {isWrong && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
              <XCircle className="h-3.5 w-3.5 text-rose-600" />
              Incorrect (-{incorrectMarksPerQ.toFixed(2)} pts)
            </span>
          )}
          {isPartial && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
              Partial (+{(question.subjectiveMarks ?? fullMarks * 0.5).toFixed(1)} pts)
            </span>
          )}
          {isSkipped && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Unattempted (0 pts)
            </span>
          )}

          {isCloze && (
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
              Cloze / Free-text
            </span>
          )}
        </div>

        {/* Right: Confidence Tag & Time Spent */}
        <div className="flex items-center gap-2.5 text-xs">
          {question.confidence && (
            <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-2xs">
              {question.confidence === "sure"
                ? "🎯 Sure"
                : question.confidence === "50-50"
                  ? "⚖️ 50:50"
                  : question.confidence === "elimination"
                    ? "✂️ Elim"
                    : "🎲 Guess"}
            </span>
          )}

          {question.flagged && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              <Bookmark className="h-3 w-3 fill-amber-500 text-amber-500" />
              Flagged
            </span>
          )}

          <div
            className={`inline-flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded-lg border ${
              isSlow
                ? "border-amber-300 bg-amber-50 text-amber-900 font-bold"
                : "border-slate-200 bg-white text-slate-700 shadow-2xs"
            }`}
            title={isSlow ? "Exceeded 90s benchmark" : "Pacing healthy"}
          >
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{question.timeSpentSeconds || 0}s</span>
          </div>
        </div>
      </div>

      {/* 2. Main Question Statement & Options Area */}
      <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-22rem)]">
        {/* Altered Response Nuance Alert Banner (Mock Mode) - Fixed Boolean guard against 0 */}
        {!isCloze && Boolean(question.changesCount && question.changesCount > 0) && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs text-indigo-950 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Response altered during test:</strong> Candidate changed their selection {question.changesCount} time(s).
                {Boolean(question.answerHistory && question.answerHistory.length > 0) && (
                  <span className="ml-1 font-mono">
                    ({question.answerHistory.join(" → ")} → {question.selected})
                  </span>
                )}
              </span>
            </div>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                isCorrect
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {isCorrect ? "Beneficial revision" : "Harmful revision"}
            </span>
          </div>
        )}

        {/* Question Text */}
        <div className="space-y-3">
          {parsedQuestion?.text ? (
            <div className="text-sm sm:text-base text-slate-900 font-medium leading-relaxed whitespace-pre-wrap select-text">
              {parsedQuestion.text}
            </div>
          ) : (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>
                  Question {qNo} statement text is in the original Question Paper PDF.
                </span>
              </div>
              {canPreviewPaper && onTogglePaperSplit && !showPaperSplit && (
                <button
                  type="button"
                  onClick={onTogglePaperSplit}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>View Paper PDF</span>
                </button>
              )}
            </div>
          )}

          {/* Matching Items Table (if present) */}
          {Boolean(parsedQuestion?.matchingItems && parsedQuestion.matchingItems.length > 0) && (
            <MatchingItemsTable
              items={parsedQuestion!.matchingItems!}
              headers={parsedQuestion?.matchingHeaders}
            />
          )}
        </div>

        {/* 3. Options List (For MCQ) OR Cloze Comparison OR PDF Paper Answer Comparison */}
        {isCloze ? (
          /* Cloze Response Evaluation Box */
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Candidate written response */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1.5 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Edit3 className="h-3 w-3 text-indigo-600" />
                  Your Submitted Answer
                </span>
                <div className="p-2.5 rounded-lg bg-slate-50 font-mono text-sm font-semibold text-slate-900 border border-slate-200/80 min-h-[48px] flex items-center">
                  {question.selected && question.selected.trim() ? (
                    question.selected
                  ) : (
                    <span className="text-slate-400 italic font-normal text-xs">
                      No response entered (Unattempted)
                    </span>
                  )}
                </div>
              </div>

              {/* Official Answer Key */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-1.5 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Official Answer Key
                </span>
                <div className="p-2.5 rounded-lg bg-white font-mono text-sm font-bold text-emerald-950 border border-emerald-100 min-h-[48px] flex items-center">
                  {expectedAnswer || "Refer to Solution Key"}
                </div>
              </div>
            </div>

            {/* Evaluation Widget */}
            <SubjectiveAssessmentWidget
              value={subjectiveAssessment}
              isAnswered={isAnswered}
              partialMarks={question.subjectiveMarks}
              maxPartialMarks={fullMarks}
              penaltyMarks={incorrectMarksPerQ}
              onChange={(assessment) =>
                onSetSubjectiveAssessment(qNo, assessment)
              }
              onPartialMarksChange={(marks) =>
                onSetSubjectiveAssessment(qNo, "partial", marks)
              }
            />
          </div>
        ) : hasParsedOptions ? (
          /* MCQ Option Cards with full text */
          <div className="space-y-2.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
              Options Comparison
            </span>

            <div className="grid grid-cols-1 gap-2.5">
              {["A", "B", "C", "D"].map((optKey) => {
                const optText = parsedQuestion!.options[optKey];
                if (!optText) return null;

                const isCandidateChoice = candidateAnswer === optKey;
                const isOfficialCorrect = expectedAnswer === optKey;

                let cardStyle =
                  "border-slate-200 bg-white text-slate-800 hover:border-slate-300";
                let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";

                if (isOfficialCorrect) {
                  cardStyle =
                    "border-emerald-500 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs";
                  badgeStyle = "bg-emerald-600 text-white border-emerald-700";
                } else if (isCandidateChoice && !isOfficialCorrect) {
                  cardStyle =
                    "border-rose-500 bg-rose-50/90 text-rose-950 ring-2 ring-rose-500/20 shadow-xs";
                  badgeStyle = "bg-rose-600 text-white border-rose-700";
                } else {
                  cardStyle = "border-slate-200 bg-white text-slate-700";
                  badgeStyle = "bg-slate-100 text-slate-500 border-slate-200";
                }

                return (
                  <div
                    key={optKey}
                    className={`w-full rounded-xl border p-3.5 text-left flex items-start gap-3 transition-all ${cardStyle}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center h-6 w-6 rounded-lg font-black text-xs shrink-0 border transition-all mt-0.5 ${badgeStyle}`}
                    >
                      {optKey}
                    </span>
                    <div className="flex-1 text-xs sm:text-sm leading-relaxed self-center font-normal">
                      {optText}
                    </div>

                    {/* Status Tags */}
                    {isCandidateChoice && isOfficialCorrect && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Your answer (Correct)</span>
                      </span>
                    )}
                    {isCandidateChoice && !isOfficialCorrect && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300">
                        <XCircle className="h-3.5 w-3.5 text-rose-600" />
                        <span>Your answer</span>
                      </span>
                    )}
                    {!isCandidateChoice && isOfficialCorrect && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Correct answer</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* PDF Papers / Questions without Parsed Markdown Options - Complete Answer & Option Badges */
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Answer Options & Key Comparison
              </span>
              <div className="text-xs font-semibold">
                {isCorrect ? (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    +{fullMarks.toFixed(2)} pts awarded
                  </span>
                ) : isWrong ? (
                  <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                    -{incorrectMarksPerQ.toFixed(2)} penalty
                  </span>
                ) : (
                  <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    0 pts (Skipped)
                  </span>
                )}
              </div>
            </div>

            {/* 4 Option Badges Comparison Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {["A", "B", "C", "D"].map((optKey) => {
                const isCandidateChoice = candidateAnswer === optKey;
                const isOfficialCorrect = expectedAnswer === optKey;

                let cardStyle = "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
                let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
                let label: string | null = null;

                if (isOfficialCorrect) {
                  cardStyle =
                    "border-emerald-500 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/20 font-bold shadow-xs";
                  badgeStyle = "bg-emerald-600 text-white border-emerald-700";
                  label = isCandidateChoice ? "Your choice (Correct)" : "Correct Key";
                } else if (isCandidateChoice && !isOfficialCorrect) {
                  cardStyle =
                    "border-rose-500 bg-rose-50/90 text-rose-950 ring-2 ring-rose-500/20 font-bold shadow-xs";
                  badgeStyle = "bg-rose-600 text-white border-rose-700";
                  label = "Your choice";
                }

                return (
                  <div
                    key={optKey}
                    className={`rounded-xl border p-3 flex flex-col items-center justify-center text-center gap-1.5 transition-all ${cardStyle}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center h-8 w-8 rounded-xl font-mono font-black text-sm border shadow-2xs ${badgeStyle}`}
                    >
                      {optKey}
                    </span>
                    {label ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isOfficialCorrect
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {label}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Option {optKey}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Status Summary Banner */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[11px] font-medium">
                  Your Marked Response:
                </span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                    isCorrect
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : isWrong
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {question.selected ? `Option ${question.selected.toUpperCase()}` : "Unattempted"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[11px] font-medium">
                  Official Solution Key:
                </span>
                <span className="font-mono font-bold px-2 py-0.5 rounded-md text-xs bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Option {expectedAnswer || "No key provided"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Student Scratchpad Note (Hero Position) */}
        {isEditingNote ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5 text-amber-700" />
                Edit Candidate Scratchpad Note
              </span>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Keywords, formulas, elimination logic or mistakes made while solving this question..."
              rows={3}
              className="w-full rounded-lg border border-amber-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelNote}
                className="px-2.5 py-1 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs cursor-pointer"
              >
                <Check className="h-3 w-3" />
                Save Note
              </button>
            </div>
          </div>
        ) : question.note && question.note.trim() ? (
          <div className="rounded-xl border border-amber-300/90 bg-amber-50/80 p-3.5 shadow-2xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <FileText className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-900 font-mono leading-relaxed whitespace-pre-wrap break-words">
                <strong className="text-amber-900 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                  Candidate Note / Elimination Scratchpad
                </strong>
                {question.note}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setNoteText(question.note || "");
                setIsEditingNote(true);
              }}
              className="text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 shrink-0 transition-colors cursor-pointer"
            >
              Edit Note
            </button>
          </div>
        ) : (
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => {
                setNoteText("");
                setIsEditingNote(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors font-medium cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span>+ Add note for this question</span>
            </button>
          </div>
        )}

        {/* 5. Official Solution & Conceptual Breakdown */}
        {officialExplanation && (
          <div className="rounded-xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 p-4 sm:p-5 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
              <Lightbulb className="h-4 w-4 text-indigo-600" />
              <span>Official Explanation & Solution</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-normal select-text">
              {officialExplanation}
            </p>
          </div>
        )}
      </div>

      {/* 3. Navigation Bar (Footer) */}
      <div className="border-t border-slate-200/90 bg-white p-3.5 sm:px-6 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={qNo <= 1}
          onClick={onNavigatePrev}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        {/* Next Mistake Quick Jump */}
        {hasNextMistake && onJumpToNextMistake && (
          <button
            type="button"
            onClick={onJumpToNextMistake}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Fast forward to next incorrect question"
          >
            <span>Next Mistake</span>
            <ArrowRight className="h-3.5 w-3.5 text-rose-600" />
          </button>
        )}

        <button
          type="button"
          disabled={qNo >= totalQuestions}
          onClick={onNavigateNext}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs hover:shadow-sm disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}



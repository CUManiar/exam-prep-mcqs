"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Attempt,
  QuestionPaper,
  QuestionAnswer,
  SubjectiveAssessment,
} from "../../lib/types";
import { useReviewData } from "./useReviewData";
import { ReviewHeader } from "./ReviewHeader";
import { ReviewScoreHero } from "./ReviewScoreHero";
import { QuestionFilterBar } from "./QuestionFilterBar";
import { QuestionPalette } from "./QuestionPalette";
import { QuestionInspector } from "./QuestionInspector";
import { PaperPreviewPanel } from "./PaperPreviewPanel";
import { GeneralNotesCard } from "./GeneralNotesCard";
import { DetailedSolutionModal } from "../DetailedSolutionModal";
import { useApp } from "../../context/AppContext";
import {
  FilterTabType,
  SortOptionType,
  ReviewFilterState,
  EMPTY_FILTER_STATE,
  isFilterActive,
} from "./reviewTypes";
import { SUBJECTIVE_ASSESSMENT_META } from "../../lib/defaults";
import { BarChart3, Columns, LayoutGrid } from "lucide-react";

interface AttemptReviewViewProps {
  attempt: Attempt;
  papers: QuestionPaper[];
  onBack: () => void;
  onUpdate: (updated: Attempt) => void;
  onDelete: (attemptId: string) => void;
}

export function AttemptReviewView({
  attempt,
  papers,
  onBack,
  onUpdate,
  onDelete,
}: AttemptReviewViewProps) {
  const { handleStartExam } = useApp();

  // 1. Core data computation hook
  const {
    matchedPaper,
    isMarkdownPaper,
    markdownQuestions,
    markdownHeader,
    canPreviewPaper,
    displayPaperTitle,
    effectiveMaxScore,
    scorePct,
    grossCorrectMarks,
    negativePenaltyMarks,
    netAlterationMarks,
    avgTimePerQ,
    cutoffVerdict,
    topTakeaways,
    questionList,
    alteredQuestions,
    slowQuestions,
    flaggedQuestions,
    incorrectQuestionsList,
    sureQuestions,
    fiftyFiftyQuestions,
    eliminationQuestions,
    guessQuestions,
    isClozeQuestion,
    isAssessmentQuestion,
    isQuestionAnswered,
    getFullMarks,
    getAssessmentMarks,
    formatReviewNumber,
    getFilteredQuestions,
  } = useReviewData(attempt, papers);

  // 2. View State: Composite AND Filter state
  const [filters, setFilters] = useState<ReviewFilterState>(EMPTY_FILTER_STATE);
  const [sortOption, setSortOption] = useState<SortOptionType>("qno_asc");
  const [activeQuestionNo, setActiveQuestionNo] = useState<number>(1);
  const [showPaperSplit, setShowPaperSplit] = useState<boolean>(true);
  const [activeMobileView, setActiveMobileView] = useState<
    "review" | "score"
  >("review");

  // Modals
  const [solutionModalOpen, setSolutionModalOpen] = useState(false);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);

  // Filtered questions using AND interaction
  const filteredQuestions = useMemo(
    () => getFilteredQuestions(filters, sortOption),
    [getFilteredQuestions, filters, sortOption],
  );

  const hasActiveFilters = isFilterActive(filters);

  // Ensure active question stays valid
  const currentQuestionAnswer = useMemo(() => {
    return (
      attempt.answers?.[activeQuestionNo] ||
      questionList.find((q) => q.questionNo === activeQuestionNo) ||
      questionList[0] || {
        questionNo: 1,
        selected: null,
      }
    );
  }, [attempt.answers, activeQuestionNo, questionList]);

  const currentParsedQuestion = useMemo(() => {
    return markdownQuestions.find((mq) => mq.questionNo === activeQuestionNo);
  }, [markdownQuestions, activeQuestionNo]);

  // Jump to specific question
  const jumpToQuestion = (qNo: number) => {
    setActiveQuestionNo(qNo);
  };

  const filteredQuestionNosSet = useMemo(() => {
    return new Set(filteredQuestions.map((q) => q.questionNo));
  }, [filteredQuestions]);

  const syncActiveQuestionToMatches = (matches: QuestionAnswer[]) => {
    if (matches.length > 0) {
      const inMatches = matches.some((q) => q.questionNo === activeQuestionNo);
      if (!inMatches) {
        jumpToQuestion(matches[0].questionNo);
      }
    }
  };

  const handleToggleOutcome = (outcome: "incorrect" | "correct" | "skipped") => {
    setFilters((prev) => {
      const next = { ...prev, outcome: prev.outcome === outcome ? null : outcome };
      syncActiveQuestionToMatches(getFilteredQuestions(next, sortOption));
      return next;
    });
  };

  const handleToggleConfidence = (confidence: "sure" | "50-50" | "guess") => {
    setFilters((prev) => {
      const next = { ...prev, confidence: prev.confidence === confidence ? null : confidence };
      syncActiveQuestionToMatches(getFilteredQuestions(next, sortOption));
      return next;
    });
  };

  const handleToggleFlagged = () => {
    setFilters((prev) => {
      const next = { ...prev, flagged: !prev.flagged };
      syncActiveQuestionToMatches(getFilteredQuestions(next, sortOption));
      return next;
    });
  };

  const handleToggleSlow = () => {
    setFilters((prev) => {
      const next = { ...prev, slow: !prev.slow };
      syncActiveQuestionToMatches(getFilteredQuestions(next, sortOption));
      return next;
    });
  };

  const handleToggleAltered = () => {
    setFilters((prev) => {
      const next = { ...prev, altered: !prev.altered };
      syncActiveQuestionToMatches(getFilteredQuestions(next, sortOption));
      return next;
    });
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTER_STATE);
  };

  const handleApplyTakeawayFilter = (tab: FilterTabType, filterState?: ReviewFilterState) => {
    if (filterState) {
      setFilters(filterState);
      syncActiveQuestionToMatches(getFilteredQuestions(filterState, sortOption));
    } else {
      if (tab === "all") handleResetFilters();
      else if (tab === "incorrect") handleToggleOutcome("incorrect");
      else if (tab === "correct") handleToggleOutcome("correct");
      else if (tab === "skipped") handleToggleOutcome("skipped");
      else if (tab === "sure") handleToggleConfidence("sure");
      else if (tab === "50-50") handleToggleConfidence("50-50");
      else if (tab === "guess") handleToggleConfidence("guess");
      else if (tab === "slow") handleToggleSlow();
      else if (tab === "altered") handleToggleAltered();
    }
    setActiveMobileView("review");
  };

  // Next mistake navigation
  const handleJumpToNextMistake = () => {
    if (incorrectQuestionsList.length === 0) return;
    const currentIndex = incorrectQuestionsList.findIndex(
      (q) => q.questionNo > activeQuestionNo,
    );
    if (currentIndex !== -1) {
      jumpToQuestion(incorrectQuestionsList[currentIndex].questionNo);
    } else {
      // Loop back to first mistake
      jumpToQuestion(incorrectQuestionsList[0].questionNo);
    }
  };

  // Note update handler
  const handleSaveQuestionNote = (qNo: number, noteText: string) => {
    const updatedAnswers = { ...attempt.answers };
    if (updatedAnswers[qNo]) {
      updatedAnswers[qNo] = { ...updatedAnswers[qNo], note: noteText };
    } else {
      updatedAnswers[qNo] = {
        questionNo: qNo,
        selected: null,
        note: noteText,
      };
    }
    onUpdate({ ...attempt, answers: updatedAnswers });
  };

  // General note handler
  const handleSaveGeneralNote = (generalNotes: string) => {
    onUpdate({ ...attempt, generalNotes });
  };

  // Subjective self-assessment scoring
  const handleSetSubjectiveAssessment = (
    qNo: number,
    assessment: SubjectiveAssessment,
    subjectiveMarks?: number,
  ) => {
    const correctMarksPerQ = attempt.correctMarks || 2.0;
    const incorrectMarksPerQ = attempt.incorrectMarks || 0.667;
    const updatedAnswers = { ...attempt.answers };
    const currentAnswer = updatedAnswers[qNo] || {
      questionNo: qNo,
      selected: "attempted",
    };

    updatedAnswers[qNo] = {
      ...currentAnswer,
      selected: isClozeQuestion(qNo)
        ? currentAnswer.selected
        : assessment === "no-attempt"
          ? null
          : currentAnswer.selected || "attempted",
      subjectiveAssessment: assessment,
      subjectiveMarks:
        assessment === "partial"
          ? (subjectiveMarks ??
            currentAnswer.subjectiveMarks ??
            getFullMarks(qNo) * 0.5)
          : undefined,
      isCorrect:
        assessment === "strong"
          ? true
          : assessment === "needs-work"
            ? false
            : null,
    };

    const allAnswers = Object.values(updatedAnswers);
    const attemptedAnswers = allAnswers.filter((a) => isQuestionAnswered(a));
    const score =
      Math.round(
        allAnswers.reduce((total, answer) => {
          if (isAssessmentQuestion(answer.questionNo)) {
            return isQuestionAnswered(answer)
              ? total +
                  getAssessmentMarks(
                    answer.questionNo,
                    answer.subjectiveAssessment,
                    answer.subjectiveMarks,
                  )
              : total;
          }
          if (answer.isCorrect === true) return total + correctMarksPerQ;
          if (answer.isCorrect === false) return total - incorrectMarksPerQ;
          return total;
        }, 0) * 100,
      ) / 100;

    const maxScore = attempt.maxScore || attempt.totalMarks || 0;
    const answered = attemptedAnswers.length;
    const subjectivePoints = attemptedAnswers.reduce(
      (total, answer) =>
        total +
        (isAssessmentQuestion(answer.questionNo) && answer.subjectiveAssessment
          ? SUBJECTIVE_ASSESSMENT_META[answer.subjectiveAssessment].fraction
          : answer.isCorrect === true
            ? 1
            : 0),
      0,
    );

    onUpdate({
      ...attempt,
      answers: updatedAnswers,
      answered,
      correct: allAnswers.filter((answer) =>
        isAssessmentQuestion(answer.questionNo)
          ? isQuestionAnswered(answer) && answer.subjectiveAssessment === "strong"
          : answer.isCorrect === true,
      ).length,
      partial: allAnswers.filter(
        (answer) =>
          isAssessmentQuestion(answer.questionNo) &&
          isQuestionAnswered(answer) &&
          answer.subjectiveAssessment === "partial",
      ).length,
      incorrect: allAnswers.filter((answer) =>
        isAssessmentQuestion(answer.questionNo)
          ? isQuestionAnswered(answer) && answer.subjectiveAssessment === "needs-work"
          : answer.isCorrect === false,
      ).length,
      unattempted: Math.max(0, attempt.totalQuestions - answered),
      score: Number(score.toFixed(2)),
      maxScore: Number(maxScore.toFixed(2)),
      percentagePct:
        maxScore > 0 ? Math.round((score / maxScore) * 100 * 10) / 10 : 0,
      accuracyPct:
        answered > 0 ? Math.round((subjectivePoints / answered) * 100 * 10) / 10 : 0,
    });
  };

  // Scroll to top on first mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [attempt.id]);

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 pb-16 flex flex-col font-sans">
      {/* 1. Sticky Header Bar */}
      <ReviewHeader
        attempt={attempt}
        displayPaperTitle={displayPaperTitle}
        matchedPaper={matchedPaper}
        paperDeleted={!matchedPaper}
        canPreviewPaper={canPreviewPaper}
        showPaperSplit={showPaperSplit}
        onTogglePaperSplit={() => {
          setShowPaperSplit(!showPaperSplit);
        }}
        onBack={onBack}
        onDelete={onDelete}
        onReattempt={
          matchedPaper ? () => handleStartExam(matchedPaper, "mock") : undefined
        }
        onOpenSolutionModal={
          matchedPaper?.exsUrl ? () => setSolutionModalOpen(true) : undefined
        }
        onOpenSubmissionModal={
          attempt.userSubmissionPdfUrl
            ? () => setSubmissionModalOpen(true)
            : undefined
        }
        effectiveMaxScore={effectiveMaxScore}
      />

      {/* 2. Mobile Responsive Tab Switcher */}
      <div className="lg:hidden px-3 pt-3">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveMobileView("review")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeMobileView === "review"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
            <span>Paper & Questions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMobileView("score")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeMobileView === "score"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Scorecard ({formatReviewNumber(attempt.score)}/{effectiveMaxScore})</span>
          </button>
        </div>
      </div>

      {/* 3. Main Workspace: 70/30 Separation on Larger Screens, Vertical Split on Mobile */}
      <main className="max-w-[1720px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 sm:gap-6 items-start">
          {/* ============================================================
              LEFT COLUMN (70% on lg+): PRIMARY WORKBENCH (Paper & Filters)
              On mobile: visible when activeMobileView === "review"
              ============================================================ */}
          <section
            className={`lg:col-span-7 space-y-3.5 ${
              activeMobileView === "review" ? "block" : "hidden lg:block"
            }`}
          >
            {/* Filter Bar: on top of the left panel */}
            <div className="w-full">
              <QuestionFilterBar
                filters={filters}
                onToggleOutcome={handleToggleOutcome}
                onToggleFlagged={handleToggleFlagged}
                onToggleConfidence={handleToggleConfidence}
                onToggleSlow={handleToggleSlow}
                onToggleAltered={handleToggleAltered}
                onResetFilters={handleResetFilters}
                counts={{
                  all: questionList.length,
                  correct: attempt.correct,
                  incorrect: attempt.incorrect,
                  skipped: attempt.unattempted,
                  flagged: flaggedQuestions.length,
                  altered: alteredQuestions.length,
                  slow: slowQuestions.length,
                  sure: sureQuestions.length,
                  fiftyFifty: fiftyFiftyQuestions.length,
                  elimination: eliminationQuestions.length,
                  guess: guessQuestions.length,
                }}
                sortOption={sortOption}
                onChangeSort={setSortOption}
                filteredCount={filteredQuestions.length}
              />
            </div>

            {/* Paper Preview Panel (PDF Booklet or Markdown Paper) */}
            {showPaperSplit && canPreviewPaper ? (
              <div className="w-full">
                <PaperPreviewPanel
                  matchedPaper={matchedPaper}
                  isMarkdownPaper={isMarkdownPaper}
                  markdownQuestions={markdownQuestions}
                  markdownHeader={markdownHeader}
                  answers={attempt.answers || {}}
                  activeQuestionNo={activeQuestionNo}
                  onSelectQuestion={jumpToQuestion}
                  onClose={() => {
                    setShowPaperSplit(false);
                  }}
                  attemptFallbackData={{
                    paperId: attempt.paperId,
                    paperLabel: attempt.paperLabel,
                    totalQuestions: attempt.totalQuestions,
                    maxScore: attempt.maxScore,
                    correctMarks: attempt.correctMarks,
                    incorrectMarks: attempt.incorrectMarks,
                  }}
                />
              </div>
            ) : (
              /* Question Inspector (When paper preview is toggled off) */
              <div>
                <QuestionInspector
                  question={currentQuestionAnswer}
                  parsedQuestion={currentParsedQuestion}
                  totalQuestions={questionList.length}
                  isAssessmentQuestion={isAssessmentQuestion}
                  isClozeQuestion={isClozeQuestion}
                  getFullMarks={getFullMarks}
                  incorrectMarksPerQ={attempt.incorrectMarks || 0.667}
                  onSaveQuestionNote={handleSaveQuestionNote}
                  onSetSubjectiveAssessment={handleSetSubjectiveAssessment}
                  onNavigatePrev={() => jumpToQuestion(Math.max(1, activeQuestionNo - 1))}
                  onNavigateNext={() =>
                    jumpToQuestion(Math.min(questionList.length, activeQuestionNo + 1))
                  }
                  onJumpToNextMistake={handleJumpToNextMistake}
                  hasNextMistake={incorrectQuestionsList.length > 0}
                  canPreviewPaper={canPreviewPaper}
                  showPaperSplit={showPaperSplit}
                  onTogglePaperSplit={() => setShowPaperSplit(!showPaperSplit)}
                />
              </div>
            )}
          </section>

          {/* ============================================================
              RIGHT COLUMN (30% on lg+): REVIEW COMPANION
              On mobile: Question Palette is stacked below Paper in "review" mode;
              Scorecard & Reflections are shown in "score" mode.
              ============================================================ */}
          <aside className="lg:col-span-3 space-y-4">
            {/* 1. Scorecard & Cutoff Target (Collapsible, Analytics holds Diagnostics) */}
            <div
              className={`${
                activeMobileView === "score" ? "block" : "hidden lg:block"
              }`}
            >
              <ReviewScoreHero
                attempt={attempt}
                effectiveMaxScore={effectiveMaxScore}
                scorePct={scorePct}
                grossCorrectMarks={grossCorrectMarks}
                negativePenaltyMarks={negativePenaltyMarks}
                netAlterationMarks={netAlterationMarks}
                avgTimePerQ={avgTimePerQ}
                cutoffVerdict={cutoffVerdict}
                topTakeaways={topTakeaways}
                onSelectFilter={handleApplyTakeawayFilter}
                formatReviewNumber={formatReviewNumber}
              />
            </div>

            {/* 2. Visual Question Palette (1..N grid with accordion for question details on click) */}
            <div
              className={`${
                activeMobileView === "review" ? "block" : "hidden lg:block"
              }`}
            >
              <QuestionPalette
                questions={questionList}
                activeQuestionNo={activeQuestionNo}
                onSelectQuestion={jumpToQuestion}
                isAssessmentQuestion={isAssessmentQuestion}
                isClozeQuestion={isClozeQuestion}
                markdownQuestions={markdownQuestions}
                onSaveQuestionNote={handleSaveQuestionNote}
                onJumpToNextMistake={handleJumpToNextMistake}
                hasNextMistake={incorrectQuestionsList.length > 0}
                incorrectMarksPerQ={attempt.incorrectMarks || 0.667}
                getFullMarks={getFullMarks}
                filteredQuestionNos={filteredQuestionNosSet}
                hasActiveFilters={hasActiveFilters}
              />
            </div>

            {/* 3. General Strategy Reflections */}
            <div
              className={`${
                activeMobileView === "score" ? "block" : "hidden lg:block"
              }`}
            >
              <GeneralNotesCard
                initialNotes={attempt.generalNotes}
                onSaveNotes={handleSaveGeneralNote}
              />
            </div>
          </aside>
        </div>
      </main>

      {/* Solution Key Modal */}
      <DetailedSolutionModal
        isOpen={solutionModalOpen}
        onClose={() => setSolutionModalOpen(false)}
        pdfUrl={matchedPaper?.exsUrl}
        paperTitle={`${displayPaperTitle} - Official Solution Key`}
      />

      {/* Scanned Booklet Modal */}
      <DetailedSolutionModal
        isOpen={submissionModalOpen}
        onClose={() => setSubmissionModalOpen(false)}
        pdfUrl={attempt.userSubmissionPdfUrl}
        paperTitle={`${displayPaperTitle} - Handwritten Answer Copy`}
      />
    </div>
  );
}

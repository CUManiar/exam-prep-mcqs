"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Attempt, QuestionPaper, SubjectiveAssessment } from "../../lib/types";
import { useReviewData } from "./useReviewData";
import { ReviewHeader } from "./ReviewHeader";
import { ReviewScoreHero } from "./ReviewScoreHero";
import { QuestionFilterBar } from "./QuestionFilterBar";
import { QuestionPalette } from "./QuestionPalette";
import { QuestionListSidebar } from "./QuestionListSidebar";
import { QuestionInspector } from "./QuestionInspector";
import { PaperPreviewPanel } from "./PaperPreviewPanel";
import { GeneralNotesCard } from "./GeneralNotesCard";
import { DetailedSolutionModal } from "../DetailedSolutionModal";
import { useApp } from "../../context/AppContext";
import { FilterTabType, SortOptionType } from "./reviewTypes";
import { SUBJECTIVE_ASSESSMENT_META } from "../../lib/defaults";
import { Columns, ListFilter, Eye } from "lucide-react";

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

  // 2. View State
  const [filterTab, setFilterTab] = useState<FilterTabType>("all");
  const [sortOption, setSortOption] = useState<SortOptionType>("qno_asc");
  const [activeQuestionNo, setActiveQuestionNo] = useState<number>(1);
  const [showPaperSplit, setShowPaperSplit] = useState<boolean>(false);
  const [activeMobileView, setActiveMobileView] = useState<"inspector" | "list" | "paper">(
    "inspector",
  );

  // Modals
  const [solutionModalOpen, setSolutionModalOpen] = useState(false);
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);

  // Filtered questions
  const filteredQuestions = useMemo(
    () => getFilteredQuestions(filterTab, sortOption),
    [getFilteredQuestions, filterTab, sortOption],
  );

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
    setActiveMobileView("inspector");
    // Scroll list into view if available
    const el = document.getElementById(`sidebar-q-${qNo}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
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
      {/* 1. Header Bar */}
      <ReviewHeader
        attempt={attempt}
        displayPaperTitle={displayPaperTitle}
        matchedPaper={matchedPaper}
        paperDeleted={!matchedPaper}
        canPreviewPaper={canPreviewPaper}
        showPaperSplit={showPaperSplit}
        onTogglePaperSplit={() => {
          setShowPaperSplit(!showPaperSplit);
          setActiveMobileView((prev) => (prev === "paper" ? "inspector" : "paper"));
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

      {/* 2. Main Container */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-6 flex-1">
        {/* Executive Score Hero Banner */}
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
          onSelectFilter={(tab) => {
            setFilterTab(tab);
            setActiveMobileView("list");
          }}
          formatReviewNumber={formatReviewNumber}
        />

        {/* Unified Filter Controls & Question Palette */}
        <div className="space-y-3">
          <QuestionFilterBar
            currentTab={filterTab}
            onSelectTab={setFilterTab}
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

          <QuestionPalette
            questions={questionList}
            activeQuestionNo={activeQuestionNo}
            onSelectQuestion={jumpToQuestion}
            isAssessmentQuestion={isAssessmentQuestion}
          />
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex xl:hidden rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveMobileView("inspector")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeMobileView === "inspector"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Question Inspector</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMobileView("list")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeMobileView === "list"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>Questions List ({filteredQuestions.length})</span>
          </button>

          {canPreviewPaper && (
            <button
              type="button"
              onClick={() => setActiveMobileView("paper")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeMobileView === "paper"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Paper PDF</span>
            </button>
          )}
        </div>

        {/* 3. The Core Workbench (Desktop 2-pane / Responsive) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Conditional Side Panel: Either Original Paper preview OR Question list */}
          {showPaperSplit && canPreviewPaper ? (
            /* Left: Original Question Paper (PDF / Markdown) */
            <div
              className={`xl:col-span-5 ${
                activeMobileView === "paper" ? "block" : "hidden xl:block"
              }`}
            >
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
                  setActiveMobileView("inspector");
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
            /* Left: Filtered Question List Navigator */
            <div
              className={`xl:col-span-4 ${
                activeMobileView === "list" ? "block" : "hidden xl:block"
              }`}
            >
              <QuestionListSidebar
                questions={filteredQuestions}
                activeQuestionNo={activeQuestionNo}
                onSelectQuestion={jumpToQuestion}
                isAssessmentQuestion={isAssessmentQuestion}
                isClozeQuestion={isClozeQuestion}
                markdownQuestions={markdownQuestions}
              />
            </div>
          )}

          {/* Right: The Question Inspector (Always visible on desktop, tabbed on mobile) */}
          <div
            className={`${
              showPaperSplit && canPreviewPaper ? "xl:col-span-7" : "xl:col-span-8"
            } ${activeMobileView === "inspector" ? "block" : "hidden xl:block"}`}
          >
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
            />
          </div>
        </div>

        {/* 4. Strategy & General Notes Section */}
        <GeneralNotesCard
          initialNotes={attempt.generalNotes}
          onSaveNotes={handleSaveGeneralNote}
        />
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

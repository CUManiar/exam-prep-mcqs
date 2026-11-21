"use client";

import { useState, useEffect } from "react";
import {
  QuestionAnswer,
  ParsedQuestion,
  SubjectiveAssessment,
} from "../../lib/types";
import { MatchingItemsTable } from "../MatchingItemsTable";
import { SubjectiveAssessmentWidget } from "./SubjectiveAssessmentWidget";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Lightbulb,
  Edit3,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Bookmark,
  ArrowRight,
  Eye,
  History,
  Sparkles,
  MessageSquare,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { HtmlExplanation } from "../HtmlExplanation";

interface QuestionInspectorProps {
  question: QuestionAnswer;
  parsedQuestion?: ParsedQuestion;
  totalQuestions: number;
  isAssessmentQuestion: (qNo: number) => boolean;
  isClozeQuestion: (qNo: number) => boolean;
  getFullMarks: (qNo: number) => number;
  incorrectMarksPerQ: number;
  onSaveQuestionNote: (qNo: number, note: string) => void;
  onSaveEvaluationComment?: (qNo: number, comment: string) => void;
  onSetSubjectiveAssessment: (
    qNo: number,
    assessment: SubjectiveAssessment,
    marks?: number,
  ) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onJumpToNextMistake?: () => void;
  onJumpToNextSkipped?: () => void;
  hasNextMistake?: boolean;
  hasNextSkipped?: boolean;
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
  onSaveEvaluationComment,
  onSetSubjectiveAssessment,
  onNavigatePrev,
  onNavigateNext,
  onJumpToNextMistake,
  onJumpToNextSkipped,
  hasNextMistake,
  hasNextSkipped,
  canPreviewPaper,
  showPaperSplit,
  onTogglePaperSplit,
}: QuestionInspectorProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(question.note || "");

  const [isEditingEvalComment, setIsEditingEvalComment] = useState(false);
  const [evalCommentText, setEvalCommentText] = useState(
    question.evaluationComment || "",
  );
  const [isGeneratingEval, setIsGeneratingEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [isExplanationExpanded, setIsExplanationExpanded] = useState(false);

  useEffect(() => {
    setNoteText(question.note || "");
    setIsEditingNote(false);
    setEvalCommentText(question.evaluationComment || "");
    setIsEditingEvalComment(false);
    setEvalError(null);
    setIsExplanationExpanded(false);
  }, [question.questionNo, question.note, question.evaluationComment]);

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
  const rawExpected = (
    parsedQuestion?.answer ||
    question.correctAnswer ||
    ""
  ).trim();
  const expectedAnswer = isCloze
    ? rawExpected
    : rawExpected.replace(/[\(\)\[\]\.\s]/g, "").toUpperCase();
  const rawCandidate = (question.selected || "").trim();
  const candidateAnswer = isCloze
    ? rawCandidate
    : rawCandidate.replace(/[\(\)\[\]\.\s]/g, "").toUpperCase();
  const officialExplanation =
    parsedQuestion?.explanation || question.explanation;

  const isExplanationLong = Boolean(
    officialExplanation &&
      (officialExplanation.length > 320 ||
        officialExplanation.includes("\n\n") ||
        officialExplanation.includes("<table") ||
        officialExplanation.includes("<ul>") ||
        officialExplanation.includes("<ol>")),
  );

  let displayClozeAnswer = rawExpected;
  if (isCloze && !displayClozeAnswer && officialExplanation) {
    const exp = officialExplanation.trim();
    const ansMatch = exp.match(
      /^(?:Answer|Ans|Key|Reference|Correct\s*Answer)\s*[:\-]\s*([^\n\.]+)/i,
    );
    if (ansMatch) {
      displayClozeAnswer = ansMatch[1].trim();
    } else if (!exp.includes("\n") && exp.length <= 120) {
      displayClozeAnswer = exp;
    }
  }

  const handleSaveNote = () => {
    onSaveQuestionNote(qNo, noteText);
    setIsEditingNote(false);
  };

  const handleCancelNote = () => {
    setNoteText(question.note || "");
    setIsEditingNote(false);
  };

  const handleSaveEvalComment = () => {
    onSaveEvaluationComment?.(qNo, evalCommentText.trim());
    setIsEditingEvalComment(false);
  };

  const handleCancelEvalComment = () => {
    setEvalCommentText(question.evaluationComment || "");
    setIsEditingEvalComment(false);
  };

  const handleGenerateAiEvaluation = async () => {
    setIsGeneratingEval(true);
    setEvalError(null);
    try {
      const { getRevisionConfig } = await import("../../lib/revisionAi");
      const providerConfig = getRevisionConfig();

      const res = await fetch("/api/attempts/evaluate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: {
            questionNo: qNo,
            questionText: parsedQuestion?.text || `Question ${qNo}`,
            options: parsedQuestion?.options,
            correctAnswer: expectedAnswer,
            explanation: officialExplanation,
            selectedAnswer: question.selected,
            isCorrect: question.isCorrect,
            scratchpadNote: question.note,
            timeSpentSeconds: question.timeSpentSeconds,
            confidence: question.confidence,
          },
          providerConfig,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to evaluate question attempt.");
      }

      const generatedComment = String(data.comment || "").trim();
      onSaveEvaluationComment?.(qNo, generatedComment);
      setEvalCommentText(generatedComment);
      setIsEditingEvalComment(false);
    } catch (err: any) {
      setEvalError(err?.message || "Failed to generate evaluation feedback.");
    } finally {
      setIsGeneratingEval(false);
    }
  };

  const hasParsedOptions = Boolean(
    parsedQuestion?.options && Object.keys(parsedQuestion.options).length > 0,
  );

  return (
    <div
      className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden flex flex-col flex-1 min-h-0 touch-pan-y"
      style={{ touchAction: "pan-y" }}
    >
      {/* 1. Header Bar: Q.No, Outcome, Marks, Time, Confidence */}
      <div className="border-b border-slate-200/90 bg-slate-50/70 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
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
              Partial (+
              {(question.subjectiveMarks ?? fullMarks * 0.5).toFixed(1)} pts)
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

          {/* Compact altered indicator */}
          {!isCloze && Boolean(question.changesCount && question.changesCount > 0) && (
            <span
              className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-1 rounded-lg border ${
                isCorrect
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
              title={`Selection altered ${question.changesCount} time(s): ${
                question.answerHistory?.length
                  ? `${question.answerHistory.join(" → ")} → ${question.selected || ""}`
                  : ""
              }`}
            >
              <RotateCcw className="h-3 w-3" />
              <span>{question.changesCount}x altered</span>
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
      <div className="p-4 sm:p-6 space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {/* 3-Tier Topic Hierarchy, PYQ Year & Word Limit Badge */}
        {(parsedQuestion?.subject ||
          question.subject ||
          parsedQuestion?.chapter ||
          question.chapter ||
          parsedQuestion?.topic ||
          question.topic ||
          parsedQuestion?.previousYears ||
          question.previousYears ||
          parsedQuestion?.wordLimit) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 pb-1 border-b border-slate-100">
            {(parsedQuestion?.previousYears || question.previousYears) && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 font-bold text-amber-800 shadow-2xs">
                <History className="h-3 w-3 text-amber-600" />
                PYQ: {parsedQuestion?.previousYears || question.previousYears}
              </span>
            )}
            {(parsedQuestion?.subject || question.subject) && (
              <span className="inline-flex items-center rounded-md bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 font-semibold text-indigo-700">
                {parsedQuestion?.subject || question.subject}
              </span>
            )}
            {(parsedQuestion?.chapter || question.chapter) && (
              <>
                <span className="text-slate-400">›</span>
                <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-slate-700 font-medium">
                  {parsedQuestion?.chapter || question.chapter}
                </span>
              </>
            )}
            {(parsedQuestion?.topic || question.topic) && (
              <>
                <span className="text-slate-400">›</span>
                <span className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-slate-600">
                  {parsedQuestion?.topic || question.topic}
                </span>
              </>
            )}
            {parsedQuestion?.wordLimit && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 font-mono font-semibold text-amber-800">
                <FileText className="h-3 w-3 text-amber-600" />
                {parsedQuestion.wordLimit} words
              </span>
            )}
          </div>
        )}

        {/* Question Text */}
        <div className="space-y-3">
          {parsedQuestion?.text ? (
            <div className="text-sm sm:text-base text-slate-900 font-medium leading-relaxed whitespace-pre-wrap select-text">
              {parsedQuestion.text}
            </div>
          ) : !showPaperSplit ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs text-slate-600 flex items-center justify-between gap-2.5">
              <span>
                Question {qNo} statement text is in the original Question Paper
                PDF.
              </span>
              {canPreviewPaper && onTogglePaperSplit && (
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
          ) : null}

          {/* Matching Items Table (if present) */}
          {Boolean(
            parsedQuestion?.matchingItems &&
            parsedQuestion.matchingItems.length > 0,
          ) && (
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
                  {displayClozeAnswer || "Refer to Solution Key"}
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
          /* PDF Papers / Questions without Parsed Markdown Options - Clean, Compact Answer Status Strip */
          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Answer Evaluation & Key
              </span>
              <div className="text-xs font-semibold">
                {isCorrect ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />+
                    {fullMarks.toFixed(2)} pts awarded
                  </span>
                ) : isWrong ? (
                  <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />-
                    {incorrectMarksPerQ.toFixed(2)} penalty
                  </span>
                ) : (
                  <span className="text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    Skipped · 0 pts
                  </span>
                )}
              </div>
            </div>

            {/* Crisp 2-Card Marked vs Official Key Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Candidate Selection */}
              <div
                className={`rounded-xl border p-2.5 sm:p-3 flex items-center justify-between gap-2 transition-all ${
                  isCorrect
                    ? "border-emerald-300 bg-emerald-50/70 text-emerald-950"
                    : isWrong
                      ? "border-rose-300 bg-rose-50/70 text-rose-950"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Your Answer
                  </span>
                  <span className="font-mono text-sm sm:text-base font-black truncate mt-0.5">
                    {candidateAnswer
                      ? `Option ${candidateAnswer}`
                      : "Unattempted"}
                  </span>
                </div>
                <span
                  className={`h-7 w-7 rounded-lg flex items-center justify-center font-mono font-black text-sm shrink-0 border ${
                    isCorrect
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : isWrong
                        ? "bg-rose-600 text-white border-rose-700"
                        : "bg-slate-200 text-slate-500 border-slate-300"
                  }`}
                >
                  {candidateAnswer || "—"}
                </span>
              </div>

              {/* Official Key */}
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-2.5 sm:p-3 flex items-center justify-between gap-2 text-emerald-950">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                    Official Key
                  </span>
                  <span className="font-mono text-sm sm:text-base font-black truncate mt-0.5 text-emerald-900">
                    {expectedAnswer
                      ? `Option ${expectedAnswer}`
                      : "Refer below"}
                  </span>
                </div>
                <span className="h-7 w-7 rounded-lg flex items-center justify-center font-mono font-black text-sm shrink-0 bg-emerald-600 text-white border border-emerald-700">
                  {expectedAnswer || "✓"}
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

        {/* 4b. Evaluator / AI Attempt Assessment & Feedback */}
        {isEditingEvalComment ? (
          <div className="rounded-xl border border-indigo-300 bg-indigo-50/70 p-3.5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5 text-indigo-700" />
                Edit Evaluator / Mentor Feedback Note
              </span>
            </div>
            <textarea
              value={evalCommentText}
              onChange={(e) => setEvalCommentText(e.target.value)}
              placeholder="Mentor comments on student's attempt, scratchpad reasoning, arithmetic blunders, or elimination traps..."
              rows={3}
              className="w-full rounded-lg border border-indigo-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEvalComment}
                className="px-2.5 py-1 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEvalComment}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs cursor-pointer"
              >
                <Check className="h-3 w-3" />
                Save Feedback
              </button>
            </div>
          </div>
        ) : question.evaluationComment && question.evaluationComment.trim() ? (
          <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/70 p-3.5 shadow-2xs space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <Sparkles className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-900 leading-relaxed whitespace-pre-wrap break-words">
                  <div className="flex items-center gap-2 mb-1">
                    <strong className="text-indigo-950 font-bold text-[10px] uppercase tracking-wider">
                      Evaluator & AI Attempt Feedback
                    </strong>
                    {question.evaluationSource && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {question.evaluationSource === "mcp"
                          ? "MCP Mentor"
                          : question.evaluationSource === "ai"
                            ? "AI Evaluator"
                            : "Examiner Note"}
                      </span>
                    )}
                  </div>
                  {question.evaluationComment}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleGenerateAiEvaluation}
                  disabled={isGeneratingEval}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-white hover:bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Re-run AI evaluation for this question attempt"
                >
                  {isGeneratingEval ? (
                    <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                  ) : (
                    <Sparkles className="h-3 w-3 text-indigo-600" />
                  )}
                  <span>Re-evaluate</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEvalCommentText(question.evaluationComment || "");
                    setIsEditingEvalComment(true);
                  }}
                  className="text-xs font-semibold text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-2.5 py-1 rounded-lg border border-indigo-200 shrink-0 transition-colors cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
            {evalError && (
              <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                <span>{evalError}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-0.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateAiEvaluation}
              disabled={isGeneratingEval}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200 px-3 py-1 rounded-lg transition-colors font-semibold shadow-2xs cursor-pointer disabled:opacity-60"
            >
              {isGeneratingEval ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              )}
              <span>
                {isGeneratingEval
                  ? "Evaluating attempt & scratchpad..."
                  : "AI Evaluate Attempt"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEvalCommentText("");
                setIsEditingEvalComment(true);
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors font-medium cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
              <span>+ Add evaluator comment</span>
            </button>
            {evalError && (
              <span className="text-[11px] text-rose-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {evalError}
              </span>
            )}
          </div>
        )}

        {/* 5. Official Solution & Conceptual Breakdown */}
        {officialExplanation && (
          <div className="rounded-xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 p-4 sm:p-5 shadow-2xs space-y-2.5 transition-all">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                <Lightbulb className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Official Explanation & Solution</span>
              </div>
              {isExplanationLong && (
                <button
                  type="button"
                  onClick={() => setIsExplanationExpanded(!isExplanationExpanded)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50/80 px-2 py-0.5 rounded-lg border border-indigo-200 shadow-2xs cursor-pointer transition-colors"
                >
                  <span>{isExplanationExpanded ? "Collapse" : "Expand"}</span>
                  {isExplanationExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
            <div
              className={
                isExplanationLong && !isExplanationExpanded
                  ? "relative max-h-40 overflow-hidden"
                  : ""
              }
            >
              <HtmlExplanation
                text={officialExplanation}
                className="text-xs sm:text-sm text-slate-800 leading-relaxed"
              />
              {isExplanationLong && !isExplanationExpanded && (
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-50 via-slate-50/85 to-transparent flex items-end justify-center pb-0.5">
                  <button
                    type="button"
                    onClick={() => setIsExplanationExpanded(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-white/95 hover:bg-white px-3 py-1 rounded-full border border-indigo-200 shadow-xs cursor-pointer transition-all"
                  >
                    <span>Read Full Solution</span>
                    <ChevronDown className="h-3.5 w-3.5 text-indigo-600" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Navigation Bar (Footer) */}
      <div className="border-t border-slate-200/90 bg-white p-3.5 sm:px-6 flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          disabled={qNo <= 1}
          onClick={onNavigatePrev}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        {/* Quick Jump Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
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

          {hasNextSkipped && onJumpToNextSkipped && (
            <button
              type="button"
              onClick={onJumpToNextSkipped}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Fast forward to next unattempted / skipped question"
            >
              <span>Next Skipped</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
            </button>
          )}
        </div>

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

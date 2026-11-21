"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  BookOpen,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
  Play,
  RotateCcw,
  Layers,
} from "lucide-react";
import { SyllabusItem, QuestionPaper, ParsedQuestion } from "../../lib/types";
import {
  findQuestionsForSyllabusTopic,
  IndexedQuestionMatch,
} from "../../lib/syllabusQuestionIndex";
import { useApp } from "../../context/AppContext";
import { saveCustomPaper } from "../../lib/storage";

interface SyllabusMatchingQuestionsModalProps {
  topic: SyllabusItem;
  papers: QuestionPaper[];
  onClose: () => void;
  onNavigatePaper?: (paperId: string) => void;
}

export function SyllabusMatchingQuestionsModal({
  topic,
  papers,
  onClose,
  onNavigatePaper,
}: SyllabusMatchingQuestionsModalProps) {
  const { handleStartExam } = useApp();

  // Selected option per question for interactive practice: question index -> selected option key ('A', 'B', etc.)
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>(
    {},
  );
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(
    new Set(),
  );

  // Lazily compute indexed matching questions (O(1) index, max 20 questions)
  const matchingQuestions = useMemo(() => {
    return findQuestionsForSyllabusTopic(topic.title, papers, 20);
  }, [topic.title, papers]);

  const handleSelectOption = (index: number, optionKey: string) => {
    // Record selection and automatically reveal answer & solution
    setSelectedOptions((prev) => ({ ...prev, [index]: optionKey }));
    setRevealedAnswers((prev) => new Set(prev).add(index));
  };

  const handleReattempt = (index: number) => {
    setSelectedOptions((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setRevealedAnswers((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const toggleRevealAnswer = (index: number) => {
    setRevealedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Launch a full dedicated exam practice session for these questions
  const handleStartPracticeSession = () => {
    if (matchingQuestions.length === 0) return;

    const paperId = `topic-practice-${topic.id}-${Date.now().toString(36)}`;
    const answerKey: Record<number, string> = {};
    const explanations: Record<number, string> = {};
    const parsedQuestions: ParsedQuestion[] = [];
    const markdownLines: string[] = [
      `# [Topic Practice] ${topic.title}`,
      `Subject: ${matchingQuestions[0]?.paperSubject || "General Studies"} | Mode: Targeted Topic Practice`,
      "",
      "---",
      "",
    ];

    matchingQuestions.forEach((q, idx) => {
      const qNo = idx + 1;
      if (q.correctAnswer) {
        answerKey[qNo] = q.correctAnswer;
      }
      if (q.explanation) {
        explanations[qNo] = q.explanation;
      }

      const pq: ParsedQuestion = {
        questionNo: qNo,
        text: q.text,
        options: q.options || {},
        answer: q.correctAnswer,
        explanation: q.explanation,
        topic: topic.title,
        previousYears: q.previousYears,
      };
      parsedQuestions.push(pq);

      markdownLines.push(`### Question ${qNo}`);
      if (q.previousYears) {
        markdownLines.push(`[Year: ${q.previousYears}]`);
      }
      markdownLines.push("");
      markdownLines.push(q.text);
      markdownLines.push("");
      if (q.options && Object.keys(q.options).length > 0) {
        Object.entries(q.options).forEach(([k, v]) => {
          markdownLines.push(`- (${k}) ${v}`);
        });
        markdownLines.push("");
      }
      if (q.correctAnswer) {
        markdownLines.push(`**Answer:** ${q.correctAnswer}`);
      }
      if (q.explanation) {
        markdownLines.push(`**Explanation:** ${q.explanation}`);
      }
      markdownLines.push("");
      markdownLines.push("---");
      markdownLines.push("");
    });

    const timeMinutes = Math.max(5, Math.ceil(matchingQuestions.length * 1.5));
    const topicPracticePaper: QuestionPaper = {
      id: paperId,
      label: `[Topic] ${topic.title}`,
      title: `Targeted Practice • ${topic.title}`,
      year: new Date().getFullYear().toString(),
      category: "prelims",
      examType: "objective",
      subject: matchingQuestions[0]?.paperSubject || "General Studies",
      totalQuestions: matchingQuestions.length,
      totalMarks: Math.round(matchingQuestions.length * 2.0 * 10) / 10,
      timeMinutes,
      correctMarks: 2.0,
      incorrectMarks: 0.667,
      qpUrl: `local://${paperId}`,
      answerKey,
      explanations,
      parsedQuestions,
      markdownContent: markdownLines.join("\n"),
      isCustom: true,
    };

    saveCustomPaper(topicPracticePaper);
    onClose();
    handleStartExam(topicPracticePaper, "practice");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 shrink-0 gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <BookOpen className="h-3 w-3" />
                Syllabus Topic
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {matchingQuestions.length}{" "}
                {matchingQuestions.length === 1 ? "question" : "questions"} found
              </span>
            </div>
            <h3
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate"
              title={topic.title}
            >
              {topic.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {matchingQuestions.length > 0 && (
              <button
                type="button"
                onClick={handleStartPracticeSession}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                title={`Launch dedicated practice mode for these ${matchingQuestions.length} questions`}
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Practice ({matchingQuestions.length} Qs)</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {matchingQuestions.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
              <Layers className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No matching questions found in current papers
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload mock papers or PYQs covering &ldquo;{topic.title}&rdquo; to
                practice topic-targeted questions here.
              </p>
            </div>
          ) : (
            matchingQuestions.map((q, idx) => {
              const isAnswerRevealed = revealedAnswers.has(idx);
              const userSelected = selectedOptions[idx];
              const hasAttempted = Boolean(userSelected);
              const isUserCorrect =
                hasAttempted &&
                q.correctAnswer &&
                userSelected.trim().toUpperCase() ===
                  q.correctAnswer.trim().toUpperCase();

              // Resolve PYQ year label: either explicit q.previousYears or paperYear
              const pyqYears =
                q.previousYears ||
                (q.paperYear &&
                /^(19\d\d|20[0-2]\d)$/.test(q.paperYear) &&
                q.paperYear !== "2026"
                  ? q.paperYear
                  : undefined);

              const optionKeys = Object.keys(q.options || {}).sort();

              return (
                <div
                  key={`${q.paperId}-${q.questionNo}-${idx}`}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all p-4 space-y-3 shadow-2xs"
                >
                  {/* Top Metadata */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md font-mono text-[11px]">
                        Q{q.questionNo}
                      </span>

                      {/* Prominent PYQ Badge */}
                      {pyqYears && (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] text-amber-900 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded-md shadow-2xs">
                          PYQ {pyqYears}
                        </span>
                      )}

                      <span
                        className="font-semibold text-indigo-700 dark:text-indigo-400 truncate max-w-[200px] sm:max-w-[320px]"
                        title={q.paperTitle}
                      >
                        {q.paperTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasAttempted && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isUserCorrect
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300"
                              : "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300"
                          }`}
                        >
                          {isUserCorrect ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Correct (+2)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 text-rose-600" />
                              <span>Incorrect (-0.67)</span>
                            </>
                          )}
                        </span>
                      )}

                      {onNavigatePaper && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigatePaper(q.paperId);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                          title="View full paper in Papers vault"
                        >
                          <span>Open Paper</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Stem */}
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">
                    {q.text}
                  </p>

                  {/* Options (Interactive Practice: Click to Answer!) */}
                  {optionKeys.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {optionKeys.map((key) => {
                        const isSelected = userSelected === key;
                        const isCorrectOption =
                          q.correctAnswer &&
                          q.correctAnswer.trim().toUpperCase() ===
                            key.toUpperCase();

                        let optionStyle =
                          "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30";

                        if (hasAttempted) {
                          if (isSelected) {
                            if (isCorrectOption) {
                              optionStyle =
                                "bg-emerald-600 border-emerald-600 text-white font-bold ring-2 ring-emerald-300";
                            } else {
                              optionStyle =
                                "bg-rose-600 border-rose-600 text-white font-bold ring-2 ring-rose-300";
                            }
                          } else if (isCorrectOption) {
                            optionStyle =
                              "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold";
                          }
                        } else if (isAnswerRevealed && isCorrectOption) {
                          optionStyle =
                            "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-900 dark:text-emerald-200 font-semibold";
                        }

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleSelectOption(idx, key)}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${optionStyle}`}
                          >
                            <span
                              className={`font-bold font-mono uppercase shrink-0 px-1.5 py-0.5 rounded ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "text-slate-500 bg-slate-200/60 dark:bg-slate-700"
                              }`}
                            >
                              ({key})
                            </span>
                            <span className="leading-snug flex-1">
                              {q.options[key]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions Bar: Re-attempt & Reveal Answer */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleRevealAnswer(idx)}
                      className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>
                        {isAnswerRevealed
                          ? "Hide Solution"
                          : "Reveal Answer & Notes"}
                      </span>
                    </button>

                    {hasAttempted && (
                      <button
                        type="button"
                        onClick={() => handleReattempt(idx)}
                        className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                        title="Reset your answer to re-attempt this question"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Re-attempt question</span>
                      </button>
                    )}
                  </div>

                  {/* Solution & Explanation Disclosure */}
                  {isAnswerRevealed && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 space-y-1.5 text-xs animate-in fade-in duration-150">
                      <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          Official Answer: ({q.correctAnswer || "Not specified"})
                        </span>
                      </div>
                      {q.explanation && (
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-[11px] pt-1">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 flex items-center justify-between text-xs text-slate-500 shrink-0 gap-3">
          <span className="hidden sm:inline">
            Targeted practice powered by syllabus inverted indexing.
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            {matchingQuestions.length > 0 && (
              <button
                type="button"
                onClick={handleStartPracticeSession}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Practice in Exam Simulator ({matchingQuestions.length} Qs)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

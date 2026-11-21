import { QuestionPaper, QuestionAnswer, ParsedQuestion } from "./types";

export interface CreateMistakePaperOptions {
  includeSkipped?: boolean;
}

/**
 * Creates a focused virtual re-test paper containing only questions
 * where the candidate made mistakes (or skipped), re-indexed from 1 to N.
 */
export function createMistakeReTestPaper(
  originalPaper: QuestionPaper,
  incorrectAnswers: QuestionAnswer[],
  _options?: CreateMistakePaperOptions,
): QuestionPaper {
  const count = incorrectAnswers.length;
  const filteredAnswerKey: Record<number, string> = {};
  const filteredExplanations: Record<number, string> = {};
  const remappedParsedQuestions: ParsedQuestion[] = [];

  const markdownLines: string[] = [
    `# [Re-Test] Mistakes: ${originalPaper.label}`,
    `Subject: ${originalPaper.subject} | Mode: Targeted Re-Test`,
    "",
    "---",
    "",
  ];

  incorrectAnswers.forEach((ans, index) => {
    const newQNo = index + 1;
    const origQNo = ans.questionNo;

    const correctAns =
      ans.correctAnswer || originalPaper.answerKey?.[origQNo] || "";
    const expl =
      ans.explanation || originalPaper.explanations?.[origQNo] || "";

    if (correctAns) {
      filteredAnswerKey[newQNo] = correctAns;
    }
    if (expl) {
      filteredExplanations[newQNo] = expl;
    }

    const origPq = originalPaper.parsedQuestions?.find(
      (pq) => pq.questionNo === origQNo,
    );

    if (origPq) {
      const remapped: ParsedQuestion = {
        ...origPq,
        questionNo: newQNo,
        topic: origPq.topic
          ? `${origPq.topic} (from original Q${origQNo})`
          : `Original Question ${origQNo}`,
        answer: correctAns || origPq.answer,
        explanation: expl || origPq.explanation,
      };
      remappedParsedQuestions.push(remapped);

      markdownLines.push(`### Question ${newQNo}`);
      markdownLines.push(`*Original Paper Question ${origQNo}*`);
      markdownLines.push("");
      markdownLines.push(origPq.text);
      markdownLines.push("");
      if (origPq.options && Object.keys(origPq.options).length > 0) {
        Object.entries(origPq.options).forEach(([optKey, optVal]) => {
          markdownLines.push(`- (${optKey}) ${optVal}`);
        });
        markdownLines.push("");
      }
      if (correctAns) {
        markdownLines.push(`**Answer:** ${correctAns}`);
      }
      if (expl) {
        markdownLines.push(`**Explanation:** ${expl}`);
      }
      markdownLines.push("");
      markdownLines.push("---");
      markdownLines.push("");
    }
  });

  const minutesPerQ =
    originalPaper.totalQuestions > 0
      ? originalPaper.timeMinutes / originalPaper.totalQuestions
      : 1.2;
  const timeMinutes = Math.max(5, Math.ceil(count * minutesPerQ));
  const correctMarks = originalPaper.correctMarks || 2.0;
  const incorrectMarks = originalPaper.incorrectMarks || 0.667;

  const sanitizedId = originalPaper.id.replace(/[^a-zA-Z0-9_-]/g, "");
  const paperId = `retest-${sanitizedId}-${Date.now().toString(36)}`;

  return {
    ...originalPaper,
    id: paperId,
    label: `[Re-Test] Mistakes: ${originalPaper.label}`,
    title: `Targeted Mistake Re-Test • ${originalPaper.label}`,
    totalQuestions: count,
    totalMarks: Math.round(count * correctMarks * 10) / 10,
    timeMinutes,
    correctMarks,
    incorrectMarks,
    answerKey: filteredAnswerKey,
    explanations: filteredExplanations,
    parsedQuestions:
      remappedParsedQuestions.length > 0
        ? remappedParsedQuestions
        : undefined,
    markdownContent:
      remappedParsedQuestions.length > 0
        ? markdownLines.join("\n")
        : originalPaper.markdownContent,
    isCustom: true,
  };
}

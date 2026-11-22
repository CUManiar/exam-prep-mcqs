import { RevisionContext } from "./types";

/**
 * Placeholder dynamic performance reporter, ready for Commit 4 mistake profiler.
 */
export function generatePaperPerformanceReport(
  context: RevisionContext,
): string {
  const summary = context.attemptSummary;
  const paperTitle = context.paperTitle || "Question Paper";

  if (!summary) {
    return `### 📊 Performance Summary: ${paperTitle}\n\nNo attempt recorded yet for this paper.`;
  }

  return `### 📊 Diagnostic Performance Dossier: ${paperTitle}
- **Score**: ${summary.score} / ${summary.totalMarks}
- **Accuracy**: ${summary.accuracy}%
- **Correct**: ${summary.correctCount} | **Incorrect**: ${summary.incorrectCount} | **Unattempted**: ${summary.unansweredCount}`;
}

export function generateQuestionDissection(context: RevisionContext): string {
  const q = context.question;
  if (!q) return "";
  return `### 🏛️ Question #${q.questionNo} Analysis\n\n${q.text}`;
}

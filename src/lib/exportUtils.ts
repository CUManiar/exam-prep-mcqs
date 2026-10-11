import { Attempt } from './types';
import { formatDateTime, formatTimeSeconds } from './defaults';

/**
 * Generates a clean, comprehensive Markdown / Plaintext report for a single attempt.
 */
export function generateAttemptReportMarkdown(attempt: Attempt): string {
  const grossMarks = ((attempt.correct || 0) * (attempt.correctMarks || 2)).toFixed(2);
  const penaltyMarks = ((attempt.incorrect || 0) * (attempt.incorrectMarks || 0.667)).toFixed(2);
  const avgPace = attempt.avgTimePerQuestion || 
    (attempt.answered > 0 ? Math.round(attempt.durationSeconds / attempt.answered) : 0);
  const scorePct = attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 1000) / 10 : 0;

  const lines: string[] = [
    `# UPSC Civil Services Examination - Performance Report`,
    ``,
    `**Paper:** ${attempt.paperLabel}`,
    `**Category:** ${attempt.category.toUpperCase()} (${attempt.examType.toUpperCase()})`,
    `**Date & Time:** ${formatDateTime(attempt.startedAt)}`,
    `**Exam Mode:** ${attempt.mode === 'mock' ? 'Official Timed Mock' : 'Untimed Practice Session'}`,
    `**Total Duration:** ${formatTimeSeconds(attempt.durationSeconds)}${attempt.overtimeSeconds ? ` (+${formatTimeSeconds(attempt.overtimeSeconds)} overtime)` : ''}`,
    `**Attempt ID:** \`${attempt.id}\``,
    ``,
    `---`,
    ``,
    `## 📊 Performance & Scoring Summary`,
    ``,
    `| Metric | Result | Details |`,
    `| :--- | :--- | :--- |`,
    `| **Final Net Score** | **${attempt.score} / ${attempt.maxScore}** | ${scorePct}% of total marks |`,
    `| **Accuracy** | **${attempt.accuracyPct}%** | ${attempt.correct} correct out of ${attempt.answered} attempted |`,
    `| **Gross Marks (+)** | +${grossMarks} | ${attempt.correct} correct × ${attempt.correctMarks} marks |`,
    `| **Negative Penalty (-)** | -${penaltyMarks} | ${attempt.incorrect} incorrect × ${attempt.incorrectMarks} marks |`,
    `| **Total Questions** | ${attempt.totalQuestions} | Paper standard length |`,
    `| **Attempted** | ${attempt.answered} | ${Math.round((attempt.answered / (attempt.totalQuestions || 1)) * 100)}% question coverage |`,
    `| **Skipped / Unattempted** | ${attempt.unattempted} | 0 negative penalty incurred |`,
    `| **Average Pace** | ${avgPace}s / question | Pure active question pace |`,
    `| **Active Question Solving Time** | ${formatTimeSeconds(Math.max(0, attempt.durationSeconds - (attempt.idleTimeSeconds || 0)))} | Direct question investment |`,
    `| **Instructions & Overview Time** | ${formatTimeSeconds(attempt.idleTimeSeconds || 0)} | Reading cover & paper overview buffer |`,
    `| **Pace on Correct Answers** | ${attempt.avgTimeCorrect || 0}s avg | Speed on accurate decisions |`,
    `| **Pace on Incorrect Answers** | ${attempt.avgTimeIncorrect || 0}s avg | Time invested in erroneous choices |`,
    ``,
    `---`,
    ``,
    `## 🧠 Decision & Answer Alteration Nuances`,
    ``,
    `- **Total Answer Changes:** ${attempt.alteredCount || 0}`,
    `- **Harmful Alterations (Changed from Right → Wrong):** ${attempt.alteredHarmCount || 0}`,
    `- **Beneficial Alterations (Changed from Wrong → Right):** ${attempt.alteredBenefitCount || 0}`,
    ``,
  ];

  if (attempt.generalNotes && attempt.generalNotes.trim()) {
    lines.push(
      `---`,
      ``,
      `## 📝 Candidate Reflection & Notes`,
      ``,
      attempt.generalNotes.trim(),
      ``
    );
  }

  lines.push(
    `---`,
    ``,
    `## 📋 Detailed Question-by-Question Response Sheet`,
    ``,
    `| Q# | Your Option | Official Key | Evaluation | Time Spent | Changes | Notes |`,
    `| :---: | :---: | :---: | :---: | :---: | :---: | :--- |`
  );

  for (let qNo = 1; qNo <= attempt.totalQuestions; qNo++) {
    const q = attempt.answers[qNo];
    const selected = q?.selected || '—';
    const key = q?.correctAnswer || '—';
    let status = 'Skipped';
    if (q?.selected) {
      status = q.isCorrect === true ? '✅ Correct' : (q.isCorrect === false ? '❌ Incorrect' : 'Submitted');
    }
    const timeSpent = q?.timeSpentSeconds ? `${q.timeSpentSeconds}s` : '0s';
    const changes = q?.changesCount ? `${q.changesCount}x` : '0';
    const note = q?.note ? q.note.replace(/\|/g, '\\|') : '';

    lines.push(`| ${qNo} | ${selected} | ${key} | ${status} | ${timeSpent} | ${changes} | ${note} |`);
  }

  lines.push(
    ``,
    `---`,
    `*Generated on ${new Date().toLocaleString()} from UPSC Prelims & Mains Exam Preparation System*`
  );

  return lines.join('\n');
}

/**
 * Downloads text/file content to user device
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports a single attempt as a Markdown (.md) report
 */
export function exportAttemptAsMarkdown(attempt: Attempt) {
  const content = generateAttemptReportMarkdown(attempt);
  const safeTitle = attempt.paperLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const filename = `${safeTitle}_attempt_${attempt.id.slice(-6)}.md`;
  downloadFile(content, filename, 'text/markdown;charset=utf-8');
}

/**
 * Exports a single attempt as a JSON (.json) backup file
 */
export function exportAttemptAsJSON(attempt: Attempt) {
  const content = JSON.stringify(attempt, null, 2);
  const safeTitle = attempt.paperLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const filename = `${safeTitle}_attempt_${attempt.id.slice(-6)}.json`;
  downloadFile(content, filename, 'application/json;charset=utf-8');
}

/**
 * Copies a compact formatted summary to clipboard
 */
export async function copyAttemptSummaryToClipboard(attempt: Attempt): Promise<boolean> {
  const text = `🎯 UPSC Mock Result: ${attempt.paperLabel}
Score: ${attempt.score} / ${attempt.maxScore} (${Math.round((attempt.score / (attempt.maxScore || 1)) * 1000) / 10}%)
Accuracy: ${attempt.accuracyPct}% (${attempt.correct} Correct, ${attempt.incorrect} Incorrect, ${attempt.unattempted} Skipped)
Pace: ${attempt.avgTimePerQuestion || 0}s/Q | Duration: ${formatTimeSeconds(attempt.durationSeconds)}
Answer Changes: ${attempt.alteredCount || 0} (${attempt.alteredHarmCount || 0} Harmful, ${attempt.alteredBenefitCount || 0} Beneficial)
Date: ${formatDateTime(attempt.startedAt)}`;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.error('Clipboard copy failed', err);
  }
  return false;
}

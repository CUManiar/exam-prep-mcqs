import { Attempt } from './types';
import { formatDateTime, formatTimeSeconds } from './defaults';

/**
 * Resolves a clear, official examination title and stage description.
 */
function getExamStageDescription(attempt: Attempt): { stageName: string; formatName: string } {
  if (attempt.category === 'prelims') {
    return {
      stageName: 'Preliminary Examination (Prelims)',
      formatName: 'Objective (Multiple Choice Questions - OMR)',
    };
  }
  return {
    stageName: 'Main Examination (Mains)',
    formatName: 'Subjective Descriptive Written Examination',
  };
}

/**
 * Generates an authoritative, beautifully structured Markdown report for a UPSC mock exam attempt.
 */
export function generateAttemptReportMarkdown(attempt: Attempt): string {
  const { stageName, formatName } = getExamStageDescription(attempt);

  const correctMarksPerQ = attempt.correctMarks || 2.0;
  const incorrectMarksPerQ = attempt.incorrectMarks || 0.667;
  const grossMarks = ((attempt.correct || 0) * correctMarksPerQ).toFixed(2);
  const penaltyMarks = ((attempt.incorrect || 0) * incorrectMarksPerQ).toFixed(2);
  const scorePct = attempt.maxScore > 0 ? ((attempt.score / attempt.maxScore) * 100).toFixed(1) : '0.0';

  const activeSolvingSeconds = Math.max(0, attempt.durationSeconds - (attempt.idleTimeSeconds || 0));
  const avgPace = attempt.avgTimePerQuestion || 
    (attempt.answered > 0 ? Math.round(activeSolvingSeconds / attempt.answered) : 0);

  // Time calculations
  const questionList = Array.from({ length: attempt.totalQuestions }, (_, i) => i + 1).map(qNo => {
    return attempt.answers[qNo] || {
      questionNo: qNo,
      selected: null,
      correctAnswer: undefined,
      isCorrect: null,
      flagged: false,
      note: '',
      timeSpentSeconds: 0,
      changesCount: 0,
      answerHistory: [],
    };
  });

  const slowQuestions = questionList.filter(q => (q.timeSpentSeconds || 0) >= 90);
  const totalSlowSec = slowQuestions.reduce((acc, q) => acc + (q.timeSpentSeconds || 0), 0);

  // Answer change impacts
  const benefitGain = ((attempt.alteredBenefitCount || 0) * (correctMarksPerQ + incorrectMarksPerQ)).toFixed(2);
  const harmLoss = ((attempt.alteredHarmCount || 0) * (correctMarksPerQ + incorrectMarksPerQ)).toFixed(2);
  const netAlterationMarks = (parseFloat(benefitGain) - parseFloat(harmLoss)).toFixed(2);

  const lines: string[] = [
    `# UNION PUBLIC SERVICE COMMISSION (UPSC)`,
    `## Civil Services Examination (CSE) — Candidate Assessment Report`,
    `### Official Evaluation for: **${attempt.paperLabel}**`,
    ``,
    `> **Assessment Record:** Scored against the official UPSC answer key with standard negative marking applied.`,
    ``,
    `---`,
    ``,
    `## 📌 Examination & Session Details`,
    ``,
    `| Examination Field | Details |`,
    `| :--- | :--- |`,
    `| **Target Examination** | **Union Public Service Commission — Civil Services Examination (UPSC CSE)** |`,
    `| **Question Paper** | **${attempt.paperLabel}** |`,
    `| **Examination Stage** | ${stageName} |`,
    `| **Test Format** | ${formatName} |`,
    `| **Evaluation Mode** | ${attempt.mode === 'mock' ? 'Official Timed Mock Test' : 'Self-Paced Practice Session'} |`,
    `| **Candidate Attempt Date** | ${formatDateTime(attempt.startedAt)} |`,
    `| **Time Spent** | **${formatTimeSeconds(attempt.durationSeconds)}** ${attempt.overtimeSeconds ? `*(+${formatTimeSeconds(attempt.overtimeSeconds)} overtime)*` : ''} |`,
    `| **Standard Prescribed Time** | ${attempt.timeMinutes || 120} Minutes |`,
    `| **Attempt Reference ID** | \`${attempt.id}\` |`,
    ``,
    `---`,
    ``,
    `## 🏆 Performance & Scorecard Summary`,
    ``,
    `| Key Performance Indicator | Metric Value | Evaluation Context |`,
    `| :--- | :---: | :--- |`,
    `| **FINAL NET SCORE** | **${attempt.score} / ${attempt.maxScore}** | **${scorePct}% of maximum total marks** |`,
    `| **Overall Accuracy** | **${attempt.accuracyPct}%** | ${attempt.correct} accurate out of ${attempt.answered} attempted |`,
    `| **Gross Marks Earned (+)** | **+${grossMarks}** | ${attempt.correct} correct answers × +${correctMarksPerQ} marks |`,
    `| **Negative Marking Penalty (-)** | **-${penaltyMarks}** | ${attempt.incorrect} wrong answers × -${incorrectMarksPerQ} marks |`,
    `| **Total Question Count** | **${attempt.totalQuestions}** | Paper standard question volume |`,
    `| **Questions Attempted** | **${attempt.answered}** | ${Math.round((attempt.answered / (attempt.totalQuestions || 1)) * 100)}% question attempt coverage |`,
    `| **Questions Skipped** | **${attempt.unattempted}** | 0 negative penalty incurred |`,
    `| **Average Pace** | **${avgPace}s / question** | Active question solving pace |`,
    ``,
    `---`,
    ``,
    `## ⚖️ Marks Reconciliation (Negative Marking Impact)`,
    ``,
    `| Scoring Component | Formula / Calculation | Marks Result |`,
    `| :--- | :--- | :---: |`,
    `| **Gross Marks** | ${attempt.correct} Correct × +${correctMarksPerQ} | **+${grossMarks}** |`,
    `| **Negative Deduction** | ${attempt.incorrect} Incorrect × -${incorrectMarksPerQ} | **-${penaltyMarks}** |`,
    `| **Final Net Marks** | Gross Marks (${grossMarks}) − Deductions (${penaltyMarks}) | **${attempt.score}** |`,
    ``,
    parseFloat(grossMarks) > 0 
      ? `*Negative marking penalty reduced gross score by **${Math.round((parseFloat(penaltyMarks) / parseFloat(grossMarks)) * 100)}%** (loss of ${penaltyMarks} marks).*`
      : `*Negative marking penalties strictly deducted according to UPSC scheme.*`,
    ``,
    `---`,
    ``,
    `## ⏱️ Time & Pacing Nuance Analysis`,
    ``,
    `| Pacing Indicator | Time Measurement | Diagnostic Insight |`,
    `| :--- | :---: | :--- |`,
    `| **Average Pace per Question** | **${avgPace}s** | Standard benchmark for UPSC is 60–72s per MCQ |`,
    `| **Average Pace on Correct Answers** | **${attempt.avgTimeCorrect || 0}s** | Speed on high-confidence decisions |`,
    `| **Average Pace on Incorrect Answers** | **${attempt.avgTimeIncorrect || 0}s** | Time invested in erroneous choices |`,
    `| **Slow Questions (>90s)** | **${slowQuestions.length} Questions** | Consumed **${formatTimeSeconds(totalSlowSec)}** of active solving time |`,
    `| **Cover & Instructions Reading Buffer** | **${formatTimeSeconds(attempt.idleTimeSeconds || 0)}** | Time spent reading cover guidelines before active questions |`,
    ``,
    `---`,
    ``,
    `## 🔄 Second-Guessing & Answer Revision Impact`,
    ``,
    `| Answer Revision Metric | Count | Net Score Influence |`,
    `| :--- | :---: | :--- |`,
    `| **Total Answers Altered** | **${attempt.alteredCount || 0}** | Revised choices during review phase |`,
    `| **Beneficial (Wrong → Right)** | **+${attempt.alteredBenefitCount || 0}** | Gained **+${benefitGain}** marks |`,
    `| **Harmful (Right → Wrong)** | **-${attempt.alteredHarmCount || 0}** | Lost **-${harmLoss}** marks (lost correct + incurred penalty) |`,
    `| **Net Impact from Second-Guessing** | — | **${parseFloat(netAlterationMarks) >= 0 ? `+${netAlterationMarks}` : netAlterationMarks} marks** |`,
    ``,
    parseFloat(netAlterationMarks) < 0
      ? `> ⚠️ **Second-Guessing Warning:** Changing answers resulted in a net loss of **${Math.abs(parseFloat(netAlterationMarks))} marks**. Avoid second-guessing unless you find concrete, unambiguous evidence to change.`
      : parseFloat(netAlterationMarks) > 0
        ? `> ✅ **Revision Success:** Changing answers contributed a net gain of **+${netAlterationMarks} marks** to your final score.`
        : `> ℹ️ Revisions had a neutral net score effect.`,
    ``,
  ];

  // What to Review recommendations
  lines.push(
    `---`,
    ``,
    `## 🎯 Actionable Study Recommendations ("What to Review")`,
    ``
  );

  if (attempt.incorrect > 0) {
    lines.push(`1. **Target ${attempt.incorrect} Incorrect Questions:** Negative marking cost you **${penaltyMarks} marks**. Identify whether errors stemmed from conceptual gaps, question misinterpretation, or wild guesses.`);
  }
  if (slowQuestions.length > 0) {
    lines.push(`2. **Analyze ${slowQuestions.length} Slow Questions (>90s):** These consumed **${formatTimeSeconds(totalSlowSec)}**. Practice 50:50 option elimination to decide faster.`);
  }
  if ((attempt.alteredHarmCount || 0) > (attempt.alteredBenefitCount || 0)) {
    lines.push(`3. **Audit Second-Guessing Mistakes:** ${attempt.alteredHarmCount} questions were originally marked correctly but changed to wrong options.`);
  } else if (attempt.unattempted > 0) {
    lines.push(`3. **Review ${attempt.unattempted} Skipped Questions:** Determine if any of these were manageable questions skipped due to early hesitation.`);
  }

  lines.push(``);

  if (attempt.generalNotes && attempt.generalNotes.trim()) {
    lines.push(
      `---`,
      ``,
      `## 📝 Candidate Reflection Notes`,
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
    `| Q# | Candidate Choice | Official Answer Key | Result | Marks Delta | Time | Alterations | Question Note |`,
    `| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |`
  );

  for (let qNo = 1; qNo <= attempt.totalQuestions; qNo++) {
    const q = attempt.answers[qNo];
    const selected = q?.selected || '—';
    const key = q?.correctAnswer || '—';
    let status = '⚪ Skipped';
    let marksDelta = '0.00';

    if (q?.selected) {
      if (q.isCorrect === true) {
        status = '✅ Correct';
        marksDelta = `+${correctMarksPerQ.toFixed(2)}`;
      } else if (q.isCorrect === false) {
        status = '❌ Incorrect';
        marksDelta = `-${incorrectMarksPerQ.toFixed(2)}`;
      } else {
        status = 'Submitted';
      }
    }

    const timeSpent = q?.timeSpentSeconds ? `${q.timeSpentSeconds}s` : '0s';
    const changes = q?.changesCount ? `${q.changesCount}x (${q.answerHistory?.join('→') || ''})` : '—';
    const note = q?.note ? q.note.replace(/\|/g, '\\|') : '—';

    lines.push(`| ${qNo} | **${selected}** | **${key}** | ${status} | \`${marksDelta}\` | ${timeSpent} | ${changes} | ${note} |`);
  }

  lines.push(
    ``,
    `---`,
    `*Generated on ${new Date().toLocaleString()} for **${attempt.paperLabel}** from UPSC CSE Practice System.*`
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
 * Exports a single attempt as a Markdown (.md) report with clear exam labeling
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
 * Copies a compact formatted summary to clipboard with full exam details
 */
export async function copyAttemptSummaryToClipboard(attempt: Attempt): Promise<boolean> {
  const text = `🎯 UPSC CSE Mock Assessment Report
Examination: ${attempt.paperLabel} (${attempt.category.toUpperCase()} ${attempt.examType.toUpperCase()})
Score: ${attempt.score} / ${attempt.maxScore} (${Math.round((attempt.score / (attempt.maxScore || 1)) * 1000) / 10}%)
Accuracy: ${attempt.accuracyPct}% (${attempt.correct} Correct, ${attempt.incorrect} Incorrect, ${attempt.unattempted} Skipped)
Pace: ${attempt.avgTimePerQuestion || 0}s/Q | Duration: ${formatTimeSeconds(attempt.durationSeconds)}
Date: ${formatDateTime(attempt.startedAt)}
Attempt ID: ${attempt.id}`;

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

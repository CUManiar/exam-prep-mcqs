import { Attempt } from "./types";
import { formatDateTime, formatTimeSeconds } from "./defaults";
import jsPDF from "jspdf";

/**
 * Resolves a clear, official examination title and stage description.
 */
function getExamStageDescription(attempt: Attempt): {
  stageName: string;
  formatName: string;
} {
  if (attempt.category === "prelims") {
    return {
      stageName: "Preliminary Examination (Prelims)",
      formatName: "Objective (Multiple Choice Questions - OMR)",
    };
  }
  return {
    stageName: "Main Examination (Mains)",
    formatName: "Subjective Descriptive Written Examination",
  };
}

/**
 * Generates the complete, rich Markdown summary section for a UPSC mock exam attempt.
 */
export function generateAttemptSummaryMarkdown(attempt: Attempt): string {
  const { stageName, formatName } = getExamStageDescription(attempt);

  const correctMarksPerQ = attempt.correctMarks || 2.0;
  const incorrectMarksPerQ = attempt.incorrectMarks || 0.667;
  const grossMarks = ((attempt.correct || 0) * correctMarksPerQ).toFixed(2);
  const penaltyMarks = ((attempt.incorrect || 0) * incorrectMarksPerQ).toFixed(
    2,
  );
  const scorePct =
    attempt.maxScore > 0
      ? ((attempt.score / attempt.maxScore) * 100).toFixed(1)
      : "0.0";

  const activeSolvingSeconds = Math.max(
    0,
    attempt.durationSeconds - (attempt.idleTimeSeconds || 0),
  );
  const avgPace =
    attempt.avgTimePerQuestion ||
    (attempt.answered > 0
      ? Math.round(activeSolvingSeconds / attempt.answered)
      : 0);

  // Time calculations
  const questionList = Array.from(
    { length: attempt.totalQuestions },
    (_, i) => i + 1,
  ).map((qNo) => {
    return (
      attempt.answers[qNo] || {
        questionNo: qNo,
        selected: null,
        correctAnswer: undefined,
        isCorrect: null,
        flagged: false,
        note: "",
        timeSpentSeconds: 0,
        changesCount: 0,
        answerHistory: [],
      }
    );
  });

  const slowQuestions = questionList.filter(
    (q) => (q.timeSpentSeconds || 0) >= 90,
  );
  const totalSlowSec = slowQuestions.reduce(
    (acc, q) => acc + (q.timeSpentSeconds || 0),
    0,
  );

  // Answer change impacts
  const benefitGain = (
    (attempt.alteredBenefitCount || 0) *
    (correctMarksPerQ + incorrectMarksPerQ)
  ).toFixed(2);
  const harmLoss = (
    (attempt.alteredHarmCount || 0) *
    (correctMarksPerQ + incorrectMarksPerQ)
  ).toFixed(2);
  const netAlterationMarks = (
    parseFloat(benefitGain) - parseFloat(harmLoss)
  ).toFixed(2);

  // Confidence & Tag calculations
  const sureQs = questionList.filter((q) => q.confidence === "sure");
  const sureCorrect = sureQs.filter(
    (q) => q.selected && q.isCorrect === true,
  ).length;
  const sureWrong = sureQs.filter(
    (q) => q.selected && q.isCorrect === false,
  ).length;
  const sureAcc =
    sureQs.length > 0 ? Math.round((sureCorrect / sureQs.length) * 100) : 0;

  const fiftyQs = questionList.filter((q) => q.confidence === "50-50");
  const fiftyCorrect = fiftyQs.filter(
    (q) => q.selected && q.isCorrect === true,
  ).length;
  const fiftyWrong = fiftyQs.filter(
    (q) => q.selected && q.isCorrect === false,
  ).length;
  const fiftyAcc =
    fiftyQs.length > 0 ? Math.round((fiftyCorrect / fiftyQs.length) * 100) : 0;

  const guessQs = questionList.filter((q) => q.confidence === "guess");
  const guessCorrect = guessQs.filter(
    (q) => q.selected && q.isCorrect === true,
  ).length;
  const guessWrong = guessQs.filter(
    (q) => q.selected && q.isCorrect === false,
  ).length;
  const guessAcc =
    guessQs.length > 0 ? Math.round((guessCorrect / guessQs.length) * 100) : 0;

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
    `| **Evaluation Mode** | ${attempt.mode === "mock" ? "Official Timed Mock Test" : "Self-Paced Practice Session"} |`,
    `| **Candidate Attempt Date** | ${formatDateTime(attempt.startedAt)} |`,
    `| **Time Spent** | **${formatTimeSeconds(attempt.durationSeconds)}** ${attempt.overtimeSeconds ? `*(+${formatTimeSeconds(attempt.overtimeSeconds)} overtime)*` : ""} |`,
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
    `## 🎯 Confidence & Tag Accuracy Breakdown`,
    ``,
    `| Confidence Tag | Total Tagged | Correct | Incorrect | Accuracy % |`,
    `| :--- | :---: | :---: | :---: | :---: |`,
    `| **🎯 Sure** | **${sureQs.length}** | ${sureCorrect} | ${sureWrong} | **${sureAcc}%** |`,
    `| **⚖️ 50:50** | **${fiftyQs.length}** | ${fiftyCorrect} | ${fiftyWrong} | **${fiftyAcc}%** |`,
    `| **🎲 Guess** | **${guessQs.length}** | ${guessCorrect} | ${guessWrong} | **${guessAcc}%** |`,
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
    ``,
  );

  if (attempt.incorrect > 0) {
    lines.push(
      `1. **Target ${attempt.incorrect} Incorrect Questions:** Negative marking cost you **${penaltyMarks} marks**. Identify whether errors stemmed from conceptual gaps, question misinterpretation, or wild guesses.`,
    );
  }
  if (slowQuestions.length > 0) {
    lines.push(
      `2. **Analyze ${slowQuestions.length} Slow Questions (>90s):** These consumed **${formatTimeSeconds(totalSlowSec)}**. Practice 50:50 option elimination to decide faster.`,
    );
  }
  if ((attempt.alteredHarmCount || 0) > (attempt.alteredBenefitCount || 0)) {
    lines.push(
      `3. **Audit Second-Guessing Mistakes:** ${attempt.alteredHarmCount} questions were originally marked correctly but changed to wrong options.`,
    );
  } else if (attempt.unattempted > 0) {
    lines.push(
      `3. **Review ${attempt.unattempted} Skipped Questions:** Determine if any of these were manageable questions skipped due to early hesitation.`,
    );
  }

  lines.push(``);

  if (attempt.generalNotes && attempt.generalNotes.trim()) {
    lines.push(
      `---`,
      ``,
      `## 📝 Candidate Reflection Notes`,
      ``,
      attempt.generalNotes.trim(),
      ``,
    );
  }

  return lines.join("\n");
}

/**
 * Generates an authoritative, beautifully structured Markdown report for a UPSC mock exam attempt.
 */
export function generateAttemptReportMarkdown(attempt: Attempt): string {
  const summaryMarkdown = generateAttemptSummaryMarkdown(attempt);
  const correctMarksPerQ = attempt.correctMarks || 2.0;
  const incorrectMarksPerQ = attempt.incorrectMarks || 0.667;

  const lines: string[] = [
    summaryMarkdown,
    ``,
    `---`,
    ``,
    `## 📋 Question Assessment Table`,
    ``,
    `| Question | Tag | Right / Wrong | Your Answer | Correct Answer | Marks | Explanation / Notes |`,
    `| :---: | :---: | :---: | :---: | :---: | :---: | :--- |`,
  ];

  for (let qNo = 1; qNo <= attempt.totalQuestions; qNo++) {
    const q = attempt.answers[qNo];
    const selected = q?.selected ? `Option ${q.selected}` : "—";
    const key = q?.correctAnswer ? `Option ${q.correctAnswer}` : "—";
    let status = "⚪ Skipped";
    let marksDelta = "0.00";

    if (q?.selected) {
      if (q.isCorrect === true) {
        status = "✅ Right";
        marksDelta = `+${correctMarksPerQ.toFixed(2)}`;
      } else if (q.isCorrect === false) {
        status = "❌ Wrong";
        marksDelta = `-${incorrectMarksPerQ.toFixed(2)}`;
      } else {
        status = "Submitted";
      }
    }

    let confTag = "—";
    if (q?.confidence === "sure") confTag = "🎯 Sure";
    else if (q?.confidence === "50-50") confTag = "⚖️ 50:50";
    else if (q?.confidence === "guess") confTag = "🎲 Guess";

    const expl = q?.explanation || "";
    let explOrNote = "—";
    if (expl && q?.note) {
      explOrNote = `**Expl:** ${expl.replace(/\|/g, "\\|")} | *Note:* ${q.note.replace(/\|/g, "\\|")}`;
    } else if (expl) {
      explOrNote = `**Expl:** ${expl.replace(/\|/g, "\\|")}`;
    } else if (q?.note) {
      explOrNote = q.note.replace(/\|/g, "\\|");
    }

    lines.push(
      `| Q${qNo} | ${confTag} | ${status} | **${selected}** | **${key}** | \`${marksDelta}\` | ${explOrNote} |`,
    );
  }

  lines.push(
    ``,
    `---`,
    `*Generated on ${new Date().toLocaleString()} for **${attempt.paperLabel}** from UPSC CSE Practice System.*`,
  );

  return lines.join("\n");
}

/**
 * Downloads text/file content to user device
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
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
  const safeTitle = attempt.paperLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  const filename = `${safeTitle}_attempt_${attempt.id.slice(-6)}.md`;
  downloadFile(content, filename, "text/markdown;charset=utf-8");
}

/**
 * Exports a single attempt as a JSON (.json) backup file
 */
export function exportAttemptAsJSON(attempt: Attempt) {
  const content = JSON.stringify(attempt, null, 2);
  const safeTitle = attempt.paperLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  const filename = `${safeTitle}_attempt_${attempt.id.slice(-6)}.json`;
  downloadFile(content, filename, "application/json;charset=utf-8");
}

/**
 * Copies the comprehensive Markdown summary section to clipboard with full exam score breakdown & insights
 */
export async function copyAttemptSummaryToClipboard(
  attempt: Attempt,
): Promise<boolean> {
  const text = generateAttemptSummaryMarkdown(attempt);

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("Primary clipboard writeText failed, falling back to execCommand", err);
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.error("Fallback clipboard copy failed:", fallbackErr);
    return false;
  }
}

/**
 * Generates and downloads a genuine, executive PDF assessment report (.pdf) using jsPDF
 */
export function exportAttemptAsPDF(
  attempt: Attempt,
  explanations?: Record<number, string>,
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  const correctMarksPerQ = attempt.correctMarks || 2.0;
  const incorrectMarksPerQ = attempt.incorrectMarks || 0.667;
  const grossMarks = ((attempt.correct || 0) * correctMarksPerQ).toFixed(2);
  const penaltyMarks = ((attempt.incorrect || 0) * incorrectMarksPerQ).toFixed(2);
  const scorePct =
    attempt.maxScore > 0
      ? ((attempt.score / attempt.maxScore) * 100).toFixed(1)
      : "0.0";
  const activeSolvingSeconds = Math.max(
    0,
    attempt.durationSeconds - (attempt.idleTimeSeconds || 0),
  );
  const avgPace =
    attempt.avgTimePerQuestion ||
    (attempt.answered > 0
      ? Math.round(activeSolvingSeconds / attempt.answered)
      : 0);

  // Helper to draw top banner
  const drawPageHeader = (isFirstPage: boolean) => {
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, isFirstPage ? 24 : 12, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isFirstPage ? 11 : 9);
    doc.text(
      "UNION PUBLIC SERVICE COMMISSION (UPSC) — CIVIL SERVICES EXAMINATION",
      margin,
      isFirstPage ? 10 : 8,
    );

    if (isFirstPage) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text(
        "Official Candidate Assessment & Evaluation Report",
        margin,
        17,
      );
    }
  };

  drawPageHeader(true);
  let y = 32;

  // Paper Title
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(attempt.paperLabel || "UPSC Examination", contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6 + 2;

  // Metadata row (Mode, Date, Time Spent, Total Questions)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  const dateStr = formatDateTime(attempt.startedAt);
  const durStr = formatTimeSeconds(attempt.durationSeconds);
  const modeStr = attempt.mode === "mock" ? "Official Mock Test" : "Practice Session";
  doc.text(`Mode: ${modeStr}   |   Attempt Date: ${dateStr}   |   Time Spent: ${durStr}`, margin, y);
  y += 5;
  doc.text(`Reference ID: ${attempt.id}   |   Total Questions: ${attempt.totalQuestions} Qs   |   Prescribed Time: ${attempt.timeMinutes || 120} mins`, margin, y);
  y += 7;

  // KPI Scorecard Cards (4 horizontal boxes)
  const boxWidth = (contentWidth - 9) / 4;
  const boxHeight = 17;

  // 1. Final Score
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("FINAL SCORE", margin + 3, y + 4.5);
  doc.setFontSize(11);
  doc.setTextColor(67, 56, 202); // indigo-700
  const scoreText = `${attempt.score}`;
  doc.text(scoreText, margin + 3, y + 11.5);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`/ ${attempt.maxScore} (${scorePct}%)`, margin + 3 + doc.getTextWidth(`${scoreText} `), y + 11.5);

  // 2. Accuracy
  const x2 = margin + boxWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x2, y, boxWidth, boxHeight, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("ACCURACY", x2 + 3, y + 4.5);
  doc.setFontSize(11);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text(`${attempt.accuracyPct}%`, x2 + 3, y + 11.5);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`${attempt.correct} of ${attempt.answered} correct`, x2 + 3, y + 15);

  // 3. Attempt Breakdown
  const x3 = x2 + boxWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x3, y, boxWidth, boxHeight, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("ATTEMPT RATIO", x3 + 3, y + 4.5);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${attempt.answered} / ${attempt.totalQuestions}`, x3 + 3, y + 10.5);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Right: ${attempt.correct} | Wrong: ${attempt.incorrect} | Skip: ${attempt.unattempted}`, x3 + 3, y + 15);

  // 4. Marks Reconciliation
  const x4 = x3 + boxWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x4, y, boxWidth, boxHeight, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("MARKS BREAKDOWN", x4 + 3, y + 4.5);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(4, 120, 87);
  doc.text(`Gross (+): +${grossMarks}`, x4 + 3, y + 10);
  doc.setTextColor(185, 28, 28);
  doc.text(`Penalty (-): -${penaltyMarks}`, x4 + 3, y + 14.5);

  y += boxHeight + 7;

  // Table header helper
  const colQ = margin;
  const colTag = margin + 11;
  const colStatus = margin + 27;
  const colUser = margin + 46;
  const colKey = margin + 64;
  const colMarks = margin + 82;
  const colExpl = margin + 98;

  const drawTableHeader = (currY: number) => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, currY, contentWidth, 6.5, "F");
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, currY + 6.5, margin + contentWidth, currY + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85); // slate-700

    doc.text("Q#", colQ + 1.5, currY + 4.5);
    doc.text("Tag", colTag + 1, currY + 4.5);
    doc.text("Result", colStatus + 1, currY + 4.5);
    doc.text("Your Choice", colUser + 1, currY + 4.5);
    doc.text("Answer Key", colKey + 1, currY + 4.5);
    doc.text("Marks", colMarks + 1, currY + 4.5);
    doc.text("Explanation & Notes", colExpl + 1, currY + 4.5);
    return currY + 6.5;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Question-by-Question Evaluation & Explanations", margin, y);
  y += 4;

  y = drawTableHeader(y);

  // Rows
  const totalQuestions = attempt.totalQuestions || 100;
  for (let qNo = 1; qNo <= totalQuestions; qNo++) {
    const q = attempt.answers[qNo];
    const userSelected = q?.selected ? q.selected.toUpperCase() : "—";
    const correctKey = q?.correctAnswer ? q.correctAnswer.toUpperCase() : "—";

    let resultText = "Skipped";
    let marksText = "0.00";
    if (q?.selected) {
      if (q.isCorrect === true) {
        resultText = "Correct";
        marksText = `+${correctMarksPerQ.toFixed(2)}`;
      } else if (q.isCorrect === false) {
        resultText = "Wrong";
        marksText = `-${incorrectMarksPerQ.toFixed(2)}`;
      }
    }

    let tagText = "—";
    if (q?.confidence === "sure") tagText = "Sure";
    else if (q?.confidence === "50-50") tagText = "50:50";
    else if (q?.confidence === "guess") tagText = "Guess";

    // Explanation / Note text
    const expl = q?.explanation || explanations?.[qNo] || "";
    let explText = "";
    if (expl && q?.note) {
      explText = `${expl}\n[Note: ${q.note}]`;
    } else if (expl) {
      explText = expl;
    } else if (q?.note) {
      explText = `Note: ${q.note}`;
    }

    // Measure text height
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const explLines = explText ? doc.splitTextToSize(explText, 80) : [];
    const minRowHeight = 6;
    const explHeight = explLines.length > 0 ? explLines.length * 3.2 + 2 : minRowHeight;
    const rowHeight = Math.max(minRowHeight, explHeight);

    // Page break check
    if (y + rowHeight > pageHeight - 14) {
      doc.addPage();
      drawPageHeader(false);
      y = drawTableHeader(16);
    }

    // Zebra striping
    if (qNo % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, "F");
    }

    // Border line bottom
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

    // Q#
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Q${qNo}`, colQ + 1.5, y + 4.2);

    // Tag
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(tagText, colTag + 1, y + 4.2);

    // Result with color
    doc.setFont("helvetica", "bold");
    if (resultText === "Correct") {
      doc.setTextColor(4, 120, 87);
    } else if (resultText === "Wrong") {
      doc.setTextColor(185, 28, 28);
    } else {
      doc.setTextColor(148, 163, 184);
    }
    doc.text(resultText, colStatus + 1, y + 4.2);

    // Choice & Key
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(userSelected, colUser + 3, y + 4.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(4, 120, 87);
    doc.text(correctKey, colKey + 3, y + 4.2);

    // Marks
    doc.setFont("helvetica", "normal");
    if (marksText.startsWith("+")) doc.setTextColor(4, 120, 87);
    else if (marksText.startsWith("-")) doc.setTextColor(185, 28, 28);
    else doc.setTextColor(148, 163, 184);
    doc.text(marksText, colMarks + 1, y + 4.2);

    // Explanation / Note
    if (explLines.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text(explLines, colExpl + 1, y + 3.8);
    } else {
      doc.setTextColor(203, 213, 225);
      doc.text("—", colExpl + 1, y + 4.2);
    }

    y += rowHeight;
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Generated by UPSC CSE Practice Studio • Confidential Assessment Record`,
      margin,
      pageHeight - 6,
    );
    const pageStr = `Page ${p} of ${totalPages}`;
    doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), pageHeight - 6);
  }

  const safeTitle = (attempt.paperLabel || "upsc_mock")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  doc.save(`${safeTitle}_assessment_report.pdf`);
}

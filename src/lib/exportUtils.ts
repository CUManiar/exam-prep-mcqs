import { Attempt, ParsedQuestion, QuestionPaper, SyllabusItem } from "./types";
import { formatDateTime, formatTimeSeconds } from "./defaults";
import { jsPDF } from "jspdf";
import {
  parseMarkdownHeader,
  parseQuestionnaireMarkdown,
  stripMarkdownFormatting,
} from "./markdownPaperParser";
import {
  getEffectiveSyllabusDueDate,
  getSyllabusCompletion,
  getSyllabusItemDateStatus,
  getSyllabusPace,
  getSyllabusProgress,
  getSyllabusTopicKey,
} from "./syllabusMarkdown";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildMarkdownQuestionPaperHtml(
  paper: QuestionPaper,
  questions: ParsedQuestion[],
): string {
  const instructions = paper.instructions || [];
  const instructionHtml = instructions.length
    ? `<div class="paper-instructions"><div class="paper-subtitle">Instructions</div><ul>${instructions
        .map((instruction) => `<li>${escapeHtml(instruction)}</li>`)
        .join("")}</ul></div>`
    : "";

  const questionHtml = questions
    .map((question) => {
      const matchingHtml = question.matchingItems?.length
        ? `<table class="matching-table"><thead><tr><th>${escapeHtml(question.matchingHeaders?.left || "List-I")}</th><th>${escapeHtml(question.matchingHeaders?.right || "List-II")}</th></tr></thead><tbody>${question.matchingItems
            .map(
              (item) =>
                `<tr><td><strong>${escapeHtml(item.label)}.</strong> ${escapeHtml(stripMarkdownFormatting(item.left))}</td><td><strong>${escapeHtml(item.rightLabel)}.</strong> ${escapeHtml(stripMarkdownFormatting(item.right))}</td></tr>`,
            )
            .join("")}</tbody></table>`
        : "";
      const optionsHtml = ["A", "B", "C", "D"]
        .filter((key) => question.options[key])
        .map(
          (key) =>
            `<div class="paper-option"><strong>${key}.</strong><span>${escapeHtml(stripMarkdownFormatting(question.options[key]))}</span></div>`,
        )
        .join("");

      return `<article class="paper-question"><div class="paper-question-title"><strong>Q${question.questionNo}</strong> ${escapeHtml(stripMarkdownFormatting(question.text))}</div>${matchingHtml}<div class="paper-options">${optionsHtml}</div></article>`;
    })
    .join("");

  return `<section class="question-paper-section"><div class="section-title">Question Paper</div><h2>${escapeHtml(paper.title || paper.label)}</h2><div class="paper-meta">${paper.totalQuestions} questions · ${paper.totalMarks} marks · ${paper.timeMinutes} minutes</div>${instructionHtml}<div>${questionHtml}</div></section>`;
}

async function loadPdfJsForExport(): Promise<any> {
  if (typeof window === "undefined") {
    throw new Error("PDF export requires a browser window");
  }
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/vendor/pdfjs/pdf.min.js";
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (!lib) {
        reject(new Error("PDF.js library failed to initialize"));
        return;
      }
      lib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
      resolve(lib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.head.appendChild(script);
  });
}

async function buildUploadedPdfQuestionPaperHtml(
  paper: QuestionPaper,
): Promise<string> {
  if (!paper.qpUrl || paper.qpUrl.startsWith("local://")) return "";

  try {
    const pdfjsLib = await loadPdfJsForExport();
    const absoluteUrl = paper.qpUrl.startsWith("http")
      ? paper.qpUrl
      : `${window.location.origin}${paper.qpUrl}`;
    const pdf = await pdfjsLib.getDocument({ url: absoluteUrl }).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.25 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({
        canvasContext: canvas.getContext("2d"),
        viewport,
      }).promise;
      pages.push(
        `<img class="paper-pdf-page" src="${canvas.toDataURL("image/jpeg", 0.88)}" alt="Question paper page ${pageNumber}" />`,
      );
    }

    return `<section class="question-paper-section"><div class="section-title">Question Paper</div><h2>${escapeHtml(paper.title || paper.label)}</h2><div class="paper-meta">${paper.totalQuestions} questions · ${paper.totalMarks} marks · ${paper.timeMinutes} minutes</div>${pages.join("")}</section>`;
  } catch (error) {
    console.warn("Could not embed uploaded question paper in export:", error);
    return `<section class="question-paper-section"><div class="section-title">Question Paper</div><h2>${escapeHtml(paper.title || paper.label)}</h2><p>The question paper could not be embedded automatically. Open the original paper here:</p><p><a href="${escapeHtml(paper.qpUrl)}">${escapeHtml(paper.qpUrl)}</a></p></section>`;
  }
}

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

  const eliminationQs = questionList.filter(
    (q) => q.confidence === "elimination",
  );
  const eliminationCorrect = eliminationQs.filter(
    (q) => q.selected && q.isCorrect === true,
  ).length;
  const eliminationWrong = eliminationQs.filter(
    (q) => q.selected && q.isCorrect === false,
  ).length;
  const eliminationAcc =
    eliminationQs.length > 0
      ? Math.round((eliminationCorrect / eliminationQs.length) * 100)
      : 0;

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
    `| **✂️ Elimination** | **${eliminationQs.length}** | ${eliminationCorrect} | ${eliminationWrong} | **${eliminationAcc}%** |`,
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
    else if (q?.confidence === "elimination") confTag = "✂️ Elimination";
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
 * Generates a clean standalone HTML string for the print/PDF report.
 * Opened in a new window and auto-printed — bypasses CSS media query conflicts.
 */
export function exportAttemptAsPrintPDF(
  attempt: Attempt,
  paperExplanations?: Record<number, string>,
  displayTitleOverride?: string,
  maxScoreOverride?: number,
  questionPaperHtml = "",
): void {
  const paperTitle =
    displayTitleOverride || attempt.paperLabel || "Assessment Report";
  const maxScore =
    maxScoreOverride && maxScoreOverride > 0
      ? maxScoreOverride
      : attempt.maxScore > 0
        ? attempt.maxScore
        : 200;

  const correctMarksPerQ = attempt.correctMarks || 2.0;
  const incorrectMarksPerQ = attempt.incorrectMarks || 0.667;
  const grossCorrectMarks =
    Math.round(attempt.correct * correctMarksPerQ * 100) / 100;
  const negativePenaltyMarks =
    Math.round(attempt.incorrect * incorrectMarksPerQ * 100) / 100;
  const scorePct =
    maxScore > 0 ? ((attempt.score / maxScore) * 100).toFixed(1) : "0.0";

  const activeSolvingSeconds = Math.max(
    0,
    attempt.durationSeconds - (attempt.idleTimeSeconds || 0),
  );
  const avgTimePerQ =
    attempt.avgTimePerQuestion ||
    (attempt.answered > 0
      ? Math.round(activeSolvingSeconds / attempt.answered)
      : 0);

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
  const avgTimeCorrect = attempt.avgTimeCorrect || 0;
  const avgTimeIncorrect = attempt.avgTimeIncorrect || 0;
  const penaltyDragPct =
    grossCorrectMarks > 0
      ? Math.round((negativePenaltyMarks / grossCorrectMarks) * 100)
      : 0;

  // Build question rows
  const rows = Array.from({ length: attempt.totalQuestions }, (_, i) => i + 1)
    .map((qNo) => {
      const q = attempt.answers[qNo];
      const isAnswered = q?.selected !== null && q?.selected !== undefined;
      const isCorrect = isAnswered && q?.isCorrect === true;
      const isWrong = isAnswered && q?.isCorrect === false;

      const tagLabel =
        q?.confidence === "sure"
          ? "🎯 Sure"
          : q?.confidence === "50-50"
            ? "⚖️ 50:50"
            : q?.confidence === "elimination"
              ? "✂️ Elimination"
              : q?.confidence === "guess"
                ? "🎲 Guess"
                : "—";

      const statusLabel = isCorrect
        ? "✅ Correct"
        : isWrong
          ? "❌ Wrong"
          : "⚪ Skipped";
      const statusColor = isCorrect
        ? "#047857"
        : isWrong
          ? "#b91c1c"
          : "#64748b";
      const marksLabel = isCorrect
        ? `+${correctMarksPerQ}`
        : isWrong
          ? `-${incorrectMarksPerQ}`
          : "0.00";
      const marksColor = isCorrect
        ? "#047857"
        : isWrong
          ? "#b91c1c"
          : "#94a3b8";

      const timeText = q?.timeSpentSeconds ? `${q.timeSpentSeconds}s` : "—";
      const changesText = q?.changesCount ? `${q.changesCount}x` : "—";

      const expl = q?.explanation || paperExplanations?.[qNo] || "";
      const note = q?.note?.trim() || "";
      let noteCell = "—";
      if (expl && note)
        noteCell = `<strong>Expl:</strong> ${expl}<br/><span style="color:#475569;"><em>Note:</em> ${note}</span>`;
      else if (expl) noteCell = `<strong>Expl:</strong> ${expl}`;
      else if (note) noteCell = `<em>Note:</em> ${note}`;

      return `<tr>
      <td style="text-align:center;font-weight:700;font-family:monospace;">Q${qNo}</td>
      <td style="text-align:center;font-size:10px;">${tagLabel}</td>
      <td style="text-align:center;color:${statusColor};font-weight:700;font-size:11px;">${statusLabel}</td>
      <td style="text-align:center;font-family:monospace;font-weight:700;font-size:11px;">${q?.selected ? `Option ${q.selected}` : "—"}</td>
      <td style="text-align:center;font-family:monospace;font-weight:700;font-size:11px;color:#047857;">${q?.correctAnswer ? `Option ${q.correctAnswer}` : "—"}</td>
      <td style="text-align:center;font-family:monospace;color:${marksColor};font-weight:700;">${marksLabel}</td>
      <td style="text-align:center;font-size:10px;color:#64748b;font-family:monospace;">${timeText}</td>
      <td style="font-size:11px;color:#334155;line-height:1.4;">${noteCell}</td>
    </tr>`;
    })
    .join("\n");

  const questionPaperSection = questionPaperHtml
    ? `${questionPaperHtml}<div class="summary-break"></div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${paperTitle} — Assessment Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 11px; color: #0f172a; background: #fff; padding: 10mm; }
    h1 { font-size: 16px; font-weight: 900; margin-bottom: 2px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
    .header .label { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #334155; }
    .header .subtitle { font-size: 16px; font-weight: 900; letter-spacing: -0.01em; margin: 3px 0; color: #0f172a; }
    .meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 14px; font-size: 10px; color: #475569; font-weight: 600; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    .widgets { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 12px; }
    .widget { border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc; padding: 8px 6px; text-align: center; }
    .widget-label { font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; display: block; margin-bottom: 2px; }
    .widget-value { font-size: 16px; font-weight: 900; font-family: monospace; color: #0f172a; }
    .widget-sub { font-size: 8.5px; color: #64748b; margin-top: 1px; }
    .section-title { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #334155; margin-bottom: 6px; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .card { border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; padding: 8px 10px; }
    .card-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px; }
    .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 2.5px 0; font-size: 10.5px; }
    .stat-label { color: #64748b; font-weight: 500; }
    .stat-val { font-weight: 700; font-family: monospace; color: #0f172a; }
    .general-note { border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; padding: 6px 10px; font-size: 10.5px; color: #374151; margin-bottom: 10px; }
    .question-paper-section { margin-bottom: 16px; }
    .question-paper-section h2 { font-size: 15px; margin: 4px 0 2px; }
    .paper-meta { color: #64748b; font-size: 10px; margin-bottom: 8px; }
    .paper-subtitle { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #334155; margin-bottom: 4px; }
    .paper-instructions { border: 1px solid #bfdbfe; border-radius: 8px; background: #eff6ff; padding: 7px 10px; margin: 7px 0 10px; }
    .paper-instructions ul { margin: 0 0 0 15px; padding: 0; color: #334155; }
    .paper-instructions li { margin: 2px 0; }
    .paper-question { border-top: 1px solid #cbd5e1; padding: 8px 0; break-inside: avoid; page-break-inside: avoid; }
    .paper-question-title { font-size: 11px; line-height: 1.45; color: #0f172a; }
    .paper-question-title strong { color: #1d4ed8; font-family: monospace; margin-right: 5px; }
    .paper-options { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-top: 6px; }
    .paper-option { display: flex; gap: 5px; font-size: 10.5px; line-height: 1.35; }
    .paper-option strong { color: #475569; font-family: monospace; }
    .matching-table { margin: 7px 0 5px; font-size: 10px; }
    .matching-table th, .matching-table td { text-align: left; padding: 4px 5px; }
    .paper-pdf-page { display: block; width: 100%; height: auto; margin: 0 auto 10px; break-inside: avoid; page-break-inside: avoid; }
    .summary-break { break-before: page; page-break-before: always; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 12px; }
    thead tr { background: #f1f5f9; }
    th { padding: 6px 5px; text-align: center; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #374151; border: 1px solid #cbd5e1; }
    td { padding: 4.5px 5px; border: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { font-size: 8.5px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 4px; }
    @media print {
      body { padding: 0; }
      @page { margin: 8mm 10mm; size: auto; }
      tr, td, th { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="label">Candidate Assessment Report</div>
    <div class="subtitle">${paperTitle}</div>
    <div style="font-size:11px;color:#64748b;font-weight:600;margin-top:2px;">${attempt.mode === "mock" ? "Timed Mock Examination" : "Practice Assessment Session"} · Objective Evaluated Record</div>
    <div class="meta">
      <span><strong>Attempted:</strong> ${formatDateTime(attempt.startedAt)}</span>
      <span>•</span>
      <span><strong>Duration:</strong> ${formatTimeSeconds(attempt.durationSeconds)}</span>
      <span>•</span>
      <span><strong>Marking Scheme:</strong> +${correctMarksPerQ} / -${incorrectMarksPerQ}</span>
      <span>•</span>
      <span><strong>Ref ID:</strong> ${attempt.id}</span>
    </div>
  </div>

  ${questionPaperSection}

  <div class="section-title">Performance Summary</div>
  <div class="widgets">
    <div class="widget">
      <span class="widget-label">Final Net Score</span>
      <div class="widget-value">${attempt.score}<span style="font-size:10px;font-weight:400;color:#64748b;"> / ${maxScore}</span></div>
      <div class="widget-sub" style="color:#3730a3;font-weight:700;">${scorePct}% Marks</div>
    </div>
    <div class="widget">
      <span class="widget-label">Accuracy</span>
      <div class="widget-value" style="color:#047857;">${attempt.accuracyPct}%</div>
      <div class="widget-sub">${attempt.correct} / ${attempt.answered} answered</div>
    </div>
    <div class="widget">
      <span class="widget-label">Correct / Wrong</span>
      <div class="widget-value"><span style="color:#047857;">${attempt.correct}</span><span style="color:#cbd5e1;margin:0 2px;">/</span><span style="color:#b91c1c;">${attempt.incorrect}</span></div>
      <div class="widget-sub">+${grossCorrectMarks}m / -${negativePenaltyMarks}m</div>
    </div>
    <div class="widget">
      <span class="widget-label">Questions</span>
      <div class="widget-value">${attempt.answered}<span style="font-size:10px;font-weight:400;color:#64748b;"> / ${attempt.totalQuestions}</span></div>
      <div class="widget-sub">${attempt.unattempted} Skipped</div>
    </div>
    <div class="widget">
      <span class="widget-label">Avg Pace</span>
      <div class="widget-value">${avgTimePerQ}s</div>
      <div class="widget-sub">per attempted</div>
    </div>
  </div>

  <!-- Summary Detail Breakdown -->
  <div class="detail-grid">
    <!-- Marks Reconciliation -->
    <div class="card">
      <div class="card-title">Marks Breakdown &amp; Negative Marking Drag</div>
      <div class="stat-row">
        <span class="stat-label">Gross Marks Earned (+):</span>
        <span class="stat-val" style="color:#047857;">+${grossCorrectMarks} marks (${attempt.correct} × ${correctMarksPerQ}m)</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Penalties Deducted (−):</span>
        <span class="stat-val" style="color:#b91c1c;">-${negativePenaltyMarks} marks (${attempt.incorrect} × ${incorrectMarksPerQ}m)</span>
      </div>
      <div class="stat-row" style="border-top:1px dashed #cbd5e1;padding-top:3px;margin-top:2px;">
        <span class="stat-label" style="font-weight:700;color:#0f172a;">Final Net Marks:</span>
        <span class="stat-val" style="font-size:12px;color:#1e1b4b;">${attempt.score} / ${maxScore} (${scorePct}%)</span>
      </div>
      <div style="font-size:9.5px;color:#64748b;margin-top:3px;">
        ${grossCorrectMarks > 0 ? `*Negative penalties reduced gross score by <strong>${penaltyDragPct}%</strong>.*` : "*Scored with official negative marking scheme.*"}
      </div>
    </div>

    <!-- Pacing & Question Management -->
    <div class="card">
      <div class="card-title">Pacing &amp; Time Diagnostics</div>
      <div class="stat-row">
        <span class="stat-label">Average Time per Question:</span>
        <span class="stat-val">${avgTimePerQ}s</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Pace on Correct Answers:</span>
        <span class="stat-val" style="color:#047857;">${avgTimeCorrect > 0 ? `${avgTimeCorrect}s avg` : "—"}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Pace on Incorrect Answers:</span>
        <span class="stat-val" style="color:#b91c1c;">${avgTimeIncorrect > 0 ? `${avgTimeIncorrect}s avg` : "—"}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Slow Questions (&gt;90s):</span>
        <span class="stat-val" style="color:${slowQuestions.length > 0 ? "#b45309" : "#64748b"};">${slowQuestions.length} questions</span>
      </div>
      ${
        (attempt.alteredCount || 0) > 0
          ? `
      <div class="stat-row" style="border-top:1px dashed #cbd5e1;padding-top:2px;margin-top:2px;">
        <span class="stat-label">Answers Revised:</span>
        <span class="stat-val">${attempt.alteredCount} (${attempt.alteredBenefitCount || 0} beneficial, ${attempt.alteredHarmCount || 0} harmful)</span>
      </div>`
          : ""
      }
    </div>
  </div>

  ${attempt.generalNotes?.trim() ? `<div class="general-note"><strong>Candidate Notes:</strong> ${attempt.generalNotes.trim()}</div>` : ""}

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
    <div class="section-title" style="margin-bottom:0;">Question-by-Question Evaluation Sheet (${attempt.totalQuestions} Questions)</div>
    <div style="font-size:9.5px;color:#64748b;font-weight:600;">Correct: +${correctMarksPerQ}m | Negative: -${incorrectMarksPerQ}m</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:42px;">Q#</th>
        <th style="width:55px;">Tag</th>
        <th style="width:68px;">Result</th>
        <th style="width:72px;">Candidate Ans</th>
        <th style="width:72px;">Answer Key</th>
        <th style="width:48px;">Marks</th>
        <th style="width:44px;">Time</th>
        <th>Explanation &amp; Candidate Notes</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    <span>Candidate Assessment Record</span>
    <span>Attempt Ref: ${attempt.id}</span>
  </div>

  <script>
    (function() {
      var triggered = false;
      function doPrint() {
        if (triggered) return;
        triggered = true;
        try {
          window.focus();
          window.print();
        } catch(e) {}
      }

      if (document.readyState === 'complete') {
        setTimeout(doPrint, 250);
      } else {
        window.addEventListener('load', function() {
          setTimeout(doPrint, 250);
        });
        setTimeout(doPrint, 1000);
      }
    })();
  </script>
</body>
</html>`;

  try {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    } else {
      // Fallback: popup blocked by browser
      window.print();
    }
  } catch (err) {
    console.error(
      "exportAttemptAsPrintPDF error, falling back to window.print():",
      err,
    );
    window.print();
  }
}

/**
 * Opens a generated PDF for a Markdown question paper in a new browser tab.
 * Markdown papers use a local marker instead of a downloadable PDF URL, so
 * they are laid out directly from their persisted questions here.
 */
export function exportQuestionPaperAsPDF(paper: QuestionPaper): void {
  const questions = paper.parsedQuestions?.length
    ? paper.parsedQuestions
    : paper.markdownContent
      ? parseQuestionnaireMarkdown(paper.markdownContent)
      : [];

  if (questions.length === 0) {
    window.alert(
      "This Markdown paper has no parsed questions available to export.",
    );
    return;
  }

  const header = paper.markdownContent
    ? parseMarkdownHeader(paper.markdownContent)
    : undefined;
  const title = stripMarkdownFormatting(
    paper.title || paper.label || header?.exam || "Question Paper",
  );
  const instructions = paper.instructions?.length
    ? paper.instructions
    : header?.instructions || [];

  // Open the tab during the user gesture. Generating a multi-page PDF first
  // can otherwise make browsers treat the later open as an unsolicited popup.
  const pdfWindow = window.open("", "_blank");
  if (pdfWindow) {
    pdfWindow.opener = null;
    pdfWindow.document.title = "Preparing question paper PDF";
    pdfWindow.document.body.textContent = "Preparing PDF…";
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const normalizeText = (value: string) =>
    stripMarkdownFormatting(value)
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[–—]/g, "-")
      .replace(/•/g, "-")
      .replace(/₹/g, "Rs.");

  const getLineHeight = (fontSize: number) =>
    Math.max(3.8, fontSize * 0.3528 * 1.35);

  const wrap = (value: string, width: number, fontSize: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(normalizeText(value), width) as string[];
  };

  const drawLines = (
    lines: string[],
    x: number,
    startY: number,
    fontSize: number,
    color: [number, number, number],
    weight: "normal" | "bold" = "normal",
  ) => {
    const lineHeight = getLineHeight(fontSize);
    doc.setFont("helvetica", weight);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    lines.forEach((line, index) => {
      doc.text(line, x, startY + index * lineHeight);
    });
    return lines.length * lineHeight;
  };

  const addPage = () => {
    doc.addPage();
    y = margin;
    const pageTitleLines = wrap(title, contentWidth, 9);
    drawLines(pageTitleLines, margin, y, 9, [71, 85, 105], "bold");
    y += pageTitleLines.length * getLineHeight(9);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
  };

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - margin) addPage();
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  const titleLines = wrap(title, contentWidth, 16);
  y += drawLines(titleLines, margin, y, 16, [15, 23, 42], "bold") + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${questions.length} questions  |  ${paper.totalMarks} marks  |  ${paper.timeMinutes} minutes`,
    margin,
    y,
  );
  y += 5;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.2);
  y += 9;

  if (instructions.length > 0) {
    const instructionLines = instructions.flatMap((instruction) => {
      const lines = wrap(instruction, contentWidth - 14, 9);
      return lines.length
        ? [`- ${lines[0]}`, ...lines.slice(1).map((line) => `  ${line}`)]
        : [];
    });
    const instructionLineHeight = getLineHeight(9);
    const boxHeight = 11 + instructionLines.length * instructionLineHeight + 4;
    ensureSpace(boxHeight + 7);
    doc.setFillColor(248, 251, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.text("INSTRUCTIONS", margin + 4, y + 6);
    drawLines(instructionLines, margin + 4, y + 11, 9, [51, 65, 85]);
    y += boxHeight + 7;
  }

  const drawOption = (
    letter: string,
    value: string,
    x: number,
    rowY: number,
    width: number,
    height: number,
  ) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, rowY, width, height, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(letter, x + 4, rowY + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    drawLines(wrap(value, width - 14, 9), x + 11, rowY + 6, 9, [30, 41, 59]);
  };

  for (const question of questions) {
    const questionFontSize = 10;
    const optionFontSize = 9;
    const questionTextLines = question.text
      .split(/\r?\n/)
      .flatMap((paragraph) =>
        paragraph.trim()
          ? wrap(paragraph, contentWidth - 13, questionFontSize)
          : [" "],
      );
    const optionEntries = Object.entries(question.options || {}).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    const optionWidth = (contentWidth - 6) / 2;
    const optionHeights = optionEntries.map(([, value]) =>
      Math.max(
        11,
        wrap(value, optionWidth - 14, optionFontSize).length *
          getLineHeight(optionFontSize) +
          7,
      ),
    );
    const questionHeight =
      questionTextLines.length * getLineHeight(questionFontSize) + 8;
    ensureSpace(questionHeight + 12);

    doc.setFont("helvetica", "bold");
    drawLines(
      [`Q${question.questionNo}`],
      margin,
      y + getLineHeight(questionFontSize),
      questionFontSize,
      [29, 78, 216],
      "bold",
    );
    const questionTextY = y + getLineHeight(questionFontSize);
    y =
      questionTextY +
      drawLines(
        questionTextLines,
        margin + 11,
        questionTextY,
        questionFontSize,
        [15, 23, 42],
        "bold",
      ) +
      3;

    for (let index = 0; index < optionEntries.length; index += 2) {
      const first = optionEntries[index];
      const second = optionEntries[index + 1];
      const rowHeight = Math.max(
        optionHeights[index],
        optionHeights[index + 1] || 0,
      );
      ensureSpace(rowHeight + 5);
      drawOption(first[0], first[1], margin, y, optionWidth, rowHeight);
      if (second) {
        drawOption(
          second[0],
          second[1],
          margin + optionWidth + 6,
          y,
          optionWidth,
          rowHeight,
        );
      }
      y += rowHeight + 4;
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
  }

  const pdfUrl = URL.createObjectURL(doc.output("blob"));
  if (pdfWindow) {
    pdfWindow.location.replace(pdfUrl);
  } else {
    // Popup blocking is controlled by the browser. Avoid interrupting the
    // assessment with a repeated alert when the browser declines the tab.
    console.warn("Question paper PDF tab was blocked by the browser.");
  }
  window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
}

/**
 * Opens a print-ready packet containing the question paper followed by the
 * assessment summary.
 */
export async function exportAttemptWithQuestionPaperAsPrintPDF(
  attempt: Attempt,
  paper: QuestionPaper,
  paperExplanations?: Record<number, string>,
  displayTitleOverride?: string,
  maxScoreOverride?: number,
): Promise<void> {
  let questionPaperHtml = "";
  const markdownQuestions =
    paper.parsedQuestions && paper.parsedQuestions.length > 0
      ? paper.parsedQuestions
      : paper.markdownContent
        ? parseQuestionnaireMarkdown(paper.markdownContent)
        : [];

  if (markdownQuestions.length > 0) {
    questionPaperHtml = buildMarkdownQuestionPaperHtml(
      paper,
      markdownQuestions,
    );
  } else {
    questionPaperHtml = await buildUploadedPdfQuestionPaperHtml(paper);
  }

  exportAttemptAsPrintPDF(
    attempt,
    paperExplanations,
    displayTitleOverride,
    maxScoreOverride,
    questionPaperHtml,
  );
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
    console.warn(
      "Primary clipboard writeText failed, falling back to execCommand",
      err,
    );
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

export interface SyllabusExportOptions {
  title?: string;
  markdown?: string;
  filename?: string;
  action?: "download" | "open" | "print";
}

function normalizeSyllabusText(value: string): string {
  return stripMarkdownFormatting(value)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/•/g, "-")
    .replace(/₹/g, "Rs.")
    .replace(/[^\x00-\x7F]/g, " ");
}

function formatSyllabusDate(value?: string): string {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthIdx = parseInt(m, 10) - 1;
    return `${parseInt(d, 10)} ${months[monthIdx] || m} ${y}`;
  }
  return value;
}

function resolveSyllabusTitle(
  items: SyllabusItem[],
  options?: SyllabusExportOptions,
): string {
  if (options?.title?.trim()) return options.title.trim();
  if (options?.markdown) {
    const firstHeading = options.markdown
      .split(/\r?\n/)
      .find((line) => /^#{1,3}\s+/.test(line));
    if (firstHeading) {
      const match = firstHeading
        .replace(/^#{1,3}\s+/, "")
        .replace(/\s+\[\d{1,2}\s+[A-Za-z]+\s+\d{4}\]\s*$/, "")
        .trim();
      if (match) return match;
    }
  }
  const root = items.find((item) => !item.parentId);
  if (root && root.title) return root.title;
  return "UPSC CSE Syllabus Tracker";
}

/**
 * Exports the user's custom syllabus as a beautifully designed vector PDF document.
 * Includes executive study metrics, visual progress bar, and hierarchical checklist with due dates.
 */
export function exportSyllabusAsPDF(
  items: SyllabusItem[],
  options?: SyllabusExportOptions,
): void {
  if (!items || items.length === 0) {
    if (typeof window !== "undefined") {
      window.alert("There are no syllabus items available to export.");
    }
    return;
  }

  if (options?.action === "print") {
    exportSyllabusAsPrintPDF(items, options);
    return;
  }

  const displayTitle = resolveSyllabusTitle(items, options);
  const progress = getSyllabusProgress(items);
  const pace = getSyllabusPace(items);
  const remainingTopics = Math.max(progress.total - progress.completed, 0);

  const safeTitle = displayTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const dateStr = new Date().toISOString().split("T")[0];
  const filename =
    options?.filename || `${safeTitle || "syllabus"}_tracker_${dateStr}.pdf`;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const contentBottom = pageHeight - margin - 8;
  let y = margin;

  const COLORS = {
    primary: [37, 99, 235] as [number, number, number],
    primaryDark: [30, 58, 138] as [number, number, number],
    primaryLight: [239, 246, 255] as [number, number, number],
    slateDark: [15, 23, 42] as [number, number, number],
    slateText: [30, 41, 59] as [number, number, number],
    slateMuted: [100, 116, 139] as [number, number, number],
    slateLight: [248, 250, 252] as [number, number, number],
    border: [203, 213, 225] as [number, number, number],
    borderLight: [226, 232, 240] as [number, number, number],
    divider: [241, 245, 249] as [number, number, number],
    emerald: [5, 150, 105] as [number, number, number],
    emeraldDark: [4, 120, 87] as [number, number, number],
    emeraldLight: [236, 253, 245] as [number, number, number],
    amber: [217, 119, 6] as [number, number, number],
    amberDark: [180, 83, 9] as [number, number, number],
    amberLight: [254, 243, 199] as [number, number, number],
  };

  const paceLabels = {
    leading: "Ahead of pace",
    "on-track": "On track",
    lagging: "Needs attention",
    "no-date": "No dates set",
  } as const;

  const getLineHeight = (fontSize: number) =>
    Math.max(3.8, fontSize * 0.3528 * 1.35);

  const wrap = (value: string, width: number, fontSize: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(normalizeSyllabusText(value), width) as string[];
  };

  const addPage = () => {
    doc.addPage();
    y = margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.slateMuted);
    doc.text(normalizeSyllabusText(displayTitle).toUpperCase(), margin, y + 3);

    const subHeader = "SYLLABUS & STUDY TRACKER";
    const subHeaderWidth = doc.getTextWidth(subHeader);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(subHeader, pageWidth - margin - subHeaderWidth, y + 3);

    doc.setDrawColor(...COLORS.borderLight);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 5.5, pageWidth - margin, y + 5.5);
    y += 10;
  };

  const ensureSpace = (height: number) => {
    if (y + height > contentBottom) {
      addPage();
    }
  };

  // 1. Header Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.primary);
  doc.text(
    "CIVIL SERVICES EXAMINATION (CSE)  |  STUDY PLAN & SYLLABUS TRACKER",
    margin,
    y + 2.5,
  );
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.slateDark);
  const titleLines = wrap(displayTitle, contentWidth, 16);
  titleLines.forEach((line) => {
    doc.text(line, margin, y + 4.5);
    y += getLineHeight(16);
  });
  y += 1;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.slateMuted);
  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
  doc.text(
    `Generated on ${formattedDate}  ·  ${progress.total} leaf topics  ·  ${progress.completed} completed  ·  ${remainingTopics} remaining`,
    margin,
    y + 2.5,
  );
  y += 6;

  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.2);
  y += 5;

  // 2. Executive Progress Dashboard Box
  const cardHeight = 24;
  ensureSpace(cardHeight + 6);

  doc.setFillColor(...COLORS.slateLight);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, "FD");

  const colWidth = contentWidth / 4;

  // Col 1: Progress %
  let colX = margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.slateMuted);
  doc.text("COMPLETION", colX + 4, y + 5);
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.primary);
  doc.text(`${progress.percentage}%`, colX + 4, y + 10.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slateMuted);
  doc.text(
    `${progress.completed} / ${progress.total} topics`,
    colX + 4,
    y + 14.5,
  );

  // Col 2: Remaining Topics
  colX += colWidth;
  doc.setDrawColor(...COLORS.borderLight);
  doc.line(colX, y + 3, colX, y + cardHeight - 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.slateMuted);
  doc.text("REMAINING", colX + 4, y + 5);
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.slateDark);
  doc.text(`${remainingTopics}`, colX + 4, y + 10.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slateMuted);
  doc.text("topics to finish", colX + 4, y + 14.5);

  // Col 3: Dated Targets
  colX += colWidth;
  doc.line(colX, y + 3, colX, y + cardHeight - 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.slateMuted);
  doc.text("DATED TARGETS", colX + 4, y + 5);
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.slateDark);
  doc.text(`${pace.datedTopics}`, colX + 4, y + 10.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slateMuted);
  doc.text(`${pace.completedTopics} finished`, colX + 4, y + 14.5);

  // Col 4: Study Pace
  colX += colWidth;
  doc.line(colX, y + 3, colX, y + cardHeight - 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.slateMuted);
  doc.text("STUDY PACE", colX + 4, y + 5);
  doc.setFontSize(10.5);
  const paceColor =
    pace.status === "leading" || pace.status === "on-track"
      ? COLORS.emeraldDark
      : pace.status === "lagging"
        ? COLORS.amberDark
        : COLORS.slateMuted;
  doc.setTextColor(...paceColor);
  doc.text(paceLabels[pace.status] || "On track", colX + 4, y + 10.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slateMuted);
  const paceSub = pace.overdueTopics
    ? `${pace.overdueTopics} overdue`
    : pace.datedTopics
      ? "All on schedule"
      : "No target dates";
  doc.text(paceSub, colX + 4, y + 14.5);

  // Progress Bar
  const barX = margin + 4;
  const barY = y + 17.5;
  const barWidth = contentWidth - 8;
  const barHeight = 2.8;

  doc.setFillColor(...COLORS.borderLight);
  doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, "F");

  if (progress.percentage > 0) {
    const fillWidth = Math.max(2, (barWidth * progress.percentage) / 100);
    const fillColor =
      progress.percentage === 100 ? COLORS.emerald : COLORS.primary;
    doc.setFillColor(...fillColor);
    doc.roundedRect(barX, barY, fillWidth, barHeight, 1, 1, "F");
  }

  y += cardHeight + 6;

  // 3. Section Divider & Legend
  ensureSpace(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.slateDark);
  doc.text("SYLLABUS OUTLINE & COMPLETION RECORD", margin, y + 3);

  const legend = "[v] Done   [ ] Incomplete   ! Overdue";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.slateMuted);
  const legendWidth = doc.getTextWidth(legend);
  doc.text(legend, pageWidth - margin - legendWidth, y + 3);

  y += 5.5;
  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;

  // 4. Build Tree
  const childrenByParent = new Map<string | null, SyllabusItem[]>();
  items.forEach((item) => {
    const pId = item.parentId || null;
    const list = childrenByParent.get(pId) || [];
    list.push(item);
    childrenByParent.set(pId, list);
  });
  childrenByParent.forEach((list) => list.sort((a, b) => a.order - b.order));

  const itemsById = new Map<string, SyllabusItem>(
    items.map((it) => [it.id, it]),
  );
  const rootItems = items
    .filter((it) => !it.parentId || !itemsById.has(it.parentId))
    .sort((a, b) => a.order - b.order);

  const getDescendantLeaves = (item: SyllabusItem): SyllabusItem[] => {
    const children = childrenByParent.get(item.id) || [];
    if (!children.length) return [item];
    return children.flatMap(getDescendantLeaves);
  };

  const renderItem = (item: SyllabusItem, depth = 0) => {
    const children = childrenByParent.get(item.id) || [];
    const isParent = children.length > 0;
    const isCompleted = getSyllabusCompletion(item, items);
    const effectiveDueDate = getEffectiveSyllabusDueDate(item, items);
    const dateStatus = getSyllabusItemDateStatus(item, items);

    if (depth === 0 && isParent) {
      // Major Section Banner
      const leaves = getDescendantLeaves(item);
      const uniqueLeaves = Array.from(
        new Map(leaves.map((l) => [getSyllabusTopicKey(l), l])).values(),
      );
      const completedLeaves = uniqueLeaves.filter((l) =>
        getSyllabusCompletion(l, items),
      ).length;
      const sectionPct = uniqueLeaves.length
        ? Math.round((completedLeaves / uniqueLeaves.length) * 100)
        : 0;

      const bannerHeight = 8;
      ensureSpace(bannerHeight + 4);

      doc.setFillColor(...COLORS.primaryLight);
      doc.setDrawColor(...COLORS.borderLight);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, bannerHeight, 1.5, 1.5, "FD");

      // Blue accent on left
      doc.setFillColor(...COLORS.primary);
      doc.roundedRect(margin, y, 2.5, bannerHeight, 1, 1, "F");

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...COLORS.primaryDark);
      doc.text(normalizeSyllabusText(item.title), margin + 5, y + 5.2);

      // Status on right
      const statText = `${completedLeaves}/${uniqueLeaves.length} topics (${sectionPct}%)`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.slateMuted);
      const statWidth = doc.getTextWidth(statText);
      doc.text(statText, pageWidth - margin - 4 - statWidth, y + 5.2);

      y += bannerHeight + 2.5;
    } else {
      // Topic row
      const indent = Math.min(depth * 4.5, 20);
      const itemX = margin + indent;

      // Badges width
      const hasDateOrStatus = Boolean(effectiveDueDate || isCompleted);
      const rightReserved = hasDateOrStatus ? 44 : 0;
      const titleMaxWidth = contentWidth - indent - 6 - rightReserved;

      const titleLines = wrap(item.title, titleMaxWidth, 8.5);
      const titleHeight = titleLines.length * getLineHeight(8.5);
      const notesLines = item.notes ? wrap(item.notes, titleMaxWidth, 7.5) : [];
      const notesHeight = notesLines.length * getLineHeight(7.5);

      const rowHeight = Math.max(
        5.5,
        titleHeight + (notesLines.length ? notesHeight + 1 : 0),
      );
      ensureSpace(rowHeight + 2);

      // Checkbox
      const boxSize = 3;
      const boxY = y + 0.6;
      if (isCompleted) {
        doc.setFillColor(...COLORS.emerald);
        doc.setDrawColor(...COLORS.emeraldDark);
        doc.setLineWidth(0.2);
        doc.roundedRect(itemX, boxY, boxSize, boxSize, 0.5, 0.5, "FD");

        // White checkmark
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.4);
        doc.line(itemX + 0.7, boxY + 1.5, itemX + 1.3, boxY + 2.3);
        doc.line(itemX + 1.3, boxY + 2.3, itemX + 2.4, boxY + 0.8);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.3);
        doc.roundedRect(itemX, boxY, boxSize, boxSize, 0.5, 0.5, "FD");
      }

      // Title
      const textX = itemX + 4.5;
      doc.setFont("helvetica", isParent ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(
        ...(isCompleted
          ? COLORS.slateMuted
          : isParent
            ? COLORS.slateDark
            : COLORS.slateText),
      );

      titleLines.forEach((line, idx) => {
        doc.text(line, textX, y + 3 + idx * getLineHeight(8.5));
      });

      // Notes
      if (notesLines.length > 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.slateMuted);
        const notesStartY = y + 3 + titleHeight + 0.5;
        notesLines.forEach((line, idx) => {
          doc.text(line, textX, notesStartY + idx * getLineHeight(7.5));
        });
      }

      // Right-side Badges
      if (hasDateOrStatus) {
        let badgeLabel = "";
        let badgeBg = COLORS.slateLight;
        let badgeText = COLORS.slateMuted;
        let badgeBorder = COLORS.borderLight;

        if (isCompleted) {
          badgeLabel = "Done";
          badgeBg = COLORS.emeraldLight;
          badgeText = COLORS.emeraldDark;
          badgeBorder = COLORS.emerald;
        } else if (dateStatus === "lagging") {
          badgeLabel = "Overdue";
          badgeBg = COLORS.amberLight;
          badgeText = COLORS.amberDark;
          badgeBorder = COLORS.amber;
        } else if (dateStatus === "leading") {
          badgeLabel = "Ahead";
          badgeBg = COLORS.emeraldLight;
          badgeText = COLORS.emeraldDark;
          badgeBorder = COLORS.emerald;
        } else if (dateStatus === "on-track") {
          badgeLabel = "On pace";
          badgeBg = COLORS.primaryLight;
          badgeText = COLORS.primary;
          badgeBorder = COLORS.primary;
        }

        // Render due date
        const badgeX = pageWidth - margin - 18;
        if (effectiveDueDate) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...COLORS.slateMuted);
          const dateStr = formatSyllabusDate(effectiveDueDate);
          const dateWidth = doc.getTextWidth(dateStr);
          doc.text(dateStr, badgeX - dateWidth - 3, y + 3);
        }

        // Render badge pill
        if (badgeLabel) {
          doc.setFillColor(...badgeBg);
          doc.setDrawColor(...badgeBorder);
          doc.setLineWidth(0.2);
          doc.roundedRect(badgeX, y + 0.5, 18, 3.8, 1, 1, "FD");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(...badgeText);
          const bw = doc.getTextWidth(badgeLabel);
          doc.text(badgeLabel, badgeX + (18 - bw) / 2, y + 3.1);
        }
      }

      // Hairline row divider
      doc.setDrawColor(...COLORS.divider);
      doc.setLineWidth(0.2);
      doc.line(itemX, y + rowHeight + 1, pageWidth - margin, y + rowHeight + 1);

      y += rowHeight + 2;
    }

    // Children
    children.forEach((child) => renderItem(child, depth + 1));
  };

  rootItems.forEach((root) => renderItem(root, 0));

  // Footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    const footerY = 289;
    doc.setDrawColor(...COLORS.borderLight);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 2.5, pageWidth - margin, footerY - 2.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.slateMuted);
    doc.text(
      "UPSC CSE Practice System · Syllabus Tracker",
      margin,
      footerY + 1,
    );

    const pageStr = `Page ${pageNum} of ${totalPages}`;
    const pageStrWidth = doc.getTextWidth(pageStr);
    doc.text(pageStr, pageWidth - margin - pageStrWidth, footerY + 1);
  }

  if (options?.action === "open") {
    const blob = doc.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    const pdfWindow = window.open(blobUrl, "_blank");
    if (!pdfWindow) {
      doc.save(filename);
    } else {
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    }
  } else {
    doc.save(filename);
  }
}

/**
 * Generates a clean standalone HTML print view for the syllabus and triggers the browser print dialog.
 */
export function exportSyllabusAsPrintPDF(
  items: SyllabusItem[],
  options?: SyllabusExportOptions,
): void {
  if (!items || items.length === 0) {
    if (typeof window !== "undefined") {
      window.alert("There are no syllabus items available to export.");
    }
    return;
  }

  const displayTitle = resolveSyllabusTitle(items, options);
  const progress = getSyllabusProgress(items);
  const pace = getSyllabusPace(items);
  const remainingTopics = Math.max(progress.total - progress.completed, 0);

  const paceLabels = {
    leading: "Ahead of pace",
    "on-track": "On track",
    lagging: "Needs attention",
    "no-date": "No dates set",
  } as const;

  const paceClass = {
    leading: "badge-leading",
    "on-track": "badge-ontrack",
    lagging: "badge-lagging",
    "no-date": "badge-nodate",
  }[pace.status];

  // Organize hierarchy
  const childrenByParent = new Map<string | null, SyllabusItem[]>();
  items.forEach((item) => {
    const pId = item.parentId || null;
    const list = childrenByParent.get(pId) || [];
    list.push(item);
    childrenByParent.set(pId, list);
  });
  childrenByParent.forEach((list) => list.sort((a, b) => a.order - b.order));

  const itemsById = new Map<string, SyllabusItem>(
    items.map((it) => [it.id, it]),
  );
  const rootItems = items
    .filter((it) => !it.parentId || !itemsById.has(it.parentId))
    .sort((a, b) => a.order - b.order);

  const getDescendantLeaves = (item: SyllabusItem): SyllabusItem[] => {
    const children = childrenByParent.get(item.id) || [];
    if (!children.length) return [item];
    return children.flatMap(getDescendantLeaves);
  };

  const renderTreeHtml = (node: SyllabusItem, depth = 0): string => {
    const children = childrenByParent.get(node.id) || [];
    const isParent = children.length > 0;
    const isCompleted = getSyllabusCompletion(node, items);
    const effectiveDueDate = getEffectiveSyllabusDueDate(node, items);
    const dateStatus = getSyllabusItemDateStatus(node, items);

    let rowHtml = "";

    if (depth === 0 && isParent) {
      const leaves = getDescendantLeaves(node);
      const uniqueLeaves = Array.from(
        new Map(leaves.map((l) => [getSyllabusTopicKey(l), l])).values(),
      );
      const completedLeaves = uniqueLeaves.filter((l) =>
        getSyllabusCompletion(l, items),
      ).length;
      const sectionPct = uniqueLeaves.length
        ? Math.round((completedLeaves / uniqueLeaves.length) * 100)
        : 0;

      rowHtml = `<div class="section-banner">
        <span class="section-banner-title">${escapeHtml(node.title)}</span>
        <span class="section-banner-stats">${completedLeaves}/${uniqueLeaves.length} topics (${sectionPct}%)</span>
      </div>`;
    } else {
      const indentPx = Math.min(depth * 16, 64);
      let badgeLabel = "";
      let badgeClass = "";

      if (isCompleted) {
        badgeLabel = "Done";
        badgeClass = "badge-leading";
      } else if (dateStatus === "lagging") {
        badgeLabel = "Overdue";
        badgeClass = "badge-lagging";
      } else if (dateStatus === "leading") {
        badgeLabel = "Ahead";
        badgeClass = "badge-leading";
      } else if (dateStatus === "on-track") {
        badgeLabel = "On pace";
        badgeClass = "badge-ontrack";
      }

      const dueDateHtml = effectiveDueDate
        ? `<span class="topic-duedate">Due ${formatSyllabusDate(effectiveDueDate)}</span>`
        : "";
      const badgeHtml = badgeLabel
        ? `<span class="topic-badge ${badgeClass}">${badgeLabel}</span>`
        : "";
      const notesHtml = node.notes
        ? `<div class="topic-notes">${escapeHtml(node.notes)}</div>`
        : "";

      rowHtml = `<div class="topic-row ${isCompleted ? "topic-completed" : ""}" style="padding-left: ${indentPx}px;">
        <div class="topic-check ${isCompleted ? "checked" : ""}">
          ${isCompleted ? "✓" : ""}
        </div>
        <div class="topic-content">
          <div class="topic-title ${isParent ? "topic-parent-title" : ""}">${escapeHtml(node.title)}</div>
          ${notesHtml}
        </div>
        <div class="topic-meta">
          ${dueDateHtml}
          ${badgeHtml}
        </div>
      </div>`;
    }

    const childrenHtml = children
      .map((child) => renderTreeHtml(child, depth + 1))
      .join("");
    return rowHtml + childrenHtml;
  };

  const treeRows = rootItems.map((root) => renderTreeHtml(root, 0)).join("");

  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(displayTitle)} — Syllabus Tracker</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11px;
      color: #0f172a;
      background: #fff;
      padding: 10mm;
    }
    .header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header-sub {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #2563eb;
      margin-bottom: 3px;
    }
    .header-title {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .header-meta {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 500;
    }
    .dashboard {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      padding: 10px 12px;
      margin-bottom: 14px;
    }
    .widgets {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }
    .widget {
      text-align: left;
    }
    .widget-label {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 2px;
    }
    .widget-value {
      font-size: 16px;
      font-weight: 900;
      font-family: monospace;
      color: #0f172a;
    }
    .widget-sub {
      font-size: 8.5px;
      color: #64748b;
    }
    .progress-bar-track {
      width: 100%;
      height: 7px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: #2563eb;
      border-radius: 4px;
    }
    .section-divider {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .section-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #334155;
    }
    .section-legend {
      font-size: 8.5px;
      color: #64748b;
    }
    .section-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-left: 4px solid #2563eb;
      border-radius: 6px;
      padding: 6px 10px;
      margin-top: 10px;
      margin-bottom: 4px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .section-banner-title {
      font-size: 11px;
      font-weight: 800;
      color: #1e3a8a;
    }
    .section-banner-stats {
      font-size: 9.5px;
      font-weight: 600;
      color: #64748b;
    }
    .topic-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 4px 6px;
      border-bottom: 1px solid #f1f5f9;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .topic-completed .topic-title {
      color: #94a3b8;
      text-decoration: line-through;
    }
    .topic-check {
      width: 12px;
      height: 12px;
      border: 1.5px solid #cbd5e1;
      border-radius: 3px;
      display: grid;
      place-items: center;
      font-size: 9px;
      font-weight: 900;
      line-height: 1;
      margin-top: 1px;
      color: #fff;
      shrink: 0;
    }
    .topic-check.checked {
      background: #059669;
      border-color: #047857;
    }
    .topic-content {
      flex: 1;
      min-width: 0;
    }
    .topic-title {
      font-size: 10.5px;
      line-height: 1.35;
      color: #0f172a;
    }
    .topic-parent-title {
      font-weight: 700;
      color: #1e293b;
    }
    .topic-notes {
      font-size: 9px;
      font-style: italic;
      color: #64748b;
      margin-top: 1px;
    }
    .topic-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      shrink: 0;
    }
    .topic-duedate {
      font-size: 9px;
      color: #64748b;
    }
    .topic-badge {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 1.5px 5px;
      border-radius: 4px;
      border: 1px solid transparent;
    }
    .badge-leading {
      background: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }
    .badge-ontrack {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }
    .badge-lagging {
      background: #fef2f2;
      color: #b91c1c;
      border-color: #fecaca;
    }
    .badge-nodate {
      background: #f8fafc;
      color: #64748b;
      border-color: #e2e8f0;
    }
    .footer {
      font-size: 8.5px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      margin-top: 16px;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 8mm 10mm; size: auto; }
      .section-banner, .topic-row { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-sub">Civil Services Examination (CSE) · Study Plan</div>
    <div class="header-title">${escapeHtml(displayTitle)}</div>
    <div class="header-meta">Generated on ${formattedDate} · ${progress.total} leaf topics · ${progress.completed} completed · ${remainingTopics} remaining</div>
  </div>

  <div class="dashboard">
    <div class="widgets">
      <div class="widget">
        <div class="widget-label">Completion</div>
        <div class="widget-value" style="color:#2563eb;">${progress.percentage}%</div>
        <div class="widget-sub">${progress.completed} of ${progress.total} topics</div>
      </div>
      <div class="widget">
        <div class="widget-label">Remaining</div>
        <div class="widget-value">${remainingTopics}</div>
        <div class="widget-sub">topics to finish</div>
      </div>
      <div class="widget">
        <div class="widget-label">Dated Targets</div>
        <div class="widget-value">${pace.datedTopics}</div>
        <div class="widget-sub">${pace.completedTopics} finished</div>
      </div>
      <div class="widget">
        <div class="widget-label">Study Pace</div>
        <div class="widget-value">
          <span class="topic-badge ${paceClass}" style="font-size:10px;">${paceLabels[pace.status]}</span>
        </div>
        <div class="widget-sub">${pace.overdueTopics ? `${pace.overdueTopics} overdue topics` : "All on schedule"}</div>
      </div>
    </div>
    <div class="progress-bar-track">
      <div class="progress-bar-fill" style="width: ${progress.percentage}%;"></div>
    </div>
  </div>

  <div class="section-divider">
    <div class="section-title">Syllabus Outline &amp; Completion Record</div>
    <div class="section-legend">☑ Done &nbsp;|&nbsp; ☐ Incomplete &nbsp;|&nbsp; Overdue</div>
  </div>

  <div class="tree-list">
    ${treeRows}
  </div>

  <div class="footer">
    <span>UPSC CSE Practice System · Syllabus Tracker</span>
    <span>Candidate Study Record</span>
  </div>

  <script>
    (function() {
      var triggered = false;
      function doPrint() {
        if (triggered) return;
        triggered = true;
        try {
          window.focus();
          window.print();
        } catch(e) {}
      }

      if (document.readyState === 'complete') {
        setTimeout(doPrint, 250);
      } else {
        window.addEventListener('load', function() {
          setTimeout(doPrint, 250);
        });
        setTimeout(doPrint, 1000);
      }
    })();
  </script>
</body>
</html>`;

  try {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    } else {
      window.print();
    }
  } catch (err) {
    console.error(
      "exportSyllabusAsPrintPDF error, falling back to window.print():",
      err,
    );
    window.print();
  }
}

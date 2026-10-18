import { Attempt } from "./types";
import { formatDateTime, formatTimeSeconds } from "./defaults";

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
 * Generates a clean standalone HTML string for the print/PDF report.
 * Opened in a new window and auto-printed — bypasses CSS media query conflicts.
 */
export function exportAttemptAsPrintPDF(
  attempt: Attempt,
  paperExplanations?: Record<number, string>,
  displayTitleOverride?: string,
  maxScoreOverride?: number,
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

  const questionList = Array.from({ length: attempt.totalQuestions }, (_, i) => i + 1).map((qNo) => {
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

  const slowQuestions = questionList.filter((q) => (q.timeSpentSeconds || 0) >= 90);
  const avgTimeCorrect = attempt.avgTimeCorrect || 0;
  const avgTimeIncorrect = attempt.avgTimeIncorrect || 0;
  const penaltyDragPct = grossCorrectMarks > 0
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
      ${(attempt.alteredCount || 0) > 0 ? `
      <div class="stat-row" style="border-top:1px dashed #cbd5e1;padding-top:2px;margin-top:2px;">
        <span class="stat-label">Answers Revised:</span>
        <span class="stat-val">${attempt.alteredCount} (${attempt.alteredBenefitCount || 0} beneficial, ${attempt.alteredHarmCount || 0} harmful)</span>
      </div>` : ""}
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
    setTimeout(function() {
      try {
        window.focus();
        window.print();
      } catch(e) {}
    }, 300);
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
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.warn("Print popup auto-trigger failed:", e);
        }
      }, 350);
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

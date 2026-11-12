import { RevisionContext } from "./types";

/**
 * Builds an authentic, high-yield diagnostic performance dossier from the student's paper attempt.
 */
export function generatePaperPerformanceReport(
  context: RevisionContext,
): string {
  const summary = context.attemptSummary;
  const paperTitle = context.paperTitle || "Question Paper";

  if (!summary) {
    return `### 📊 Performance Summary: ${paperTitle}

> [!NOTE]
> **No attempt recorded yet for this paper.**
> 
> Solve this paper in Practice or Mock mode from the **Papers** library first. As soon as you submit or record an attempt, ask me:
> - *"How much score did I get?"*
> - *"What were my mistakes in this paper?"*
> - *"Which questions did I get wrong?"*
> 
> I will generate an instant diagnostic analysis with your marks, accuracy, negative mark deductions, and question-by-question trap breakdowns.`;
  }

  const dateStr = summary.completedAt
    ? new Date(summary.completedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Recent Attempt";

  const negativeMarksLost = (summary.incorrectCount * 0.66).toFixed(1);

  let report = `### 📊 Diagnostic Performance Dossier: ${paperTitle}

> [!NOTE]
> **Attempt Recorded**: ${dateStr} • **Paper Total**: ${summary.totalMarks} Marks

| Exam Metric | Your Result | UPSC Prelims Benchmark |
| :--- | :--- | :--- |
| **Total Score** | **${summary.score}** / ${summary.totalMarks} | > 55–60% (Safe Cutoff Zone) |
| **Accuracy** | **${summary.accuracy}%** | > 75% for high strike rate |
| **Correct Answers** | **${summary.correctCount}** | Foundation for clearing cutoff |
| **Incorrect Answers** | **${summary.incorrectCount}** (Lost ~${negativeMarksLost} marks) | Target: Keep under 12–15% |
| **Unattempted** | **${summary.unansweredCount}** | Judicious risk management |

---

#### 1. Strategic Performance Analysis
- **Cutoff Proximity**: With a score of **${summary.score}** (${Math.round((summary.score / (summary.totalMarks || 1)) * 100)}%), evaluate whether your attempt strategy was overly cautious or excessively speculative.
- **Negative Mark Leakage**: You forfeited approximately **${negativeMarksLost} marks** due to negative marking. In UPSC GS Paper I, saving 4–5 negative marks is often the single determining factor in qualifying for Mains.
- **Accuracy Calibration**: At **${summary.accuracy}% accuracy**, focus on eliminating 50:50 dilemmas through structural elimination rather than intuitive guessing.`;

  if (summary.wrongQuestions && summary.wrongQuestions.length > 0) {
    report += `\n\n#### 2. Detailed Question-by-Question Mistake Audit\n`;
    summary.wrongQuestions.slice(0, 8).forEach((w) => {
      report += `\n- **Question #${w.questionNo}**: ${w.text.slice(0, 120)}${w.text.length > 120 ? "..." : ""}
  - **Your Selection**: \`${w.studentSelected || "Marked"}\`
  - **Official Answer**: \`${w.correctAnswer || "Answer Key"}\`
  - *Revision Takeaway*: Review the core statutory / constitutional nuance of this question to avoid repeat traps.`;
    });

    if (summary.wrongQuestions.length > 8) {
      report += `\n\n*+ ${summary.wrongQuestions.length - 8} additional questions answered incorrectly. Review each in the question selector above.*`;
    }
  }

  report += `\n\n\`\`\`mermaid
flowchart TD
    A["Attempt: ${paperTitle}"] --> B["Score: ${summary.score} / ${summary.totalMarks}"]
    A --> C["Accuracy: ${summary.accuracy}%"]
    B --> D["Negative Marks: -${negativeMarksLost}"]
    C --> E["Revision Drill: Weak Topics"]
    D --> F["Elimination Discipline"]
\`\`\`

> [!TIP]
> **Action Plan for Next Attempt**:
> 1. Select specific questions from the dropdown above to dissect the exact elimination logic.
> 2. Use **"Grill on Prelims"** below to practice high-yield MCQs on the topics where mistakes occurred.
> 3. Maintain an error log of questions lost to *conceptual gaps* vs *careless reading*.`;

  return report;
}

/**
 * Builds a comprehensive question dissection summary for active exam questions.
 */
export function generateQuestionDissection(context: RevisionContext): string {
  const q = context.question;
  if (!q) return "";

  const optionsText = q.options
    ? Object.entries(q.options)
        .map(([k, v]) => `- **(${k})**: ${v}`)
        .join("\n")
    : "";

  return `### 🏛️ Question #${q.questionNo} Dissection: ${q.topic || "UPSC High-Yield Topic"}

**Question Prompt**:
> ${q.text}

${optionsText ? `\n**Options**:\n${optionsText}\n` : ""}

#### 1. Official Answer Key: **Option (${q.answer || "Official Key"})**
${q.explanation ? `\n**Official Explanation**:\n${q.explanation}\n` : ""}

#### 2. Prelims Elimination Technique
- **Statement Deconstruction**: Identify whether each statement contains absolute words (*only, all, solely, mandatory*) or qualified words (*generally, may, can*).
- **Subtle Distinctions**: Watch for deliberate swaps between **statutory bodies** (e.g. NHRC, CVC) and **constitutional bodies** (e.g. Finance Commission, Election Commission).

${context.userAnswer ? `> [!NOTE]\n> **Your Response in Latest Attempt**: Selected **(${context.userAnswer.selected || "Unattempted"})** — ${context.userAnswer.isCorrect ? "Correct! ✅" : "Incorrect ❌. Review the trap above."}` : ""}

> [!WARNING]
> **Prelims Trap**: In multi-statement questions, eliminate the most definitively false statement first to reduce options from 4 to 2 immediately.`;
}

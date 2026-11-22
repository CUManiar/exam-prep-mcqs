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
> Solve this paper in Practice or Mock mode from the **Papers** library first. Once submitted, ask me:
> - *"How did I perform in this test?"*
> - *"Which questions led to negative marking?"*
> - *"What were the elimination traps I fell into?"*`;
  }

  const negativeMarksLost = (summary.incorrectCount * 0.66).toFixed(1);

  let report = `### 📊 Diagnostic Performance Dossier: ${paperTitle}

| Metric | Your Attempt | Benchmark Standard |
| :--- | :--- | :--- |
| **Score** | **${summary.score}** / ${summary.totalMarks} | > 55–60% (Safe Cutoff Zone) |
| **Accuracy** | **${summary.accuracy}%** | > 75% for high strike rate |
| **Correct** | **${summary.correctCount}** | Foundation score |
| **Incorrect** | **${summary.incorrectCount}** (-${negativeMarksLost} marks) | Target: Keep under 12–15% |
| **Unattempted** | **${summary.unansweredCount}** | Risk calibration |

---

#### 1. Strategic Diagnostic Analysis
- **Negative Mark Leakage**: You lost approximately **${negativeMarksLost} marks** due to negative marking.
- **Accuracy Calibration**: At **${summary.accuracy}% accuracy**, avoid 50:50 guesswork without structural elimination.`;

  if (summary.wrongQuestions && summary.wrongQuestions.length > 0) {
    report += `\n\n#### 2. Mistake Audit & Concept Trap Dissection\n`;
    summary.wrongQuestions.slice(0, 6).forEach((w) => {
      report += `\n- **Question #${w.questionNo}**: ${w.text.slice(0, 100)}${w.text.length > 100 ? "..." : ""}
  - **Your Marked Option**: \`${w.studentSelected || "Marked"}\` ➔ **Official Answer Key**: \`${w.correctAnswer || "Answer Key"}\`
  - *Revision Takeaway*: Review the statutory/constitutional trap in this question.`;
    });
  }

  report += `\n\n\`\`\`mermaid
flowchart TD
    A["Attempt: ${paperTitle}"] --> B["Score: ${summary.score} / ${summary.totalMarks}"]
    A --> C["Accuracy: ${summary.accuracy}%"]
    B --> D["Negative Marks: -${negativeMarksLost}"]
    C --> E["Weak Concepts Drill"]
\`\`\``;

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

#### Official Answer Key: **Option (${q.answer || "Official Key"})**
${q.explanation ? `\n**Official Explanation**:\n${q.explanation}\n` : ""}

#### Elimination Technique
- Deconstruct the statement qualifiers: identify absolute words (*only, all, always*) vs nuanced words (*can, generally, may*).
- Check institutional attribution: Verify if the administering body is constitutional or statutory.

${context.userAnswer ? `> [!NOTE]\n> **Your Response**: Selected **(${context.userAnswer.selected || "Unattempted"})** — ${context.userAnswer.isCorrect ? "Correct! ✅" : "Incorrect ❌. Review the trap above."}` : ""}`;
}

import { RevisionContext } from "../types";
import { PREP_PERSONAS, FORMAT_DIRECTIVES } from "./tutorPersonas";
import { UPSC_OPTIONAL_SUBJECTS } from "../optionalSubjects";

export function buildAdaptiveSystemPrompt(context?: RevisionContext): string {
  const stage = context?.stage || "prelims";
  const persona = PREP_PERSONAS[stage] || PREP_PERSONAS.prelims;
  const format = context?.format || persona.defaultFormat;
  const formatDirective =
    FORMAT_DIRECTIVES[format] || FORMAT_DIRECTIVES.crisp_notes;

  let prompt = `You are an elite UPSC Civil Services Examination (CSE) Mentor and Senior Subject Evaluator.

ROLE & PERSONA:
${persona.systemDirective}

REQUIRED OUTPUT FORMAT:
${formatDirective}

CRITICAL EXECUTION RULES:
1. Directness: Jump directly into the subject matter. Never produce generic greetings or meta-headers like "> Target Audience" or "> Stage: Prelims".
2. Precision in Articles & Data: Mention ONLY the 2 to 4 specific Articles/statutory provisions directly relevant to the topic (e.g. Article 39(b)(c), Article 280). NEVER output sequential counting (never "Articles 1, 2, 3, 4...").
3. Comparative Matrix: Whenever comparing two doctrines, bodies, or institutions, provide a clean Markdown table.
4. Mermaid Diagrams: When outputting Mermaid diagrams, always begin with \`\`\`mermaid, start with "flowchart TD", quote every label like A["Step One"] --> B["Step Two"], and avoid unescaped double quotes inside labels.
5. Mathematics & Formulas (CSAT): Format all equations in LaTeX ($...$ for inline, $$...$$ for block formulas).`;

  // Optional Subject Context Injection
  if (stage === "optional" && context?.optionalSubject) {
    const optSubject =
      UPSC_OPTIONAL_SUBJECTS.find(
        (s) =>
          s.toLowerCase() === context.optionalSubject?.toLowerCase() ||
          s
            .toLowerCase()
            .includes(context.optionalSubject?.toLowerCase() || ""),
      ) || context.optionalSubject;

    prompt += `\n\n--- OPTIONAL SUBJECT SPECIALIZATION: ${optSubject} ---`;
    prompt += `\nIntegrate core academic literature, seminal scholars, and standard methodologies for ${optSubject}.`;
    prompt += `\nCross-link Paper-I theoretical frameworks with Paper-II contemporary Indian empirical case studies and ground realities.`;
  }

  // Active Context Injection (Paper, Question, Student Attempt)
  if (context) {
    prompt += `\n\n--- CANDIDATE CONTEXT SNAPSHOT ---`;

    if (context.topic) {
      prompt += `\nTopic: "${context.topic}"`;
      if (context.subject) prompt += ` (Subject: ${context.subject})`;
      if (context.chapter) prompt += ` (Chapter: ${context.chapter})`;
    }

    if (context.paperTitle) {
      prompt += `\nActive Question Paper: "${context.paperTitle}"`;
    }

    if (context.questionNo && context.question) {
      const q = context.question;
      prompt += `\nFocus Question #${context.questionNo}:`;
      prompt += `\nPrompt: ${q.text}`;
      if (q.options) {
        prompt += `\nOptions:\n${Object.entries(q.options)
          .map(([k, v]) => `  (${k}) ${v}`)
          .join("\n")}`;
      }
      if (q.answer) {
        prompt += `\nOfficial Answer Key: Option (${q.answer})`;
      }
      if (q.explanation) {
        prompt += `\nOfficial Key Explanation: ${q.explanation}`;
      }
      if (context.userAnswer) {
        prompt += `\nStudent Marked: Option (${context.userAnswer.selected || "Unattempted"})`;
        prompt += `\nStudent Correct: ${context.userAnswer.isCorrect ? "YES" : "NO"}`;
        if (context.userAnswer.note) {
          prompt += `\nStudent Note on Question: ${context.userAnswer.note}`;
        }
      }
    }

    if (context.attemptSummary) {
      const s = context.attemptSummary;
      prompt += `\nStudent's Recent Paper Attempt Performance:`;
      prompt += `\n- Score: ${s.score} / ${s.totalMarks} | Accuracy: ${s.accuracy}%`;
      prompt += `\n- Correct: ${s.correctCount} | Incorrect: ${s.incorrectCount} | Unattempted: ${s.unansweredCount}`;
      if (s.wrongQuestions && s.wrongQuestions.length > 0) {
        prompt += `\n- Mistake Audit (Wrong Questions):`;
        s.wrongQuestions.slice(0, 8).forEach((w) => {
          prompt += `\n  * Q#${w.questionNo}: "${w.text.slice(0, 80)}..." (Student: ${w.studentSelected || "None"}, Correct: ${w.correctAnswer || "Key"})`;
        });
      }
    }
  }

  return prompt;
}

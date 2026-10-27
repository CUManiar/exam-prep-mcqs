import { parseQuestionnaireMarkdown } from "../lib/markdownPaperParser";
import { QuestionPaper } from "../lib/types";

// Local helper to avoid circular dependency between defaults.ts and sampleMarkdownPaper.ts
function parseAnswerKeyDetailed(text: string): {
  answers: Record<number, string>;
  explanations: Record<number, string>;
} {
  const answers: Record<number, string> = {};
  const explanations: Record<number, string> = {};
  if (!text) return { answers, explanations };

  const pattern =
    /(?:^|\n)\s*(\d+)[\.\)\s\-\:\t]+\s*(?:([A-Da-d])\s*)?(?:["“]{3,}([\s\S]*?)["”]{3,})?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const qNo = parseInt(match[1], 10);
    const ans = match[2]?.toUpperCase();
    if (ans) answers[qNo] = ans;
    if (match[3] !== undefined) {
      const cleaned = match[3].replace(/^["""\s]+|["""\s,]+$/g, "").trim();
      if (cleaned.length > 0) {
        explanations[qNo] = cleaned;
      }
    }
  }
  return { answers, explanations };
}

/**
 * MARKDOWN FORMAT SPECIFICATION
 * ==============================
 * The markdown format supports an optional header block above the first `---`.
 * Everything in the header (before the first `---`) is treated as exam info / rules.
 *
 * Header fields (all optional):
 *   EXAM: <exam name>
 *   SUBJECT: <subject>
 *   TOTAL QUESTIONS: <number>
 *   TOTAL MARKS: <number>
 *   TIME: <duration>
 *   NEGATIVE MARKING: <description>
 *   INSTRUCTIONS:
 *   - <rule 1>
 *   - <rule 2>
 *
 * After the first `---`, each question block is separated by `---`.
 * MCQ options are labeled (a), (b), (c), (d); cloze questions may omit them.
 *
 * Answer Key (separate text block, not in questionnaire):
 *   1. b """ explanation text """
 *   2. c """ another explanation """
 *   3. """ reference explanation for a cloze question """
 */

export const SAMPLE_QUESTIONNAIRE_TEXT = `EXAM: UPSC Prelims 2026 High-Yield Mock
SUBJECT: General Studies Paper I (GS-I)
TOTAL QUESTIONS: 5
TOTAL MARKS: 10
TIME: 15 Minutes
NEGATIVE MARKING: 0.667 marks deducted per wrong answer
INSTRUCTIONS:
- Each question carries 2 marks.
- There is negative marking of 1/3rd for each wrong answer.
- Do not mark more than one option per question.
- Use this mock to test your preparation, not just guess.
---
With reference to the **Monetary Policy Committee (MPC)** of the Reserve Bank of India, consider the following statements:
1. It determines the policy repo rate required to achieve the inflation target.
2. The Governor of the RBI is the ex-officio Chairman of the Committee and has a second or casting vote in case of a tie.
3. The central government appoints four of its six members for a term of five years.

Which of the statements given above is/are correct?
(a) 1 only
(b) 1 and 2 only
(c) 2 and 3 only
(d) 1, 2 and 3
---
Consider the following statements regarding **Article 21** and the right to privacy under the Indian Constitution:
1. The Right to Privacy was declared a fundamental right under Article 21 by a 9-judge Constitution Bench in the *K.S. Puttaswamy v. Union of India* (2017) judgment.
2. The right to be forgotten is recognized as an intrinsic part of the right to privacy under Indian jurisprudence.
3. Like all fundamental rights under Part III, the right to privacy is absolute and cannot be restricted by any state legislation.

Which of the statements given above is/are correct?
(a) 1 only
(b) 1 and 2 only
(c) 2 and 3 only
(d) 1, 2 and 3
---
With reference to **Biodiversity Hotspots**, consider the following statements:
1. To qualify as a biodiversity hotspot, a region must contain at least 1,500 species of vascular plants as endemics.
2. It must have lost at least 70 percent of its primary native vegetation.
3. India hosts parts of four global biodiversity hotspots: Himalaya, Indo-Burma, Western Ghats & Sri Lanka, and Sundaland.

Which of the statements given above are correct?
(a) 1 and 2 only
(b) 2 and 3 only
(c) 1 and 3 only
(d) 1, 2 and 3
---
Consider the following historical pairs of Bhakti saints and their associated traditions:
1. Ramanuja — Vishishtadvaita (Qualified Monism)
2. Madhvacharya — Shuddhadvaita (Pure Non-Dualism)
3. Shankaracharya — Advaita (Non-Dualism)
4. Vallabhacharya — Dvaita (Dualism)

How many of the pairs given above are correctly matched?
(a) Only one pair
(b) Only two pairs
(c) Only three pairs
(d) All four pairs
---
Which of the following best describes the term **"Quantum Supremacy"** frequently mentioned in scientific news?
(a) A theoretical point where quantum computers can crack all existing cryptographic algorithms simultaneously
(b) The demonstration that a programmable quantum device can solve a specific problem that no classical supercomputer can solve in any feasible amount of time
(c) The permanent replacement of classical silicon microprocessors by superconducting qubit processors in data centers
(d) The attainment of absolute zero temperature (-273.15°C) inside a scalable quantum computing laboratory`;

export const SAMPLE_ANSWER_KEY_TEXT = `1. b """ Statement 1 and 2 are correct. Statement 3 is incorrect because the MPC has 6 members (3 from RBI, 3 appointed by Central Government) who serve for 4 years (not 5 years). """
2. b """ Statement 1 and 2 are correct. Statement 3 is incorrect because the right to privacy under Article 21 is not absolute and is subject to the threefold proportionality test. """
3. d """ All three statements are correct under Norman Myers / Conservation International criteria for global Biodiversity Hotspots. """
4. b """ Exactly two pairs (1 and 3) are correctly matched. Madhvacharya propounded Dvaita, while Vallabhacharya propounded Shuddhadvaita. """
5. b """ Quantum Supremacy refers to a programmable quantum device performing a defined task that no classical supercomputer could solve in any feasible time. """`;

const parsedQuestions = parseQuestionnaireMarkdown(SAMPLE_QUESTIONNAIRE_TEXT);
const { answers, explanations } = parseAnswerKeyDetailed(
  SAMPLE_ANSWER_KEY_TEXT,
);

export const SAMPLE_MARKDOWN_PAPER: QuestionPaper = {
  id: "2026_prelims_interactive_markdown_sample",
  year: "2026",
  category: "prelims",
  examType: "objective",
  subject: "GS I (Interactive Mock)",
  label: "2026 – High-Yield Mock (Markdown Interactive)",
  title: "2026 – UPSC Prelims High-Yield Mock (Interactive Markdown)",
  totalQuestions: parsedQuestions.length,
  totalMarks: parsedQuestions.length * 2,
  correctMarks: 2.0,
  incorrectMarks: 0.667,
  timeMinutes: 15,
  qpUrl: "local://interactive_markdown",
  answerKey: answers,
  explanations: explanations,
  parsedQuestions: parsedQuestions,
  markdownContent: SAMPLE_QUESTIONNAIRE_TEXT,
  answerKeyText: SAMPLE_ANSWER_KEY_TEXT,
  instructions: [
    "Each question carries 2 marks.",
    "There is negative marking of 1/3rd for each wrong answer.",
    "Do not mark more than one option per question.",
    "Use this mock to test your preparation, not just guess.",
  ],
};

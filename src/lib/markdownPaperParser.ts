import { ParsedQuestion } from "./types";

/**
 * Parses a simple Questionnaire text/markdown document into individual questions.
 * Rules:
 * - Top '---' (or frontmatter) is skippable.
 * - Each question block is separated by '---'.
 * - Options can be (a)/(b)/(c)/(d) or A./B./C./D. or A)/B)/C)/D).
 * - Everything before the options is the question prompt.
 * - Answer keys and explanations are handled separately via the existing answer key parser.
 */
export function parseQuestionnaireMarkdown(
  markdownText: string,
): ParsedQuestion[] {
  let raw = (markdownText || "").trim();
  if (!raw) return [];

  // 1. Top '---' is skippable (e.g. frontmatter or leading separator)
  if (raw.startsWith("---")) {
    const nextSeparator = raw.indexOf("\n---", 3);
    if (nextSeparator !== -1) {
      // Check if what's before nextSeparator is frontmatter / title (no options)
      const potentialHeader = raw.substring(3, nextSeparator);
      const hasOptions = /\n\s*(?:\([a-dA-D]\)|[a-dA-D][\.\)])\s+/i.test(
        potentialHeader,
      );
      if (!hasOptions) {
        raw = raw.substring(nextSeparator + 4).trim();
      } else {
        raw = raw.replace(/^---\s*/, "").trim();
      }
    } else {
      raw = raw.replace(/^---\s*/, "").trim();
    }
  }

  // 2. Split into question blocks using '---' as delimiter
  const rawBlocks = raw.split(/\n\s*---\s*\n/);
  const parsedQuestions: ParsedQuestion[] = [];

  for (let idx = 0; idx < rawBlocks.length; idx++) {
    const block = rawBlocks[idx].trim();
    if (!block) continue;

    const lines = block.split("\n");
    const promptLines: string[] = [];
    const options: Record<string, string> = {};
    let foundOption = false;
    let currentOptKey: string | null = null;

    const optRegex = /^\s*(?:\(([a-dA-D])\)|([a-dA-D])[\.\)])\s+(.*)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(optRegex);

      if (match) {
        foundOption = true;
        const letter = (match[1] || match[2]).toUpperCase();
        options[letter] = match[3].trim();
        currentOptKey = letter;
      } else if (foundOption && currentOptKey && line.trim()) {
        // Multi-line option continuation
        options[currentOptKey] += "\n" + line.trim();
      } else if (!foundOption) {
        promptLines.push(line);
      }
    }

    // If no options were found in this block, skip (could be a trailing note or standalone header)
    if (Object.keys(options).length === 0) {
      continue;
    }

    let fullPrompt = promptLines.join("\n").trim();

    // Check for explicit Question Number in the prompt: e.g. "Q1.", "Question 1:", "### Q1", "1."
    const qNumMatch = fullPrompt.match(
      /^(?:###?\s*(?:Q|Question)?\s*|Q(?:uestion)?\s*)?(\d+)[\.\:\)]?\s*(.*)$/is,
    );
    let questionNo = parsedQuestions.length + 1;

    if (qNumMatch && qNumMatch[1]) {
      const parsedNum = parseInt(qNumMatch[1], 10);
      if (parsedNum > 0 && parsedNum <= 500) {
        questionNo = parsedNum;
        if (qNumMatch[2] && qNumMatch[2].trim()) {
          fullPrompt = qNumMatch[2].trim();
        }
      }
    }

    parsedQuestions.push({
      questionNo,
      text: fullPrompt || `Question ${questionNo}`,
      options,
    });
  }

  // Ensure 1-based sequential ordering if needed
  parsedQuestions.sort((a, b) => a.questionNo - b.questionNo);
  return parsedQuestions;
}

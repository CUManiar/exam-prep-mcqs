import { ParsedQuestion } from "./types";

/**
 * Parsed header from the optional exam info block.
 */
export interface ParsedMarkdownHeader {
  exam?: string;
  subject?: string;
  totalQuestions?: number;
  totalMarks?: number;
  time?: string;
  negativeMarking?: string;
  instructions?: string[];
  rawLines?: string[];
}

/**
 * Parses a simple Questionnaire text/markdown document into individual questions.
 * Rules:
 * - Optional header block before the first '---' contains exam info / rules.
 * - Each question block is separated by '---'.
 * - Options can be (a)/(b)/(c)/(d) or A./B./C./D. or A)/B)/C)/D).
 * - Everything before the options is the question prompt.
 * - Answer keys and explanations are handled separately via the existing answer key parser.
 *
 * Header Format (all fields optional, before first ---):
 *   EXAM: <exam name>
 *   SUBJECT: <subject>
 *   TOTAL QUESTIONS: <number>
 *   TOTAL MARKS: <number>
 *   TIME: <duration>
 *   NEGATIVE MARKING: <description>
 *   INSTRUCTIONS:
 *   - <rule 1>
 *   - <rule 2>
 */
export function parseMarkdownHeader(markdownText: string): ParsedMarkdownHeader {
  const result: ParsedMarkdownHeader = {};
  if (!markdownText) return result;

  const raw = markdownText.trim();
  // Find the first '---' separator
  const firstSepIdx = raw.indexOf("\n---");
  if (firstSepIdx === -1) return result;

  const headerText = raw.substring(0, firstSepIdx).trim();
  if (!headerText) return result;

  // Check if the header looks like a structured info block (has KEY: value lines)
  const hasKeyValue = /^[A-Z][A-Z\s]+:/m.test(headerText);
  if (!hasKeyValue) return result;

  const lines = headerText.split("\n");
  result.rawLines = lines;
  const instructions: string[] = [];
  let inInstructions = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect INSTRUCTIONS: block
    if (/^INSTRUCTIONS\s*:/i.test(trimmed)) {
      inInstructions = true;
      continue;
    }

    // Bullet points inside INSTRUCTIONS block
    if (inInstructions && /^[-•*]\s+/.test(trimmed)) {
      instructions.push(trimmed.replace(/^[-•*]\s+/, "").trim());
      continue;
    }

    // If a new KEY: value line is encountered, exit instructions mode
    if (/^[A-Z][A-Z\s]+:/i.test(trimmed) && !trimmed.startsWith("-")) {
      inInstructions = false;
    }

    // Parse key-value pairs
    const kvMatch = trimmed.match(/^([A-Z][A-Z\s]+):\s*(.*)$/i);
    if (!kvMatch) continue;

    const key = kvMatch[1].trim().toUpperCase().replace(/\s+/g, "_");
    const value = kvMatch[2].trim();

    switch (key) {
      case "EXAM":
        result.exam = value;
        break;
      case "SUBJECT":
        result.subject = value;
        break;
      case "TOTAL_QUESTIONS":
      case "QUESTIONS":
        result.totalQuestions = parseInt(value, 10) || undefined;
        break;
      case "TOTAL_MARKS":
      case "MARKS":
        result.totalMarks = parseFloat(value) || undefined;
        break;
      case "TIME":
      case "DURATION":
      case "TIME_LIMIT":
        result.time = value;
        break;
      case "NEGATIVE_MARKING":
      case "NEGATIVE":
      case "PENALTY":
        result.negativeMarking = value;
        break;
    }
  }

  if (instructions.length > 0) {
    result.instructions = instructions;
  }

  return result;
}

/**
 * Parses a simple Questionnaire text/markdown document into individual questions.
 */
export function parseQuestionnaireMarkdown(
  markdownText: string,
): ParsedQuestion[] {
  let raw = (markdownText || "").trim();
  if (!raw) return [];

  // 1. Top block before first '---' may be a header (exam info). Skip it if it has no options.
  if (raw.startsWith("---")) {
    // Starts with ---, skip leading separator
    raw = raw.replace(/^---\s*/, "").trim();
  } else {
    // Check if there's a header block (no options) before first ---
    const firstSepIdx = raw.indexOf("\n---");
    if (firstSepIdx !== -1) {
      const potentialHeader = raw.substring(0, firstSepIdx);
      const hasOptions = /\n\s*(?:\([a-dA-D]\)|[a-dA-D][\.\)])\s+/i.test(
        potentialHeader,
      );
      if (!hasOptions) {
        // It's a pure header block — skip it
        raw = raw.substring(firstSepIdx + 4).trim();
      }
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

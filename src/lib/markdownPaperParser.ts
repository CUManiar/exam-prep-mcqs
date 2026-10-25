import { ParsedQuestion } from "./types";

/**
 * Parsed header from the optional exam info block.
 */
export interface ParsedMarkdownHeader {
  exam?: string;
  subject?: string;
  totalQuestions?: number;
  totalMarks?: number;
  positiveMarks?: number;
  time?: string;
  negativeMarking?: string;
  instructions?: string[];
  rawLines?: string[];
}

const OPTION_REGEX =
  /^\s*(?:(?:\*\*|__)\s*)?(?:\(([a-dA-D])\)|([a-dA-D])[\.\)])(?:(?:\*\*|__)\s*)?\s+(.*)$/;
const MATCHING_HEADER_REGEX =
  /^\s*List-I\s*(?:\(([^)]+)\))?\s*:\s*List-II\s*(?:\(([^)]+)\))?\s*$/i;
const MATCHING_ROW_REGEX =
  /^\s*([A-D])\s*[\.\)]\s*(.*?)\s*:\s*(\d+)\s*[\.\)]\s*(.*?)\s*$/i;
const SEPARATOR_REGEX = /^\s*-{3,}\s*$/;

/** Remove the small subset of Markdown syntax supported by the paper preview. */
export function stripMarkdownFormatting(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(`+)(.*?)\1/g, "$2")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(^|\s)(\*|_)([^\n]+?)\2(?=\s|$)/g, "$1$3")
    .trim();
}

interface QuestionMarker {
  questionNo: number;
  text: string;
  explicit: boolean;
}

/**
 * Recognises Markdown question headings such as `**1.**`, `Question 1:`,
 * `Q1.` and plain `1.` markers. Plain numbered lines are only used as
 * boundaries after a question's options have started, so numbered statements
 * inside a question remain part of the prompt.
 */
function parseQuestionMarker(line: string): QuestionMarker | null {
  const withoutHeading = line.replace(/^\s*#{1,6}\s*/, "");
  const match = withoutHeading.match(
    /^\s*(?:(?:\*\*|__)\s*)?(?:(?:question|q)\s*)?(\d+)\s*[\.\):](?:(?:\*\*|__)\s*)?(.*)$/i,
  );
  if (!match) return null;

  const questionNo = parseInt(match[1], 10);
  if (!Number.isInteger(questionNo) || questionNo <= 0 || questionNo > 500) {
    return null;
  }

  const explicit =
    /^\s*(?:#{1,6}\s*)?(?:(?:\*\*|__)\s*)?(?:(?:question|q)\s*)?\d+\s*[\.\):]/i.test(
      line,
    ) &&
    (/^\s*(?:#{1,6}\s*)?(?:\*\*|__)/.test(line) ||
      /^\s*(?:#{1,6}\s*)?(?:question|q)\s*/i.test(line));

  return {
    questionNo,
    text: match[2].trim(),
    explicit,
  };
}

function firstSeparatorIndex(markdown: string): number {
  let offset = 0;
  for (const line of markdown.split("\n")) {
    if (SEPARATOR_REGEX.test(line)) return offset;
    offset += line.length + 1;
  }
  return -1;
}

function firstExplicitQuestionIndex(markdown: string): number {
  let offset = 0;
  for (const line of markdown.split("\n")) {
    const marker = parseQuestionMarker(line);
    if (marker?.explicit) return offset;
    offset += line.length + 1;
  }
  return -1;
}

function cleanHeaderValue(value: string): string {
  return stripMarkdownFormatting(value)
    .replace(/[\u2212]/g, "-")
    .trim();
}

function parseHeaderKeyValue(
  key: string,
  rawValue: string,
  result: ParsedMarkdownHeader,
) {
  const normalizedKey = key.trim().toUpperCase().replace(/\s+/g, "_");
  const value = cleanHeaderValue(rawValue);
  if (!value) return;

  switch (normalizedKey) {
    case "EXAM":
    case "TITLE":
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
    case "POSITIVE_MARKS":
    case "POSITIVE":
    case "CORRECT_MARKS":
    case "CORRECT":
    case "MARKS_PER_QUESTION":
      result.positiveMarks = parseFloat(value) || undefined;
      break;
  }
}

const INLINE_METADATA_KEYS =
  "total questions|total marks|positive marks|negative marking|time limit|time|duration|questions|marks|penalty|correct marks|correct answer|correct|positive";

function parseHeaderLine(line: string, result: ParsedMarkdownHeader): boolean {
  let matchedMetadata = false;
  const normalizedLine = line.replace(/(?:\*\*|__)/g, "");
  const inlineMetadataRegex = new RegExp(
    `(?:\\*\\*|__)?\\s*(${INLINE_METADATA_KEYS})\\s*(?:\\*\\*|__)?\\s*:\\s*(.*?)(?=\\s+(?:\\*\\*|__)?\\s*(?:${INLINE_METADATA_KEYS})\\s*(?:\\*\\*|__)?\\s*:|$)`,
    "gi",
  );

  for (const match of normalizedLine.matchAll(inlineMetadataRegex)) {
    matchedMetadata = true;
    parseHeaderKeyValue(match[1], match[2], result);
  }

  if (!matchedMetadata) {
    const keyValueMatch = normalizedLine.match(
      /^\s*(?:\*\*|__)?\s*([A-Z][A-Z\s_]+)\s*(?:\*\*|__)?\s*:\s*(.*?)\s*$/i,
    );
    if (keyValueMatch) {
      matchedMetadata = true;
      parseHeaderKeyValue(keyValueMatch[1], keyValueMatch[2], result);
    }
  }

  return matchedMetadata;
}

/**
 * Parses the optional header in either the app's key/value format or normal
 * Markdown format (for example `# Title`, bold inline metadata and `### Rules`).
 */
export function parseMarkdownHeader(
  markdownText: string,
): ParsedMarkdownHeader {
  const result: ParsedMarkdownHeader = {};
  if (!markdownText) return result;

  const raw = markdownText.replace(/\r\n?/g, "\n").trim();
  if (!raw) return result;

  const separatorIndex = firstSeparatorIndex(raw);
  const explicitQuestionIndex = firstExplicitQuestionIndex(raw);
  const boundaryCandidates = [separatorIndex, explicitQuestionIndex].filter(
    (index) => index >= 0,
  );
  const headerEnd =
    boundaryCandidates.length > 0
      ? Math.min(...boundaryCandidates)
      : raw.length;
  const headerText = raw.substring(0, headerEnd).trim();
  if (!headerText) return result;

  const lines = headerText.split("\n");
  result.rawLines = lines;
  const instructions: string[] = [];
  let inInstructions = false;
  let hasHeaderContent = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      const heading = stripMarkdownFormatting(headingMatch[1]);
      if (/^rules?$/i.test(heading) || /^instructions?$/i.test(heading)) {
        inInstructions = true;
        hasHeaderContent = true;
      } else if (!result.exam && heading) {
        result.exam = heading;
        hasHeaderContent = true;
      }
      continue;
    }

    if (/^\s*(?:\*\*|__)?\s*INSTRUCTIONS?\s*(?:\*\*|__)?\s*:/i.test(trimmed)) {
      inInstructions = true;
      hasHeaderContent = true;
    }

    if (parseHeaderLine(trimmed, result)) {
      hasHeaderContent = true;
    }

    const bulletMatch = trimmed.match(/^[-•*+]\s+(.+)$/);
    if (bulletMatch && inInstructions) {
      const instruction = stripMarkdownFormatting(bulletMatch[1]);
      if (instruction) instructions.push(instruction);

      const positiveMatch = instruction.match(
        /correct(?:\s+answer)?\s*:\s*\+?\s*([\d.]+)/i,
      );
      const negativeMatch = instruction.match(
        /wrong\s+answer\s*:\s*[-−]?\s*([\d.]+)/i,
      );
      if (!result.positiveMarks && positiveMatch) {
        result.positiveMarks = parseFloat(positiveMatch[1]) || undefined;
      }
      if (!result.negativeMarking && negativeMatch) {
        result.negativeMarking = `${negativeMatch[1]} marks deducted per wrong answer`;
      }
      hasHeaderContent = true;
    }
  }

  if (instructions.length > 0) result.instructions = instructions;
  return hasHeaderContent ? result : {};
}

function parseQuestionBlock(
  block: string,
  fallbackQuestionNo: number,
  marker?: QuestionMarker | null,
): ParsedQuestion | null {
  const lines = block.split("\n");
  const promptLines: string[] = [];
  const options: Record<string, string> = {};
  const matchingItems: NonNullable<ParsedQuestion["matchingItems"]> = [];
  let matchingHeaders: ParsedQuestion["matchingHeaders"];
  let matchingHeaderLine: string | null = null;
  let inMatchingSection = false;
  let foundOption = false;
  let currentOptKey: string | null = null;

  for (const line of lines) {
    const normalizedLine = stripMarkdownFormatting(line).trim();
    const matchingHeader = normalizedLine.match(MATCHING_HEADER_REGEX);
    if (matchingHeader) {
      matchingHeaderLine = normalizedLine;
      matchingHeaders = {
        left: matchingHeader[1]
          ? `List-I (${matchingHeader[1].trim()})`
          : "List-I",
        right: matchingHeader[2]
          ? `List-II (${matchingHeader[2].trim()})`
          : "List-II",
      };
      inMatchingSection = true;
      continue;
    }

    if (inMatchingSection) {
      const matchingRow = normalizedLine.match(MATCHING_ROW_REGEX);
      if (matchingRow) {
        matchingItems.push({
          label: matchingRow[1].toUpperCase(),
          left: matchingRow[2].trim(),
          rightLabel: matchingRow[3],
          right: matchingRow[4].trim(),
        });
        continue;
      }

      if (!normalizedLine) continue;
      inMatchingSection = false;
    }

    const match = line.match(OPTION_REGEX);
    if (match) {
      foundOption = true;
      const letter = (match[1] || match[2]).toUpperCase();
      options[letter] = match[3].trim();
      currentOptKey = letter;
    } else if (foundOption && currentOptKey && line.trim()) {
      options[currentOptKey] += `\n${line.trim()}`;
    } else if (!foundOption) {
      promptLines.push(line);
    }
  }

  if (Object.keys(options).length === 0) return null;

  const questionNo = marker?.questionNo || fallbackQuestionNo;
  if (matchingItems.length === 0 && matchingHeaderLine) {
    promptLines.push(matchingHeaderLine);
  }

  const fullPrompt = promptLines.join("\n").trim();
  return {
    questionNo,
    text: fullPrompt || `Question ${questionNo}`,
    options,
    ...(matchingItems.length > 0 ? { matchingItems } : {}),
    ...(matchingItems.length > 0 && matchingHeaders ? { matchingHeaders } : {}),
  };
}

function hasOptionLine(lines: string[]): boolean {
  return lines.some((line) => OPTION_REGEX.test(line));
}

/**
 * Parses a questionnaire into individual questions.
 *
 * Supported layouts:
 * - The original app format, with `---` separators between question blocks.
 * - Normal Markdown papers, where questions begin with `**1.**`, `Question 1:`
 *   or `Q1.` and options follow below the prompt.
 */
export function parseQuestionnaireMarkdown(
  markdownText: string,
): ParsedQuestion[] {
  const raw = (markdownText || "").replace(/\r\n?/g, "\n").trim();
  if (!raw) return [];

  const lines = raw.split("\n");
  const hasExplicitQuestionMarker = lines.some(
    (line) => parseQuestionMarker(line)?.explicit,
  );
  const hasSeparator = lines.some((line) => SEPARATOR_REGEX.test(line));
  const parsedQuestions: ParsedQuestion[] = [];

  if (!hasExplicitQuestionMarker && hasSeparator) {
    const blocks = raw.split(/^\s*-{3,}\s*$/m);
    let fallbackQuestionNo = 1;
    for (const block of blocks) {
      const parsed = parseQuestionBlock(block.trim(), fallbackQuestionNo);
      if (!parsed) continue;
      parsedQuestions.push(parsed);
      fallbackQuestionNo += 1;
    }
  } else {
    const blocks: Array<{ text: string; marker: QuestionMarker | null }> = [];
    let currentLines: string[] = [];
    let currentMarker: QuestionMarker | null = null;
    let questionStarted = false;

    const flush = () => {
      if (currentLines.some((line) => line.trim())) {
        blocks.push({ text: currentLines.join("\n"), marker: currentMarker });
      }
      currentLines = [];
      currentMarker = null;
    };

    for (const line of lines) {
      if (SEPARATOR_REGEX.test(line)) {
        flush();
        questionStarted = false;
        continue;
      }

      const marker = parseQuestionMarker(line);
      const isPlainBoundary =
        Boolean(marker) &&
        !marker?.explicit &&
        questionStarted &&
        hasOptionLine(currentLines) &&
        marker!.questionNo > (currentMarker?.questionNo || 0);
      const startsQuestion =
        Boolean(marker) &&
        (marker!.explicit || !questionStarted || isPlainBoundary);

      if (startsQuestion) {
        flush();
        currentMarker = marker;
        currentLines = marker?.text ? [marker.text] : [];
        questionStarted = true;
      } else {
        currentLines.push(line);
      }
    }
    flush();

    let fallbackQuestionNo = 1;
    for (const block of blocks) {
      const parsed = parseQuestionBlock(
        block.text.trim(),
        block.marker?.questionNo || fallbackQuestionNo,
        block.marker,
      );
      if (!parsed) continue;
      parsedQuestions.push(parsed);
      fallbackQuestionNo = Math.max(
        fallbackQuestionNo + 1,
        parsed.questionNo + 1,
      );
    }
  }

  parsedQuestions.sort((a, b) => a.questionNo - b.questionNo);
  return parsedQuestions;
}

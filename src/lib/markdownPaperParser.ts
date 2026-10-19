import { QuestionPaper, ParsedQuestion, ExamCategory, ExamType } from "./types";

/**
 * Parses a Markdown document with optional YAML-style frontmatter
 * and structured MCQs into a QuestionPaper object.
 */
export function parseMarkdownPaper(
  markdownText: string,
  overrides?: Partial<QuestionPaper>,
): {
  paperMetadata: Partial<QuestionPaper>;
  parsedQuestions: ParsedQuestion[];
  answerKey: Record<number, string>;
  explanations: Record<number, string>;
} {
  let content = markdownText.trim();
  const metadata: Record<string, any> = {};
  const instructions: string[] = [];

  // 1. Extract YAML Frontmatter if present
  if (content.startsWith("---")) {
    const endMatch = content.indexOf("\n---", 3);
    if (endMatch !== -1) {
      const frontmatterText = content.substring(3, endMatch).trim();
      content = content.substring(endMatch + 4).trim();

      const lines = frontmatterText.split("\n");
      let inInstructions = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        if (trimmed.startsWith("instructions:")) {
          inInstructions = true;
          continue;
        }

        if (inInstructions) {
          if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
            instructions.push(trimmed.replace(/^[-*]\s*/, ""));
            continue;
          } else if (trimmed.includes(":")) {
            inInstructions = false;
          }
        }

        const colonIdx = line.indexOf(":");
        if (colonIdx !== -1) {
          const key = line.substring(0, colonIdx).trim();
          let value = line.substring(colonIdx + 1).trim();
          // Remove surrounding quotes
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          metadata[key] = value;
        }
      }
    }
  }

  // 2. Split content into question chunks
  // Matches headings like '### Q1', '## Question 1', '### Question 1:', 'Q1.', or '---'
  const questionBlocks: { qNo: number; rawText: string }[] = [];
  const rawSections = content.split(
    /\n(?=(?:###?\s*(?:Q|Question)\s*\d+|Q\d+[\.\:\)]|\n---\s*\n###?\s*Q))/i,
  );

  for (const section of rawSections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Try to match question number
    const qMatch = trimmed.match(
      /^(?:###?\s*(?:Q|Question)\s*(\d+)|Q(\d+)[\.\:\)]|---\s*\n###?\s*(?:Q|Question)\s*(\d+))/i,
    );
    const qNo = qMatch
      ? parseInt(qMatch[1] || qMatch[2] || qMatch[3], 10)
      : questionBlocks.length + 1;

    // Clean leading heading from rawText
    const body = trimmed
      .replace(
        /^(?:###?\s*(?:Q|Question)\s*\d+[\.\:\)]?|Q\d+[\.\:\)]|---\s*\n###?\s*(?:Q|Question)\s*\d+[\.\:\)]?)\s*/i,
        "",
      )
      .trim();

    if (body) {
      questionBlocks.push({ qNo, rawText: body });
    }
  }

  const parsedQuestions: ParsedQuestion[] = [];
  const answerKey: Record<number, string> = {};
  const explanations: Record<number, string> = {};

  // 3. Parse individual question block
  for (const block of questionBlocks) {
    const lines = block.rawText.split("\n");
    const questionTextLines: string[] = [];
    const options: Record<string, string> = {};
    let answer: string | undefined = undefined;
    const explanationLines: string[] = [];

    let currentSection: "question" | "options" | "explanation" = "question";
    let currentOptionKey: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check for Answer tag: 'Answer: (a)', 'Answer: A', 'Ans: C'
      const ansMatch = trimmed.match(
        /^(?:Answer|Ans|Correct(?:\s*Answer)?)\s*[:=\-]\s*\(?([A-Da-d])\)?/i,
      );
      if (ansMatch) {
        answer = ansMatch[1].toUpperCase();
        currentOptionKey = null;
        continue;
      }

      // Check for Explanation tag: 'Explanation: ...', 'Solution: ...'
      const expMatch = trimmed.match(
        /^(?:Explanation|Solution|Exp)\s*[:=\-]\s*(.*)$/i,
      );
      if (expMatch) {
        currentSection = "explanation";
        currentOptionKey = null;
        if (expMatch[1].trim()) {
          explanationLines.push(expMatch[1].trim());
        }
        continue;
      }

      // If in explanation section, collect remaining lines
      if (currentSection === "explanation") {
        explanationLines.push(line);
        continue;
      }

      // Check for Option pattern: '(a) ...', '(A) ...', 'a) ...', 'A. ...', '(1) ...'
      const optMatch = trimmed.match(
        /^(?:\(?([A-Da-d])\)|\b([A-Da-d])[\.\)])\s+(.*)$/,
      );
      if (optMatch) {
        currentSection = "options";
        const optLetter = (optMatch[1] || optMatch[2]).toUpperCase();
        options[optLetter] = optMatch[3].trim();
        currentOptionKey = optLetter;
        continue;
      }

      // Multiline options continuation
      if (currentSection === "options" && currentOptionKey && trimmed) {
        options[currentOptionKey] += "\n" + line;
        continue;
      }

      // Default: Question text
      if (currentSection === "question") {
        questionTextLines.push(line);
      }
    }

    const qText = questionTextLines.join("\n").trim();
    const explanation = explanationLines.join("\n").trim() || undefined;

    if (answer) {
      answerKey[block.qNo] = answer;
    }
    if (explanation) {
      explanations[block.qNo] = explanation;
    }

    parsedQuestions.push({
      questionNo: block.qNo,
      text: qText || `Question ${block.qNo}`,
      options,
      answer,
      explanation,
    });
  }

  // Ensure questions sorted by question number
  parsedQuestions.sort((a, b) => a.questionNo - b.questionNo);

  const totalQuestions =
    parseInt(metadata.totalQuestions || "0", 10) || parsedQuestions.length || 1;
  const correctMarks = parseFloat(metadata.correctMarks || "2.0") || 2.0;
  const incorrectMarks =
    parseFloat(metadata.incorrectMarks || "0.667") || 0.667;
  const totalMarks =
    parseFloat(metadata.totalMarks || "0") || totalQuestions * correctMarks;
  const timeMinutes =
    parseInt(metadata.timeMinutes || "0", 10) ||
    (totalQuestions <= 15 ? 15 : totalQuestions <= 30 ? 35 : 120);

  const paperMetadata: Partial<QuestionPaper> = {
    title: metadata.title,
    label: metadata.label || metadata.title || "Custom Markdown Paper",
    subject: metadata.subject || "General Studies",
    category: (metadata.category as ExamCategory) || "prelims",
    examType: (metadata.examType as ExamType) || "objective",
    totalQuestions,
    correctMarks,
    incorrectMarks,
    totalMarks,
    timeMinutes,
    instructions: instructions.length > 0 ? instructions : undefined,
    ...overrides,
  };

  return {
    paperMetadata,
    parsedQuestions,
    answerKey,
    explanations,
  };
}

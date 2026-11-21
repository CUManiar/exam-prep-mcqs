import { QuestionPaper, ParsedQuestion } from "./types";
import { parseQuestionnaireMarkdown } from "./markdownPaperParser";

export interface IndexedQuestionMatch {
  paperId: string;
  paperTitle: string;
  paperYear: string;
  paperSubject: string;
  questionNo: number;
  text: string;
  options: Record<string, string>;
  correctAnswer?: string;
  explanation?: string;
  previousYears?: string;
  relevanceScore: number;
}

interface StoredQuestionRef {
  paperId: string;
  paperTitle: string;
  paperYear: string;
  paperSubject: string;
  questionNo: number;
  text: string;
  options: Record<string, string>;
  correctAnswer?: string;
  explanation?: string;
  previousYears?: string;
  tokens: Set<string>;
  rawNormalizedText: string;
}

interface MemoryQuestionIndex {
  signature: string;
  questions: StoredQuestionRef[];
  tokenMap: Map<string, number[]>; // token -> question indices
}

const COMMON_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "which",
  "are",
  "was",
  "were",
  "been",
  "have",
  "has",
  "had",
  "does",
  "did",
  "can",
  "could",
  "shall",
  "should",
  "will",
  "would",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "than",
  "too",
  "very",
  "upsc",
  "prelims",
  "mains",
  "mock",
  "paper",
  "test",
  "set",
  "question",
]);

function tokenizeString(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !COMMON_STOP_WORDS.has(word));
}

let cachedMemoryIndex: MemoryQuestionIndex | null = null;

function computePapersSignature(papers: QuestionPaper[]): string {
  let hash = 0;
  for (let i = 0; i < papers.length; i++) {
    const p = papers[i];
    const s = `${p.id}_${p.totalQuestions}_${p.parsedQuestions?.length ?? 0}`;
    for (let j = 0; j < s.length; j++) {
      hash = (hash << 5) - hash + s.charCodeAt(j);
      hash |= 0;
    }
  }
  return `${papers.length}_${hash}`;
}

/**
 * Builds or retrieves the cached inverted question index from available papers.
 * Executes lazily and caches in memory for sub-millisecond lookups.
 */
function getOrBuildInvertedIndex(papers: QuestionPaper[]): MemoryQuestionIndex {
  const currentSignature = computePapersSignature(papers);

  if (cachedMemoryIndex && cachedMemoryIndex.signature === currentSignature) {
    return cachedMemoryIndex;
  }

  const questions: StoredQuestionRef[] = [];
  const tokenMap = new Map<string, number[]>();

  papers.forEach((paper) => {
    const paperTitle =
      paper.label || paper.title || `${paper.year} – ${paper.subject}`;
    let qList: ParsedQuestion[] = [];

    if (paper.parsedQuestions && paper.parsedQuestions.length > 0) {
      qList = paper.parsedQuestions;
    } else if (paper.markdownContent && paper.markdownContent.trim()) {
      qList = parseQuestionnaireMarkdown(paper.markdownContent);
    }

    qList.forEach((q) => {
      const qText = q.text || "";
      const rawNormalizedText = qText.toLowerCase();
      const subjectTokens = tokenizeString(paper.subject || "");
      const questionTokens = tokenizeString(qText);
      const allTokens = new Set<string>([...subjectTokens, ...questionTokens]);

      // Resolve previous years:
      // 1. Direct tag on question (e.g. q.previousYears = "2017, 2021")
      // 2. Inline annotation in question text or explanation (e.g. "(UPSC 2018)" or "[PYQ 2020]")
      // 3. Historical paper year (e.g. "2024", "2023", "2021")
      let resolvedPYQ = q.previousYears ? String(q.previousYears).trim() : undefined;
      if (!resolvedPYQ) {
        const textToScan = `${qText} ${paper.explanations?.[q.questionNo] || q.explanation || ""}`;
        const inlineMatch = textToScan.match(
          /(?:\[|\()\s*(?:UPSC\s+|CSE\s+|PYQ\s+)?((?:19\d\d|20[0-2]\d)(?:\s*,\s*(?:19\d\d|20[0-2]\d))*)\s*(?:\]|\))/i,
        );
        if (inlineMatch && inlineMatch[1]) {
          resolvedPYQ = inlineMatch[1].trim();
        } else if (
          paper.year &&
          /^(19\d\d|20[0-2]\d)$/.test(paper.year.trim()) &&
          paper.year !== "2026"
        ) {
          resolvedPYQ = paper.year.trim();
        } else if (paperTitle) {
          const titleMatch = paperTitle.match(/\b(19\d\d|20[0-2]\d)\b/);
          if (titleMatch && titleMatch[1]) {
            resolvedPYQ = titleMatch[1];
          }
        }
      }

      const qIndex = questions.length;
      questions.push({
        paperId: paper.id,
        paperTitle,
        paperYear: paper.year || "",
        paperSubject: paper.subject || "",
        questionNo: q.questionNo,
        text: qText,
        options: q.options || {},
        correctAnswer: paper.answerKey?.[q.questionNo],
        explanation: paper.explanations?.[q.questionNo],
        previousYears: resolvedPYQ,
        tokens: allTokens,
        rawNormalizedText,
      });

      allTokens.forEach((tok) => {
        const existing = tokenMap.get(tok);
        if (existing) {
          existing.push(qIndex);
        } else {
          tokenMap.set(tok, [qIndex]);
        }
      });
    });
  });

  cachedMemoryIndex = {
    signature: currentSignature,
    questions,
    tokenMap,
  };

  return cachedMemoryIndex;
}

/**
 * Scalably finds matching questions for a syllabus topic without full-text scanning.
 * Uses the cached inverted index, scoring exact phrase and token overlap.
 * Result set is strictly bounded by maxLimit (default 20) to prevent DOM or memory bloat.
 */
export function findQuestionsForSyllabusTopic(
  topicTitle: string,
  papers: QuestionPaper[],
  maxLimit = 20,
): IndexedQuestionMatch[] {
  if (!topicTitle || !topicTitle.trim() || papers.length === 0) {
    return [];
  }

  const index = getOrBuildInvertedIndex(papers);
  const normalizedQuery = topicTitle.trim().toLowerCase();
  const queryTokens = tokenizeString(topicTitle);

  if (queryTokens.length === 0 && normalizedQuery.length < 3) {
    return [];
  }

  // Gather candidate question indices using inverted index
  const candidateScores = new Map<number, number>();

  queryTokens.forEach((token) => {
    const matchedIndices = index.tokenMap.get(token);
    if (!matchedIndices) return;

    matchedIndices.forEach((qIdx) => {
      const current = candidateScores.get(qIdx) || 0;
      candidateScores.set(qIdx, current + 3);
    });
  });

  if (candidateScores.size === 0) {
    return [];
  }

  // Score candidate questions with phrase boost
  const results: IndexedQuestionMatch[] = [];

  candidateScores.forEach((baseScore, qIdx) => {
    const q = index.questions[qIdx];
    let score = baseScore;

    // High bonus for exact phrase match in stem
    if (q.rawNormalizedText.includes(normalizedQuery)) {
      score += 20;
    }

    // Bonus for matching subject
    if (
      q.paperSubject &&
      normalizedQuery.includes(q.paperSubject.toLowerCase())
    ) {
      score += 5;
    }

    // Bonus if PYQ metadata exists
    if (q.previousYears) {
      score += 2;
    }

    results.push({
      paperId: q.paperId,
      paperTitle: q.paperTitle,
      paperYear: q.paperYear,
      paperSubject: q.paperSubject,
      questionNo: q.questionNo,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      previousYears: q.previousYears,
      relevanceScore: score,
    });
  });

  // Sort by relevance score descending and truncate to maxLimit
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return results.slice(0, maxLimit);
}

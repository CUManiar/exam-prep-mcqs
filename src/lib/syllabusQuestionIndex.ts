import { QuestionPaper, ParsedQuestion } from "./types";
import {
  parseQuestionnaireMarkdown,
  cleanPreviousYears,
} from "./markdownPaperParser";

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
      let resolvedPYQ: string | undefined = q.previousYears
        ? cleanPreviousYears(String(q.previousYears))
        : undefined;

      // 2. Explicit tag or inline UPSC / CSE / PYQ reference in text or explanation
      if (!resolvedPYQ) {
        const textToScan = `${qText} ${paper.explanations?.[q.questionNo] || q.explanation || ""}`;

        // Matches [Year: 2017, 2021] or [PYQ: 2020]
        const bracketTagMatch = textToScan.match(
          /\[\s*(?:(?:UPSC\s+)?PYQ|Previously\s*Asked|Previous\s*Years?|Years?)\s*:\s*([^\]]+)\]/i,
        );
        if (bracketTagMatch && bracketTagMatch[1]) {
          const cleaned = cleanPreviousYears(bracketTagMatch[1]);
          if (cleaned) resolvedPYQ = cleaned;
        }

        // Matches (UPSC 2021), [PYQ 2020], PYQ 2019, <i>PYQ 2024</i>, UPSC CSE 2018
        if (!resolvedPYQ) {
          const inlinePYQMatch = textToScan.match(
            /(?:\[|\(|\b)(?:UPSC(?:\s*CSE)?|CSE|PYQ)\s*[:\-–]?\s*((?:19[89]\d|20[0-2]\d)(?:\s*,\s*(?:19[89]\d|20[0-2]\d))*)/i,
          );
          if (inlinePYQMatch && inlinePYQMatch[1]) {
            const cleaned = cleanPreviousYears(inlinePYQMatch[1]);
            if (cleaned) resolvedPYQ = cleaned;
          }
        }
      }

      // 3. Official past UPSC / Prelims paper
      if (!resolvedPYQ && paper.year) {
        const pYear = paper.year.trim();
        const yearNum = parseInt(pYear, 10);
        if (yearNum >= 1979 && yearNum <= 2025 && pYear !== "2026") {
          const isPastOfficial =
            !paper.isCustom ||
            /prelims|upsc|cse/i.test(paper.label || "") ||
            /prelims|upsc|cse/i.test(paper.title || "") ||
            /prelims/i.test(paper.id);
          if (isPastOfficial) {
            resolvedPYQ = pYear;
          }
        }
      }

      // 4. Paper title year if tagged with UPSC / CSE / PYQ / Prelims
      if (!resolvedPYQ && paperTitle) {
        const titleMatch = paperTitle.match(
          /(?:UPSC|CSE|PYQ|Prelims)[^\d\n]{0,10}\b(19[89]\d|20[0-2]\d)\b|\b(19[89]\d|20[0-2]\d)\b[^\d\n]{0,10}(?:UPSC|CSE|PYQ|Prelims)/i,
        );
        const yearCandidate = titleMatch
          ? titleMatch[1] || titleMatch[2]
          : null;
        if (yearCandidate && yearCandidate !== "2026") {
          const cleaned = cleanPreviousYears(yearCandidate);
          if (cleaned) resolvedPYQ = cleaned;
        }
      }

      if (!resolvedPYQ) {
        resolvedPYQ = undefined;
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
 * Scalably finds matching questions for a syllabus topic or an array of topics (e.g. topic + all subtopics)
 * without full-text scanning. Uses the cached inverted index, scoring exact phrase and token overlap.
 * Result set is strictly bounded by maxLimit to prevent DOM or memory bloat.
 */
export function findQuestionsForSyllabusTopic(
  topicQuery: string | string[],
  papers: QuestionPaper[],
  maxLimit = 30,
): IndexedQuestionMatch[] {
  const rawQueries = Array.isArray(topicQuery) ? topicQuery : [topicQuery];
  const queries = rawQueries.map((q) => q.trim()).filter((q) => q.length > 0);

  if (queries.length === 0 || papers.length === 0) {
    return [];
  }

  const index = getOrBuildInvertedIndex(papers);
  const candidateScores = new Map<number, number>();

  queries.forEach((qStr, qIdx) => {
    const isPrimary = qIdx === 0;
    const tokens = tokenizeString(qStr);

    tokens.forEach((token) => {
      const matchedIndices = index.tokenMap.get(token);
      if (!matchedIndices) return;

      matchedIndices.forEach((questionIdx) => {
        const current = candidateScores.get(questionIdx) || 0;
        // Direct topic match gets 3 points per token; child/descendant subtopic gets 2 points
        candidateScores.set(questionIdx, current + (isPrimary ? 3 : 2));
      });
    });
  });

  if (candidateScores.size === 0) {
    return [];
  }

  // Score candidate questions with phrase boost
  const results: IndexedQuestionMatch[] = [];
  const normalizedQueries = queries.map((q) => q.toLowerCase());

  candidateScores.forEach((baseScore, questionIdx) => {
    const q = index.questions[questionIdx];
    let score = baseScore;

    // High bonus for exact phrase match with any query title (higher for primary topic)
    for (let i = 0; i < normalizedQueries.length; i++) {
      const nq = normalizedQueries[i];
      if (nq.length >= 4 && q.rawNormalizedText.includes(nq)) {
        score += i === 0 ? 25 : 15;
        break;
      }
    }

    // Bonus for matching subject
    if (q.paperSubject) {
      const sLower = q.paperSubject.toLowerCase();
      if (normalizedQueries.some((nq) => nq.includes(sLower))) {
        score += 5;
      }
    }

    // Bonus if PYQ metadata exists
    if (q.previousYears) {
      score += 3;
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

import { QuestionPaper } from "./types";

export function parseAnswerKeyDetailed(text: string): {
  answers: Record<number, string>;
  explanations: Record<number, string>;
} {
  const answers: Record<number, string> = {};
  const explanations: Record<number, string> = {};
  if (!text) return { answers, explanations };

  // Supports:
  // 1. a """ multiline or single line explanation """,
  // 2. c """ some explanation """,
  // Supports """ delimiter, 3+ quotes, smart/curly quotes [“"”], and backward-compatible formats
  const pattern =
    /(\d+)[\.\)\s\-\:\t]+\s*([A-Da-d])(?:\s*[\"“”]{3,}([\s\S]*?)[\"“”]{3,})?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const qNo = parseInt(match[1], 10);
    const ans = match[2].toUpperCase();
    answers[qNo] = ans;
    if (match[3] !== undefined) {
      const cleaned = match[3].replace(/^[\"“”\s]+|[\"“”\s,]+$/g, "").trim();
      if (cleaned.length > 0) {
        explanations[qNo] = cleaned;
      }
    }
  }
  return { answers, explanations };
}

export function parseAnswerKeyText(text: string): Record<number, string> {
  return parseAnswerKeyDetailed(text).answers;
}

export function parseAnswerKeyExplanations(
  text: string,
): Record<number, string> {
  return parseAnswerKeyDetailed(text).explanations;
}

export function formatTimeSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function getStandardTimeMinutes(
  category?: string,
  examType?: string,
): number {
  return category === "prelims" || examType === "objective" ? 120 : 180;
}

export function hasAnswerKey(paper: QuestionPaper): boolean {
  if (paper.examType === "subjective") return false;
  if (paper.answerKey && Object.keys(paper.answerKey).length > 0) return true;
  if (paper.answerKeyText && paper.answerKeyText.trim().length > 0) return true;
  if (paper.akUrl && paper.akUrl.trim().length > 0) return true;
  return false;
}

export function hasSolution(paper: QuestionPaper): boolean {
  return Boolean(paper.exsUrl && paper.exsUrl.trim().length > 0);
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

// Available paper years in repository: 2026, 2025, 2024
export const SUPPORTED_YEARS = ["2026", "2025", "2024"];

/**
 * Helper to extract clean human-readable identifier from custom paper id
 */
export function formatCustomIdentifier(paperId: string): string {
  if (!paperId) return "";
  // Case 1: custom_userId_year_identifier
  const matchWithUser = paperId.match(/^custom_[a-f0-9]+_\d{4}_(.+)$/i);
  if (matchWithUser && matchWithUser[1]) {
    return matchWithUser[1]
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // Case 2: custom_year_identifier_timestamp
  const matchWithTimestamp = paperId.match(/^custom_\d{4}_(.+)_[a-z0-9]+$/i);
  if (matchWithTimestamp && matchWithTimestamp[1]) {
    return matchWithTimestamp[1]
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // Case 3: custom_identifier
  const matchGeneric = paperId.match(/^custom_(.+)$/i);
  if (matchGeneric && matchGeneric[1]) {
    return matchGeneric[1]
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return paperId;
}

/**
 * Helper to identify if a paper was uploaded by the user
 */
export function isUserUploadedPaper(paper: QuestionPaper): boolean {
  if (!paper || !paper.id) return false;
  return Boolean(
    paper.isCustom ||
    paper.userId ||
    paper.id.startsWith("custom_") ||
    paper.subject === "Custom Practice",
  );
}

/**
 * Helper to get the user-facing title for any paper.
 * For user-uploaded custom papers, guarantees that the user-entered Identifier / Name
 * is displayed rather than hardcoded presets like "2026 – GS I".
 */
export function getPaperDisplayTitle(paper: QuestionPaper): string {
  if (!paper) return "";
  if (isUserUploadedPaper(paper)) {
    // If paper.label or paper.title exists and is not the generic "2026 – GS I", use it
    if (
      paper.label &&
      !paper.label.match(/^\d{4}\s*–\s*(GS\s*I|GS\s*II\s*CSAT|Mains.*)$/i)
    ) {
      return paper.label;
    }
    if (
      paper.title &&
      !paper.title.match(/^\d{4}\s*–\s*(GS\s*I|GS\s*II\s*CSAT|Mains.*)$/i)
    ) {
      return paper.title;
    }
    // Extract identifier from id
    const fromId = formatCustomIdentifier(paper.id);
    if (fromId) return fromId;
  }
  return paper.label || `${paper.year} – ${paper.subject}`;
}

/**
 * Checks if a question paper is part of the completely free tier.
 * Only 2026 Prelims papers (GS Paper I & CSAT Paper II) and all user-uploaded custom papers are free.
 * Official archival papers (2024, 2025, and all Mains papers) require Pro Vault access.
 */
export function isPaperFree(paper: QuestionPaper): boolean {
  if (isUserUploadedPaper(paper)) {
    return true;
  }
  return paper.year === "2026" && paper.category === "prelims";
}

// Comprehensive built-in papers with exact UPSC exam-specific rules
export const INITIAL_PAPERS: QuestionPaper[] = [
  {
    id: "2026_prelims_general_studies_paper_i",
    year: "2026",
    category: "prelims",
    examType: "objective",
    subject: "GS I",
    label: "2026 – Prelims GS I",
    totalQuestions: 100,
    totalMarks: 200,
    correctMarks: 2,
    incorrectMarks: 0.667,
    timeMinutes: 120,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/prelims/general_studies_paper_i.pdf",
    akUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/answer_keys/2026/prelims/general_studies_paper_i.txt",
    answerKey: {},
  },
  {
    id: "2026_prelims_general_studies_paper_ii",
    year: "2026",
    category: "prelims",
    examType: "objective",
    subject: "GS II CSAT",
    label: "2026 – Prelims GS II CSAT",
    totalQuestions: 80,
    totalMarks: 200,
    correctMarks: 2.5,
    incorrectMarks: 0.833,
    timeMinutes: 120,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/prelims/general_studies_paper_ii.pdf",
    akUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/answer_keys/2026/prelims/general_studies_paper_ii.txt",
    exsUrl: "/solutions/2026/prelims/general_studies_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_essay",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "Essay",
    label: "2026 – Mains Essay",
    totalQuestions: 2,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/essay.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_general_studies_paper_i",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "Mains GS I",
    label: "2026 – Mains GS I",
    totalQuestions: 20,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/general_studies_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_general_studies_paper_ii",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "Mains GS II",
    label: "2026 – Mains GS II",
    totalQuestions: 20,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/general_studies_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_general_studies_paper_iii",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "Mains GS III",
    label: "2026 – Mains GS III",
    totalQuestions: 20,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/general_studies_paper_iii.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_general_studies_paper_iv",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "Mains GS IV (Ethics)",
    label: "2026 – Mains GS IV (Ethics)",
    totalQuestions: 19,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/general_studies_paper_iv.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_geography_paper_i",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "Geography Paper I",
    label: "2026 – Mains Geography Paper I",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/geography_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_geography_paper_ii",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "Geography Paper II",
    label: "2026 – Mains Geography Paper II",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/geography_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_gujarati_compulsory",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "Gujarati (Compulsory)",
    label: "2026 – Mains Gujarati (Compulsory)",
    totalQuestions: 6,
    totalMarks: 300,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/gujarati_compulsory.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_gujarati_literature_paper_i",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "Gujarati Lit Paper I",
    label: "2026 – Mains Gujarati Lit Paper I",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/gujarati_literature_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_gujarati_literature_paper_ii",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "Gujarati Lit Paper II",
    label: "2026 – Mains Gujarati Lit Paper II",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/gujarati_literature_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_political_science_and_international_relations_paper_i",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "PSIR Paper I",
    label: "2026 – Mains PSIR Paper I",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/political_science_and_international_relations_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_political_science_and_international_relations_paper_ii",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "PSIR Paper II",
    label: "2026 – Mains PSIR Paper II",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/political_science_and_international_relations_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_sociology_paper_i",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "Sociology Paper I",
    label: "2026 – Mains Sociology Paper I",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/sociology_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2026_mains_sociology_paper_ii",
    year: "2026",
    category: "mains",
    examType: "subjective",
    subject: "Sociology Paper II",
    label: "2026 – Mains Sociology Paper II",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2026/mains/sociology_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2025_prelims_general_studies_paper_i",
    year: "2025",
    category: "prelims",
    examType: "objective",
    subject: "GS I",
    label: "2025 – Prelims GS I",
    totalQuestions: 100,
    totalMarks: 200,
    correctMarks: 2,
    incorrectMarks: 0.667,
    timeMinutes: 120,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/prelims/general_studies_paper_i.pdf",
    akUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/answer_keys/2025/prelims/general_studies_paper_i.txt",
    answerKey: {},
  },
  {
    id: "2025_prelims_general_studies_paper_ii",
    year: "2025",
    category: "prelims",
    examType: "objective",
    subject: "GS II CSAT",
    label: "2025 – Prelims GS II CSAT",
    totalQuestions: 80,
    totalMarks: 200,
    correctMarks: 2.5,
    incorrectMarks: 0.833,
    timeMinutes: 120,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/prelims/general_studies_paper_ii.pdf",
    akUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/answer_keys/2025/prelims/general_studies_paper_ii.txt",
    exsUrl: "/solutions/2025/prelims/general_studies_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_essay",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "Essay",
    label: "2025 – Mains Essay",
    totalQuestions: 2,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/essay.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_general_studies_paper_i",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "Mains GS I",
    label: "2025 – Mains GS I",
    totalQuestions: 20,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/general_studies_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_general_studies_paper_ii",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "Mains GS II",
    label: "2025 – Mains GS II",
    totalQuestions: 20,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/general_studies_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_general_studies_paper_iii",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "Mains GS III",
    label: "2025 – Mains GS III",
    totalQuestions: 20,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/general_studies_paper_iii.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_general_studies_paper_iv",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "Mains GS IV (Ethics)",
    label: "2025 – Mains GS IV (Ethics)",
    totalQuestions: 19,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/general_studies_paper_iv.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_geography_paper_i",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "Geography Paper I",
    label: "2025 – Mains Geography Paper I",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/geography_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_geography_paper_ii",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "Geography Paper II",
    label: "2025 – Mains Geography Paper II",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/geography_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_gujarati_compulsory",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "Gujarati (Compulsory)",
    label: "2025 – Mains Gujarati (Compulsory)",
    totalQuestions: 6,
    totalMarks: 300,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/gujarati_compulsory.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_gujarati_literature_paper_i",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "Gujarati Lit Paper I",
    label: "2025 – Mains Gujarati Lit Paper I",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/gujarati_literature_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_gujarati_literature_paper_ii",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "Gujarati Lit Paper II",
    label: "2025 – Mains Gujarati Lit Paper II",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/gujarati_literature_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_political_science_and_international_relation_paper_i",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "PSIR Paper I",
    label: "2025 – Mains PSIR Paper I",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/political_science_and_international_relation_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_political_science_and_international_relation_paper_ii",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "PSIR Paper II",
    label: "2025 – Mains PSIR Paper II",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/political_science_and_international_relation_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_sociology_paper_i",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "Sociology Paper I",
    label: "2025 – Mains Sociology Paper I",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/sociology_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2025_mains_sociology_paper_ii",
    year: "2025",
    category: "mains",
    examType: "subjective",
    subject: "Sociology Paper II",
    label: "2025 – Mains Sociology Paper II",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2025/mains/sociology_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2024_prelims_general_studies_paper_i",
    year: "2024",
    category: "prelims",
    examType: "objective",
    subject: "GS I",
    label: "2024 – Prelims GS I",
    totalQuestions: 100,
    totalMarks: 200,
    correctMarks: 2,
    incorrectMarks: 0.667,
    timeMinutes: 120,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/prelims/general_studies_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2024_prelims_general_studies_paper_ii",
    year: "2024",
    category: "prelims",
    examType: "objective",
    subject: "GS II CSAT",
    label: "2024 – Prelims GS II CSAT",
    totalQuestions: 80,
    totalMarks: 200,
    correctMarks: 2.5,
    incorrectMarks: 0.833,
    timeMinutes: 120,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/prelims/general_studies_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_essay",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "Essay",
    label: "2024 – Mains Essay",
    totalQuestions: 2,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/essay.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_general_studies_paper_i",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "Mains GS I",
    label: "2024 – Mains GS I",
    totalQuestions: 20,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/general_studies_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_general_studies_paper_ii",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "Mains GS II",
    label: "2024 – Mains GS II",
    totalQuestions: 20,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/general_studies_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_general_studies_paper_iii",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "Mains GS III",
    label: "2024 – Mains GS III",
    totalQuestions: 20,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/general_studies_paper_iii.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_general_studies_paper_iv",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "Mains GS IV (Ethics)",
    label: "2024 – Mains GS IV (Ethics)",
    totalQuestions: 19,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/general_studies_paper_iv.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_geography_paper_i",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "Geography Paper I",
    label: "2024 – Mains Geography Paper I",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/geography_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_geography_paper_ii",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "Geography Paper II",
    label: "2024 – Mains Geography Paper II",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/geography_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_gujarati_compulsory",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "Gujarati (Compulsory)",
    label: "2024 – Mains Gujarati (Compulsory)",
    totalQuestions: 6,
    totalMarks: 300,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/gujarati_compulsory.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_gujarati_literature_paper_i",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "Gujarati Lit Paper I",
    label: "2024 – Mains Gujarati Lit Paper I",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/gujarati_literature_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_gujarati_literature_paper_ii",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "Gujarati Lit Paper II",
    label: "2024 – Mains Gujarati Lit Paper II",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/gujarati_literature_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_political_science_and_international_relations_paper_i",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "PSIR Paper I",
    label: "2024 – Mains PSIR Paper I",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/political_science_and_international_relations_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_political_science_and_international_relations_paper_ii",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "PSIR Paper II",
    label: "2024 – Mains PSIR Paper II",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/political_science_and_international_relations_paper_ii.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_sociology_paper_i",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "Sociology Paper I",
    label: "2024 – Mains Sociology Paper I",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/sociology_paper_i.pdf",
    answerKey: {},
  },
  {
    id: "2024_mains_sociology_paper_ii",
    year: "2024",
    category: "mains",
    examType: "subjective",
    subject: "Sociology Paper II",
    label: "2024 – Mains Sociology Paper II",
    totalQuestions: 8,
    totalMarks: 250,
    correctMarks: 0,
    incorrectMarks: 0,
    timeMinutes: 180,
    qpUrl:
      "https://ysfxntczlyomrpiuutmo.supabase.co/storage/v1/object/public/papers/papers/2024/mains/sociology_paper_ii.pdf",
    answerKey: {},
  },
];

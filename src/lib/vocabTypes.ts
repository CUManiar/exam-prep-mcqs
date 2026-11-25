export interface VocabSRS {
  /** Days until next scheduled review */
  intervalDays: number;
  /** SM-2 / FSRS-inspired ease factor (default 2.5, min 1.3) */
  easeFactor: number;
  /** Consecutive successful recalls */
  reps: number;
  /** Number of times forgotten */
  lapses: number;
  /** YYYY-MM-DD when card is next due for review */
  nextReviewDate: string;
  /** ISO timestamp of last review */
  lastReviewedAt?: string;
}

export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface VocabCard {
  id: string;
  word: string;
  meaning: string;
  memoryHook: string; // Relatable mnemonic to remember it easily
  example: string; // Practical UPSC/editorial usage sentence
  dateAdded: string; // YYYY-MM-DD for tracking 4-5 words/day habit
  mastered: boolean;
  createdAt: string;

  // Cognitive & visual enrichment fields (optional for backward compatibility)
  partOfSpeech?: string; // e.g., "noun", "adjective", "verb"
  phonetic?: string; // e.g., "/hɪˈdʒɛm.ə.ni/" or syllable guide "hi-JEM-uh-nee"
  rootBreakdown?: string; // Etymology / root clue, e.g. "Greek hēgemōn (leader)"
  synonyms?: string[]; // 2-3 high-level synonyms
  antonyms?: string[]; // 1-2 contrasting antonyms
  collocations?: string[]; // 2-3 essay-ready phrases, e.g. "cultural hegemony"
  nuanceTip?: string; // Register/tone tip, e.g. "Formal analytical; carries critical undertone"
  srs?: VocabSRS;
}

export interface PracticeQuestion {
  cardId: string;
  word: string;
  statementWithBlank: string; // E.g. "The country exerted economic _____ over its neighboring trading partners."
  options?: string[]; // 3-4 options if multiple choice, or empty for open fill-in
  hint?: string;
}

export interface SentenceEvaluationResponse {
  isNatural: boolean;
  feedback: string;
  improvedSentence?: string;
}

export interface VocabCard {
  id: string;
  word: string;
  meaning: string;
  memoryHook: string; // Relatable mnemonic to remember it easily
  example: string; // Practical UPSC/editorial usage sentence
  dateAdded: string; // YYYY-MM-DD for tracking 4-5 words/day habit
  mastered: boolean;
  createdAt: string;
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

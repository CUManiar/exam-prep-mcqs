export interface ExamSettings {
  defaultTotalQuestions: number;
  defaultCorrectMarks: number;
  defaultIncorrectMarks: number;
  skippedMarks: number; // Always 0
  defaultTimeMinutes: number;
  fastStartWithDefaults: boolean;
}

export interface QuestionPaper {
  id: string;
  year: string;
  subject: string;
  label: string;
  qpUrl: string;
  akUrl?: string;
  exsUrl?: string;
  answerKeyText?: string;
  answerKey: Record<number, string>;
  isCustom?: boolean;
}

export interface QuestionAnswer {
  questionNo: number;
  selected: string | null;
  correctAnswer?: string;
  isCorrect?: boolean | null;
  flagged?: boolean;
  note?: string;
}

export interface Attempt {
  id: string;
  paperId: string;
  paperLabel: string;
  mode: 'practice' | 'mock';
  startedAt: string;
  finishedAt?: string;
  totalQuestions: number;
  correctMarks: number;
  incorrectMarks: number;
  timeMinutes: number;
  durationSeconds: number;
  answered: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  maxScore: number;
  accuracyPct: number;
  answers: Record<number, QuestionAnswer>;
  generalNotes?: string;
}

export type ActivePage = 'dashboard' | 'papers' | 'session' | 'history' | 'upload';

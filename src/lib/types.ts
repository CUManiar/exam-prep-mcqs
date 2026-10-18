export type ExamType = "objective" | "subjective";
export type ExamCategory = "prelims" | "mains";

export interface QuestionPaper {
  id: string;
  year: string;
  category: ExamCategory; // 'prelims' | 'mains'
  examType: ExamType; // 'objective' | 'subjective'
  subject: string; // 'GS I', 'GS II CSAT', 'Essay', 'GS I (Mains)', etc.
  label: string;
  title?: string;
  totalQuestions: number; // 100 for GS1, 80 for GS2, 20 for Mains
  totalMarks: number; // 200 for GS1/GS2, 250 for Mains
  correctMarks: number; // 2.0 for GS1, 2.5 for GS2, 0 for subjective
  incorrectMarks: number; // 0.667 for GS1, 0.833 for GS2, 0 for subjective
  timeMinutes: number; // 120 for Prelims, 180 for Mains
  qpUrl: string;
  akUrl?: string;
  exsUrl?: string;
  answerKeyText?: string;
  answerKey: Record<number, string>;
  explanations?: Record<number, string>;
  isCustom?: boolean;
  userId?: string;
}

export type ConfidenceLevel = "sure" | "50-50" | "guess";

export interface QuestionAnswer {
  questionNo: number;
  selected: string | null;
  correctAnswer?: string;
  isCorrect?: boolean | null;
  confidence?: ConfidenceLevel;
  flagged?: boolean;
  note?: string;
  explanation?: string;
  timeSpentSeconds?: number;
  changesCount?: number;
  answerHistory?: string[];
  submissionFileUrl?: string;
  submissionFileName?: string;
}

export interface Attempt {
  id: string;
  paperId: string;
  paperLabel: string;
  category: ExamCategory;
  examType: ExamType;
  mode: "practice" | "mock";
  startedAt: string;
  finishedAt?: string;
  totalQuestions: number;
  totalMarks: number;
  correctMarks: number;
  incorrectMarks: number;
  timeMinutes: number;
  durationSeconds: number;
  overtimeSeconds?: number;
  answered: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  maxScore: number;
  accuracyPct: number;
  avgTimePerQuestion?: number;
  avgTimeCorrect?: number;
  avgTimeIncorrect?: number;
  alteredCount?: number;
  alteredHarmCount?: number;
  alteredBenefitCount?: number;
  answers: Record<number, QuestionAnswer>;
  generalNotes?: string;
  userSubmissionPdfUrl?: string; // For subjective Mains handwritten answers
  idleTimeSeconds?: number; // Reading instructions, cover page & non-question buffer time
}

export type ActivePage =
  "dashboard" | "papers" | "session" | "history" | "upload" | "attempt-detail";

export interface ActiveSessionDraft {
  paperId: string;
  paperLabel: string;
  mode: "practice" | "mock";
  currentQuestion: number | null;
  answers: Record<number, QuestionAnswer>;
  elapsedSeconds: number;
  qTimeSpent: Record<number, number>;
  idleTimeSeconds?: number;
  pausedAt: string;
  isExited?: boolean;
}

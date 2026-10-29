export type ExamType = "objective" | "subjective";
export type ExamCategory = "prelims" | "mains";
export type CutoffType = "percentage" | "marks";

export interface ParsedQuestion {
  questionNo: number;
  text: string;
  /** Empty for a cloze/free-text question. */
  options: Record<string, string>; // e.g. { A: "...", B: "...", C: "...", D: "..." }
  matchingItems?: MatchingItem[];
  matchingHeaders?: {
    left: string;
    right: string;
  };
  answer?: string;
  explanation?: string;
  subject?: string;
  topic?: string;
}

export interface MatchingItem {
  label: string;
  left: string;
  rightLabel: string;
  right: string;
}

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
  markdownContent?: string;
  parsedQuestions?: ParsedQuestion[];
  instructions?: string[];
  cutoffEnabled?: boolean;
  cutoffType?: CutoffType;
  cutoffValue?: number;
}

export type ConfidenceLevel = "sure" | "50-50" | "guess" | "elimination";
export type SubjectiveAssessment =
  "strong" | "partial" | "needs-work" | "no-attempt";

export interface QuestionAnswer {
  questionNo: number;
  selected: string | null;
  correctAnswer?: string;
  isCorrect?: boolean | null;
  confidence?: ConfidenceLevel;
  flagged?: boolean;
  subjectiveAssessment?: SubjectiveAssessment;
  subjectiveMarks?: number;
  note?: string;
  explanation?: string;
  timeSpentSeconds?: number;
  changesCount?: number;
  answerHistory?: string[];
  submissionFileUrl?: string;
  submissionFileName?: string;
  subject?: string;
  topic?: string;
}

export interface Attempt {
  id: string;
  userId?: string;
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
  partial?: number;
  incorrect: number;
  unattempted: number;
  score: number;
  maxScore: number;
  percentagePct?: number;
  accuracyPct: number;
  cutoffEnabled?: boolean;
  cutoffType?: CutoffType;
  cutoffValue?: number;
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
  | "dashboard"
  | "papers"
  | "session"
  | "history"
  | "upload"
  | "syllabus"
  | "attempt-detail";

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

export type AppNotificationType = "result" | "paper" | "session" | "system";

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  createdAt: string;
  href?: string;
  read: boolean;
}

export interface SyllabusItem {
  id: string;
  title: string;
  paperId?: string;
  parentId?: string | null;
  sourceKey?: string;
  topicKey?: string;
  dueDate?: string;
  completed: boolean;
  notes?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

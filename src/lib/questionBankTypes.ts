import { MatchingItem } from "./types";
import type { PaperStream } from "./paperStream";

export type ExamStage = "prelims" | "mains" | "optional";
export type QuestionType = "mcq" | "subjective" | "cloze" | "matching";

export interface QuestionBankEntity {
  id: string; // e.g., "qb_upsc_2024_gs1_q1" or uuid
  userId?: string | null; // NULL for public preloaded PYQs, User UUID for private uploaded questions
  sourcePaperId: string;
  sourcePaperTitle: string;
  sourcePaperYear: string;
  questionNo: number;

  // Taxonomy & Stage
  examStage: ExamStage;
  questionType: QuestionType;
  paperStream?: PaperStream;
  optionalName?: string;
  subject: string;
  topic?: string;
  subtopic?: string;
  syllabusNodeIds?: string[];
  previousYears?: string;
  tags?: string[];

  // Content
  contentMarkdown: string;
  options?: Record<string, string>; // { A: "...", B: "...", C: "...", D: "..." } for MCQs
  matchingItems?: MatchingItem[];
  correctAnswer?: string;
  explanationMarkdown?: string;
  rubric?: Record<string, any>; // For Mains subjective rubric criteria

  // Scoring & Constraints
  marks: number;
  negativeMarks: number;
  wordLimit?: number; // E.g. 150 or 250 words for Mains

  createdAt?: string;
  updatedAt?: string;
}

export interface QuestionBankQueryFilter {
  userId?: string;
  examStage?: ExamStage;
  questionType?: QuestionType;
  paperStream?: PaperStream;
  subject?: string;
  topic?: string;
  syllabusNodeId?: string;
  sourcePaperId?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

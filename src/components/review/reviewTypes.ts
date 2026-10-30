import { SubjectiveAssessment } from "../../lib/types";

export type FilterTabType =
  | "all"
  | "correct"
  | "incorrect"
  | "skipped"
  | "flagged"
  | "altered"
  | "slow"
  | "sure"
  | "50-50"
  | "elimination"
  | "guess"
  | "non-mcq";

export interface ReviewFilterState {
  outcome?: "incorrect" | "correct" | "skipped" | null;
  confidence?: "sure" | "50-50" | "guess" | "elimination" | null;
  flagged?: boolean;
  slow?: boolean;
  altered?: boolean;
}

export const EMPTY_FILTER_STATE: ReviewFilterState = {
  outcome: null,
  confidence: null,
  flagged: false,
  slow: false,
  altered: false,
};

export function isFilterActive(filters: ReviewFilterState): boolean {
  return Boolean(
    filters.outcome ||
      filters.confidence ||
      filters.flagged ||
      filters.slow ||
      filters.altered,
  );
}

export type SortOptionType =
  | "qno_asc"
  | "qno_desc"
  | "time_asc"
  | "time_desc";

export interface CutoffVerdict {
  isCsat: boolean;
  targetScore: number;
  targetLabel: string;
  diff: number;
  status: string;
  statusColor: string;
  barColor: string;
  message: string;
}

export interface TakeawayItem {
  id: string;
  title: string;
  metric: string;
  desc: string;
  badge: string;
  badgeStyle: string;
  iconType: "negative" | "confidence" | "pacing";
  actionTab: FilterTabType;
  actionFilter?: ReviewFilterState;
  actionText: string;
}

export interface ReviewSuggestion {
  id: string;
  title: string;
  desc: string;
  targetTab: FilterTabType;
}

/** Props shared by most review sub-components. */
export interface ReviewContext {
  /** Stable flag helpers */
  isClozeQuestion: (qNo: number) => boolean;
  isAssessmentQuestion: (qNo: number) => boolean;
  isQuestionAnswered: (q: { selected: string | null; subjectiveAssessment?: SubjectiveAssessment }) => boolean;
  getFullMarks: (qNo: number) => number;
  getAssessmentMarks: (qNo: number, assessment?: SubjectiveAssessment, subjectiveMarks?: number) => number;
  formatReviewNumber: (value: number) => string;
}

import { RevisionProviderConfig } from "./types";

export interface MainsRubricScore {
  score: number;
  max: number;
  comment: string;
}

export interface MainsEvaluationResult {
  id: string;
  question: string;
  studentAnswer: string;
  paperType: "GS-1" | "GS-2" | "GS-3" | "GS-4" | "Optional";
  optionalSubject?: string;
  maxMarks: 10 | 15 | 20;
  targetWordCount: number;
  actualWordCount: number;
  marksAwarded: number;
  percentage: number;
  verdict: "Top Tier (Safe Zone)" | "Good Attempt" | "Average" | "Below Average";
  directive: string;
  directiveAnalysis: string;
  rubric: {
    introduction: MainsRubricScore;
    bodyContent: MainsRubricScore;
    structurePresentation: MainsRubricScore;
    valueAddition: MainsRubricScore;
    conclusion: MainsRubricScore;
  };
  strengths: string[];
  weaknesses: string[];
  missingDimensions: string[];
  actionableRoadmap: string[];
  diagramIdea?: string;
  modelAnswer: string;
  evaluatedAt: string;
}

export interface MainsEvaluationSession {
  id: string;
  title: string;
  updatedAt: string;
  question: string;
  studentAnswer: string;
  paperType: "GS-1" | "GS-2" | "GS-3" | "GS-4" | "Optional";
  optionalSubject?: string;
  maxMarks: 10 | 15 | 20;
  attachedImages?: string[]; // base64 strings
  evaluation?: MainsEvaluationResult;
}

export const MAINS_STORAGE_KEY = "upsc_mains_evaluations_v1";

/**
 * Loads saved evaluation sessions from localStorage
 */
export function loadMainsSessions(): MainsEvaluationSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MAINS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Failed to load saved mains evaluation sessions:", e);
    return [];
  }
}

/**
 * Saves evaluation sessions to localStorage (unlimited storage)
 */
export function saveMainsSessions(sessions: MainsEvaluationSession[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MAINS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.warn("Failed to save mains evaluations to localStorage:", e);
  }
}

/**
 * Creates the strict UPSC Examiner System Prompt for Mains Answer Evaluation
 */
export function buildMainsEvaluationPrompt(params: {
  question: string;
  answerText: string;
  paperType: string;
  optionalSubject?: string;
  maxMarks: number;
  hasAttachment?: boolean;
}): string {
  const { question, answerText, paperType, optionalSubject, maxMarks } = params;
  const wordLimit = maxMarks === 10 ? 150 : maxMarks === 15 ? 250 : 300;

  return `You are a strict, senior UPSC Civil Services Examination (CSE) Mains Evaluator and Subject Expert.

EXAMINATION STANDARD:
- Paper: ${paperType}${optionalSubject ? ` (${optionalSubject})` : ""}
- Question Weightage: ${maxMarks} Marks
- Target Word Limit: ${wordLimit} Words

YOUR EVALUATION METHODOLOGY:
1. Strict UPSC Marking Standards:
   - Average answers score 3.0 to 4.5 out of 10, or 5.0 to 6.5 out of 15.
   - Above-average/Topper answers score 5.0 to 6.5 out of 10, or 7.5 to 9.0 out of 15.
   - Never award unrealistic 8+/10 or 12+/15 marks. Be honest, rigorous, and constructive.
2. Directive Adherence:
   - Identify the operational directive (e.g., Critically Examine, Discuss, Elucidate, Evaluate, Analyse).
   - Test whether the candidate truly addressed the directive or merely wrote a generic descriptive essay.
3. 5-Component Rubric Breakdown:
   - Introduction: Context, crisp definition, or contemporary relevance (15–20 words).
   - Body Content & Arguments: Multi-dimensional subheadings (Socio-Economic, Constitutional, Administrative, Environmental, International, Ethical).
   - Structure & Presentation: Bullet formatting, clear headers, micro-flowchart or diagram idea.
   - Value Addition: Concrete citations (Articles, Landmark Judgements with year, 2nd ARC, NITI Aayog, Committees, Economic Survey, Budget, or Thinkers if Optional).
   - Conclusion: Balanced, forward-looking way forward (SDGs, Constitutional Morality, Amrit Kaal targets).
4. Model Answer:
   - Provide a complete, topper-standard Model Answer strictly matching the ${wordLimit}-word limit.
   - Must include an enrichment box with high-impact data/case laws/committee recommendations.

CANDIDATE SUBMISSION TO EVALUATE:
[QUESTION]:
${question}

[STUDENT'S ANSWER]:
${answerText || "(Handwritten / Typed answer provided in attached image or document)"}

OUTPUT FORMAT:
You MUST return your response as a valid, parsable JSON object matching this schema exactly:
{
  "marksAwarded": 4.5,
  "maxMarks": ${maxMarks},
  "verdict": "Good Attempt" | "Average" | "Below Average" | "Top Tier (Safe Zone)",
  "directive": "Directive found in question (e.g. Critically Examine)",
  "directiveAnalysis": "1-2 sentences on how well candidate satisfied this directive",
  "rubric": {
    "introduction": { "score": 1.0, "max": 2.0, "comment": "Feedback on intro" },
    "bodyContent": { "score": 2.5, "max": 4.5, "comment": "Feedback on arguments and dimensions" },
    "structurePresentation": { "score": 0.5, "max": 1.5, "comment": "Feedback on structure, headings, points" },
    "valueAddition": { "score": 0.5, "max": 1.5, "comment": "Feedback on Articles, cases, reports, data" },
    "conclusion": { "score": 0.5, "max": 1.5, "comment": "Feedback on way forward" }
  },
  "strengths": [
    "Specific strength 1 with evidence from candidate's answer",
    "Specific strength 2"
  ],
  "weaknesses": [
    "Specific weakness 1",
    "Specific weakness 2"
  ],
  "missingDimensions": [
    "Missing perspective 1 (e.g. Administrative bottleneck / federal friction)",
    "Missing perspective 2 (e.g. Relevant Article or SC Judgement)"
  ],
  "actionableRoadmap": [
    "Immediate fix 1 to gain +1.0 mark",
    "Immediate fix 2"
  ],
  "diagramIdea": "Concise description of 1 micro-diagram or flowchart that would save words and catch the examiner's eye",
  "modelAnswer": "Full topper-grade model answer with Markdown headings, bullet points, citations, and forward-looking conclusion."
}`;
}

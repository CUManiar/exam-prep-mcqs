import { RevisionProviderConfig } from "./types";

export interface MainsDimensionScore {
  score: number;
  max: number;
  comment: string;
}

export interface MainsMarkedCopyItem {
  quote: string;
  note: string;
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
  timeLimitMinutes: number;
  marksAwarded: number;
  percentage: number;
  verdict: string;
  directive: string;
  directiveAnalysis: string;
  dimensions: {
    demand: MainsDimensionScore;
    content: MainsDimensionScore;
    structure: MainsDimensionScore;
    presentation: MainsDimensionScore;
  };
  markedCopy?: MainsMarkedCopyItem[];
  weaknesses: string[];
  missingDimensions: string[];
  actionableRoadmap: string[];
  diagramIdea?: string;
  modelAnswer: string;
  evaluatedAt: string;
  // Backward compatibility
  rubric?: Record<string, any>;
  strengths?: string[];
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
  question?: string;
  answerText: string;
  paperType: string;
  optionalSubject?: string;
  maxMarks: number;
  hasAttachment?: boolean;
}): string {
  const { question, answerText, paperType, optionalSubject, maxMarks } = params;
  const wordLimit = maxMarks === 10 ? 150 : maxMarks === 15 ? 250 : 300;
  const timeLimit = maxMarks === 10 ? 7 : maxMarks === 15 ? 11 : 20;
  const trimmedQ = (question || "").trim();
  const isSociology =
    paperType === "Optional" &&
    (optionalSubject || "").toLowerCase().includes("socio");
  const isEthics = paperType === "GS-4";

  return `Act as a strict, senior UPSC Civil Services Examination (CSE) Mains Examiner. Evaluate the candidate's answer with uncompromising realism.

EXAM SCALE & PARAMETERS:
- Paper: ${paperType}${optionalSubject ? ` (${optionalSubject})` : ""}
- Question Weightage: ${maxMarks} Marks
- Word Limit: ${wordLimit} Words (Must be realistically writable in ${timeLimit} minutes)
- Realistic Scaling: 3.0–4.0/10 is typical average; 5.0+/10 is topper-level. Never inflate marks. Never invent facts; flag uncertain ones with ⚠️ VERIFY.

EVALUATE AND SCORE FOUR CORE DIMENSIONS (Score each strictly /10, numbers only):
1. Demand (/10): Operational directive compliance (e.g. Critically Examine, Discuss, Give Reasons), every sub-part answered, limits observed.
2. Content (/10): Accuracy, depth, authentic citations (Articles, Judgments, Committees, Reports, Data, Examples).
${
  isSociology
    ? "   * Sociology Specifics: Exact sociological terms, thinkers (e.g. Weber, Durkheim, Marx, Parsons, Srinivas, Ghurye), Indian empirical examples, and analytical verdict (no years unless idea-bearing)."
    : isEthics
      ? "   * GS-4 Ethics Specifics: Stakeholders, ethical dilemmas, options evaluated, chosen action justified, moral & constitutional values explicitly named."
      : "   * General Studies Specifics: Multi-dimensional sub-headings (Constitutional, Socio-Economic, Administrative, Global) grounded in empirical policy data."
}
3. Structure (/10): Introduction (15-20 words), question keywords used as subheadings, numbered arguments, counterview sentence, and a synthesis verdict line.
4. Presentation (/10): Within word limit, exam-writable in ${timeLimit} minutes under exam-hall time pressure, table/flowchart where it earns marks.

CRUCIAL EXAMINER CHECKS:
- Did the candidate use the question's operational key words as headings?
- Is each point complete: claim + case/example?
- Counterview sentence present before verdict line?
- Writable in ${timeLimit} minutes?

STYLE REQUIREMENTS:
- Blunt, concise, strictly ≤6 words per weakness pointer.
- One witty or sharp examiner line allowed in verdict; never at accuracy's cost.
- Marked copy: Quote 2 to 4 actual snippets/sentences from the student's submission and provide specific margin notes, corrections, or flags.
- If the attached sheet is completely blank, illegible, or contains no student attempt, do NOT simulate an answer. Set "marksAwarded": 0, "verdict": "Below Average", and set "directiveAnalysis": "The submitted sheet was blank, unreadable, or did not contain an answer to evaluate."

CANDIDATE SUBMISSION TO EVALUATE:
[QUESTION]:
${trimmedQ || "(Question is written at the top of the attached answer sheet or document)"}

[STUDENT'S ANSWER]:
${answerText || "(Handwritten / Typed answer provided in attached image or document)"}

OUTPUT FORMAT:
Return ONLY a valid, parsable JSON object matching this schema exactly:
{
  "question": "${trimmedQ ? trimmedQ.replace(/"/g, '\\"') : "Exact UPSC question transcribed from submission"}",
  "marksAwarded": 4.0,
  "maxMarks": ${maxMarks},
  "verdict": "One-line blunt examiner verdict on this attempt.",
  "directive": "Directive found in question (e.g. Discuss, Give Reasons, Critically Analyse)",
  "directiveAnalysis": "1-2 sentences on how candidate addressed or missed the directive.",
  "dimensions": {
    "demand": { "score": 4.5, "max": 10, "comment": "Directive and question sub-parts addressed." },
    "content": { "score": 4.0, "max": 10, "comment": "Depth, accuracy, citations, and empirical evidence." },
    "structure": { "score": 5.0, "max": 10, "comment": "Intro, keyword headings, numbering, counterview." },
    "presentation": { "score": 4.5, "max": 10, "comment": "Word count compliance and ${timeLimit}-min time writability." }
  },
  "markedCopy": [
    { "quote": "Exact short sentence or phrase from student's answer", "note": "Examiner margin note, correction, or ⚠️ VERIFY flag" },
    { "quote": "Another excerpt from answer", "note": "Examiner margin remark" }
  ],
  "weaknesses": [
    "Specific answer flaw (≤6 words)",
    "Another specific flaw (≤6 words)",
    "Third answer flaw (≤6 words)"
  ],
  "missingDimensions": [
    "Specific missing Article, Judgment, Committee, or Thinker",
    "Specific missing perspective or empirical data"
  ],
  "actionableRoadmap": [
    "Immediate exam-hall fix to gain +1.0 mark",
    "Second practical fix"
  ],
  "diagramIdea": "A drawn ASCII or text flowchart diagram (e.g. [Trigger] --> [Mechanism] --> [Impact]). Drawn line-by-line, not just described.",
  "modelAnswer": "### Topper Model Answer (${wordLimit} Words | ${timeLimit} Mins)\\n**Word Count:** ${wordLimit} words | Writable in ${timeLimit} min\\n\\n**Introduction (20 words)**\\n...\\n\\n**[Heading Using Question Keywords]**\\n* Point 1: Claim + specific case/citation\\n* Point 2: Claim + empirical data\\n\\n**Counterview & Synthesis**\\n...\\n\\n**Way Forward / Conclusion**\\n...\\n\\n> **Value-Addition Box**\\n> * Key Article/Thinker: ...\\n> * Landmark Case / Committee: ..."
}
`;
}

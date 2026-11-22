export interface MainsDimensionScore {
  score: number;
  max: number;
  comment: string;
}

export interface MainsMarkedCopyItem {
  quote: string;
  note: string;
  type?: "correct" | "incorrect" | "flawed" | "verify" | string;
}

export interface MainsApproachBreakdown {
  whatEarnsMarks: string[];
  structuralApproach: {
    demandDeconstruction?: string;
    introductionStrategy: string;
    bodyDimensions: Array<{ dimension: string; samplePoints: string[] }>;
    counterviewStrategy?: string;
    conclusionStrategy: string;
  };
  sampleValueAdditions?: Array<{
    type: string;
    content: string;
    whyItEarnsMarks: string;
  }>;
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
  approachBreakdown?: MainsApproachBreakdown;
  evaluatedAt: string;
  transcribedAnswer?: string;
  // Backward compatibility
  rubric?: Record<string, any>;
  strengths?: string[];
}

export interface MainsQuestionItem {
  id: string;
  questionNumber: number;
  question: string;
  studentAnswer: string;
  paperType: "GS-1" | "GS-2" | "GS-3" | "GS-4" | "Optional";
  optionalSubject?: string;
  maxMarks: 10 | 15 | 20;
  attachedImages?: Array<{ mimeType: string; data: string; name: string }>;
  evaluation?: MainsEvaluationResult;
}

export interface MainsEvaluationSession {
  id: string;
  title: string;
  isCustomTitle?: boolean;
  updatedAt: string;
  paperType: "GS-1" | "GS-2" | "GS-3" | "GS-4" | "Optional";
  optionalSubject?: string;
  questions?: MainsQuestionItem[];
  // Legacy / backward-compatibility fields:
  question?: string;
  studentAnswer?: string;
  maxMarks?: 10 | 15 | 20;
  attachedImages?: any[];
  evaluation?: MainsEvaluationResult;
}

export const MAINS_STORAGE_KEY = "upsc_mains_evaluations_v1";

/**
 * Formats a date into the required default title format: `DD MMM YYYY | DAY`
 * Example: `19 Nov 2026 | THURSDAY`
 */
export function formatMainsDefaultTitle(
  dateInput: Date | string = new Date(),
): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const day = validDate.getDate().toString().padStart(2, "0");
  const month = validDate.toLocaleDateString("en-US", { month: "short" });
  const year = validDate.getFullYear();
  const weekday = validDate
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
  return `${day} ${month} ${year} | ${weekday}`;
}

/**
 * Normalizes a session to ensure it has a valid list of questions.
 */
export function normalizeSessionQuestions(
  sess: MainsEvaluationSession,
): MainsQuestionItem[] {
  if (Array.isArray(sess.questions) && sess.questions.length > 0) {
    return sess.questions;
  }
  const legacyQ: MainsQuestionItem = {
    id: `${sess.id}_q1`,
    questionNumber: 1,
    question: sess.question || "",
    studentAnswer: sess.studentAnswer || "",
    paperType: sess.paperType || "GS-2",
    optionalSubject: sess.optionalSubject,
    maxMarks: sess.maxMarks || 10,
    attachedImages: Array.isArray(sess.attachedImages)
      ? sess.attachedImages.map((img: any, i: number) =>
          typeof img === "string"
            ? { mimeType: "image/jpeg", data: img, name: `Page ${i + 1}` }
            : img,
        )
      : [],
    evaluation: sess.evaluation,
  };
  return [legacyQ];
}

/**
 * Fast client-side check to detect if an uploaded page image is completely blank or contains negligible ink.
 */
export async function isImageBlankOrNegligible(
  dataUrl: string,
): Promise<boolean> {
  if (typeof window === "undefined" || !dataUrl) return false;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = 80;
        const h = 80;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(false);
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        let darkOrPenPixels = 0;
        const total = w * h;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Check if pixel is not transparent and significantly differs from pure paper white (e.g. handwriting/printed text)
          if (a > 30) {
            const isWhite = r > 235 && g > 235 && b > 235;
            const isUniformDark = r < 12 && g < 12 && b < 12;
            if (!isWhite && !isUniformDark) {
              darkOrPenPixels++;
            }
          }
        }

        // If less than 0.3% of pixels contain ink or variation, it's effectively a blank sheet
        resolve(darkOrPenPixels / total < 0.003);
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

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

UPSC CSE EXAMINER GRADING STANDARD (REALISTIC & RIGOROUS - NO ARTIFICIAL FLOOR):
Evaluate the candidate's actual answer strictly on its merits as an authentic UPSC CSE examiner. There is NO artificial lower floor or baseline score:
- 0.0 to 1.5 / 10 (or 0.0 to 2.5 / 15): Irrelevant, nonsensical, off-topic, buzzword soup, generic waffle, or garbage attempt. If an answer fails to address the question's core subject or lacks substance, score strictly between 0.0 and 1.5. Never award sympathy marks.
- 1.5 to 2.5 / 10 (or 2.5 to 4.0 / 15): Rudimentary / very poor attempt. Only tangentially touches the topic, fragmented points, lacks structured arguments, or contains severe conceptual errors.
- 3.0 to 4.0 / 10 (or 4.5 to 6.0 / 15): Average / Mediocre attempt. Shows basic understanding and answers parts of the question, but lacks analytical depth, authentic committee/case citations, crisp subheadings, or balanced counterviews.
- 4.5 to 5.5 / 10 (or 6.5 to 8.5 / 15): Good / Competent attempt. Addresses the full core demand, multi-dimensional (constitutional, socio-economic, administrative, global), authentic examples, solid structure, and synthesis conclusion.
- 6.0+ / 10 (or 9.0+ / 15): Exceptional / Topper attempt. Outstanding precision, specific reports/articles/thinkers cited seamlessly, insightful synthesis, excellent time-manageable presentation.

Never inflate marks. Never invent facts; flag uncertain ones with ⚠️ VERIFY.

EVALUATE AND SCORE FOUR CORE DIMENSIONS (Score each strictly from 0 to 10 based on actual merit):
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

EXHAUSTIVE LINE-BY-LINE MARKED COPY AUDIT (MANDATORY):
- Perform an exhaustive, granular line-by-line audit across the candidate's entire script (Introduction, Body arguments, Counterview, Citations, Conclusion).
- Do NOT restrict evaluation to 2-3 notes. Provide 5 to 10+ substantive excerpts from across the answer.
- For each excerpt, categorize with exact "type":
  * "correct": Accurately cited or conceptually sound argument that earned marks (explain what worked and why it fits).
  * "incorrect": Factual mistake, wrongly attributed thinker/article/data, or incorrect statement (specify the exact mistake and the correct factual reference).
  * "flawed": Informal phrasing, weak conceptual grounding, poor structuring, or missing analytical depth.
  * "verify": Dubious, unverifiable, or doubtful fact/citation (marked with ⚠️ VERIFY).

DIAGRAM & VISUALS QUALITY GATING (STRICT):
- Do NOT generate trivial, superficial 1-line ASCII flowcharts like "[Trigger] --> [Mechanism] --> [Impact]". In UPSC Mains, such trivial boxes fetch 0 marks and clutter the answer.
- Only provide "diagramIdea" if a substantive, exam-practical multi-branch flowchart, 2x2 conceptual matrix, or drawn diagram genuinely adds value and earns +1 to +2 marks under exam-hall time constraints.
- If no diagram is genuinely useful or high-yield for this specific question, set "diagramIdea": null. Strictly refrain from placeholder schemas.

MODEL ANSWER (STRICT REQUIREMENT: COMPLETE EXAM ANSWER ONLY):
- Provide the complete, authentic model answer that a candidate should write on the UPSC Mains answer booklet.
- Do NOT include labels like "Pure Model Answer", "Impure", "Topper Model Answer", or introductory meta-headers like "### Model Answer...". Start directly with the answer.
- NEVER include artificial meta-boxes such as "> **Value-Addition Box**", "> **Box:**", or separate coaching-style value-addition callout boxes. Real UPSC exam copies do not have meta callout boxes. Any case laws, committee names, constitutional articles, or data points must be integrated directly and naturally into the sentences and arguments of the answer itself.
- Visual & Infographic Data:
  * If comparing multi-dimensional variables, data points, or differences, represent them appropriately using clean Markdown tables (e.g. | Parameter | Perspective A | Perspective B |).
  * If presenting institutional frameworks, chronological stages, or causal linkages, format them cleanly using structured bullet workflows or concise visual markdown representations (e.g., A → B → C).
- Structure: Start directly with the Introduction sentence -> Question Keyword Subheadings -> Numbered Points with Case/Article Citations -> Counterview / Balance -> Synthesis Conclusion.

BREAKDOWN OF APPROACH TO ANSWER (IN-DEPTH SCORING & STRATEGY GUIDE):
Provide a detailed pedagogical breakdown explaining what earns marks and why for this specific question:
- "whatEarnsMarks": 3 to 4 concrete examiner insights explaining why specific elements (citations, sub-heading clarity, counterview balance) fetch marks for this question.
- "structuralApproach":
  * "demandDeconstruction": Breakdown of question's directive & explicit/implicit demands.
  * "introductionStrategy": 20-word crisp hook/definition strategy with sample opening line.
  * "bodyDimensions": 3 to 4 multi-dimensional angles (Constitutional, Socio-Economic, Administrative, Global) with 2-3 sample points each.
  * "counterviewStrategy": Core counter-argument or tension to address.
  * "conclusionStrategy": Forward-looking synthesis line.
- "sampleValueAdditions": 2 to 3 specific Articles, Reports, Judgments, or Thinkers with brief explanation of why each boosts marks.

ACCURATE CANDIDATE WORD COUNT & TRANSCRIPTION (CRITICAL FOR UPLOADED HANDWRITTEN IMAGES/PDFS):
- "actualWordCount": (INTEGER, MANDATORY).
  * If typed text is provided: count its exact words.
  * If the candidate submitted a handwritten answer via uploaded image(s) or PDF pages: carefully read the handwriting across all attached pages, and count the total number of words written by the candidate (excluding the printed question prompt).
  * NEVER return 0 if the candidate has written an attempt on the sheet. Return the genuine word count (e.g., 145, 172, 220).
- "transcribedAnswer": If the candidate submitted a handwritten answer via uploaded sheet/images, provide the clean transcript of their written answer text here. If typed text was already provided, this can match the text.

STYLE REQUIREMENTS:
- Blunt, concise, strictly ≤6 words per weakness pointer.
- One witty or sharp examiner line allowed in verdict; never at accuracy's cost.
- If the attached sheet is completely blank, illegible, or contains no student attempt, do NOT simulate an answer. Set "marksAwarded": 0, "verdict": "Unsatisfactory / No Attempt", and set "directiveAnalysis": "The submitted sheet was blank, unreadable, or did not contain an answer to evaluate."
- If the answer is completely off-topic, superficial, or garbage, bluntly state why in the verdict and award strictly ≤1.5 marks.

CANDIDATE SUBMISSION TO EVALUATE:
[QUESTION]:
${trimmedQ || "(Question is written at the top of the attached answer sheet or document)"}

[STUDENT'S ANSWER]:
${answerText || "(Handwritten / Typed answer provided in attached image or document)"}

OUTPUT FORMAT:
Return ONLY a valid, parsable JSON object matching this schema exactly (replace 0.0 with actual evaluated scores based strictly on merit):
{
  "question": "${trimmedQ ? trimmedQ.replace(/"/g, '\\"') : "Exact UPSC question transcribed from submission"}",
  "marksAwarded": 0.0,
  "maxMarks": ${maxMarks},
  "actualWordCount": 150,
  "transcribedAnswer": "Clean verbatim or faithful transcription of the candidate's handwritten answer from the uploaded sheet(s)...",
  "verdict": "One-line blunt examiner verdict on this attempt.",
  "directive": "Directive found in question (e.g. Discuss, Give Reasons, Critically Analyse)",
  "directiveAnalysis": "1-2 sentences on how candidate addressed or missed the directive.",
  "dimensions": {
    "demand": { "score": 0.0, "max": 10, "comment": "Directive and question sub-parts addressed." },
    "content": { "score": 0.0, "max": 10, "comment": "Depth, accuracy, citations, and empirical evidence." },
    "structure": { "score": 0.0, "max": 10, "comment": "Intro, keyword headings, numbering, counterview." },
    "presentation": { "score": 0.0, "max": 10, "comment": "Word count compliance and ${timeLimit}-min time writability." }
  },
  "markedCopy": [
    {
      "quote": "Exact sentence or phrase from student's answer",
      "note": "Examiner margin note explaining accuracy, factual correction, or flaw",
      "type": "correct"
    },
    {
      "quote": "Sentence with factual error or wrong thinker",
      "note": "Exact factual mistake + correction (e.g. Durkheim coined social facts, not Comte)",
      "type": "incorrect"
    },
    {
      "quote": "Informal phrase or weak structure",
      "note": "Examiner note on vocabulary or structure improvement",
      "type": "flawed"
    },
    {
      "quote": "Dubious statistic or uncited claim",
      "note": "⚠️ VERIFY: Check veracity of this statistic or source",
      "type": "verify"
    }
  ],
  "strengths": [
    "What candidate did well that earned marks (e.g. Accurately cited Article 360(1) / Weber's Verstehen)",
    "Another solid argument, concept, or structural element to keep up"
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
    "Concrete exam-hall action to improve quality",
    "Second practical improvement step"
  ],
  "approachBreakdown": {
    "whatEarnsMarks": [
      "Specific factor 1 that earns marks and why",
      "Specific factor 2 that earns marks and why",
      "Specific factor 3 that earns marks and why"
    ],
    "structuralApproach": {
      "demandDeconstruction": "Breakdown of the directive and sub-parts",
      "introductionStrategy": "Sample 20-word intro hook and strategy",
      "bodyDimensions": [
        { "dimension": "Constitutional & Institutional", "samplePoints": ["Point A with Article", "Point B"] },
        { "dimension": "Socio-Economic Realities", "samplePoints": ["Empirical evidence A", "Data point B"] }
      ],
      "counterviewStrategy": "Key counter-argument and critical angle",
      "conclusionStrategy": "Way forward synthesis line"
    },
    "sampleValueAdditions": [
      { "type": "Committee / Case / Article", "content": "Specific report or judgment", "whyItEarnsMarks": "Provides authoritative backing" }
    ]
  },
  "diagramIdea": null,
  "modelAnswer": "Direct exam answer starting with introduction immediately without any meta headers..."
}
`;
}

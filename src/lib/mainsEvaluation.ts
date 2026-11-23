export interface MainsDimensionScore {
  score: number; // Evaluated percentage (0 - 100)
  max: number; // 100
  percentage?: number; // Evaluated percentage (0 - 100)
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
  // PO & Analytics attributes
  evaluatorVersion?: string;
  humanScore?: number;
  measuredWritingSpeedWpm?: number;
  // Backward compatibility
  rubric?: Record<string, any>;
  strengths?: string[];
}

export interface MainsAttemptItem {
  id: string;
  attemptNumber: number;
  studentAnswer: string;
  attachedImages?: Array<{ mimeType: string; data: string; name: string }>;
  evaluation?: MainsEvaluationResult;
  submittedAt: string;
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
  question?: string;
  maxMarks?: 10 | 15 | 20;
  attempts?: MainsAttemptItem[];
  // Legacy / backward-compatibility fields:
  questions?: MainsQuestionItem[];
  studentAnswer?: string;
  attachedImages?: any[];
  evaluation?: MainsEvaluationResult;
}

export const MAINS_STORAGE_KEY = "upsc_mains_evaluations_v1";
export const MAINS_DELETED_SESSIONS_KEY = "upsc_mains_deleted_session_ids_v1";

export function getDeletedMainsSessionIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(MAINS_DELETED_SESSIONS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function recordDeletedMainsSessionId(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const set = getDeletedMainsSessionIds();
    set.add(id);
    if (id.includes("_q")) set.add(id.split("_q")[0]);
    if (id.includes("_att")) set.add(id.split("_att")[0]);
    localStorage.setItem(
      MAINS_DELETED_SESSIONS_KEY,
      JSON.stringify(Array.from(set)),
    );
  } catch {}
}

/**
 * Formats a question starter into the default session title:
 * Shows first ~50 chars of the question prompt (no date), or "New Question Draft".
 */
export function formatMainsDefaultTitle(
  questionOrPrompt?: string | Date,
): string {
  if (typeof questionOrPrompt === "string" && questionOrPrompt.trim()) {
    const trimmed = questionOrPrompt.trim();
    // Discard legacy date patterns like "23 Nov 2026 | MONDAY"
    const isDatePattern = /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/i.test(trimmed);
    if (!isDatePattern) {
      const clean = trimmed.replace(/^["'\s]+|["'\s]+$/g, "");
      return clean.length > 55 ? clean.slice(0, 52) + "..." : clean;
    }
  }
  return "New Question Draft";
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
 * Normalizes a session to ensure it has a valid list of attempts for its question.
 */
export function normalizeSessionAttempts(
  sess: MainsEvaluationSession,
): MainsAttemptItem[] {
  if (Array.isArray(sess.attempts) && sess.attempts.length > 0) {
    return sess.attempts;
  }

  const legacyAttempt: MainsAttemptItem = {
    id: `${sess.id}_att1`,
    attemptNumber: 1,
    studentAnswer:
      sess.studentAnswer ||
      (Array.isArray(sess.questions) ? sess.questions[0]?.studentAnswer : "") ||
      "",
    attachedImages: Array.isArray(sess.attachedImages)
      ? sess.attachedImages.map((img: any, i: number) =>
          typeof img === "string"
            ? { mimeType: "image/jpeg", data: img, name: `Page ${i + 1}` }
            : img,
        )
      : Array.isArray(sess.questions) && sess.questions[0]?.attachedImages
        ? sess.questions[0].attachedImages
        : [],
    evaluation:
      sess.evaluation ||
      (Array.isArray(sess.questions)
        ? sess.questions[0]?.evaluation
        : undefined),
    submittedAt:
      sess.evaluation?.evaluatedAt ||
      sess.updatedAt ||
      new Date().toISOString(),
  };

  return [legacyAttempt];
}

/**
 * Migrates legacy multi-question sessions into a clean, single-question practice booklet:
 * 1 question = 1 chat session with multiple attempts & evaluations.
 * No student data is lost: multi-question sessions are expanded into separate question sessions.
 */
export function migrateMainsSessionsToSingleQuestionBooklet(
  rawSessions: any[],
): MainsEvaluationSession[] {
  if (!Array.isArray(rawSessions)) return [];
  const result: MainsEvaluationSession[] = [];

  for (const s of rawSessions) {
    if (!s) continue;

    // Multi-question legacy session: split each question into its own session
    if (Array.isArray(s.questions) && s.questions.length > 1) {
      s.questions.forEach((q: MainsQuestionItem, qIdx: number) => {
        const questionText = (q.question || "").trim();
        const displayTitle = formatMainsDefaultTitle(
          questionText || `Question ${qIdx + 1}`,
        );

        const singleSession: MainsEvaluationSession = {
          id:
            q.id && q.id !== s.id ? q.id : `${s.id}_q${qIdx + 1}_${Date.now()}`,
          title: displayTitle,
          isCustomTitle: Boolean(questionText),
          updatedAt: s.updatedAt || new Date().toISOString(),
          paperType: q.paperType || s.paperType || "GS-2",
          optionalSubject: q.optionalSubject || s.optionalSubject,
          question: questionText,
          maxMarks: q.maxMarks || s.maxMarks || 10,
          attempts: [
            {
              id: `${q.id || s.id}_att1`,
              attemptNumber: 1,
              studentAnswer: q.studentAnswer || "",
              attachedImages: q.attachedImages || [],
              evaluation: q.evaluation,
              submittedAt:
                q.evaluation?.evaluatedAt ||
                s.updatedAt ||
                new Date().toISOString(),
            },
          ],
          studentAnswer: q.studentAnswer || "",
          attachedImages: q.attachedImages || [],
          evaluation: q.evaluation,
        };
        result.push(singleSession);
      });
      continue;
    }

    // Single question session
    const singleQ =
      Array.isArray(s.questions) && s.questions.length === 1
        ? s.questions[0]
        : null;

    const questionText = (
      singleQ?.question ||
      s.question ||
      s.evaluation?.question ||
      ""
    ).trim();

    const isDatePattern = /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/i.test(
      (s.title || "").trim(),
    );
    const displayTitle =
      s.isCustomTitle && s.title && !isDatePattern
        ? s.title
        : formatMainsDefaultTitle(questionText);

    let attempts: MainsAttemptItem[] = [];
    if (Array.isArray(s.attempts) && s.attempts.length > 0) {
      attempts = s.attempts.map((att: any, idx: number) => ({
        id: att.id || `${s.id}_att${idx + 1}`,
        attemptNumber: att.attemptNumber || idx + 1,
        studentAnswer: att.studentAnswer || "",
        attachedImages: Array.isArray(att.attachedImages)
          ? att.attachedImages
          : [],
        evaluation: att.evaluation,
        submittedAt: att.submittedAt || s.updatedAt || new Date().toISOString(),
      }));
    } else {
      const studentAnswer =
        singleQ?.studentAnswer ||
        s.studentAnswer ||
        s.evaluation?.studentAnswer ||
        "";
      const attachedImages = singleQ?.attachedImages || s.attachedImages || [];
      const evaluation = singleQ?.evaluation || s.evaluation;

      attempts = [
        {
          id: `${s.id}_att1`,
          attemptNumber: 1,
          studentAnswer,
          attachedImages,
          evaluation,
          submittedAt:
            evaluation?.evaluatedAt || s.updatedAt || new Date().toISOString(),
        },
      ];
    }

    const singleSession: MainsEvaluationSession = {
      id: s.id || `mains_${Date.now()}`,
      title: displayTitle,
      isCustomTitle: Boolean(s.isCustomTitle || questionText),
      updatedAt: s.updatedAt || new Date().toISOString(),
      paperType: singleQ?.paperType || s.paperType || "GS-2",
      optionalSubject: singleQ?.optionalSubject || s.optionalSubject,
      question: questionText,
      maxMarks: singleQ?.maxMarks || s.maxMarks || 10,
      attempts,
      studentAnswer: attempts[0]?.studentAnswer || "",
      attachedImages: attempts[0]?.attachedImages || [],
      evaluation:
        attempts[attempts.length - 1]?.evaluation || attempts[0]?.evaluation,
    };

    result.push(singleSession);
  }

  return result.sort(
    (a, b) =>
      new Date(b.updatedAt || 0).getTime() -
      new Date(a.updatedAt || 0).getTime(),
  );
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
    if (!Array.isArray(parsed)) return [];
    const migrated = migrateMainsSessionsToSingleQuestionBooklet(parsed);
    if (
      migrated.length !== parsed.length ||
      (parsed[0] && !parsed[0].attempts)
    ) {
      saveMainsSessions(migrated);
    }
    return migrated;
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
Evaluate the candidate's actual answer strictly on its merits as an authentic UPSC CSE examiner.
PO MANDATORY INSTRUCTIONS:
1. BADGE MUST MATCH THE NOTE'S VERDICT: The "type" ('correct' | 'incorrect' | 'flawed' | 'verify') MUST strictly match the margin note. If a note mentions an error, mistake or inaccuracy, type must be "incorrect"; if it commends an accurate point, type must be "correct"; if stylistic/structure, "flawed"; if dubious fact, "verify".
2. TAG THE PAPER FROM THE QUESTION SOURCE: Read the question prompt and source to accurately confirm paperType (GS-1, GS-2, GS-3, GS-4, or Optional).
3. GRADE SUB-SCORES AS PERCENTAGES, NEVER OUT OF 10: All dimension sub-scores (demand, content, structure, presentation) must be graded as percentages from 0 to 100 with max: 100.
4. READ PRONOUN REFERENCES BEFORE FLAGGING ERRORS: Read pronoun references ('it', 'this', 'they', 'he', 'she') in the context of preceding sentences before flagging an error so valid antecedents are not erroneously flagged.
5. FLAG EVERY FACTUAL ERROR, NOT SAMPLES: Flag every single factual inaccuracy, misattributed thinker/article, or incorrect claim across the entire script.
6. CHECK EACH PART OF THE DIRECTIVE IS COVERED: Verify whether every sub-part of the directive is explicitly answered.
7. CALIBRATE TO UPSC CSE REALITY: 3.0 to 4.9 / 10 (or 30% to 49%) is typical/average candidate level; 5.0+ / 10 (50%+) is Topper Level. Score with strict realism.
8. EVALUATOR VERSION: Set evaluatorVersion: "v2.5-po-calibrated".

EVALUATE AND SCORE FOUR CORE DIMENSIONS (Grade each strictly as a PERCENTAGE from 0 to 100, max: 100):
1. Demand (%): Operational directive compliance (e.g. Critically Examine, Discuss, Give Reasons), every sub-part answered, limits observed.
2. Content (%): Accuracy, depth, authentic citations (Articles, Judgments, Committees, Reports, Data, Examples).
${
  isSociology
    ? "   * Sociology Specifics: Exact sociological terms, thinkers (e.g. Weber, Durkheim, Marx, Parsons, Srinivas, Ghurye), Indian empirical examples, and analytical verdict (no years unless idea-bearing)."
    : isEthics
      ? "   * GS-4 Ethics Specifics: Stakeholders, ethical dilemmas, options evaluated, chosen action justified, moral & constitutional values explicitly named."
      : "   * General Studies Specifics: Multi-dimensional sub-headings (Constitutional, Socio-Economic, Administrative, Global) grounded in empirical policy data."
}
3. Structure (%): Introduction (15-20 words), question keywords used as subheadings, numbered arguments, counterview sentence, and a synthesis verdict line.
4. Presentation (%): Within word limit, exam-writable in ${timeLimit} minutes under exam-hall time pressure, table/flowchart where it earns marks.

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
Return ONLY a valid, parsable JSON object matching this schema exactly (grade dimensions as percentages 0-100):
{
  "question": "${trimmedQ ? trimmedQ.replace(/"/g, '\\"') : "Exact UPSC question transcribed from submission"}",
  "marksAwarded": 0.0,
  "maxMarks": ${maxMarks},
  "evaluatorVersion": "v2.5-po-calibrated",
  "actualWordCount": 150,
  "transcribedAnswer": "Clean verbatim or faithful transcription of the candidate's handwritten answer from the uploaded sheet(s)...",
  "verdict": "One-line blunt examiner verdict on this attempt.",
  "directive": "Directive found in question (e.g. Discuss, Give Reasons, Critically Analyse)",
  "directiveAnalysis": "1-2 sentences on how candidate addressed or missed the directive.",
  "dimensions": {
    "demand": { "score": 65, "max": 100, "comment": "Directive and question sub-parts addressed." },
    "content": { "score": 40, "max": 100, "comment": "Depth, accuracy, citations, and empirical evidence." },
    "structure": { "score": 55, "max": 100, "comment": "Intro, keyword headings, numbering, counterview." },
    "presentation": { "score": 70, "max": 100, "comment": "Word count compliance and ${timeLimit}-min time writability." }
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

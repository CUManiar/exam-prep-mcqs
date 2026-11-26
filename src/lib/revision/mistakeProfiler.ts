import { Attempt, ParsedQuestion, QuestionPaper } from "../types";

export type MistakeRootCause =
  "conceptual_gap" | "elimination_trap" | "misread_negative";

export interface MistakeItem {
  id: string;
  attemptId: string;
  paperId: string;
  paperTitle: string;
  questionNo: number;
  questionText: string;
  studentSelected?: string;
  correctAnswer?: string;
  topic: string;
  subject?: string;
  rootCause: MistakeRootCause;
  timeSpentSeconds?: number;
  negativeMarksLost: number;
  explanation?: string;
}

export interface ConceptMistakeCluster {
  conceptKey: string;
  conceptTitle: string;
  subject?: string;
  mistakeCount: number;
  totalNegativeMarks: number;
  sampleQuestions: MistakeItem[];
}

export interface StudentMistakeDiagnostics {
  totalWrongQuestions: number;
  totalNegativeMarksLost: number;
  clusters: ConceptMistakeCluster[];
  recentMistakes: MistakeItem[];
}

/**
 * Parses user test history across attempts and maps wronged questions to their core concepts.
 */
export function extractMistakeDiagnostics(
  attempts: Attempt[],
  papers: QuestionPaper[],
): StudentMistakeDiagnostics {
  const paperMap = new Map<string, QuestionPaper>();
  for (const p of papers) {
    paperMap.set(p.id, p);
  }

  const allMistakes: MistakeItem[] = [];
  const clusterMap = new Map<string, ConceptMistakeCluster>();

  // Sort attempts newest to oldest
  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  for (const att of sortedAttempts) {
    const paper = paperMap.get(att.paperId);
    if (!paper || !att.answers) continue;

    const parsedMap = new Map<number, ParsedQuestion>();
    if (paper.parsedQuestions) {
      for (const q of paper.parsedQuestions) {
        parsedMap.set(q.questionNo, q);
      }
    }

    const isCsat =
      att.paperLabel.toLowerCase().includes("csat") ||
      att.paperLabel.toLowerCase().includes("paper 2") ||
      att.paperLabel.toLowerCase().includes("paper-2");
    const negPenalty = isCsat ? 0.83 : 0.66;

    for (const [qNoStr, ans] of Object.entries(att.answers)) {
      const qNo = Number(qNoStr);
      if (!ans || ans.isCorrect || !ans.selected) {
        continue; // Only process actual incorrect attempts (not unanswered or correct)
      }

      const q = parsedMap.get(qNo);
      const subject =
        q?.subject?.trim() ||
        ans.subject?.trim() ||
        paper.subject?.trim() ||
        paper.category ||
        "GS";
      const topic =
        q?.topic?.trim() ||
        ans.topic?.trim() ||
        q?.chapter?.trim() ||
        ans.chapter?.trim() ||
        (subject && subject !== "GS I" && subject !== "CSAT"
          ? subject
          : paper.title ||
            paper.label ||
            att.paperLabel ||
            "General Studies Core");

      // Infer root cause
      let rootCause: MistakeRootCause = "elimination_trap";
      if ((ans.timeSpentSeconds || 0) > 90) {
        rootCause = "conceptual_gap";
      } else if (
        ans.confidence === "sure" ||
        ans.confidence === "elimination"
      ) {
        rootCause = "elimination_trap";
      } else if ((ans.timeSpentSeconds || 0) < 25) {
        rootCause = "misread_negative";
      }

      const mistake: MistakeItem = {
        id: `mstk_${att.id}_${qNo}`,
        attemptId: att.id,
        paperId: att.paperId,
        paperTitle: paper.title || paper.label || att.paperLabel,
        questionNo: qNo,
        questionText: q?.text || `Question #${qNo}`,
        studentSelected: ans.selected,
        correctAnswer:
          q?.answer || ans.correctAnswer || paper.answerKey?.[qNo] || undefined,
        topic,
        subject,
        rootCause,
        timeSpentSeconds: ans.timeSpentSeconds,
        negativeMarksLost: Number(negPenalty.toFixed(2)),
        explanation: q?.explanation,
      };

      allMistakes.push(mistake);

      // Group into clusters
      const clusterKey = topic.toLowerCase();
      if (!clusterMap.has(clusterKey)) {
        clusterMap.set(clusterKey, {
          conceptKey: clusterKey,
          conceptTitle: topic,
          subject,
          mistakeCount: 0,
          totalNegativeMarks: 0,
          sampleQuestions: [],
        });
      }

      const cluster = clusterMap.get(clusterKey)!;
      cluster.mistakeCount += 1;
      cluster.totalNegativeMarks += negPenalty;
      if (cluster.sampleQuestions.length < 3) {
        cluster.sampleQuestions.push(mistake);
      }
    }
  }

  const clusters = Array.from(clusterMap.values()).sort(
    (a, b) => b.mistakeCount - a.mistakeCount,
  );

  const totalNegativeMarksLost = Number(
    allMistakes.reduce((acc, m) => acc + m.negativeMarksLost, 0).toFixed(1),
  );

  return {
    totalWrongQuestions: allMistakes.length,
    totalNegativeMarksLost,
    clusters,
    recentMistakes: allMistakes.slice(0, 15),
  };
}

/**
 * Builds an AI tutor prompt targeted directly at remediating a wronged question's concept.
 */
export function buildRemediationPrompt(mistake: MistakeItem): string {
  return `I got Question #${mistake.questionNo} wrong in "${mistake.paperTitle}" on the concept of "${mistake.topic}".
I selected Option (${mistake.studentSelected || "Marked"}), but the correct key was Option (${mistake.correctAnswer || "Key"}).
The question was: "${mistake.questionText}"

Please dissect:
1. The exact elimination trap that misled me.
2. The foundational constitutional/conceptual rule governing "${mistake.topic}" from first principles.
3. Two fresh UPSC-standard elimination drill MCQs on this exact trap so I never repeat this error.`;
}

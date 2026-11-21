import { useMemo } from "react";
import {
  Attempt,
  QuestionAnswer,
  QuestionPaper,
  ParsedQuestion,
  SubjectiveAssessment,
} from "../../lib/types";
import {
  formatTimeSeconds,
  getPaperDisplayTitle,
  formatCustomIdentifier,
} from "../../lib/defaults";
import {
  parseQuestionnaireMarkdown,
  parseMarkdownHeader,
  ParsedMarkdownHeader,
} from "../../lib/markdownPaperParser";
import { getCustomPapers } from "../../lib/storage";
import {
  CutoffVerdict,
  TakeawayItem,
  FilterTabType,
  SortOptionType,
  ReviewFilterState,
} from "./reviewTypes";

// ─── Paper matching ────────────────────────────────────────────────────────────

function matchPaper(
  attempt: Attempt,
  papers: QuestionPaper[],
): QuestionPaper | undefined {
  const byId = papers.find(
    (p) =>
      p.id === attempt.paperId ||
      p.id.toLowerCase() === (attempt.paperId || "").toLowerCase(),
  );
  if (byId) return byId;

  if (attempt.paperId?.startsWith("custom_")) {
    const customPapers = getCustomPapers();
    const customMatch = customPapers.find(
      (p) =>
        p.id === attempt.paperId ||
        p.id.toLowerCase() === (attempt.paperId || "").toLowerCase(),
    );
    if (customMatch) return customMatch;
  }

  if (!attempt.paperId?.startsWith("custom_")) {
    const canonicalMatch = papers.find(
      (p) =>
        p.id
          .toLowerCase()
          .replace(/general_studies_paper_i(i?)/, (_, g) =>
            g ? "gsii_csat" : "gs_i",
          ) === (attempt.paperId || "").toLowerCase(),
    );
    if (canonicalMatch) return canonicalMatch;

    if (attempt.paperLabel) {
      const byLabel = papers.find(
        (p) => p.label.toLowerCase() === attempt.paperLabel.toLowerCase(),
      );
      if (byLabel) return byLabel;
    }
  }
  return undefined;
}

function resolveDisplayTitle(
  attempt: Attempt,
  matchedPaper?: QuestionPaper,
): string {
  if (matchedPaper) return getPaperDisplayTitle(matchedPaper);
  if (attempt.paperId?.startsWith("custom_")) {
    const fromId = formatCustomIdentifier(attempt.paperId);
    if (fromId) return fromId;
  }
  if (
    attempt.paperLabel &&
    !attempt.paperLabel.match(
      /^\d{4}\s*[-–—]\s*(GS\s*I|GS\s*II\s*CSAT|Mains.*)$/i,
    )
  ) {
    return attempt.paperLabel;
  }
  const fromId = formatCustomIdentifier(attempt.paperId);
  if (fromId) return fromId;
  return attempt.paperLabel || "Assessment Report";
}

function resolveMaxScore(
  attempt: Attempt,
  matchedPaper?: QuestionPaper,
): number {
  const calculatedMax =
    attempt.totalQuestions > 0 &&
    attempt.correctMarks &&
    attempt.correctMarks > 0
      ? Math.round(attempt.totalQuestions * attempt.correctMarks * 100) / 100
      : null;

  if (matchedPaper?.totalMarks && matchedPaper.totalMarks > 0) {
    if (
      calculatedMax &&
      matchedPaper.totalMarks === 200 &&
      calculatedMax !== 200
    )
      return calculatedMax;
    return matchedPaper.totalMarks;
  }
  if (calculatedMax && (attempt.maxScore === 200 || !attempt.maxScore))
    return calculatedMax;
  if (attempt.totalMarks && attempt.totalMarks > 0) {
    if (calculatedMax && attempt.totalMarks === 200 && calculatedMax !== 200)
      return calculatedMax;
    return attempt.totalMarks;
  }
  if (calculatedMax) return calculatedMax;
  return attempt.maxScore || 200;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useReviewData(attempt: Attempt, papers: QuestionPaper[]) {
  // Paper matching
  const matchedPaper = useMemo(
    () => matchPaper(attempt, papers),
    [papers, attempt.paperId, attempt.paperLabel],
  );

  const isMarkdownPaper = useMemo(
    () =>
      (matchedPaper?.parsedQuestions &&
        matchedPaper.parsedQuestions.length > 0) ||
      Boolean(matchedPaper?.markdownContent) ||
      matchedPaper?.qpUrl?.startsWith("local://") ||
      attempt.paperId?.startsWith("custom_md_") ||
      false,
    [matchedPaper, attempt.paperId],
  );

  const canPreviewPaper = Boolean(
    matchedPaper && (matchedPaper.qpUrl || isMarkdownPaper),
  );
  const displayPaperTitle = useMemo(
    () => resolveDisplayTitle(attempt, matchedPaper),
    [matchedPaper, attempt.paperLabel, attempt.paperId],
  );
  const effectiveMaxScore = useMemo(
    () => resolveMaxScore(attempt, matchedPaper),
    [
      matchedPaper?.totalMarks,
      attempt.totalMarks,
      attempt.totalQuestions,
      attempt.correctMarks,
      attempt.maxScore,
    ],
  );

  // Markdown parsing
  const markdownQuestions: ParsedQuestion[] = useMemo(() => {
    if (!isMarkdownPaper) return [];
    if (matchedPaper?.parsedQuestions?.length)
      return matchedPaper.parsedQuestions;
    if (matchedPaper?.markdownContent)
      return parseQuestionnaireMarkdown(matchedPaper.markdownContent);
    const found = getCustomPapers().find((p) => p.id === attempt.paperId);
    if (found?.parsedQuestions?.length) return found.parsedQuestions;
    if (found?.markdownContent)
      return parseQuestionnaireMarkdown(found.markdownContent);
    return [];
  }, [isMarkdownPaper, matchedPaper, attempt.paperId]);

  const markdownHeader: ParsedMarkdownHeader | string[] | undefined =
    useMemo(() => {
      if (!isMarkdownPaper) return undefined;
      if (matchedPaper?.instructions) return matchedPaper.instructions;
      const raw =
        matchedPaper?.markdownContent ||
        getCustomPapers().find((p) => p.id === attempt.paperId)
          ?.markdownContent;
      return raw ? parseMarkdownHeader(raw) : undefined;
    }, [isMarkdownPaper, matchedPaper, attempt.paperId]);

  // Classification flags
  const isSubjectiveAttempt = attempt.examType === "subjective";
  const correctMarksPerQ =
    matchedPaper?.correctMarks !== undefined &&
    Number(matchedPaper.correctMarks) > 0
      ? Number(matchedPaper.correctMarks)
      : (attempt.correctMarks ?? 2.0);
  const incorrectMarksPerQ =
    matchedPaper?.incorrectMarks !== undefined &&
    Number(matchedPaper.incorrectMarks) >= 0
      ? Number(matchedPaper.incorrectMarks)
      : attempt.incorrectMarks !== undefined &&
          Number(attempt.incorrectMarks) >= 0
        ? Number(attempt.incorrectMarks)
        : 0.667;
  const subjectiveMarksPerQ =
    attempt.totalQuestions > 0
      ? (matchedPaper?.totalMarks ??
          attempt.totalMarks ??
          attempt.maxScore ??
          0) / attempt.totalQuestions
      : 0;

  // Helper functions (stable per render, depend on markdownQuestions / attempt)
  const isClozeQuestion = (qNo: number): boolean => {
    const question = markdownQuestions.find((pq) => pq.questionNo === qNo);
    if (question && Object.keys(question.options || {}).length === 0)
      return true;
    const ans = attempt.answers?.[qNo];
    if (
      ans?.selected &&
      ans.selected.length > 1 &&
      !["A", "B", "C", "D"].includes(ans.selected.trim().toUpperCase()) &&
      ans.selected !== "attempted"
    )
      return true;
    return false;
  };

  const isAssessmentQuestion = (qNo: number) =>
    isSubjectiveAttempt || isClozeQuestion(qNo);

  const isQuestionAnswered = (answer?: QuestionAnswer): boolean => {
    if (!answer) return false;
    if (isClozeQuestion(answer.questionNo))
      return Boolean(
        answer.selected?.trim() && answer.selected !== "attempted",
      );
    return isSubjectiveAttempt
      ? answer.selected === "attempted"
      : answer.selected !== null && answer.selected !== undefined;
  };

  const getFullMarks = (qNo: number) =>
    isClozeQuestion(qNo) ? correctMarksPerQ : subjectiveMarksPerQ;

  const getAssessmentMarks = (
    qNo: number,
    assessment?: SubjectiveAssessment,
    subjectiveMarks?: number,
  ): number => {
    if (!assessment) return 0;
    const full = getFullMarks(qNo);
    const penalty = isClozeQuestion(qNo) ? incorrectMarksPerQ : 0;
    if (assessment === "strong") return full;
    if (assessment === "partial")
      return Math.min(full, Math.max(0, subjectiveMarks ?? full * 0.5));
    if (assessment === "needs-work") return -penalty;
    return 0;
  };

  const formatReviewNumber = (value: number) => {
    if (!Number.isFinite(value)) return "0";
    return Number(value.toFixed(4)).toString();
  };

  // Question list
  // Dynamically binds latest answer keys and explanations from matchedPaper so updates reflect immediately.
  const questionList: QuestionAnswer[] = useMemo(
    () =>
      Array.from({ length: attempt.totalQuestions }, (_, i) => i + 1).map(
        (qNo) => {
          const ans = attempt.answers[qNo];
          const pq = markdownQuestions.find((m) => m.questionNo === qNo);
          const paperCorrect = matchedPaper?.answerKey?.[qNo] || pq?.answer;
          const paperExp = matchedPaper?.explanations?.[qNo] || pq?.explanation;
          const effectiveCorrect = paperCorrect || ans?.correctAnswer;
          const effectiveExp = paperExp || ans?.explanation;
          const isCloze = isClozeQuestion(qNo);
          const isCorrect =
            ans?.selected !== null && ans?.selected !== undefined
              ? isCloze
                ? ans.subjectiveAssessment
                  ? ans.subjectiveAssessment === "strong"
                    ? true
                    : ans.subjectiveAssessment === "needs-work"
                      ? false
                      : null
                  : null
                : effectiveCorrect
                  ? ans.selected.trim().toUpperCase() ===
                    effectiveCorrect.trim().toUpperCase()
                  : ans.isCorrect
              : null;

          const effectivePreviousYears =
            pq?.previousYears || ans?.previousYears || undefined;

          if (ans) {
            return {
              ...ans,
              correctAnswer: effectiveCorrect,
              explanation: effectiveExp,
              isCorrect,
              previousYears: effectivePreviousYears,
            };
          }
          return {
            questionNo: qNo,
            selected: null,
            correctAnswer: effectiveCorrect,
            explanation: effectiveExp,
            isCorrect: null,
            flagged: false,
            note: "",
            evaluationComment: undefined,
            timeSpentSeconds: 0,
            changesCount: 0,
            answerHistory: [],
            previousYears: effectivePreviousYears,
          };
        },
      ),
    [
      attempt,
      matchedPaper?.answerKey,
      matchedPaper?.explanations,
      markdownQuestions,
    ],
  );

  // Derived metrics
  const grossCorrectMarks =
    Math.round(attempt.correct * correctMarksPerQ * 100) / 100;
  const negativePenaltyMarks =
    Math.round(attempt.incorrect * incorrectMarksPerQ * 100) / 100;
  const subjectivePartialCount =
    attempt.partial ??
    Object.values(attempt.answers || {}).filter(
      (a) => a.subjectiveAssessment === "partial",
    ).length;

  const activeSolvingSeconds = Math.max(
    0,
    attempt.durationSeconds - (attempt.idleTimeSeconds || 0),
  );
  const avgTimePerQ =
    attempt.avgTimePerQuestion ||
    (attempt.answered > 0
      ? Math.round(activeSolvingSeconds / attempt.answered)
      : 0);

  const scorePct = useMemo(() => {
    if (!effectiveMaxScore || effectiveMaxScore <= 0) return "0.0";
    return formatReviewNumber((attempt.score / effectiveMaxScore) * 100);
  }, [attempt.score, effectiveMaxScore]);

  // Confidence / status filtered lists
  const alteredQuestions = useMemo(
    () =>
      questionList.filter(
        (q) =>
          !isClozeQuestion(q.questionNo) &&
          q.changesCount &&
          q.changesCount > 0,
      ),
    [questionList],
  );
  const slowQuestions = useMemo(
    () => questionList.filter((q) => (q.timeSpentSeconds || 0) >= 90),
    [questionList],
  );
  const flaggedQuestions = useMemo(
    () => questionList.filter((q) => q.flagged),
    [questionList],
  );
  const incorrectQuestionsList = useMemo(
    () =>
      questionList.filter((q) =>
        isAssessmentQuestion(q.questionNo)
          ? q.subjectiveAssessment === "needs-work"
          : q.selected && q.isCorrect === false,
      ),
    [questionList],
  );
  const skippedQuestionsList = useMemo(
    () =>
      questionList.filter(
        (q) => !isQuestionAnswered(q) && !q.subjectiveAssessment,
      ),
    [questionList],
  );

  const sureQuestions = useMemo(
    () => questionList.filter((q) => q.confidence === "sure"),
    [questionList],
  );
  const sureCorrect = useMemo(
    () =>
      sureQuestions.filter((q) => q.selected && q.isCorrect === true).length,
    [sureQuestions],
  );
  const sureAccuracy =
    sureQuestions.length > 0
      ? Math.round((sureCorrect / sureQuestions.length) * 100)
      : 0;

  const fiftyFiftyQuestions = useMemo(
    () => questionList.filter((q) => q.confidence === "50-50"),
    [questionList],
  );
  const fiftyFiftyCorrect = useMemo(
    () =>
      fiftyFiftyQuestions.filter((q) => q.selected && q.isCorrect === true)
        .length,
    [fiftyFiftyQuestions],
  );
  const fiftyFiftyAccuracy =
    fiftyFiftyQuestions.length > 0
      ? Math.round((fiftyFiftyCorrect / fiftyFiftyQuestions.length) * 100)
      : 0;

  const eliminationQuestions = useMemo(
    () => questionList.filter((q) => q.confidence === "elimination"),
    [questionList],
  );
  const eliminationCorrect = useMemo(
    () =>
      eliminationQuestions.filter((q) => q.selected && q.isCorrect === true)
        .length,
    [eliminationQuestions],
  );
  const eliminationAccuracy =
    eliminationQuestions.length > 0
      ? Math.round((eliminationCorrect / eliminationQuestions.length) * 100)
      : 0;

  const guessQuestions = useMemo(
    () => questionList.filter((q) => q.confidence === "guess"),
    [questionList],
  );
  const guessCorrect = useMemo(
    () =>
      guessQuestions.filter((q) => q.selected && q.isCorrect === true).length,
    [guessQuestions],
  );
  const guessAccuracy =
    guessQuestions.length > 0
      ? Math.round((guessCorrect / guessQuestions.length) * 100)
      : 0;

  // Alteration impact
  const benefitGain =
    (attempt.alteredBenefitCount || 0) *
    (correctMarksPerQ + incorrectMarksPerQ);
  const harmLoss =
    (attempt.alteredHarmCount || 0) * (correctMarksPerQ + incorrectMarksPerQ);
  const netAlterationMarks = Math.round((benefitGain - harmLoss) * 100) / 100;

  // isCsat
  const isCsat = useMemo(() => {
    const label = (attempt.paperLabel || "").toLowerCase();
    const cat = (
      ((attempt as unknown as Record<string, unknown>).category as string) || ""
    ).toLowerCase();
    const subj = (matchedPaper?.subject || "").toLowerCase();
    return (
      cat === "csat" ||
      label.includes("csat") ||
      label.includes("paper 2") ||
      label.includes("paper ii") ||
      subj.includes("csat")
    );
  }, [attempt.paperLabel, matchedPaper?.subject]);

  // Cutoff verdict
  const cutoffVerdict: CutoffVerdict = useMemo(() => {
    // 1. Explicit cutoff configured on paper or attempt (highest priority)
    const configuredCutoffValue =
      matchedPaper?.cutoffValue ?? attempt.cutoffValue;
    const configuredCutoffType =
      matchedPaper?.cutoffType || attempt.cutoffType || "percentage";
    const cutoffExplicitlyConfigured =
      Boolean(matchedPaper?.cutoffEnabled || attempt.cutoffEnabled) &&
      configuredCutoffValue !== undefined &&
      Number.isFinite(configuredCutoffValue);
    const hasConfiguredValue =
      configuredCutoffValue !== undefined &&
      Number.isFinite(configuredCutoffValue) &&
      configuredCutoffValue > 0;

    if (cutoffExplicitlyConfigured || hasConfiguredValue) {
      const val = configuredCutoffValue!;
      const isPercentage = configuredCutoffType === "percentage";
      const target = isPercentage
        ? Number(((effectiveMaxScore || 200) * (val / 100)).toFixed(1))
        : Number(val.toFixed(1));
      const diff = Number((attempt.score - target).toFixed(1));
      const isQualified = attempt.score >= target;
      const targetLabel = isPercentage
        ? `${val}% (Qualifying)`
        : `${val} pts (Qualifying)`;

      return {
        hasCutoff: true,
        isCsat,
        targetScore: target,
        targetLabel,
        diff,
        status: isQualified ? "Qualified" : "Not Qualified",
        statusColor: isQualified
          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
          : "bg-rose-50 text-rose-800 border-rose-200",
        barColor: isQualified ? "bg-emerald-500" : "bg-rose-500",
        message: isQualified
          ? `Cleared qualifying mark by +${diff} pts. Your score safely exceeds the ${val}${isPercentage ? "%" : " pts"} threshold.`
          : `Fell short of qualifying mark by ${Math.abs(diff)} pts (requires min ${val}${isPercentage ? "%" : " pts"} threshold).`,
      };
    }

    // 2. Default UPSC CSAT qualifying threshold (33.3%) when no explicit cutoff is set
    if (isCsat) {
      const target = Number(((effectiveMaxScore || 200) * (1 / 3)).toFixed(1));
      const diff = Number((attempt.score - target).toFixed(1));
      const isQualified = attempt.score >= target;
      return {
        hasCutoff: true,
        isCsat: true,
        targetScore: target,
        targetLabel: "33.3% (Qualifying)",
        diff,
        status: isQualified ? "Qualified" : "Not Qualified",
        statusColor: isQualified
          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
          : "bg-rose-50 text-rose-800 border-rose-200",
        barColor: isQualified ? "bg-emerald-500" : "bg-rose-500",
        message: isQualified
          ? `Cleared qualifying mark by +${diff} pts. Your score safely exceeds the 33.3% threshold.`
          : `Fell short of qualifying mark by ${Math.abs(diff)} pts (requires min 33.3% threshold).`,
      };
    }

    // 3. When no cutoff is specified and paper is not CSAT: do not fabricate qualification verdict
    return {
      hasCutoff: false,
      isCsat: false,
      targetScore: 0,
      targetLabel: "",
      diff: 0,
      status: "",
      statusColor: "",
      barColor: "",
      message: "",
    };
  }, [
    isCsat,
    effectiveMaxScore,
    attempt.score,
    attempt.cutoffValue,
    attempt.cutoffType,
    attempt.cutoffEnabled,
    matchedPaper?.cutoffValue,
    matchedPaper?.cutoffType,
    matchedPaper?.cutoffEnabled,
  ]);

  // Top 3 takeaways
  const topTakeaways: TakeawayItem[] = useMemo(() => {
    const items: TakeawayItem[] = [];

    // 1. Negative / alteration analysis
    if ((attempt.alteredHarmCount || 0) > (attempt.alteredBenefitCount || 0)) {
      items.push({
        id: "alteration_penalty",
        title: "Second-Guessing Cost",
        metric: `-${Math.abs(netAlterationMarks)} pts net`,
        desc: `You altered ${alteredQuestions.length} responses, but ${attempt.alteredHarmCount} flipped Right→Wrong. Stick with your first instinct.`,
        badge: "Harmful revisions",
        badgeStyle: "bg-rose-100 text-rose-800 border-rose-200",
        iconType: "negative",
        actionTab: "altered",
        actionFilter: { altered: true },
        actionText: `Review ${alteredQuestions.length} altered questions →`,
      });
    } else {
      items.push({
        id: "negative_erosion",
        title: "Negative Marks Erosion",
        metric: `-${negativePenaltyMarks} pts lost`,
        desc: `${attempt.incorrect} incorrect choices eroded ${grossCorrectMarks > 0 ? Math.round((negativePenaltyMarks / grossCorrectMarks) * 100) : 0}% of your gross marks (+${grossCorrectMarks} pts).`,
        badge: `${attempt.incorrect} wrong`,
        badgeStyle: "bg-rose-100 text-rose-800 border-rose-200",
        iconType: "negative",
        actionTab: "incorrect",
        actionFilter: { outcome: "incorrect" },
        actionText: `Review ${attempt.incorrect} incorrect →`,
      });
    }

    // 2. Confidence calibration: Highlights interaction of Mistakes + Sure!
    if (sureQuestions.length > 0 && sureAccuracy < 80) {
      items.push({
        id: "sure_blindspot",
        title: "Confidence Blindspots",
        metric: `${sureQuestions.length - sureCorrect} 'Sure' errors`,
        desc: `Accuracy on 'Sure' questions was ${sureAccuracy}%. Usually caused by misreading or overestimating recall.`,
        badge: `${sureAccuracy}% accuracy`,
        badgeStyle: "bg-amber-100 text-amber-800 border-amber-200",
        iconType: "confidence",
        actionTab: "sure",
        actionFilter: { outcome: "incorrect", confidence: "sure" },
        actionText: `Inspect ${sureQuestions.length - sureCorrect} 'Sure' errors →`,
      });
    } else {
      items.push({
        id: "accuracy_profile",
        title: "Accuracy Profile",
        metric: `${formatReviewNumber(attempt.accuracyPct)}%`,
        desc: `${attempt.correct} correct out of ${attempt.answered} attempted.`,
        badge: `${attempt.correct}/${attempt.answered} hit rate`,
        badgeStyle: "bg-indigo-100 text-indigo-800 border-indigo-200",
        iconType: "confidence",
        actionTab: "all",
        actionFilter: {},
        actionText: "View all questions →",
      });
    }

    // 3. Pacing
    if (slowQuestions.length >= 2) {
      const slowSec = slowQuestions.reduce(
        (acc, q) => acc + (q.timeSpentSeconds || 0),
        0,
      );
      items.push({
        id: "pacing_traps",
        title: "Pacing & Time Traps",
        metric: `${slowQuestions.length} slow Qs (>90s)`,
        desc: `These questions consumed ${formatTimeSeconds(slowSec)} of exam time. Flag and move on after 70s.`,
        badge: `${Math.round(slowSec / 60)} min spent`,
        badgeStyle: "bg-amber-100 text-amber-800 border-amber-200",
        iconType: "pacing",
        actionTab: "slow",
        actionFilter: { slow: true },
        actionText: `View ${slowQuestions.length} slow questions →`,
      });
    } else {
      items.push({
        id: "pacing_tempo",
        title: "Pacing Tempo",
        metric: `${avgTimePerQ}s / question`,
        desc: `Steady pace across ${attempt.totalQuestions} questions in ${formatTimeSeconds(attempt.durationSeconds)}.`,
        badge: "Steady rhythm",
        badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-200",
        iconType: "pacing",
        actionTab: "all",
        actionFilter: {},
        actionText: "View all questions →",
      });
    }
    return items.slice(0, 3);
  }, [
    attempt,
    alteredQuestions,
    slowQuestions,
    sureQuestions,
    sureCorrect,
    sureAccuracy,
    negativePenaltyMarks,
    grossCorrectMarks,
    netAlterationMarks,
    avgTimePerQ,
  ]);

  // AND + OR Filter function: Supports composite AND & OR filtering
  const getFilteredQuestions = (
    filters: ReviewFilterState | FilterTabType,
    sortOption: SortOptionType,
  ): QuestionAnswer[] => {
    // Normalize filter state
    const filterState: ReviewFilterState =
      typeof filters === "string"
        ? {
            outcome:
              filters === "correct" ||
              filters === "incorrect" ||
              filters === "skipped" ||
              filters === "partial"
                ? filters
                : null,
            outcomes:
              filters === "correct" ||
              filters === "incorrect" ||
              filters === "skipped" ||
              filters === "partial"
                ? [filters]
                : [],
            confidence:
              filters === "sure" ||
              filters === "50-50" ||
              filters === "guess" ||
              filters === "elimination"
                ? filters
                : null,
            confidences:
              filters === "sure" ||
              filters === "50-50" ||
              filters === "guess" ||
              filters === "elimination"
                ? [filters]
                : [],
            flagged: filters === "flagged",
            slow: filters === "slow",
            altered: filters === "altered",
            logic: "AND",
          }
        : filters;

    const selectedOutcomes: (
      "incorrect" | "correct" | "skipped" | "partial"
    )[] =
      filterState.outcomes && filterState.outcomes.length > 0
        ? filterState.outcomes
        : filterState.outcome
          ? [filterState.outcome]
          : [];

    const selectedConfidences: ("sure" | "50-50" | "guess" | "elimination")[] =
      filterState.confidences && filterState.confidences.length > 0
        ? filterState.confidences
        : filterState.confidence
          ? [filterState.confidence]
          : [];

    const isFlaggedActive = Boolean(filterState.flagged);
    const isSlowActive = Boolean(filterState.slow);
    const isAlteredActive = Boolean(filterState.altered);
    const logic = filterState.logic || "AND";

    const hasAnyActiveFilter =
      selectedOutcomes.length > 0 ||
      selectedConfidences.length > 0 ||
      isFlaggedActive ||
      isSlowActive ||
      isAlteredActive;

    let list = questionList.filter((q) => {
      if (!hasAnyActiveFilter) return true;

      const evaluable = isAssessmentQuestion(q.questionNo);

      // Outcome match check
      const matchesOutcome =
        selectedOutcomes.length > 0 &&
        selectedOutcomes.some((outcome) => {
          if (outcome === "correct") {
            return evaluable
              ? q.subjectiveAssessment === "strong"
              : Boolean(q.selected && q.isCorrect === true);
          }
          if (outcome === "incorrect") {
            return evaluable
              ? q.subjectiveAssessment === "needs-work"
              : Boolean(q.selected && q.isCorrect === false);
          }
          if (outcome === "partial") {
            return evaluable
              ? q.subjectiveAssessment === "partial"
              : Boolean(q.selected && q.subjectiveAssessment === "partial");
          }
          if (outcome === "skipped") {
            return !isQuestionAnswered(q);
          }
          return false;
        });

      // Confidence match check
      const matchesConfidence =
        selectedConfidences.length > 0 &&
        selectedConfidences.some((conf) => {
          if (conf === "guess") {
            return q.confidence === "guess" || q.confidence === "elimination";
          }
          return q.confidence === conf;
        });

      // Flagged match check
      const matchesFlagged = isFlaggedActive && Boolean(q.flagged);

      // Slow (>90s) match check
      const matchesSlow = isSlowActive && (q.timeSpentSeconds || 0) >= 90;

      // Altered match check
      const matchesAltered =
        isAlteredActive &&
        !isClozeQuestion(q.questionNo) &&
        Boolean(q.changesCount && q.changesCount > 0);

      if (logic === "OR") {
        return (
          matchesOutcome ||
          matchesConfidence ||
          matchesFlagged ||
          matchesSlow ||
          matchesAltered
        );
      }

      // logic === "AND"
      if (selectedOutcomes.length > 0 && !matchesOutcome) return false;
      if (selectedConfidences.length > 0 && !matchesConfidence) return false;
      if (isFlaggedActive && !matchesFlagged) return false;
      if (isSlowActive && !matchesSlow) return false;
      if (isAlteredActive && !matchesAltered) return false;

      return true;
    });

    list.sort((a, b) => {
      if (sortOption === "qno_desc") return b.questionNo - a.questionNo;
      if (sortOption === "time_desc") {
        const diff = (b.timeSpentSeconds || 0) - (a.timeSpentSeconds || 0);
        if (diff !== 0) return diff;
        return a.questionNo - b.questionNo;
      }
      if (sortOption === "time_asc") {
        const diff = (a.timeSpentSeconds || 0) - (b.timeSpentSeconds || 0);
        if (diff !== 0) return diff;
        return a.questionNo - b.questionNo;
      }
      return a.questionNo - b.questionNo;
    });
    return list;
  };

  return {
    // Paper
    matchedPaper,
    isMarkdownPaper,
    markdownQuestions,
    markdownHeader,
    canPreviewPaper,
    displayPaperTitle,
    effectiveMaxScore,
    // Scores
    scorePct,
    grossCorrectMarks,
    negativePenaltyMarks,
    netAlterationMarks,
    // Classification
    isCsat,
    isSubjectiveAttempt,
    correctMarksPerQ,
    incorrectMarksPerQ,
    subjectiveMarksPerQ,
    subjectivePartialCount,
    // Questions
    questionList,
    alteredQuestions,
    slowQuestions,
    flaggedQuestions,
    incorrectQuestionsList,
    skippedQuestionsList,
    sureQuestions,
    sureCorrect,
    sureAccuracy,
    fiftyFiftyQuestions,
    fiftyFiftyCorrect,
    fiftyFiftyAccuracy,
    eliminationQuestions,
    eliminationCorrect,
    eliminationAccuracy,
    guessQuestions,
    guessCorrect,
    guessAccuracy,
    avgTimePerQ,
    // Insights
    cutoffVerdict,
    topTakeaways,
    // Helpers
    isClozeQuestion,
    isAssessmentQuestion,
    isQuestionAnswered,
    getFullMarks,
    getAssessmentMarks,
    formatReviewNumber,
    getFilteredQuestions,
  };
}

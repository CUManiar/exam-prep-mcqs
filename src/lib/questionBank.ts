import {
  QuestionBankEntity,
  QuestionBankQueryFilter,
} from "./questionBankTypes";
import { QuestionPaper, ParsedQuestion } from "./types";
import { parseQuestionnaireMarkdown } from "./markdownPaperParser";
import { getSupabaseClient } from "./supabase";

/** In-memory cache for fast local access and offline fallback */
const inMemoryQuestionBank: Map<string, QuestionBankEntity> = new Map();

/**
 * Normalizes a QuestionPaper into individual QuestionBankEntity records.
 * Extracts questions from parsedQuestions or parses markdown questionnaire text,
 * hydrating each with correct answers, explanations, and metadata.
 */
export function normalizePaperToQuestions(
  paper: QuestionPaper,
  userId?: string | null,
): QuestionBankEntity[] {
  let questions: ParsedQuestion[] = [];

  if (paper.parsedQuestions && paper.parsedQuestions.length > 0) {
    questions = paper.parsedQuestions;
  } else if (paper.markdownContent && paper.markdownContent.trim()) {
    questions = parseQuestionnaireMarkdown(paper.markdownContent);
  }

  const paperTitle =
    paper.label || paper.title || `${paper.year} – ${paper.subject}`;
  const isSubjective = paper.examType === "subjective";

  return questions.map((q) => {
    const qNo = q.questionNo;
    const sanitizedPaperId = paper.id.replace(/[^a-zA-Z0-9_-]/g, "");
    const questionId = `qb_${sanitizedPaperId}_q${qNo}`;

    const isMatching = Boolean(q.matchingItems && q.matchingItems.length > 0);
    const isCloze =
      !isSubjective && (!q.options || Object.keys(q.options).length === 0);

    const questionType = isSubjective
      ? "subjective"
      : isMatching
        ? "matching"
        : isCloze
          ? "cloze"
          : "mcq";

    return {
      id: questionId,
      userId: userId || paper.userId || null,
      sourcePaperId: paper.id,
      sourcePaperTitle: paperTitle,
      sourcePaperYear: String(paper.year || ""),
      questionNo: qNo,
      examStage: paper.category || "prelims",
      questionType,
      subject: paper.subject || "General Studies",
      topic: q.topic || undefined,
      subtopic: q.chapter || undefined,
      syllabusNodeIds: [],
      previousYears: q.previousYears || undefined,
      tags: [paper.subject, paper.year].filter(Boolean),
      contentMarkdown: q.text,
      options: q.options || {},
      matchingItems: q.matchingItems,
      correctAnswer: paper.answerKey?.[qNo],
      explanationMarkdown: paper.explanations?.[qNo],
      marks: paper.correctMarks || (isSubjective ? 10.0 : 2.0),
      negativeMarks: paper.incorrectMarks || (isSubjective ? 0 : 0.667),
      wordLimit: isSubjective ? 150 : undefined,
      createdAt: paper.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Saves normalized questions into memory cache and Supabase (if online).
 */
export async function saveQuestionsToBank(
  questions: QuestionBankEntity[],
  userId?: string,
): Promise<boolean> {
  if (!questions || questions.length === 0) return true;

  // 1. Update in-memory cache
  questions.forEach((q) => inMemoryQuestionBank.set(q.id, q));

  // 2. Persist to Supabase question_bank table if client available
  const supabase = getSupabaseClient();
  if (!supabase) return true;

  try {
    const rows = questions.map((q) => ({
      id: q.id,
      user_id: q.userId || userId || null,
      source_paper_id: q.sourcePaperId,
      source_paper_title: q.sourcePaperTitle,
      source_paper_year: q.sourcePaperYear,
      question_no: q.questionNo,
      exam_stage: q.examStage,
      question_type: q.questionType,
      subject: q.subject,
      topic: q.topic || null,
      subtopic: q.subtopic || null,
      syllabus_node_ids: q.syllabusNodeIds || [],
      previous_years: q.previousYears || null,
      tags: q.tags || [],
      content_markdown: q.contentMarkdown,
      options: q.options || {},
      matching_items: q.matchingItems || null,
      correct_answer: q.correctAnswer || null,
      explanation_markdown: q.explanationMarkdown || null,
      rubric: q.rubric || null,
      marks: q.marks,
      negative_marks: q.negativeMarks,
      word_limit: q.wordLimit || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("question_bank")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.warn("Supabase question_bank upsert notice:", error.message);
    }
    return !error;
  } catch (err) {
    console.warn("Failed saving questions to Supabase question_bank:", err);
    return false;
  }
}

/**
 * Retrieves questions matching query filters with pagination.
 */
export async function queryQuestionBank(
  filter: QuestionBankQueryFilter,
): Promise<QuestionBankEntity[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      let query = supabase.from("question_bank").select("*");

      if (filter.userId) {
        query = query.or(`user_id.is.null,user_id.eq.${filter.userId}`);
      }
      if (filter.examStage) {
        query = query.eq("exam_stage", filter.examStage);
      }
      if (filter.subject) {
        query = query.ilike("subject", `%${filter.subject}%`);
      }
      if (filter.sourcePaperId) {
        query = query.eq("source_paper_id", filter.sourcePaperId);
      }
      if (filter.limit) {
        query = query.limit(filter.limit);
      }
      if (filter.offset) {
        query = query.range(
          filter.offset,
          filter.offset + (filter.limit || 20) - 1,
        );
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((r) => ({
          id: r.id,
          userId: r.user_id,
          sourcePaperId: r.source_paper_id,
          sourcePaperTitle: r.source_paper_title,
          sourcePaperYear: r.source_paper_year,
          questionNo: r.question_no,
          examStage: r.exam_stage,
          questionType: r.question_type,
          subject: r.subject,
          topic: r.topic,
          subtopic: r.subtopic,
          syllabusNodeIds: r.syllabus_node_ids,
          previousYears: r.previous_years,
          tags: r.tags,
          contentMarkdown: r.content_markdown,
          options: r.options,
          matchingItems: r.matching_items,
          correctAnswer: r.correct_answer,
          explanationMarkdown: r.explanation_markdown,
          rubric: r.rubric,
          marks: Number(r.marks),
          negativeMarks: Number(r.negative_marks),
          wordLimit: r.word_limit ? Number(r.word_limit) : undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    } catch {
      // Fallback to in-memory below
    }
  }

  // In-memory fallback
  let list = Array.from(inMemoryQuestionBank.values());

  if (filter.examStage) {
    list = list.filter((q) => q.examStage === filter.examStage);
  }
  if (filter.subject) {
    const s = filter.subject.toLowerCase();
    list = list.filter((q) => q.subject.toLowerCase().includes(s));
  }
  if (filter.sourcePaperId) {
    list = list.filter((q) => q.sourcePaperId === filter.sourcePaperId);
  }
  if (filter.searchQuery) {
    const sq = filter.searchQuery.toLowerCase();
    list = list.filter((q) => q.contentMarkdown.toLowerCase().includes(sq));
  }

  const offset = filter.offset || 0;
  const limit = filter.limit || 20;
  return list.slice(offset, offset + limit);
}

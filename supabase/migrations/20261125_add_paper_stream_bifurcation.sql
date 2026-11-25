-- ============================================================================
-- Migration: Add Paper Stream Bifurcation (GS, CSAT, GS1-GS4, Essay, Languages, Optional)
-- Retroactively classifies existing question_bank, custom_papers, attempts, mains_sessions
-- ============================================================================

-- 1. Add paper_stream and optional_name columns
ALTER TABLE IF EXISTS public.question_bank
  ADD COLUMN IF NOT EXISTS paper_stream TEXT NOT NULL DEFAULT 'GS',
  ADD COLUMN IF NOT EXISTS optional_name TEXT;

ALTER TABLE IF EXISTS public.custom_papers
  ADD COLUMN IF NOT EXISTS paper_stream TEXT NOT NULL DEFAULT 'GS',
  ADD COLUMN IF NOT EXISTS optional_name TEXT;

ALTER TABLE IF EXISTS public.attempts
  ADD COLUMN IF NOT EXISTS paper_stream TEXT NOT NULL DEFAULT 'GS',
  ADD COLUMN IF NOT EXISTS optional_name TEXT;

ALTER TABLE IF EXISTS public.mains_sessions
  ADD COLUMN IF NOT EXISTS paper_stream TEXT NOT NULL DEFAULT 'GS1';

-- 2. Query indexes
CREATE INDEX IF NOT EXISTS idx_qb_paper_stream ON public.question_bank(paper_stream);
CREATE INDEX IF NOT EXISTS idx_custom_papers_paper_stream ON public.custom_papers(paper_stream);
CREATE INDEX IF NOT EXISTS idx_attempts_paper_stream ON public.attempts(paper_stream);
CREATE INDEX IF NOT EXISTS idx_mains_sessions_paper_stream ON public.mains_sessions(paper_stream);

-- 3. Retroactive backfill: question_bank
UPDATE public.question_bank
SET
  paper_stream = CASE
    WHEN exam_stage = 'optional'
      OR lower(COALESCE(subject, '') || ' ' || COALESCE(source_paper_title, '')) ~ '\m(optional|sociology|psir|anthropology|public administration)\M'
      THEN 'Optional'
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(source_paper_title, '')) ~ '\mgujarati\M'
      THEN 'Gujarati'
    WHEN (exam_stage = 'mains' OR lower(COALESCE(subject, '') || ' ' || COALESCE(source_paper_title, '')) ~ '\m(compulsory|paper)\M')
      AND lower(COALESCE(subject, '') || ' ' || COALESCE(source_paper_title, '')) ~ '\menglish\M'
      THEN 'English'
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(source_paper_title, '')) ~ '\messay\M'
      THEN 'Essay'
    WHEN exam_stage = 'mains' AND lower(COALESCE(subject, '') || ' ' || COALESCE(source_paper_title, '')) ~ '\m(gs[\s-]*4|gs[\s-]*iv|ethics)\M'
      THEN 'GS4'
    WHEN exam_stage = 'mains' AND lower(COALESCE(subject, '') || ' ' || COALESCE(source_paper_title, '')) ~ '\m(gs[\s-]*3|gs[\s-]*iii)\M'
      THEN 'GS3'
    WHEN exam_stage = 'mains' AND lower(COALESCE(subject, '') || ' ' || COALESCE(source_paper_title, '')) ~ '\m(gs[\s-]*2|gs[\s-]*ii)\M'
      THEN 'GS2'
    WHEN exam_stage = 'mains'
      THEN 'GS1'
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(source_paper_title, '') || ' ' || COALESCE(topic, '')) ~ '\m(csat|paper[\s-]*ii|paper[\s-]*2|aptitude|numeracy|permutation|probability|hcf|lcm|number system|logical reasoning|data interpretation|reading comprehension)\M'
      OR lower(left(COALESCE(content_markdown, ''), 400)) ~ '\m(hcf|lcm|remainder when|pipes? and cistern|simple interest|compound interest|how many ways can|probability that)\M'
      THEN 'CSAT'
    ELSE 'GS'
  END,
  optional_name = CASE
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(source_paper_title, '')) ~ '\msociology\M' THEN 'Sociology'
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(source_paper_title, '')) ~ '\mpsir\M' THEN 'Political Science & International Relations (PSIR)'
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(source_paper_title, '')) ~ '\manthropology\M' THEN 'Anthropology'
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(source_paper_title, '')) ~ '\mpublic administration\M' THEN 'Public Administration'
    ELSE optional_name
  END;

-- 4. Retroactive backfill: custom_papers
UPDATE public.custom_papers
SET
  paper_stream = CASE
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(label, '')) ~ '\m(optional|sociology|psir|anthropology|public administration)\M'
      THEN 'Optional'
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(label, '')) ~ '\mgujarati\M'
      THEN 'Gujarati'
    WHEN (stage = 'mains' OR exam_type = 'subjective')
      AND lower(COALESCE(subject, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(label, '')) ~ '\menglish\M'
      THEN 'English'
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(label, '')) ~ '\messay\M'
      THEN 'Essay'
    WHEN (stage = 'mains' OR exam_type = 'subjective')
      AND lower(COALESCE(subject, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(label, '')) ~ '\m(gs[\s-]*4|gs[\s-]*iv|ethics)\M'
      THEN 'GS4'
    WHEN (stage = 'mains' OR exam_type = 'subjective')
      AND lower(COALESCE(subject, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(label, '')) ~ '\m(gs[\s-]*3|gs[\s-]*iii)\M'
      THEN 'GS3'
    WHEN (stage = 'mains' OR exam_type = 'subjective')
      AND lower(COALESCE(subject, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(label, '')) ~ '\m(gs[\s-]*2|gs[\s-]*ii)\M'
      THEN 'GS2'
    WHEN stage = 'mains' OR exam_type = 'subjective'
      THEN 'GS1'
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(label, '')) ~ '\m(csat|paper[\s-]*ii|paper[\s-]*2|aptitude|numeracy|permutation|probability|hcf|lcm|number system|logical reasoning|data interpretation)\M'
      THEN 'CSAT'
    ELSE 'GS'
  END,
  optional_name = CASE
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(label, '')) ~ '\msociology\M' THEN 'Sociology'
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(label, '')) ~ '\mpsir\M' THEN 'Political Science & International Relations (PSIR)'
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(label, '')) ~ '\manthropology\M' THEN 'Anthropology'
    WHEN lower(COALESCE(subject, '') || ' ' || COALESCE(title, '') || ' ' || COALESCE(label, '')) ~ '\mpublic administration\M' THEN 'Public Administration'
    ELSE optional_name
  END;

-- 5. Retroactive backfill: attempts (column + JSONB payload)
UPDATE public.attempts
SET
  paper_stream = CASE
    WHEN lower(COALESCE(paper_label, '')) ~ '\m(optional|sociology|psir|anthropology|public administration)\M'
      THEN 'Optional'
    WHEN lower(COALESCE(paper_label, '')) ~ '\mgujarati\M'
      THEN 'Gujarati'
    WHEN (category = 'mains' OR exam_type = 'subjective')
      AND lower(COALESCE(paper_label, '')) ~ '\menglish\M'
      THEN 'English'
    WHEN lower(COALESCE(paper_label, '')) ~ '\messay\M'
      THEN 'Essay'
    WHEN (category = 'mains' OR exam_type = 'subjective')
      AND lower(COALESCE(paper_label, '')) ~ '\m(gs[\s-]*4|gs[\s-]*iv|ethics)\M'
      THEN 'GS4'
    WHEN (category = 'mains' OR exam_type = 'subjective')
      AND lower(COALESCE(paper_label, '')) ~ '\m(gs[\s-]*3|gs[\s-]*iii)\M'
      THEN 'GS3'
    WHEN (category = 'mains' OR exam_type = 'subjective')
      AND lower(COALESCE(paper_label, '')) ~ '\m(gs[\s-]*2|gs[\s-]*ii)\M'
      THEN 'GS2'
    WHEN category = 'mains' OR exam_type = 'subjective'
      THEN 'GS1'
    WHEN lower(COALESCE(paper_label, '') || ' ' || COALESCE(paper_id, '')) ~ '\m(csat|paper[\s-]*ii|paper[\s-]*2|aptitude|numeracy|permutation|probability|hcf|lcm|number system|logical reasoning|data interpretation)\M'
      THEN 'CSAT'
    ELSE 'GS'
  END,
  optional_name = CASE
    WHEN lower(COALESCE(paper_label, '')) ~ '\msociology\M' THEN 'Sociology'
    WHEN lower(COALESCE(paper_label, '')) ~ '\mpsir\M' THEN 'Political Science & International Relations (PSIR)'
    WHEN lower(COALESCE(paper_label, '')) ~ '\manthropology\M' THEN 'Anthropology'
    WHEN lower(COALESCE(paper_label, '')) ~ '\mpublic administration\M' THEN 'Public Administration'
    ELSE optional_name
  END;

UPDATE public.attempts
SET payload = jsonb_set(
  CASE
    WHEN optional_name IS NOT NULL THEN jsonb_set(payload, '{optionalName}', to_jsonb(optional_name), true)
    ELSE payload
  END,
  '{paperStream}',
  to_jsonb(paper_stream),
  true
)
WHERE payload IS NOT NULL;

-- 6. Retroactive backfill: mains_sessions
UPDATE public.mains_sessions
SET paper_stream = CASE
  WHEN lower(COALESCE(paper_type, '')) ~ '\moptional\M' OR optional_subject IS NOT NULL AND optional_subject <> '' AND lower(COALESCE(paper_type, '')) = 'optional' THEN 'Optional'
  WHEN lower(COALESCE(paper_type, '')) ~ '\mgujarati\M' THEN 'Gujarati'
  WHEN lower(COALESCE(paper_type, '')) ~ '\menglish\M' THEN 'English'
  WHEN lower(COALESCE(paper_type, '')) ~ '\messay\M' THEN 'Essay'
  WHEN lower(COALESCE(paper_type, '')) ~ '\m(gs[\s-]*4|gs4)\M' THEN 'GS4'
  WHEN lower(COALESCE(paper_type, '')) ~ '\m(gs[\s-]*3|gs3)\M' THEN 'GS3'
  WHEN lower(COALESCE(paper_type, '')) ~ '\m(gs[\s-]*2|gs2)\M' THEN 'GS2'
  ELSE 'GS1'
END;

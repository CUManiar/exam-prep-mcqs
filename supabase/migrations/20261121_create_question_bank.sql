-- ============================================================================
-- Migration: Create Question Bank (Normalized Question Entities)
-- Enables point queries, cross-paper topical tests, and evaluation tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.question_bank (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_paper_id TEXT NOT NULL,
  source_paper_title TEXT NOT NULL,
  source_paper_year TEXT,
  question_no INT NOT NULL,

  -- Stage & Type
  exam_stage TEXT NOT NULL DEFAULT 'prelims', -- 'prelims' | 'mains' | 'optional'
  question_type TEXT NOT NULL DEFAULT 'mcq',   -- 'mcq' | 'subjective' | 'cloze' | 'matching'
  subject TEXT NOT NULL,
  topic TEXT,
  subtopic TEXT,
  syllabus_node_ids TEXT[] DEFAULT '{}',
  previous_years TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Content
  content_markdown TEXT NOT NULL,
  options JSONB DEFAULT '{}'::jsonb,
  matching_items JSONB,
  correct_answer TEXT,
  explanation_markdown TEXT,
  rubric JSONB,

  -- Scoring & Constraints
  marks NUMERIC NOT NULL DEFAULT 2.0,
  negative_marks NUMERIC NOT NULL DEFAULT 0.667,
  word_limit INT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- High-performance query indexes
CREATE INDEX IF NOT EXISTS idx_qb_user_stage ON public.question_bank(user_id, exam_stage);
CREATE INDEX IF NOT EXISTS idx_qb_source_paper ON public.question_bank(source_paper_id);
CREATE INDEX IF NOT EXISTS idx_qb_subject_topic ON public.question_bank(subject, topic);
CREATE INDEX IF NOT EXISTS idx_qb_syllabus_nodes ON public.question_bank USING GIN(syllabus_node_ids);
CREATE INDEX IF NOT EXISTS idx_qb_tags ON public.question_bank USING GIN(tags);

-- Row Level Security (RLS)
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- 1. Read: Users can read public questions (user_id IS NULL) or their own private questions
CREATE POLICY "Users can read public and own questions" ON public.question_bank
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

-- 2. Insert: Authenticated users can insert their own custom questions
CREATE POLICY "Users can insert own questions" ON public.question_bank
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Update: Authenticated users can update their own questions
CREATE POLICY "Users can update own questions" ON public.question_bank
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Delete: Authenticated users can delete their own questions
CREATE POLICY "Users can delete own questions" ON public.question_bank
  FOR DELETE
  USING (auth.uid() = user_id);

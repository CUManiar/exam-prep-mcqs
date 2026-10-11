import { Client } from 'pg';

const rawConnectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (!rawConnectionString) {
  console.error('No Postgres connection string found in .env.local');
  process.exit(1);
}

const connectionString = rawConnectionString.split('?')[0];

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase Postgres.');

  const sql = `
    -- 1. Add hidden_paper_ids to profiles
    ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS hidden_paper_ids TEXT[] DEFAULT '{}';

    -- 2. Create custom_papers table (isolated per user)
    CREATE TABLE IF NOT EXISTS public.custom_papers (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      year INTEGER NOT NULL,
      subject TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'prelims',
      exam_type TEXT NOT NULL DEFAULT 'objective',
      label TEXT NOT NULL,
      total_questions INTEGER DEFAULT 100,
      total_marks NUMERIC DEFAULT 200,
      correct_marks NUMERIC DEFAULT 2.0,
      incorrect_marks NUMERIC DEFAULT 0.667,
      time_minutes INTEGER DEFAULT 120,
      qp_url TEXT NOT NULL,
      ak_url TEXT,
      exs_url TEXT,
      answer_key JSONB DEFAULT '{}',
      answer_key_text TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_custom_papers_user_id ON public.custom_papers(user_id);

    -- Enable RLS
    ALTER TABLE public.custom_papers ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own custom papers" ON public.custom_papers;
    DROP POLICY IF EXISTS "Users can insert own custom papers" ON public.custom_papers;
    DROP POLICY IF EXISTS "Users can update own custom papers" ON public.custom_papers;
    DROP POLICY IF EXISTS "Users can delete own custom papers" ON public.custom_papers;

    CREATE POLICY "Users can view own custom papers"
      ON public.custom_papers FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own custom papers"
      ON public.custom_papers FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own custom papers"
      ON public.custom_papers FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own custom papers"
      ON public.custom_papers FOR DELETE
      USING (auth.uid() = user_id);
  `;

  await client.query(sql);
  console.log('Successfully added hidden_paper_ids and custom_papers table with RLS!');
  await client.end();
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});

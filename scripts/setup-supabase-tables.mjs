import { Client } from 'pg';

const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('No Postgres connection string found in .env.local');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  const sql = `
    -- 1. Profiles Table
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT,
      full_name TEXT,
      is_pro BOOLEAN DEFAULT false,
      pro_purchased_at TIMESTAMPTZ,
      razorpay_payment_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 2. Attempts Table (Isolated per user)
    CREATE TABLE IF NOT EXISTS public.attempts (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      paper_id TEXT NOT NULL,
      paper_label TEXT NOT NULL,
      category TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      mode TEXT NOT NULL,
      score NUMERIC,
      max_score NUMERIC,
      accuracy_pct NUMERIC,
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Index for fast user query
    CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON public.attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_paper_id ON public.attempts(paper_id);

    -- 3. Drafts Table (Ongoing active session per user)
    CREATE TABLE IF NOT EXISTS public.drafts (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      paper_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 4. Enable Row Level Security (RLS)
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

    -- Drop old policies if existing to ensure idempotent run
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view own attempts" ON public.attempts;
    DROP POLICY IF EXISTS "Users can insert own attempts" ON public.attempts;
    DROP POLICY IF EXISTS "Users can update own attempts" ON public.attempts;
    DROP POLICY IF EXISTS "Users can delete own attempts" ON public.attempts;
    DROP POLICY IF EXISTS "Users can view own draft" ON public.drafts;
    DROP POLICY IF EXISTS "Users can insert or update own draft" ON public.drafts;
    DROP POLICY IF EXISTS "Users can delete own draft" ON public.drafts;

    -- Profiles RLS Policies
    CREATE POLICY "Users can view own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);

    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id);

    -- Attempts RLS Policies
    CREATE POLICY "Users can view own attempts"
      ON public.attempts FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own attempts"
      ON public.attempts FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own attempts"
      ON public.attempts FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own attempts"
      ON public.attempts FOR DELETE
      USING (auth.uid() = user_id);

    -- Drafts RLS Policies
    CREATE POLICY "Users can view own draft"
      ON public.drafts FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert or update own draft"
      ON public.drafts FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- 5. Trigger on auth.users to auto-create public.profiles
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, is_pro)
      VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        false
      )
      ON CONFLICT (id) DO NOTHING;
      RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  `;

  await client.query(sql);
  console.log('Successfully set up profiles, attempts, drafts tables with RLS and triggers!');
  await client.end();
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

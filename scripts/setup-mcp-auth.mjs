import { Client } from "pg";

const rawConnectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (!rawConnectionString) {
  console.error("No Postgres connection string found in .env.local");
  process.exit(1);
}

const client = new Client({
  connectionString: rawConnectionString.split("?")[0],
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  await client.query(`
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS only_custom_papers BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS custom_syllabus JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS custom_syllabus_markdown TEXT NOT NULL DEFAULT '';

    CREATE TABLE IF NOT EXISTS public.mcp_oauth_clients (
      client_id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      redirect_uris TEXT[] NOT NULL,
      token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.mcp_oauth_codes (
      code_hash TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      redirect_uri TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      scope TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS public.mcp_oauth_tokens (
      token_hash TEXT PRIMARY KEY,
      refresh_token_hash TEXT UNIQUE NOT NULL,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
      scope TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      refresh_expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_mcp_oauth_codes_expiry ON public.mcp_oauth_codes(expires_at);
    CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_user ON public.mcp_oauth_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_mcp_oauth_tokens_refresh ON public.mcp_oauth_tokens(refresh_token_hash);
  `);
  console.log("MCP OAuth tables are ready.");
  await client.end();
}

run().catch(async (error) => {
  console.error("MCP OAuth migration failed:", error);
  await client.end().catch(() => {});
  process.exit(1);
});

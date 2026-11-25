-- ============================================================================
-- Migration: Enable Row-Level Security (RLS) on MCP OAuth tables
-- Remediation for Supabase Security Advisor: rls_disabled_in_public
-- Note: Server-side src/lib/mcpAuth.ts uses SUPABASE_SERVICE_ROLE_KEY
-- (service_role bypasses RLS), so default-deny blocks all anon/public access
-- without affecting MCP OAuth server functionality.
-- ============================================================================

ALTER TABLE IF EXISTS public.mcp_oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mcp_oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mcp_oauth_tokens ENABLE ROW LEVEL SECURITY;

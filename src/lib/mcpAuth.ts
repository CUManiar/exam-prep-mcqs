import { createHash, randomBytes } from "node:crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const MCP_READ_SCOPE = "portal:read";
export const MCP_WRITE_SCOPE = "portal:write";
export const MCP_SCOPES = `${MCP_READ_SCOPE} ${MCP_WRITE_SCOPE}`;

// Claude's web connector is a public PKCE client. It publishes its client
// metadata at these stable URLs instead of requiring every user to register a
// separate client in the connector UI.
const CLAUDE_WEB_CLIENT_IDS = new Set([
  "https://claude.ai/oauth/mcp-oauth-client-metadata",
  "https://claude.ai/api/oauth/mcp-oauth-client-metadata",
]);

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const AUTH_CODE_TTL_SECONDS = 5 * 60;

export interface McpOAuthClient {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  tokenEndpointAuthMethod: string;
  createdAt: string;
}

export interface McpAccessToken {
  userId: string;
  clientId: string;
  scope: string;
  expiresAt: string;
}

interface AuthorizationCodeRecord {
  codeHash: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  expiresAt: string;
  usedAt?: string;
}

interface TokenRecord {
  tokenHash: string;
  refreshTokenHash: string;
  userId: string;
  clientId: string;
  scope: string;
  expiresAt: string;
  refreshExpiresAt: string;
  revokedAt?: string;
}

type MemoryState = {
  clients: Map<string, McpOAuthClient>;
  codes: Map<string, AuthorizationCodeRecord>;
  tokens: Map<string, TokenRecord>;
};

const memoryState: MemoryState = {
  clients: new Map(),
  codes: new Map(),
  tokens: new Map(),
};

let adminClient: SupabaseClient | null | undefined;

function getAdminClient(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  adminClient =
    url && serviceRoleKey
      ? createClient(url, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;
  return adminClient;
}

function toIso(secondsFromNow: number): string {
  return new Date(Date.now() + secondsFromNow * 1000).toISOString();
}

function isExpired(value: string): boolean {
  return Date.parse(value) <= Date.now();
}

export function hashMcpSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function newSecret(prefix: string): string {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

function normalizeScope(scope?: string): string {
  const requested = (scope || MCP_SCOPES).split(/\s+/).filter(Boolean);
  const allowed = requested.filter((value) =>
    [MCP_READ_SCOPE, MCP_WRITE_SCOPE].includes(value),
  );
  return allowed.includes(MCP_READ_SCOPE) ? allowed.join(" ") : MCP_READ_SCOPE;
}

function getClaudeWebClient(clientId: string): McpOAuthClient | null {
  if (!CLAUDE_WEB_CLIENT_IDS.has(clientId)) return null;
  return {
    clientId,
    clientName: "Claude",
    redirectUris: ["https://claude.ai/api/mcp/auth_callback"],
    tokenEndpointAuthMethod: "none",
    createdAt: new Date(0).toISOString(),
  };
}

export function hasMcpScope(scope: string, required: string): boolean {
  return scope.split(/\s+/).includes(required);
}

export async function registerMcpClient(input: {
  clientName?: string;
  redirectUris: string[];
  tokenEndpointAuthMethod?: string;
}): Promise<McpOAuthClient> {
  const client: McpOAuthClient = {
    clientId: newSecret("client"),
    clientName: input.clientName?.trim() || "MCP client",
    redirectUris: input.redirectUris,
    tokenEndpointAuthMethod: input.tokenEndpointAuthMethod || "none",
    createdAt: new Date().toISOString(),
  };

  const supabase = getAdminClient();
  if (supabase) {
    const { error } = await supabase.from("mcp_oauth_clients").insert({
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      created_at: client.createdAt,
    });
    if (error) throw new Error("MCP client registration failed.");
  } else {
    memoryState.clients.set(client.clientId, client);
  }

  return client;
}

export async function getMcpClient(
  clientId: string,
): Promise<McpOAuthClient | null> {
  const supabase = getAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("mcp_oauth_clients")
      .select(
        "client_id, client_name, redirect_uris, token_endpoint_auth_method, created_at",
      )
      .eq("client_id", clientId)
      .maybeSingle();
    if (error || !data) return getClaudeWebClient(clientId);
    return {
      clientId: data.client_id,
      clientName: data.client_name,
      redirectUris: data.redirect_uris || [],
      tokenEndpointAuthMethod: data.token_endpoint_auth_method || "none",
      createdAt: data.created_at,
    };
  }
  return memoryState.clients.get(clientId) || getClaudeWebClient(clientId);
}

export async function createMcpAuthorizationCode(input: {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string;
}): Promise<string> {
  const code = newSecret("code");
  const record: AuthorizationCodeRecord = {
    codeHash: hashMcpSecret(code),
    clientId: input.clientId,
    userId: input.userId,
    redirectUri: input.redirectUri,
    codeChallenge: input.codeChallenge,
    scope: normalizeScope(input.scope),
    expiresAt: toIso(AUTH_CODE_TTL_SECONDS),
  };

  const supabase = getAdminClient();
  if (supabase) {
    const client = await getMcpClient(record.clientId);
    if (!client) throw new Error("MCP client is not registered.");
    const { error: clientError } = await supabase
      .from("mcp_oauth_clients")
      .upsert(
        {
          client_id: client.clientId,
          client_name: client.clientName,
          redirect_uris: client.redirectUris,
          token_endpoint_auth_method: client.tokenEndpointAuthMethod,
          created_at: client.createdAt,
        },
        { onConflict: "client_id", ignoreDuplicates: true },
      );
    if (clientError) throw new Error("MCP client could not be stored.");
    const { error } = await supabase.from("mcp_oauth_codes").insert({
      code_hash: record.codeHash,
      client_id: record.clientId,
      user_id: record.userId,
      redirect_uri: record.redirectUri,
      code_challenge: record.codeChallenge,
      scope: record.scope,
      expires_at: record.expiresAt,
    });
    if (error) throw new Error("MCP authorization code could not be created.");
  } else {
    const client =
      memoryState.clients.get(record.clientId) ||
      getClaudeWebClient(record.clientId);
    if (!client) throw new Error("MCP client is not registered.");
    memoryState.clients.set(record.clientId, client);
    memoryState.codes.set(record.codeHash, record);
  }

  return code;
}

export async function consumeMcpAuthorizationCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<AuthorizationCodeRecord | null> {
  const codeHash = hashMcpSecret(input.code);
  const expectedChallenge = createHash("sha256")
    .update(input.codeVerifier)
    .digest("base64url");
  const supabase = getAdminClient();
  let record: AuthorizationCodeRecord | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("mcp_oauth_codes")
      .select(
        "code_hash, client_id, user_id, redirect_uri, code_challenge, scope, expires_at, used_at",
      )
      .eq("code_hash", codeHash)
      .maybeSingle();
    if (!error && data) {
      record = {
        codeHash: data.code_hash,
        clientId: data.client_id,
        userId: data.user_id,
        redirectUri: data.redirect_uri,
        codeChallenge: data.code_challenge,
        scope: data.scope,
        expiresAt: data.expires_at,
        usedAt: data.used_at || undefined,
      };
    }
  } else {
    record = memoryState.codes.get(codeHash) || null;
  }

  if (
    !record ||
    record.clientId !== input.clientId ||
    record.redirectUri !== input.redirectUri ||
    record.codeChallenge !== expectedChallenge ||
    Boolean(record.usedAt) ||
    isExpired(record.expiresAt)
  ) {
    return null;
  }

  const usedAt = new Date().toISOString();
  if (supabase) {
    await supabase
      .from("mcp_oauth_codes")
      .update({ used_at: usedAt })
      .eq("code_hash", codeHash)
      .is("used_at", null);
  } else {
    memoryState.codes.set(codeHash, { ...record, usedAt });
  }
  return record;
}

export async function issueMcpTokens(input: {
  userId: string;
  clientId: string;
  scope: string;
  existingRefreshToken?: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}> {
  const accessToken = newSecret("mcp");
  const refreshToken = input.existingRefreshToken || newSecret("refresh");
  const record: TokenRecord = {
    tokenHash: hashMcpSecret(accessToken),
    refreshTokenHash: hashMcpSecret(refreshToken),
    userId: input.userId,
    clientId: input.clientId,
    scope: normalizeScope(input.scope),
    expiresAt: toIso(ACCESS_TOKEN_TTL_SECONDS),
    refreshExpiresAt: toIso(REFRESH_TOKEN_TTL_SECONDS),
  };

  const supabase = getAdminClient();
  if (supabase) {
    if (input.existingRefreshToken) {
      await supabase
        .from("mcp_oauth_tokens")
        .update({
          token_hash: record.tokenHash,
          expires_at: record.expiresAt,
          scope: record.scope,
        })
        .eq("refresh_token_hash", record.refreshTokenHash)
        .is("revoked_at", null);
    } else {
      const { error } = await supabase.from("mcp_oauth_tokens").insert({
        token_hash: record.tokenHash,
        refresh_token_hash: record.refreshTokenHash,
        user_id: record.userId,
        client_id: record.clientId,
        scope: record.scope,
        expires_at: record.expiresAt,
        refresh_expires_at: record.refreshExpiresAt,
      });
      if (error) throw new Error("MCP token could not be issued.");
    }
  } else {
    memoryState.tokens.set(record.refreshTokenHash, record);
  }

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scope: record.scope,
  };
}

export async function verifyMcpAccessToken(
  accessToken: string,
): Promise<McpAccessToken | null> {
  const tokenHash = hashMcpSecret(accessToken);
  const supabase = getAdminClient();
  let record: TokenRecord | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("mcp_oauth_tokens")
      .select(
        "token_hash, refresh_token_hash, user_id, client_id, scope, expires_at, refresh_expires_at, revoked_at",
      )
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!error && data) {
      record = {
        tokenHash: data.token_hash,
        refreshTokenHash: data.refresh_token_hash,
        userId: data.user_id,
        clientId: data.client_id,
        scope: data.scope,
        expiresAt: data.expires_at,
        refreshExpiresAt: data.refresh_expires_at,
        revokedAt: data.revoked_at || undefined,
      };
    }
  } else {
    record =
      [...memoryState.tokens.values()].find(
        (candidate) => candidate.tokenHash === tokenHash,
      ) || null;
  }

  if (!record || record.revokedAt || isExpired(record.expiresAt)) return null;
  return {
    userId: record.userId,
    clientId: record.clientId,
    scope: record.scope,
    expiresAt: record.expiresAt,
  };
}

export async function refreshMcpTokens(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  clientId: string;
} | null> {
  const refreshHash = hashMcpSecret(refreshToken);
  const supabase = getAdminClient();
  let record: TokenRecord | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("mcp_oauth_tokens")
      .select(
        "token_hash, refresh_token_hash, user_id, client_id, scope, expires_at, refresh_expires_at, revoked_at",
      )
      .eq("refresh_token_hash", refreshHash)
      .maybeSingle();
    if (!error && data) {
      record = {
        tokenHash: data.token_hash,
        refreshTokenHash: data.refresh_token_hash,
        userId: data.user_id,
        clientId: data.client_id,
        scope: data.scope,
        expiresAt: data.expires_at,
        refreshExpiresAt: data.refresh_expires_at,
        revokedAt: data.revoked_at || undefined,
      };
    }
  } else {
    record = memoryState.tokens.get(refreshHash) || null;
  }

  if (!record || record.revokedAt || isExpired(record.refreshExpiresAt)) {
    return null;
  }

  const tokens = await issueMcpTokens({
    userId: record.userId,
    clientId: record.clientId,
    scope: record.scope,
    existingRefreshToken: refreshToken,
  });
  return { ...tokens, clientId: record.clientId };
}

export async function revokeMcpToken(token: string): Promise<void> {
  const tokenHash = hashMcpSecret(token);
  const supabase = getAdminClient();
  if (supabase) {
    await supabase
      .from("mcp_oauth_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .or(`token_hash.eq.${tokenHash},refresh_token_hash.eq.${tokenHash}`);
    return;
  }
  for (const [key, record] of memoryState.tokens.entries()) {
    if (
      record.tokenHash === tokenHash ||
      record.refreshTokenHash === tokenHash
    ) {
      memoryState.tokens.set(key, {
        ...record,
        revokedAt: new Date().toISOString(),
      });
    }
  }
}

export function getMcpAuthStorageMode(): "supabase" | "memory" {
  return getAdminClient() ? "supabase" : "memory";
}

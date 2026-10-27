import { NextRequest, NextResponse } from "next/server";
import {
  consumeMcpAuthorizationCode,
  getMcpClient,
  issueMcpTokens,
  refreshMcpTokens,
} from "../../../../lib/mcpAuth";
import { getMcpResourceUrl, noStoreHeaders } from "../../../../lib/mcpProtocol";

export const dynamic = "force-dynamic";

function oauthError(
  error: string,
  description: string,
  status = 400,
): NextResponse {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: noStoreHeaders() },
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const form = await req.formData();
  const grantType = String(form.get("grant_type") || "");
  const clientId = String(form.get("client_id") || "");
  const resource = String(form.get("resource") || "");
  if (resource && resource !== getMcpResourceUrl(req)) {
    return oauthError(
      "invalid_target",
      "The requested resource is not this portal.",
    );
  }

  if (grantType === "authorization_code") {
    const client = await getMcpClient(clientId);
    if (!client) return oauthError("invalid_client", "Unknown client.");
    const code = await consumeMcpAuthorizationCode({
      code: String(form.get("code") || ""),
      clientId,
      redirectUri: String(form.get("redirect_uri") || ""),
      codeVerifier: String(form.get("code_verifier") || ""),
    });
    if (!code)
      return oauthError(
        "invalid_grant",
        "The authorization code is invalid or expired.",
      );
    const tokens = await issueMcpTokens({
      userId: code.userId,
      clientId,
      scope: code.scope,
    });
    return NextResponse.json(
      {
        token_type: "Bearer",
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        scope: tokens.scope,
      },
      { headers: noStoreHeaders() },
    );
  }

  if (grantType === "refresh_token") {
    const tokens = await refreshMcpTokens(
      String(form.get("refresh_token") || ""),
    );
    if (!tokens || (clientId && tokens.clientId !== clientId))
      return oauthError(
        "invalid_grant",
        "The refresh token is invalid or expired.",
      );
    return NextResponse.json(
      {
        token_type: "Bearer",
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        scope: tokens.scope,
      },
      { headers: noStoreHeaders() },
    );
  }

  return oauthError(
    "unsupported_grant_type",
    "Use authorization_code or refresh_token.",
  );
}

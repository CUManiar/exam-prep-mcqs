import { NextRequest, NextResponse } from "next/server";
import {
  getMcpIssuerUrl,
  getMcpResourceUrl,
  noStoreHeaders,
} from "../../../../../lib/mcpProtocol";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest): NextResponse {
  const issuer = getMcpIssuerUrl(req);
  return NextResponse.json(
    {
      issuer,
      authorization_response_iss_parameter_supported: true,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      registration_endpoint: `${issuer}/register`,
      revocation_endpoint: `${issuer}/revoke`,
      client_id_metadata_document_supported: true,
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["portal:read", "portal:write"],
      resource: getMcpResourceUrl(req),
    },
    { headers: noStoreHeaders() },
  );
}

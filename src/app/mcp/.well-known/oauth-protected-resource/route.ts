import { NextRequest, NextResponse } from "next/server";
import {
  getMcpIssuerUrl,
  getMcpResourceUrl,
  noStoreHeaders,
} from "../../../../lib/mcpProtocol";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest): NextResponse {
  return NextResponse.json(
    {
      resource: getMcpResourceUrl(req),
      authorization_servers: [getMcpIssuerUrl(req)],
      scopes_supported: ["portal:read", "portal:write"],
      resource_documentation: `${req.nextUrl.origin}/help/mcp`,
    },
    { headers: noStoreHeaders() },
  );
}

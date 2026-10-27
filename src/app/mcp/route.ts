import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createPortalMcpServer } from "../../lib/mcpServer";
import { getMcpResourceUrl, noStoreHeaders } from "../../lib/mcpProtocol";
import { verifyMcpAccessToken } from "../../lib/mcpAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withMcpHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Mcp-Session-Id, Last-Event-ID",
  );
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  headers.set(
    "Access-Control-Expose-Headers",
    "Mcp-Session-Id, WWW-Authenticate",
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function unauthorized(req: NextRequest): NextResponse {
  const resourceMetadata = `${req.nextUrl.origin}/mcp/.well-known/oauth-protected-resource`;
  const headers = noStoreHeaders();
  headers.set(
    "WWW-Authenticate",
    `Bearer resource_metadata="${resourceMetadata}", scope="portal:read"`,
  );
  return NextResponse.json(
    {
      ok: false,
      error: "Authentication required. Connect your account through OAuth.",
    },
    { status: 401, headers },
  );
}

async function handleMcpRequest(req: NextRequest): Promise<Response> {
  const authorization = req.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return unauthorized(req);

  const access = await verifyMcpAccessToken(token);
  if (!access) return unauthorized(req);

  const server = createPortalMcpServer(access.userId, access.scope);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: 4 * 1024 * 1024,
  });
  const response = await (async () => {
    await server.connect(transport);
    return transport.handleRequest(req);
  })();
  return withMcpHeaders(response);
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Authorization, Content-Type, Mcp-Session-Id, Last-Event-ID",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(req: NextRequest): Promise<Response> {
  return handleMcpRequest(req);
}

export async function POST(req: NextRequest): Promise<Response> {
  return handleMcpRequest(req);
}

export async function DELETE(req: NextRequest): Promise<Response> {
  return handleMcpRequest(req);
}

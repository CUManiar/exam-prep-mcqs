import { NextRequest, NextResponse } from "next/server";
import { registerMcpClient } from "../../../../lib/mcpAuth";
import { noStoreHeaders } from "../../../../lib/mcpProtocol";

export const dynamic = "force-dynamic";

function validRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const redirectUris = Array.isArray(body.redirect_uris)
      ? body.redirect_uris.filter(
          (uri: unknown): uri is string => typeof uri === "string",
        )
      : [];
    if (
      !redirectUris.length ||
      redirectUris.some((uri) => !validRedirectUri(uri))
    ) {
      return NextResponse.json(
        {
          error: "invalid_client_metadata",
          error_description: "At least one HTTPS redirect URI is required.",
        },
        { status: 400, headers: noStoreHeaders() },
      );
    }
    const client = await registerMcpClient({
      clientName: body.client_name,
      redirectUris,
      tokenEndpointAuthMethod: body.token_endpoint_auth_method || "none",
    });
    return NextResponse.json(
      {
        client_id: client.clientId,
        client_name: client.clientName,
        redirect_uris: client.redirectUris,
        token_endpoint_auth_method: client.tokenEndpointAuthMethod,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      },
      { status: 201, headers: noStoreHeaders() },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "server_error",
        error_description:
          error instanceof Error
            ? error.message
            : "MCP OAuth storage is not configured. Ask the portal administrator to run the MCP setup migration.",
      },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}

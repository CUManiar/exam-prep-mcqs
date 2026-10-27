import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  createMcpAuthorizationCode,
  getMcpClient,
} from "../../../../lib/mcpAuth";
import {
  getMcpIssuerUrl,
  htmlEscape,
  noStoreHeaders,
} from "../../../../lib/mcpProtocol";

export const dynamic = "force-dynamic";

type AuthorizeParams = {
  clientId: string;
  redirectUri: string;
  responseType: string;
  codeChallenge: string;
  state: string;
  scope: string;
  resource: string;
};

function readParams(input: URLSearchParams | FormData): AuthorizeParams {
  const get = (key: string) => String(input.get(key) || "");
  return {
    clientId: get("client_id"),
    redirectUri: get("redirect_uri"),
    responseType: get("response_type"),
    codeChallenge: get("code_challenge"),
    state: get("state"),
    scope: get("scope") || "portal:read portal:write",
    resource: get("resource"),
  };
}

function errorPage(message: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html><body style="font-family:system-ui;padding:40px;max-width:680px;margin:auto"><h1>Could not connect</h1><p>${htmlEscape(message)}</p></body></html>`,
    {
      status: 400,
      headers: {
        ...Object.fromEntries(noStoreHeaders()),
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}

async function validateParams(params: AuthorizeParams, req: NextRequest) {
  const client = await getMcpClient(params.clientId);
  if (!client) return { error: "This chatbot connection is not registered." };
  if (params.responseType !== "code")
    return { error: "Only the authorization code flow is supported." };
  if (!params.codeChallenge)
    return { error: "The chatbot did not provide a PKCE code challenge." };
  if (!client.redirectUris.includes(params.redirectUri))
    return { error: "The redirect URI does not match the registered client." };
  if (params.resource && params.resource !== `${req.nextUrl.origin}/mcp`)
    return { error: "The requested resource is not this portal." };
  return { client };
}

function loginPage(
  params: AuthorizeParams,
  clientName: string,
  error = "",
): NextResponse {
  const fields = Object.entries({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: params.responseType,
    code_challenge: params.codeChallenge,
    state: params.state,
    scope: params.scope,
    resource: params.resource,
  })
    .map(
      ([key, value]) =>
        `<input type="hidden" name="${htmlEscape(key)}" value="${htmlEscape(value)}">`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect UPSC Prep Hub</title></head><body style="font-family:system-ui;background:#f8fafc;padding:24px;color:#0f172a"><main style="max-width:480px;margin:40px auto;background:white;border:1px solid #e2e8f0;border-radius:16px;padding:28px;box-shadow:0 10px 30px #0f172a12"><p style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b">UPSC Prep Hub</p><h1 style="margin:8px 0 10px;font-size:26px">Connect ${htmlEscape(clientName)}</h1><p style="color:#475569;line-height:1.55">Sign in to allow this chatbot to read your papers and progress. Write actions will still require confirmation inside the chatbot.</p><div style="background:#eff6ff;border-radius:10px;padding:12px;font-size:13px;margin:18px 0"><strong>Requested access</strong><br>Read your paper library and scores; save imported papers and attempts when you ask.</div>${error ? `<p style="color:#b91c1c;font-size:14px">${htmlEscape(error)}</p>` : ""}<form method="post">${fields}<label style="display:block;font-size:14px;font-weight:600;margin:14px 0 6px">Email<input required type="email" name="email" autocomplete="email" style="display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:11px;border:1px solid #cbd5e1;border-radius:8px"></label><label style="display:block;font-size:14px;font-weight:600;margin:14px 0 6px">Password<input required type="password" name="password" autocomplete="current-password" style="display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:11px;border:1px solid #cbd5e1;border-radius:8px"></label><button name="decision" value="approve" type="submit" style="width:100%;margin-top:18px;padding:12px;border:0;border-radius:8px;background:#1d4ed8;color:white;font-weight:700">Approve connection</button><button name="decision" value="deny" type="submit" style="width:100%;margin-top:8px;padding:11px;border:1px solid #cbd5e1;border-radius:8px;background:white;color:#334155">Cancel</button></form><p style="font-size:12px;color:#64748b;line-height:1.5;margin-top:20px">You can revoke this connection any time from your account settings.</p></main></body></html>`;
  return new NextResponse(html, {
    headers: {
      ...Object.fromEntries(noStoreHeaders()),
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function redirectError(
  params: AuthorizeParams,
  error: string,
  description: string,
): NextResponse {
  const url = new URL(params.redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (params.state) url.searchParams.set("state", params.state);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = readParams(req.nextUrl.searchParams);
  const validation = await validateParams(params, req);
  if (validation.error || !validation.client)
    return errorPage(validation.error || "Invalid connection request.");
  return loginPage(params, validation.client.clientName);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const form = await req.formData();
  const params = readParams(form);
  const validation = await validateParams(params, req);
  if (validation.error || !validation.client)
    return errorPage(validation.error || "Invalid connection request.");
  if (form.get("decision") !== "approve")
    return redirectError(
      params,
      "access_denied",
      "The student cancelled the connection.",
    );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey)
    return loginPage(
      params,
      validation.client.clientName,
      "Account authentication is not configured on this deployment.",
    );

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") || ""),
    password: String(form.get("password") || ""),
  });
  if (error || !data.user)
    return loginPage(
      params,
      validation.client.clientName,
      "Email or password was not accepted. Try again or sign in to the portal first.",
    );

  try {
    const code = await createMcpAuthorizationCode({
      clientId: params.clientId,
      userId: data.user.id,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      scope: params.scope,
    });
    const redirect = new URL(params.redirectUri);
    redirect.searchParams.set("code", code);
    redirect.searchParams.set("iss", getMcpIssuerUrl(req));
    if (params.state) redirect.searchParams.set("state", params.state);
    return NextResponse.redirect(redirect);
  } catch {
    return errorPage(
      "The connection could not be completed. Please try again.",
    );
  }
}

import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { execFile } from "node:child_process";

const mcpUrl = process.env.UPSC_MCP_URL || "https://upsc-practice.vercel.app/mcp";
const origin = new URL(mcpUrl).origin;
const authorizeUrl = `${origin}/mcp/oauth/authorize`;
const tokenUrl = `${origin}/mcp/oauth/token`;
const registerUrl = `${origin}/mcp/oauth/register`;
const credentialsPath = resolve(
  process.env.UPSC_MCP_CREDENTIALS || ".mcp/claude-desktop-credentials.json",
);

function base64url(value) {
  return value.toString("base64url");
}

function createPkce() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(
    createHash("sha256").update(verifier).digest(),
  );
  return { verifier, challenge };
}

function openBrowser(url) {
  if (process.platform !== "darwin") return;
  execFile("open", [url], () => {});
}

async function readJson(response, label) {
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${label} returned ${response.status}: ${text.slice(0, 240)}`);
  }
  if (!response.ok) {
    throw new Error(
      `${label} returned ${response.status}: ${body.error_description || body.error || "request failed"}`,
    );
  }
  return body;
}

async function registerClient(redirectUri) {
  const response = await fetch(registerUrl, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_name: "UPSC Practice Claude Desktop bridge",
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: "none",
    }),
  });
  return readJson(response, "Client registration");
}

function waitForCallback(server, expectedState) {
  return new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for the browser authorization callback."));
    }, 5 * 60 * 1000);

    server.on("request", (request, response) => {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      if (url.pathname !== "/callback") {
        response.writeHead(404).end("Not found");
        return;
      }

      const state = url.searchParams.get("state");
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error_description") || url.searchParams.get("error");
      if (state !== expectedState || !code) {
        clearTimeout(timeout);
        server.close();
        response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        response.end(error || "The authorization callback was invalid.");
        reject(new Error(error || "The authorization callback was invalid."));
        return;
      }

      clearTimeout(timeout);
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(
        "<!doctype html><title>UPSC Practice connected</title><p>UPSC Practice is connected. You can close this tab and return to Claude Desktop.</p>",
      );
      server.close();
      resolvePromise(code);
    });
  });
}

async function main() {
  const pkce = createPkce();
  const state = base64url(randomBytes(24));
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not open the local callback listener.");
  const redirectUri = `http://127.0.0.1:${address.port}/callback`;
  let client;
  try {
    client = await registerClient(redirectUri);
    const url = new URL(authorizeUrl);
    url.searchParams.set("client_id", client.client_id);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("code_challenge", pkce.challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "portal:read portal:write");
    url.searchParams.set("resource", mcpUrl);

    console.error("Opening UPSC Practice sign-in in your browser...");
    console.error(`If it does not open, visit this URL:\n${url.toString()}`);
    openBrowser(url.toString());

    const code = await waitForCallback(server, state);
    const form = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: client.client_id,
      code,
      redirect_uri: redirectUri,
      code_verifier: pkce.verifier,
      resource: mcpUrl,
    });
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: form,
    });
    const tokens = await readJson(response, "Token exchange");
    await mkdir(dirname(credentialsPath), { recursive: true });
    await writeFile(
      credentialsPath,
      JSON.stringify(
        {
          serverUrl: mcpUrl,
          clientId: client.client_id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: Date.now() + Number(tokens.expires_in || 3600) * 1000,
        },
        null,
        2,
      ) + "\n",
      { mode: 0o600 },
    );
    console.error(`Connected. Credentials saved to ${credentialsPath}`);
    console.error("You can now start Claude Desktop with: npm run mcp:desktop");
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(`MCP login failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});

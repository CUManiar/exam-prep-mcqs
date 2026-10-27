import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const credentialsPath = resolve(
  process.env.UPSC_MCP_CREDENTIALS || ".mcp/claude-desktop-credentials.json",
);
const defaultMcpUrl = "https://upsc-practice.vercel.app/mcp";
let credentials;

async function loadCredentials() {
  if (!credentials) {
    credentials = JSON.parse(await readFile(credentialsPath, "utf8"));
  }
  return credentials;
}

async function saveCredentials(next) {
  credentials = next;
  await writeFile(credentialsPath, JSON.stringify(next, null, 2) + "\n", {
    mode: 0o600,
  });
}

async function refreshIfNeeded() {
  const current = await loadCredentials();
  if (Number(current.expiresAt || 0) > Date.now() + 60_000) return current;
  if (!current.refreshToken) {
    throw new Error("The local UPSC Practice session expired. Run npm run mcp:login again.");
  }

  const tokenUrl = new URL("/mcp/oauth/token", current.serverUrl || defaultMcpUrl);
  const form = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: current.clientId,
    refresh_token: current.refreshToken,
    resource: current.serverUrl || defaultMcpUrl,
  });
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error("The local UPSC Practice session expired. Run npm run mcp:login again.");
  }
  await saveCredentials({
    ...current,
    accessToken: body.access_token,
    refreshToken: body.refresh_token || current.refreshToken,
    expiresAt: Date.now() + Number(body.expires_in || 3600) * 1000,
  });
  return credentials;
}

async function forward(message, requestId) {
  const current = await refreshIfNeeded();
  const payload = {
    ...message,
    jsonrpc: "2.0",
    ...(requestId === undefined ? {} : { id: requestId }),
  };
  if (process.env.UPSC_MCP_DEBUG) {
    console.error(`[UPSC MCP bridge] forwarding ${JSON.stringify(payload)}`);
  }
  const response = await fetch(current.serverUrl || defaultMcpUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${current.accessToken}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`UPSC MCP returned HTTP ${response.status}: ${text.slice(0, 240)}`);
  if (!text.trim()) return null;
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    const dataLine = text.split("\n").find((line) => line.startsWith("data:"));
    return dataLine ? JSON.parse(dataLine.slice(5).trim()) : null;
  }
  const body = JSON.parse(text);
  if (body.error) {
    throw new Error(`UPSC MCP error ${body.error.code || ""}: ${body.error.message || "request failed"}`);
  }
  return body;
}

const server = new Server(
  { name: "UPSC Practice local bridge", version: "1.0.0" },
  {
    capabilities: { tools: {} },
    instructions:
      "This is a local bridge to the student's authenticated UPSC Practice account. Confirm before write actions.",
  },
);

server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
  const response = await forward(request, extra.requestId);
  return response?.result || { tools: [] };
});

server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  const response = await forward(request, extra.requestId);
  return response?.result || { content: [{ type: "text", text: "No response from UPSC Practice." }] };
});

const transport = new StdioServerTransport();
transport.onerror = (error) => console.error(`[UPSC MCP bridge] ${error.message}`);
server.connect(transport).catch((error) => {
  console.error(`[UPSC MCP bridge] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});

import { NextRequest } from "next/server";
import { DEFAULT_PROD_URL } from "./config";

export function getMcpOrigin(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL ? DEFAULT_PROD_URL : req.nextUrl.origin)
  );
}

export function getMcpResourceUrl(req: NextRequest): string {
  return `${getMcpOrigin(req)}/mcp`;
}

export function getMcpIssuerUrl(req: NextRequest): string {
  return `${getMcpOrigin(req)}/mcp/oauth`;
}

export function htmlEscape(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function noStoreHeaders(): Headers {
  const headers = new Headers();
  headers.set("Cache-Control", "no-store");
  headers.set("Pragma", "no-cache");
  return headers;
}

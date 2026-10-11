import fs from "node:fs";
import path from "node:path";
import { put, del, list } from "@vercel/blob";
import {
  getAppEnvironment,
  isProdEnv,
  isLocalEnv,
  getProdApiUrl,
  APP_ENVIRONMENTS,
  DEFAULT_PROD_URL,
  type AppEnvironment,
} from "./config";

export {
  getAppEnvironment,
  isProdEnv,
  isLocalEnv,
  getProdApiUrl,
  APP_ENVIRONMENTS,
  DEFAULT_PROD_URL,
  type AppEnvironment,
};

/**
 * Automatically locate Vercel Blob credentials.
 * Supports:
 * 1. BLOB_STORE_ID (modern Vercel OIDC auth)
 * 2. BLOB_READ_WRITE_TOKEN
 * 3. Custom store prefixes like PAPERS_DATA_READ_WRITE_TOKEN or PAPERS_DATA_STORE_ID
 */
export function getBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return process.env.BLOB_READ_WRITE_TOKEN;
  }
  if (process.env.PAPERS_DATA_READ_WRITE_TOKEN) {
    return process.env.PAPERS_DATA_READ_WRITE_TOKEN;
  }
  const envKey = Object.keys(process.env).find((k) =>
    k.endsWith("_READ_WRITE_TOKEN"),
  );
  if (envKey && process.env[envKey]) {
    return process.env[envKey];
  }
  return undefined;
}

export function isBlobEnabled(): boolean {
  // Check for OIDC store ID or token or running on Vercel
  if (process.env.BLOB_STORE_ID) return true;
  if (Object.keys(process.env).some((k) => k.endsWith("_STORE_ID")))
    return true;
  if (getBlobToken()) return true;
  if (process.env.VERCEL) return true;
  return false;
}

/**
 * Upload a file (PDF, TXT, Image).
 * If running on Vercel or Blob is configured, uploads directly to Vercel Blob CDN.
 * On local machine, falls back to local public/data/ directory.
 */
export async function uploadFile(
  pathname: string,
  body: Buffer | Blob | string,
  contentType?: string,
): Promise<string> {
  const cleanPath = pathname.replace(/^\/+/, "");

  if (isBlobEnabled()) {
    const putOptions: any = {
      access: "public",
      addRandomSuffix: false,
      contentType,
    };
    const token = getBlobToken();
    if (token) {
      putOptions.token = token;
    }

    const blob = await put(cleanPath, body, putOptions);
    return blob.url;
  }

  // Local filesystem fallback (Mac local development)
  const localDir = path.join(process.cwd(), "public", "data");
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  const filePath = path.join(localDir, path.basename(cleanPath));
  if (Buffer.isBuffer(body)) {
    fs.writeFileSync(filePath, body);
  } else if (typeof body === "string") {
    fs.writeFileSync(filePath, body, "utf-8");
  } else {
    const arrayBuf = await (body as Blob).arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuf));
  }

  return `/data/${path.basename(cleanPath)}`;
}

/**
 * Delete a file by URL or path name.
 */
export async function deleteFile(fileUrlOrName: string): Promise<void> {
  if (!fileUrlOrName) return;

  if (isBlobEnabled()) {
    try {
      const delOptions: any = {};
      const token = getBlobToken();
      if (token) delOptions.token = token;
      await del(fileUrlOrName, delOptions);
    } catch (err) {
      console.warn("Blob delete warning:", err);
    }
    return;
  }

  const filename = path.basename(fileUrlOrName);
  const localPath = path.join(process.cwd(), "public", "data", filename);
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch {}
  }
}

/**
 * Helper to write safely to local public/data/ directory
 */
function writeLocalDiskFile<T>(filename: string, data: T): void {
  try {
    const localDir = path.join(process.cwd(), "public", "data");
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(localDir, filename),
      JSON.stringify(data, null, 2),
      "utf-8",
    );
  } catch (err) {
    console.warn(`Local file write fallback failed:`, err);
  }
}

/**
 * Read JSON metadata store (papers.json, attempts.json, active_draft.json).
 * Checks Vercel Blob first; if empty or not enabled, checks PROD if in PROD mode, then falls back to local files.
 */
export async function readJsonStore<T>(
  filename: string,
  defaultValue: T,
): Promise<T> {
  // 1. Direct Vercel Blob read if credentials exist
  if (isBlobEnabled()) {
    try {
      const listOptions: any = { prefix: filename };
      const token = getBlobToken();
      if (token) listOptions.token = token;

      const { blobs } = await list(listOptions);
      const target = blobs.find(
        (b) => b.pathname === filename || b.pathname.endsWith(`/${filename}`),
      );
      if (target) {
        const res = await fetch(target.url, { cache: "no-store" });
        if (res.ok) {
          return await res.json();
        }
      }
    } catch (err) {
      console.warn(`Failed reading ${filename} from Blob:`, err);
    }
  }

  // 2. If running locally in PROD mode (without direct Blob credentials), fetch from live PROD API
  if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
    try {
      const prodUrl = getProdApiUrl();
      if (filename === "attempts.json") {
        const res = await fetch(`${prodUrl}/api/attempts`, {
          redirect: "follow",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ok && Array.isArray(json.attempts)) {
            writeLocalDiskFile(filename, json.attempts);
            return json.attempts as unknown as T;
          }
        }
      } else if (filename === "active_draft.json") {
        const res = await fetch(`${prodUrl}/api/draft`, {
          redirect: "follow",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ok) {
            return json.draft as unknown as T;
          }
        }
      }
    } catch (err) {
      console.warn(
        `Remote fetch for ${filename} from PROD (${getProdApiUrl()}) failed, using local:`,
        err,
      );
    }
  }

  // 3. Local filesystem fallback / cache
  const localPath = path.join(process.cwd(), "public", "data", filename);
  if (fs.existsSync(localPath)) {
    try {
      const raw = fs.readFileSync(localPath, "utf-8");
      return JSON.parse(raw);
    } catch {}
  }

  return defaultValue;
}

/**
 * Write JSON metadata store to Vercel Blob (or local filesystem fallback).
 */
export async function writeJsonStore<T>(
  filename: string,
  data: T,
): Promise<void> {
  if (isBlobEnabled()) {
    try {
      const putOptions: any = {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/json",
      };
      const token = getBlobToken();
      if (token) putOptions.token = token;

      await put(filename, JSON.stringify(data, null, 2), putOptions);
      return;
    } catch (err) {
      console.warn(`Failed writing ${filename} to Blob:`, err);
    }
  }

  // Local filesystem fallback (only when running locally outside Vercel)
  if (!process.env.VERCEL) {
    writeLocalDiskFile(filename, data);
  }
}

/**
 * Delete JSON store from Vercel Blob (or local filesystem).
 */
export async function deleteJsonStore(filename: string): Promise<void> {
  if (isBlobEnabled()) {
    try {
      const delOptions: any = {};
      const token = getBlobToken();
      if (token) delOptions.token = token;
      await del(filename, delOptions);
    } catch {}
    return;
  }

  const localPath = path.join(process.cwd(), "public", "data", filename);
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch {}
  }
}

import fs from 'node:fs';
import path from 'node:path';
import { put, del, list } from '@vercel/blob';

/**
 * Automatically locate Vercel Blob token.
 * Handles default `BLOB_READ_WRITE_TOKEN` as well as custom named stores like `<NAME>_READ_WRITE_TOKEN`.
 */
export function getBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return process.env.BLOB_READ_WRITE_TOKEN;
  }
  if (process.env.PAPERS_DATA_READ_WRITE_TOKEN) {
    return process.env.PAPERS_DATA_READ_WRITE_TOKEN;
  }
  const envKey = Object.keys(process.env).find(k => k.endsWith('_READ_WRITE_TOKEN'));
  if (envKey && process.env[envKey]) {
    return process.env[envKey];
  }
  return undefined;
}

export function isBlobEnabled(): boolean {
  return !!getBlobToken();
}

/**
 * Upload a file (PDF, TXT, Image).
 * If Vercel Blob is configured, uploads directly to Vercel Blob CDN.
 * On local machine, falls back to local public/data/ directory.
 */
export async function uploadFile(
  pathname: string,
  body: Buffer | Blob | string,
  contentType?: string
): Promise<string> {
  const cleanPath = pathname.replace(/^\/+/, '');
  const token = getBlobToken();

  if (token) {
    const blob = await put(cleanPath, body, {
      access: 'public',
      addRandomSuffix: false,
      contentType,
      token,
    });
    return blob.url;
  }

  // If running on Vercel but Blob store was not connected to project:
  if (process.env.VERCEL) {
    throw new Error(
      'Vercel Blob store is not connected to this project yet. Please go to Vercel Dashboard -> Storage -> select your Blob store -> click "Connect Project", then redeploy.'
    );
  }

  // Local filesystem fallback (Mac local development)
  const localDir = path.join(process.cwd(), 'public', 'data');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }

  const filePath = path.join(localDir, path.basename(cleanPath));
  if (Buffer.isBuffer(body)) {
    fs.writeFileSync(filePath, body);
  } else if (typeof body === 'string') {
    fs.writeFileSync(filePath, body, 'utf-8');
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
  const token = getBlobToken();

  if (token) {
    try {
      await del(fileUrlOrName, { token });
    } catch (err) {
      console.warn('Blob delete warning:', err);
    }
    return;
  }

  const filename = path.basename(fileUrlOrName);
  const localPath = path.join(process.cwd(), 'public', 'data', filename);
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch {}
  }
}

/**
 * Read JSON metadata store (papers.json, attempts.json, active_draft.json).
 * Checks Vercel Blob first; if empty or not enabled, falls back to local files.
 */
export async function readJsonStore<T>(filename: string, defaultValue: T): Promise<T> {
  const token = getBlobToken();

  if (token) {
    try {
      const { blobs } = await list({ prefix: filename, token });
      const target = blobs.find(b => b.pathname === filename || b.pathname.endsWith(`/${filename}`));
      if (target) {
        const res = await fetch(target.url, { cache: 'no-store' });
        if (res.ok) {
          return await res.json();
        }
      }
    } catch (err) {
      console.warn(`Failed reading ${filename} from Blob:`, err);
    }
  }

  // Local fallback / Git bundled files
  const localPath = path.join(process.cwd(), 'public', 'data', filename);
  if (fs.existsSync(localPath)) {
    try {
      const raw = fs.readFileSync(localPath, 'utf-8');
      return JSON.parse(raw);
    } catch {}
  }

  return defaultValue;
}

/**
 * Write JSON metadata store to Vercel Blob (or local filesystem fallback).
 */
export async function writeJsonStore<T>(filename: string, data: T): Promise<void> {
  const token = getBlobToken();

  if (token) {
    try {
      await put(filename, JSON.stringify(data, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
        token,
      });
      return;
    } catch (err) {
      console.warn(`Failed writing ${filename} to Blob:`, err);
    }
  }

  // Local filesystem fallback (only when running locally outside Vercel)
  if (!process.env.VERCEL) {
    try {
      const localDir = path.join(process.cwd(), 'public', 'data');
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      fs.writeFileSync(path.join(localDir, filename), JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`Local file write fallback failed:`, err);
    }
  }
}

/**
 * Delete JSON store from Vercel Blob (or local filesystem).
 */
export async function deleteJsonStore(filename: string): Promise<void> {
  const token = getBlobToken();

  if (token) {
    try {
      await del(filename, { token });
    } catch {}
    return;
  }

  const localPath = path.join(process.cwd(), 'public', 'data', filename);
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch {}
  }
}

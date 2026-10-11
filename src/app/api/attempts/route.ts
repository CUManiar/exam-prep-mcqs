import { NextRequest, NextResponse } from 'next/server';
import { Attempt } from '../../../lib/types';
import {
  readJsonStore,
  writeJsonStore,
  getAppEnvironment,
  isProdEnv,
  getProdApiUrl,
  getBlobToken,
  isBlobEnabled,
} from '@/lib/cloudStorage';

export async function GET() {
  try {
    const currentEnv = getAppEnvironment();

    // In PROD mode when running locally without direct blob token, fetch directly from PROD
    if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
      const prodUrl = getProdApiUrl();
      try {
        const res = await fetch(`${prodUrl}/api/attempts`, {
          redirect: 'follow',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.attempts)) {
            // Mirror to local cache for offline availability
            await writeJsonStore('attempts.json', data.attempts);
            return NextResponse.json({
              ok: true,
              attempts: data.attempts,
              environment: currentEnv,
              source: 'PROD_REMOTE',
            });
          }
        }
      } catch (fetchErr) {
        console.warn(`[Attempts API] Remote fetch from PROD (${prodUrl}) failed, using local store:`, fetchErr);
      }
    }

    const list = await readJsonStore<Attempt[]>('attempts.json', []);
    return NextResponse.json({
      ok: true,
      attempts: list,
      environment: currentEnv,
      source: isBlobEnabled() ? 'BLOB_STORE' : 'LOCAL_STORE',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const attempt: Attempt = await req.json();
    if (!attempt || !attempt.id) {
      return NextResponse.json({ ok: false, error: 'Invalid attempt payload' }, { status: 400 });
    }

    // Practice mode is not counted in History
    if (attempt.mode === 'practice') {
      return NextResponse.json({ ok: true, saved: false, reason: 'Practice mode excluded from history' });
    }

    // If running locally in PROD mode, forward POST to live PROD server
    if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
      const prodUrl = getProdApiUrl();
      try {
        await fetch(`${prodUrl}/api/attempts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attempt),
          redirect: 'follow',
        });
      } catch (forwardErr) {
        console.warn(`[Attempts API] Failed to forward attempt to PROD (${prodUrl}):`, forwardErr);
      }
    }

    const list = await readJsonStore<Attempt[]>('attempts.json', []);
    const idx = list.findIndex(a => a.id === attempt.id);
    if (idx >= 0) {
      list[idx] = attempt;
    } else {
      list.unshift(attempt);
    }

    await writeJsonStore('attempts.json', list);
    return NextResponse.json({ ok: true, attempt, environment: getAppEnvironment() });
  } catch (err: any) {
    console.error('Save attempt error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}


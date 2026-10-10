import { NextRequest, NextResponse } from 'next/server';
import { Attempt } from '../../../lib/types';
import { readJsonStore, writeJsonStore } from '@/lib/cloudStorage';

export async function GET() {
  try {
    const list = await readJsonStore<Attempt[]>('attempts.json', []);
    return NextResponse.json({ ok: true, attempts: list });
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

    const list = await readJsonStore<Attempt[]>('attempts.json', []);
    const idx = list.findIndex(a => a.id === attempt.id);
    if (idx >= 0) {
      list[idx] = attempt;
    } else {
      list.unshift(attempt);
    }

    await writeJsonStore('attempts.json', list);
    return NextResponse.json({ ok: true, attempt });
  } catch (err: any) {
    console.error('Save attempt error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

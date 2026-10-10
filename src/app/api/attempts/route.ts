import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { Attempt } from '../../../lib/types';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const ATTEMPTS_FILE = path.join(DATA_DIR, 'attempts.json');

function readAttempts(): Attempt[] {
  if (!fs.existsSync(ATTEMPTS_FILE)) return [];
  try {
    const raw = fs.readFileSync(ATTEMPTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed reading attempts:', err);
    return [];
  }
}

function writeAttempts(list: Attempt[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

export async function GET() {
  try {
    const list = readAttempts();
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

    const list = readAttempts();
    const idx = list.findIndex(a => a.id === attempt.id);
    if (idx >= 0) {
      list[idx] = attempt;
    } else {
      list.unshift(attempt);
    }

    writeAttempts(list);
    return NextResponse.json({ ok: true, attempt });
  } catch (err: any) {
    console.error('Save attempt error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

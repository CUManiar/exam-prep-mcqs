import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { Attempt } from '../../../../lib/types';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const ATTEMPTS_FILE = path.join(DATA_DIR, 'attempts.json');

function readAttempts(): Attempt[] {
  if (!fs.existsSync(ATTEMPTS_FILE)) return [];
  try {
    const raw = fs.readFileSync(ATTEMPTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function writeAttempts(list: Attempt[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const list = readAttempts().filter(a => a.id !== id);
    writeAttempts(list);
    return NextResponse.json({ ok: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await req.json();
    const list = readAttempts();
    const idx = list.findIndex(a => a.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      writeAttempts(list);
      return NextResponse.json({ ok: true, attempt: list[idx] });
    }
    return NextResponse.json({ ok: false, error: 'Attempt not found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

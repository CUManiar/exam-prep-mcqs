import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const DRAFT_FILE = path.join(DATA_DIR, 'active_draft.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// GET active draft for cross-device synchronization (desktop <-> mobile)
export async function GET() {
  try {
    ensureDataDir();
    if (!fs.existsSync(DRAFT_FILE)) {
      return NextResponse.json({ ok: true, draft: null });
    }
    const content = fs.readFileSync(DRAFT_FILE, 'utf-8');
    if (!content.trim()) {
      return NextResponse.json({ ok: true, draft: null });
    }
    const draft = JSON.parse(content);
    return NextResponse.json({ ok: true, draft });
  } catch (err: any) {
    console.error('Error fetching draft:', err);
    return NextResponse.json({ ok: true, draft: null });
  }
}

// POST update active draft
export async function POST(req: NextRequest) {
  try {
    ensureDataDir();
    const body = await req.json();
    if (!body || !body.paperId) {
      return NextResponse.json({ ok: false, error: 'Invalid draft payload' }, { status: 400 });
    }
    fs.writeFileSync(DRAFT_FILE, JSON.stringify(body, null, 2), 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error saving draft:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// DELETE discard active draft
export async function DELETE() {
  try {
    ensureDataDir();
    if (fs.existsSync(DRAFT_FILE)) {
      fs.unlinkSync(DRAFT_FILE);
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error deleting draft:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

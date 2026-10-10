import { NextRequest, NextResponse } from 'next/server';
import { readJsonStore, writeJsonStore, deleteJsonStore } from '@/lib/cloudStorage';

// GET active draft for cross-device synchronization (desktop <-> mobile)
export async function GET() {
  try {
    const draft = await readJsonStore('active_draft.json', null);
    return NextResponse.json({ ok: true, draft });
  } catch (err: any) {
    console.error('Error fetching draft:', err);
    return NextResponse.json({ ok: true, draft: null });
  }
}

// POST update active draft
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.paperId) {
      return NextResponse.json({ ok: false, error: 'Invalid draft payload' }, { status: 400 });
    }
    await writeJsonStore('active_draft.json', body);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error saving draft:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// DELETE discard active draft
export async function DELETE() {
  try {
    await deleteJsonStore('active_draft.json');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error deleting draft:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

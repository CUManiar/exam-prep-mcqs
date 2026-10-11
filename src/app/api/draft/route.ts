import { NextRequest, NextResponse } from 'next/server';
import {
  readJsonStore,
  writeJsonStore,
  deleteJsonStore,
  isProdEnv,
  getProdApiUrl,
  getBlobToken,
} from '@/lib/cloudStorage';

// GET active draft for cross-device synchronization (desktop <-> mobile)
export async function GET() {
  try {
    if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
      try {
        const res = await fetch(`${getProdApiUrl()}/api/draft`, {
          redirect: 'follow',
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ok) return NextResponse.json(data);
        }
      } catch (err) {
        console.warn('Failed remote draft fetch from PROD:', err);
      }
    }

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

    if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
      try {
        await fetch(`${getProdApiUrl()}/api/draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          redirect: 'follow',
        });
      } catch (err) {
        console.warn('Failed forwarding draft POST to PROD:', err);
      }
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
    if (isProdEnv() && !process.env.VERCEL && !getBlobToken()) {
      try {
        await fetch(`${getProdApiUrl()}/api/draft`, {
          method: 'DELETE',
          redirect: 'follow',
        });
      } catch (err) {
        console.warn('Failed forwarding draft DELETE to PROD:', err);
      }
    }

    await deleteJsonStore('active_draft.json');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error deleting draft:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}


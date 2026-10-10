import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = id.toLowerCase();

    // 1. Remove from papers.json
    const metadataPath = path.join(DATA_DIR, 'papers.json');
    if (fs.existsSync(metadataPath)) {
      try {
        const customMeta = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        if (customMeta[cleanId]) {
          delete customMeta[cleanId];
          fs.writeFileSync(metadataPath, JSON.stringify(customMeta, null, 2), 'utf8');
        }
      } catch (e) {
        console.error('Error reading papers.json:', e);
      }
    }

    // 2. Delete associated files on disk
    if (fs.existsSync(DATA_DIR)) {
      const files = fs.readdirSync(DATA_DIR);
      for (const f of files) {
        if (
          f.toLowerCase().startsWith(`qp_${cleanId}.`) ||
          f.toLowerCase().startsWith(`ak_${cleanId}.`) ||
          f.toLowerCase().startsWith(`exs_${cleanId}.`)
        ) {
          try {
            fs.unlinkSync(path.join(DATA_DIR, f));
          } catch (err) {
            console.error('Failed to unlink file:', f, err);
          }
        }
      }
    }

    return NextResponse.json({ ok: true, deletedId: cleanId });
  } catch (err: any) {
    console.error('Delete paper error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = id.toLowerCase();
    const body = await req.json();

    const metadataPath = path.join(DATA_DIR, 'papers.json');
    let customMeta: Record<string, any> = {};
    if (fs.existsSync(metadataPath)) {
      try {
        customMeta = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch (e) {
        customMeta = {};
      }
    }

    const current = customMeta[cleanId] || { id: cleanId };
    const updated = {
      ...current,
      ...body,
      id: cleanId,
      updatedAt: new Date().toISOString(),
    };

    customMeta[cleanId] = updated;
    fs.writeFileSync(metadataPath, JSON.stringify(customMeta, null, 2), 'utf8');

    return NextResponse.json({ ok: true, paper: updated });
  } catch (err: any) {
    console.error('Patch paper error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

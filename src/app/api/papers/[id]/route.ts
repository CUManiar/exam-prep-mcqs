import { NextRequest, NextResponse } from 'next/server';
import { readJsonStore, writeJsonStore, deleteFile } from '@/lib/cloudStorage';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = id.toLowerCase();

    // 1. Remove from papers.json
    const customMeta = await readJsonStore<Record<string, any>>('papers.json', {});
    const targetPaper = customMeta[cleanId];
    if (targetPaper) {
      // Clean up uploaded files if present
      if (targetPaper.qpUrl) await deleteFile(targetPaper.qpUrl);
      if (targetPaper.akUrl) await deleteFile(targetPaper.akUrl);
      if (targetPaper.exsUrl) await deleteFile(targetPaper.exsUrl);

      delete customMeta[cleanId];
      await writeJsonStore('papers.json', customMeta);
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

    const customMeta = await readJsonStore<Record<string, any>>('papers.json', {});
    const current = customMeta[cleanId] || { id: cleanId };
    const updated = {
      ...current,
      ...body,
      id: cleanId,
      updatedAt: new Date().toISOString(),
    };

    customMeta[cleanId] = updated;
    await writeJsonStore('papers.json', customMeta);

    return NextResponse.json({ ok: true, paper: updated });
  } catch (err: any) {
    console.error('Patch paper error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

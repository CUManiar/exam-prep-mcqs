import { NextRequest, NextResponse } from 'next/server';
import { Attempt } from '../../../../lib/types';
import { readJsonStore, writeJsonStore } from '@/lib/cloudStorage';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentList = await readJsonStore<Attempt[]>('attempts.json', []);
    const updated = currentList.filter(a => a.id !== id);
    await writeJsonStore('attempts.json', updated);
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
    const list = await readJsonStore<Attempt[]>('attempts.json', []);
    const idx = list.findIndex(a => a.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      await writeJsonStore('attempts.json', list);
      return NextResponse.json({ ok: true, attempt: list[idx] });
    }
    return NextResponse.json({ ok: false, error: 'Attempt not found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

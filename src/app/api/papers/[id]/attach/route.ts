import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, readJsonStore, writeJsonStore } from '@/lib/cloudStorage';
import { INITIAL_PAPERS } from '@/lib/defaults';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = id.toLowerCase();
    const formData = await req.formData();

    const answerKeyText = (formData.get('answerKeyText') as string) || '';
    const akFile = formData.get('akFile') as File | null;
    const exsFile = formData.get('exsFile') as File | null;

    const customMeta = await readJsonStore<Record<string, any>>('papers.json', {});
    // Find paper in customMeta or built-in INITIAL_PAPERS
    let currentPaper = customMeta[cleanId] || INITIAL_PAPERS.find(p => p.id.toLowerCase() === cleanId);
    if (!currentPaper) {
      return NextResponse.json({ ok: false, error: 'Question paper not found' }, { status: 404 });
    }

    const year = currentPaper.year || '2026';
    const cat = currentPaper.category || 'prelims';
    const cleanName = cleanId.replace(/^[0-9]+_/, '') || cleanId;

    // 1. Process Answer Key if provided
    let akContent = answerKeyText;
    if (akFile && akFile.size > 0) {
      akContent = await akFile.text();
    }

    let akUrl = currentPaper.akUrl;
    let parsedKey: Record<number, string> = { ...(currentPaper.answerKey || {}) };

    if (akContent && akContent.trim().length > 0) {
      const akFileName = `answer_keys/${year}/${cat}/${cleanName}.txt`;
      akUrl = await uploadFile(akFileName, akContent, 'text/plain;charset=utf-8');
      
      // Parse answers into key numbers
      const lines = akContent.split('\n');
      for (const line of lines) {
        const m = line.trim().match(/^(\d+)[\.\)\s\-\:\t]+\s*([A-Da-d])/);
        if (m) {
          parsedKey[parseInt(m[1], 10)] = m[2].toUpperCase();
        }
      }
    }

    // 2. Process Solution PDF if provided
    let exsUrl = currentPaper.exsUrl;
    if (exsFile && exsFile.size > 0) {
      const exsFileName = `solutions/${year}/${cat}/${cleanName}.pdf`;
      const exsBuffer = Buffer.from(await exsFile.arrayBuffer());
      exsUrl = await uploadFile(exsFileName, exsBuffer, 'application/pdf');
    }

    const updated = {
      ...currentPaper,
      id: cleanId,
      akUrl,
      exsUrl,
      answerKeyText: akContent || currentPaper.answerKeyText,
      answerKey: Object.keys(parsedKey).length > 0 ? parsedKey : currentPaper.answerKey,
      updatedAt: new Date().toISOString(),
    };

    customMeta[cleanId] = updated;
    await writeJsonStore('papers.json', customMeta);

    return NextResponse.json({ ok: true, paper: updated });
  } catch (err: any) {
    console.error('Attach to paper error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

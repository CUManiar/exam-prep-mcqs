import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, readJsonStore, writeJsonStore } from '@/lib/cloudStorage';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const year = (formData.get('year') as string) || '';
    const identifier = (formData.get('identifier') as string) || '';
    const examType = (formData.get('examType') as string) || 'objective';
    const subject = (formData.get('subject') as string) || 'GS I';
    const label = (formData.get('label') as string) || '';
    const totalQuestions = parseInt(formData.get('totalQuestions') as string) || (examType === 'objective' ? 100 : 20);
    const totalMarks = parseFloat(formData.get('totalMarks') as string) || (examType === 'objective' ? 200 : 250);
    const correctMarks = parseFloat(formData.get('correctMarks') as string) || (examType === 'objective' ? 2.0 : 0);
    const incorrectMarks = parseFloat(formData.get('incorrectMarks') as string) || (examType === 'objective' ? 0.667 : 0);
    const timeMinutes = parseInt(formData.get('timeMinutes') as string) || (examType === 'objective' ? 120 : 180);
    const answerKeyTextInput = (formData.get('answerKeyText') as string) || '';

    const cleanYear = year.replace(/[^0-9]/g, '');
    const cleanName = identifier.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    if (!cleanYear || !cleanName) {
      return NextResponse.json({ ok: false, error: 'Invalid year or identifier name' }, { status: 400 });
    }

    const catFolder = examType === 'objective' ? 'prelims' : 'mains';
    const qpFileName = `papers/${cleanYear}/${catFolder}/${cleanName}.pdf`;
    const akFileName = `answer_keys/${cleanYear}/${catFolder}/${cleanName}.txt`;
    const exsFileName = `solutions/${cleanYear}/${catFolder}/${cleanName}.pdf`;

    // 1. Process Question Paper (.pdf) -> prefix: qp
    let qpUrl = '';
    const qpFile = formData.get('qpFile') as File | null;
    if (qpFile) {
      const qpBuffer = Buffer.from(await qpFile.arrayBuffer());
      qpUrl = await uploadFile(qpFileName, qpBuffer, 'application/pdf');
    } else {
      return NextResponse.json({ ok: false, error: 'Question Paper PDF is required' }, { status: 400 });
    }

    // 2. Process Answer Key (.txt) -> prefix: ak
    let answerKeyContent = answerKeyTextInput;
    const akFile = formData.get('akFile') as File | null;
    if (akFile && akFile.size > 0) {
      answerKeyContent = await akFile.text();
    }
    let akUrl: string | undefined = undefined;
    if (answerKeyContent) {
      akUrl = await uploadFile(akFileName, answerKeyContent, 'text/plain;charset=utf-8');
    }

    // 3. Process Solution (.pdf) -> prefix: exs
    let exsUrl: string | undefined = undefined;
    const exsFile = formData.get('exsFile') as File | null;
    if (exsFile && exsFile.size > 0) {
      const exsBuffer = Buffer.from(await exsFile.arrayBuffer());
      exsUrl = await uploadFile(exsFileName, exsBuffer, 'application/pdf');
    }

    // Parse Answer Key into structured object
    const parsedKey: Record<number, string> = {};
    if (answerKeyContent) {
      const lines = answerKeyContent.split('\n');
      for (const line of lines) {
        const m = line.trim().match(/^(\d+)[\.\)\s\-\:]+([A-Da-d])/);
        if (m) {
          parsedKey[parseInt(m[1])] = m[2].toUpperCase();
        }
      }
    }

    // 4. Persist to papers metadata store (Vercel Blob / Local)
    const papersMeta = await readJsonStore<Record<string, any>>('papers.json', {});

    const paperId = `${cleanYear}_${cleanName}`;
    const paperObj = {
      id: paperId,
      year: cleanYear,
      category: examType === 'objective' ? 'prelims' : 'mains',
      examType,
      subject,
      label: label || `${cleanYear} – ${subject}`,
      totalQuestions,
      totalMarks,
      correctMarks,
      incorrectMarks,
      timeMinutes,
      qpUrl,
      akUrl,
      exsUrl,
      answerKeyText: answerKeyContent,
      answerKey: parsedKey,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    papersMeta[paperId] = paperObj;
    await writeJsonStore('papers.json', papersMeta);

    return NextResponse.json({ ok: true, paper: paperObj });
  } catch (err: any) {
    console.error('Upload API error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

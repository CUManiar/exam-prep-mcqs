import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

export async function POST(req: NextRequest) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

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

    // Exact requested naming convention: {prefix}_{year}_{file_name}.{extension} in lowercase
    const qpFileName = `qp_${cleanYear}_${cleanName}.pdf`;
    const akFileName = `ak_${cleanYear}_${cleanName}.txt`;
    const exsFileName = `exs_${cleanYear}_${cleanName}.pdf`;

    // 1. Process Question Paper (.pdf) -> prefix: qp
    const qpFile = formData.get('qpFile') as File | null;
    if (qpFile) {
      const qpBuffer = Buffer.from(await qpFile.arrayBuffer());
      fs.writeFileSync(path.join(DATA_DIR, qpFileName), qpBuffer);
    } else {
      return NextResponse.json({ ok: false, error: 'Question Paper PDF is required' }, { status: 400 });
    }

    // 2. Process Answer Key (.txt) -> prefix: ak
    let answerKeyContent = answerKeyTextInput;
    const akFile = formData.get('akFile') as File | null;
    if (akFile && akFile.size > 0) {
      answerKeyContent = await akFile.text();
    }
    if (answerKeyContent) {
      fs.writeFileSync(path.join(DATA_DIR, akFileName), answerKeyContent, 'utf-8');
    }

    // 3. Process Solution (.pdf) -> prefix: exs
    let hasExs = false;
    const exsFile = formData.get('exsFile') as File | null;
    if (exsFile && exsFile.size > 0) {
      const exsBuffer = Buffer.from(await exsFile.arrayBuffer());
      fs.writeFileSync(path.join(DATA_DIR, exsFileName), exsBuffer);
      hasExs = true;
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

    // 4. Persist to server papers metadata store
    const metadataPath = path.join(DATA_DIR, 'papers.json');
    let papersMeta: Record<string, any> = {};
    if (fs.existsSync(metadataPath)) {
      try {
        papersMeta = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      } catch (e) {
        papersMeta = {};
      }
    }

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
      qpUrl: `/data/${qpFileName}`,
      akUrl: answerKeyContent ? `/data/${akFileName}` : undefined,
      exsUrl: hasExs ? `/data/${exsFileName}` : undefined,
      answerKeyText: answerKeyContent,
      answerKey: parsedKey,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    papersMeta[paperId] = paperObj;
    fs.writeFileSync(metadataPath, JSON.stringify(papersMeta, null, 2), 'utf-8');

    return NextResponse.json({ ok: true, paper: paperObj });
  } catch (err: any) {
    console.error('Upload API error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

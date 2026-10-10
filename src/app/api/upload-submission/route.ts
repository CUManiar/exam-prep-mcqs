import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const SUBMISSIONS_DIR = path.join(process.cwd(), 'public', 'data', 'submissions');

export async function POST(req: NextRequest) {
  try {
    if (!fs.existsSync(SUBMISSIONS_DIR)) {
      fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
    }

    const originalName = file.name || 'answer_scan.pdf';
    const cleanName = originalName.toLowerCase().replace(/[^a-z0-9_.]/g, '_');
    const timestamp = Date.now();
    const fileName = `sub_${timestamp}_${cleanName}`;
    const filePath = path.join(SUBMISSIONS_DIR, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const url = `/data/submissions/${fileName}`;

    return NextResponse.json({
      ok: true,
      url,
      fileName: originalName,
      fileSize: file.size,
    });
  } catch (err: any) {
    console.error('Error uploading submission copy:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Upload failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { QuestionPaper, ExamCategory, ExamType } from '../../../lib/types';
import { INITIAL_PAPERS } from '../../../lib/defaults';
import { readJsonStore, isBlobEnabled } from '@/lib/cloudStorage';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');

function parseAnswerKeyFile(filePath: string): Record<number, string> {
  const answers: Record<number, string> = {};
  try {
    if (!fs.existsSync(filePath)) return answers;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const m = line.trim().match(/^(\d+)[\.\)\s\-\:]+([A-Da-d])/);
      if (m) answers[parseInt(m[1])] = m[2].toUpperCase();
    }
  } catch (err) {
    console.error('Failed to parse answer key:', err);
  }
  return answers;
}

export async function GET(req: NextRequest) {
  try {
    // 1. Read stored custom metadata from Cloud Storage (Vercel Blob) or local fallback
    const customMeta = await readJsonStore<Record<string, QuestionPaper>>('papers.json', {});

    const allPapers: QuestionPaper[] = [];

    // 2. Add papers from customMeta (which contains all user uploads)
    for (const [id, paper] of Object.entries(customMeta)) {
      if (paper && paper.id) {
        allPapers.push(paper);
      }
    }



    // 4. Add any INITIAL_PAPERS that aren't already included
    for (const initPaper of INITIAL_PAPERS) {
      if (!allPapers.some(p => p.id === initPaper.id)) {
        allPapers.push(initPaper);
      }
    }

    // Sort papers by year descending, then subject
    allPapers.sort((a, b) => b.year.localeCompare(a.year) || a.subject.localeCompare(b.subject));

    return NextResponse.json({ ok: true, papers: allPapers });
  } catch (err: any) {
    console.error('Papers API error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

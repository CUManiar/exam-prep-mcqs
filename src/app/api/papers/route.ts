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

    // 3. Scan local disk for any files in public/data that aren't in customMeta yet (e.g. initial dev files)
    if (!isBlobEnabled() && fs.existsSync(DATA_DIR)) {
      try {
        const files = fs.readdirSync(DATA_DIR);
        for (const f of files) {
          const qpMatch = f.match(/^qp_(.+)\.pdf$/);
          if (qpMatch) {
            const id = qpMatch[1].toLowerCase();
            if (!allPapers.some(p => p.id === id)) {
              const akFile = files.find(file => file.toLowerCase() === `ak_${id}.txt`);
              const exsFile = files.find(file => file.toLowerCase() === `exs_${id}.pdf`);
              const akPath = akFile ? path.join(DATA_DIR, akFile) : undefined;
              const akText = akPath && fs.existsSync(akPath) ? fs.readFileSync(akPath, 'utf8') : '';
              const akParsed = akPath ? parseAnswerKeyFile(akPath) : {};

              const parts = id.split('_');
              const year = parts[0] || '2026';
              const isCsat = id.includes('csat') || id.includes('gsii') || id.includes('gs2');
              const isMains = id.includes('mains');

              allPapers.push({
                id,
                year,
                category: isMains ? 'mains' : 'prelims',
                examType: isMains ? 'subjective' : 'objective',
                subject: isCsat ? 'GS II CSAT' : isMains ? 'Mains GS' : 'GS I',
                label: `${year} – ${isCsat ? 'GS II CSAT' : isMains ? 'Mains GS' : 'GS I'}`,
                totalQuestions: isMains ? 20 : isCsat ? 80 : 100,
                totalMarks: isMains ? 250 : 200,
                correctMarks: isMains ? 0 : isCsat ? 2.5 : 2.0,
                incorrectMarks: isMains ? 0 : isCsat ? 0.833 : 0.667,
                timeMinutes: isMains ? 180 : 120,
                qpUrl: `/data/${f}`,
                akUrl: akFile ? `/data/${akFile}` : undefined,
                exsUrl: exsFile ? `/data/${exsFile}` : undefined,
                answerKeyText: akText,
                answerKey: akParsed,
                isCustom: true,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Disk scan skipped:', err);
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

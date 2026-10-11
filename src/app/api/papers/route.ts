import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { QuestionPaper, ExamCategory, ExamType } from '../../../lib/types';
import { INITIAL_PAPERS } from '../../../lib/defaults';
import { readJsonStore, writeJsonStore, isBlobEnabled } from '@/lib/cloudStorage';

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

    // Clean out stale dummy paper 2026_gs1 if present in Cloud Storage
    if (customMeta['2026_gs1']) {
      delete customMeta['2026_gs1'];
      await writeJsonStore('papers.json', customMeta).catch(() => {});
    }

    const allPapers: QuestionPaper[] = [];

    // 2. Add papers from customMeta (which contains all user uploads)
    for (const [id, paper] of Object.entries(customMeta)) {
      if (paper && paper.id && paper.id !== '2026_gs1') {
        allPapers.push(paper);
      }
    }

    // 4. Add any INITIAL_PAPERS that aren't already included
    for (const initPaper of INITIAL_PAPERS) {
      if (!allPapers.some(p => p.id === initPaper.id)) {
        allPapers.push(initPaper);
      }
    }

    // Normalization & Strict Rule Enforcement:
    // UPSC Prelims (GS I & GS II CSAT) are strictly 120 minutes (2 Hours), 200 marks.
    // UPSC Mains papers are 180 minutes (3 Hours), 250 marks.
    allPapers.forEach(p => {
      const isPrelims = p.category === 'prelims' || 
                        p.examType === 'objective' || 
                        p.id.includes('_prelims_') ||
                        p.subject === 'GS I' || 
                        p.subject === 'GS II CSAT' || 
                        p.subject === 'CSAT';

      if (isPrelims) {
        p.category = 'prelims';
        p.examType = 'objective';
        p.timeMinutes = 120; // Strictly 2 hours (120 mins)
        p.totalMarks = 200;
        if (p.subject === 'GS II CSAT' || p.subject === 'CSAT' || p.id.includes('general_studies_paper_ii')) {
          p.totalQuestions = 80;
          p.correctMarks = 2.5;
          p.incorrectMarks = 0.833;
        } else {
          p.totalQuestions = 100;
          p.correctMarks = 2.0;
          p.incorrectMarks = 0.667;
        }
      } else {
        p.category = 'mains';
        p.examType = 'subjective';
        if (!p.timeMinutes || p.timeMinutes === 120) {
          p.timeMinutes = 180; // Mains papers standard 3 hours (180 mins)
        }
      }
    });

    // Sort papers by year descending, then prelims first, then subject
    allPapers.sort((a, b) => {
      if (b.year !== a.year) return b.year.localeCompare(a.year);
      if (a.category !== b.category) return a.category === 'prelims' ? -1 : 1;
      return a.subject.localeCompare(b.subject);
    });

    return NextResponse.json({ ok: true, papers: allPapers });
  } catch (err: any) {
    console.error('Papers API error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

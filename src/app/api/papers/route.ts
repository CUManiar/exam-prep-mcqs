import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { QuestionPaper, ExamCategory, ExamType } from '../../../lib/types';
import { INITIAL_PAPERS } from '../../../lib/defaults';

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
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Read stored custom metadata
    const metadataPath = path.join(DATA_DIR, 'papers.json');
    let customMeta: Record<string, QuestionPaper> = {};
    if (fs.existsSync(metadataPath)) {
      try {
        customMeta = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch (e) {
        customMeta = {};
      }
    }

    // Scan DATA_DIR on disk
    const files = fs.readdirSync(DATA_DIR);
    const discovered: Record<string, { qp?: string; ak?: string; exs?: string }> = {};

    for (const f of files) {
      const qpMatch = f.match(/^qp_(.+)\.pdf$/);
      const akMatch = f.match(/^ak_(.+)\.txt$/);
      const exsMatch = f.match(/^exs_(.+)\.pdf$/);

      if (qpMatch) {
        const id = qpMatch[1].toLowerCase();
        if (!discovered[id]) discovered[id] = {};
        discovered[id].qp = f;
      }
      if (akMatch) {
        const id = akMatch[1].toLowerCase();
        if (!discovered[id]) discovered[id] = {};
        discovered[id].ak = f;
      }
      if (exsMatch) {
        const id = exsMatch[1].toLowerCase();
        if (!discovered[id]) discovered[id] = {};
        discovered[id].exs = f;
      }
    }

    const allPapers: QuestionPaper[] = [];

    // First: Papers in customMeta or discovered on disk
    for (const [id, diskFiles] of Object.entries(discovered)) {
      if (!diskFiles.qp) continue;

      const existingMeta = customMeta[id];
      const parts = id.split('_');
      const year = parts[0] || '2026';
      const isCsat = id.includes('csat') || id.includes('gsii') || id.includes('gs2');
      const isMains = id.includes('mains');

      let category: ExamCategory = isMains ? 'mains' : 'prelims';
      let examType: ExamType = isMains ? 'subjective' : 'objective';
      let subject = isCsat ? 'GS II CSAT' : isMains ? 'Mains GS' : 'GS I';
      let label = existingMeta?.label || `${year} – ${subject}`;

      let totalQuestions = existingMeta?.totalQuestions || (isMains ? 20 : isCsat ? 80 : 100);
      let totalMarks = existingMeta?.totalMarks || (isMains ? 250 : 200);
      let correctMarks = existingMeta?.correctMarks ?? (isMains ? 0 : isCsat ? 2.5 : 2.0);
      let incorrectMarks = existingMeta?.incorrectMarks ?? (isMains ? 0 : isCsat ? 0.833 : 0.667);
      let timeMinutes = existingMeta?.timeMinutes || (isMains ? 180 : 120);

      const akFilePath = diskFiles.ak ? path.join(DATA_DIR, diskFiles.ak) : undefined;
      const answerKey = akFilePath ? parseAnswerKeyFile(akFilePath) : (existingMeta?.answerKey || {});
      const answerKeyText = akFilePath && fs.existsSync(akFilePath) ? fs.readFileSync(akFilePath, 'utf8') : existingMeta?.answerKeyText;

      const paper: QuestionPaper = {
        id,
        year: existingMeta?.year || year,
        category: existingMeta?.category || category,
        examType: existingMeta?.examType || examType,
        subject: existingMeta?.subject || subject,
        label,
        totalQuestions,
        totalMarks,
        correctMarks,
        incorrectMarks,
        timeMinutes,
        qpUrl: `/data/${diskFiles.qp}`,
        akUrl: diskFiles.ak ? `/data/${diskFiles.ak}` : undefined,
        exsUrl: diskFiles.exs ? `/data/${diskFiles.exs}` : undefined,
        answerKeyText,
        answerKey,
        isCustom: true,
      };

      allPapers.push(paper);
    }

    // Add any INITIAL_PAPERS that aren't on disk yet
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

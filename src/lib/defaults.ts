import { QuestionPaper } from './types';

export function parseAnswerKeyText(text: string): Record<number, string> {
  const result: Record<number, string> = {};
  if (!text) return result;
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Matches "1. d", "18\tc", "25 b", "1:A", "1 - D", etc.
    const match = trimmed.match(/^(\d+)[\.\)\s\-\:\t]+\s*([A-Da-d])/);
    if (match) {
      result[parseInt(match[1], 10)] = match[2].toUpperCase();
    }
  }
  return result;
}

export function formatTimeSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// 15+ years of UPSC examination papers support
export const SUPPORTED_YEARS = Array.from({ length: 16 }, (_, i) => String(2026 - i)); // 2026 down to 2011

// Built-in initial papers with exact exam-specific rules
export const INITIAL_PAPERS: QuestionPaper[] = [
  {
    id: '2026_prelims_gs_I',
    year: '2026',
    category: 'prelims',
    examType: 'objective',
    subject: 'GS I',
    label: '2026 – Prelims GS I',
    totalQuestions: 100,
    totalMarks: 200,
    correctMarks: 2.0,
    incorrectMarks: 0.667,
    timeMinutes: 120,
    qpUrl: '/data/qp_2026_prelims_gs_I.pdf',
    akUrl: '/data/ak_2026_prelims_gs_I.txt',
    answerKey: {},
  },
  {
    id: '2026_prelims_gsII_csat',
    year: '2026',
    category: 'prelims',
    examType: 'objective',
    subject: 'GS II CSAT',
    label: '2026 – Prelims GS II CSAT',
    totalQuestions: 80,
    totalMarks: 200,
    correctMarks: 2.5,
    incorrectMarks: 0.833,
    timeMinutes: 120,
    qpUrl: '/data/qp_2026_prelims_gsII_csat.pdf',
    akUrl: '/data/ak_2026_prelims_gsII_csat.txt',
    exsUrl: '/data/exs_2026_prelims_gsII_csat.pdf',
    answerKey: {},
  },
  {
    id: '2025_prelims_gs_I',
    year: '2025',
    category: 'prelims',
    examType: 'objective',
    subject: 'GS I',
    label: '2025 – Prelims GS I',
    totalQuestions: 100,
    totalMarks: 200,
    correctMarks: 2.0,
    incorrectMarks: 0.667,
    timeMinutes: 120,
    qpUrl: '/data/qp_2025_prelims_gs_I.pdf',
    akUrl: '/data/ak_2025_prelims_gs_I.txt',
    answerKey: {},
  },
  {
    id: '2025_prelims_gsII_csat',
    year: '2025',
    category: 'prelims',
    examType: 'objective',
    subject: 'GS II CSAT',
    label: '2025 – Prelims GS II CSAT',
    totalQuestions: 80,
    totalMarks: 200,
    correctMarks: 2.5,
    incorrectMarks: 0.833,
    timeMinutes: 120,
    qpUrl: '/data/qp_2025_prelims_gsII_csat.pdf',
    akUrl: '/data/ak_2025_prelims_gsII_csat.txt',
    exsUrl: '/data/exs_2025_prelims_gsII_csat.pdf',
    answerKey: {},
  },
];

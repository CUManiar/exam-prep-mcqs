import { ExamSettings, QuestionPaper } from './types';

export const DEFAULT_SETTINGS: ExamSettings = {
  defaultTotalQuestions: 80,
  defaultCorrectMarks: 2.5,
  defaultIncorrectMarks: 0.833,
  skippedMarks: 0,
  defaultTimeMinutes: 120,
  fastStartWithDefaults: false,
};

export function parseAnswerKeyText(text: string): Record<number, string> {
  const result: Record<number, string> = {};
  if (!text) return result;
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\d+)[\.\)\s\-\:]+\s*([A-Da-d])/);
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

// Built-in initial papers
export const INITIAL_PAPERS: QuestionPaper[] = [
  {
    id: '2026_prelims_gsII_csat',
    year: '2026',
    subject: 'GS II CSAT',
    label: '2026 – Prelims GS II CSAT',
    qpUrl: '/data/qp_2026_prelims_gsII_csat.pdf',
    akUrl: '/data/ak_2026_prelims_gsII_csat.txt',
    exsUrl: '/data/exs_2026_prelims_gsII_csat.pdf',
    answerKey: {},
  },
  {
    id: '2026_prelims_gs_I',
    year: '2026',
    subject: 'GS I',
    label: '2026 – Prelims GS I',
    qpUrl: '/data/qp_2026_prelims_gs_I.pdf',
    akUrl: '/data/ak_2026_prelims_gs_I.txt',
    answerKey: {},
  },
  {
    id: '2025_prelims_gsII_csat',
    year: '2025',
    subject: 'GS II CSAT',
    label: '2025 – Prelims GS II CSAT',
    qpUrl: '/data/qp_2025_prelims_gsII_csat.pdf',
    akUrl: '/data/ak_2025_prelims_gsII_csat.txt',
    exsUrl: '/data/exs_2025_prelims_gsII_csat.pdf',
    answerKey: {},
  },
  {
    id: '2025_prelims_gs_I',
    year: '2025',
    subject: 'GS I',
    label: '2025 – Prelims GS I',
    qpUrl: '/data/qp_2025_prelims_gs_I.pdf',
    akUrl: '/data/ak_2025_prelims_gs_I.txt',
    answerKey: {},
  },
];

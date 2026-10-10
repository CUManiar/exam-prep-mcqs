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

// Built-in initial papers with exact exam-specific rules and pre-parsed answer keys
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
    answerKey: {"1":"D","2":"A","3":"C","4":"B","5":"B","6":"A","7":"D","8":"A","9":"C","10":"C","11":"D","12":"A","13":"C","14":"B","15":"B","16":"B","17":"A","18":"D","19":"D","20":"B","21":"B","22":"B","23":"D","24":"D","25":"C","26":"C","27":"A","28":"D","29":"C","30":"B","31":"A","32":"B","33":"B","34":"B","35":"B","36":"B","37":"C","38":"B","39":"B","40":"C","41":"C","42":"B","43":"C","44":"B","45":"B","46":"C","47":"B","48":"B","49":"C","50":"B","51":"C","52":"A","53":"B","54":"D","55":"B","56":"B","57":"A","58":"C","59":"D","60":"A","61":"D","62":"D","63":"A","64":"D","65":"D","66":"A","67":"B","68":"A","69":"C","70":"A","71":"B","72":"C","73":"D","74":"B","75":"C","76":"C","77":"B","78":"B","79":"C","80":"C","81":"C","82":"C","83":"C","84":"A","85":"A","86":"C","87":"A","88":"C","89":"C","90":"D","91":"A","92":"C","93":"B","94":"B","95":"A","96":"C","97":"C","98":"D","99":"A","100":"A"},
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
    answerKey: {"1":"A","2":"D","3":"C","4":"D","5":"A","6":"A","7":"A","8":"B","9":"D","10":"D","11":"D","12":"B","13":"D","14":"A","15":"B","16":"A","17":"A","18":"D","19":"B","20":"C","21":"B","22":"B","23":"B","24":"A","25":"B","26":"B","27":"D","28":"B","29":"C","30":"B","31":"D","32":"A","33":"D","34":"C","35":"B","36":"A","37":"A","38":"B","39":"B","40":"C","41":"C","42":"C","43":"B","44":"D","45":"C","46":"C","47":"C","48":"D","49":"B","50":"D","51":"A","52":"C","53":"D","54":"C","55":"D","56":"D","57":"D","58":"B","59":"C","60":"D","61":"C","62":"B","63":"A","64":"C","65":"A","66":"B","67":"B","68":"A","69":"A","70":"A","71":"D","72":"B","73":"C","74":"C","75":"D","76":"C","77":"D","78":"A","79":"B","80":"D"},
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
    answerKey: {"1":"C","2":"D","3":"B","4":"B","5":"B","6":"C","7":"A","8":"A","9":"A","10":"A","11":"C","12":"A","13":"B","14":"A","15":"B","16":"C","17":"C","18":"D","19":"C","20":"C","21":"C","22":"D","23":"A","24":"D","25":"C","26":"C","27":"A","28":"B","29":"C","30":"C","31":"C","32":"D","33":"C","34":"B","35":"B","36":"B","37":"B","38":"B","39":"B","40":"B","41":"C","42":"B","43":"C","44":"C","45":"B","46":"C","47":"C","48":"D","49":"D","50":"B","51":"C","52":"C","53":"B","54":"A","55":"C","56":"B","57":"D","58":"D","59":"D","60":"A","61":"D","62":"A","63":"A","64":"B","65":"A","66":"A","67":"D","68":"C","69":"C","70":"D","71":"B","72":"C","73":"B","74":"A","75":"C","76":"D","77":"A","78":"A","79":"C","80":"D","81":"B","82":"B","83":"A","84":"B","85":"A","86":"A","87":"C","88":"D","89":"D","90":"A","91":"C","92":"D","93":"C","94":"D","95":"C","96":"B","97":"C","98":"A","99":"C","100":"B"},
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
    answerKey: {"1":"C","2":"D","3":"D","4":"A","5":"C","6":"A","7":"C","8":"B","9":"D","10":"A","11":"D","12":"A","13":"D","14":"A","15":"C","16":"C","17":"B","18":"C","19":"D","20":"C","21":"A","22":"D","23":"A","24":"D","25":"C","26":"D","27":"B","28":"D","29":"B","30":"C","31":"D","32":"A","33":"B","34":"B","35":"B","36":"B","37":"B","38":"B","39":"C","40":"B","41":"B","42":"A","43":"C","44":"B","45":"D","46":"C","47":"C","48":"D","49":"A","50":"C","51":"B","52":"C","53":"D","54":"D","55":"C","56":"A","57":"D","58":"B","59":"B","60":"C","61":"A","62":"C","63":"C","64":"C","65":"C","66":"B","67":"A","68":"D","69":"D","70":"D","71":"B","72":"D","73":"D","74":"B","75":"D","76":"C","77":"C","78":"A","79":"A","80":"C"},
  },
];

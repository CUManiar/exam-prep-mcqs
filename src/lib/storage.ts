import { Attempt, ExamSettings, QuestionPaper } from './types';
import { DEFAULT_SETTINGS, INITIAL_PAPERS, parseAnswerKeyText } from './defaults';

const STORAGE_KEYS = {
  SETTINGS: 'exam_prep_settings_v1',
  ATTEMPTS: 'exam_prep_attempts_v1',
  CUSTOM_PAPERS: 'exam_prep_custom_papers_v1',
};

export function getSettings(): ExamSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ExamSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

// History only counts Mock Mode attempts
export function getAttempts(): Attempt[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    if (!raw) return [];
    const list: Attempt[] = JSON.parse(raw);
    // Practice mode is not counted in History
    return list.filter(a => a.mode === 'mock');
  } catch {
    return [];
  }
}

export function saveAttempt(attempt: Attempt): void {
  if (typeof window === 'undefined') return;
  // Practice mode is not counted in History
  if (attempt.mode === 'practice') {
    return;
  }

  try {
    const list = getAttempts();
    const idx = list.findIndex(a => a.id === attempt.id);
    if (idx >= 0) {
      list[idx] = attempt;
    } else {
      list.unshift(attempt);
    }
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save attempt:', err);
  }
}

export function updateAttempt(attemptId: string, updater: (prev: Attempt) => Attempt): Attempt | null {
  if (typeof window === 'undefined') return null;
  try {
    const list = getAttempts();
    const idx = list.findIndex(a => a.id === attemptId);
    if (idx >= 0) {
      const updated = updater(list[idx]);
      list[idx] = updated;
      localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(list));
      return updated;
    }
    return null;
  } catch (err) {
    console.error('Failed to update attempt:', err);
    return null;
  }
}

export function deleteAttempt(attemptId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getAttempts().filter(a => a.id !== attemptId);
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to delete attempt:', err);
  }
}

export function getCustomPapers(): QuestionPaper[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_PAPERS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomPaper(paper: QuestionPaper): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getCustomPapers();
    const idx = list.findIndex(p => p.id === paper.id);
    if (idx >= 0) {
      list[idx] = paper;
    } else {
      list.unshift(paper);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PAPERS, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save custom paper:', err);
  }
}

export async function getAllPapers(): Promise<QuestionPaper[]> {
  const custom = getCustomPapers();
  const builtIn = await Promise.all(
    INITIAL_PAPERS.map(async p => {
      if (p.akUrl && Object.keys(p.answerKey).length === 0) {
        try {
          const res = await fetch(p.akUrl);
          if (res.ok) {
            const text = await res.text();
            p.answerKey = parseAnswerKeyText(text);
            p.answerKeyText = text;
          }
        } catch {
          // ignore offline
        }
      }
      return p;
    })
  );

  return [...custom, ...builtIn];
}

export function exportAllData(): string {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    attempts: getAttempts(),
    customPapers: getCustomPapers(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.settings) saveSettings(parsed.settings);
    if (Array.isArray(parsed.attempts)) {
      const mockOnly = parsed.attempts.filter((a: any) => a.mode === 'mock');
      localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(mockOnly));
    }
    if (Array.isArray(parsed.customPapers)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_PAPERS, JSON.stringify(parsed.customPapers));
    }
    return true;
  } catch (err) {
    console.error('Import failed:', err);
    return false;
  }
}

import { Attempt, QuestionPaper, ActiveSessionDraft } from './types';
import { INITIAL_PAPERS, parseAnswerKeyText } from './defaults';

const STORAGE_KEYS = {
  ATTEMPTS: 'exam_prep_attempts_v2',
  CUSTOM_PAPERS: 'exam_prep_custom_papers_v2',
};

// Synchronously get cached attempts from localStorage for instant UI rendering
export function getAttempts(): Attempt[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    if (!raw) return [];
    const list: Attempt[] = JSON.parse(raw);
    return list.filter(a => a.mode === 'mock');
  } catch {
    return [];
  }
}

// Fetch persisted attempts from server database/file and synchronize cache
export async function loadAttemptsFromServer(): Promise<Attempt[]> {
  try {
    const res = await fetch('/api/attempts');
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.attempts)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(data.attempts));
        }
        return data.attempts.filter((a: Attempt) => a.mode === 'mock');
      }
    }
  } catch (err) {
    console.warn('Using offline attempt cache:', err);
  }
  return getAttempts();
}

// Persist attempt: writes to server immediately ("Write is done, is done") + mirrors to localStorage
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

    // Server-side permanent write
    fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attempt),
    }).catch(err => console.error('Failed to write attempt to server:', err));
  } catch (err) {
    console.error('Failed to save attempt:', err);
  }
}

// Update attempt
export function updateAttempt(attemptId: string, updater: (prev: Attempt) => Attempt): Attempt | null {
  if (typeof window === 'undefined') return null;
  try {
    const list = getAttempts();
    const idx = list.findIndex(a => a.id === attemptId);
    if (idx >= 0) {
      const updated = updater(list[idx]);
      list[idx] = updated;
      localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(list));

      // Server-side update
      fetch(`/api/attempts/${attemptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(err => console.error('Failed to update attempt on server:', err));

      return updated;
    }
    return null;
  } catch (err) {
    console.error('Failed to update attempt:', err);
    return null;
  }
}

// Delete attempt
export function deleteAttempt(attemptId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getAttempts().filter(a => a.id !== attemptId);
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(list));

    // Server-side delete
    fetch(`/api/attempts/${attemptId}`, {
      method: 'DELETE',
    }).catch(err => console.error('Failed to delete attempt on server:', err));
  } catch (err) {
    console.error('Failed to delete attempt:', err);
  }
}

// Custom Papers cache
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

// Delete paper (Server + local)
export async function deletePaperFromServer(paperId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/papers/${paperId}`, { method: 'DELETE' });
    if (res.ok) {
      if (typeof window !== 'undefined') {
        const list = getCustomPapers().filter(p => p.id !== paperId);
        localStorage.setItem(STORAGE_KEYS.CUSTOM_PAPERS, JSON.stringify(list));
      }
      return true;
    }
  } catch (err) {
    console.error('Failed to delete paper on server:', err);
  }
  return false;
}

// Update paper rules (Server + local)
export async function updatePaperOnServer(paperId: string, updates: Partial<QuestionPaper>): Promise<boolean> {
  try {
    const res = await fetch(`/api/papers/${paperId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      if (typeof window !== 'undefined') {
        const list = getCustomPapers();
        const idx = list.findIndex(p => p.id === paperId);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...updates };
          localStorage.setItem(STORAGE_KEYS.CUSTOM_PAPERS, JSON.stringify(list));
        }
      }
      return true;
    }
  } catch (err) {
    console.error('Failed to update paper on server:', err);
  }
  return false;
}

// Fetch all papers from server filesystem + metadata store
export async function getAllPapers(): Promise<QuestionPaper[]> {
  try {
    const res = await fetch('/api/papers');
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.papers)) {
        if (typeof window !== 'undefined') {
          const customs = data.papers.filter((p: QuestionPaper) => p.isCustom);
          localStorage.setItem(STORAGE_KEYS.CUSTOM_PAPERS, JSON.stringify(customs));
        }
        return data.papers;
      }
    }
  } catch (err) {
    console.warn('Network issue fetching /api/papers, falling back to local cache:', err);
  }

  // Offline fallback
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
        } catch {}
      }
      return p;
    })
  );

  return [...custom, ...builtIn];
}

export function exportAllData(): string {
  const data = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    attempts: getAttempts(),
    customPapers: getCustomPapers(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed.attempts)) {
      const mockOnly = parsed.attempts.filter((a: any) => a.mode === 'mock');
      localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(mockOnly));
      // Save each to server
      for (const att of mockOnly) {
        saveAttempt(att);
      }
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

const DRAFT_KEY = 'exam_prep_active_draft_v2';

export function saveActiveDraft(draft: ActiveSessionDraft): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.error('Failed to save draft session:', err);
  }
}

export function getActiveDraft(): ActiveSessionDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearActiveDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

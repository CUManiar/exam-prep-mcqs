import { VocabCard } from "./vocabTypes";

const VOCAB_STORAGE_KEY = "exam_prep_vocab_cards_v1";

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getStoredVocabCards(): VocabCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VOCAB_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load vocab cards from storage:", e);
    return [];
  }
}

export function saveStoredVocabCards(cards: VocabCard[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(cards));
  } catch (e) {
    console.error("Failed to save vocab cards to storage:", e);
  }
}

export function addVocabCard(
  card: Omit<VocabCard, "id" | "dateAdded" | "createdAt" | "mastered">,
): VocabCard {
  const cards = getStoredVocabCards();
  const newCard: VocabCard = {
    ...card,
    id: `vocab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    dateAdded: getTodayString(),
    mastered: false,
    createdAt: new Date().toISOString(),
  };

  // Add at beginning so newest appears first
  const updated = [newCard, ...cards.filter((c) => c.word.toLowerCase() !== card.word.toLowerCase())];
  saveStoredVocabCards(updated);
  return newCard;
}

export function toggleVocabMastery(id: string): VocabCard[] {
  const cards = getStoredVocabCards();
  const updated = cards.map((c) => (c.id === id ? { ...c, mastered: !c.mastered } : c));
  saveStoredVocabCards(updated);
  return updated;
}

export function deleteVocabCard(id: string): VocabCard[] {
  const cards = getStoredVocabCards();
  const updated = cards.filter((c) => c.id !== id);
  saveStoredVocabCards(updated);
  return updated;
}

export function getTodayVocabCount(): number {
  const cards = getStoredVocabCards();
  const today = getTodayString();
  return cards.filter((c) => c.dateAdded === today).length;
}

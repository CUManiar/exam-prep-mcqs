import { VocabCard } from "./vocabTypes";
import { saveUserVocabCardsToSupabase, getUserProfile } from "./supabase";

const VOCAB_STORAGE_KEY = "exam_prep_vocab_cards_v1";

function getStorageKey(userId?: string): string {
  return userId ? `${VOCAB_STORAGE_KEY}_${userId}` : VOCAB_STORAGE_KEY;
}

export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Merge two vocab card arrays without duplicates (case-insensitive by word), keeping newest & mastered */
export function mergeVocabCards(local: VocabCard[], remote: VocabCard[]): VocabCard[] {
  const map = new Map<string, VocabCard>();

  // Add remote first
  for (const card of remote) {
    if (card && card.word) {
      map.set(card.word.trim().toLowerCase(), card);
    }
  }

  // Merge local
  for (const card of local) {
    if (!card || !card.word) continue;
    const key = card.word.trim().toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, card);
    } else {
      // Keep whichever has mastered = true, or whichever is newer
      map.set(key, {
        ...existing,
        ...card,
        mastered: existing.mastered || card.mastered,
        createdAt: existing.createdAt || card.createdAt,
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
}

export function getStoredVocabCards(userId?: string): VocabCard[] {
  if (typeof window === "undefined") return [];
  try {
    // 1. Try user-scoped key if logged in
    const userKey = userId ? getStorageKey(userId) : null;
    const rawUser = userKey ? localStorage.getItem(userKey) : null;
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;
    const userCards: VocabCard[] = Array.isArray(parsedUser) ? parsedUser : [];

    // 2. Also check global key (for guest or pre-login local words from localhost)
    const rawGlobal = localStorage.getItem(VOCAB_STORAGE_KEY);
    const parsedGlobal = rawGlobal ? JSON.parse(rawGlobal) : null;
    const globalCards: VocabCard[] = Array.isArray(parsedGlobal) ? parsedGlobal : [];

    if (userId && globalCards.length > 0) {
      // Merge global cards into user cards so local guest words carry over
      const merged = mergeVocabCards(userCards, globalCards);
      localStorage.setItem(getStorageKey(userId), JSON.stringify(merged));
      return merged;
    }

    return userCards.length > 0 ? userCards : globalCards;
  } catch (e) {
    console.error("Failed to load vocab cards from storage:", e);
    return [];
  }
}

export function saveStoredVocabCards(cards: VocabCard[], userId?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(cards));
    if (userId) {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(cards));
      saveUserVocabCardsToSupabase(userId, cards).catch((err) =>
        console.warn("Failed background vocab sync to Supabase:", err),
      );
    }
  } catch (e) {
    console.error("Failed to save vocab cards to storage:", e);
  }
}

export function addVocabCard(
  card: Omit<VocabCard, "id" | "dateAdded" | "createdAt" | "mastered">,
  userId?: string,
): VocabCard {
  const cards = getStoredVocabCards(userId);
  const newCard: VocabCard = {
    ...card,
    id: `vocab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    dateAdded: getTodayString(),
    mastered: false,
    createdAt: new Date().toISOString(),
  };

  // Add at beginning so newest appears first
  const updated = [newCard, ...cards.filter((c) => c.word.toLowerCase() !== card.word.toLowerCase())];
  saveStoredVocabCards(updated, userId);
  return newCard;
}

export function toggleVocabMastery(id: string, userId?: string): VocabCard[] {
  const cards = getStoredVocabCards(userId);
  const updated = cards.map((c) => (c.id === id ? { ...c, mastered: !c.mastered } : c));
  saveStoredVocabCards(updated, userId);
  return updated;
}

export function deleteVocabCard(id: string, userId?: string): VocabCard[] {
  const cards = getStoredVocabCards(userId);
  const updated = cards.filter((c) => c.id !== id);
  saveStoredVocabCards(updated, userId);
  return updated;
}

export function getTodayVocabCount(userId?: string): number {
  const cards = getStoredVocabCards(userId);
  const today = getTodayString();
  return cards.filter((c) => c.dateAdded === today).length;
}

/** Synchronize local cards with Supabase for the authenticated user */
export async function syncVocabCardsWithSupabase(userId: string): Promise<VocabCard[]> {
  try {
    const localCards = getStoredVocabCards(userId);
    const profile = await getUserProfile(userId);
    const remoteCards = Array.isArray(profile?.vocab_cards) ? profile.vocab_cards : [];

    const merged = mergeVocabCards(localCards, remoteCards);
    saveStoredVocabCards(merged, userId);

    // If local had new cards not yet in remote, push merged list to Supabase
    if (merged.length !== remoteCards.length || JSON.stringify(merged) !== JSON.stringify(remoteCards)) {
      await saveUserVocabCardsToSupabase(userId, merged);
    }

    return merged;
  } catch (err) {
    console.warn("Failed to sync vocab cards with Supabase:", err);
    return getStoredVocabCards(userId);
  }
}

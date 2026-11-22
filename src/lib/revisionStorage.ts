import {
  saveUserRevisionSessionsToSupabase,
  fetchUserRevisionSessionsFromSupabase,
} from "./supabase";
import { StoredSession } from "../components/revision/RevisionView";

const REVISION_STORAGE_KEY = "upsc_revision_sessions_v3";

function getStorageKey(userId?: string): string {
  return userId ? `${REVISION_STORAGE_KEY}_${userId}` : REVISION_STORAGE_KEY;
}

/**
 * Merges two session arrays without duplicates, keeping newer messages and updates.
 */
export function mergeRevisionSessions(
  local: StoredSession[],
  remote: StoredSession[],
): StoredSession[] {
  const map = new Map<string, StoredSession>();

  // Insert remote first
  for (const s of remote) {
    if (s && s.id) {
      map.set(s.id, s);
    }
  }

  // Merge local
  for (const s of local) {
    if (!s || !s.id) continue;
    const existing = map.get(s.id);
    if (!existing) {
      map.set(s.id, s);
    } else {
      const localTime = new Date(s.updatedAt || 0).getTime();
      const remoteTime = new Date(existing.updatedAt || 0).getTime();
      // Keep whichever has newer updatedAt or more messages
      if (
        localTime >= remoteTime ||
        s.messages.length >= existing.messages.length
      ) {
        map.set(s.id, s);
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.updatedAt || 0).getTime() -
      new Date(a.updatedAt || 0).getTime(),
  );
}

/**
 * Loads revision sessions from cloud storage, with fast local cache fallback.
 */
export async function loadRevisionSessions(
  userId?: string,
): Promise<StoredSession[]> {
  if (typeof window === "undefined") return [];

  let localSessions: StoredSession[] = [];
  try {
    const userKey = userId ? getStorageKey(userId) : REVISION_STORAGE_KEY;
    const raw =
      localStorage.getItem(userKey) ||
      localStorage.getItem(REVISION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localSessions = parsed;
      }
    }
  } catch {}

  // If user is authenticated, fetch and merge cloud sessions from Supabase
  if (userId) {
    try {
      const remote = await fetchUserRevisionSessionsFromSupabase(userId);
      if (Array.isArray(remote) && remote.length > 0) {
        const merged = mergeRevisionSessions(localSessions, remote);
        try {
          localStorage.setItem(getStorageKey(userId), JSON.stringify(merged));
        } catch {}
        return merged;
      }
    } catch (err) {
      console.warn("Failed fetching cloud revision sessions:", err);
    }
  }

  return localSessions;
}

/**
 * Saves revision sessions to Supabase cloud and updates local cache.
 */
export async function saveRevisionSessions(
  sessions: StoredSession[],
  userId?: string,
): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Update local cache
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(sessions));
    if (userId) {
      localStorage.setItem(REVISION_STORAGE_KEY, JSON.stringify(sessions));
    }
  } catch {}

  // 2. Sync to Supabase cloud
  if (userId) {
    try {
      await saveUserRevisionSessionsToSupabase(userId, sessions);
    } catch (err) {
      console.warn("Cloud revision session sync failed:", err);
    }
  }
}

/**
 * Background sync for authenticated user login
 */
export async function syncRevisionSessionsWithCloud(
  userId: string,
): Promise<StoredSession[]> {
  const sessions = await loadRevisionSessions(userId);
  if (sessions.length > 0) {
    await saveRevisionSessions(sessions, userId);
  }
  return sessions;
}

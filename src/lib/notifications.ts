import { AppNotification } from "./types";

const NOTIFICATION_LIMIT = 30;

function getStorageKey(userId?: string | null): string {
  return `exam_prep_notifications_v1_${userId || "guest"}`;
}

export function getNotifications(userId?: string | null): AppNotification[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, NOTIFICATION_LIMIT) : [];
  } catch {
    return [];
  }
}

export function saveNotifications(
  notifications: AppNotification[],
  userId?: string | null,
): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(notifications.slice(0, NOTIFICATION_LIMIT)),
    );
  } catch (error) {
    console.warn("Could not save in-app notifications:", error);
  }
}

import { RevisionMessage } from "../types";

const MAX_TURNS_TO_SEND = 8;

/**
 * Intelligently prunes conversation messages before dispatch to LLM APIs.
 * Preserves the initial question context and the latest turns while trimming middle filler.
 */
export function pruneRevisionMessages(
  messages: RevisionMessage[],
): RevisionMessage[] {
  if (messages.length <= MAX_TURNS_TO_SEND) {
    return messages;
  }

  // Always keep first user prompt (anchors initial topic context)
  const first = messages[0];
  // Keep the most recent (MAX_TURNS_TO_SEND - 1) messages
  const recent = messages.slice(-(MAX_TURNS_TO_SEND - 1));

  if (first.id === recent[0]?.id) {
    return recent;
  }

  return [first, ...recent];
}

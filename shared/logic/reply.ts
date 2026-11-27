// What the user's reply says when it collects queued choices, comments and edits.

/** The queued items, then `last`, as one message; blank parts are dropped. */
export function composeReply(queued: readonly string[], last: string | null): string {
  return [...queued, last ?? ""]
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join("\n\n");
}

export function commentText(label: string, comment: string): string | null {
  const trimmed = comment.trim();
  return trimmed === "" ? null : `On ${label}: ${trimmed}`;
}

/** `Edit step 2 (Spec): title "A" → "B"; detail "C" → "D"`, or null when nothing changed. */
export function editText(
  label: string,
  before: Readonly<Record<string, string>>,
  after: Readonly<Record<string, string>>,
): string | null {
  const changes = Object.keys(before).flatMap((field) => {
    const was = before[field] ?? "";
    const now = (after[field] ?? was).trim();
    return now === was.trim() ? [] : [`${field} "${was}" → "${now}"`];
  });
  return changes.length === 0 ? null : `Edit ${label}: ${changes.join("; ")}`;
}

export interface SavedDraftEdit {
  readonly original: string;
  readonly edited: string;
}

/** Persistence and reply-queue identity for one Draft instance. */
export function draftScope(instanceKey: string): string {
  return `draft:${instanceKey}`;
}

/** Validates a persisted Draft edit read from storage. */
export function acceptDraftEdit(stored: unknown): SavedDraftEdit | null {
  if (typeof stored !== "object" || stored === null || Array.isArray(stored)) return null;
  const record = stored as Record<string, unknown>;
  return typeof record.original === "string" && typeof record.edited === "string"
    ? { original: record.original, edited: record.edited }
    : null;
}

/** Returns the saved edit only when it was made against the current original Markdown. */
export function resolveDraftEdit(saved: SavedDraftEdit | null, original: string): string | null {
  return saved !== null && saved.original === original ? saved.edited : null;
}

/** The user's rewrite of a Draft as a reply part, or null when it is unchanged. */
export function draftText(title: string | null, before: string, after: string): string | null {
  if (after.trim() === before.trim()) return null;
  return `Use this edited version of the draft${title ? ` "${title}"` : ""}:\n\n${after.trim()}`;
}

/** True when a title already carries its own number, as in "2a. Checks" or "3) Release". */
export function hasOwnNumber(title: string): boolean {
  return /^\s*\d+[a-z]?[.):]\s/i.test(title);
}

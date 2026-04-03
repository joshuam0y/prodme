/** Matches `SwipeStack` localStorage key for signed-in users. */
export function discoverDismissedStorageKey(viewerId: string): string {
  return `prodlink.discover.dismissedIds:${viewerId}`;
}

/** If this profile id was cached as dismissed, drop it so Discover can show the card again. */
export function clearDiscoverDismissedId(viewerId: string, targetId: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = discoverDismissedStorageKey(viewerId);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return;
    const next = arr.filter((id) => id !== targetId);
    if (next.length === arr.length) return;
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

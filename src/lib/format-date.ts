/** Eastern US (handles EST/EDT). Vercel runs in UTC — always pass explicit timeZone. */
const DISPLAY_TZ = "America/New_York";

const FIVE_MIN_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Relative “presence” copy for messaging (best-effort from profile/message timestamps).
 * Returns empty string if `iso` is missing/invalid.
 */
export function formatPeerActivityLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diffMs = Date.now() - t;
  if (diffMs < 0) return "Active recently";
  if (diffMs <= FIVE_MIN_MS) return "Active now";
  if (diffMs < HOUR_MS) {
    const m = Math.max(1, Math.floor(diffMs / 60_000));
    return m === 1 ? "Active 1 min ago" : `Active ${m} min ago`;
  }
  if (diffMs < DAY_MS) {
    const h = Math.max(1, Math.floor(diffMs / HOUR_MS));
    return h === 1 ? "Active 1 hr ago" : `Active ${h} hr ago`;
  }
  const days = Math.floor(diffMs / DAY_MS);
  if (days < 7) {
    return days === 1 ? "Active 1 day ago" : `Active ${days} days ago`;
  }
  return `Last active ${formatDisplayDate(iso)}`;
}

type ActivityMessage = {
  sender_id: string;
  recipient_id: string;
  created_at: string;
  read_at: string | null;
};

/** Best-effort “last seen” time for a peer: profile edits, their sends, or when they read your messages. */
export function computePeerLastActivityMs(params: {
  profileUpdatedAtIso?: string | null;
  messages: ActivityMessage[];
  peerId: string;
  selfId: string;
}): number {
  let ms = 0;
  const bump = (iso: string | null | undefined) => {
    if (!iso) return;
    const t = new Date(iso).getTime();
    if (!Number.isNaN(t)) ms = Math.max(ms, t);
  };
  bump(params.profileUpdatedAtIso);
  for (const m of params.messages) {
    if (m.sender_id === params.peerId) bump(m.created_at);
    if (m.sender_id === params.selfId && m.recipient_id === params.peerId) bump(m.read_at);
  }
  return ms;
}

/** Use for UI tinting: “recent” means within the last 24 hours. */
export function getPeerActivityDisplay(iso: string | null | undefined): { text: string; recent: boolean } {
  const text = formatPeerActivityLabel(iso);
  if (!text || !iso) return { text: "", recent: false };
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return { text: "", recent: false };
  const diffMs = Date.now() - t;
  const recent = diffMs >= 0 && diffMs < DAY_MS;
  return { text, recent };
}

export function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      timeZone: DISPLAY_TZ,
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

/** Eastern US (handles EST/EDT). Vercel runs in UTC — always pass explicit timeZone. */
const DISPLAY_TZ = "America/New_York";

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

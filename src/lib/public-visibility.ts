/** Keys stored in `profiles.public_visibility` — omitted or true = visible; false = hidden on `/p/[id]`. */
export type PublicVisibilityKey =
  | "member_details"
  | "location"
  | "goal"
  | "looking_for"
  | "prompts"
  | "niche"
  | "beats";

export function isPublicFieldVisible(key: PublicVisibilityKey, raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return true;
  const v = (raw as Record<string, unknown>)[key];
  if (v === false) return false;
  return true;
}

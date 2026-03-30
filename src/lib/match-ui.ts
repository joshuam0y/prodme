/** Single initial for avatar chips; two chars when name has multiple words. */
export function profileInitials(displayName: string | null | undefined): string {
  const t = displayName?.trim() ?? "";
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

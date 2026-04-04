export type SocialLink = {
  label: string;
  url: string;
};

const MAX_LINKS = 6;
const MAX_LABEL = 48;

export function parseSocialLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];
  const out: SocialLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const label = typeof (item as { label?: unknown }).label === "string" ? (item as { label: string }).label.trim() : "";
    const url = typeof (item as { url?: unknown }).url === "string" ? (item as { url: string }).url.trim() : "";
    if (!label || !url) continue;
    out.push({ label: label.slice(0, MAX_LABEL), url });
    if (out.length >= MAX_LINKS) break;
  }
  return out;
}

function isHttpsUrl(u: string): boolean {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
}

export function validateSocialLinksForSave(links: SocialLink[]): { ok: true } | { ok: false; error: string } {
  if (links.length > MAX_LINKS) {
    return { ok: false, error: `Add at most ${MAX_LINKS} links.` };
  }
  const seen = new Set<string>();
  for (let i = 0; i < links.length; i++) {
    const { label, url } = links[i];
    const t = label.trim();
    if (!t) {
      return { ok: false, error: `Link ${i + 1}: add a label.` };
    }
    if (t.length > MAX_LABEL) {
      return { ok: false, error: `Link ${i + 1}: label is too long.` };
    }
    const u = url.trim();
    if (!u) {
      return { ok: false, error: `Link ${i + 1}: add a URL.` };
    }
    if (!isHttpsUrl(u)) {
      return { ok: false, error: `Link “${t}”: URL must use https://` };
    }
    const key = u.toLowerCase();
    if (seen.has(key)) {
      return { ok: false, error: "Each URL must be unique." };
    }
    seen.add(key);
  }
  return { ok: true };
}

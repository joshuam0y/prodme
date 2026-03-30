import type { BeatPreview } from "@/lib/types";

/** One entry in `profiles.extra_beats` JSON. */
export type DbExtraBeat = {
  title: string;
  audio_url: string;
  cover_url: string;
};

function isExtraBeat(v: unknown): v is DbExtraBeat {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.title === "string" &&
    typeof o.audio_url === "string" &&
    typeof o.cover_url === "string"
  );
}

export function parseExtraBeats(raw: unknown): DbExtraBeat[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isExtraBeat);
}

const defaultCover = (profileId: string, salt: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(profileId + salt)}/400/400`;

export function beatsFromProfileRow(row: {
  id: string;
  star_beat_title: string | null;
  star_beat_audio_url: string | null;
  star_beat_cover_url: string | null;
  extra_beats: unknown;
}): { starBeat?: BeatPreview; extraBeats?: BeatPreview[] } {
  const audio = row.star_beat_audio_url?.trim();
  const title = row.star_beat_title?.trim();
  let starBeat: BeatPreview | undefined;
  if (audio && title) {
    const cover = row.star_beat_cover_url?.trim();
    starBeat = {
      id: `${row.id}-star`,
      title,
      audioUrl: audio,
      coverUrl: cover || defaultCover(row.id, "star"),
    };
  }

  const parsed = parseExtraBeats(row.extra_beats).slice(0, 5);
  const extraBeats: BeatPreview[] = parsed.map((b, i) => ({
    id: `${row.id}-extra-${i}`,
    title: b.title.trim() || `Beat ${i + 1}`,
    audioUrl: b.audio_url.trim(),
    coverUrl: b.cover_url.trim() || defaultCover(row.id, `ex${i}`),
  }));

  return {
    starBeat,
    extraBeats: extraBeats.length ? extraBeats : undefined,
  };
}

export type Role = "producer" | "artist" | "dj" | "venue";

/** Short audio preview for discover cards (URLs must allow streaming). */
export type BeatPreview = {
  id: string;
  title: string;
  /** Optional for venues (photos-only). */
  audioUrl?: string;
  coverUrl: string;
};

export type ProfileCard = {
  id: string;
  displayName: string;
  role: Role;
  city: string;
  niche: string;
  bio: string;
  highlight: string;
  /** CSS gradient or color for card header */
  accent: string;
  /** Featured track — auto-plays when the card is shown (after user has interacted with the page). */
  starBeat?: BeatPreview;
  /** Additional previews (UI shows up to five). */
  extraBeats?: BeatPreview[];
};

export type BeatBundle = {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  priceLabel: string;
  trackCount: number;
  genres: string[];
  accent: string;
};

/** Row in `public.profiles` */
export type DbProfile = {
  id: string;
  display_name: string | null;
  role: string | null;
  niche: string | null;
  goal: string | null;
  city?: string | null;
  onboarding_completed_at: string | null;
  updated_at?: string | null;
  star_beat_title?: string | null;
  star_beat_audio_url?: string | null;
  star_beat_cover_url?: string | null;
  /** JSON array of `{ title, audio_url, cover_url }` — max 5 enforced in app */
  extra_beats?: unknown;
};

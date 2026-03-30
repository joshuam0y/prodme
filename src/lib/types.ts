export type Role = "producer" | "artist" | "dj" | "venue";

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
  onboarding_completed_at: string | null;
};

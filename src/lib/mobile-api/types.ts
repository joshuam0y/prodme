import type { Role } from "@/lib/types";
import type { BeatPreview } from "@/lib/types";
import type { DbExtraBeat } from "@/lib/profile-beats";

export type MobileApiError = {
  ok: false;
  error: string;
};

export type MobileApiOk<T> = {
  ok: true;
  data: T;
};

export type MobileApiResponse<T> = MobileApiOk<T> | MobileApiError;

export type MobileDiscoverProfile = {
  id: string;
  displayName: string;
  role: Role;
  city: string;
  niche: string;
  bio: string;
  highlight: string;
  accent: string;
  verified?: boolean;
  lookingFor?: string | null;
  goal?: string | null;
  prompt1Question?: string | null;
  prompt1Answer?: string | null;
  prompt2Question?: string | null;
  prompt2Answer?: string | null;
  starBeat?: BeatPreview;
  extraBeats?: BeatPreview[];
  rankReason?: string;
  distanceKm?: number;
};

export type MobileMatchPreview = {
  id: string;
  name: string;
  role: string | null;
  city: string | null;
  niche: string | null;
  isNewMatch: boolean;
  unreadCount: number;
  yourTurn: boolean;
  latestMessage?: {
    body: string;
    mine: boolean;
    createdAt: string;
  };
};

export type MobileMessagesRow = {
  id: number | string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  pending?: boolean;
};

export type MobilePublicProfile = {
  id: string;
  displayName: string;
  role: Role;
  city: string | null;
  neighborhood: string | null;
  niche: string | null;
  goal: string | null;
  verified: boolean;
  lookingFor: string | null;
  prompt1Question: string | null;
  prompt1Answer: string | null;
  prompt2Question: string | null;
  prompt2Answer: string | null;
  onboardingCompletedAt: string | null;
  starBeat?: BeatPreview;
  extraBeats?: BeatPreview[];
};

export type MobileUpdateBasicsInput = {
  display_name?: string;
  niche?: string;
  goal?: string;
  city?: string;
  looking_for?: string;
  prompt_1_question?: string;
  prompt_1_answer?: string;
  prompt_2_question?: string;
  prompt_2_answer?: string;
};

export type MobileUpdateLocationInput = {
  city?: string;
  neighborhood?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_radius_km?: number;
};

export type MobileUpdatePreviewsInput = {
  star_beat_title: string | null;
  star_beat_audio_url: string | null;
  star_beat_cover_url: string | null;
  extra_beats: DbExtraBeat[];
};


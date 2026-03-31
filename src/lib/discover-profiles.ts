import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { beatsFromProfileRow } from "@/lib/profile-beats";
import type { ProfileCard, Role } from "@/lib/types";

/** Map onboarding / DB `profiles.role` text to a discover `Role`. */
export function inferProfileRole(raw: string | null): Role {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("producer")) return "producer";
  if (s.includes("dj")) return "dj";
  if (s.includes("venue") || s.includes("promoter")) return "venue";
  if (s.includes("artist")) return "artist";
  return "artist";
}

function accentForRole(r: Role): string {
  const m: Record<Role, string> = {
    producer: "from-violet-600 to-fuchsia-600",
    artist: "from-emerald-600 to-teal-600",
    dj: "from-amber-500 to-orange-600",
    venue: "from-slate-600 to-zinc-700",
  };
  return m[r];
}

/** Real users from Supabase (IDs are UUIDs → /p/:id works). */
export async function getLiveProfileCards(
  excludeUserId?: string | null,
  viewerId?: string | null,
  opts?: {
    viewerLat?: number | null;
    viewerLng?: number | null;
    maxDistanceKm?: number;
  },
): Promise<ProfileCard[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();

  let swipedIds = new Set<string>();
  if (viewerId) {
    const { data: swipes, error: swipeErr } = await supabase
      .from("discover_swipes")
      .select("target_id")
      .eq("viewer_id", viewerId);
    if (!swipeErr && swipes?.length) {
      swipedIds = new Set(swipes.map((s) => s.target_id));
    }
  }

  let q = supabase
    .from("profiles")
    .select(
      "id, display_name, role, niche, goal, city, neighborhood, latitude, longitude, updated_at, star_beat_title, star_beat_audio_url, star_beat_cover_url, extra_beats",
    )
    .not("onboarding_completed_at", "is", null)
    .order("updated_at", { ascending: false })
    .limit(48);

  if (excludeUserId) {
    q = q.neq("id", excludeUserId);
  }

  const { data, error } = await q;
  if (error || !data?.length) {
    return [];
  }

  const rows = data.filter((row) => !swipedIds.has(row.id));
  if (!rows.length) {
    return [];
  }

  // Lightweight ranking pass: prefer higher-rated profiles while keeping recency.
  const ratingStats = new Map<string, { avg: number; count: number }>();
  try {
    const ids = rows.map((r) => r.id);
    const { data: ratings } = await supabase
      .from("profile_ratings")
      .select("target_id, rating")
      .in("target_id", ids);
    const bucket = new Map<string, number[]>();
    for (const r of ratings ?? []) {
      const arr = bucket.get(r.target_id) ?? [];
      arr.push(r.rating);
      bucket.set(r.target_id, arr);
    }
    for (const [id, vals] of bucket) {
      const count = vals.length;
      if (!count) continue;
      const avg = vals.reduce((s, n) => s + n, 0) / count;
      ratingStats.set(id, { avg, count });
    }
  } catch {
    // Ratings are optional in early envs; keep default ordering if unavailable.
  }

  const rankScore = (row: (typeof rows)[number]) => {
    const stats = ratingStats.get(row.id);
    if (!stats) return 0;
    const confidence = Math.min(1, stats.count / 8);
    const quality = stats.avg / 5;
    return quality * (0.35 + 0.65 * confidence);
  };

  const rankedRows = [...rows].sort((a, b) => {
    const byScore = rankScore(b) - rankScore(a);
    if (Math.abs(byScore) > 0.001) return byScore;
    return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
  });

  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const viewerLat = opts?.viewerLat;
  const viewerLng = opts?.viewerLng;
  const maxDistanceKm = opts?.maxDistanceKm ?? 50;
  const canFilterByDistance = Number.isFinite(viewerLat) && Number.isFinite(viewerLng);

  const reasonFor = (row: (typeof rows)[number]) => {
    const stats = ratingStats.get(row.id);
    if (stats && stats.count >= 6 && stats.avg >= 4.3) return "Highly rated";
    if (stats && stats.count >= 3 && stats.avg >= 4.0) return "Trending";
    return "Newly active";
  };

  return rankedRows
    .map((row) => {
      const hasTargetCoords =
        typeof row.latitude === "number" && typeof row.longitude === "number";
      const distanceKm =
        canFilterByDistance && hasTargetCoords
          ? haversineKm(viewerLat as number, viewerLng as number, row.latitude, row.longitude)
          : undefined;
      return { row, distanceKm };
    })
    .filter(({ distanceKm }) => (distanceKm === undefined ? true : distanceKm <= maxDistanceKm))
    .map(({ row, distanceKm }) => {
    const role = inferProfileRole(row.role);
    const name = row.display_name?.trim() || "Member";
    const niche = row.niche?.trim() || "—";
    const goal = row.goal?.trim() || "";
    // In the discover card UI, we show "focus" (goal) in the top-right pill,
    // and show the actual "niche" in the description copy.
    const focus = goal || niche;
    const { starBeat, extraBeats } = beatsFromProfileRow({
      id: row.id,
      star_beat_title: row.star_beat_title ?? null,
      star_beat_audio_url: row.star_beat_audio_url ?? null,
      star_beat_cover_url: row.star_beat_cover_url ?? null,
      extra_beats: row.extra_beats,
    });
    return {
      id: row.id,
      displayName: name,
      role,
      city: row.neighborhood?.trim() || row.city?.trim() || "—",
      niche: focus,
      bio: niche,
      highlight: niche,
      accent: accentForRole(role),
      starBeat,
      extraBeats,
      rankReason: reasonFor(row),
      distanceKm,
    };
    });
}

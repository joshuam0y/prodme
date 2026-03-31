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
    sort?: "new" | "trending" | "nearby";
    verifiedOnly?: boolean;
    lookingForQuery?: string;
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
      "id, display_name, role, niche, goal, city, neighborhood, latitude, longitude, verified, looking_for, prompt_1_question, prompt_1_answer, prompt_2_question, prompt_2_answer, updated_at, star_beat_title, star_beat_audio_url, star_beat_cover_url, extra_beats",
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
    let score = 0;
    if (row.verified) score += 0.18;
    if ((row.looking_for ?? "").trim()) score += 0.08;
    if ((row.prompt_1_answer ?? "").trim()) score += 0.06;
    if ((row.prompt_2_answer ?? "").trim()) score += 0.06;
    if (!stats) return score;
    const confidence = Math.min(1, stats.count / 8);
    const quality = stats.avg / 5;
    score += quality * (0.35 + 0.65 * confidence);
    return score;
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
    if (row.verified && (row.looking_for ?? "").trim()) return "Verified and clear";
    if (row.verified) return "Verified";
    if ((row.looking_for ?? "").trim()) return "Knows what they want";
    if (stats && stats.count >= 6 && stats.avg >= 4.3) return "Highly rated";
    if (stats && stats.count >= 3 && stats.avg >= 4.0) return "Trending";
    return "Newly active";
  };

  const desiredSort = opts?.sort ?? "trending";
  const verifiedOnly = Boolean(opts?.verifiedOnly);
  const lookingQ = (opts?.lookingForQuery ?? "").trim().toLowerCase();

  const filtered = rankedRows.filter((row) => {
    if (verifiedOnly && !row.verified) return false;
    if (lookingQ) {
      const hay = `${row.looking_for ?? ""} ${row.goal ?? ""} ${row.niche ?? ""}`.toLowerCase();
      if (!hay.includes(lookingQ)) return false;
    }
    return true;
  });

  const sortedFor = (rowsToSort: typeof rankedRows) => {
    if (desiredSort === "new") {
      return [...rowsToSort].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
    }
    if (desiredSort === "trending") {
      return [...rowsToSort].sort((a, b) => {
        const byScore = rankScore(b) - rankScore(a);
        if (Math.abs(byScore) > 0.001) return byScore;
        return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
      });
    }
    // nearby: handled after distance calculation; fall back to trending if no coords.
    return rowsToSort;
  };

  return sortedFor(filtered)
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
    .sort((a, b) => {
      if (desiredSort !== "nearby") return 0;
      if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
      if (a.distanceKm === undefined) return 1;
      if (b.distanceKm === undefined) return -1;
      return a.distanceKm - b.distanceKm;
    })
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
      verified: Boolean(row.verified),
      lookingFor: row.looking_for?.trim() ?? null,
      goal: row.goal?.trim() ?? null,
      prompt1Question: row.prompt_1_question?.trim() ?? null,
      prompt1Answer: row.prompt_1_answer?.trim() ?? null,
      prompt2Question: row.prompt_2_question?.trim() ?? null,
      prompt2Answer: row.prompt_2_answer?.trim() ?? null,
      starBeat,
      extraBeats,
      rankReason: reasonFor(row),
      distanceKm,
    };
    });
}

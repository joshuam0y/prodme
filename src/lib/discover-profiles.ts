import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { beatsFromProfileRow } from "@/lib/profile-beats";
import type { ProfileCard, Role } from "@/lib/types";

/** Map onboarding / DB `profiles.role` text to a discover `Role`. */
export function inferProfileRole(raw: string | null): Role {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("producer")) return "producer";
  if (s.includes("dj")) return "dj";
  if (s.includes("engineer")) return "engineer";
  if (s.includes("venue") || s.includes("promoter")) return "venue";
  if (s.includes("artist")) return "artist";
  return "artist";
}

/** Tailwind gradient classes for the discover card header (shared with `/p/[id]`). */
export function discoverAccentGradientForRole(r: Role): string {
  const m: Record<Role, string> = {
    producer: "from-amber-400 via-orange-500 to-amber-600",
    artist: "from-zinc-100 via-amber-300 to-orange-500",
    dj: "from-amber-500 via-orange-500 to-amber-700",
    engineer: "from-zinc-300 via-zinc-100 to-amber-500",
    venue: "from-slate-600 to-zinc-700",
  };
  return m[r];
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Real users from Supabase (IDs are UUIDs → /p/:id works). */
export async function getLiveProfileCards(
  excludeUserId?: string | null,
  viewerId?: string | null,
  opts?: {
    viewerLat?: number | null;
    viewerLng?: number | null;
    viewerRole?: Role | null;
    viewerNiche?: string | null;
    viewerGoal?: string | null;
    viewerLookingFor?: string | null;
    maxDistanceKm?: number;
    sort?: "new" | "trending" | "nearby";
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
      "id, display_name, avatar_url, ai_summary, ai_tags, ai_profile_score, role, niche, goal, city, neighborhood, latitude, longitude, looking_for, prompt_1_question, prompt_1_answer, prompt_2_question, prompt_2_answer, updated_at, star_beat_title, star_beat_audio_url, star_beat_cover_url, extra_beats",
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

  const tokenize = (...values: Array<string | null | undefined>) =>
    [...new Set(
      values
        .join(" ")
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3),
    )];

  const parseAiTags = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
      .filter(Boolean)
      .slice(0, 6);
  };

  const viewerTokens = new Set(
    tokenize(opts?.viewerRole ?? null, opts?.viewerNiche ?? null, opts?.viewerGoal ?? null, opts?.viewerLookingFor ?? null),
  );
  const embeddingSimilarity = new Map<string, number>();
  if (viewerId) {
    try {
      const { data: similarityRows } = await supabase.rpc("match_profile_embeddings", {
        p_viewer_id: viewerId,
        p_limit: 96,
      });
      for (const row of (similarityRows as Array<{ user_id: string; similarity: number }> | null) ?? []) {
        if (typeof row.user_id === "string" && Number.isFinite(Number(row.similarity))) {
          embeddingSimilarity.set(row.user_id, Number(row.similarity));
        }
      }
    } catch {
      // Embeddings are optional until the migration runs.
    }
  }

  // Lightweight ranking pass: prefer higher-rated and better-described profiles while keeping recency.
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
    const aiScore = Math.max(0, Math.min(100, Number(row.ai_profile_score ?? 0))) / 100;
    const semanticSimilarity = Math.max(
      0,
      Math.min(1, Number(embeddingSimilarity.get(row.id) ?? 0)),
    );
    const aiTags = parseAiTags(row.ai_tags);
    const candidateTokens = new Set(
      tokenize(row.role, row.niche, row.goal, row.looking_for, row.ai_summary ?? null, ...aiTags),
    );
    let overlap = 0;
    for (const token of candidateTokens) {
      if (viewerTokens.has(token)) overlap += 1;
    }
    const overlapRatio =
      viewerTokens.size > 0 ? Math.min(1, overlap / Math.max(3, viewerTokens.size)) : 0;
    if ((row.looking_for ?? "").trim()) score += 0.08;
    if ((row.prompt_1_answer ?? "").trim()) score += 0.06;
    if ((row.prompt_2_answer ?? "").trim()) score += 0.06;
    if ((row.ai_summary ?? "").trim()) score += 0.08;
    if (aiTags.length > 0) score += 0.06;
    score += aiScore * 0.3;
    score += semanticSimilarity * 0.45;
    score += overlapRatio * 0.35;
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
    const aiTags = parseAiTags(row.ai_tags);
    const semanticSimilarity = Math.max(
      0,
      Math.min(1, Number(embeddingSimilarity.get(row.id) ?? 0)),
    );
    const candidateTokens = new Set(
      tokenize(row.role, row.niche, row.goal, row.looking_for, row.ai_summary ?? null, ...aiTags),
    );
    let overlap = 0;
    for (const token of candidateTokens) {
      if (viewerTokens.has(token)) overlap += 1;
    }
    const aiScore = Math.max(0, Math.min(100, Number(row.ai_profile_score ?? 0)));
    if (semanticSimilarity >= 0.82) return "Semantic match";
    if (overlap >= 3) return "Strong fit";
    if (aiScore >= 80 && aiTags.length >= 3) return "AI-optimized";
    if ((row.looking_for ?? "").trim()) return "Knows what they want";
    if (stats && stats.count >= 6 && stats.avg >= 4.3) return "Highly rated";
    if (stats && stats.count >= 3 && stats.avg >= 4.0) return "Trending";
    return "Newly active";
  };

  const whyFor = (row: (typeof rows)[number]) => {
    const aiTags = parseAiTags(row.ai_tags);
    const semanticSimilarity = Math.max(
      0,
      Math.min(1, Number(embeddingSimilarity.get(row.id) ?? 0)),
    );
    const reasons: string[] = [];
    const viewerNiche = opts?.viewerNiche?.trim();
    const viewerGoal = opts?.viewerGoal?.trim();
    const viewerLookingFor = opts?.viewerLookingFor?.trim();
    const rowNiche = row.niche?.trim();
    const rowGoal = row.goal?.trim();
    const rowLookingFor = row.looking_for?.trim();

    if (viewerNiche && rowNiche) {
      const viewerNicheTokens = new Set(tokenize(viewerNiche));
      const rowNicheTokens = tokenize(rowNiche);
      if (rowNicheTokens.some((token) => viewerNicheTokens.has(token))) {
        reasons.push(`Shared style around ${rowNiche}`);
      }
    }
    if (viewerGoal && rowGoal) {
      const viewerGoalTokens = new Set(tokenize(viewerGoal));
      const rowGoalTokens = tokenize(rowGoal);
      if (rowGoalTokens.some((token) => viewerGoalTokens.has(token))) {
        reasons.push(`Similar focus: ${rowGoal}`);
      }
    }
    if (viewerLookingFor && rowLookingFor) {
      const viewerLookingTokens = new Set(tokenize(viewerLookingFor));
      const rowLookingTokens = tokenize(rowLookingFor);
      if (rowLookingTokens.some((token) => viewerLookingTokens.has(token))) {
        reasons.push(`Aligned collaborator ask: ${rowLookingFor}`);
      }
    }
    if (reasons.length === 0 && aiTags.length > 0) {
      reasons.push(`Signals: ${aiTags.slice(0, 3).map(capitalize).join(" · ")}`);
    }
    if (semanticSimilarity >= 0.75) {
      reasons.unshift("Semantically close to your overall profile");
    }
    if (reasons.length === 0 && (row.looking_for ?? "").trim()) {
      reasons.push(`Looking for ${row.looking_for?.trim()}`);
    }
    return reasons.slice(0, 3);
  };

  const desiredSort = opts?.sort ?? "trending";
  const lookingQ = (opts?.lookingForQuery ?? "").trim().toLowerCase();

  const filtered = rankedRows.filter((row) => {
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
    const aiTags = parseAiTags(row.ai_tags);
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
      avatarUrl: row.avatar_url?.trim() ?? null,
      aiSummary: row.ai_summary?.trim() ?? null,
      aiTags: aiTags,
      aiScore: Number.isFinite(Number(row.ai_profile_score)) ? Number(row.ai_profile_score) : null,
      role,
      city: row.neighborhood?.trim() || row.city?.trim() || "—",
      niche: focus,
      bio: niche,
      highlight: niche,
      accent: discoverAccentGradientForRole(role),
      lookingFor: row.looking_for?.trim() ?? null,
      goal: row.goal?.trim() ?? null,
      prompt1Question: row.prompt_1_question?.trim() ?? null,
      prompt1Answer: row.prompt_1_answer?.trim() ?? null,
      prompt2Question: row.prompt_2_question?.trim() ?? null,
      prompt2Answer: row.prompt_2_answer?.trim() ?? null,
      starBeat,
      extraBeats,
      rankReason: reasonFor(row),
      matchWhy: whyFor(row),
      semanticScore: Number.isFinite(Number(embeddingSimilarity.get(row.id)))
        ? Number(embeddingSimilarity.get(row.id))
        : undefined,
      distanceKm,
    };
    });
}

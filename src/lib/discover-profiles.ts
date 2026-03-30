import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { ProfileCard, Role } from "@/lib/types";

function inferRole(raw: string | null): Role {
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
): Promise<ProfileCard[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createClient();
  let q = supabase
    .from("profiles")
    .select("id, display_name, role, niche, goal")
    .not("onboarding_completed_at", "is", null)
    .order("updated_at", { ascending: false })
    .limit(24);

  if (excludeUserId) {
    q = q.neq("id", excludeUserId);
  }

  const { data, error } = await q;
  if (error || !data?.length) {
    return [];
  }

  return data.map((row) => {
    const role = inferRole(row.role);
    const name = row.display_name?.trim() || "Member";
    const niche = row.niche?.trim() || "—";
    const goal = row.goal?.trim() || "";
    return {
      id: row.id,
      displayName: name,
      role,
      city: "—",
      niche,
      bio: goal || niche,
      highlight: niche,
      accent: accentForRole(role),
    };
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getLiveProfileCards } from "@/lib/discover-profiles";
import type { MobileApiResponse } from "@/lib/mobile-api/types";

function parseBool(v: string | null): boolean {
  if (!v) return false;
  const s = v.toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "supabase_not_configured" } satisfies MobileApiResponse<never>, {
      status: 500,
    });
  }

  const url = new URL(req.url);
  const sp = url.searchParams;

  const sort = (sp.get("sort") ?? "trending") as "new" | "trending" | "nearby";
  const lookingForQuery = sp.get("q") ?? undefined;
  const verifiedOnly = parseBool(sp.get("verified"));
  const maxKmRaw = sp.get("maxKm");
  const maxDistanceKm = maxKmRaw ? Math.max(0, Number(maxKmRaw)) : undefined;

  const viewerLatRaw = sp.get("viewerLat");
  const viewerLngRaw = sp.get("viewerLng");
  const viewerLat = viewerLatRaw ? Number(viewerLatRaw) : undefined;
  const viewerLng = viewerLngRaw ? Number(viewerLngRaw) : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "not_signed_in" } satisfies MobileApiResponse<never>, {
      status: 401,
    });
  }

  const profiles = await getLiveProfileCards(user.id, user.id, {
    viewerLat: Number.isFinite(viewerLat) ? viewerLat : null,
    viewerLng: Number.isFinite(viewerLng) ? viewerLng : null,
    maxDistanceKm: Number.isFinite(maxDistanceKm) ? maxDistanceKm : undefined,
    sort,
    verifiedOnly,
    lookingForQuery: lookingForQuery?.trim() ? lookingForQuery : undefined,
  });

  return NextResponse.json({ ok: true, data: profiles } satisfies MobileApiResponse<unknown>);
}


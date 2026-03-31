import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { MobileApiResponse, MobileMatchPreview } from "@/lib/mobile-api/types";
import type { Role } from "@/lib/types";

function normalizeRole(role: Role | string | null | undefined): Role | string | null {
  if (!role) return null;
  return role;
}

export async function GET(req: Request) {
  void req;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "supabase_not_configured" } satisfies MobileApiResponse<never>, {
      status: 500,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "not_signed_in" } satisfies MobileApiResponse<never>, {
      status: 401,
    });
  }

  const { data: outgoing } = await supabase
    .from("discover_swipes")
    .select("target_id, created_at")
    .eq("viewer_id", user.id)
    .in("action", ["save", "interested"]);

  const { data: incoming } = await supabase
    .from("discover_swipes")
    .select("viewer_id, created_at")
    .eq("target_id", user.id)
    .in("action", ["save", "interested"]);

  const outgoingIds = new Set((outgoing ?? []).map((r) => r.target_id as string));
  const incomingIds = new Set((incoming ?? []).map((r) => r.viewer_id as string));
  const matchIds = [...outgoingIds].filter((id) => incomingIds.has(id));

  if (matchIds.length === 0) {
    return NextResponse.json({ ok: true, data: { matches: [] } } satisfies MobileApiResponse<unknown>);
  }

  const outgoingAt = new Map(
    (outgoing ?? []).map((r) => [r.target_id as string, r.created_at as string]),
  );
  const incomingAt = new Map(
    (incoming ?? []).map((r) => [r.viewer_id as string, r.created_at as string]),
  );

  const { data: mySentToMatches } = await supabase
    .from("match_messages")
    .select("id, recipient_id, body, created_at, read_at, sender_id")
    .eq("sender_id", user.id)
    .in("recipient_id", matchIds);

  const { data: recvFromMatches } = await supabase
    .from("match_messages")
    .select("id, sender_id, body, created_at, read_at, recipient_id")
    .eq("recipient_id", user.id)
    .in("sender_id", matchIds);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, role, city, neighborhood, niche")
    .in("id", matchIds);

  type MiniProfile = {
    id: string;
    display_name: string | null;
    role: string | null;
    city: string | null;
    neighborhood: string | null;
    niche: string | null;
  };
  const byId = new Map((profiles as MiniProfile[] | null | undefined ?? []).map((p) => [p.id, p]));

  const mutualAt = (id: string) => {
    const out = outgoingAt.get(id) ?? "";
    const inc = incomingAt.get(id) ?? "";
    return out > inc ? out : inc;
  };

  const matches: MobileMatchPreview[] = matchIds.map((id) => {
    const sent = (mySentToMatches ?? []).filter((m) => m.recipient_id === id);
    const recv = (recvFromMatches ?? []).filter((m) => m.sender_id === id);

    const unreadCount = recv.filter((m) => m.read_at === null).length;

    const combined = [
      ...sent.map((m) => ({ ...m, mine: true as const })),
      ...recv.map((m) => ({ ...m, mine: false as const })),
    ].sort(
      (a, b) =>
        new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime(),
    );

    const latest = combined[combined.length - 1];
    const profile = byId.get(id);

    const latestMessage =
      latest && typeof latest.body === "string"
        ? {
            body: latest.body,
            mine: Boolean(latest.mine),
            createdAt: latest.created_at as string,
          }
        : undefined;

    const yourTurn = Boolean(latestMessage && !latestMessage.mine && unreadCount > 0);

    const isNewMatch = !latestMessage;

    return {
      id,
      name: profile?.display_name?.trim() || "Member",
      role: normalizeRole(profile?.role ?? null) as string | null,
      city: profile?.neighborhood?.trim() || profile?.city?.trim() || null,
      niche: profile?.niche?.trim() || null,
      isNewMatch,
      unreadCount,
      yourTurn,
      latestMessage,
    };
  });

  matches.sort((a, b) => {
    const aTs = a.latestMessage?.createdAt ?? mutualAt(a.id);
    const bTs = b.latestMessage?.createdAt ?? mutualAt(b.id);
    return bTs.localeCompare(aTs);
  });

  return NextResponse.json({ ok: true, data: { matches } } satisfies MobileApiResponse<unknown>);
}


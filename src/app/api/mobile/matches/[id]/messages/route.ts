import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { trackServerEvent } from "@/lib/analytics";
import { createNotification } from "@/lib/notifications";
import { isUuid } from "@/lib/uuid";
import type { MobileApiError, MobileApiResponse, MobileMessagesRow } from "@/lib/mobile-api/types";

type Ctx = { params: Promise<{ id: string }> };

async function getBlockFlags(supabase: Awaited<ReturnType<typeof createClient>>, me: string, other: string) {
  const { data } = await supabase
    .from("profile_blocks")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${me},blocked_id.eq.${other}),and(blocker_id.eq.${other},blocked_id.eq.${me})`,
    );

  const blockedByMe = Boolean(data?.some((r) => r.blocker_id === me && r.blocked_id === other));
  const blockedByThem = Boolean(data?.some((r) => r.blocker_id === other && r.blocked_id === me));
  return { blockedByMe, blockedByThem };
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !isUuid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_target" } satisfies MobileApiResponse<never>, {
      status: 400,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "not_signed_in" } satisfies MobileApiResponse<never>, { status: 401 });
  if (user.id === id) return NextResponse.json({ ok: false, error: "self" } satisfies MobileApiResponse<never>, { status: 400 });

  const { blockedByMe, blockedByThem } = await getBlockFlags(supabase, user.id, id);
  if (blockedByMe || blockedByThem) {
    return NextResponse.json(
      {
        ok: false,
        error: "blocked",
        blockedByMe,
        blockedByThem,
      } satisfies MobileApiError & { blockedByMe: boolean; blockedByThem: boolean },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("match_messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(250);

  if (error) {
    return NextResponse.json({ ok: false, error: "list_failed" } satisfies MobileApiResponse<never>, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, data: { messages: (data ?? []) as MobileMessagesRow[] } } satisfies MobileApiResponse<unknown>,
  );
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !isUuid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_target" } satisfies MobileApiResponse<never>, {
      status: 400,
    });
  }

  const payload = (await req.json().catch(() => null)) as { body?: unknown } | null;
  const text = String(payload?.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ ok: false, error: "empty" } satisfies MobileApiResponse<never>, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: "not_signed_in" } satisfies MobileApiResponse<never>, { status: 401 });
  if (user.id === id) return NextResponse.json({ ok: false, error: "self" } satisfies MobileApiResponse<never>, { status: 400 });

  const { blockedByMe, blockedByThem } = await getBlockFlags(supabase, user.id, id);
  if (blockedByMe || blockedByThem) {
    return NextResponse.json(
      {
        ok: false,
        error: "blocked",
        blockedByMe,
        blockedByThem,
      } satisfies MobileApiError & { blockedByMe: boolean; blockedByThem: boolean },
      { status: 403 },
    );
  }

  const { data: mySwipe } = await supabase
    .from("discover_swipes")
    .select("action")
    .eq("viewer_id", user.id)
    .eq("target_id", id)
    .in("action", ["save", "interested"])
    .maybeSingle();
  const { data: theirSwipe } = await supabase
    .from("discover_swipes")
    .select("action")
    .eq("viewer_id", id)
    .eq("target_id", user.id)
    .in("action", ["save", "interested"])
    .maybeSingle();

  if (!mySwipe || !theirSwipe) {
    return NextResponse.json({ ok: false, error: "not_matched" } satisfies MobileApiResponse<never>, { status: 403 });
  }

  const { data, error } = await supabase
    .from("match_messages")
    .insert({
      sender_id: user.id,
      recipient_id: id,
      body: text.slice(0, 2000),
    })
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "insert_failed" } satisfies MobileApiResponse<never>, { status: 500 });
  }

  await trackServerEvent({
    event: "message_sent",
    path: `/matches/${id}`,
    metadata: { recipientId: id },
  });

  try {
    const { data: me } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    const actorName = me?.display_name?.trim() || "Someone";
    await createNotification({
      userId: id,
      actorId: user.id,
      kind: "message_received",
      title: `${actorName} sent you a message`,
      body: text.slice(0, 120),
      href: `/matches/${user.id}`,
      metadata: { actorId: user.id, messageId: data.id },
    });
  } catch {
    // Best-effort only.
  }

  return NextResponse.json(
    { ok: true, data: { message: data as MobileMessagesRow } } satisfies MobileApiResponse<unknown>,
  );
}


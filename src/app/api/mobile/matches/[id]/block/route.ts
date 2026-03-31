import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { trackServerEvent } from "@/lib/analytics";
import { isUuid } from "@/lib/uuid";
import type { MobileApiError, MobileApiResponse } from "@/lib/mobile-api/types";

type Ctx = { params: Promise<{ id: string }> };

type MobileBlockState = {
  blockedByMe: boolean;
  blockedByThem: boolean;
};

async function getBlockFlags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  me: string,
  other: string,
): Promise<MobileBlockState> {
  const { data } = await supabase
    .from("profile_blocks")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${me},blocked_id.eq.${other}),and(blocker_id.eq.${other},blocked_id.eq.${me})`,
    );

  return {
    blockedByMe: Boolean(data?.some((r) => r.blocker_id === me && r.blocked_id === other)),
    blockedByThem: Boolean(data?.some((r) => r.blocker_id === other && r.blocked_id === me)),
  };
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !isUuid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_target" } satisfies MobileApiError, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_signed_in" } satisfies MobileApiError, { status: 401 });
  }
  if (user.id === id) {
    return NextResponse.json({ ok: false, error: "self" } satisfies MobileApiError, { status: 400 });
  }

  const data = await getBlockFlags(supabase, user.id, id);
  return NextResponse.json({ ok: true, data } satisfies MobileApiResponse<MobileBlockState>);
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !isUuid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_target" } satisfies MobileApiError, { status: 400 });
  }

  const payload = (await req.json().catch(() => null)) as { reason?: unknown } | null;
  const reason = String(payload?.reason ?? "").trim().slice(0, 200);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_signed_in" } satisfies MobileApiError, { status: 401 });
  }
  if (user.id === id) {
    return NextResponse.json({ ok: false, error: "self" } satisfies MobileApiError, { status: 400 });
  }

  const { error } = await supabase.from("profile_blocks").upsert(
    {
      blocker_id: user.id,
      blocked_id: id,
      ...(reason ? { reason } : {}),
    },
    { onConflict: "blocker_id,blocked_id" },
  );
  if (error) {
    return NextResponse.json({ ok: false, error: "insert_failed" } satisfies MobileApiError, { status: 500 });
  }

  await trackServerEvent({
    event: "profile_blocked",
    path: `/matches/${id}`,
    metadata: { blockedUserId: id },
  });

  return NextResponse.json({ ok: true, data: null } satisfies MobileApiResponse<null>);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !isUuid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_target" } satisfies MobileApiError, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_signed_in" } satisfies MobileApiError, { status: 401 });
  }
  if (user.id === id) {
    return NextResponse.json({ ok: false, error: "self" } satisfies MobileApiError, { status: 400 });
  }

  const { error } = await supabase
    .from("profile_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: "delete_failed" } satisfies MobileApiError, { status: 500 });
  }

  await trackServerEvent({
    event: "profile_unblocked",
    path: `/matches/${id}`,
    metadata: { unblockedUserId: id },
  });

  return NextResponse.json({ ok: true, data: null } satisfies MobileApiResponse<null>);
}


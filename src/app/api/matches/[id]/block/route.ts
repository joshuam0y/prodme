import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { trackServerEvent } from "@/lib/analytics";
import { isUuid } from "@/lib/uuid";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !isUuid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_target" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { reason?: unknown } | null;
  const reason = String(body?.reason ?? "").trim().slice(0, 200);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not_signed_in" }, { status: 401 });
  if (user.id === id) return NextResponse.json({ ok: false, error: "self" }, { status: 400 });

  const { error } = await supabase.from("profile_blocks").upsert(
    {
      blocker_id: user.id,
      blocked_id: id,
      ...(reason ? { reason } : {}),
    },
    { onConflict: "blocker_id,blocked_id" },
  );
  if (error) {
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  await trackServerEvent({
    event: "profile_blocked",
    path: `/matches/${id}`,
    metadata: { blockedUserId: id },
  });
  return NextResponse.json({ ok: true });
}

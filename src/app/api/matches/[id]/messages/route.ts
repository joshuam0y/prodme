import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isUuid } from "@/lib/uuid";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !isUuid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_target" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not_signed_in" }, { status: 401 });
  if (user.id === id) return NextResponse.json({ ok: false, error: "self" }, { status: 400 });

  const { data, error } = await supabase
    .from("match_messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(250);

  if (error) {
    return NextResponse.json({ ok: false, error: "list_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, messages: data ?? [] });
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !isUuid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_target" }, { status: 400 });
  }

  const payload = (await req.json().catch(() => null)) as { body?: unknown } | null;
  const text = String(payload?.body ?? "").trim();
  if (!text) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not_signed_in" }, { status: 401 });
  if (user.id === id) return NextResponse.json({ ok: false, error: "self" }, { status: 400 });

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
    return NextResponse.json({ ok: false, error: "not_matched" }, { status: 403 });
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
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: data });
}

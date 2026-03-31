import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { markAllNotificationsRead } from "@/lib/notifications";
import type {
  MobileApiError,
  MobileApiResponse,
  MobileNotificationRow,
  MobileNotificationsPayload,
} from "@/lib/mobile-api/types";

export async function GET(_req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase_not_configured" } satisfies MobileApiError,
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "not_signed_in" } satisfies MobileApiError,
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, created_at, read_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "list_failed" } satisfies MobileApiError,
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      notifications: (data ?? []) as MobileNotificationRow[],
      unreadCount: unreadCount ?? 0,
    },
  } satisfies MobileApiResponse<MobileNotificationsPayload>);
}

export async function POST(_req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "supabase_not_configured" } satisfies MobileApiError,
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "not_signed_in" } satisfies MobileApiError,
      { status: 401 },
    );
  }

  await markAllNotificationsRead(user.id);

  return NextResponse.json({ ok: true, data: null } satisfies MobileApiResponse<null>);
}

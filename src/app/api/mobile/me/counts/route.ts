import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { MobileApiError, MobileApiResponse, MobileUnreadCounts } from "@/lib/mobile-api/types";

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

  const { count: unreadMessages } = await supabase
    .from("match_messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  const { count: unreadNotifications } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return NextResponse.json({
    ok: true,
    data: {
      unreadMessages: unreadMessages ?? 0,
      unreadNotifications: unreadNotifications ?? 0,
    },
  } satisfies MobileApiResponse<MobileUnreadCounts>);
}

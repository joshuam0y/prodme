import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isUuid } from "@/lib/uuid";
import type { MobileApiError, MobileApiResponse } from "@/lib/mobile-api/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
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

  const { error } = await supabase
    .from("match_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", id)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    return NextResponse.json({ ok: false, error: "update_failed" } satisfies MobileApiError, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: null } satisfies MobileApiResponse<null>);
}


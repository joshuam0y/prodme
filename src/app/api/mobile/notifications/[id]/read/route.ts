import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { markNotificationRead } from "@/lib/notifications";
import type { MobileApiError, MobileApiResponse } from "@/lib/mobile-api/types";

type Ctx = { params: Promise<{ id: string }> };

function parseNotificationId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const notificationId = parseNotificationId(id);
  if (!isSupabaseConfigured() || notificationId === null) {
    return NextResponse.json(
      { ok: false, error: "invalid_notification" } satisfies MobileApiError,
      { status: 400 },
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

  await markNotificationRead(user.id, notificationId);
  return NextResponse.json({ ok: true, data: null } satisfies MobileApiResponse<null>);
}

import { NextResponse } from "next/server";
import { buildAiReportTriage } from "@/lib/ai/report-triage";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { trackServerEvent } from "@/lib/analytics";
import { isUuid } from "@/lib/uuid";
import type { MobileApiError, MobileApiResponse } from "@/lib/mobile-api/types";

type Ctx = { params: Promise<{ id: string }> };

type MobileReportPayload = {
  reason?: unknown;
  details?: unknown;
  messageId?: unknown;
};

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isSupabaseConfigured() || !isUuid(id)) {
    return NextResponse.json({ ok: false, error: "invalid_target" } satisfies MobileApiError, { status: 400 });
  }

  const payload = (await req.json().catch(() => null)) as MobileReportPayload | null;
  const reason = String(payload?.reason ?? "").trim().slice(0, 120);
  const details = String(payload?.details ?? "").trim().slice(0, 1000);
  const rawMessageId = Number(payload?.messageId ?? 0);
  const messageId = Number.isFinite(rawMessageId) && rawMessageId > 0 ? Math.floor(rawMessageId) : null;

  if (!reason) {
    return NextResponse.json({ ok: false, error: "missing_reason" } satisfies MobileApiError, { status: 400 });
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

  let messageBody = "";
  if (messageId) {
    const { data: messageRow } = await supabase
      .from("match_messages")
      .select("body, sender_id, recipient_id")
      .eq("id", messageId)
      .maybeSingle();
    if (
      messageRow &&
      ((messageRow.sender_id === id && messageRow.recipient_id === user.id) ||
        (messageRow.sender_id === user.id && messageRow.recipient_id === id))
    ) {
      messageBody = String(messageRow.body ?? "").trim().slice(0, 400);
    }
  }

  const aiTriage = await buildAiReportTriage({
    reason,
    details,
    messageBody,
  });

  const { error } = await supabase.from("match_message_reports").insert({
    reporter_id: user.id,
    reported_user_id: id,
    reason,
    ...(details ? { details } : {}),
    ...(messageId ? { message_id: messageId } : {}),
    ...aiTriage,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: "insert_failed" } satisfies MobileApiError, { status: 500 });
  }

  await trackServerEvent({
    event: "message_report_submitted",
    path: `/matches/${id}`,
    metadata: { reportedUserId: id, reason },
  });

  return NextResponse.json({ ok: true, data: null } satisfies MobileApiResponse<null>);
}


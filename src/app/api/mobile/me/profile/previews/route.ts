import { NextResponse } from "next/server";
import { updateProfileBeats } from "@/app/profile/actions";
import type { MobileApiError, MobileApiResponse, MobileUpdatePreviewsInput } from "@/lib/mobile-api/types";

export async function PATCH(req: Request) {
  const payload = (await req.json().catch(() => null)) as MobileUpdatePreviewsInput | null;
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray(payload.extra_beats)
  ) {
    return NextResponse.json({ ok: false, error: "invalid_payload" } satisfies MobileApiError, {
      status: 400,
    });
  }

  const result = await updateProfileBeats(payload);
  if (!result.ok) {
    const lower = result.error.toLowerCase();
    const error = lower.includes("sign in")
      ? "not_signed_in"
      : lower.includes("https") || lower.includes("title") || lower.includes("add")
        ? "validation_failed"
        : "update_failed";
    const status = error === "not_signed_in" ? 401 : 400;
    return NextResponse.json({ ok: false, error } satisfies MobileApiError, { status });
  }

  return NextResponse.json({ ok: true, data: null } satisfies MobileApiResponse<null>);
}


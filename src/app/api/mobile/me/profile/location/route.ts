import { NextResponse } from "next/server";
import { updateProfileLocation } from "@/app/profile/actions";
import type { MobileApiError, MobileApiResponse, MobileUpdateLocationInput } from "@/lib/mobile-api/types";

export async function PATCH(req: Request) {
  const payload = (await req.json().catch(() => null)) as MobileUpdateLocationInput | null;
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, error: "invalid_payload" } satisfies MobileApiError, {
      status: 400,
    });
  }

  const result = await updateProfileLocation(payload);
  if (!result.ok) {
    const error = result.error.toLowerCase().includes("sign in") ? "not_signed_in" : "update_failed";
    const status = error === "not_signed_in" ? 401 : 400;
    return NextResponse.json({ ok: false, error } satisfies MobileApiError, { status });
  }

  return NextResponse.json({ ok: true, data: null } satisfies MobileApiResponse<null>);
}


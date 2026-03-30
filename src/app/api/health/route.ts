import { NextResponse } from "next/server";

/** Sanity check: if this 404s on Vercel, routing/build output is wrong — not app code. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "prod.me" });
}

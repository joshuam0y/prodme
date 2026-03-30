import { headers } from "next/headers";

/** Origin for auth redirect URLs from Server Actions / Route Handlers. */
export async function getServerOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host != null ? `${proto}://${host}` : "http://localhost:3000";
}

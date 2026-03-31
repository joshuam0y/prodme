import { NextResponse } from "next/server";
import { cityFromAddress, neighborhoodFromAddress } from "@/lib/nominatim";

const USER_AGENT = "prodLink/1.0 (profile location; +https://prodlink.app)";

type ReverseBody = {
  address?: Record<string, string>;
  display_name?: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ ok: false, error: "invalid_coords" }, { status: 400 });
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ ok: false, error: "invalid_coords" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("addressdetails", "1");
  const nomEmail = (process.env.NOMINATIM_EMAIL ?? "").trim();
  if (nomEmail) {
    url.searchParams.set("email", nomEmail);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "upstream_failed" }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: "upstream_error" }, { status: 502 });
  }

  const data = (await res.json()) as ReverseBody;
  const addr = data.address ?? {};
  const city = cityFromAddress(addr);
  const neighborhood = neighborhoodFromAddress(addr);

  return NextResponse.json({
    ok: true,
    city: city || null,
    neighborhood: neighborhood || null,
    displayName: data.display_name ?? null,
  });
}

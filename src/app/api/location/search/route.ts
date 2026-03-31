import { NextResponse } from "next/server";
import { cityFromAddress, neighborhoodFromAddress } from "@/lib/nominatim";

const USER_AGENT = "prodLink/1.0 (profile location; +https://prodlink.app)";

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, results: [] as unknown[] });
  }
  if (q.length > 200) {
    return NextResponse.json({ ok: false, error: "query_too_long" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "6");
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

  const data = (await res.json()) as NominatimHit[];
  const results = (Array.isArray(data) ? data : []).map((hit) => {
    const addr = hit.address ?? {};
    const city = cityFromAddress(addr);
    const neighborhood = neighborhoodFromAddress(addr);
    return {
      lat: Number(hit.lat),
      lon: Number(hit.lon),
      label: hit.display_name,
      city: city || undefined,
      neighborhood: neighborhood || undefined,
    };
  });

  return NextResponse.json({ ok: true, results });
}

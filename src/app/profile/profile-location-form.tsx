"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { updateProfileLocation } from "./actions";

type Props = {
  initial: {
    city: string;
    neighborhood: string;
    latitude: number | null;
    longitude: number | null;
    radiusKm: number;
  };
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30";

function MapFlyTo({
  lat,
  lng,
  zoom,
  token,
}: {
  lat: number;
  lng: number;
  zoom: number;
  token: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (token === 0) return;
    map.flyTo([lat, lng], zoom, { duration: 0.55 });
  }, [token, lat, lng, zoom, map]);
  return null;
}

const pinIcon = L.divIcon({
  html: '<div style="height:14px;width:14px;border-radius:9999px;background:#f59e0b;border:2px solid #fff;box-shadow:0 0 0 6px rgba(245,158,11,.25)"></div>',
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function PinPlacer({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type SearchHit = {
  lat: number;
  lon: number;
  label: string;
  city?: string;
  neighborhood?: string;
};

export function ProfileLocationForm({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [city, setCity] = useState(initial.city);
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood);
  const [radiusKm, setRadiusKm] = useState(initial.radiusKm);
  const [lat, setLat] = useState<number | null>(initial.latitude);
  const [lng, setLng] = useState<number | null>(initial.longitude);
  const [message, setMessage] = useState<string | null>(null);
  const [flyToken, setFlyToken] = useState(0);
  const mounted = typeof window !== "undefined";

  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<number | null>(null);

  const reverseDebounceRef = useRef<number | null>(null);

  const dirty =
    city !== initial.city ||
    neighborhood !== initial.neighborhood ||
    radiusKm !== initial.radiusKm ||
    lat !== initial.latitude ||
    lng !== initial.longitude;

  const mapCenter = useMemo<[number, number]>(() => {
    if (initial.latitude != null && initial.longitude != null) {
      return [initial.latitude, initial.longitude];
    }
    return [40.73061, -73.935242];
  }, [initial.latitude, initial.longitude]);

  const mapZoom = initial.latitude != null && initial.longitude != null ? 13 : 11;

  const fetchReverse = useCallback(async (nextLat: number, nextLng: number) => {
    try {
      const res = await fetch(
        `/api/location/reverse?lat=${encodeURIComponent(String(nextLat))}&lon=${encodeURIComponent(String(nextLng))}`,
      );
      const json = (await res.json()) as {
        ok: boolean;
        city?: string | null;
        neighborhood?: string | null;
      };
      if (!res.ok || !json.ok) return;
      if (json.city) setCity(json.city);
      if (json.neighborhood) setNeighborhood(json.neighborhood);
    } catch {
      /* optional */
    }
  }, []);

  const scheduleReverse = useCallback(
    (nextLat: number, nextLng: number) => {
      if (reverseDebounceRef.current !== null) {
        window.clearTimeout(reverseDebounceRef.current);
      }
      reverseDebounceRef.current = window.setTimeout(() => {
        void fetchReverse(nextLat, nextLng);
      }, 450);
    },
    [fetchReverse],
  );

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current !== null) window.clearTimeout(searchDebounceRef.current);
      if (reverseDebounceRef.current !== null) window.clearTimeout(reverseDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchHits([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    if (searchDebounceRef.current !== null) window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/location/search?q=${encodeURIComponent(q)}`);
          const json = (await res.json()) as { ok: boolean; results?: SearchHit[] };
          if (res.ok && json.ok && Array.isArray(json.results)) {
            setSearchHits(json.results);
          } else {
            setSearchHits([]);
          }
        } catch {
          setSearchHits([]);
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 380);
  }, [searchQ]);

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfileLocation({
        city,
        neighborhood,
        latitude: lat,
        longitude: lng,
        location_radius_km: radiusKm,
      });
      setMessage(result.ok ? "Location saved." : result.error);
    });
  };

  const hasPin = lat !== null && lng !== null;

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
      <h2 className="text-sm font-semibold text-zinc-100">Location</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Search a place, tap the map to drop your pin, or drag the pin. We&apos;ll suggest city and
        neighborhood from the pin (you can edit).
      </p>
      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200/95">
          {message}
        </p>
      ) : null}

      <div className="relative mt-6">
        <label className="block text-xs font-medium text-zinc-500">
          Search area
          <input
            type="text"
            value={searchQ}
            onChange={(e) => {
              setSearchQ(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Neighborhood, city, venue, address…"
            className={fieldClass}
            autoComplete="off"
          />
        </label>
        {searchOpen && (searchHits.length > 0 || searchLoading) ? (
          <ul className="absolute z-[1000] mt-1 max-h-52 w-full overflow-auto rounded-xl border border-white/10 bg-zinc-950 py-1 text-sm shadow-xl">
            {searchLoading ? (
              <li className="px-3 py-2 text-xs text-zinc-500">Searching…</li>
            ) : (
              searchHits.map((h, i) => (
                <li key={`${h.lat}-${h.lon}-${i}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5"
                    onClick={() => {
                      setLat(h.lat);
                      setLng(h.lon);
                      if (h.city) setCity(h.city);
                      if (h.neighborhood) setNeighborhood(h.neighborhood);
                      setSearchQ("");
                      setSearchHits([]);
                      setSearchOpen(false);
                      setFlyToken((t) => t + 1);
                    }}
                  >
                    {h.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-zinc-500">
          City
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Los Angeles"
            className={fieldClass}
          />
        </label>
        <label className="block text-xs font-medium text-zinc-500">
          Neighborhood
          <input
            type="text"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="e.g. Silver Lake"
            className={fieldClass}
          />
        </label>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Match distance: {radiusKm} km
        </p>
        <input
          type="range"
          min={1}
          max={200}
          step={1}
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          className="mt-2 w-full"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
        {mounted ? (
          <div className="relative">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              className="h-72 w-full"
              scrollWheelZoom
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {hasPin ? <MapFlyTo lat={lat!} lng={lng!} zoom={14} token={flyToken} /> : null}
              <PinPlacer
                onPick={(nextLat, nextLng) => {
                  setLat(nextLat);
                  setLng(nextLng);
                  scheduleReverse(nextLat, nextLng);
                }}
              />
              {hasPin ? (
                <Marker
                  position={[lat!, lng!]}
                  icon={pinIcon}
                  draggable
                  eventHandlers={{
                    dragend: (e) => {
                      const p = e.target.getLatLng();
                      setLat(p.lat);
                      setLng(p.lng);
                      scheduleReverse(p.lat, p.lng);
                    },
                  }}
                />
              ) : null}
            </MapContainer>
          </div>
        ) : (
          <div className="h-72 bg-zinc-900/40" />
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Pin: {lat?.toFixed(5) ?? "—"}, {lng?.toFixed(5) ?? "—"}
      </p>
      <p className="mt-1 text-[11px] text-zinc-600">
        Search &amp; map data: OpenStreetMap / Nominatim. Don&apos;t abuse — for personal profile
        use only.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition((pos) => {
              const la = pos.coords.latitude;
              const lo = pos.coords.longitude;
              setLat(la);
              setLng(lo);
              setFlyToken((t) => t + 1);
              scheduleReverse(la, lo);
            });
          }}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
        >
          Use current location
        </button>
        <button
          type="button"
          disabled={lat === null || lng === null}
          onClick={() => {
            if (lat === null || lng === null) return;
            void fetchReverse(lat, lng);
          }}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-40"
        >
          Refresh labels from pin
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-40"
        >
          {pending ? "Saving..." : "Save location"}
        </button>
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() => {
            setCity(initial.city);
            setNeighborhood(initial.neighborhood);
            setRadiusKm(initial.radiusKm);
            setLat(initial.latitude);
            setLng(initial.longitude);
            setMessage(null);
            setSearchQ("");
            setSearchHits([]);
            setSearchOpen(false);
          }}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-40"
        >
          Reset unsaved changes
        </button>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
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

function MapCenterSync({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

function PinMoveWatcher({
  onChange,
}: {
  onChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    moveend(e) {
      const c = e.target.getCenter();
      onChange(c.lat, c.lng);
    },
  });
  return null;
}

export function ProfileLocationForm({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [city, setCity] = useState(initial.city);
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood);
  const [radiusKm, setRadiusKm] = useState(initial.radiusKm);
  const [lat, setLat] = useState<number | null>(initial.latitude);
  const [lng, setLng] = useState<number | null>(initial.longitude);
  const [message, setMessage] = useState<string | null>(null);
  const mounted = typeof window !== "undefined";

  const center = useMemo<[number, number]>(() => {
    if (lat !== null && lng !== null) return [lat, lng];
    return [40.73061, -73.935242];
  }, [lat, lng]);

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

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
      <h2 className="text-sm font-semibold text-zinc-100">Location</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Drag the map to place your neighborhood pin and set how far you want to match.
      </p>
      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200/95">
          {message}
        </p>
      ) : null}

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
              center={center}
              zoom={12}
              className="h-72 w-full"
              scrollWheelZoom
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <MapCenterSync lat={center[0]} lng={center[1]} />
              <PinMoveWatcher
                onChange={(nextLat, nextLng) => {
                  setLat(nextLat);
                  setLng(nextLng);
                }}
              />
            </MapContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full border-2 border-white bg-amber-500 shadow-[0_0_0_6px_rgba(245,158,11,0.25)]" />
            </div>
          </div>
        ) : (
          <div className="h-72 bg-zinc-900/40" />
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Pin: {lat?.toFixed(5) ?? "—"}, {lng?.toFixed(5) ?? "—"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition((pos) => {
              setLat(pos.coords.latitude);
              setLng(pos.coords.longitude);
            });
          }}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
        >
          Use current location
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-40"
        >
          {pending ? "Saving..." : "Save location"}
        </button>
      </div>
    </section>
  );
}

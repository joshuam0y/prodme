"use client";

import { useMemo, useState, useTransition } from "react";
import { setProfileRating } from "@/app/ratings/actions";

function StarButton({
  value,
  active,
  onPick,
  disabled,
}: {
  value: number;
  active: boolean;
  onPick: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      disabled={disabled}
      aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
      className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${
        active
          ? "border-amber-400/60 bg-amber-500/15 text-amber-300"
          : "border-white/10 bg-white/5 text-white/30 hover:bg-white/10 hover:text-amber-200"
      } disabled:opacity-50`}
    >
      ★
    </button>
  );
}

export function ProfileRatingEditor({
  targetId,
  initialRating,
}: {
  targetId: string;
  initialRating?: number | null;
}) {
  const [rating, setRating] = useState<number | null>(
    typeof initialRating === "number" ? initialRating : null,
  );
  const [savedRating, setSavedRating] = useState<number | null>(
    typeof initialRating === "number" ? initialRating : null,
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const stars = useMemo(() => Array.from({ length: 5 }).map((_, i) => i + 1), []);

  async function save() {
    if (!rating) return;
    setMessage(null);
    startTransition(async () => {
      const res = await setProfileRating(targetId, rating);
      if (!res.ok) {
        setMessage(res.error ?? "Couldn't save rating.");
        return;
      }
      setSavedRating(res.rating ?? rating);
      setMessage("Saved.");
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Rate this profile
      </p>
      <div className="mt-2 flex items-center gap-1">
        {stars.map((v) => (
          <StarButton
            key={v}
            value={v}
            active={rating !== null ? v <= rating : false}
            onPick={setRating}
            disabled={pending}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={pending || rating === null}
          className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-40"
        >
          {pending ? "Saving…" : savedRating ? "Update rating" : "Save rating"}
        </button>
        {message ? <p className="text-xs text-zinc-300">{message}</p> : null}
      </div>
    </div>
  );
}


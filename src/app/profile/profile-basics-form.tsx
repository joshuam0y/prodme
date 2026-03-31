"use client";

import { useState, useTransition } from "react";
import { updateProfileBasics } from "./actions";

type Props = {
  initial: {
    displayName: string;
    niche: string;
    goal: string;
    city: string;
  };
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30";

export function ProfileBasicsForm({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [niche, setNiche] = useState(initial.niche);
  const [goal, setGoal] = useState(initial.goal);
  const [city, setCity] = useState(initial.city);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
      <h2 className="text-sm font-semibold text-zinc-100">Quick profile edits</h2>
      <p className="mt-1 text-sm text-zinc-500">Change only what you want and save.</p>
      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200/95">
          {message}
        </p>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-zinc-500">
          Display name
          <input className={fieldClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="block text-xs font-medium text-zinc-500">
          City
          <input className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-zinc-500">
          Style
          <input className={fieldClass} value={niche} onChange={(e) => setNiche(e.target.value)} />
        </label>
        <label className="block text-xs font-medium text-zinc-500">
          Goal
          <input className={fieldClass} value={goal} onChange={(e) => setGoal(e.target.value)} />
        </label>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await updateProfileBasics({
              display_name: displayName,
              niche,
              goal,
              city,
            });
            setMessage(result.ok ? "Profile updated." : result.error);
          })
        }
        className="mt-6 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-40"
      >
        {pending ? "Saving..." : "Save changes"}
      </button>
    </section>
  );
}

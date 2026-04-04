"use client";

import { useState, useTransition } from "react";
import type { PublicVisibilityKey } from "@/lib/public-visibility";
import { isPublicFieldVisible } from "@/lib/public-visibility";
import type { SocialLink } from "@/lib/social-links";
import { updateProfilePrivacySocial } from "./actions";

type Props = {
  initialVisibility: unknown;
  initialLinks: SocialLink[];
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30";

const toggles: { key: PublicVisibilityKey; label: string; hint: string }[] = [
  {
    key: "member_details",
    label: "Member details",
    hint: "Signed up and last seen on your public profile.",
  },
  {
    key: "location",
    label: "Location",
    hint: "City, neighborhood, and distance when someone views your profile.",
  },
  { key: "goal", label: "Current focus / goal", hint: "Your goal section on the public page." },
  {
    key: "looking_for",
    label: "Looking for",
    hint: "The “looking for” or booking-fit block.",
  },
  { key: "prompts", label: "Prompts", hint: "Both profile prompts and answers." },
  { key: "niche", label: "Sound / style", hint: "Style line and sound section when shown." },
  {
    key: "beats",
    label: "Tracks & photos",
    hint: "Featured track, extra previews, and gallery media from those previews.",
  },
];

function initialVisible(key: PublicVisibilityKey, raw: unknown): boolean {
  return isPublicFieldVisible(key, raw);
}

export function ProfilePrivacySocialForm({ initialVisibility, initialLinks }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [vis, setVis] = useState<Record<PublicVisibilityKey, boolean>>(() => {
    const o = {} as Record<PublicVisibilityKey, boolean>;
    for (const { key } of toggles) {
      o[key] = initialVisible(key, initialVisibility);
    }
    return o;
  });
  const [links, setLinks] = useState<SocialLink[]>(
    initialLinks.length ? initialLinks : [{ label: "", url: "" }],
  );

  function setLink(index: number, patch: Partial<SocialLink>) {
    setLinks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addLink() {
    if (links.length >= 6) return;
    setLinks((prev) => [...prev, { label: "", url: "" }]);
  }

  function removeLink(index: number) {
    setLinks((prev) => (prev.length <= 1 ? [{ label: "", url: "" }] : prev.filter((_, i) => i !== index)));
  }

  function save() {
    setMessage(null);
    const cleaned: SocialLink[] = links
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
      .filter((l) => l.label.length > 0 || l.url.length > 0);
    startTransition(async () => {
      const res = await updateProfilePrivacySocial({
        visibility: vis,
        social_links: cleaned,
      });
      setMessage(res.ok ? "Saved." : res.error);
    });
  }

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/35 p-6">
      <h2 className="text-lg font-semibold text-zinc-100">Public profile &amp; links</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Choose what appears on your public page. Discover may still use your style and prompts for matching.
      </p>

      <fieldset className="mt-6 space-y-4">
        <legend className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Visible on public profile
        </legend>
        {toggles.map(({ key, label, hint }) => (
          <label
            key={key}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/5 bg-zinc-950/30 px-4 py-3"
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-white/20 bg-zinc-900 text-amber-500 focus:ring-amber-500/40"
              checked={vis[key]}
              onChange={(e) => setVis((s) => ({ ...s, [key]: e.target.checked }))}
            />
            <span>
              <span className="font-medium text-zinc-200">{label}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="mt-8">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Social &amp; web links</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Up to six links (Instagram, SoundCloud, Linktree, etc.). URLs must use{" "}
          <code className="text-zinc-400">https://</code>.
        </p>
        <ul className="mt-4 space-y-4">
          {links.map((link, index) => (
            <li key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <label className="text-xs text-zinc-500" htmlFor={`social-label-${index}`}>
                  Label
                </label>
                <input
                  id={`social-label-${index}`}
                  className={fieldClass}
                  value={link.label}
                  onChange={(e) => setLink(index, { label: e.target.value })}
                  placeholder="Instagram"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500" htmlFor={`social-url-${index}`}>
                  URL
                </label>
                <input
                  id={`social-url-${index}`}
                  className={fieldClass}
                  value={link.url}
                  onChange={(e) => setLink(index, { url: e.target.value })}
                  placeholder="https://…"
                  inputMode="url"
                  autoComplete="url"
                />
              </div>
              <button
                type="button"
                className="rounded-xl border border-white/10 px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
                onClick={() => removeLink(index)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {links.length < 6 ? (
          <button
            type="button"
            className="mt-3 text-sm font-medium text-amber-400/90 hover:text-amber-300"
            onClick={addLink}
          >
            + Add link
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="inline-flex justify-center rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save privacy & links"}
        </button>
        {message ? (
          <p className={`text-sm ${message === "Saved." ? "text-emerald-400/90" : "text-red-400/90"}`}>
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

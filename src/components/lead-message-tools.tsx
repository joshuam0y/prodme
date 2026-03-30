"use client";

import { useMemo, useState } from "react";

type Props = {
  displayName: string;
  roleLabel: string;
  context: "saved" | "interested";
  defaultDraft?: string | null;
  textareaName?: string;
};

function templatesFor(
  displayName: string,
  roleLabel: string,
  context: "saved" | "interested",
): string[] {
  const base = [
    `Hey ${displayName} — your profile stood out. What kind of ${roleLabel.toLowerCase()} collabs are you most excited about right now?`,
    `Hi ${displayName}! Quick one: if we started something this week, what would be the best first step on your side?`,
    `${displayName}, your vibe is super strong. Want to trade one idea each and see if there's a fit?`,
  ];
  if (context === "interested") {
    return [
      `Hey ${displayName} — I'd love to move this forward. Are you open for a quick call this week?`,
      `Hi ${displayName}! I'm interested in working together. What timeline are you aiming for right now?`,
      ...base,
    ];
  }
  return base;
}

export function LeadMessageTools({
  displayName,
  roleLabel,
  context,
  defaultDraft,
  textareaName = "draft",
}: Props) {
  const suggestions = useMemo(
    () => templatesFor(displayName, roleLabel, context),
    [displayName, roleLabel, context],
  );
  const [draft, setDraft] = useState(defaultDraft ?? "");
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Message style
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">
        Keep it short, warm, and specific (like a Hinge opener).
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setDraft(s)}
            className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-zinc-300 transition hover:bg-white/5"
          >
            Use opener {i + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(draft);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            } catch {
              setCopied(false);
            }
          }}
          className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 transition hover:bg-emerald-500/20"
        >
          {copied ? "Copied" : "Copy message"}
        </button>
      </div>
      <textarea
        name={textareaName}
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="mt-3 w-full rounded-md border border-white/10 bg-zinc-900/70 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/60"
        placeholder={`Hey ${displayName}, would love to connect about...`}
      />
    </div>
  );
}

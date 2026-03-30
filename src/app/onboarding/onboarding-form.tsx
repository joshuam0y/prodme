"use client";

import { completeOnboarding } from "@/app/auth/actions";
import { useTransition } from "react";
import { useState } from "react";

function isVenueRole(role?: string) {
  const s = (role ?? "").toLowerCase();
  return s.includes("venue") || s.includes("promoter");
}

function stepsForRole(role?: string) {
  const venue = isVenueRole(role);

  return [
    {
      id: "role",
      title: "What do you do?",
      subtitle: "We’ll tune discovery and copy to your side of the table.",
      options: ["Producer", "Artist / vocalist", "DJ", "Venue / promoter"],
    },
    {
      id: "niche",
      title: venue ? "What kind of events do you run?" : "What’s your niche?",
      subtitle: venue
        ? "Tell us your vibe and audience — be specific."
        : "Genres, moods, or scenes — be specific.",
      placeholder: venue
        ? "e.g. 200-cap electronic nights, live hip-hop, jazz brunches…"
        : "e.g. melodic trap, UK garage, R&B hooks…",
    },
    {
      id: "goal",
      title: venue
        ? "What are you trying to do for your next event?"
        : "What are you trying to do right now?",
      subtitle: venue
        ? "Book talent, hire DJs, and fill the lineup — pick what fits."
        : "Sell beats, get booked, find collabs — pick what fits.",
      options: venue
        ? ["Book performers for events", "Hire DJs / openers", "Find producers / artists"]
        : ["Sell beats or bundles", "Get gigs or placements", "Find collaborators"],
    },
  ];
}

type Props = {
  error?: string;
};

export function OnboardingForm({ error }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const steps = stepsForRole(answers.role);
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  const canNext =
    current.id === "niche"
      ? Boolean((answers.niche ?? "").trim().length)
      : Boolean(answers[current.id]);

  const setAnswer = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
  };

  const submit = () => {
    const role = answers.role;
    const niche = answers.niche;
    const goal = answers.goal;
    if (!role || !niche?.trim() || !goal) return;

    startTransition(() => {
      completeOnboarding({
        display_name: answers.display_name ?? "",
        role,
        niche: niche.trim(),
        goal,
        city: (answers.city ?? "").trim(),
      });
    });
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {error ? (
        <p className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error === "not_configured"
            ? "Supabase is not configured."
            : decodeURIComponent(error)}
        </p>
      ) : null}

      <div key={current.id}>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          {current.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">{current.subtitle}</p>

        {step === 0 ? (
          <div className="mt-8">
            <label
              htmlFor="display_name"
              className="text-xs font-medium text-zinc-500"
            >
              Name or artist / brand (optional)
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              autoComplete="nickname"
              placeholder="How you want to appear"
              value={answers.display_name ?? ""}
              onChange={(e) => setAnswer("display_name", e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
          </div>
        ) : null}

        {"options" in current && current.options ? (
          <ul className="mt-8 space-y-2">
            {current.options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => setAnswer(current.id, opt)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    answers[current.id] === opt
                      ? "border-amber-500/60 bg-amber-500/10 text-zinc-100"
                      : "border-white/10 bg-zinc-900/50 text-zinc-300 hover:border-white/20"
                  }`}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 space-y-6">
            <textarea
              className="w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              rows={4}
              placeholder={"placeholder" in current ? current.placeholder : ""}
              value={answers.niche ?? ""}
              onChange={(e) => setAnswer("niche", e.target.value)}
            />
            <div>
              <label
                htmlFor="city"
                className="text-xs font-medium text-zinc-500"
              >
                City or region (optional)
              </label>
              <input
                id="city"
                name="city"
                type="text"
                autoComplete="address-level2"
                placeholder="e.g. London, Atlanta, Berlin"
                value={answers.city ?? ""}
                onChange={(e) => setAnswer("city", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 flex justify-between gap-4">
        <button
          type="button"
          disabled={step === 0 || pending}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-zinc-400 transition enabled:hover:bg-white/5 disabled:opacity-30"
        >
          Back
        </button>
        {isLast ? (
          <button
            type="button"
            disabled={!canNext || pending}
            onClick={submit}
            className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-40"
          >
            {pending ? "Saving…" : "Finish"}
          </button>
        ) : (
          <button
            type="button"
            disabled={!canNext || pending}
            onClick={() => setStep((s) => s + 1)}
            className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-40"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

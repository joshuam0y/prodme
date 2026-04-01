"use client";

import { completeOnboarding } from "@/app/auth/actions";
import { useEffect, useRef, useState, useTransition } from "react";
import { getProfilePromptOptions } from "@/lib/profile-prompts";

function isVenueRole(role?: string) {
  const s = (role ?? "").toLowerCase();
  return s.includes("venue") || s.includes("promoter");
}

function roleHint(role?: string) {
  const value = (role ?? "").toLowerCase();
  if (value.includes("engineer")) {
    return "Lead with the records you help shape, the kind of artists you work best with, and what someone would actually reach out to you for.";
  }
  if (value.includes("producer")) {
    return "The strongest producer profiles feel specific: sound, sessions, placements, and what kind of artist or collaborator should message you.";
  }
  if (value.includes("dj")) {
    return "The best DJ profiles describe the rooms, crowds, and energy you fit, not just the genre name.";
  }
  if (value.includes("artist") || value.includes("vocal")) {
    return "Think like a conversation starter: show your taste, your current direction, and what kind of collaborator actually helps you move.";
  }
  if (isVenueRole(role)) {
    return "The best venue profiles make the room feel real: crowd, capacity, sound, professionalism, and what makes an artist a good fit.";
  }
  return "Specific profiles get better matches and easier first messages.";
}

function stepExample(stepId: string, role?: string) {
  const venue = isVenueRole(role);
  const value = (role ?? "").toLowerCase();

  if (stepId === "role") {
    return "Choose the lane that should shape your discover feed and profile copy.";
  }
  if (stepId === "niche") {
    if (venue) return "Good example: Curated electronic nights for a 200-cap room with a local crowd that shows up early.";
    if (value.includes("engineer")) return "Good example: Clean but punchy hip-hop and alt-R&B mixes, vocal production, and session-ready roughs.";
    if (value.includes("producer")) return "Good example: Sample-heavy rap production, darker late-night R&B, and melodic trap drums.";
    if (value.includes("dj")) return "Good example: Fast club edits, Afro-house transitions, and late-night sets that keep the room moving.";
    return "Good example: Airy alt-pop hooks, intimate live sets, and melodic writing with a darker edge.";
  }
  if (stepId === "goal") {
    if (venue) return "Pick the one that matches what you need next, not every possible use case.";
    return "Pick the one that would make this app feel successful for you in the next few weeks.";
  }
  if (stepId === "looking_for") {
    if (venue) return "Good example: Artists with a real live show, solid promo habits, and a sound that fits our Thursday room.";
    if (value.includes("engineer")) return "Good example: Independent artists who already have strong demos and want help finishing clean, emotional records.";
    return "Good example: Vocalists for hooks, producers for co-production, DJs for swaps, and indie venues for live sets.";
  }
  return null;
}

function stepsForRole(role?: string) {
  const venue = isVenueRole(role);

  return [
    {
      id: "role",
      title: "What do you do?",
      subtitle: "We’ll tune discovery and copy to your side of the table.",
      options: ["Producer", "Artist / vocalist", "DJ", "Engineer", "Venue / promoter"],
    },
    {
      id: "niche",
      title: venue ? "What kind of events do you run?" : "What’s your style?",
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
    {
      id: "looking_for",
      title: venue ? "What kind of artists are you looking for?" : "Who are you looking to meet?",
      subtitle: venue
        ? "Describe the artist fit, draw, energy, or professionalism you want."
        : "Be clear about the collaborators, sessions, bookings, or opportunities you want.",
      placeholder: venue
        ? "e.g. Artists with a real live show, a local draw, and a sound that fits our room"
        : "e.g. Vocalists for sessions, producers for co-production, DJs for swaps, indie venues for shows",
    },
  ];
}

type Props = {
  error?: string;
};

type SearchHit = {
  lat: number;
  lon: number;
  label: string;
  city?: string;
  neighborhood?: string;
};

export function OnboardingForm({ error }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<number | null>(null);

  const steps = stepsForRole(answers.role);
  const current = steps[step];
  const promptOptions = getProfilePromptOptions(answers.role);
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;
  const currentExample = stepExample(current.id, answers.role);

  const canNext =
    current.id === "niche" || current.id === "looking_for"
      ? Boolean((answers[current.id] ?? "").trim().length)
      : Boolean(answers[current.id]);
  const profileSignals = [
    Boolean((answers.display_name ?? "").trim()),
    Boolean(answers.role),
    Boolean((answers.niche ?? "").trim()),
    Boolean(answers.goal),
    Boolean((answers.looking_for ?? "").trim()),
    Boolean((answers.city ?? "").trim() || (answers.neighborhood ?? "").trim()),
  ];
  const completeness = Math.round(
    (profileSignals.filter(Boolean).length / profileSignals.length) * 100,
  );
  const prompt1Question = (answers.prompt_1_question ?? "").trim();
  const prompt1Answer = (answers.prompt_1_answer ?? "").trim();
  const prompt2Question = (answers.prompt_2_question ?? "").trim();
  const prompt2Answer = (answers.prompt_2_answer ?? "").trim();
  const duplicatePrompts =
    Boolean(prompt1Question) &&
    Boolean(prompt2Question) &&
    prompt1Question === prompt2Question;
  const prompt2Incomplete =
    (Boolean(prompt2Question) && !Boolean(prompt2Answer)) ||
    (Boolean(prompt2Answer) && !Boolean(prompt2Question));

  const setAnswer = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current !== null) window.clearTimeout(searchDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (current.id !== "niche") {
      setSearchOpen(false);
      return;
    }
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
  }, [current.id, searchQ]);

  const submit = () => {
    const role = answers.role;
    const niche = answers.niche;
    const goal = answers.goal;
    const lookingFor = (answers.looking_for ?? "").trim();
    if (!role || !niche?.trim() || !goal || !lookingFor || !prompt1Question || !prompt1Answer || duplicatePrompts || prompt2Incomplete) return;

    startTransition(() => {
      completeOnboarding({
        display_name: answers.display_name ?? "",
        role,
        niche: niche.trim(),
        goal,
        city: (answers.city ?? "").trim(),
        neighborhood: (answers.neighborhood ?? "").trim(),
        latitude: answers.latitude ? Number(answers.latitude) : null,
        longitude: answers.longitude ? Number(answers.longitude) : null,
        looking_for: lookingFor,
        prompt_1_question: prompt1Question,
        prompt_1_answer: prompt1Answer,
        prompt_2_question: prompt2Question,
        prompt_2_answer: prompt2Answer,
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
      <div className="mb-6 rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Profile completeness: {completeness}%
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Add your role, style, goal, and location to rank higher and get better matches.
        </p>
      </div>
      {answers.role ? (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">
            Build a stronger profile
          </p>
          <p className="mt-1 text-sm text-zinc-300">{roleHint(answers.role)}</p>
        </div>
      ) : null}

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
        {currentExample ? (
          <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-zinc-400">
            {currentExample}
          </p>
        ) : null}

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
              value={(answers[current.id] ?? "")}
              onChange={(e) => setAnswer(current.id, e.target.value)}
            />
            {current.id === "niche" ? (
              <div>
                <label htmlFor="location_search" className="text-xs font-medium text-zinc-500">
                  Location (optional)
                </label>
                <div className="relative">
                  <input
                    id="location_search"
                    name="location_search"
                    type="text"
                    autoComplete="off"
                    placeholder="Search neighborhood, city, venue, address..."
                    value={searchQ}
                    onChange={(e) => {
                      setSearchQ(e.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                  />
                  {searchOpen && (searchHits.length > 0 || searchLoading) ? (
                    <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-white/10 bg-zinc-950 py-1 text-sm shadow-xl">
                      {searchLoading ? (
                        <li className="px-3 py-2 text-xs text-zinc-500">Searching...</li>
                      ) : (
                        searchHits.map((hit, i) => (
                          <li key={`${hit.lat}-${hit.lon}-${i}`}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5"
                              onClick={() => {
                                setAnswer("city", hit.city ?? "");
                                setAnswer("neighborhood", hit.neighborhood ?? "");
                                setAnswer("latitude", String(hit.lat));
                                setAnswer("longitude", String(hit.lon));
                                setSearchQ(hit.label);
                                setSearchHits([]);
                                setSearchOpen(false);
                              }}
                            >
                              {hit.label}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="city" className="text-xs font-medium text-zinc-500">
                      City
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      autoComplete="address-level2"
                      placeholder="e.g. Berlin"
                      value={answers.city ?? ""}
                      onChange={(e) => setAnswer("city", e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                    />
                  </div>
                  <div>
                    <label htmlFor="neighborhood" className="text-xs font-medium text-zinc-500">
                      Neighborhood
                    </label>
                    <input
                      id="neighborhood"
                      name="neighborhood"
                      type="text"
                      autoComplete="address-level3"
                      placeholder="e.g. Kreuzberg"
                      value={answers.neighborhood ?? ""}
                      onChange={(e) => setAnswer("neighborhood", e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Search a real place to auto-fill the same location fields used on your profile.
                </p>
              </div>
            ) : null}
          </div>
        )}
        <div className="mt-8 rounded-xl border border-white/10 bg-zinc-900/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Profile prompt 1
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Required. Give people at least one strong conversation starter on your profile.
          </p>
          <label className="mt-4 block text-xs font-medium text-zinc-500">
            Prompt question
            <select
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              value={answers.prompt_1_question ?? ""}
              onChange={(e) => setAnswer("prompt_1_question", e.target.value)}
            >
              <option value="">Choose a prompt...</option>
              {promptOptions.map((option) => (
                <option key={option.question} value={option.question}>
                  {option.question}
                </option>
              ))}
            </select>
          </label>
          {prompt1Question ? (
            <p className="mt-2 text-xs text-zinc-500">
              {promptOptions.find((option) => option.question === prompt1Question)?.cue ||
                "Answer this in a way that gives someone an easy opener."}
            </p>
          ) : null}
          <label className="mt-4 block text-xs font-medium text-zinc-500">
            Prompt answer
            <textarea
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              rows={3}
              value={answers.prompt_1_answer ?? ""}
              onChange={(e) => setAnswer("prompt_1_answer", e.target.value)}
              placeholder="Give people something specific to reply to..."
            />
          </label>
        </div>
        <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Profile prompt 2
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Optional for now. If you add it, use a different question and fill in both fields.
          </p>
          <label className="mt-4 block text-xs font-medium text-zinc-500">
            Prompt question
            <select
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              value={answers.prompt_2_question ?? ""}
              onChange={(e) => setAnswer("prompt_2_question", e.target.value)}
            >
              <option value="">Choose a second prompt...</option>
              {promptOptions
                .filter((option) => option.question !== prompt1Question)
                .map((option) => (
                  <option key={option.question} value={option.question}>
                    {option.question}
                  </option>
                ))}
            </select>
          </label>
          {prompt2Question ? (
            <p className="mt-2 text-xs text-zinc-500">
              {promptOptions.find((option) => option.question === prompt2Question)?.cue ||
                "Keep it specific enough that someone could reply to it."}
            </p>
          ) : null}
          <label className="mt-4 block text-xs font-medium text-zinc-500">
            Prompt answer
            <textarea
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              rows={3}
              value={answers.prompt_2_answer ?? ""}
              onChange={(e) => setAnswer("prompt_2_answer", e.target.value)}
              placeholder="Optional second angle..."
            />
          </label>
          {duplicatePrompts ? (
            <p className="mt-3 text-xs text-red-300">Choose a different question for prompt 2.</p>
          ) : null}
          {prompt2Incomplete ? (
            <p className="mt-3 text-xs text-red-300">If you add a second prompt, include both the question and answer.</p>
          ) : null}
        </div>
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

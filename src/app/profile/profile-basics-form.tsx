"use client";

import { useMemo, useState, useTransition } from "react";
import {
  getProfilePromptHeading,
  getProfilePromptOptions,
  getProfilePromptSubheading,
  isVenueProfileRole,
} from "@/lib/profile-prompts";
import { generateProfileBasicsSuggestions, updateProfileBasics } from "./actions";

type Props = {
  initial: {
    displayName: string;
    role: string;
    niche: string;
    goal: string;
    city: string;
    lookingFor: string;
    prompt1Q: string;
    prompt1A: string;
    prompt2Q: string;
    prompt2A: string;
  };
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30";

export function ProfileBasicsForm({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [aiPending, startAiTransition] = useTransition();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [niche, setNiche] = useState(initial.niche);
  const [goal, setGoal] = useState(initial.goal);
  const [city, setCity] = useState(initial.city);
  const [lookingFor, setLookingFor] = useState(initial.lookingFor);
  const [prompt1Q, setPrompt1Q] = useState(initial.prompt1Q);
  const [prompt1A, setPrompt1A] = useState(initial.prompt1A);
  const [prompt2Q, setPrompt2Q] = useState(initial.prompt2Q);
  const [prompt2A, setPrompt2A] = useState(initial.prompt2A);
  const [message, setMessage] = useState<string | null>(null);
  const [aiMeta, setAiMeta] = useState<{
    summary: string;
    strengths: string[];
    improvements: string[];
    nextStep: string | null;
    tags: string[];
    score: number;
  } | null>(null);
  const isVenue = useMemo(() => isVenueProfileRole(initial.role), [initial.role]);
  const promptOptions = useMemo(() => getProfilePromptOptions(initial.role), [initial.role]);
  const promptHeading = useMemo(() => getProfilePromptHeading(initial.role), [initial.role]);
  const promptSubheading = useMemo(() => getProfilePromptSubheading(initial.role), [initial.role]);
  const suggestedPromptOptions = useMemo(() => {
    const current = [prompt1Q, prompt2Q].filter(Boolean);
    const unique = promptOptions.filter(
      (option, index, all) => all.findIndex((entry) => entry.question === option.question) === index,
    );
    return unique.filter((option) => !current.includes(option.question)).slice(0, 8);
  }, [promptOptions, prompt1Q, prompt2Q]);

  function applyPrompt(slot: 1 | 2, question: string) {
    if (slot === 1) {
      setPrompt1Q(question);
      if (!prompt1A.trim()) {
        const cue = promptOptions.find((option) => option.question === question)?.cue ?? "";
        setPrompt1A(cue);
      }
      return;
    }
    setPrompt2Q(question);
    if (!prompt2A.trim()) {
      const cue = promptOptions.find((option) => option.question === question)?.cue ?? "";
      setPrompt2A(cue);
    }
  }

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
          {isVenue ? "Room vibe" : "Style"}
          <input
            className={fieldClass}
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder={
              isVenue
                ? "e.g. Intimate indie room for discovery shows and curated DJ nights"
                : "e.g. Alt-pop with glossy hooks, late-night house, sample-heavy rap production"
            }
          />
        </label>
        <label className="block text-xs font-medium text-zinc-500">
          Goal
          <input
            className={fieldClass}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={
              isVenue
                ? "e.g. Book stronger weekly lineups and build a real local following"
                : "e.g. Finish my next EP, land sessions, and play more local shows"
            }
          />
        </label>
      </div>
      <div className="mt-4">
        <label className="block text-xs font-medium text-zinc-500">
          {isVenue ? "Looking for artists who..." : "Looking for"}
          <input
            className={fieldClass}
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder={
              isVenue
                ? "e.g. Bring a real draw, fit our room, and know how to promote their set"
                : "e.g. Vocalists · Studio sessions · DJ swaps · Venue bookings"
            }
          />
        </label>
      </div>
      <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950/30 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {promptHeading}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {promptSubheading}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-medium text-zinc-400">Try one of these prompt ideas</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedPromptOptions.map((option, index) => (
              <button
                key={option.question}
                type="button"
                onClick={() => applyPrompt(index % 2 === 0 ? 1 : 2, option.question)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/[0.08]"
              >
                {option.question}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid gap-3">
          <label className="block text-xs font-medium text-zinc-500">
            Prompt 1 question
            <select
              className={fieldClass}
              value={prompt1Q}
              onChange={(e) => setPrompt1Q(e.target.value)}
            >
              <option value="">Choose a prompt...</option>
              {promptOptions.map((option) => (
                <option key={option.question} value={option.question}>
                  {option.question}
                </option>
              ))}
            </select>
          </label>
          {prompt1Q ? (
            <p className="text-xs text-zinc-500">
              {promptOptions.find((option) => option.question === prompt1Q)?.cue ||
                "Answer this in a way that gives someone an easy opener."}
            </p>
          ) : null}
          <label className="block text-xs font-medium text-zinc-500">
            Prompt 1 answer
            <textarea
              className={fieldClass}
              rows={3}
              value={prompt1A}
              onChange={(e) => setPrompt1A(e.target.value)}
              placeholder={
                isVenue
                  ? "Give artists a concrete answer that helps them understand the room or your taste..."
                  : "Say it in a sentence or two..."
              }
            />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            Prompt 2 question
            <select
              className={fieldClass}
              value={prompt2Q}
              onChange={(e) => setPrompt2Q(e.target.value)}
            >
              <option value="">Choose a prompt...</option>
              {promptOptions.map((option) => (
                <option key={option.question} value={option.question}>
                  {option.question}
                </option>
              ))}
            </select>
          </label>
          {prompt2Q ? (
            <p className="text-xs text-zinc-500">
              {promptOptions.find((option) => option.question === prompt2Q)?.cue ||
                "Keep it specific enough that someone could reply to it."}
            </p>
          ) : null}
          <label className="block text-xs font-medium text-zinc-500">
            Prompt 2 answer
            <textarea
              className={fieldClass}
              rows={3}
              value={prompt2A}
              onChange={(e) => setPrompt2A(e.target.value)}
              placeholder={
                isVenue
                  ? "Share the crowd, booking taste, or what makes a strong pitch..."
                  : "Artists, genres, vibe..."
              }
            />
          </label>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-100">Profile coach</p>
            <p className="mt-1 text-sm text-zinc-500">
              {isVenue
                ? "Get sharper feedback on whether your room, booking taste, and outreach expectations feel clear."
                : "Get sharper feedback on clarity, tone, and whether your profile feels worth replying to."}
            </p>
          </div>
          <button
            type="button"
            disabled={aiPending}
            onClick={() =>
              startAiTransition(async () => {
                const result = await generateProfileBasicsSuggestions({
                  displayName,
                  role: initial.role,
                  niche,
                  goal,
                  city,
                  lookingFor,
                  prompt1Question: prompt1Q,
                  prompt1Answer: prompt1A,
                  prompt2Question: prompt2Q,
                  prompt2Answer: prompt2A,
                });
                if (!result.ok) {
                  setMessage(result.error);
                  return;
                }
                const { suggestion } = result;
                setNiche(suggestion.niche);
                setGoal(suggestion.goal);
                setLookingFor(suggestion.lookingFor);
                setPrompt1Q(suggestion.prompt1Question);
                setPrompt1A(suggestion.prompt1Answer);
                setPrompt2Q(suggestion.prompt2Question);
                setPrompt2A(suggestion.prompt2Answer);
                setAiMeta({
                  summary: suggestion.summary,
                  strengths: suggestion.strengths ?? [],
                  improvements: suggestion.improvements ?? [],
                  nextStep: suggestion.nextStep ?? null,
                  tags: suggestion.tags,
                  score: suggestion.score,
                });
                setMessage("Suggestions applied locally. Review, then save changes.");
              })
            }
            className="rounded-full border border-amber-500/35 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-40"
          >
            {aiPending ? "Thinking..." : "Improve profile"}
          </button>
        </div>
        {aiMeta ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-zinc-950/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Coach feedback
            </p>
            <p className="mt-2 text-sm text-zinc-300">{aiMeta.summary}</p>
            {aiMeta.strengths.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">
                  What works
                </p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                  {aiMeta.strengths.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {aiMeta.improvements.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">
                  What's unclear
                </p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                  {aiMeta.improvements.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {aiMeta.nextStep ? (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Next fix
                </p>
                <p className="mt-1 text-sm text-zinc-200">{aiMeta.nextStep}</p>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                Clarity {aiMeta.score}/100
              </span>
              {aiMeta.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}
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
              looking_for: lookingFor,
              prompt_1_question: prompt1Q,
              prompt_1_answer: prompt1A,
              prompt_2_question: prompt2Q,
              prompt_2_answer: prompt2A,
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

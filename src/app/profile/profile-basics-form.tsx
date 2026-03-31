"use client";

import { useState, useTransition } from "react";
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
  const [aiMeta, setAiMeta] = useState<{ summary: string; tags: string[]; score: number } | null>(null);

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
      <div className="mt-4">
        <label className="block text-xs font-medium text-zinc-500">
          Looking for
          <input
            className={fieldClass}
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder="e.g. Vocalists · Studio sessions · Venue bookings"
          />
        </label>
      </div>
      <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Prompts (Hinge-style)
        </p>
        <div className="mt-3 grid gap-3">
          <label className="block text-xs font-medium text-zinc-500">
            Prompt 1 question
            <input
              className={fieldClass}
              value={prompt1Q}
              onChange={(e) => setPrompt1Q(e.target.value)}
              placeholder="e.g. Best collab idea right now"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            Prompt 1 answer
            <textarea
              className={fieldClass}
              rows={3}
              value={prompt1A}
              onChange={(e) => setPrompt1A(e.target.value)}
              placeholder="Say it in a sentence or two…"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            Prompt 2 question
            <input
              className={fieldClass}
              value={prompt2Q}
              onChange={(e) => setPrompt2Q(e.target.value)}
              placeholder="e.g. My sound is closest to…"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            Prompt 2 answer
            <textarea
              className={fieldClass}
              rows={3}
              value={prompt2A}
              onChange={(e) => setPrompt2A(e.target.value)}
              placeholder="Artists, genres, vibe…"
            />
          </label>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-100">AI profile coach</p>
            <p className="mt-1 text-sm text-zinc-500">
              Rewrite your style, goal, collaborator ask, and prompts so the profile feels clearer.
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
                  tags: suggestion.tags,
                  score: suggestion.score,
                });
                setMessage("AI suggestions applied locally. Review, then save changes.");
              })
            }
            className="rounded-full border border-amber-500/35 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-40"
          >
            {aiPending ? "Thinking..." : "Improve with AI"}
          </button>
        </div>
        {aiMeta ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-zinc-950/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              AI read
            </p>
            <p className="mt-2 text-sm text-zinc-300">{aiMeta.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                Score {aiMeta.score}/100
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

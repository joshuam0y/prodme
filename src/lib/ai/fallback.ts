import type {
  MatchOpenersInput,
  ModerationInput,
  ModerationResult,
  ProfileCoachInput,
  ProfileCoachSuggestion,
  ReportTriageInput,
  ReportTriageResult,
} from "@/lib/ai/types";

function clean(value: string | undefined | null): string {
  return value?.trim() || "";
}

function words(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
}

export function buildFallbackProfileCoachSuggestion(
  input: ProfileCoachInput,
): ProfileCoachSuggestion {
  const role = clean(input.role) || "creator";
  const niche = clean(input.niche);
  const goal = clean(input.goal);
  const city = clean(input.city);
  const lookingFor = clean(input.lookingFor);

  const nextNiche =
    niche ||
    `Describe your ${role} lane in a specific way, like genre, mood, or audience.`;
  const nextGoal =
    goal ||
    `Be specific about what you want next, like collabs, gigs, placements, or bookings.`;
  const nextLookingFor =
    lookingFor ||
    `Say exactly who you want to meet, what kind of sessions you want, and what a good fit looks like.`;
  const nextPrompt1Question = clean(input.prompt1Question) || "Best collab idea right now";
  const nextPrompt2Question = clean(input.prompt2Question) || "My sound is closest to...";
  const nextPrompt1Answer =
    clean(input.prompt1Answer) ||
    `Right now I want to connect with ${role}s who fit my style and actually want to build something real together.`;
  const nextPrompt2Answer =
    clean(input.prompt2Answer) ||
    `${niche || "My sound"} with a clear point of view, strong taste, and room to collaborate.`;

  const tags = [
    ...new Set(
      [role, ...words(niche).slice(0, 2), ...words(goal).slice(0, 2), ...words(lookingFor).slice(0, 2)]
        .map((tag) => tag.toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 6);

  const scoreSignals = [
    niche.length > 0,
    goal.length > 0,
    lookingFor.length > 0,
    clean(input.prompt1Answer).length > 0,
    clean(input.prompt2Answer).length > 0,
    city.length > 0,
  ];
  const score = Math.max(45, Math.round((scoreSignals.filter(Boolean).length / scoreSignals.length) * 100));

  return {
    niche: nextNiche,
    goal: nextGoal,
    lookingFor: nextLookingFor,
    prompt1Question: nextPrompt1Question,
    prompt1Answer: nextPrompt1Answer,
    prompt2Question: nextPrompt2Question,
    prompt2Answer: nextPrompt2Answer,
    summary: [
      clean(input.displayName) || "This profile",
      city ? `is based in ${city}` : "",
      niche ? `focuses on ${niche}` : `needs a clearer niche`,
      goal ? `and is currently focused on ${goal}.` : `and should clarify the current goal.`,
    ]
      .filter(Boolean)
      .join(" "),
    tags,
    score,
  };
}

export function buildFallbackMatchOpeners(input: MatchOpenersInput): string[] {
  const themName = clean(input.themName) || "there";
  const theirGoal = clean(input.themGoal);
  const theirNiche = clean(input.themNiche);
  const theirLookingFor = clean(input.themLookingFor);

  return [
    `Hey ${themName}, what are you focused on right now${theirGoal ? ` with ${theirGoal.toLowerCase()}` : ""}?`,
    theirNiche
      ? `You mentioned ${theirNiche.toLowerCase()} - what are you building in that lane right now?`
      : `What kind of sound are you leaning into most right now?`,
    theirLookingFor
      ? `You said you're looking for ${theirLookingFor.toLowerCase()} - what would a great fit look like for you?`
      : "What kind of collaboration are you most open to right now?",
  ];
}

export function fallbackModerateText(input: ModerationInput): ModerationResult {
  const text = clean(input.text).toLowerCase();
  const blockTerms = ["kill yourself", "send nudes", "wire money", "crypto scam", "racial slur"];
  const warnTerms = ["follow me", "tap in", "dm me asap", "promo", "buy now", "telegram"];

  if (blockTerms.some((term) => text.includes(term))) {
    return { status: "block", reason: "Contains abusive or scam-like language." };
  }
  if (warnTerms.some((term) => text.includes(term))) {
    return { status: "warn", reason: "Looks promotional or suspicious." };
  }
  return { status: "allow", reason: "No issue detected." };
}

export function fallbackReportTriage(input: ReportTriageInput): ReportTriageResult {
  const hay = `${clean(input.reason)} ${clean(input.details)} ${clean(input.messageBody)}`.toLowerCase();
  const high = ["threat", "hate", "scam", "fraud", "explicit", "harassment"];
  const medium = ["spam", "abusive", "aggressive", "creepy"];
  const priority = high.some((term) => hay.includes(term))
    ? "high"
    : medium.some((term) => hay.includes(term))
      ? "medium"
      : "low";

  const labels = [
    ...new Set(
      [...high, ...medium]
        .filter((term) => hay.includes(term))
        .slice(0, 5),
    ),
  ];

  return {
    summary:
      priority === "high"
        ? "This report may involve severe abuse, scam risk, or explicit misconduct."
        : priority === "medium"
          ? "This report looks like spam, aggression, or other content worth reviewing soon."
          : "This report appears lower risk but should still be reviewed.",
    priority,
    labels,
  };
}

import type {
  MatchOpenersInput,
  ModerationInput,
  ModerationResult,
  ProfileCoachInput,
  ProfileCoachSuggestion,
  ReportTriageInput,
  ReportTriageResult,
} from "@/lib/ai/types";
import { getProfilePromptOptions, isVenueProfileRole } from "@/lib/profile-prompts";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "some",
  "will",
  "want",
  "into",
  "more",
  "about",
  "looking",
  "book",
  "performers",
]);

const BLOCK_TERMS = [
  "kill yourself",
  "send nudes",
  "wire money",
  "crypto scam",
  "racial slur",
  "midget",
  "midgets",
];

const WARN_TERMS = ["follow me", "tap in", "dm me asap", "promo", "buy now", "telegram"];

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

function hasBlockedContent(value: string): boolean {
  const normalized = clean(value).toLowerCase();
  return BLOCK_TERMS.some((term) => normalized.includes(term));
}

function hasWarnContent(value: string): boolean {
  const normalized = clean(value).toLowerCase();
  return WARN_TERMS.some((term) => normalized.includes(term));
}

function buildProfileSummary(input: ProfileCoachInput): string {
  const niche = clean(input.niche);
  const goal = clean(input.goal);
  const lookingFor = clean(input.lookingFor);
  const prompt1Answer = clean(input.prompt1Answer);
  const prompt2Answer = clean(input.prompt2Answer);
  const role = clean(input.role) || "profile";
  const isVenue = isVenueProfileRole(role);

  if ([niche, goal, lookingFor, prompt1Answer, prompt2Answer].some(hasBlockedContent)) {
    return isVenue
      ? "Some venue copy needs a full rewrite before this feels safe or polished. Remove disrespectful language and describe the artists, nights, and booking fit you want in a clear professional way."
      : "Some profile copy needs a full rewrite before this feels safe or polished. Remove disrespectful language and describe the kind of collaborators, bookings, or opportunities you want in a clear professional way.";
  }

  const gaps: string[] = [];
  if (!niche) gaps.push("a clearer style");
  if (!goal) gaps.push("a more specific goal");
  if (!lookingFor) gaps.push("a sharper collaborator ask");
  if (prompt1Answer.length < 16 || prompt2Answer.length < 16) gaps.push("stronger prompt answers");

  if (gaps.length === 0) {
    return isVenue
      ? "This venue profile has a solid foundation. Tighten the wording and make the booking prompts more specific so artists can quickly understand the room and whether they fit."
      : `This ${role.toLowerCase()} profile has a solid foundation. Tighten the wording and make the prompts more specific so it feels more memorable and easier to reply to.`;
  }

  return isVenue
    ? `This venue profile still needs ${gaps.join(", ")}. Focus on concrete booking details and a respectful tone so artists can quickly understand the room.`
    : `This profile still needs ${gaps.join(", ")}. Focus on concrete details and a respectful tone so people can quickly understand the fit.`;
}

function buildProfileFeedback(input: ProfileCoachInput): {
  strengths: string[];
  improvements: string[];
  nextStep: string | null;
} {
  const niche = clean(input.niche);
  const goal = clean(input.goal);
  const lookingFor = clean(input.lookingFor);
  const prompt1Answer = clean(input.prompt1Answer);
  const prompt2Answer = clean(input.prompt2Answer);
  const role = clean(input.role) || "profile";
  const isVenue = isVenueProfileRole(role);

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (niche.length >= 10) {
    strengths.push(isVenue ? "The room vibe is starting to feel specific." : "Your style already feels somewhat defined.");
  } else {
    improvements.push(isVenue ? "Make the room feel more vivid: crowd, genres, and energy." : "Make your style more specific than a broad genre label.");
  }

  if (goal.length >= 10) {
    strengths.push("Your goal gives people a sense of what you want next.");
  } else {
    improvements.push("Spell out the next thing you actually want, not just general growth.");
  }

  if (lookingFor.length >= 14) {
    strengths.push(
      isVenue
        ? "Your booking ask gives artists a better sense of fit."
        : "Your collaborator ask is concrete enough to invite the right people in.",
    );
  } else {
    improvements.push(
      isVenue
        ? "Say which artists or event concepts fit your room and why."
        : "Say who you want to meet and what kind of collab actually fits.",
    );
  }

  if (prompt1Answer.length >= 18 && prompt2Answer.length >= 18) {
    strengths.push("The prompts add personality instead of reading like filler.");
  } else {
    improvements.push("Turn the prompt answers into memorable specifics, not generic one-liners.");
  }

  if ([niche, goal, lookingFor, prompt1Answer, prompt2Answer].some(hasBlockedContent)) {
    return {
      strengths: [],
      improvements: [
        isVenue
          ? "Remove disrespectful language and rewrite the booking copy in a professional tone."
          : "Remove disrespectful language and rewrite the profile in a respectful tone.",
        isVenue
          ? "Describe the room, the nights, and the artist fit without anything crude or hostile."
          : "Describe your style, goals, and collaborator fit without anything crude or hostile.",
      ],
      nextStep: isVenue
        ? "Rewrite the room description and artist ask first, then run the coach again."
        : "Rewrite the style and collaborator ask first, then run the coach again.",
    };
  }

  return {
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    nextStep:
      improvements[0] ??
      (isVenue
        ? "Tighten one prompt so artists instantly understand the room."
        : "Tighten one prompt so someone instantly has a reason to message you."),
  };
}

function deriveProfileTags(input: ProfileCoachInput): string[] {
  const tags = new Set<string>();
  const role = clean(input.role).toLowerCase();
  const haystack = `${clean(input.niche)} ${clean(input.goal)} ${clean(input.lookingFor)}`.toLowerCase();

  if (role.includes("venue")) tags.add("venue");
  if (role.includes("promoter")) tags.add("promoter");
  if (role.includes("producer")) tags.add("producer");
  if (role.includes("dj")) tags.add("dj");
  if (role.includes("artist")) tags.add("artist");

  const concepts: Array<[string, string]> = [
    ["book", "booking"],
    ["event", "events"],
    ["perform", "live events"],
    ["session", "sessions"],
    ["collab", "collaboration"],
    ["studio", "studio"],
    ["vocal", "vocals"],
    ["beat", "production"],
    ["mix", "mixing"],
  ];

  for (const [needle, label] of concepts) {
    if (haystack.includes(needle) && !hasBlockedContent(needle)) tags.add(label);
  }

  for (const token of words(clean(input.niche))) {
    if (!STOP_WORDS.has(token) && !hasBlockedContent(token) && !hasWarnContent(token)) {
      tags.add(token);
    }
    if (tags.size >= 6) break;
  }

  return Array.from(tags).slice(0, 6);
}

function calculateProfileScore(input: ProfileCoachInput): number {
  const niche = clean(input.niche);
  const goal = clean(input.goal);
  const lookingFor = clean(input.lookingFor);
  const prompt1Answer = clean(input.prompt1Answer);
  const prompt2Answer = clean(input.prompt2Answer);
  const city = clean(input.city);

  let score = 32;
  if (niche.length >= 8) score += 10;
  if (goal.length >= 8) score += 10;
  if (lookingFor.length >= 12) score += 12;
  if (prompt1Answer.length >= 20) score += 8;
  if (prompt2Answer.length >= 20) score += 8;
  if (city) score += 5;
  if (niche.length >= 18) score += 4;
  if (goal.length >= 18) score += 4;

  if ([niche, goal, lookingFor, prompt1Answer, prompt2Answer].some(hasWarnContent)) score -= 8;
  if ([niche, goal, lookingFor, prompt1Answer, prompt2Answer].some(hasBlockedContent)) score -= 45;
  if (lookingFor.length > 140) score -= 8;

  return Math.max(15, Math.min(88, score));
}

function pickPromptPair(role: string, niche: string, goal: string, lookingFor: string) {
  const promptOptions = getProfilePromptOptions(role);

  if (isVenueProfileRole(role)) {
    const fitPrompt =
      promptOptions.find((option) => option.question === "A great fit for our room usually looks like...") ??
      promptOptions[0];
    const momentumPrompt =
      goal
        ? promptOptions.find((option) => option.question === "Right now we're building toward...")
        : promptOptions.find((option) => option.question === "Ask us about...");

    return [fitPrompt, momentumPrompt ?? promptOptions[1] ?? fitPrompt];
  }

  const tastePrompt =
    niche || role.includes("dj") || role.includes("producer")
      ? promptOptions.find((option) => option.question === "A track that explains my taste is...")
      : promptOptions.find((option) => option.question === "If we made something together, I'd bring...");
  const momentumPrompt =
    goal
      ? promptOptions.find((option) => option.question === "Right now I'm building toward...")
      : promptOptions.find((option) => option.question === "Ask me about...");

  return [tastePrompt ?? promptOptions[0], momentumPrompt ?? promptOptions[1] ?? promptOptions[0]];
}

export function buildFallbackProfileCoachSuggestion(
  input: ProfileCoachInput,
): ProfileCoachSuggestion {
  const role = clean(input.role) || "creator";
  const niche = clean(input.niche);
  const goal = clean(input.goal);
  const city = clean(input.city);
  const lookingFor = clean(input.lookingFor);
  const isVenue = isVenueProfileRole(role);

  const nextNiche =
    niche ||
    (isVenue
      ? "Describe the room in a specific way, like crowd, genres, energy, and what kind of nights it does best."
      : `Describe your ${role} lane in a specific way, like genre, mood, or audience.`);
  const nextGoal =
    goal ||
    (isVenue
      ? "Be specific about what you want next, like stronger lineups, residency growth, better-fit artists, or fuller nights."
      : `Be specific about what you want next, like collabs, gigs, placements, or bookings.`);
  const nextLookingFor =
    lookingFor ||
    (isVenue
      ? "Say exactly which artists, teams, or event concepts fit your room and what helps them stand out."
      : `Say exactly who you want to meet, what kind of sessions you want, and what a good fit looks like.`);
  const [fallbackPrompt1, fallbackPrompt2] = pickPromptPair(role.toLowerCase(), niche, goal, lookingFor);
  const nextPrompt1Question = clean(input.prompt1Question) || fallbackPrompt1.question;
  const nextPrompt2Question = clean(input.prompt2Question) || fallbackPrompt2.question;
  const nextPrompt1Answer =
    clean(input.prompt1Answer) ||
    (nextPrompt1Question === "A track that explains my taste is..."
      ? `A record that sits close to my world is one that blends ${niche || "taste"} with strong mood and replay value.`
      : nextPrompt1Question === "A great fit for our room usually looks like..."
        ? `Artists who match our room understand the crowd, bring real energy, and know how to make the night feel intentional.`
      : nextPrompt1Question === "If we made something together, I'd bring..."
        ? `I'd bring clear ideas, strong taste, and the kind of follow-through that keeps a project moving.`
        : `Right now I want to connect with ${role}s who fit my style and actually want to build something real together.`);
  const nextPrompt2Answer =
    clean(input.prompt2Answer) ||
    (nextPrompt2Question === "Right now I'm building toward..."
      ? `I'm focused on ${goal || "turning good momentum into real opportunities"} and meeting people who want to level up with intention.`
      : nextPrompt2Question === "Right now we're building toward..."
        ? `We're focused on ${goal || "more consistent nights, stronger lineups, and the right long-term creative partners"} this season.`
        : nextPrompt2Question === "Ask us about..."
          ? `Our room, the kind of nights we want to build, and what helps an artist stand out when reaching out.`
      : nextPrompt2Question === "Ask me about..."
        ? `${niche || "the sound I'm building"}, what I'm aiming for next, or the kind of people I'm trying to create with.`
        : `${niche || "My sound"} with a clear point of view, strong taste, and room to collaborate.`);

  const tags = deriveProfileTags(input);
  const score = calculateProfileScore(input);
  const feedback = buildProfileFeedback(input);

  return {
    niche: nextNiche,
    goal: nextGoal,
    lookingFor: nextLookingFor,
    prompt1Question: nextPrompt1Question,
    prompt1Answer: nextPrompt1Answer,
    prompt2Question: nextPrompt2Question,
    prompt2Answer: nextPrompt2Answer,
    summary: buildProfileSummary(input),
    strengths: feedback.strengths,
    improvements: feedback.improvements,
    nextStep: feedback.nextStep,
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
  if (BLOCK_TERMS.some((term) => text.includes(term))) {
    return { status: "block", reason: "Contains abusive or scam-like language." };
  }
  if (WARN_TERMS.some((term) => text.includes(term))) {
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

import type {
  MatchOpenersInput,
  ModerationInput,
  ProfileCoachInput,
  ReportTriageInput,
} from "@/lib/ai/types";

function line(label: string, value: string | undefined) {
  const text = value?.trim();
  return `${label}: ${text || "—"}`;
}

export function buildProfileCoachPrompt(input: ProfileCoachInput): string {
  return [
    "You are helping improve a dating-style music networking profile for prodLink.",
    "Rewrite the profile so it sounds specific, concise, credible, and human.",
    "Do not sound corporate, cheesy, or overly polished.",
    "Keep the user's role and intent intact.",
    "Prefer short, concrete phrases over hype.",
    "Return strict JSON only with keys:",
    "niche, goal, lookingFor, prompt1Question, prompt1Answer, prompt2Question, prompt2Answer, summary, tags, score",
    'Rules: "tags" must be an array of 3 to 6 short lowercase strings. "score" must be an integer from 1 to 100.',
    "Do not invent achievements, locations, or credits not present in the input.",
    "",
    line("Display name", input.displayName),
    line("Role", input.role),
    line("Style / niche", input.niche),
    line("Current goal", input.goal),
    line("City", input.city),
    line("Looking for", input.lookingFor),
    line("Prompt 1 question", input.prompt1Question),
    line("Prompt 1 answer", input.prompt1Answer),
    line("Prompt 2 question", input.prompt2Question),
    line("Prompt 2 answer", input.prompt2Answer),
  ].join("\n");
}

export function buildMatchOpenersPrompt(input: MatchOpenersInput): string {
  return [
    "You are writing first-message openers for a music networking match on prodLink.",
    "Write 3 distinct openers that feel human, short, and actually sendable.",
    "Do not sound flirt-heavy, salesy, or robotic.",
    "Avoid generic praise like 'love your vibe' unless grounded in profile details.",
    "Use profile overlap when possible.",
    "Each opener should be one sentence, max 140 characters.",
    'Return strict JSON only with key "openers" as an array of exactly 3 strings.',
    "",
    "Sender profile",
    line("Name", input.meName),
    line("Role", input.meRole),
    line("Style / niche", input.meNiche),
    line("Goal", input.meGoal),
    line("Looking for", input.meLookingFor),
    "",
    "Recipient profile",
    line("Name", input.themName),
    line("Role", input.themRole),
    line("Style / niche", input.themNiche),
    line("Goal", input.themGoal),
    line("Looking for", input.themLookingFor),
  ].join("\n");
}

export function buildModerationPrompt(input: ModerationInput): string {
  return [
    "You are classifying user-generated content for a music networking app.",
    "Return strict JSON only with keys: status, reason.",
    'status must be one of: "allow", "warn", "block".',
    'Use "block" for obvious harassment, hate, threats, scams, sexual solicitation, or repeated spam.',
    'Use "warn" for borderline rude, overly aggressive, or suspicious promotional content that may still be allowed.',
    'Use "allow" for normal networking, collaboration, and harmless profile/message content.',
    "Keep reason short and specific.",
    "",
    `Context: ${input.context ?? "message"}`,
    `Text: ${input.text.trim() || "—"}`,
  ].join("\n");
}

export function buildReportTriagePrompt(input: ReportTriageInput): string {
  return [
    "You are triaging a user report for an admin moderation queue in a social music networking app.",
    "Return strict JSON only with keys: summary, priority, labels.",
    'priority must be exactly one of: "low", "medium", "high".',
    'labels must be an array of 1 to 5 short lowercase strings.',
    "Summary should be one concise sentence focused on why the report matters.",
    "Escalate to high for threats, hate, scams, sexual coercion, repeated harassment, or explicit abuse.",
    "",
    `Report reason: ${input.reason.trim() || "—"}`,
    `Reporter details: ${input.details?.trim() || "—"}`,
    `Reported message: ${input.messageBody?.trim() || "—"}`,
  ].join("\n");
}

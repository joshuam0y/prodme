export type ProfilePromptOption = {
  question: string;
  cue: string;
};

export const CREATIVE_PROFILE_PROMPT_OPTIONS: ProfilePromptOption[] = [
  { question: "The kind of collab I want more of is...", cue: "Talk about the exact energy, role, or type of project you want." },
  { question: "A track that explains my taste is...", cue: "Pick one song or artist and explain why it fits your world." },
  { question: "My creative green flags are...", cue: "Mention habits, work ethic, or communication style that make you easy to build with." },
  { question: "The fastest way to get me excited about a project is...", cue: "Share what instantly makes you want to say yes." },
  { question: "Right now I'm building toward...", cue: "Name the next chapter: gigs, placements, a tape, visuals, bookings, or growth." },
  { question: "A session with me usually looks like...", cue: "Paint the vibe: fast, experimental, polished, loud, late-night, focused." },
  { question: "My sound in three words...", cue: "Be specific and memorable instead of generic genre labels." },
  { question: "The artist I'd love to open for is...", cue: "Choose someone realistic or aspirational and explain the fit." },
  { question: "I'm most likely to link if you...", cue: "Set clear expectations for the kind of people and messages you respond to." },
  { question: "One thing people notice about my sets is...", cue: "Give a detail that makes your live presence feel real." },
  { question: "My unpopular music opinion is...", cue: "A playful, opinionated answer works best here." },
  { question: "You'll get along with me if...", cue: "Describe your personality and creative chemistry, not just music skill." },
  { question: "A project I'm proud of lately is...", cue: "Share one recent win and why it matters." },
  { question: "My ideal studio vibe is...", cue: "Talk about mood, pace, people, and how you like sessions to feel." },
  { question: "If we made something together, I'd bring...", cue: "Say what you contribute: melodies, taste, mix notes, hooks, network, energy." },
  { question: "The city needs more...", cue: "Use this to show taste, ambition, or community-minded energy." },
  { question: "My creative routine lately is...", cue: "A grounded answer makes you feel active and consistent." },
  { question: "Ask me about...", cue: "Choose a topic that naturally starts a conversation." },
  { question: "The last thing that inspired me was...", cue: "Name a performance, sound, place, person, or moment." },
  { question: "The people I'm trying to meet on here are...", cue: "Be direct about who you want in your circle." },
];

export const VENUE_PROFILE_PROMPT_OPTIONS: ProfilePromptOption[] = [
  { question: "The kind of events we're booking more of are...", cue: "Name the energy, genres, crowd, or format you want more of." },
  { question: "A great fit for our room usually looks like...", cue: "Describe the artists, audience, and vibe that work best in your space." },
  { question: "What makes our venue stand out is...", cue: "Mention the room, sound, location, community, or atmosphere." },
  { question: "We're most excited to hear from artists who...", cue: "Set expectations clearly so the right people know to reach out." },
  { question: "The best night we've hosted lately felt like...", cue: "Make the space feel real with one vivid detail." },
  { question: "If you're pitching us, include...", cue: "Tell artists exactly what helps you say yes faster." },
  { question: "Our crowd usually shows up for...", cue: "Describe the audience honestly and specifically." },
  { question: "Right now we're building toward...", cue: "Talk about your next season, series, residency, or type of event." },
  { question: "We love working with artists who...", cue: "Highlight reliability, fit, professionalism, or performance energy." },
  { question: "A booking green flag for us is...", cue: "Mention the signs that make you trust an artist or team." },
  { question: "The city needs more nights like...", cue: "Show taste and point of view about the local scene." },
  { question: "Ask us about...", cue: "Pick something that naturally starts a booking conversation." },
];

export const PROFILE_PROMPT_OPTIONS = [
  ...CREATIVE_PROFILE_PROMPT_OPTIONS,
  ...VENUE_PROFILE_PROMPT_OPTIONS,
];

export function isVenueProfileRole(role: string | null | undefined): boolean {
  const normalized = (role ?? "").toLowerCase();
  return normalized.includes("venue") || normalized.includes("promoter");
}

export function getProfilePromptOptions(role: string | null | undefined): ProfilePromptOption[] {
  return isVenueProfileRole(role) ? VENUE_PROFILE_PROMPT_OPTIONS : CREATIVE_PROFILE_PROMPT_OPTIONS;
}

export function getProfilePromptHeading(role: string | null | undefined): string {
  return isVenueProfileRole(role) ? "Prompts (booking-style)" : "Prompts (Hinge-style)";
}

export function getProfilePromptSubheading(role: string | null | undefined): string {
  return isVenueProfileRole(role)
    ? "Pick booking prompts that help artists understand your room, your crowd, and how to reach out."
    : "Pick conversation starters instead of writing prompt titles from scratch.";
}

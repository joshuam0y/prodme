import type { Role } from "@/lib/types";

function normalizeRole(role: string | null | undefined): Role | null {
  const value = (role ?? "").trim().toLowerCase();
  if (value.includes("venue") || value.includes("promoter")) return "venue";
  if (value.includes("artist") || value.includes("vocal")) return "artist";
  if (value === "dj") return "dj";
  if (value === "producer") return "producer";
  return null;
}

export function buildDefaultDraftOpener(matchName: string, targetRole?: string | null): string {
  const name = matchName.trim() || "there";
  const role = normalizeRole(targetRole);

  if (role === "venue") {
    return `Hey ${name}, your room looks like a strong fit. What kind of artists or nights are you booking right now?`;
  }

  if (role === "artist") {
    return `Hey ${name}, what are you building right now and what kind of collaborators are you hoping to meet here?`;
  }

  if (role === "dj") {
    return `Hey ${name}, what kind of sets or opportunities are you most focused on right now?`;
  }

  return `Hey ${name}, what are you working on right now?`;
}

export function buildRoleAwareOpeners(input: {
  themName?: string | null;
  themRole?: string | null;
  themNiche?: string | null;
  themGoal?: string | null;
  themLookingFor?: string | null;
}): string[] {
  const themName = input.themName?.trim() || "there";
  const theirGoal = input.themGoal?.trim() || "";
  const theirNiche = input.themNiche?.trim() || "";
  const theirLookingFor = input.themLookingFor?.trim() || "";
  const role = normalizeRole(input.themRole);

  if (role === "venue") {
    return [
      `Hey ${themName}, what kind of artists or nights are you most excited to book next?`,
      theirNiche
        ? `Your room vibe around ${theirNiche.toLowerCase()} stood out to me. What usually makes someone a strong fit for your space?`
        : `What usually makes an artist feel like a strong fit for your space?`,
      theirLookingFor
        ? `You mentioned you're looking for ${theirLookingFor.toLowerCase()}. What helps someone stand out when they reach out?`
        : "What kind of outreach or pitch usually gets your attention?",
    ];
  }

  if (role === "artist") {
    return [
      `Hey ${themName}, what are you building right now?`,
      theirGoal
        ? `You mentioned ${theirGoal.toLowerCase()} - what does a great next step look like for you?`
        : "What are you most focused on musically right now?",
      theirLookingFor
        ? `You said you're looking for ${theirLookingFor.toLowerCase()}. What kind of collab feels like the right fit?`
        : "What kind of collaborator are you hoping to meet here?",
    ];
  }

  if (role === "dj") {
    return [
      `Hey ${themName}, what kind of sets or nights are you most focused on right now?`,
      theirNiche
        ? `You mentioned ${theirNiche.toLowerCase()} - what kind of rooms or crowds fit that best for you?`
        : "What kind of energy are you trying to bring into your next set?",
      theirLookingFor
        ? `You said you're looking for ${theirLookingFor.toLowerCase()}. What would a strong fit look like?`
        : "What kind of connection would actually be useful for you right now?",
    ];
  }

  return [
    `Hey ${themName}, what are you focused on right now${theirGoal ? ` with ${theirGoal.toLowerCase()}` : ""}?`,
    theirNiche
      ? `You mentioned ${theirNiche.toLowerCase()} - what are you building in that lane right now?`
      : "What kind of sound are you leaning into most right now?",
    theirLookingFor
      ? `You said you're looking for ${theirLookingFor.toLowerCase()} - what would a great fit look like for you?`
      : "What kind of collaboration are you most open to right now?",
  ];
}

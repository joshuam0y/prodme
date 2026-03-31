import OpenAI from "openai";
import {
  buildMatchOpenersPrompt,
  buildModerationPrompt,
  buildProfileCoachPrompt,
  buildReportTriagePrompt,
} from "@/lib/ai/prompts";
import type {
  MatchOpenersInput,
  ModerationInput,
  ModerationResult,
  ProfileCoachInput,
  ProfileCoachSuggestion,
  ReportTriageInput,
  ReportTriageResult,
} from "@/lib/ai/types";

let cachedClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey });
  }
  return cachedClient;
}

function parseJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI did not return JSON.");
  }
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

function asTrimmedString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
    .filter(Boolean)
    .slice(0, 6);
}

function normalizePriority(value: unknown): "low" | "medium" | "high" {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function normalizeScore(value: unknown): number {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score)) return 60;
  return Math.max(1, Math.min(100, Math.round(score)));
}

function stringifyEmbedding(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function generateProfileCoachSuggestion(
  input: ProfileCoachInput,
): Promise<ProfileCoachSuggestion> {
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: buildProfileCoachPrompt(input) }],
      },
    ],
  });

  const payload = parseJsonObject(response.output_text || "");
  const fallbackQ1 = asTrimmedString(input.prompt1Question, "Best collab idea right now");
  const fallbackQ2 = asTrimmedString(input.prompt2Question, "My sound is closest to...");

  return {
    niche: asTrimmedString(payload.niche, asTrimmedString(input.niche)),
    goal: asTrimmedString(payload.goal, asTrimmedString(input.goal)),
    lookingFor: asTrimmedString(payload.lookingFor, asTrimmedString(input.lookingFor)),
    prompt1Question: asTrimmedString(payload.prompt1Question, fallbackQ1),
    prompt1Answer: asTrimmedString(payload.prompt1Answer, asTrimmedString(input.prompt1Answer)),
    prompt2Question: asTrimmedString(payload.prompt2Question, fallbackQ2),
    prompt2Answer: asTrimmedString(payload.prompt2Answer, asTrimmedString(input.prompt2Answer)),
    summary: asTrimmedString(payload.summary),
    tags: normalizeTags(payload.tags),
    score: normalizeScore(payload.score),
  };
}

export async function generateMatchOpeners(input: MatchOpenersInput): Promise<string[]> {
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: buildMatchOpenersPrompt(input) }],
      },
    ],
  });

  const payload = parseJsonObject(response.output_text || "");
  const openers = Array.isArray(payload.openers)
    ? payload.openers
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  if (openers.length === 3) return openers;

  const name = input.themName?.trim() || "there";
  return [
    `Hey ${name}, what are you building right now?`,
    `What kind of collab are you most looking for at the moment?`,
    `What are you focused on most this month musically?`,
  ];
}

export async function enrichProfileWithAi(input: ProfileCoachInput): Promise<{
  summary: string;
  tags: string[];
  score: number;
}> {
  const suggestion = await generateProfileCoachSuggestion(input);
  return {
    summary: suggestion.summary,
    tags: suggestion.tags,
    score: suggestion.score,
  };
}

export async function moderateTextWithAi(input: ModerationInput): Promise<ModerationResult> {
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: buildModerationPrompt(input) }],
      },
    ],
  });

  const payload = parseJsonObject(response.output_text || "");
  const status =
    payload.status === "warn" || payload.status === "block" || payload.status === "allow"
      ? payload.status
      : "allow";
  const reason = asTrimmedString(payload.reason, "No issue detected.");
  return { status, reason };
}

export async function triageReportWithAi(input: ReportTriageInput): Promise<ReportTriageResult> {
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: buildReportTriagePrompt(input) }],
      },
    ],
  });

  const payload = parseJsonObject(response.output_text || "");
  return {
    summary: asTrimmedString(payload.summary, "Reported content needs admin review."),
    priority: normalizePriority(payload.priority),
    labels: normalizeTags(payload.labels).slice(0, 5),
  };
}

export function buildProfileEmbeddingText(input: ProfileCoachInput): string {
  return [
    input.displayName?.trim(),
    input.role?.trim(),
    input.niche?.trim(),
    input.goal?.trim(),
    input.city?.trim(),
    input.lookingFor?.trim(),
    input.prompt1Question?.trim(),
    input.prompt1Answer?.trim(),
    input.prompt2Question?.trim(),
    input.prompt2Answer?.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function embedText(input: string): Promise<number[]> {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  const embedding = response.data[0]?.embedding;
  if (!embedding?.length) {
    throw new Error("Embedding generation failed.");
  }
  return embedding;
}

export async function generateProfileEmbedding(input: ProfileCoachInput): Promise<{
  sourceText: string;
  embeddingText: string;
}> {
  const sourceText = buildProfileEmbeddingText(input);
  if (!sourceText.trim()) {
    throw new Error("Profile embedding text is empty.");
  }
  const embedding = await embedText(sourceText);
  return {
    sourceText,
    embeddingText: stringifyEmbedding(embedding),
  };
}

import { triageReportWithAi } from "@/lib/ai/client";
import { fallbackReportTriage } from "@/lib/ai/fallback";
import { isAiProfileCoachConfigured } from "@/lib/env";

export async function buildAiReportTriage(input: {
  reason: string;
  details?: string;
  messageBody?: string;
}): Promise<{
  ai_summary?: string;
  ai_priority?: "low" | "medium" | "high";
  ai_labels?: string[];
  ai_triaged_at?: string;
}> {
  if (!isAiProfileCoachConfigured()) {
    const triage = fallbackReportTriage(input);
    return {
      ai_summary: triage.summary,
      ai_priority: triage.priority,
      ai_labels: triage.labels,
      ai_triaged_at: new Date().toISOString(),
    };
  }

  try {
    const triage = await triageReportWithAi(input);
    return {
      ai_summary: triage.summary,
      ai_priority: triage.priority,
      ai_labels: triage.labels,
      ai_triaged_at: new Date().toISOString(),
    };
  } catch {
    return {};
  }
}

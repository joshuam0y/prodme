import { describe, expect, it, vi } from "vitest";
import {
  saveLeadOutreachDraft,
  setLeadOutreachStatus,
} from "@/app/leads/actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: vi.fn(() => true),
}));

const upsert = vi.fn().mockResolvedValue({ error: null });
const from = vi.fn(() => ({ upsert }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "viewer-1" } } }) },
    from,
  })),
}));

describe("lead outreach actions", () => {
  const targetId = "550e8400-e29b-41d4-a716-446655440000";

  it("saves message draft", async () => {
    const res = await saveLeadOutreachDraft(
      targetId,
      "Hello there",
      "/saved",
    );
    expect(res.ok).toBe(true);
    expect(from).toHaveBeenCalledWith("lead_outreach");
    expect(upsert).toHaveBeenCalled();
  });

  it("updates outreach status", async () => {
    const res = await setLeadOutreachStatus(targetId, "follow_up", "/interested");
    expect(res.ok).toBe(true);
    expect(from).toHaveBeenCalledWith("lead_outreach");
    expect(upsert).toHaveBeenCalled();
  });
});

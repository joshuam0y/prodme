import { describe, expect, it, vi } from "vitest";
import {
  saveInterestedPipelineNote,
  setInterestedPipelineStage,
} from "@/app/interested/actions";

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

describe("interested pipeline actions", () => {
  const targetId = "550e8400-e29b-41d4-a716-446655440000";

  it("upserts stage", async () => {
    const res = await setInterestedPipelineStage(
      targetId,
      "contacted",
      "/interested",
    );
    expect(res.ok).toBe(true);
    expect(from).toHaveBeenCalledWith("interested_pipeline");
    expect(upsert).toHaveBeenCalled();
  });

  it("upserts note trimmed", async () => {
    const res = await saveInterestedPipelineNote(
      targetId,
      "  hello  ",
      "/interested",
    );
    expect(res.ok).toBe(true);
    expect(from).toHaveBeenCalledWith("interested_pipeline");
    expect(upsert).toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import { sendMatchMessage } from "@/app/matches/actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: vi.fn(() => true),
}));

const insert = vi.fn().mockResolvedValue({ error: null });
const maybeSingle = vi.fn().mockResolvedValue({ data: { action: "save" } });
const inActions = vi.fn(() => ({ maybeSingle }));
const eqTarget = vi.fn(() => ({ in: inActions }));
const eqViewer = vi.fn(() => ({ eq: eqTarget }));
const select = vi.fn(() => ({ eq: eqViewer }));
const from = vi.fn((table: string) =>
  table === "match_messages"
    ? { insert }
    : {
        select,
      },
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "11111111-1111-1111-1111-111111111111" } } }) },
    from,
  })),
}));

describe("sendMatchMessage", () => {
  it("inserts message for mutual match", async () => {
    const res = await sendMatchMessage(
      "550e8400-e29b-41d4-a716-446655440000",
      "hey",
      "/matches/550e8400-e29b-41d4-a716-446655440000",
    );
    expect(res.ok).toBe(true);
    expect(from).toHaveBeenCalledWith("match_messages");
    expect(insert).toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import { resetDiscoverSwipes } from "@/app/explore/actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: vi.fn(() => true),
}));

const eqAction = vi.fn().mockResolvedValue({ error: null });
const eqViewer = vi.fn(() => ({ eq: eqAction }));
const del = vi.fn(() => ({ eq: eqViewer }));
const from = vi.fn(() => ({ delete: del }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "viewer-1" } } }) },
    from,
  })),
}));

describe("resetDiscoverSwipes", () => {
  it("only clears pass actions", async () => {
    const res = await resetDiscoverSwipes("/explore");
    expect(res.ok).toBe(true);
    expect(from).toHaveBeenCalledWith("discover_swipes");
    expect(del).toHaveBeenCalled();
    expect(eqViewer).toHaveBeenCalledWith("viewer_id", "viewer-1");
    expect(eqAction).toHaveBeenCalledWith("action", "pass");
  });
});

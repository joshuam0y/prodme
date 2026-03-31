import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/mobile/notifications/[id]/read/route";

const { isSupabaseConfigured, markNotificationRead, mockSupabase } = vi.hoisted(() => ({
  isSupabaseConfigured: vi.fn(() => true),
  markNotificationRead: vi.fn(async () => {}),
  mockSupabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "viewer-1" } } })) },
  },
}));

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured,
}));

vi.mock("@/lib/notifications", () => ({
  markNotificationRead,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

describe("mobile notification read route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "viewer-1" } } });
  });

  it("marks one notification read", async () => {
    const res = await POST(new Request("http://localhost/api/mobile/notifications/12/read"), {
      params: Promise.resolve({ id: "12" }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(markNotificationRead).toHaveBeenCalledWith("viewer-1", 12);
    expect(json).toEqual({ ok: true, data: null });
  });

  it("rejects invalid notification ids", async () => {
    const res = await POST(new Request("http://localhost/api/mobile/notifications/nope/read"), {
      params: Promise.resolve({ id: "nope" }),
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "invalid_notification" });
  });
});

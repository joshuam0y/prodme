import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/mobile/me/counts/route";

const { isSupabaseConfigured, mockSupabase } = vi.hoisted(() => ({
  isSupabaseConfigured: vi.fn(() => true),
  mockSupabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "viewer-1" } } })) },
    from: vi.fn(),
  },
}));

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

describe("mobile me counts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "viewer-1" } } });
  });

  it("returns unread message and notification counts", async () => {
    const isMessages = vi.fn().mockResolvedValue({ count: 4 });
    const eqMessages = vi.fn(() => ({ is: isMessages }));
    const selectMessages = vi.fn(() => ({ eq: eqMessages }));

    const isNotifications = vi.fn().mockResolvedValue({ count: 2 });
    const eqNotifications = vi.fn(() => ({ is: isNotifications }));
    const selectNotifications = vi.fn(() => ({ eq: eqNotifications }));

    mockSupabase.from.mockImplementation((table: string) => {
      const callIndex = mockSupabase.from.mock.calls.length;
      if (callIndex === 1) {
        expect(table).toBe("match_messages");
        return { select: selectMessages };
      }
      expect(table).toBe("notifications");
      return { select: selectNotifications };
    });

    const res = await GET(new Request("http://localhost/api/mobile/me/counts"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      data: {
        unreadMessages: 4,
        unreadNotifications: 2,
      },
    });
  });
});

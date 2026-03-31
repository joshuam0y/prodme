import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/mobile/notifications/route";

const { isSupabaseConfigured, markAllNotificationsRead, mockSupabase } = vi.hoisted(() => ({
  isSupabaseConfigured: vi.fn(() => true),
  markAllNotificationsRead: vi.fn(async () => {}),
  mockSupabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "viewer-1" } } })) },
    from: vi.fn(),
  },
}));

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured,
}));

vi.mock("@/lib/notifications", () => ({
  markAllNotificationsRead,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

describe("mobile notifications route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "viewer-1" } } });
  });

  it("returns notifications with unread count", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          kind: "message_received",
          title: "DJ Nova sent you a message",
          body: "hey",
          href: "/matches/viewer-2",
          created_at: "2026-03-31T00:00:00.000Z",
          read_at: null,
        },
      ],
      error: null,
    });
    const order = vi.fn(() => ({ limit }));
    const eqList = vi.fn(() => ({ order }));
    const selectList = vi.fn(() => ({ eq: eqList }));

    const isUnread = vi.fn().mockResolvedValue({ count: 3 });
    const eqCount = vi.fn(() => ({ is: isUnread }));
    const selectCount = vi.fn(() => ({ eq: eqCount }));

    mockSupabase.from.mockImplementation((table: string) => {
      expect(table).toBe("notifications");
      const callIndex = mockSupabase.from.mock.calls.length;
      return callIndex === 1 ? { select: selectList } : { select: selectCount };
    });

    const res = await GET(new Request("http://localhost/api/mobile/notifications"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      data: {
        notifications: [
          {
            id: 1,
            kind: "message_received",
            title: "DJ Nova sent you a message",
            body: "hey",
            href: "/matches/viewer-2",
            created_at: "2026-03-31T00:00:00.000Z",
            read_at: null,
          },
        ],
        unreadCount: 3,
      },
    });
  });

  it("marks all notifications read", async () => {
    const res = await POST(new Request("http://localhost/api/mobile/notifications"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(markAllNotificationsRead).toHaveBeenCalledWith("viewer-1");
    expect(json).toEqual({ ok: true, data: null });
  });
});

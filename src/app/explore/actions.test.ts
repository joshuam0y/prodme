import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDiscoverSwipes, setDiscoverAction } from "@/app/explore/actions";

const { revalidatePath, createNotification, trackServerEvent, isUuid, mockSupabase } = vi.hoisted(
  () => ({
    revalidatePath: vi.fn(),
    createNotification: vi.fn(async () => {}),
    trackServerEvent: vi.fn(async () => {}),
    isUuid: vi.fn(() => true),
    mockSupabase: {
      auth: { getUser: async () => ({ data: { user: { id: "viewer-1" } } }) },
      from: vi.fn(),
    },
  }),
);

vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/lib/env", () => ({
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification,
}));

vi.mock("@/lib/analytics", () => ({
  trackServerEvent,
}));

vi.mock("@/lib/uuid", () => ({
  isUuid,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

beforeEach(() => {
  vi.clearAllMocks();
  isUuid.mockReturnValue(true);
});

describe("resetDiscoverSwipes", () => {
  it("only clears pass actions", async () => {
    const eqAction = vi.fn().mockResolvedValue({ error: null });
    const eqViewer = vi.fn(() => ({ eq: eqAction }));
    const del = vi.fn(() => ({ eq: eqViewer }));
    mockSupabase.from.mockImplementation((table: string) => {
      expect(table).toBe("discover_swipes");
      return { delete: del };
    });

    const res = await resetDiscoverSwipes("/explore");

    expect(res.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith("discover_swipes");
    expect(del).toHaveBeenCalled();
    expect(eqViewer).toHaveBeenCalledWith("viewer_id", "viewer-1");
    expect(eqAction).toHaveBeenCalledWith("action", "pass");
  });
});

describe("setDiscoverAction", () => {
  it("creates notifications when saving back from likes", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const reciprocalMaybeSingle = vi.fn().mockResolvedValue({ data: { viewer_id: "target-1" } });
    const reciprocalIn = vi.fn(() => ({ maybeSingle: reciprocalMaybeSingle }));
    const reciprocalEqTarget = vi.fn(() => ({ in: reciprocalIn }));
    const reciprocalEqViewer = vi.fn(() => ({ eq: reciprocalEqTarget }));
    const profileMaybeSingle = vi.fn().mockResolvedValue({ data: { display_name: "DJ Nova" } });
    const profileEq = vi.fn(() => ({ maybeSingle: profileMaybeSingle }));
    const profileSelect = vi.fn(() => ({ eq: profileEq }));

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "discover_swipes") {
        return {
          upsert,
          select: vi.fn(() => ({ eq: reciprocalEqViewer })),
        };
      }
      if (table === "profiles") {
        return {
          select: profileSelect,
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const res = await setDiscoverAction(
      "22222222-2222-2222-2222-222222222222",
      "save",
      "/likes",
    );

    expect(res.ok).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      {
        viewer_id: "viewer-1",
        target_id: "22222222-2222-2222-2222-222222222222",
        action: "save",
      },
      { onConflict: "viewer_id,target_id" },
    );
    expect(trackServerEvent).toHaveBeenCalledWith({
      event: "likes_like_back",
      path: "/likes",
      metadata: { targetId: "22222222-2222-2222-2222-222222222222" },
    });
    expect(trackServerEvent).toHaveBeenCalledWith({
      event: "match_created",
      path: "/explore",
      metadata: { targetId: "22222222-2222-2222-2222-222222222222" },
    });
    expect(createNotification).toHaveBeenCalledTimes(3);
    expect(createNotification).toHaveBeenNthCalledWith(1, {
      userId: "22222222-2222-2222-2222-222222222222",
      actorId: "viewer-1",
      kind: "profile_saved",
      title: "DJ Nova liked you",
      body: "Open Likes to see who is interested.",
      href: "/likes",
      metadata: { actorId: "viewer-1" },
    });
    expect(createNotification).toHaveBeenNthCalledWith(2, {
      userId: "22222222-2222-2222-2222-222222222222",
      actorId: "viewer-1",
      kind: "match_created",
      title: "You matched with DJ Nova",
      body: "Open Messages and send the first note before the match goes cold.",
      href: "/matches/viewer-1",
      metadata: { actorId: "viewer-1" },
    });
    expect(createNotification).toHaveBeenNthCalledWith(3, {
      userId: "viewer-1",
      actorId: "22222222-2222-2222-2222-222222222222",
      kind: "match_created",
      title: "It’s a match",
      body: "You have a new mutual match waiting. Start the chat while the energy is high.",
      href: "/matches/22222222-2222-2222-2222-222222222222",
      metadata: { actorId: "22222222-2222-2222-2222-222222222222" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/likes");
  });
});

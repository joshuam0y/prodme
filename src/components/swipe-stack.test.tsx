/* eslint-disable @next/next/no-img-element */
"use client";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { SwipeStack } from "@/components/swipe-stack";
import type { ProfileCard } from "@/lib/types";

vi.mock("next/image", () => ({
  default: ({
    unoptimized,
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized;
    return <img alt={alt ?? ""} {...props} />;
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/app/explore/actions", () => ({
  recordDiscoverAction: vi.fn(async () => ({ ok: true })),
  removeDiscoverAction: vi.fn(async () => ({ ok: true })),
  resetDiscoverSwipes: vi.fn(async () => ({ ok: true })),
}));

function mkProfile(overrides: Partial<ProfileCard>): ProfileCard {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    displayName: "Profile A",
    role: "artist",
    city: "NYC",
    niche: "Indie",
    bio: "Bio",
    highlight: "Highlight",
    accent: "from-zinc-700 to-zinc-900",
    ...overrides,
  };
}

describe("SwipeStack", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockReset();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the next card after tapping pass", async () => {
    const first = mkProfile({ id: "11111111-1111-1111-1111-111111111111", displayName: "First" });
    const second = mkProfile({ id: "22222222-2222-2222-2222-222222222222", displayName: "Second" });
    render(<SwipeStack profiles={[first, second]} viewerId="viewer-1" />);

    expect(screen.getByText("First")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pass" }));

    await act(async () => {
      vi.advanceTimersByTime(230);
    });

    expect(screen.getByText("Second")).toBeTruthy();
  });

  it("opens featured venue photo in lightbox and navigates photos", () => {
    const venue = mkProfile({
      id: "33333333-3333-3333-3333-333333333333",
      displayName: "Venue One",
      role: "venue",
      starBeat: { id: "s1", title: "Front", coverUrl: "https://img.test/front.jpg" },
      extraBeats: [
        { id: "e1", title: "Room", coverUrl: "https://img.test/room.jpg" },
        { id: "e2", title: "Bar", coverUrl: "https://img.test/bar.jpg" },
      ],
    });
    render(<SwipeStack profiles={[venue]} viewerId="viewer-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Open featured photo" }));
    const dialog = screen.getByRole("dialog", { name: "Photo preview" });
    expect(dialog).toBeTruthy();
    const dialogImg = dialog.querySelector("img");
    expect(dialogImg?.getAttribute("src")).toBe("https://img.test/front.jpg");

    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    const nextDialogImg = dialog.querySelector("img");
    expect(nextDialogImg?.getAttribute("src")).toBe("https://img.test/room.jpg");
  });
});

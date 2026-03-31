"use client";

import { useState } from "react";
import Link from "next/link";
import { ProfileAvatar } from "@/components/profile-avatar";

type NotificationRow = {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  actor_avatar_url?: string | null;
  created_at: string;
  read_at: string | null;
};

type Props = {
  notifications: NotificationRow[];
};

export function NotificationsList({ notifications }: Props) {
  const [items, setItems] = useState(notifications);

  const markRead = async (id: number) => {
    let shouldRequest = false;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id || item.read_at) return item;
        shouldRequest = true;
        return { ...item, read_at: new Date().toISOString() };
      }),
    );
    if (!shouldRequest) return;
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch {
      // Optimistic update only.
    }
  };

  return (
    <ul className="space-y-3">
      {items.map((n) => {
        const content = (
          <div
            className={`block rounded-2xl border px-4 py-3 transition ${
              n.read_at
                ? "border-white/10 bg-zinc-900/40 hover:bg-white/[0.03]"
                : "border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/15"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <ProfileAvatar
                  name={n.title}
                  avatarUrl={n.actor_avatar_url}
                  sizeClassName="h-11 w-11"
                  textClassName="text-xs font-semibold text-zinc-100"
                  ringClassName="border border-white/10 bg-zinc-800/60"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-100">{n.title}</p>
                  {n.body ? <p className="mt-1 text-sm text-zinc-400">{n.body}</p> : null}
                  <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500">{n.kind}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="text-xs text-zinc-500">
                  {new Date(n.created_at).toLocaleDateString()}{" "}
                  {new Date(n.created_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {!n.read_at ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void markRead(n.id);
                    }}
                    className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition hover:bg-white/5"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );

        return (
          <li key={n.id}>
            {n.href ? (
              <Link href={n.href} onClick={() => void markRead(n.id)}>
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}

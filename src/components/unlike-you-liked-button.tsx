"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { removeDiscoverAction } from "@/app/explore/actions";
import { clearDiscoverDismissedId } from "@/lib/discover-dismissed";

type Props = {
  targetId: string;
  viewerId: string;
};

export function UnlikeYouLikedButton({ targetId, viewerId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title="Remove your like — they can show up in Discover again"
      onClick={() => {
        startTransition(async () => {
          const res = await removeDiscoverAction(targetId, "/likes");
          if (res.ok) {
            clearDiscoverDismissedId(viewerId, targetId);
            router.refresh();
          }
        });
      }}
      className="shrink-0 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-red-500/35 hover:bg-red-500/10 hover:text-red-200 disabled:opacity-50"
    >
      {pending ? "…" : "Unlike"}
    </button>
  );
}

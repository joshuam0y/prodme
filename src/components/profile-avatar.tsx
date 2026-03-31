"use client";

import Image from "next/image";
import { profileInitials } from "@/lib/match-ui";

type Props = {
  name?: string | null;
  avatarUrl?: string | null;
  sizeClassName?: string;
  textClassName?: string;
  ringClassName?: string;
};

export function ProfileAvatar({
  name,
  avatarUrl,
  sizeClassName = "h-12 w-12",
  textClassName = "text-xs font-semibold text-zinc-200",
  ringClassName = "border border-white/10 bg-zinc-800/60",
}: Props) {
  const src = avatarUrl?.trim() || "";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ${sizeClassName} ${ringClassName} ${textClassName}`}
      aria-hidden
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          className="object-cover"
          unoptimized={src.includes("picsum.photos")}
        />
      ) : (
        profileInitials(name)
      )}
    </div>
  );
}

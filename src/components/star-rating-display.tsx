import type { ReactNode } from "react";

function Star({ filled }: { filled: boolean }): ReactNode {
  return (
    <span
      aria-hidden
      className={filled ? "text-amber-400" : "text-white/20"}
    >
      ★
    </span>
  );
}

export function StarRatingDisplay({
  average,
  count,
}: {
  average: number;
  count?: number;
}) {
  const roundedToHalf = Math.round(average * 2) / 2;
  const filledStars = Math.round(roundedToHalf); // simple display: round to nearest whole star

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 text-lg leading-none">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} filled={i < filledStars} />
        ))}
      </div>
      <span className="text-sm text-zinc-300">
        {roundedToHalf.toFixed(1)} / 5
        {typeof count === "number" ? ` (${count})` : null}
      </span>
    </div>
  );
}


/**
 * Wordmark + 5-bar mark (matches the intended brand: orange equalizer, prod + Link).
 * Inline SVG so Tailwind can tune contrast for light/dark sidebars.
 */
export function ProdlinkLogo({
  className = "",
  iconClassName = "h-7 w-[52px] shrink-0 md:h-9 md:w-[60px]",
  textClassName = "text-[1.35rem] font-bold leading-none tracking-tight md:text-2xl",
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={`inline-flex items-end gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 56 44"
        className={iconClassName}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect className="fill-orange-600" x="0" y="14" width="5" height="22" rx="2.5" />
        <rect className="fill-orange-600" x="11" y="4" width="5" height="36" rx="2.5" />
        <rect className="fill-orange-600" x="22" y="10" width="5" height="28" rx="2.5" />
        <rect className="fill-orange-600" x="33" y="18" width="5" height="16" rx="2.5" />
        <rect className="fill-orange-600" x="44" y="6" width="5" height="34" rx="2.5" />
      </svg>
      <span className={textClassName}>
        <span className="text-zinc-500 dark:text-zinc-400">prod</span>
        <span className="text-orange-600">Link</span>
      </span>
    </span>
  );
}

"use client";

import { useThemeSetting } from "@/components/theme-provider";
import type { ThemeChoice } from "@/lib/theme-storage";

const options: { value: ThemeChoice; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useThemeSetting();

  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Theme</span>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeChoice)}
        className="w-full rounded-lg border border-zinc-300/80 bg-white px-2 py-1.5 text-xs text-zinc-900 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 dark:border-white/10 dark:bg-zinc-950/40 dark:text-zinc-200"
        aria-label="Color theme"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

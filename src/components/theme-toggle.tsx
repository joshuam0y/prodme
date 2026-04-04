"use client";

import { useThemeSetting } from "@/components/theme-provider";
import type { ThemeChoice } from "@/lib/theme-storage";

const options: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "Match system" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useThemeSetting();

  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Theme</span>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeChoice)}
        className="w-full rounded-lg border border-white/10 bg-zinc-950/40 px-2 py-1.5 text-xs text-zinc-200 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
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

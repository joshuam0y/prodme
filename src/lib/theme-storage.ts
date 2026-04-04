export const THEME_STORAGE_KEY = "prodlink-theme";

export type ThemeChoice = "light" | "dark" | "system";

export function parseThemeChoice(raw: string | null): ThemeChoice {
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

/** Applies the `dark` class on `<html>` for Tailwind-style dark surfaces. */
export function applyThemeChoice(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const dark =
    choice === "dark" ||
    (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Inline script for `beforeInteractive` — must stay in sync with `applyThemeChoice`. */
export const themeBootstrapScript = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var t=localStorage.getItem(k);var dark;if(t==="light")dark=false;else if(t==="dark")dark=true;else dark=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`;

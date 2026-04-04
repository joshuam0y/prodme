export const THEME_STORAGE_KEY = "prodlink-theme";

/** Dark is the default; users can switch to light only. */
export type ThemeChoice = "light" | "dark";

export function parseThemeChoice(raw: string | null): ThemeChoice {
  if (raw === "light") return "light";
  // Default + migrate legacy "system" and unknown values
  return "dark";
}

/** Applies the `dark` class on `<html>` for Tailwind-style dark surfaces. */
export function applyThemeChoice(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", choice === "dark");
}

/** Inline script for `beforeInteractive` — must stay in sync with `applyThemeChoice`. */
export const themeBootstrapScript = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var t=localStorage.getItem(k);var dark=t!=="light";document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`;

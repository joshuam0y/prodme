"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  applyThemeChoice,
  parseThemeChoice,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "@/lib/theme-storage";

type Ctx = {
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("dark");

  useEffect(() => {
    const parsed = parseThemeChoice(localStorage.getItem(THEME_STORAGE_KEY));
    setThemeState(parsed);
    localStorage.setItem(THEME_STORAGE_KEY, parsed);
  }, []);

  useEffect(() => {
    applyThemeChoice(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY || e.newValue == null) return;
      setThemeState(parseThemeChoice(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeState(t);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeSetting(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeSetting must be used within ThemeProvider");
  }
  return ctx;
}

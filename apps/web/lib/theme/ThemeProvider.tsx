"use client";

import { createContext, useCallback, useMemo } from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";

export type ThemeOption =
  | "auto"
  | "light"
  | "dark"
  | "matrix"
  | "oppenheimer-bw"
  | "barbie";
type ResolvedTheme = "light" | "dark" | "matrix" | "oppenheimer-bw" | "barbie";

const STORAGE_KEY = "35mm-theme";
const THEMES: ResolvedTheme[] = ["light", "dark", "matrix", "oppenheimer-bw", "barbie"];

interface ThemeContextValue {
  /** User preference: auto | light | dark | matrix | oppenheimer-bw */
  theme: ThemeOption;
  /** Actual applied theme after resolving "auto" */
  resolvedTheme: ResolvedTheme;
  /** Update user preference (persists to localStorage) */
  setTheme: (theme: ThemeOption) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "auto",
  resolvedTheme: "light",
  setTheme: () => { },
});

function ThemeContextBridge({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme, setTheme: setNextTheme } = useNextTheme();

  const mappedTheme: ThemeOption =
    theme === "system" || !theme ? "auto" : (theme as ThemeOption);
  const mappedResolvedTheme: ResolvedTheme =
    resolvedTheme && THEMES.includes(resolvedTheme as ResolvedTheme)
      ? (resolvedTheme as ResolvedTheme)
      : "light";

  const setTheme = useCallback(
    (newTheme: ThemeOption) => {
      setNextTheme(newTheme === "auto" ? "system" : newTheme);
    },
    [setNextTheme]
  );

  const value = useMemo(
    () => ({ theme: mappedTheme, resolvedTheme: mappedResolvedTheme, setTheme }),
    [mappedTheme, mappedResolvedTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      storageKey={STORAGE_KEY}
      themes={THEMES}
      disableTransitionOnChange
    >
      <ThemeContextBridge>{children}</ThemeContextBridge>
    </NextThemesProvider>
  );
}

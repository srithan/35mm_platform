"use client";

import { createContext, useCallback, useMemo, type ComponentType, type ReactNode } from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";

export type ThemeOption =
  | "auto"
  | "light"
  | "dark"
  | "matinee"
  | "matrix"
  | "oppenheimer-bw"
  | "barbie";
type ResolvedTheme = "light" | "dark" | "matinee" | "matrix" | "oppenheimer-bw" | "barbie";

const STORAGE_KEY = "35mm-theme";
const THEMES: ResolvedTheme[] = ["light", "dark", "matinee", "matrix", "oppenheimer-bw", "barbie"];

type React18NextThemesProviderProps = {
  children?: ReactNode;
  attribute?: `data-${string}` | "class" | Array<`data-${string}` | "class">;
  defaultTheme?: string;
  disableTransitionOnChange?: boolean;
  enableSystem?: boolean;
  storageKey?: string;
  themes?: string[];
};

// next-themes resolves React outside this pnpm workspace's isolated React 18
// type boundary. Keep the compatibility cast narrow and mirror its public API.
const React18NextThemesProvider =
  NextThemesProvider as unknown as ComponentType<React18NextThemesProviderProps>;

interface ThemeContextValue {
  /** User preference: auto | light | dark | matinee | matrix | oppenheimer-bw | barbie */
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
    <React18NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      storageKey={STORAGE_KEY}
      themes={THEMES}
      disableTransitionOnChange
    >
      <ThemeContextBridge>{children}</ThemeContextBridge>
    </React18NextThemesProvider>
  );
}

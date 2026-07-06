"use client";

import { useContext } from "react";
import { ThemeContext } from "./ThemeProvider";

/**
 * Hook to access and control the current theme.
 *
 * @returns `theme` — user pref (auto | light | dark | matinee | matrix | oppenheimer-bw)
 * @returns `resolvedTheme` — actual applied theme after resolving "auto"
 * @returns `setTheme` — update preference (persists to localStorage)
 */
export function useTheme() {
  return useContext(ThemeContext);
}

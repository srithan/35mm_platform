import type { AccentColorOption } from "./accentColors";

export const ACCENT_COLOR_STORAGE_KEY = "35mm-accent";

export function applyAccentColor(accentColor: AccentColorOption): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (accentColor === "theme") {
    root.removeAttribute("data-accent");
  } else {
    root.setAttribute("data-accent", accentColor);
  }

  try {
    localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, accentColor);
  } catch {
    /* ignore storage failures */
  }
}

export function readStoredAccentColor(): AccentColorOption | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(ACCENT_COLOR_STORAGE_KEY);
    return stored as AccentColorOption | null;
  } catch {
    return null;
  }
}

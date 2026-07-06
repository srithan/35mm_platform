import type { NotificationItem as ApiNotificationItem } from "@35mm/types";
import type { ThemeOption } from "@/lib/theme/ThemeProvider";

export type HeaderNotifRow = ApiNotificationItem;

export type ProfileMenuView = "main" | "appearance" | "privacy";
export type ProfileMenuDirection = "forward" | "back";

export const PROFILE_THEME_OPTIONS: { id: ThemeOption; label: string; swatch: string }[] = [
  { id: "auto", label: "Auto", swatch: "linear-gradient(90deg, #faf9f7 0 50%, #1f1d1a 50% 100%)" },
  { id: "light", label: "Light", swatch: "#faf9f7" },
  { id: "dark", label: "Dark", swatch: "#1f1d1a" },
  { id: "matinee", label: "Matinee", swatch: "linear-gradient(135deg, #f7f2e9 0 55%, #c2473a 55% 100%)" },
  { id: "matrix", label: "Matrix", swatch: "#0f2d1b" },
  { id: "oppenheimer-bw", label: "Oppenheimer B&W", swatch: "linear-gradient(135deg, #f4f4f1, #1d1d1b)" },
  { id: "barbie", label: "Barbie", swatch: "#f3a6c8" },
];

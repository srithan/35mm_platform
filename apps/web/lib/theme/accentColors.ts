export const ACCENT_COLOR_OPTIONS = [
  {
    id: "theme",
    label: "Theme default",
    swatch: "transparent",
  },
  {
    id: "warm-red",
    label: "Warm red",
    swatch: "#c2473a",
  },
  {
    id: "crimson",
    label: "Crimson",
    swatch: "#c93535",
  },
  {
    id: "amber",
    label: "Amber",
    swatch: "#b8861a",
  },
  {
    id: "forest",
    label: "Forest",
    swatch: "#2d6a4f",
  },
  {
    id: "ocean",
    label: "Ocean",
    swatch: "#2a6f97",
  },
  {
    id: "violet",
    label: "Violet",
    swatch: "#6d4c9a",
  },
  {
    id: "rose",
    label: "Rose",
    swatch: "#c45c8a",
  },
] as const;

export type AccentColorOption = (typeof ACCENT_COLOR_OPTIONS)[number]["id"];

export const DEFAULT_ACCENT_COLOR: AccentColorOption = "theme";

export const ACCENT_COLOR_IDS = ACCENT_COLOR_OPTIONS.map(function (option) {
  return option.id;
});

export function isAccentColorOption(value: string | null | undefined): value is AccentColorOption {
  if (typeof value !== "string") return false;
  return ACCENT_COLOR_IDS.includes(value as AccentColorOption);
}

export function resolveAccentColor(
  value: unknown,
  fallback: AccentColorOption = DEFAULT_ACCENT_COLOR
): AccentColorOption {
  if (typeof value === "string" && isAccentColorOption(value)) return value;
  return fallback;
}

export function getAccentColorLabel(id: AccentColorOption): string {
  const match = ACCENT_COLOR_OPTIONS.find(function (option) {
    return option.id === id;
  });
  return match?.label ?? "Theme default";
}

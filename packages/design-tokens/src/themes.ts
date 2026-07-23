import { brandColors } from "./foundation";

export const themePreferences = [
  "auto",
  "light",
  "dark",
  "matinee",
  "matrix",
  "oppenheimer-bw",
  "barbie",
] as const;

export const resolvedThemeIds = themePreferences.filter(
  (theme): theme is Exclude<ThemePreference, "auto"> => theme !== "auto",
);

export type ThemePreference = (typeof themePreferences)[number];
export type ResolvedThemeId = Exclude<ThemePreference, "auto">;
export type SystemColorScheme = "light" | "dark";

export interface ThemeColors {
  readonly surface: string;
  readonly surfaceElevated: string;
  readonly surfaceSunken: string;
  readonly surfacePressed: string;
  readonly fill: string;
  readonly fillStrong: string;
  readonly text: string;
  readonly textSecondary: string;
  readonly textTertiary: string;
  readonly border: string;
  readonly borderStrong: string;
  readonly accent: string;
  readonly accentPressed: string;
  readonly onAccent: string;
  readonly socialAccent: string;
  readonly socialAccentPressed: string;
  readonly destructive: string;
  readonly onDestructive: string;
  readonly like: string;
  readonly repost: string;
  readonly bookmark: string;
  readonly success: string;
  readonly warning: string;
  readonly focus: string;
  readonly skeleton: string;
  readonly skeletonStrong: string;
  readonly unreadBadge: string;
  readonly onUnreadBadge: string;
}

export interface ThemeDefinition {
  readonly id: ResolvedThemeId;
  readonly colorScheme: SystemColorScheme;
  readonly monochromeMedia: boolean;
  readonly colors: ThemeColors;
}

export const themes = {
  light: {
    id: "light",
    colorScheme: "light",
    monochromeMedia: false,
    colors: {
      surface: "#FFFFFF",
      surfaceElevated: "#FFFFFF",
      surfaceSunken: "#F5F5F5",
      surfacePressed: "#FAFAFA",
      fill: "#F0EEEB",
      fillStrong: "#E8E6E2",
      text: "#0F0F0F",
      textSecondary: "#6B6B6B",
      textTertiary: "#A8A8A8",
      border: "#EFF3F4",
      borderStrong: "#DDD9CF",
      accent: "#0F0F0F",
      accentPressed: "#1C1C1C",
      onAccent: "#FFFFFF",
      socialAccent: brandColors.socialBlue,
      socialAccentPressed: "#1877F2",
      destructive: "#B42318",
      onDestructive: "#FFFFFF",
      like: "#E4002B",
      repost: "#5A9E7A",
      bookmark: "#0F0F0F",
      success: "#27AE60",
      warning: "#E67E22",
      focus: "#0F0F0F66",
      skeleton: "#E8E6E2",
      skeletonStrong: "#DDD9CF",
      unreadBadge: "#C93535",
      onUnreadBadge: "#FFFFFF",
    },
  },
  dark: {
    id: "dark",
    colorScheme: "dark",
    monochromeMedia: false,
    colors: {
      surface: "#0E100F",
      surfaceElevated: "#191919",
      surfaceSunken: "#0F0E0D",
      surfacePressed: "#1A1C1B",
      fill: "#2D2B28",
      fillStrong: "#3D3A36",
      text: "#F5F3F0",
      textSecondary: "#A8A29E",
      textTertiary: "#8A8580",
      border: "#FFFFFF14",
      borderStrong: "#504B44",
      accent: "#F5F3F0",
      accentPressed: "#E8E6E2",
      onAccent: "#0E100F",
      socialAccent: brandColors.socialBlue,
      socialAccentPressed: "#1877F2",
      destructive: "#FF5F56",
      onDestructive: "#0E100F",
      like: "#FF2D55",
      repost: "#6BB890",
      bookmark: "#F5F3F0",
      success: "#34C759",
      warning: "#FF9F0A",
      focus: "#F5F3F066",
      skeleton: "#252320",
      skeletonStrong: "#302D28",
      unreadBadge: "#E04848",
      onUnreadBadge: "#0E100F",
    },
  },
  matinee: {
    id: "matinee",
    colorScheme: "light",
    monochromeMedia: false,
    colors: {
      surface: "#F7F2E9",
      surfaceElevated: "#EFE7D8",
      surfaceSunken: "#E9DFCE",
      surfacePressed: "#E9DFCE",
      fill: "#EFE7D8",
      fillStrong: "#DDD3BF",
      text: "#1C1A17",
      textSecondary: "#55504A",
      textTertiary: "#8B8378",
      border: "#DDD3BF",
      borderStrong: "#C9BDA5",
      accent: brandColors.warmRed,
      accentPressed: "#9C372C",
      onAccent: "#FFFFFF",
      socialAccent: brandColors.warmRed,
      socialAccentPressed: "#9C372C",
      destructive: "#A4362A",
      onDestructive: "#FFFFFF",
      like: brandColors.warmRed,
      repost: "#4D7C5F",
      bookmark: brandColors.warmRed,
      success: "#4D7C5F",
      warning: "#B8861A",
      focus: "#C2473A66",
      skeleton: "#E9DFCE",
      skeletonStrong: "#DDD3BF",
      unreadBadge: brandColors.warmRed,
      onUnreadBadge: "#FFFFFF",
    },
  },
  matrix: {
    id: "matrix",
    colorScheme: "dark",
    monochromeMedia: false,
    colors: {
      surface: "#000000",
      surfaceElevated: "#050505",
      surfaceSunken: "#020804",
      surfacePressed: "#0A1810",
      fill: "#102416",
      fillStrong: "#1A3B24",
      text: "#00FF41",
      textSecondary: "#00B32C",
      textTertiary: "#008020",
      border: "#00FF4126",
      borderStrong: "#00FF4159",
      accent: "#00FF41",
      accentPressed: "#33FF67",
      onAccent: "#001905",
      socialAccent: brandColors.socialBlue,
      socialAccentPressed: "#1877F2",
      destructive: "#FF5F56",
      onDestructive: "#000000",
      like: "#00FF41",
      repost: "#00FF41",
      bookmark: "#00FF41",
      success: "#00FF41",
      warning: "#CCFF00",
      focus: "#00FF4166",
      skeleton: "#0A1F10",
      skeletonStrong: "#11361B",
      unreadBadge: "#00FF41",
      onUnreadBadge: "#001905",
    },
  },
  "oppenheimer-bw": {
    id: "oppenheimer-bw",
    colorScheme: "dark",
    monochromeMedia: true,
    colors: {
      surface: "#0A0A0A",
      surfaceElevated: "#121212",
      surfaceSunken: "#060606",
      surfacePressed: "#171717",
      fill: "#242424",
      fillStrong: "#303030",
      text: "#F4F4F4",
      textSecondary: "#B0B0B0",
      textTertiary: "#8B8B8B",
      border: "#FFFFFF1F",
      borderStrong: "#FFFFFF3D",
      accent: "#D9D9D9",
      accentPressed: "#F0F0F0",
      onAccent: "#0A0A0A",
      socialAccent: brandColors.socialBlue,
      socialAccentPressed: "#1877F2",
      destructive: "#F4F4F4",
      onDestructive: "#0A0A0A",
      like: "#D8D8D8",
      repost: "#C6C6C6",
      bookmark: "#D9D9D9",
      success: "#D0D0D0",
      warning: "#BDBDBD",
      focus: "#F4F4F466",
      skeleton: "#242424",
      skeletonStrong: "#303030",
      unreadBadge: "#D9D9D9",
      onUnreadBadge: "#0A0A0A",
    },
  },
  barbie: {
    id: "barbie",
    colorScheme: "light",
    monochromeMedia: false,
    colors: {
      surface: "#FFD6F0",
      surfaceElevated: "#FFCAEB",
      surfaceSunken: "#FFC0E5",
      surfacePressed: "#FFE8F7",
      fill: "#FFE3F5",
      fillStrong: "#FFC4F3",
      text: "#3D0A2E",
      textSecondary: "#8A3A68",
      textTertiary: "#B05890",
      border: "#FF36AF26",
      borderStrong: "#FF36AF4D",
      accent: "#FF36AF",
      accentPressed: "#FF5CBE",
      onAccent: "#3D0A2E",
      socialAccent: brandColors.socialBlue,
      socialAccentPressed: "#1877F2",
      destructive: "#A31461",
      onDestructive: "#FFFFFF",
      like: "#FF36AF",
      repost: "#FA73CB",
      bookmark: "#FF36AF",
      success: "#E85DAE",
      warning: "#FF9EE2",
      focus: "#3D0A2E66",
      skeleton: "#FFD6F0",
      skeletonStrong: "#FFC4E8",
      unreadBadge: "#FF36AF",
      onUnreadBadge: "#3D0A2E",
    },
  },
} as const satisfies Record<ResolvedThemeId, ThemeDefinition>;

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && themePreferences.some((theme) => theme === value);
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemColorScheme: SystemColorScheme,
): ThemeDefinition {
  return preference === "auto" ? themes[systemColorScheme] : themes[preference];
}

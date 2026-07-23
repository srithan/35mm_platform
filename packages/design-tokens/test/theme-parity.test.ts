import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isThemePreference,
  resolveMotion,
  resolveThemePreference,
  resolvedThemeIds,
  spacing,
  themePreferences,
  themes,
} from "../src/index.js";
import {
  knownThemeReferenceDivergences,
  parityColorKeys,
  themeParityFixtures,
  type ParityColorKey,
  type ParityPalette,
} from "../src/fixtures/index.js";

const webCss = readFileSync(
  fileURLToPath(new URL("../../../apps/web/app/globals.css", import.meta.url)),
  "utf8",
);
const swiftTheme = readFileSync(
  fileURLToPath(new URL("../../../apps/ios/ThirtyFiveMM/Core/Theme.swift", import.meta.url)),
  "utf8",
);

const webVariableByParityKey: Readonly<Record<ParityColorKey, string>> = {
  surface: "--color-bg",
  surfaceElevated: "--color-bg-elevated",
  surfaceSunken: "--color-bg-sunken",
  surfacePressed: "--color-card-hover",
  text: "--color-text",
  textSecondary: "--color-text-secondary",
  textTertiary: "--color-text-tertiary",
  border: "--color-border",
  borderStrong: "--color-border-strong",
  accent: "--color-accent",
  socialAccent: "--color-social-accent",
  like: "--color-like",
  repost: "--color-repost",
  success: "--color-success",
  warning: "--color-warning",
  unreadBadge: "--color-unread-badge",
};

const swiftPropertyByParityKey: Readonly<Record<ParityColorKey, string>> = {
  surface: "uiBg",
  surfaceElevated: "uiBgElevated",
  surfaceSunken: "uiBgSunken",
  surfacePressed: "uiBgHover",
  text: "uiText",
  textSecondary: "uiTextSecondary",
  textTertiary: "uiTextTertiary",
  border: "uiBorder",
  borderStrong: "uiBorderStrong",
  accent: "uiAccent",
  socialAccent: "uiSocialAccent",
  like: "uiLike",
  repost: "uiRepost",
  success: "uiSuccess",
  warning: "uiWarning",
  unreadBadge: "uiUnreadBadge",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cssBlock(selector: string): string {
  const match = webCss.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match?.[1]) throw new Error(`Missing CSS block for ${selector}`);
  return match[1];
}

function cssDeclarations(block: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const match of block.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/gi)) {
    const [, name, value] = match;
    if (name && value) declarations.set(name, value.trim());
  }
  return declarations;
}

function normalizeColor(value: string): string {
  const compact = value.replace(/\s+/g, "");
  const hex = compact.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (hex?.[1]) return `#${hex[1].toUpperCase()}${hex[2]?.toUpperCase() ?? ""}`;

  const rgb = compact.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
  if (!rgb?.[1] || !rgb[2] || !rgb[3]) throw new Error(`Unsupported color: ${value}`);
  const alpha = rgb[4] === undefined ? 1 : Number(rgb[4]);
  const parts = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
    .map((part) => part.toString(16).padStart(2, "0").toUpperCase())
    .join("");
  const alphaHex = alpha === 1 ? "" : Math.round(alpha * 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${parts}${alphaHex}`;
}

function resolveCssValue(name: string, declarations: Map<string, string>, seen = new Set<string>()): string {
  if (seen.has(name)) throw new Error(`Circular CSS variable: ${name}`);
  seen.add(name);
  const value = declarations.get(name);
  if (!value) throw new Error(`Missing CSS variable: ${name}`);
  const alias = value.match(/^var\((--[a-z0-9-]+)\)$/i);
  return alias?.[1] ? resolveCssValue(alias[1], declarations, seen) : normalizeColor(value);
}

function extractWebPalette(id: keyof typeof themeParityFixtures): ParityPalette {
  const fixture = themeParityFixtures[id];
  const declarations = cssDeclarations(cssBlock(":root"));
  if (fixture.webSelector !== ":root") {
    for (const [name, value] of cssDeclarations(cssBlock(fixture.webSelector))) declarations.set(name, value);
  }

  const palette = Object.fromEntries(
    parityColorKeys.map((key) => [key, resolveCssValue(webVariableByParityKey[key], declarations)]),
  ) as Record<ParityColorKey, string>;

  // Web renders these badges through selector-level overrides rather than the
  // base custom property. Fixtures capture visible output, not only variables.
  if (id === "matrix" || id === "oppenheimer-bw") palette.unreadBadge = palette.accent;
  if (id === "barbie") palette.unreadBadge = "#FF36AF";
  return palette;
}

function extractSwiftPalette(id: keyof typeof themeParityFixtures): ParityPalette {
  const fixture = themeParityFixtures[id];
  const match = swiftTheme.match(
    new RegExp(`static let ${fixture.swiftPalette} = ThemePalette\\(([\\s\\S]*?)\\n  \\)`),
  );
  if (!match?.[1]) throw new Error(`Missing Swift palette for ${fixture.swiftPalette}`);

  const palette = {} as Record<ParityColorKey, string>;
  for (const key of parityColorKeys) {
    const property = swiftPropertyByParityKey[key];
    const colorMatch = match[1].match(
      new RegExp(`${property}: UIColor\\(hex: 0x([0-9A-Fa-f]{6})(?:, alpha: ([\\d.]+))?\\)`),
    );
    if (!colorMatch?.[1]) throw new Error(`Missing Swift color ${fixture.swiftPalette}.${property}`);
    const alpha = colorMatch[2] === undefined ? "" : Math.round(Number(colorMatch[2]) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
    palette[key] = `#${colorMatch[1].toUpperCase()}${alpha}`;
  }
  return palette;
}

function rgb(color: string): readonly [number, number, number] {
  const match = color.match(/^#([0-9A-F]{6})$/i);
  if (!match?.[1]) throw new Error(`Contrast requires opaque six-digit hex: ${color}`);
  return [0, 2, 4].map((offset) => Number.parseInt(match[1]!.slice(offset, offset + 2), 16)) as unknown as readonly [number, number, number];
}

function luminance(color: string): number {
  const channels = rgb(color).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrast(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

describe("theme parity fixtures", () => {
  it("keeps preference IDs aligned with web and SwiftUI", () => {
    expect(themePreferences).toEqual([
      "auto",
      "light",
      "dark",
      "matinee",
      "matrix",
      "oppenheimer-bw",
      "barbie",
    ]);
    expect(resolvedThemeIds).toEqual(Object.keys(themeParityFixtures));
    expect(themePreferences.every(isThemePreference)).toBe(true);
    expect(isThemePreference("system")).toBe(false);
  });

  it.each(resolvedThemeIds)("matches mobile-web source for %s", (id) => {
    expect(extractWebPalette(id)).toEqual(themeParityFixtures[id].selected);
  });

  it.each(resolvedThemeIds)("tracks SwiftUI source for %s", (id) => {
    const fixture = themeParityFixtures[id];
    const swiftOverrides = "swiftOverrides" in fixture ? fixture.swiftOverrides : undefined;
    expect(extractSwiftPalette(id)).toEqual({ ...fixture.selected, ...swiftOverrides });
  });

  it.each(resolvedThemeIds)("publishes selected parity colors for %s", (id) => {
    const selected = Object.fromEntries(
      parityColorKeys.map((key) => [key, themes[id].colors[key]]),
    );
    expect(selected).toEqual(themeParityFixtures[id].selected);
  });

  it("records every intentional web/Swift reference divergence", () => {
    expect(knownThemeReferenceDivergences).toHaveLength(3);
  });

  it("resolves auto without inventing a seventh static palette", () => {
    expect(resolveThemePreference("auto", "light")).toBe(themes.light);
    expect(resolveThemePreference("auto", "dark")).toBe(themes.dark);
  });
});

describe("foundation invariants", () => {
  it("keeps spacing on a four-point grid", () => {
    expect(Object.values(spacing).every((value) => value % 4 === 0)).toBe(true);
  });

  it.each(resolvedThemeIds)("meets AA contrast for critical %s theme pairs", (id) => {
    const colors = themes[id].colors;
    expect(contrast(colors.text, colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.textSecondary, colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onDestructive, colors.destructive)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onUnreadBadge, colors.unreadBadge)).toBeGreaterThanOrEqual(4.5);
  });

  it("removes spatial and continuous motion under Reduce Motion", () => {
    expect(resolveMotion("sheet", true).duration).toBe(0);
    expect(resolveMotion("drawer", true).duration).toBe(0);
    expect(resolveMotion("skeletonPulse", true).duration).toBe(0);
    expect(resolveMotion("fade", true).duration).toBe(120);
  });
});

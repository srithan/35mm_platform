import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from "@expo-google-fonts/dm-mono";
import {
  typography,
  type FontWeight,
  type TypographyToken,
} from "@35mm/design-tokens";

export const mobileFonts = {
  displayRegular: "DMSerifDisplay_400Regular",
  bodyRegular: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemiBold: "DMSans_600SemiBold",
  bodyBold: "DMSans_700Bold",
  monoRegular: "DMMono_400Regular",
  monoMedium: "DMMono_500Medium",
} as const;

export const mobileFontAssets = {
  [mobileFonts.displayRegular]: DMSerifDisplay_400Regular,
  [mobileFonts.bodyRegular]: DMSans_400Regular,
  [mobileFonts.bodyMedium]: DMSans_500Medium,
  [mobileFonts.bodySemiBold]: DMSans_600SemiBold,
  [mobileFonts.bodyBold]: DMSans_700Bold,
  [mobileFonts.monoRegular]: DMMono_400Regular,
  [mobileFonts.monoMedium]: DMMono_500Medium,
} as const satisfies Record<string, number>;

function bodyFont(weight: FontWeight): string {
  switch (weight) {
    case "400":
      return mobileFonts.bodyRegular;
    case "500":
      return mobileFonts.bodyMedium;
    case "600":
      return mobileFonts.bodySemiBold;
    case "700":
      return mobileFonts.bodyBold;
  }
}

export function fontFamilyForTypography(token: TypographyToken): string {
  switch (token.family) {
    case "display":
      return mobileFonts.displayRegular;
    case "mono":
      return token.fontWeight === "500"
        ? mobileFonts.monoMedium
        : mobileFonts.monoRegular;
    case "body":
      return bodyFont(token.fontWeight);
  }
}

export type TypographyRole = keyof typeof typography;

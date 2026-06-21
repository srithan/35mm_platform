"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSettingsQuery } from "@/features/settings/hooks/useSettings";
import {
  DEFAULT_ACCENT_COLOR,
  isAccentColorOption,
  resolveAccentColor,
  type AccentColorOption,
} from "./accentColors";
import { applyAccentColor, readStoredAccentColor } from "./applyAccentColor";

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const settingsQuery = useSettingsQuery();
  const accentColorSetting = settingsQuery.data?.appearance?.accentColor;

  useEffect(
    function () {
      let accentColor: AccentColorOption = DEFAULT_ACCENT_COLOR;

      if (isLoaded && isSignedIn && settingsQuery.isFetched && accentColorSetting) {
        accentColor = resolveAccentColor(accentColorSetting);
      } else {
        const stored = readStoredAccentColor();
        if (stored && isAccentColorOption(stored)) {
          accentColor = stored;
        }
      }

      applyAccentColor(accentColor);
    },
    [
      isLoaded,
      isSignedIn,
      settingsQuery.isFetched,
      accentColorSetting,
    ]
  );

  return children;
}

import {
  AccessibilityInfo,
  Platform,
  useColorScheme,
  type ColorSchemeName,
  type ViewStyle,
} from "react-native";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  elevation,
  resolveThemePreference,
  type ElevationToken,
  type ResolvedThemeId,
  type SystemColorScheme,
  type ThemeDefinition,
  type ThemePreference,
} from "@35mm/design-tokens";

export interface MobileUIContextValue {
  readonly preference: ThemePreference;
  readonly theme: ThemeDefinition;
  readonly themeId: ResolvedThemeId;
  readonly systemColorScheme: SystemColorScheme;
  readonly reduceMotion: boolean;
}

const MobileUIContext = createContext<MobileUIContextValue | null>(null);

function normalizeColorScheme(value: ColorSchemeName): SystemColorScheme {
  return value === "dark" ? "dark" : "light";
}

function useSystemReduceMotion(override: boolean | undefined): boolean {
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  useEffect(() => {
    if (override !== undefined) return;

    let isMounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((isEnabled) => {
      if (isMounted) setSystemReduceMotion(isEnabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setSystemReduceMotion,
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [override]);

  return override ?? systemReduceMotion;
}

export interface MobileUIProviderProps {
  readonly preference: ThemePreference;
  readonly children: ReactNode;
  readonly systemColorScheme?: SystemColorScheme;
  readonly reduceMotion?: boolean;
}

export function MobileUIProvider({
  preference,
  children,
  systemColorScheme: systemColorSchemeOverride,
  reduceMotion: reduceMotionOverride,
}: MobileUIProviderProps) {
  const nativeColorScheme = useColorScheme();
  const systemColorScheme =
    systemColorSchemeOverride ?? normalizeColorScheme(nativeColorScheme);
  const reduceMotion = useSystemReduceMotion(reduceMotionOverride);

  const value = useMemo<MobileUIContextValue>(() => {
    const theme = resolveThemePreference(preference, systemColorScheme);
    return {
      preference,
      theme,
      themeId: theme.id,
      systemColorScheme,
      reduceMotion,
    };
  }, [preference, reduceMotion, systemColorScheme]);

  return (
    <MobileUIContext.Provider value={value}>
      {children}
    </MobileUIContext.Provider>
  );
}

export function useMobileUI(): MobileUIContextValue {
  const value = useContext(MobileUIContext);
  if (!value) {
    throw new Error("useMobileUI must be used within MobileUIProvider.");
  }
  return value;
}

export type ElevationName = keyof typeof elevation;

export function elevationStyle(name: ElevationName): ViewStyle {
  const token: ElevationToken = elevation[name];
  if (Platform.OS === "android") {
    return { elevation: token.android.elevation };
  }

  return {
    shadowColor: token.ios.color,
    shadowOpacity: token.ios.opacity,
    shadowRadius: token.ios.radius,
    shadowOffset: {
      width: token.ios.offsetX,
      height: token.ios.offsetY,
    },
  };
}

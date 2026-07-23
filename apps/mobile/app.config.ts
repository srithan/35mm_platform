import type { ConfigContext, ExpoConfig } from "expo/config";

export const APP_VARIANT_KEYS = ["development", "preview"] as const;

export type AppVariantKey = (typeof APP_VARIANT_KEYS)[number];

export interface AppVariantConfig {
  readonly key: AppVariantKey;
  readonly name: string;
  readonly applicationId: string;
  readonly scheme: string;
  readonly appleSignInEnabled: boolean;
}

export const APP_VARIANTS: Readonly<Record<AppVariantKey, AppVariantConfig>> = {
  development: {
    key: "development",
    name: "35mm Dev",
    applicationId: "com.thirtyfivemm.mobile.dev",
    scheme: "thirtyfivemm-dev",
    appleSignInEnabled: false,
  },
  preview: {
    key: "preview",
    name: "35mm Preview",
    applicationId: "com.thirtyfivemm.mobile.preview",
    scheme: "thirtyfivemm-preview",
    appleSignInEnabled: true,
  },
};

export const EXPLICIT_CONFIG_PLUGIN_NAMES = [
  "expo-dev-client",
  "expo-router",
  "@clerk/expo",
  "expo-secure-store",
  "expo-build-properties",
  "expo-system-ui",
  "./plugins/with-expo-constants-project-root.cjs",
  "./plugins/with-retained-expo-modules-provider.cjs",
  "./plugins/with-quoted-react-native-bundle-script.cjs",
] as const;

export function resolveAppVariant(value: string | undefined): AppVariantConfig {
  const normalizedValue = value?.trim();

  if (normalizedValue === "development" || normalizedValue === "preview") {
    return APP_VARIANTS[normalizedValue];
  }

  const received = normalizedValue ? ` Received \"${normalizedValue}\".` : "";
  throw new Error(
    `APP_VARIANT must be one of: ${APP_VARIANT_KEYS.join(", ")}.${received}`,
  );
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveAppVariant(process.env.APP_VARIANT);

  return {
    ...config,
    name: variant.name,
    slug: "thirtyfivemm-mobile",
    version: "0.1.0",
    platforms: ["ios", "android"],
    orientation: "default",
    scheme: variant.scheme,
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: variant.applicationId,
      supportsTablet: true,
    },
    android: {
      package: variant.applicationId,
      predictiveBackGestureEnabled: true,
    },
    plugins: [
      [
        EXPLICIT_CONFIG_PLUGIN_NAMES[0],
        {
          addGeneratedScheme: variant.key === "development",
          ...(variant.key === "development"
            ? { launchMode: "launcher" as const }
            : {}),
        },
      ],
      EXPLICIT_CONFIG_PLUGIN_NAMES[1],
      [
        EXPLICIT_CONFIG_PLUGIN_NAMES[2],
        {
          appleSignIn: variant.appleSignInEnabled,
        },
      ],
      EXPLICIT_CONFIG_PLUGIN_NAMES[3],
      [
        EXPLICIT_CONFIG_PLUGIN_NAMES[4],
        {
          android: {
            minSdkVersion: 24,
            compileSdkVersion: 36,
            targetSdkVersion: 36,
          },
          ios: {
            deploymentTarget: "17.0",
          },
        },
      ],
      EXPLICIT_CONFIG_PLUGIN_NAMES[5],
      EXPLICIT_CONFIG_PLUGIN_NAMES[6],
      EXPLICIT_CONFIG_PLUGIN_NAMES[7],
      EXPLICIT_CONFIG_PLUGIN_NAMES[8],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      ...config.extra,
      appVariant: variant.key,
      appleSignInEnabled: variant.appleSignInEnabled,
    },
  };
};

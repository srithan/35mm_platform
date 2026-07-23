export const GENERATED_NATIVE_DIRECTORIES = Object.freeze(["android", "ios"]);

export const SUPPORTED_NATIVE_PLATFORMS = Object.freeze([
  ...GENERATED_NATIVE_DIRECTORIES,
  "all",
]);

export const SUPPORTED_APP_VARIANTS = Object.freeze(["development", "preview"]);

export const NATIVE_VARIANT_EXPECTATIONS = Object.freeze({
  development: Object.freeze({
    applicationId: "com.thirtyfivemm.mobile.dev",
    name: "35mm Dev",
    scheme: "thirtyfivemm-dev",
    appleSignInEnabled: false,
    disablesRecentBundleAutoLaunch: true,
  }),
  preview: Object.freeze({
    applicationId: "com.thirtyfivemm.mobile.preview",
    name: "35mm Preview",
    scheme: "thirtyfivemm-preview",
    appleSignInEnabled: true,
    disablesRecentBundleAutoLaunch: false,
  }),
});

export const EXPLICIT_CONFIG_PLUGINS = Object.freeze([
  "expo-dev-client",
  "expo-router",
  "@clerk/expo",
  "expo-secure-store",
  "expo-build-properties",
  "expo-system-ui",
  "./plugins/with-expo-constants-project-root.cjs",
  "./plugins/with-retained-expo-modules-provider.cjs",
  "./plugins/with-quoted-react-native-bundle-script.cjs",
]);

// Expo resolves transitive and legacy plugins in addition to app.config.ts entries.
// Any change here requires native-impact review and a deliberate baseline update.
export const EXPECTED_RESOLVED_PLUGIN_HISTORY = Object.freeze({
  "expo-dev-client": "57.0.8",
  "expo-dev-menu": "57.0.8",
  "expo-dev-launcher": "57.0.8",
  "expo-secure-store": "57.0.1",
  "expo-system-ui": "57.0.1",
  "@35mm/with-expo-constants-project-root": "1.0.0",
  "@35mm/with-retained-expo-modules-provider": "1.0.0",
  "@35mm/with-quoted-react-native-bundle-script": "1.0.0",
  "react-native-maps": "UNVERSIONED",
  "expo-apple-authentication": "UNVERSIONED",
  "expo-contacts": "UNVERSIONED",
  "expo-notifications": "UNVERSIONED",
  "expo-updates": "UNVERSIONED",
  "expo-document-picker": "UNVERSIONED",
});

export const EXPECTED_AUTOLINKED_NATIVE_MODULES = Object.freeze([
  "@clerk/expo",
  "@expo/dom-webview",
  "@expo/log-box",
  "@expo/ui",
  "expo",
  "expo-asset",
  "expo-constants",
  "expo-crypto",
  "expo-dev-client",
  "expo-dev-launcher",
  "expo-dev-menu",
  "expo-dev-menu-interface",
  "expo-file-system",
  "expo-font",
  "expo-glass-effect",
  "expo-json-utils",
  "expo-keep-awake",
  "expo-linking",
  "expo-manifests",
  "expo-modules-core",
  "expo-modules-jsi",
  "expo-router",
  "expo-secure-store",
  "expo-status-bar",
  "expo-symbols",
  "expo-system-ui",
  "expo-updates-interface",
]);

export const PROTECTED_SWIFTUI_BUNDLE_IDENTIFIER = "com.35mm.app";

import type { ConfigContext } from "expo/config";

import createExpoConfig, {
  APP_VARIANTS,
  EXPLICIT_CONFIG_PLUGIN_NAMES,
  resolveAppVariant,
} from "../../app.config";

const CONFIG_CONTEXT = {
  config: {
    name: "",
    slug: "",
  },
} as ConfigContext;

describe("mobile app variants", () => {
  const originalVariant = process.env.APP_VARIANT;

  afterEach(() => {
    if (originalVariant === undefined) {
      delete process.env.APP_VARIANT;
    } else {
      process.env.APP_VARIANT = originalVariant;
    }
  });

  it.each(["development", "preview"] as const)(
    "resolves isolated %s native identity",
    (variantKey) => {
      process.env.APP_VARIANT = variantKey;

      const config = createExpoConfig(CONFIG_CONTEXT);
      const expected = APP_VARIANTS[variantKey];

      expect(config.name).toBe(expected.name);
      expect(config.scheme).toBe(expected.scheme);
      expect(config.ios?.bundleIdentifier).toBe(expected.applicationId);
      expect(config.android?.package).toBe(expected.applicationId);
      expect(config.extra?.appVariant).toBe(variantKey);
      expect(config.extra?.appleSignInEnabled).toBe(
        expected.appleSignInEnabled,
      );
    },
  );

  it.each(["development", "preview"] as const)(
    "configures Clerk Apple Sign-In capability for %s",
    (variantKey) => {
      process.env.APP_VARIANT = variantKey;

      const config = createExpoConfig(CONFIG_CONTEXT);
      const clerkPlugin = config.plugins?.[2];

      expect(clerkPlugin).toEqual([
        "@clerk/expo",
        { appleSignIn: APP_VARIANTS[variantKey].appleSignInEnabled },
      ]);
    },
  );

  it("disables automatic recent-bundle launch in development", () => {
    process.env.APP_VARIANT = "development";

    const config = createExpoConfig(CONFIG_CONTEXT);

    expect(config.plugins?.[0]).toEqual([
      "expo-dev-client",
      {
        addGeneratedScheme: true,
        launchMode: "launcher",
      },
    ]);
  });

  it("does not add development auto-launch preferences to preview", () => {
    process.env.APP_VARIANT = "preview";

    const config = createExpoConfig(CONFIG_CONTEXT);

    expect(config.plugins?.[0]).toEqual([
      "expo-dev-client",
      { addGeneratedScheme: false },
    ]);
  });

  it("keeps development and preview identities distinct", () => {
    expect(APP_VARIANTS.development.name).not.toBe(APP_VARIANTS.preview.name);
    expect(APP_VARIANTS.development.scheme).not.toBe(APP_VARIANTS.preview.scheme);
    expect(APP_VARIANTS.development.applicationId).not.toBe(
      APP_VARIANTS.preview.applicationId,
    );
  });

  it.each(["development", "preview"] as const)(
    "declares the reviewed config-plugin order for %s",
    (variantKey) => {
      process.env.APP_VARIANT = variantKey;

      const config = createExpoConfig(CONFIG_CONTEXT);
      const pluginNames = config.plugins?.map((plugin) =>
        Array.isArray(plugin) ? plugin[0] : plugin,
      );

      expect(pluginNames).toEqual(EXPLICIT_CONFIG_PLUGIN_NAMES);
    },
  );

  it.each([undefined, "", "production", "Development"])(
    "rejects missing or unsupported APP_VARIANT value %p",
    (value) => {
      expect(() => resolveAppVariant(value)).toThrow(
        "APP_VARIANT must be one of: development, preview.",
      );
    },
  );
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const expoCliPath = require.resolve("expo/bin/cli");
const EXPECTED_VARIANTS = {
  development: {
    name: "35mm Dev",
    applicationId: "com.thirtyfivemm.mobile.dev",
    scheme: "thirtyfivemm-dev",
    appleSignInEnabled: false,
  },
  preview: {
    name: "35mm Preview",
    applicationId: "com.thirtyfivemm.mobile.preview",
    scheme: "thirtyfivemm-preview",
    appleSignInEnabled: true,
  },
};

function resolvePublicConfig(variant) {
  const result = spawnSync(
    process.execPath,
    [expoCliPath, "config", "--type", "public", "--json"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        APP_VARIANT: variant,
      },
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Expo config failed for ${variant}.`);
  }

  return JSON.parse(result.stdout);
}

const resolvedConfigs = Object.entries(EXPECTED_VARIANTS).map(
  ([variant, expected]) => {
    const config = resolvePublicConfig(variant);

    assert.equal(config.name, expected.name, `${variant} display name`);
    assert.equal(config.scheme, expected.scheme, `${variant} URL scheme`);
    assert.equal(config.ios?.bundleIdentifier, expected.applicationId, `${variant} iOS ID`);
    assert.equal(config.android?.package, expected.applicationId, `${variant} Android ID`);
    assert.equal(config.extra?.appVariant, variant, `${variant} public variant marker`);
    assert.equal(
      config.extra?.appleSignInEnabled,
      expected.appleSignInEnabled,
      `${variant} public Apple Sign-In capability`,
    );

    return config;
  },
);

const easConfig = JSON.parse(
  readFileSync(new URL("../eas.json", import.meta.url), "utf8"),
);
const buildProfiles = easConfig.build;

assert.deepEqual(
  Object.keys(buildProfiles).sort(),
  ["development", "preview"],
  "only validated, non-production build profiles may exist",
);
assert.equal(buildProfiles.development.developmentClient, true);
assert.equal(buildProfiles.development.distribution, "internal");
assert.equal(buildProfiles.development.environment, "development");
assert.equal(buildProfiles.development.env?.APP_VARIANT, "development");
assert.equal(buildProfiles.preview.developmentClient, undefined);
assert.equal(buildProfiles.preview.distribution, "internal");
assert.equal(buildProfiles.preview.environment, "preview");
assert.equal(buildProfiles.preview.env?.APP_VARIANT, "preview");

assert.notEqual(resolvedConfigs[0].name, resolvedConfigs[1].name, "display names must differ");
assert.notEqual(resolvedConfigs[0].scheme, resolvedConfigs[1].scheme, "URL schemes must differ");
assert.notEqual(
  resolvedConfigs[0].ios?.bundleIdentifier,
  resolvedConfigs[1].ios?.bundleIdentifier,
  "iOS identifiers must differ",
);
assert.notEqual(
  resolvedConfigs[0].android?.package,
  resolvedConfigs[1].android?.package,
  "Android identifiers must differ",
);

process.stdout.write("Validated development and preview Expo configurations.\n");

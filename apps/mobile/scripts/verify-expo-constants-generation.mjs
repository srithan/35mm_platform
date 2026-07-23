import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";

import {
  NATIVE_VARIANT_EXPECTATIONS,
  SUPPORTED_APP_VARIANTS,
} from "./native-generation-policy.mjs";
import { mobileRoot } from "./native-generation-helpers.mjs";

const expoConstantsRoot = realpathSync(
  resolve(mobileRoot, "node_modules/expo-constants"),
);
const generatorPath = resolve(
  expoConstantsRoot,
  "scripts/get-app-config-ios.sh",
);

assert.equal(
  lstatSync(generatorPath).isFile(),
  true,
  "Expo Constants iOS app-config generator is missing.",
);

const scratchRoot = mkdtempSync(
  join(tmpdir(), "35mm expo constants path with spaces "),
);

try {
  for (const variant of SUPPORTED_APP_VARIANTS) {
    const expected = NATIVE_VARIANT_EXPECTATIONS[variant];
    const buildRoot = resolve(scratchRoot, variant, "Build Products");
    const bundleRoot = resolve(buildRoot, "EXConstants.bundle");
    const projectDirectory = resolve(
      scratchRoot,
      variant,
      "Generated Project With Spaces",
      "Pods",
    );

    mkdirSync(bundleRoot, { recursive: true });
    mkdirSync(projectDirectory, { recursive: true });

    const result = spawnSync("/bin/bash", [generatorPath], {
      cwd: mobileRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        APP_VARIANT: variant,
        BUNDLE_FORMAT: "shallow",
        CONFIGURATION_BUILD_DIR: buildRoot,
        NODE_ENV: "production",
        PROJECT_DIR: projectDirectory,
        PROJECT_ROOT: mobileRoot,
      },
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(
        result.stderr.trim() ||
          result.stdout.trim() ||
          `Expo Constants generation failed for ${variant}.`,
      );
    }

    const configPath = resolve(bundleRoot, "app.config");
    const embeddedConfig = JSON.parse(readFileSync(configPath, "utf8"));

    assert.equal(embeddedConfig.name, expected.name);
    assert.equal(embeddedConfig.scheme, expected.scheme);
    assert.equal(embeddedConfig.ios?.bundleIdentifier, expected.applicationId);
    assert.equal(embeddedConfig.android?.package, expected.applicationId);
    assert.equal(embeddedConfig.extra?.appVariant, variant);
  }
} finally {
  rmSync(scratchRoot, { force: true, recursive: true });
}

process.stdout.write(
  "Verified Expo Constants manifest generation for development and preview through a path containing spaces.\n",
);

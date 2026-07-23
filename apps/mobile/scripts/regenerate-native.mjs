import { spawnSync } from "node:child_process";
import process from "node:process";

import {
  GENERATED_NATIVE_DIRECTORIES,
  SUPPORTED_APP_VARIANTS,
  SUPPORTED_NATIVE_PLATFORMS,
} from "./native-generation-policy.mjs";
import {
  assertSafeGeneratedDirectory,
  expoCliPath,
  mobileRoot,
} from "./native-generation-helpers.mjs";

const [variant, platform] = process.argv.slice(2);

if (!SUPPORTED_APP_VARIANTS.includes(variant)) {
  process.stderr.write(
    "Usage: pnpm native:regenerate <development|preview> <ios|android|all>\n",
  );
  process.exit(1);
}

if (!SUPPORTED_NATIVE_PLATFORMS.includes(platform)) {
  process.stderr.write(
    "Usage: pnpm native:regenerate <development|preview> <ios|android|all>\n",
  );
  process.exit(1);
}

const configuredVariant = process.env.APP_VARIANT?.trim();
if (configuredVariant && configuredVariant !== variant) {
  process.stderr.write(
    `APP_VARIANT is "${configuredVariant}", but regeneration requested "${variant}".\n`,
  );
  process.exit(1);
}

const targetDirectories =
  platform === "all" ? GENERATED_NATIVE_DIRECTORIES : [platform];

try {
  targetDirectories.forEach(assertSafeGeneratedDirectory);
} catch (error) {
  process.stderr.write(
    `Native regeneration safety check failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    expoCliPath,
    "prebuild",
    "--clean",
    "--no-install",
    "--platform",
    platform,
  ],
  {
    cwd: mobileRoot,
    env: {
      ...process.env,
      APP_VARIANT: variant,
      EXPO_NO_GIT_STATUS: "1",
    },
    stdio: "inherit",
  },
);

if (result.error) {
  process.stderr.write(`Unable to run Expo prebuild: ${result.error.message}\n`);
  process.exit(1);
}

process.exit(result.status ?? 1);

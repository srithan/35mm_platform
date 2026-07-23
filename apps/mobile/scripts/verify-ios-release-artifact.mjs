import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import {
  NATIVE_VARIANT_EXPECTATIONS,
  SUPPORTED_APP_VARIANTS,
} from "./native-generation-policy.mjs";

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      result.stderr.trim() ||
        result.stdout.trim() ||
        `${command} ${args.join(" ")} failed with status ${result.status}.`,
    );
  }
  return result.stdout.trim();
}

const rawArguments = process.argv.slice(2);
const [artifactArgument, variantArgument] =
  rawArguments[0] === "--" ? rawArguments.slice(1) : rawArguments;

if (!artifactArgument || !variantArgument) {
  fail(
    "Usage: pnpm native:ios:artifact:check -- <absolute-app-path> <development|preview>",
  );
}
if (!SUPPORTED_APP_VARIANTS.includes(variantArgument)) {
  fail(`Unsupported APP_VARIANT: ${variantArgument}`);
}
if (process.platform !== "darwin") {
  fail("iOS Release artifact verification requires macOS.");
}

const appPath = resolve(artifactArgument);
const expected = NATIVE_VARIANT_EXPECTATIONS[variantArgument];
assert.equal(
  lstatSync(appPath).isDirectory(),
  true,
  `iOS app artifact is not a directory: ${appPath}`,
);

const infoPlistPath = resolve(appPath, "Info.plist");
const bundlePath = resolve(appPath, "main.jsbundle");
const embeddedConfigPath = resolve(
  appPath,
  "EXConstants.bundle",
  "app.config",
);

const bundleIdentifier = run("/usr/bin/plutil", [
  "-extract",
  "CFBundleIdentifier",
  "raw",
  "-o",
  "-",
  infoPlistPath,
]);
const executableName = run("/usr/bin/plutil", [
  "-extract",
  "CFBundleExecutable",
  "raw",
  "-o",
  "-",
  infoPlistPath,
]);
const executablePath = resolve(appPath, executableName);

assert.equal(bundleIdentifier, expected.applicationId);
assert.ok(statSync(bundlePath).size > 0, "Embedded main.jsbundle is empty.");
assert.ok(
  statSync(embeddedConfigPath).size > 0,
  "Embedded Expo Constants app.config is empty.",
);

const embeddedConfig = JSON.parse(readFileSync(embeddedConfigPath, "utf8"));
assert.equal(embeddedConfig.name, expected.name);
assert.equal(embeddedConfig.scheme, expected.scheme);
assert.equal(embeddedConfig.ios?.bundleIdentifier, expected.applicationId);
assert.equal(embeddedConfig.extra?.appVariant, variantArgument);

const linkedSymbols = run("/usr/bin/nm", ["-U", executablePath]);
assert.match(
  linkedSymbols,
  /_OBJC_CLASS_\$_ExpoModulesProvider/,
  "Release executable does not retain ExpoModulesProvider.",
);

run("/usr/bin/codesign", ["--verify", "--deep", "--strict", appPath]);

process.stdout.write(
  `${JSON.stringify({
    appPath,
    bundleBytes: statSync(bundlePath).size,
    bundleIdentifier,
    embeddedConfigBytes: statSync(embeddedConfigPath).size,
    expoModulesProviderRetained: true,
    signatureValid: true,
    variant: variantArgument,
  })}\n`,
);

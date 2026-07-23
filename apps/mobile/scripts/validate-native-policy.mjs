import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import process from "node:process";

import {
  EXPLICIT_CONFIG_PLUGINS,
  EXPECTED_AUTOLINKED_NATIVE_MODULES,
  EXPECTED_RESOLVED_PLUGIN_HISTORY,
  GENERATED_NATIVE_DIRECTORIES,
  PROTECTED_SWIFTUI_BUNDLE_IDENTIFIER,
  SUPPORTED_APP_VARIANTS,
} from "./native-generation-policy.mjs";
import {
  assertSafeGeneratedDirectory,
  expoCliPath,
  mobileRoot,
  normalizePluginName,
  repositoryRoot,
} from "./native-generation-helpers.mjs";

const rootPackageJson = JSON.parse(
  readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
);
const expoConstantsPatchPath =
  rootPackageJson.pnpm?.patchedDependencies?.["expo-constants@57.0.7"];
assert.equal(
  expoConstantsPatchPath,
  "patches/expo-constants@57.0.7.patch",
  "Expo Constants path-safe build patch must remain pinned.",
);
const expoConstantsPatch = readFileSync(
  resolve(repositoryRoot, expoConstantsPatchPath),
  "utf8",
);
assert.match(
  expoConstantsPatch,
  /bash -l -c '\\"\$0\\"'/,
  "Expo Constants build phase must preserve its quoted script path.",
);
assert.match(
  expoConstantsPatch,
  /PROJECT_DIR_BASENAME=\$\(basename "\$PROJECT_DIR"\)/,
  "Expo Constants app-config generation must preserve a project path containing spaces.",
);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      result.stderr.trim() ||
        `${command} ${args.join(" ")} failed with status ${result.status}.`,
    );
  }

  return result.stdout;
}

function resolvePrebuildConfig(variant) {
  const result = spawnSync(
    process.execPath,
    [expoCliPath, "config", "--type", "prebuild", "--json"],
    {
      cwd: mobileRoot,
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
    throw new Error(
      result.stderr.trim() || `Expo prebuild config failed for ${variant}.`,
    );
  }

  return JSON.parse(result.stdout);
}

for (const directoryName of GENERATED_NATIVE_DIRECTORIES) {
  assertSafeGeneratedDirectory(directoryName);

  const probePath = resolve(mobileRoot, directoryName, ".native-policy-probe");
  run("git", ["check-ignore", "--no-index", "--quiet", probePath]);

  const trackedFiles = run("git", [
    "ls-files",
    "--",
    relative(repositoryRoot, resolve(mobileRoot, directoryName)),
  ]).trim();
  assert.equal(
    trackedFiles,
    "",
    `Generated apps/mobile/${directoryName} files must not be tracked.`,
  );
}

const protectedProjectPath = "apps/ios/ThirtyFiveMM.xcodeproj/project.pbxproj";
const trackedProtectedProject = run("git", [
  "ls-files",
  "--",
  protectedProjectPath,
]).trim();
assert.equal(
  trackedProtectedProject,
  protectedProjectPath,
  "Protected SwiftUI project must remain tracked independently.",
);

const protectedProject = readFileSync(
  resolve(repositoryRoot, protectedProjectPath),
  "utf8",
);
assert.match(
  protectedProject,
  new RegExp(
    `PRODUCT_BUNDLE_IDENTIFIER = ${PROTECTED_SWIFTUI_BUNDLE_IDENTIFIER.replaceAll(".", "\\.")};`,
  ),
  "Protected SwiftUI bundle identifier changed unexpectedly.",
);

let baselinePluginHistory;
let baselineAutolinkedModules;

for (const variant of SUPPORTED_APP_VARIANTS) {
  const config = resolvePrebuildConfig(variant);
  const explicitPlugins = (config.plugins ?? []).map(normalizePluginName);
  assert.deepEqual(
    explicitPlugins,
    EXPLICIT_CONFIG_PLUGINS,
    `${variant} explicit config-plugin list drifted`,
  );

  const pluginHistory = Object.fromEntries(
    Object.entries(config._internal?.pluginHistory ?? {}).map(([name, value]) => [
      name,
      value?.version,
    ]),
  );
  assert.deepEqual(
    pluginHistory,
    EXPECTED_RESOLVED_PLUGIN_HISTORY,
    `${variant} resolved plugin history drifted; review native impact and update policy`,
  );

  const autolinkedModules = config._internal?.autolinkedModules ?? [];
  assert.deepEqual(
    autolinkedModules,
    EXPECTED_AUTOLINKED_NATIVE_MODULES,
    `${variant} autolinked native modules drifted; review native impact and update policy`,
  );

  if (baselinePluginHistory === undefined) {
    baselinePluginHistory = pluginHistory;
    baselineAutolinkedModules = autolinkedModules;
  } else {
    assert.deepEqual(pluginHistory, baselinePluginHistory);
    assert.deepEqual(autolinkedModules, baselineAutolinkedModules);
  }
}

process.stdout.write(
  "Validated CNG ignore boundaries, SwiftUI preservation, config plugins, and native autolinking.\n",
);

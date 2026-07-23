import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import process from "node:process";

import {
  NATIVE_VARIANT_EXPECTATIONS,
  PROTECTED_SWIFTUI_BUNDLE_IDENTIFIER,
  SUPPORTED_APP_VARIANTS,
} from "./native-generation-policy.mjs";
import { expoCliPath, mobileRoot } from "./native-generation-helpers.mjs";

const COPY_EXCLUSIONS = new Set([
  ".expo",
  "android",
  "coverage",
  "coverage 2",
  "dist",
  "ios",
  "node_modules",
]);

function copyProject(targetRoot) {
  cpSync(mobileRoot, targetRoot, {
    dereference: false,
    errorOnExist: true,
    filter(source) {
      if (source === mobileRoot) {
        return true;
      }
      return !COPY_EXCLUSIONS.has(basename(source));
    },
    recursive: true,
  });

  const sourceNodeModules = resolve(mobileRoot, "node_modules");
  assert.equal(
    lstatSync(sourceNodeModules).isDirectory(),
    true,
    "apps/mobile/node_modules is required for isolated native generation.",
  );
  symlinkSync(sourceNodeModules, resolve(targetRoot, "node_modules"), "dir");
}

function findXcodeProjectFile(iosRoot) {
  const projectDirectory = readdirSync(iosRoot, { withFileTypes: true }).find(
    (entry) => entry.isDirectory() && entry.name.endsWith(".xcodeproj"),
  );
  assert.ok(projectDirectory, "Generated iOS Xcode project is missing.");
  return resolve(iosRoot, projectDirectory.name, "project.pbxproj");
}

function findEntitlementsFile(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      const nestedFile = findEntitlementsFile(entryPath);
      if (nestedFile) {
        return nestedFile;
      }
    } else if (entry.name.endsWith(".entitlements")) {
      return entryPath;
    }
  }

  return undefined;
}

function findInfoPlist(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      const nestedFile = findInfoPlist(entryPath);
      if (nestedFile) {
        return nestedFile;
      }
    } else if (entry.name === "Info.plist") {
      return entryPath;
    }
  }

  return undefined;
}

function findAppDelegate(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      const nestedFile = findAppDelegate(entryPath);
      if (nestedFile) {
        return nestedFile;
      }
    } else if (entry.name === "AppDelegate.swift") {
      return entryPath;
    }
  }

  return undefined;
}

function assertGeneratedConfig(projectRoot, expected) {
  const androidBuildGradle = readFileSync(
    resolve(projectRoot, "android/app/build.gradle"),
    "utf8",
  );
  const androidProperties = readFileSync(
    resolve(projectRoot, "android/gradle.properties"),
    "utf8",
  );
  const androidStrings = readFileSync(
    resolve(projectRoot, "android/app/src/main/res/values/strings.xml"),
    "utf8",
  );
  const iosProject = readFileSync(
    findXcodeProjectFile(resolve(projectRoot, "ios")),
    "utf8",
  );
  const iosPodfileProperties = JSON.parse(
    readFileSync(resolve(projectRoot, "ios/Podfile.properties.json"), "utf8"),
  );
  const iosPodfile = readFileSync(resolve(projectRoot, "ios/Podfile"), "utf8");
  const entitlementsFile = findEntitlementsFile(resolve(projectRoot, "ios"));
  const entitlements = entitlementsFile
    ? readFileSync(entitlementsFile, "utf8")
    : "";
  const infoPlistFile = findInfoPlist(resolve(projectRoot, "ios"));
  assert.ok(infoPlistFile, "Generated iOS Info.plist is missing.");
  const infoPlist = readFileSync(infoPlistFile, "utf8");
  const appDelegateFile = findAppDelegate(resolve(projectRoot, "ios"));
  assert.ok(appDelegateFile, "Generated iOS AppDelegate.swift is missing.");
  const appDelegate = readFileSync(appDelegateFile, "utf8");

  assert.match(
    androidBuildGradle,
    new RegExp(`applicationId '${expected.applicationId}'`),
  );
  assert.match(androidProperties, /^newArchEnabled=true$/m);
  assert.match(androidProperties, /^hermesEnabled=true$/m);
  assert.match(
    androidStrings,
    new RegExp(`<string name="app_name">${expected.name}</string>`),
  );
  assert.match(
    iosProject,
    new RegExp(
      `PRODUCT_BUNDLE_IDENTIFIER = "?${expected.applicationId.replaceAll(".", "\\.")}"?;`,
    ),
  );
  assert.doesNotMatch(
    iosProject,
    new RegExp(PROTECTED_SWIFTUI_BUNDLE_IDENTIFIER.replaceAll(".", "\\.")),
  );
  assert.equal(iosPodfileProperties["ios.deploymentTarget"], "17.0");
  assert.equal(iosPodfileProperties["expo.jsEngine"], "hermes");
  assert.match(
    iosPodfile,
    /ENV\['PROJECT_ROOT'\] \|\|= File\.expand_path\('\.\.', __dir__\)/,
  );
  assert.match(
    iosProject,
    /REACT_NATIVE_XCODE_SCRIPT=\\\"\$\(\\\"\$NODE_BINARY\\\" --print/,
  );
  assert.match(iosProject, /\\\"\$REACT_NATIVE_XCODE_SCRIPT\\\"/);
  assert.doesNotMatch(
    iosProject,
    /`\\\"\$NODE_BINARY\\\" --print \\\"require\('path'\)\.dirname/,
  );
  assert.match(
    appDelegate,
    /class AppDelegate: ExpoAppDelegate \{\s+private let retainedExpoModulesProvider = ExpoModulesProvider\(\)/,
  );
  if (expected.appleSignInEnabled) {
    assert.match(
      entitlements,
      /<key>com\.apple\.developer\.applesignin<\/key>/,
    );
  } else {
    assert.doesNotMatch(
      entitlements,
      /<key>com\.apple\.developer\.applesignin<\/key>/,
    );
  }
  if (expected.disablesRecentBundleAutoLaunch) {
    assert.match(
      infoPlist,
      /<key>DEV_CLIENT_TRY_TO_LAUNCH_LAST_BUNDLE<\/key>\s*<false\/>/,
    );
  } else {
    assert.doesNotMatch(infoPlist, /DEV_CLIENT_TRY_TO_LAUNCH_LAST_BUNDLE/);
  }
}

const scratchRoot = mkdtempSync(join(tmpdir(), "35mm-native-generation-"));

try {
  for (const variant of SUPPORTED_APP_VARIANTS) {
    const projectRoot = resolve(scratchRoot, variant);
    copyProject(projectRoot);

    const result = spawnSync(
      process.execPath,
      [
        expoCliPath,
        "prebuild",
        "--clean",
        "--no-install",
        "--platform",
        "all",
      ],
      {
        cwd: projectRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          APP_VARIANT: variant,
          EXPO_NO_GIT_STATUS: "1",
        },
      },
    );

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(
        result.stderr.trim() ||
          result.stdout.trim() ||
          `Expo prebuild failed for ${variant}.`,
      );
    }

    assertGeneratedConfig(projectRoot, NATIVE_VARIANT_EXPECTATIONS[variant]);
  }
} finally {
  rmSync(scratchRoot, { force: true, recursive: true });
}

process.stdout.write(
  "Verified isolated development and preview native generation without touching workspace native directories.\n",
);

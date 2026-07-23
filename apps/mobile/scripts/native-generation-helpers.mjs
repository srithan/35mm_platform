import assert from "node:assert/strict";
import { lstatSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export const expoCliPath = require.resolve("expo/bin/cli");
export const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const repositoryRoot = resolve(mobileRoot, "../..");
export const protectedSwiftUIRoot = resolve(repositoryRoot, "apps/ios");

export function assertSafeGeneratedDirectory(directoryName) {
  const targetPath = resolve(mobileRoot, directoryName);

  assert.equal(
    dirname(targetPath),
    mobileRoot,
    `Generated native target escaped apps/mobile: ${targetPath}`,
  );
  assert.notEqual(
    targetPath,
    protectedSwiftUIRoot,
    "Generated native target resolved to protected apps/ios.",
  );

  try {
    const targetStat = lstatSync(targetPath);
    assert.equal(
      targetStat.isSymbolicLink(),
      false,
      `Refusing to regenerate symbolic-link target: ${targetPath}`,
    );
    assert.equal(
      targetStat.isDirectory(),
      true,
      `Generated native target is not a directory: ${targetPath}`,
    );
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return targetPath;
    }
    throw error;
  }

  return targetPath;
}

export function normalizePluginName(plugin) {
  return Array.isArray(plugin) ? plugin[0] : plugin;
}

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(scriptsDirectory, "../..");
const platform = process.argv[2];
assert.ok(platform === "ios" || platform === "android", "Platform must be ios or android.");

const manifest = JSON.parse(
  readFileSync(resolve(mobileRoot, "quality/visual/manifest.json"), "utf8"),
);
const diffDirectory = resolve(mobileRoot, `artifacts/visual/diff/${platform}`);
mkdirSync(diffDirectory, { recursive: true });

let failed = false;
for (const capture of manifest.captures) {
  const baselinePath = resolve(
    mobileRoot,
    `quality/visual/baselines/${platform}/${capture}.png`,
  );
  const actualPath = resolve(
    mobileRoot,
    `artifacts/visual/actual/${platform}/${capture}.png`,
  );

  let baseline;
  let actual;
  try {
    baseline = PNG.sync.read(readFileSync(baselinePath));
  } catch (error) {
    throw new Error(
      `Missing or invalid reviewed baseline ${baselinePath}. Capture on the fixed profile and approve after visual review.`,
      { cause: error },
    );
  }
  try {
    actual = PNG.sync.read(readFileSync(actualPath));
  } catch (error) {
    throw new Error(`Missing or invalid actual capture ${actualPath}.`, { cause: error });
  }

  assert.equal(actual.width, baseline.width, `${capture} width drift`);
  assert.equal(actual.height, baseline.height, `${capture} height drift`);

  const diff = new PNG({ width: actual.width, height: actual.height });
  let differentPixels = 0;
  for (let offset = 0; offset < actual.data.length; offset += 4) {
    const red = Math.abs(actual.data[offset] - baseline.data[offset]);
    const green = Math.abs(actual.data[offset + 1] - baseline.data[offset + 1]);
    const blue = Math.abs(actual.data[offset + 2] - baseline.data[offset + 2]);
    const alpha = Math.abs(actual.data[offset + 3] - baseline.data[offset + 3]);
    const different = Math.max(red, green, blue, alpha) > manifest.pixelThreshold;
    if (different) differentPixels += 1;
    diff.data[offset] = different ? 255 : actual.data[offset];
    diff.data[offset + 1] = different ? 0 : actual.data[offset + 1];
    diff.data[offset + 2] = different ? 255 : actual.data[offset + 2];
    diff.data[offset + 3] = 255;
  }

  const ratio = differentPixels / (actual.width * actual.height);
  if (ratio > manifest.maximumDifferentPixelRatio) {
    failed = true;
    writeFileSync(resolve(diffDirectory, `${capture}.png`), PNG.sync.write(diff));
    process.stderr.write(
      `${capture}: ${(ratio * 100).toFixed(4)}% pixels differ; allowed ${(manifest.maximumDifferentPixelRatio * 100).toFixed(4)}%.\n`,
    );
  } else {
    process.stdout.write(`${capture}: visual diff passed (${differentPixels} pixels).\n`);
  }
}

if (failed) process.exit(1);

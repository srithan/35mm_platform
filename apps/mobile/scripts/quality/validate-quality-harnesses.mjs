import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAllDocuments } from "yaml";

const qualityScriptsDirectory = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(qualityScriptsDirectory, "../..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(mobileRoot, relativePath), "utf8"));
}

function readMaestroFlow(relativePath) {
  const documents = parseAllDocuments(
    readFileSync(resolve(mobileRoot, relativePath), "utf8"),
  );
  assert.equal(documents.length, 2, `${relativePath} must contain header and commands`);
  const header = documents[0].toJSON();
  const commands = documents[1].toJSON();
  assert.equal(header.appId, "${MOBILE_APP_ID}", `${relativePath} must inject app identity`);
  assert.ok(Array.isArray(commands) && commands.length > 0, `${relativePath} commands`);
  return { header, commands };
}

function listTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(entryPath);
    return /\.tsx?$/.test(entry.name) ? [entryPath] : [];
  });
}

const smoke = readMaestroFlow(".maestro/foundation-smoke.yaml");
const visual = readMaestroFlow(".maestro/foundation-visual.yaml");
const developmentSmoke = readMaestroFlow(
  ".maestro/foundation-smoke-development.yaml",
);
const developmentVisual = readMaestroFlow(
  ".maestro/foundation-visual-development.yaml",
);
assert.ok(smoke.header.tags.includes("smoke"));
assert.ok(visual.header.tags.includes("visual"));
assert.ok(developmentSmoke.header.tags.includes("development-client"));
assert.ok(developmentVisual.header.tags.includes("development-client"));
assert.equal(developmentSmoke.commands[1].openLink, "${MOBILE_START_URL}");
assert.equal(developmentVisual.commands[1].openLink, "${MOBILE_START_URL}");
assert.equal(
  developmentSmoke.commands[2].tapOn.text,
  "${MOBILE_METRO_URL}",
);
assert.equal(
  developmentVisual.commands[2].tapOn.text,
  "${MOBILE_METRO_URL}",
);
assert.equal(developmentSmoke.commands[3].tapOn.text, "Continue");
assert.equal(developmentVisual.commands[3].tapOn.text, "Continue");
assert.equal(developmentSmoke.commands[4].tapOn.text, "Close");
assert.equal(developmentVisual.commands[4].tapOn.text, "Close");

const serializedSmoke = JSON.stringify(smoke.commands);
const serializedDevelopmentSmoke = JSON.stringify(developmentSmoke.commands);
for (const requiredId of [
  "foundation.gallery",
  "foundation.controls",
  "foundation.states",
  "foundation.theme.toggle",
]) {
  assert.match(serializedSmoke, new RegExp(requiredId.replaceAll(".", "\\.")));
  assert.match(
    serializedDevelopmentSmoke,
    new RegExp(requiredId.replaceAll(".", "\\.")),
  );
}

const visualManifest = readJson("quality/visual/manifest.json");
assert.equal(visualManifest.schemaVersion, 1);
assert.ok(Number.isInteger(visualManifest.pixelThreshold));
assert.ok(
  visualManifest.maximumDifferentPixelRatio >= 0 &&
    visualManifest.maximumDifferentPixelRatio <= 0.01,
);
assert.deepEqual(Object.keys(visualManifest.profiles).sort(), ["android", "ios"]);
assert.ok(visualManifest.captures.length >= 2);
const serializedVisual = JSON.stringify(visual.commands);
const serializedDevelopmentVisual = JSON.stringify(developmentVisual.commands);
for (const capture of visualManifest.captures) {
  assert.match(serializedVisual, new RegExp(capture));
  assert.match(serializedDevelopmentVisual, new RegExp(capture));
  for (const platform of ["ios", "android"]) {
    assert.ok(
      existsSync(resolve(mobileRoot, `quality/visual/baselines/${platform}`)),
      `missing ${platform} baseline directory`,
    );
  }
}

const performanceProtocol = readJson("quality/performance/protocol.json");
assert.equal(performanceProtocol.schemaVersion, 1);
assert.ok(performanceProtocol.minimumRuns >= 5);
assert.equal(performanceProtocol.requiredBuildType, "release");
assert.deepEqual(
  performanceProtocol.requiredMetrics.map((metric) => metric.key),
  ["coldLaunchMs", "warmLaunchMs", "steadyMemoryMb", "slowFramePercent"],
);
assert.deepEqual(Object.keys(performanceProtocol.deviceProfiles).sort(), [
  "android",
  "ios",
]);

for (const requiredPath of [
  "src/test/foundation-gallery.test.tsx",
  "scripts/quality/run-maestro.mjs",
  "scripts/quality/compare-visuals.mjs",
  "scripts/quality/validate-performance-baseline.mjs",
  "QUALITY_HARNESSES.md",
]) {
  assert.ok(existsSync(resolve(mobileRoot, requiredPath)), `missing ${requiredPath}`);
}

const maestroRunner = readFileSync(
  resolve(mobileRoot, "scripts/quality/run-maestro.mjs"),
  "utf8",
);
assert.match(maestroRunner, /MOBILE_TEST_DEVICE_ID/);
assert.match(maestroRunner, /MOBILE_TEST_START_URL/);
assert.match(maestroRunner, /"--device"/);

const repositoryRoot = resolve(mobileRoot, "../..");
for (const sourceRoot of [
  "apps/mobile/src",
  "packages/api-client/src",
  "packages/design-tokens/src",
  "packages/mobile-ui/src",
]) {
  for (const sourceFile of listTypeScriptFiles(resolve(repositoryRoot, sourceRoot))) {
    assert.doesNotMatch(
      readFileSync(sourceFile, "utf8"),
      /["']\.{1,2}\/[^"'\n]+\.jsx?["']/,
      `${sourceFile} must use Metro-resolvable extensionless relative TypeScript imports`,
    );
  }
}

process.stdout.write(
  "Validated accessibility, Maestro, visual-regression, and performance harness contracts.\n",
);

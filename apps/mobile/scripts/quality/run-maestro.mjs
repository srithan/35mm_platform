import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(scriptsDirectory, "../..");
const mode = process.argv[2];
assert.ok(mode === "smoke" || mode === "visual", "Mode must be smoke or visual.");

const platform = process.env.MOBILE_TEST_PLATFORM;
assert.ok(platform === "ios" || platform === "android", "MOBILE_TEST_PLATFORM must be ios or android.");
const appId = process.env.MOBILE_TEST_APP_ID?.trim();
assert.ok(
  appId === "com.thirtyfivemm.mobile.dev" ||
    appId === "com.thirtyfivemm.mobile.preview",
  "MOBILE_TEST_APP_ID must be an approved development or preview identifier.",
);
const isDevelopmentClient = appId === "com.thirtyfivemm.mobile.dev";
const startUrl = process.env.MOBILE_TEST_START_URL?.trim();
let metroUrl;
if (isDevelopmentClient) {
  assert.ok(
    startUrl,
    "MOBILE_TEST_START_URL must contain the running Expo development-client URL.",
  );
  const outerUrl = new URL(startUrl);
  assert.equal(
    outerUrl.protocol,
    "exp+thirtyfivemm-mobile:",
    "MOBILE_TEST_START_URL must target the reviewed development-client scheme.",
  );
  const metroUrlValue = outerUrl.searchParams.get("url");
  assert.ok(metroUrlValue, "MOBILE_TEST_START_URL must include its Metro URL.");
  metroUrl = new URL(metroUrlValue);
  assert.ok(
    metroUrl.protocol === "http:" || metroUrl.protocol === "https:",
    "The Metro URL must use HTTP or HTTPS.",
  );
  assert.equal(metroUrl.username, "", "The Metro URL cannot contain credentials.");
  assert.equal(metroUrl.password, "", "The Metro URL cannot contain credentials.");
} else {
  assert.equal(
    startUrl,
    undefined,
    "MOBILE_TEST_START_URL is only valid for the development client.",
  );
}
const deviceName = process.env.MOBILE_TEST_DEVICE?.trim();
assert.ok(deviceName, "MOBILE_TEST_DEVICE must name the selected device.");
const deviceId = process.env.MOBILE_TEST_DEVICE_ID?.trim();
assert.match(
  deviceId ?? "",
  /^[A-Za-z0-9._:-]+$/,
  "MOBILE_TEST_DEVICE_ID must identify the exact connected target.",
);

const commandProbe = spawnSync("maestro", ["--version"], { encoding: "utf8" });
if (commandProbe.error?.code === "ENOENT") {
  throw new Error("Maestro CLI is required. Install it from the official Maestro documentation.");
}
if (commandProbe.status !== 0) {
  throw new Error(commandProbe.stderr.trim() || "Maestro CLI version check failed.");
}

const outputDirectory = resolve(mobileRoot, `artifacts/maestro/${platform}/${mode}`);
mkdirSync(outputDirectory, { recursive: true });
const commitProbe = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: mobileRoot,
  encoding: "utf8",
});
if (commitProbe.status !== 0) {
  throw new Error(commitProbe.stderr.trim() || "Could not resolve Git commit.");
}
writeFileSync(
  resolve(outputDirectory, "run-metadata.json"),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      mode,
      platform,
      appId,
      device: { name: deviceName, id: deviceId },
      maestroVersion: commandProbe.stdout.trim(),
      commit: commitProbe.stdout.trim(),
      startedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
);
const flow = resolve(
  mobileRoot,
  isDevelopmentClient
    ? mode === "smoke"
      ? ".maestro/foundation-smoke-development.yaml"
      : ".maestro/foundation-visual-development.yaml"
    : mode === "smoke"
      ? ".maestro/foundation-smoke.yaml"
      : ".maestro/foundation-visual.yaml",
);
const startUrlArguments = isDevelopmentClient
  ? [
      "-e",
      `MOBILE_START_URL=${startUrl}`,
      "-e",
      `MOBILE_METRO_URL=${metroUrl.origin}`,
    ]
  : [];
const result = spawnSync(
  "maestro",
  [
    "--device",
    deviceId,
    "--platform",
    platform,
    "test",
    "--test-output-dir",
    outputDirectory,
    "-e",
    `MOBILE_APP_ID=${appId}`,
    "-e",
    `MOBILE_PLATFORM=${platform}`,
    ...startUrlArguments,
    flow,
  ],
  { cwd: mobileRoot, encoding: "utf8", stdio: "inherit" },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

if (mode === "visual") {
  const compare = spawnSync(
    process.execPath,
    [resolve(scriptsDirectory, "compare-visuals.mjs"), platform],
    { cwd: mobileRoot, encoding: "utf8", stdio: "inherit" },
  );
  if (compare.error) throw compare.error;
  if (compare.status !== 0) process.exit(compare.status ?? 1);
}

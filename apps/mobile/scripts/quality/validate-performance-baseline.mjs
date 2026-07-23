import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(scriptsDirectory, "../..");
const inputPath = process.env.MOBILE_PERFORMANCE_RESULT?.trim();
assert.ok(inputPath, "MOBILE_PERFORMANCE_RESULT must point to a measured result JSON file.");

const protocol = JSON.parse(
  readFileSync(resolve(mobileRoot, "quality/performance/protocol.json"), "utf8"),
);
const result = JSON.parse(readFileSync(resolve(inputPath), "utf8"));

assert.equal(result.schemaVersion, protocol.schemaVersion);
assert.ok(result.platform === "ios" || result.platform === "android");
assert.equal(result.buildType, protocol.requiredBuildType);
assert.ok(
  result.appId === "com.thirtyfivemm.mobile.dev" ||
    result.appId === "com.thirtyfivemm.mobile.preview",
  "result appId must be an approved internal identity",
);
assert.match(result.commit, /^[0-9a-f]{7,40}$/i);
assert.ok(Number.isFinite(Date.parse(result.capturedAt)), "capturedAt must be ISO-8601");
assert.ok(result.device?.name?.trim(), "named device is required");
assert.ok(result.device?.os?.trim(), "device OS is required");
assert.ok(result.tool?.name?.trim(), "measurement tool is required");
assert.ok(result.tool?.version?.trim(), "measurement tool version is required");
assert.ok(Array.isArray(result.runs) && result.runs.length >= protocol.minimumRuns);

function percentile(values, quantile) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1);
  return sorted[index];
}

const summary = {};
for (const metric of protocol.requiredMetrics) {
  const values = result.runs.map((run, index) => {
    const value = run[metric.key];
    assert.ok(Number.isFinite(value) && value >= 0, `${metric.key} run ${index + 1}`);
    if (metric.key === "slowFramePercent") {
      assert.ok(value <= 100, `${metric.key} cannot exceed 100`);
    }
    return value;
  });
  summary[metric.key] = {
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    unit: metric.unit,
  };
}

assert.ok(Number.isInteger(result.hermesBundleBytes) && result.hermesBundleBytes > 0);
process.stdout.write(`${JSON.stringify({
  platform: result.platform,
  device: result.device,
  runs: result.runs.length,
  hermesBundleBytes: result.hermesBundleBytes,
  summary,
}, null, 2)}\n`);

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
const expoCliPath = require.resolve("expo/bin/cli");
const SUPPORTED_VARIANTS = new Set(["development", "preview"]);
const [variant, ...expoArguments] = process.argv.slice(2);

if (!variant || !SUPPORTED_VARIANTS.has(variant)) {
  process.stderr.write(
    "Usage: node scripts/run-expo.mjs <development|preview> <expo arguments...>\n",
  );
  process.exit(1);
}

if (expoArguments.length === 0) {
  process.stderr.write("At least one Expo CLI argument is required.\n");
  process.exit(1);
}

const configuredVariant = process.env.APP_VARIANT?.trim();
if (configuredVariant && configuredVariant !== variant) {
  process.stderr.write(
    `APP_VARIANT is \"${configuredVariant}\", but command requested \"${variant}\".\n`,
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [expoCliPath, ...expoArguments], {
  env: {
    ...process.env,
    APP_VARIANT: variant,
  },
  stdio: "inherit",
});

if (result.error) {
  process.stderr.write(`Unable to run Expo CLI: ${result.error.message}\n`);
  process.exit(1);
}

process.exit(result.status ?? 1);

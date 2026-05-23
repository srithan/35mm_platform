import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const SERVER_APP_DIR = path.resolve(".next/server/app");
const PLACEHOLDER = "module.exports = {};\n";

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return [fullPath];
    })
  );
  return files.flat();
}

async function ensureMissingClientReferenceManifests() {
  if (!(await exists(SERVER_APP_DIR))) {
    return;
  }

  const allFiles = await walk(SERVER_APP_DIR);
  const nftFiles = allFiles.filter((file) => file.endsWith(".nft.json"));

  let createdCount = 0;
  for (const nftPath of nftFiles) {
    const raw = await readFile(nftPath, "utf8");
    const parsed = JSON.parse(raw);
    const tracedFiles = parsed.files ?? [];

    for (const relativeTracedFile of tracedFiles) {
      if (!relativeTracedFile.endsWith("client-reference-manifest.js")) continue;

      const resolvedPath = path.resolve(path.dirname(nftPath), relativeTracedFile);
      if (await exists(resolvedPath)) continue;

      await writeFile(resolvedPath, PLACEHOLDER, "utf8");
      createdCount += 1;
    }
  }

  if (createdCount > 0) {
    console.log(`[ensure-nft-manifest-files] Created ${createdCount} missing trace file(s).`);
  }
}

ensureMissingClientReferenceManifests().catch((error) => {
  console.error("[ensure-nft-manifest-files] Failed:", error);
  process.exitCode = 1;
});

import {
  MeilisearchHttpClient,
  MeilisearchRequestError,
  SEARCH_INDEXES,
  SEARCH_INDEX_SETTINGS,
  type SearchIndexName,
} from "@35mm/search";

function requireEnv(name: string): string {
  var value = process.env[name]?.trim();
  if (!value) throw new Error("Missing required environment variable: " + name);
  return value;
}

async function ensureIndex(
  client: MeilisearchHttpClient,
  indexUid: SearchIndexName
): Promise<void> {
  try {
    await client.getIndex(indexUid);
  } catch (error) {
    if (!(error instanceof MeilisearchRequestError) || error.status !== 404) {
      throw error;
    }
    var task = await client.createIndex(indexUid);
    await client.waitForTask(task, { timeoutMs: 60_000 });
  }
  var settingsTask = await client.updateSettings(indexUid, SEARCH_INDEX_SETTINGS[indexUid]);
  await client.waitForTask(settingsTask, { timeoutMs: 120_000 });
  console.log("[search.setup] index ready", { indexUid });
}

async function main() {
  var client = new MeilisearchHttpClient({
    host: requireEnv("MEILISEARCH_HOST"),
    apiKey: requireEnv("MEILISEARCH_ADMIN_API_KEY"),
    timeoutMs: 15_000,
  });
  var health = await client.health();
  if (health.status !== "available") {
    throw new Error("Meilisearch health check failed: " + health.status);
  }

  for (var indexUid of Object.values(SEARCH_INDEXES)) {
    await ensureIndex(client, indexUid);
  }
}

main().catch(function (error) {
  console.error("[search.setup] failed", error);
  process.exit(1);
});

import { createPooledDb, type SearchIndexEntityType } from "@35mm/db";
import { sql } from "drizzle-orm";
import { indexSearchEntities, type SearchIndexEntityRef } from "../jobs/searchIndex.js";
import { loadWorkerEnv } from "../lib/env.js";

type IdRow = { id: string };

function parseArg(name: string): string | null {
  var prefix = "--" + name + "=";
  var value = process.argv.find(function (arg) {
    return arg.startsWith(prefix);
  });
  return value ? value.slice(prefix.length).trim() : null;
}

function selectedTypes(): SearchIndexEntityType[] {
  var value = parseArg("type") ?? "all";
  if (value === "all") return ["film", "profile", "post"];
  if (value === "film" || value === "profile" || value === "post") return [value];
  throw new Error("--type must be film, profile, post, or all");
}

function batchSize(): number {
  var parsed = Number(parseArg("batch-size") ?? "500");
  if (!Number.isFinite(parsed)) return 500;
  return Math.max(1, Math.min(Math.floor(parsed), 2_000));
}

async function loadBatch(
  database: ReturnType<typeof createPooledDb>,
  entityType: SearchIndexEntityType,
  after: string | null,
  limit: number
): Promise<string[]> {
  if (entityType === "film") {
    var films = await database.execute<IdRow>(sql`
      select "id"
      from "films"
      where (${after}::text is null or "id" > ${after})
      order by "id" asc
      limit ${limit}
    `);
    return films.rows.map(function (row) { return row.id; });
  }
  if (entityType === "profile") {
    var profiles = await database.execute<IdRow>(sql`
      select "user_id"::text as "id"
      from "profiles"
      where (${after}::uuid is null or "user_id" > ${after}::uuid)
      order by "user_id" asc
      limit ${limit}
    `);
    return profiles.rows.map(function (row) { return row.id; });
  }
  var posts = await database.execute<IdRow>(sql`
    select "id"::text as "id"
    from "posts"
    where (${after}::uuid is null or "id" > ${after}::uuid)
    order by "id" asc
    limit ${limit}
  `);
  return posts.rows.map(function (row) { return row.id; });
}

async function backfillType(
  database: ReturnType<typeof createPooledDb>,
  entityType: SearchIndexEntityType,
  limit: number,
  initialAfter: string | null
) {
  var after = initialAfter;
  var total = 0;
  while (true) {
    var ids = await loadBatch(database, entityType, after, limit);
    if (ids.length === 0) break;
    var refs: SearchIndexEntityRef[] = ids.map(function (entityId) {
      return { entityType, entityId };
    });
    var result = await indexSearchEntities(refs);
    total += ids.length;
    after = ids[ids.length - 1];
    console.log("[search.backfill] batch", {
      entityType,
      scanned: ids.length,
      total,
      after,
      ...result,
    });
  }
  console.log("[search.backfill] type complete", { entityType, total, after });
}

async function main() {
  var env = loadWorkerEnv();
  var database = createPooledDb(env.DATABASE_URL);
  var types = selectedTypes();
  var limit = batchSize();
  var initialAfter = parseArg("after");
  if (initialAfter && types.length !== 1) {
    throw new Error("--after requires one explicit --type");
  }
  for (var entityType of types) {
    await backfillType(database, entityType, limit, initialAfter);
  }
}

main().catch(function (error) {
  console.error("[search.backfill] failed", error);
  process.exit(1);
});

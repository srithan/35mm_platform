import type { Queue } from "bullmq";
import {
  createPooledDb,
  type SearchIndexEntityType,
} from "@35mm/db";
import {
  MeilisearchHttpClient,
  SEARCH_INDEXES,
  type FilmSearchDocument,
  type PostSearchDocument,
  type ProfileSearchDocument,
  type SearchDocument,
} from "@35mm/search";
import { sql } from "drizzle-orm";
import { loadWorkerEnv } from "../lib/env.js";

type SearchIndexOutboxPayload = {
  batchSize?: number;
};

export type SearchIndexEntityRef = {
  entityType: SearchIndexEntityType;
  entityId: string;
};

export type SearchIndexQueuePayload = {
  outboxJobIds: string[];
  entities: SearchIndexEntityRef[];
};

type SearchOutboxRow = {
  id: string;
  entity_type: SearchIndexEntityType;
  entity_id: string;
  created_at: Date | string;
};

type DbRow = Record<string, any>;

var db: ReturnType<typeof createPooledDb> | null = null;
var meilisearch: MeilisearchHttpClient | null = null;

function getDb() {
  if (!db) db = createPooledDb(loadWorkerEnv().DATABASE_URL);
  return db;
}

function getMeilisearch(): MeilisearchHttpClient {
  if (meilisearch) return meilisearch;
  var env = loadWorkerEnv();
  meilisearch = new MeilisearchHttpClient({
    host: env.MEILISEARCH_HOST,
    apiKey: env.MEILISEARCH_API_KEY,
    timeoutMs: env.MEILISEARCH_REQUEST_TIMEOUT_MS,
  });
  return meilisearch;
}

function configuredBatchSize(payload: SearchIndexOutboxPayload): number {
  var envValue = Number(process.env.SEARCH_INDEX_OUTBOX_BATCH_SIZE ?? "500");
  var raw = Number(payload.batchSize ?? envValue);
  if (!Number.isFinite(raw)) return 500;
  return Math.max(1, Math.min(Math.floor(raw), 2_000));
}

function plainText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function toEpoch(value: unknown): number {
  var date = value instanceof Date ? value : new Date(String(value));
  var timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function uniqueRefs(refs: SearchIndexEntityRef[]): SearchIndexEntityRef[] {
  var seen = new Set<string>();
  var result: SearchIndexEntityRef[] = [];
  for (var ref of refs) {
    var key = ref.entityType + ":" + ref.entityId;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(ref);
  }
  return result;
}

function idsForType(refs: SearchIndexEntityRef[], entityType: SearchIndexEntityType): string[] {
  return refs
    .filter(function (ref) {
      return ref.entityType === entityType;
    })
    .map(function (ref) {
      return ref.entityId;
    });
}

function sqlList(ids: string[]) {
  return sql.join(
    ids.map(function (id) {
      return sql`${id}`;
    }),
    sql`, `
  );
}

function uuidSqlList(ids: string[]) {
  return sql.join(
    ids.map(function (id) {
      return sql`${id}::uuid`;
    }),
    sql`, `
  );
}

async function loadFilmDocuments(ids: string[]): Promise<FilmSearchDocument[]> {
  if (ids.length === 0) return [];
  var result = await getDb().execute<DbRow>(sql`
    select
      f."id",
      f."title",
      f."original_title",
      f."year",
      f."overview",
      f."genres",
      f."director",
      f."poster_url",
      f."updated_at"
    from "films" f
    where f."id" in (${sqlList(ids)})
  `);
  return result.rows.map(function (row) {
    return {
      id: String(row.id),
      title: String(row.title),
      originalTitle: typeof row.original_title === "string" ? row.original_title : null,
      year: typeof row.year === "number" ? row.year : null,
      overview: plainText(row.overview, 2_000) || null,
      genres: Array.isArray(row.genres)
        ? row.genres.filter(function (genre: unknown): genre is string {
            return typeof genre === "string";
          })
        : [],
      director: typeof row.director === "string" ? row.director : null,
      posterUrl: typeof row.poster_url === "string" ? row.poster_url : null,
      updatedAt: toEpoch(row.updated_at),
    };
  });
}

async function loadProfileDocuments(ids: string[]): Promise<ProfileSearchDocument[]> {
  if (ids.length === 0) return [];
  var result = await getDb().execute<DbRow>(sql`
    select
      p."user_id",
      p."username",
      p."display_name",
      p."bio",
      p."role",
      p."headline",
      p."is_private",
      p."avatar_url",
      p."follower_count",
      p."updated_at"
    from "profiles" p
    inner join "users" u on u."id" = p."user_id"
    where p."user_id" in (${uuidSqlList(ids)})
      and u."status" = 'active'
      and p."moderation_status" = 'visible'
  `);
  return result.rows.map(function (row) {
    return {
      id: String(row.user_id),
      username: String(row.username),
      displayName: String(row.display_name),
      bio: plainText(row.bio, 1_000) || null,
      role: typeof row.role === "string" ? row.role : null,
      headline: plainText(row.headline, 100) || null,
      isPrivate: Boolean(row.is_private),
      avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
      followerCount: Math.max(0, Number(row.follower_count ?? 0)),
      updatedAt: toEpoch(row.updated_at),
    };
  });
}

async function loadPostDocuments(ids: string[]): Promise<PostSearchDocument[]> {
  if (ids.length === 0) return [];
  var result = await getDb().execute<DbRow>(sql`
    select
      po."id",
      po."user_id",
      po."headline",
      po."body",
      po."created_at",
      po."updated_at",
      p."username",
      p."display_name",
      f."title" as "film_title"
    from "posts" po
    inner join "profiles" p on p."user_id" = po."user_id"
    inner join "users" u on u."id" = po."user_id"
    left join "films" f on f."id" = po."film_id"
    where po."id" in (${uuidSqlList(ids)})
      and po."visibility" = 'public'
      and po."is_deleted" = false
      and po."moderation_status" = 'visible'
      and po."nsfw_status" <> 'flagged'
      and po."is_repost" = false
      and u."status" = 'active'
      and p."moderation_status" = 'visible'
  `);
  return result.rows.map(function (row) {
    return {
      id: String(row.id),
      authorId: String(row.user_id),
      username: String(row.username),
      displayName: String(row.display_name),
      headline: plainText(row.headline, 300) || null,
      body: plainText(row.body, 4_000),
      filmTitle: typeof row.film_title === "string" ? row.film_title : null,
      createdAt: toEpoch(row.created_at),
      updatedAt: toEpoch(row.updated_at),
    };
  });
}

function missingIds(requested: string[], documents: SearchDocument[]): string[] {
  var found = new Set(
    documents.map(function (document) {
      return document.id;
    })
  );
  return requested.filter(function (id) {
    return !found.has(id);
  });
}

function meiliStringList(values: string[]): string {
  return values.map(function (value) {
    return JSON.stringify(value);
  }).join(", ");
}

export async function indexSearchEntities(
  refsValue: SearchIndexEntityRef[]
): Promise<{
  indexed: number;
  deleted: number;
  cascadedPostDelete: boolean;
}> {
  var refs = uniqueRefs(refsValue);
  if (refs.length === 0) return { indexed: 0, deleted: 0, cascadedPostDelete: false };
  if (refs.length > 2_000) throw new Error("Search index batch exceeds 2000 entities");

  var filmIds = idsForType(refs, "film");
  var profileIds = idsForType(refs, "profile");
  var postIds = idsForType(refs, "post");
  var [filmDocuments, profileDocuments, postDocuments] = await Promise.all([
    loadFilmDocuments(filmIds),
    loadProfileDocuments(profileIds),
    loadPostDocuments(postIds),
  ]);

  var missingFilmIds = missingIds(filmIds, filmDocuments);
  var missingProfileIds = missingIds(profileIds, profileDocuments);
  var missingPostIds = missingIds(postIds, postDocuments);
  var client = getMeilisearch();

  var tasks = await Promise.all([
    client.replaceDocuments(SEARCH_INDEXES.films, filmDocuments),
    client.replaceDocuments(SEARCH_INDEXES.profiles, profileDocuments),
    client.replaceDocuments(SEARCH_INDEXES.posts, postDocuments),
    client.deleteDocuments(SEARCH_INDEXES.films, missingFilmIds),
    client.deleteDocuments(SEARCH_INDEXES.profiles, missingProfileIds),
    client.deleteDocuments(SEARCH_INDEXES.posts, missingPostIds),
  ]);

  if (missingProfileIds.length > 0) {
    tasks.push(
      await client.deleteDocumentsByFilter(
        SEARCH_INDEXES.posts,
        "authorId IN [" + meiliStringList(missingProfileIds) + "]"
      )
    );
  }

  await Promise.all(
    tasks.map(function (task) {
      return client.waitForTask(task, {
        timeoutMs: loadWorkerEnv().MEILISEARCH_TASK_TIMEOUT_MS,
      });
    })
  );

  return {
    indexed: filmDocuments.length + profileDocuments.length + postDocuments.length,
    deleted: missingFilmIds.length + missingProfileIds.length + missingPostIds.length,
    cascadedPostDelete: missingProfileIds.length > 0,
  };
}

export async function runSearchIndexJob(payloadValue: unknown) {
  var payload = payloadValue as SearchIndexQueuePayload;
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.entities)) {
    throw new Error("Invalid search.index payload");
  }
  for (var entity of payload.entities) {
    if (
      !entity ||
      (entity.entityType !== "film" &&
        entity.entityType !== "profile" &&
        entity.entityType !== "post") ||
      typeof entity.entityId !== "string" ||
      entity.entityId.trim().length === 0
    ) {
      throw new Error("Invalid search.index entity");
    }
  }

  var result = await indexSearchEntities(payload.entities);
  console.log("[search.index] completed", {
    outboxJobCount: Array.isArray(payload.outboxJobIds)
      ? payload.outboxJobIds.length
      : 0,
    entityCount: payload.entities.length,
    ...result,
  });
  return result;
}

export async function runSearchIndexOutboxJob(
  payloadValue: unknown,
  queue: Queue
): Promise<{ processed: number; entities: number }> {
  var payload = (payloadValue && typeof payloadValue === "object"
    ? payloadValue
    : {}) as SearchIndexOutboxPayload;
  var batchSize = configuredBatchSize(payload);
  var database = getDb();

  var result = await database.transaction(async function (tx) {
    var selected = await tx.execute<SearchOutboxRow>(sql`
      with next_jobs as (
        select "id"
        from "search_index_jobs"
        where "processed_at" is null
          and "available_at" <= now()
        order by "created_at" asc, "id" asc
        limit ${batchSize}
        for update skip locked
      )
      update "search_index_jobs" jobs
      set "status" = 'processing',
          "processing_started_at" = now(),
          "attempt_count" = jobs."attempt_count" + 1,
          "updated_at" = now()
      from next_jobs
      where jobs."id" = next_jobs."id"
      returning jobs."id", jobs."entity_type", jobs."entity_id", jobs."created_at"
    `);
    var rows = selected.rows;
    if (rows.length === 0) return { processed: 0, entities: 0 };

    var entities = uniqueRefs(
      rows.map(function (row) {
        return {
          entityType: row.entity_type,
          entityId: row.entity_id,
        };
      })
    );
    var first = rows[0].id;
    var last = rows[rows.length - 1].id;
    await queue.add(
      "search.index",
      {
        outboxJobIds: rows.map(function (row) {
          return row.id;
        }),
        entities,
      } satisfies SearchIndexQueuePayload,
      {
        jobId: "search.index-" + first + "-" + last,
        attempts: 8,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: true,
        removeOnFail: 2_000,
      }
    );

    await tx.execute(sql`
      update "search_index_jobs"
      set "status" = 'processed',
          "processed_at" = now(),
          "updated_at" = now()
      where "id" in (${sqlList(rows.map(function (row) { return row.id; }))})
    `);
    return { processed: rows.length, entities: entities.length };
  });

  console.log("[search.index.outbox] drained", {
    processed: result.processed,
    entities: result.entities,
    batchSize,
  });
  return result;
}

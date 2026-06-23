import { and, desc, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { createDb } from "@35mm/db";
import { profiles } from "@35mm/db/schema";
import { loadWorkerEnv } from "../lib/env.js";
import { processProfileMediaByPayload } from "../jobs/mediaProcess.js";

type Cursor = { createdAt: Date; id: string } | null;

type CliOptions = {
  dryRun: boolean;
  limit: number | null;
  kind: "avatar" | "cover" | "all";
};

function trimSlashes(value: string): string {
  return value.replace(/^\/+/, "").replace(/\/+$/, "");
}

function parsePositiveInt(raw: string): number | null {
  var trimmed = raw.trim();
  if (!trimmed) return null;
  var parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseCliArgs(argv: string[]): CliOptions {
  var dryRun = false;
  var limit: number | null = null;
  var kind: CliOptions["kind"] = "all";

  for (var index = 0; index < argv.length; index += 1) {
    var arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--limit") {
      var next = argv[index + 1];
      if (!next) throw new Error("--limit requires a positive integer value");
      var parsed = parsePositiveInt(next);
      if (parsed == null) throw new Error("--limit requires a positive integer value");
      limit = parsed;
      index += 1;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      var inlineLimit = parsePositiveInt(arg.slice("--limit=".length));
      if (inlineLimit == null) throw new Error("--limit requires a positive integer value");
      limit = inlineLimit;
      continue;
    }
    if (arg === "--kind") {
      var nextKind = argv[index + 1];
      if (nextKind !== "avatar" && nextKind !== "cover" && nextKind !== "all") {
        throw new Error("--kind must be avatar, cover, or all");
      }
      kind = nextKind;
      index += 1;
      continue;
    }
    if (arg.startsWith("--kind=")) {
      var inlineKind = arg.slice("--kind=".length);
      if (inlineKind !== "avatar" && inlineKind !== "cover" && inlineKind !== "all") {
        throw new Error("--kind must be avatar, cover, or all");
      }
      kind = inlineKind;
      continue;
    }
    throw new Error("Unknown argument: " + arg);
  }

  return { dryRun, limit, kind };
}

function cursorWhere(cursor: Cursor) {
  if (!cursor) return undefined;
  return or(
    lt(profiles.createdAt, cursor.createdAt),
    and(eq(profiles.createdAt, cursor.createdAt), lt(profiles.id, cursor.id))
  );
}

function objectKeyFromProfileMediaUrl(
  mediaUrl: string | null,
  userId: string,
  kind: "avatar" | "cover",
  publicBaseUrl: string
): string | null {
  if (!mediaUrl) return null;
  var trimmed = mediaUrl.trim();
  if (!trimmed) return null;

  try {
    var parsed = new URL(trimmed);
    var base = new URL(publicBaseUrl.trim().replace(/\/+$/, ""));
    if (parsed.host.toLowerCase() !== base.host.toLowerCase()) return null;

    var path = trimSlashes(parsed.pathname);
    var basePath = trimSlashes(base.pathname);
    if (basePath && path.startsWith(basePath + "/")) {
      return path.slice(basePath.length + 1);
    }
    if (!basePath) return path;
    return null;
  } catch (_err) {
    var relative = trimmed.replace(/^\/+/, "");
    if (relative.startsWith("users/")) return relative;
    return "users/" + userId + "/" + kind + "/" + relative;
  }
}

async function main() {
  var options = parseCliArgs(process.argv.slice(2));
  var env = loadWorkerEnv();
  var db = createDb(env.DATABASE_URL);
  var batchSize = Number.isFinite(env.MEDIA_BACKFILL_BATCH_SIZE)
    ? Math.max(1, env.MEDIA_BACKFILL_BATCH_SIZE)
    : 100;
  var cursor: Cursor = null;
  var scanned = 0;
  var candidates = 0;
  var updated = 0;
  var failed = 0;

  console.log("[profile-media-backfill] start", {
    dryRun: options.dryRun,
    limit: options.limit,
    kind: options.kind,
    batchSize,
  });

  while (true) {
    if (options.limit != null && scanned >= options.limit) break;

    var pageLimit =
      options.limit == null
        ? batchSize
        : Math.min(batchSize, Math.max(1, options.limit - scanned));
    var whereCursor = cursorWhere(cursor);
    var workFilter =
      options.kind === "avatar"
        ? and(isNotNull(profiles.avatarUrl), isNull(profiles.avatarVariants))
        : options.kind === "cover"
          ? and(isNotNull(profiles.coverUrl), isNull(profiles.coverVariants))
          : or(
              and(isNotNull(profiles.avatarUrl), isNull(profiles.avatarVariants)),
              and(isNotNull(profiles.coverUrl), isNull(profiles.coverVariants))
            );
    var filters = [workFilter ?? sql<boolean>`true`];
    if (whereCursor) filters.push(whereCursor);

    var rows = await db
      .select({
        id: profiles.id,
        userId: profiles.userId,
        createdAt: profiles.createdAt,
        avatarUrl: profiles.avatarUrl,
        avatarVariants: profiles.avatarVariants,
        coverUrl: profiles.coverUrl,
        coverVariants: profiles.coverVariants,
      })
      .from(profiles)
      .where(and(...filters))
      .orderBy(desc(profiles.createdAt), desc(profiles.id))
      .limit(pageLimit);

    if (rows.length === 0) break;
    scanned += rows.length;

    for (var rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      var row = rows[rowIndex];
      var tasks: Array<{ kind: "avatar" | "cover"; objectKey: string }> = [];
      if ((options.kind === "avatar" || options.kind === "all") && row.avatarUrl && !row.avatarVariants) {
        var avatarKey = objectKeyFromProfileMediaUrl(row.avatarUrl, row.userId, "avatar", env.R2_PUBLIC_BASE_URL);
        if (avatarKey) tasks.push({ kind: "avatar", objectKey: avatarKey });
      }
      if ((options.kind === "cover" || options.kind === "all") && row.coverUrl && !row.coverVariants) {
        var coverKey = objectKeyFromProfileMediaUrl(row.coverUrl, row.userId, "cover", env.R2_PUBLIC_BASE_URL);
        if (coverKey) tasks.push({ kind: "cover", objectKey: coverKey });
      }

      candidates += tasks.length;
      if (options.dryRun) continue;

      for (var taskIndex = 0; taskIndex < tasks.length; taskIndex += 1) {
        var task = tasks[taskIndex];
        try {
          var result = await processProfileMediaByPayload({
            kind: task.kind,
            userId: row.userId,
            objectKey: task.objectKey,
          });
          if (result.changed) updated += 1;
        } catch (error) {
          failed += 1;
          console.error("[profile-media-backfill] failed item", {
            userId: row.userId,
            kind: task.kind,
            objectKey: task.objectKey,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    var tail = rows[rows.length - 1];
    cursor = tail ? { createdAt: tail.createdAt, id: tail.id } : null;
    console.log(
      "[profile-media-backfill] scanned",
      scanned,
      "candidates",
      candidates,
      "updated",
      updated,
      "failed",
      failed
    );
  }

  console.log(
    "[profile-media-backfill] done.",
    "scanned=",
    scanned,
    "candidates=",
    candidates,
    "updated=",
    updated,
    "failed=",
    failed,
    "dryRun=",
    options.dryRun
  );
}

void main().catch(function (error) {
  console.error("[profile-media-backfill] failed", error);
  process.exitCode = 1;
});

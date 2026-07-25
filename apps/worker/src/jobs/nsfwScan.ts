import { createDb } from "@35mm/db";
import { comments, posts, type PostMedia } from "@35mm/db/schema";
import type { NsfwCategory, NsfwSource, NsfwStatus } from "@35mm/types";
import { and, eq, sql } from "drizzle-orm";
import { classifyImage, classifyText } from "../lib/nsfwClassifier.js";

export interface NsfwScanJobPayload {
  contentType: "post" | "comment";
  contentId: string;
  priority?: boolean;
}

export type NsfwClassifier = {
  classifyText(text: string): Promise<NsfwCategory[]>;
  classifyImage(objectKey: string): Promise<NsfwCategory[]>;
};

var CATEGORY_ORDER: NsfwCategory[] = [
  "nudity",
  "sexual_content",
  "violence",
  "graphic_content",
  "sensitive",
];

var db: ReturnType<typeof createDb> | null = null;

function getDb() {
  var databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("Missing required environment variable: DATABASE_URL");
  if (!db) db = createDb(databaseUrl);
  return db;
}

function assertPayload(value: unknown): NsfwScanJobPayload {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid nsfw.scan payload");
  }
  var payload = value as Partial<NsfwScanJobPayload>;
  if (
    (payload.contentType !== "post" && payload.contentType !== "comment") ||
    typeof payload.contentId !== "string" ||
    payload.contentId.trim().length === 0 ||
    (payload.priority !== undefined && typeof payload.priority !== "boolean")
  ) {
    throw new Error("Invalid nsfw.scan payload");
  }
  return {
    contentType: payload.contentType,
    contentId: payload.contentId.trim(),
    ...(payload.priority === undefined ? {} : { priority: payload.priority }),
  };
}

export function mergeNsfwCategories(
  ...groups: ReadonlyArray<ReadonlyArray<NsfwCategory>>
): NsfwCategory[] {
  var found = new Set<NsfwCategory>();
  for (var group of groups) {
    for (var category of group) found.add(category);
  }
  return CATEGORY_ORDER.filter(function (category) {
    return found.has(category);
  });
}

export function applyMediaNsfwClassifications(
  media: PostMedia[],
  classifications: ReadonlyMap<string, ReadonlyArray<NsfwCategory>>
): PostMedia[] {
  return media.map(function (item) {
    if (!item.key) return item;
    var categories = classifications.get(item.key);
    if (!categories || categories.length === 0) return item;
    return {
      ...item,
      nsfw: true,
      nsfwCategories: mergeNsfwCategories(item.nsfwCategories ?? [], categories),
    };
  });
}

export function resolveNsfwState(input: {
  existingStatus: NsfwStatus;
  existingSource: NsfwSource | null;
  existingCategories: NsfwCategory[];
  classifiedCategories: NsfwCategory[];
}): { status: NsfwStatus; source: NsfwSource; categories: NsfwCategory[] } {
  var categories = mergeNsfwCategories(
    input.existingCategories,
    input.classifiedCategories
  );
  var authorFlag = input.existingStatus === "flagged" && input.existingSource === "author";
  return {
    status: authorFlag || categories.length > 0 ? "flagged" : "none",
    source: authorFlag ? "author" : "system",
    categories,
  };
}

type NsfwRow = {
  id: string;
  body: string;
  headline: string | null;
  media: PostMedia[];
  isDeleted: boolean;
  nsfwStatus: NsfwStatus;
  nsfwCategories: NsfwCategory[];
  nsfwSource: NsfwSource | null;
  nsfwScannedAt: Date | null;
  updatedAt: Date;
};

async function loadRow(payload: NsfwScanJobPayload): Promise<NsfwRow | null> {
  if (payload.contentType === "post") {
    var rows = await getDb().select({
      id: posts.id,
      body: posts.body,
      headline: posts.headline,
      media: posts.media,
      isDeleted: posts.isDeleted,
      nsfwStatus: posts.nsfwStatus,
      nsfwCategories: posts.nsfwCategories,
      nsfwSource: posts.nsfwSource,
      nsfwScannedAt: posts.nsfwScannedAt,
      updatedAt: posts.updatedAt,
    }).from(posts).where(eq(posts.id, payload.contentId)).limit(1);
    return rows[0] ?? null;
  }

  var rows = await getDb().select({
    id: comments.id,
    body: comments.body,
    headline: sql<string | null>`null`,
    media: sql<PostMedia[]>`'[]'::jsonb`,
    isDeleted: comments.isDeleted,
    nsfwStatus: comments.nsfwStatus,
    nsfwCategories: comments.nsfwCategories,
    nsfwSource: comments.nsfwSource,
    nsfwScannedAt: comments.nsfwScannedAt,
    updatedAt: comments.updatedAt,
  }).from(comments).where(eq(comments.id, payload.contentId)).limit(1);
  return rows[0] ?? null;
}

export async function runNsfwScanJob(
  payloadValue: unknown,
  classifier: NsfwClassifier = { classifyText, classifyImage }
): Promise<{
  found: boolean;
  changed: boolean;
  status: NsfwStatus | null;
  categories: NsfwCategory[];
}> {
  var startedAt = Date.now();
  var payload = assertPayload(payloadValue);
  try {
    var row = await loadRow(payload);
    if (!row || row.isDeleted) {
      console.info("[nsfw.scan]", {
        contentType: payload.contentType,
        contentId: payload.contentId,
        categories: [],
        source: null,
        durationMs: Date.now() - startedAt,
        skipped: row ? "soft_deleted" : "missing",
      });
      return { found: Boolean(row), changed: false, status: null, categories: [] };
    }

    var text = [row.headline, row.body]
      .filter(function (value): value is string {
        return typeof value === "string" && value.trim().length > 0;
      })
      .join("\n\n");
    var textCategories = text.length > 0
      ? await classifier.classifyText(text)
      : [];

    var imageItems = row.media.filter(function (item) {
      return item.type === "image" && typeof item.key === "string" && item.key.length > 0;
    });
    var imageResults = await Promise.all(imageItems.map(async function (item) {
      return [item.key as string, await classifier.classifyImage(item.key as string)] as const;
    }));
    var mediaClassifications = new Map<string, NsfwCategory[]>(imageResults);
    var classifiedCategories = mergeNsfwCategories(
      textCategories,
      ...imageResults.map(function (entry) {
        return entry[1];
      })
    );
    var next = resolveNsfwState({
      existingStatus: row.nsfwStatus,
      existingSource: row.nsfwSource,
      existingCategories: row.nsfwCategories,
      classifiedCategories,
    });
    var nextMedia = payload.contentType === "post"
      ? applyMediaNsfwClassifications(row.media, mediaClassifications)
      : row.media;
    var now = new Date();

    var updated = payload.contentType === "post"
      ? await getDb().update(posts).set({
          nsfwStatus: next.status,
          nsfwCategories: next.categories,
          nsfwSource: next.source,
          nsfwScannedAt: now,
          media: nextMedia,
        }).where(and(
          eq(posts.id, row.id),
          sql`${posts.nsfwScannedAt} is not distinct from ${row.nsfwScannedAt}`,
          sql`${posts.updatedAt} is not distinct from ${row.updatedAt}`
        )).returning({ id: posts.id })
      : await getDb().update(comments).set({
          nsfwStatus: next.status,
          nsfwCategories: next.categories,
          nsfwSource: next.source,
          nsfwScannedAt: now,
        }).where(and(
          eq(comments.id, row.id),
          sql`${comments.nsfwScannedAt} is not distinct from ${row.nsfwScannedAt}`,
          sql`${comments.updatedAt} is not distinct from ${row.updatedAt}`
        )).returning({ id: comments.id });

    if (updated.length === 0) {
      throw new Error("NSFW content changed during classification; retry required");
    }

    console.info("[nsfw.scan]", {
      contentType: payload.contentType,
      contentId: payload.contentId,
      categories: next.categories,
      source: next.source,
      durationMs: Date.now() - startedAt,
    });
    return {
      found: true,
      changed: true,
      status: next.status,
      categories: next.categories,
    };
  } catch (error) {
    console.error("[nsfw.scan] failed", {
      contentType: payload.contentType,
      contentId: payload.contentId,
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

import { Hono } from "hono";
import { createHash } from "node:crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  ne,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  computeFeedScore,
  feedItemsRetentionBoundary,
  FEED_SCORE_COMMENT_WEIGHT,
  FEED_SCORE_ENGAGEMENT_WEIGHT,
  FEED_SCORE_RECENCY_HALF_LIFE_HOURS,
  FEED_SCORE_RECENCY_WEIGHT,
  FEED_SCORE_REPOST_WEIGHT,
  parseFeedItemsRetentionDays,
} from "@35mm/types";
import {
  createPostSchema,
  cursorPaginationSchema,
  bookmarkFolderNameSchema,
  bookmarkFolderAssignSchema,
  bookmarkPostSchema,
  richTextBodyToVisibleText,
  richTextMentionIds,
  validateRichTextBody,
} from "@35mm/validators";
import {
  posts,
  postLikes,
  postReposts,
  postBookmarks,
  bookmarkFolders,
  postPolls,
  pollOptions,
  pollVotes,
  counterJobDeltas,
  notifications,
  profiles,
  feedItems,
  follows,
  postEdits,
  commentLikes,
  comments,
  films,
  users,
} from "@35mm/db/schema";
import { getDb, getWriteDb } from "../../lib/db.js";
import {
  assertCanInteractWithPost,
  assertNoBlockBetween,
  blockFiltersForAuthor,
  notMutedByViewerSql,
} from "../../lib/moderation.js";
import { getOptionalAuthUser, requireAuth } from "../../lib/middleware.js";
import {
  filterModeratedFeedCachePayload,
  filterModeratedPostRows,
  isModerationStaffViewer,
  moderationReadAccessSql,
} from "../../lib/moderationRead.js";
import { ApiError, badRequest, conflict, forbidden, notFound } from "../../lib/errors.js";
import { decodeCompositeCursor, encodeCompositeCursor } from "../../lib/cursor.js";
import { isValidUlid } from "../../lib/ulid.js";
import { resolveProfileAvatarUrl, resolvePublicMediaUrl, type AvatarVariants } from "../media/url.js";
import {
  feedMediaUrl,
  fullMediaUrl,
  normalizePostMediaList,
  type PostMediaItem,
} from "../media/variants.js";
import {
  getFeedCache,
  getHighFollowerAuthorFeedCache,
  homeFeedCacheKey,
  invalidateAuthorProfileFeedCaches,
  invalidateFeedCacheForGuest,
  invalidateViewerFeedCaches,
  profileFeedCacheKey,
  setFeedCache,
  setHighFollowerAuthorFeedCache,
} from "../../lib/feedCache.js";
import { invalidateProfileStatsCaches } from "../../lib/profileStatsCache.js";
import {
  enqueueFeedFanoutJob,
  enqueueMediaProcessJob,
  removeNotificationPublishJob,
  type CounterIncrementJobPayload,
} from "../../lib/jobs.js";
import { recordCounterDeltas, wakeCounterOutbox } from "../../lib/counterOutbox.js";
import { createNotification } from "../../lib/notifications.js";
import {
  applyRateLimit,
  createRateLimitMiddleware,
  identifyByIp,
  identifyByUserId,
} from "../../lib/rateLimit.js";
import {
  feedHighFollowerCachePostLimit,
  feedHighFollowerCacheTtlSeconds,
  feedHighFollowerThreshold,
} from "./fanoutConfig.js";

const COMMENT_BODY_MAX_CHARS = 100000;
const COMMENT_BODY_LENGTH_ERROR = `Comment body must be 1-${COMMENT_BODY_MAX_CHARS} characters`;

export var feedRoutes = new Hono();

var createPostRateLimit = createRateLimitMiddleware({
  keyPrefix: "feed:create",
  limit: 20,
  windowSeconds: 60,
  identify: identifyByUserId,
});

function userRateLimit(keyPrefix: string, limit: number, windowSeconds: number) {
  return createRateLimitMiddleware({
    keyPrefix,
    limit,
    windowSeconds,
    identify: identifyByUserId,
  });
}

var postEditRateLimit = userRateLimit("feed:post-edit", 30, 60);
var postInteractionRateLimit = userRateLimit("feed:interaction", 120, 60);
var commentWriteRateLimit = userRateLimit("feed:comment-write", 60, 60);
var bookmarkFolderRateLimit = userRateLimit("feed:bookmark-folder", 30, 60);

function isDbError(err: unknown): err is { code?: unknown; message?: unknown } {
  return err != null && typeof err === "object";
}

function isValidationError(err: unknown): err is { issues: Array<{ message?: unknown }> } {
  return (
    err != null &&
    typeof err === "object" &&
    Array.isArray((err as { issues?: unknown }).issues)
  );
}

function normalizeActorIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(function (candidate): candidate is string {
      return typeof candidate === "string" && candidate.length > 0;
    });
  }

  if (typeof value === "string") {
    var trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed[0] === "{" && trimmed[trimmed.length - 1] === "}") {
      if (trimmed.length <= 2) return [];

      return trimmed
        .slice(1, -1)
        .split(",")
        .map(function (part) {
          return part.trim().replace(/^"(.*)"$/s, "$1");
        })
        .filter(function (part) {
          return part.length > 0;
        });
    }

    try {
      var parsed = JSON.parse(trimmed);
      return normalizeActorIds(parsed);
    } catch (_error) {
      return [];
    }
  }

  return [];
}

function isMissingActorIdsColumnError(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;

  var candidate = err as {
    code?: unknown;
    message?: unknown;
    cause?: {
      code?: unknown;
      message?: unknown;
    };
  };

  var code = typeof candidate.code === "string" ? candidate.code : "";
  if (code === "42703") return true;

  var cause = candidate.cause;
  var causeCode = cause && typeof cause === "object" ? (cause.code as unknown) : "";
  if (typeof causeCode === "string" && causeCode === "42703") return true;

  var message = typeof candidate.message === "string" ? candidate.message : "";
  var causeMessage =
    cause && typeof cause === "object" && typeof cause.message === "string" ? cause.message : "";

  return (
    message.includes("actor_ids") ||
    causeMessage.includes("actor_ids") ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

type PostCounterName = "likeCount" | "commentCount" | "repostCount" | "bookmarkCount";
type PostCounterFields = Record<PostCounterName, number>;

var POST_COUNTER_NAMES: PostCounterName[] = ["likeCount", "commentCount", "repostCount", "bookmarkCount"];

function applyPendingPostCounterDeltas(
  base: PostCounterFields,
  deltas: Partial<Record<PostCounterName, number>>
): PostCounterFields {
  return {
    likeCount: Math.max(0, Number(base.likeCount ?? 0) + Number(deltas.likeCount ?? 0)),
    commentCount: Math.max(0, Number(base.commentCount ?? 0) + Number(deltas.commentCount ?? 0)),
    repostCount: Math.max(0, Number(base.repostCount ?? 0) + Number(deltas.repostCount ?? 0)),
    bookmarkCount: Math.max(0, Number(base.bookmarkCount ?? 0) + Number(deltas.bookmarkCount ?? 0)),
  };
}

async function getPendingPostCounterDeltas(postId: string): Promise<Partial<Record<PostCounterName, number>>> {
  var db = getDb();
  var rows = await db
    .select({
      counterName: counterJobDeltas.counterName,
      delta: sql<number>`coalesce(sum(${counterJobDeltas.delta}), 0)`,
    })
    .from(counterJobDeltas)
    .where(
      and(
        eq(counterJobDeltas.targetTable, "posts"),
        eq(counterJobDeltas.targetId, postId),
        inArray(counterJobDeltas.counterName, POST_COUNTER_NAMES)
      )
    )
    .groupBy(counterJobDeltas.counterName);

  var deltas: Partial<Record<PostCounterName, number>> = {};
  for (var row of rows) {
    if (POST_COUNTER_NAMES.includes(row.counterName as PostCounterName)) {
      deltas[row.counterName as PostCounterName] = Number(row.delta ?? 0);
    }
  }
  return deltas;
}

async function getVisiblePostCounters(postId: string, base: PostCounterFields): Promise<PostCounterFields> {
  var deltas = await getPendingPostCounterDeltas(postId);
  return applyPendingPostCounterDeltas(base, deltas);
}

async function applyVisiblePostCountersToRows<T extends { id: string } & PostCounterFields>(rows: T[]): Promise<T[]> {
  if (rows.length === 0) return rows;

  var db = getDb();
  var postIds = Array.from(new Set(rows.map(function (row) {
    return row.id;
  })));
  var deltaRows = await db
    .select({
      targetId: counterJobDeltas.targetId,
      counterName: counterJobDeltas.counterName,
      delta: sql<number>`coalesce(sum(${counterJobDeltas.delta}), 0)`,
    })
    .from(counterJobDeltas)
    .where(
      and(
        eq(counterJobDeltas.targetTable, "posts"),
        inArray(counterJobDeltas.targetId, postIds),
        inArray(counterJobDeltas.counterName, POST_COUNTER_NAMES)
      )
    )
    .groupBy(counterJobDeltas.targetId, counterJobDeltas.counterName);

  if (deltaRows.length === 0) return rows;

  var deltasByPostId = new Map<string, Partial<Record<PostCounterName, number>>>();
  for (var deltaRow of deltaRows) {
    if (!POST_COUNTER_NAMES.includes(deltaRow.counterName as PostCounterName)) continue;
    var deltas = deltasByPostId.get(deltaRow.targetId) ?? {};
    deltas[deltaRow.counterName as PostCounterName] = Number(deltaRow.delta ?? 0);
    deltasByPostId.set(deltaRow.targetId, deltas);
  }

  return rows.map(function (row) {
    var deltas = deltasByPostId.get(row.id);
    if (!deltas) return row;
    return {
      ...row,
      ...applyPendingPostCounterDeltas(row, deltas),
    };
  });
}

function weakEtag(input: unknown, prefix: string): string {
  var digest = createHash("sha1").update(JSON.stringify(input)).digest("base64url");
  return `W/"${prefix}-${digest}"`;
}

const RICH_TEXT_PREFIX = "__35MM_RICH_TEXT_V1__";

type RichTextNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
};

function parseRichBody(value: string): RichTextNode | null {
  if (!value.startsWith(RICH_TEXT_PREFIX)) return null;
  try {
    var parsed = JSON.parse(value.slice(RICH_TEXT_PREFIX.length));
    if (parsed && typeof parsed === "object" && parsed.type === "doc") {
      return parsed as RichTextNode;
    }
  } catch {
    return null;
  }
  return null;
}

async function createMentionNotifications(params: {
  body: string;
  actorId: string;
  entityType: "post" | "comment";
  entityId: string;
}) {
  var mentionedIds = mentionNotificationRecipientIds(params.body, params.actorId);
  if (mentionedIds.length === 0) return;

  var db = getDb();
  var activeRows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, mentionedIds), eq(users.status, "active")));
  var activeIds = new Set(activeRows.map(function (row) { return row.id; }));

  await Promise.all(
    mentionedIds
      .filter(function (id, index, arr) {
        return activeIds.has(id) && arr.indexOf(id) === index;
      })
      .map(function (recipientId) {
        return createNotification({
          recipientId,
          actorId: params.actorId,
          type: "mention",
          entityType: params.entityType,
          entityId: params.entityId,
        });
      })
  );
}

export function mentionNotificationRecipientIds(body: string, actorId: string): string[] {
  return richTextMentionIds(body).filter(function (id, index, arr) {
    return id !== actorId && arr.indexOf(id) === index;
  });
}

async function hydrateRichMentions(value: string): Promise<string> {
  var doc = parseRichBody(value);
  if (!doc) return value;
  var ids: string[];
  try {
    ids = richTextMentionIds(value);
  } catch (_error) {
    return value;
  }
  if (ids.length === 0) return value;

  var db = getDb();
  var rows = await db
	    .select({
	      id: profiles.userId,
	      username: profiles.username,
	      isPrivate: profiles.isPrivate,
	      moderationStatus: profiles.moderationStatus,
	      status: users.status,
	    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(inArray(profiles.userId, ids));
  var byId = new Map(
    rows.map(function (row) {
      return [row.id, row];
    })
  );

  function walk(node: RichTextNode) {
    if (node.type === "mention" && typeof node.attrs?.id === "string") {
      var row = byId.get(node.attrs.id);
      if (!row || row.status !== "active" || row.moderationStatus !== "visible") {
        node.attrs = { ...node.attrs, deleted: true };
	      } else {
	        node.attrs = { ...node.attrs, username: row.username, label: row.username, isPrivate: row.isPrivate, deleted: false };
	      }
    }
    for (var child of node.content ?? []) walk(child);
  }
  walk(doc);
  return RICH_TEXT_PREFIX + JSON.stringify(doc);
}

function collectMentionIdsFromNode(node: RichTextNode, set: Set<string>) {
  if (node.type === "mention" && typeof node.attrs?.id === "string") {
    set.add(node.attrs.id);
  }
  for (var child of node.content ?? []) {
    collectMentionIdsFromNode(child, set);
  }
}

function applyMentionMetadataToNode(
  node: RichTextNode,
  byId: Map<string, {
    username: string;
    status: string;
    isPrivate: boolean;
    moderationStatus: "visible" | "hidden" | "removed";
  }>
) {
  if (node.type === "mention" && typeof node.attrs?.id === "string") {
    var row = byId.get(node.attrs.id);
    if (!row || row.status !== "active" || row.moderationStatus !== "visible") {
      node.attrs = { ...node.attrs, deleted: true };
    } else {
      node.attrs = {
        ...node.attrs,
        username: row.username,
        label: row.username,
        isPrivate: row.isPrivate,
        deleted: false,
      };
    }
  }
  for (var child of node.content ?? []) {
    applyMentionMetadataToNode(child, byId);
  }
}

type HydratedPostText = {
  body: string;
  headline: string | null;
};

async function hydratePostRichMentionsForRows(
  rows: Array<{ id: string; body: string; headline: string | null }>
): Promise<Map<string, HydratedPostText>> {
  var result = new Map<string, HydratedPostText>();
  if (rows.length === 0) return result;

  var docsByPostId = new Map<string, { bodyDoc?: RichTextNode; headlineDoc?: RichTextNode }>();
  var mentionIds = new Set<string>();

  for (var row of rows) {
    var bodyDoc = parseRichBody(row.body);
    if (bodyDoc) {
      collectMentionIdsFromNode(bodyDoc, mentionIds);
      var bodyEntry = docsByPostId.get(row.id) ?? {};
      bodyEntry.bodyDoc = bodyDoc;
      docsByPostId.set(row.id, bodyEntry);
    }

    if (row.headline) {
      var headlineDoc = parseRichBody(row.headline);
      if (headlineDoc) {
        collectMentionIdsFromNode(headlineDoc, mentionIds);
        var headlineEntry = docsByPostId.get(row.id) ?? {};
        headlineEntry.headlineDoc = headlineDoc;
        docsByPostId.set(row.id, headlineEntry);
      }
    }
  }

  if (mentionIds.size === 0) {
    for (var row of rows) {
      result.set(row.id, { body: row.body, headline: row.headline });
    }
    return result;
  }

  var db = getDb();
  var mentionRows = await db
    .select({
      id: profiles.userId,
      username: profiles.username,
      isPrivate: profiles.isPrivate,
      moderationStatus: profiles.moderationStatus,
      status: users.status,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(inArray(profiles.userId, Array.from(mentionIds)));

  var byId = new Map(
    mentionRows.map(function (row) {
      return [row.id, row];
    })
  );

  for (var row of rows) {
    var entry = docsByPostId.get(row.id);
    var hydratedBody = row.body;
    var hydratedHeadline = row.headline;
    if (entry?.bodyDoc) {
      applyMentionMetadataToNode(entry.bodyDoc, byId);
      hydratedBody = RICH_TEXT_PREFIX + JSON.stringify(entry.bodyDoc);
    }
    if (entry?.headlineDoc) {
      applyMentionMetadataToNode(entry.headlineDoc, byId);
      hydratedHeadline = RICH_TEXT_PREFIX + JSON.stringify(entry.headlineDoc);
    }
    result.set(row.id, {
      body: hydratedBody,
      headline: hydratedHeadline,
    });
  }

  return result;
}

async function hydratePostsForRows<T extends { id: string; body: string; headline: string | null }>(
  rows: T[],
  viewerUserId: string | null
): Promise<Array<T & { _preloadedBody: string; _preloadedHeadline: string | null; _preloadedPoll: FeedPoll | null }>> {
  var ids = rows.map(function (row) { return row.id; });
  var [pollsByPostId, richMentionsByPostId] = await Promise.all([
    hydratePostPollsForRows(ids, viewerUserId),
    hydratePostRichMentionsForRows(rows),
  ]);

  return rows.map(function (row) {
    var richText = richMentionsByPostId.get(row.id) ?? { body: row.body, headline: row.headline };
    return {
      ...row,
      _preloadedBody: richText.body,
      _preloadedHeadline: richText.headline,
      _preloadedPoll: pollsByPostId.get(row.id) ?? null,
    };
  });
}

function toActionError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (isValidationError(err)) {
    var validationMessage = err.issues[0]?.message;
    return badRequest(typeof validationMessage === "string" ? validationMessage : "Invalid request body");
  }
  if (isDbError(err)) {
    var code = typeof err.code === "string" ? err.code : "DB_ERROR";
    var dbMessage = typeof err.message === "string" ? err.message : "Database error";
    return new ApiError(400, code, dbMessage);
  }
  return new ApiError(500, "INTERNAL_ERROR", "Something went wrong");
}

type CreatePostInput = {
  type: "text" | "discussion" | "log" | "review" | "image";
  headline: string | null;
  body: string;
  postToFeed: boolean;
  filmId: string | null;
  filmRating: number | null;
  visibility: "public" | "followers_only" | "private";
  media: Array<{
    type: "image" | "video" | "film_embed" | "none";
    url: string;
    key?: string;
    thumbnailUrl?: string;
    altText?: string;
    width?: number;
    height?: number;
    blurhash?: string;
    variants?: {
      thumb?: string;
      feed?: string;
      full?: string;
    };
  }>;
  mediaUrls: string[];
  linkPreview: {
    url: string;
    title: string;
    description: string | null;
    image: string | null;
    domain: string;
    provider: "youtube" | "vimeo" | "link";
  } | null;
  poll: {
    type: "ranking" | "image";
    durationMinutes: number;
    resultsVisibility: "after_vote" | "after_end";
    options: Array<{
      label: string | null;
      imageUrl: string | null;
    }>;
  } | null;
};

function parseCreatePostInput(raw: unknown): CreatePostInput {
  var parsed = createPostSchema.parse(raw);
  var source = (raw ?? {}) as Record<string, unknown>;
  var visibilityRaw = source.visibility;
  var visibility: CreatePostInput["visibility"] = "public";
  var postToFeedRaw = source.postToFeed;
  var postToFeed = true;

  if (visibilityRaw !== undefined) {
    if (
      visibilityRaw !== "public" &&
      visibilityRaw !== "followers_only" &&
      visibilityRaw !== "private"
    ) {
      throw badRequest("Invalid visibility");
    }
    visibility = visibilityRaw;
  }

  if (postToFeedRaw !== undefined) {
    if (typeof postToFeedRaw !== "boolean") {
      throw badRequest("postToFeed must be a boolean");
    }
    postToFeed = postToFeedRaw;
  }

  var filmId: string | null = null;
  var filmRating: number | null = null;
  if (typeof source.filmId === "string" && source.filmId.trim().length > 0) {
    filmId = source.filmId.trim();
  } else if (parsed.film?.id) {
    filmId = parsed.film.id;
  }
  if (typeof parsed.film?.rating === "number" && Number.isFinite(parsed.film.rating)) {
    var scaled = Math.round(parsed.film.rating * 2);
    if (scaled >= 1 && scaled <= 10) {
      filmRating = scaled;
    }
  }

  if (filmId && !isValidUlid(filmId)) {
    throw new ApiError(400, "INVALID_FILM_ID", "film.id must be a 35mm ULID");
  }

  var poll = parsed.poll
    ? {
        type: parsed.poll.type,
        durationMinutes: parsed.poll.durationMinutes,
        resultsVisibility: parsed.poll.resultsVisibility,
        options: parsed.poll.options.map(function (option) {
          var label = option.label?.trim() ?? "";
          var imageUrl = option.imageUrl?.trim() ?? "";
          return {
            label: label.length > 0 ? label : null,
            imageUrl: imageUrl.length > 0 ? imageUrl : null,
          };
        }),
      }
    : null;

  return {
    type: parsed.type,
    headline: parsed.headline ?? null,
    body: parsed.body,
    postToFeed,
    filmId,
    filmRating,
    visibility,
    media: normalizePostMediaList(source.media ?? parsed.media).slice(0, 10),
    mediaUrls: Array.isArray(source.mediaUrls)
      ? source.mediaUrls.filter(function (value): value is string {
          return typeof value === "string" && value.trim().length > 0;
        }).slice(0, 9)
      : [],
    linkPreview:
      source.linkPreview && typeof source.linkPreview === "object"
        ? {
            url: String((source.linkPreview as Record<string, unknown>).url ?? ""),
            title: String((source.linkPreview as Record<string, unknown>).title ?? ""),
            description:
              (source.linkPreview as Record<string, unknown>).description == null
                ? null
                : String((source.linkPreview as Record<string, unknown>).description),
            image:
              (source.linkPreview as Record<string, unknown>).image == null
                ? null
                : String((source.linkPreview as Record<string, unknown>).image),
            domain: String((source.linkPreview as Record<string, unknown>).domain ?? ""),
            provider:
              (source.linkPreview as Record<string, unknown>).provider === "youtube" ||
              (source.linkPreview as Record<string, unknown>).provider === "vimeo"
                ? ((source.linkPreview as Record<string, unknown>).provider as "youtube" | "vimeo")
                : "link",
          }
        : null,
    poll,
  };
}

function parsePatchPostInput(raw: unknown): { headline?: string | null; body?: string; filmId?: string | null } {
  if (!raw || typeof raw !== "object") {
    throw badRequest("Invalid payload");
  }

  var source = raw as Record<string, unknown>;
  var hasHeadline = Object.prototype.hasOwnProperty.call(source, "headline");
  var hasBody = Object.prototype.hasOwnProperty.call(source, "body");
  var hasFilmId = Object.prototype.hasOwnProperty.call(source, "filmId");
  if (!hasHeadline && !hasBody && !hasFilmId) {
    throw badRequest("Provide headline and/or body and/or filmId");
  }

  var out: { headline?: string | null; body?: string; filmId?: string | null } = {};

  if (hasHeadline) {
    if (source.headline === null) {
      out.headline = null;
    } else if (typeof source.headline === "string") {
      var headline = source.headline.trim();
      if (headline.length < 1 || headline.length > 120) {
        throw badRequest("Headline must be 1-120 chars or null");
      }
      out.headline = headline;
    } else {
      throw badRequest("Headline must be string or null");
    }
  }

  if (hasBody) {
    if (typeof source.body !== "string") {
      throw badRequest("Body must be string");
    }
    var body = source.body.trim();
    if (body.length < 1 || body.length > 5000) {
      throw badRequest("Body must be 1-5000 characters");
    }
    out.body = body;
  }

  if (hasFilmId) {
    if (source.filmId === null) {
      out.filmId = null;
    } else if (typeof source.filmId === "string") {
      var filmId = source.filmId.trim();
      if (!isValidUlid(filmId)) {
        throw badRequest("filmId must be a 35mm ULID");
      }
      out.filmId = filmId;
    } else {
      throw badRequest("filmId must be a string ULID or null");
    }
  }

  return out;
}

function parseCreateCommentInput(raw: unknown): { body: string; parentId: string | null } {
  if (!raw || typeof raw !== "object") {
    throw badRequest("Invalid payload");
  }

  var source = raw as Record<string, unknown>;
  if (typeof source.body !== "string") {
    throw badRequest("Comment body must be string");
  }
  var body: string;
  try {
    body = validateRichTextBody(source.body.trim(), COMMENT_BODY_MAX_CHARS);
  } catch (_error) {
    throw badRequest(COMMENT_BODY_LENGTH_ERROR);
  }
  var visibleBody = richTextBodyToVisibleText(body).trim();
  if (
    body.length < 1 ||
    body.length > COMMENT_BODY_MAX_CHARS ||
    visibleBody.length < 1 ||
    visibleBody.length > COMMENT_BODY_MAX_CHARS
  ) {
    throw badRequest(COMMENT_BODY_LENGTH_ERROR);
  }

  if (
    source.parentId !== undefined &&
    source.parentId !== null &&
    (typeof source.parentId !== "string" || source.parentId.length === 0)
  ) {
    throw badRequest("Invalid parent comment id");
  }

  return {
    body,
    parentId: typeof source.parentId === "string" ? source.parentId : null,
  };
}

function parseUpdateCommentInput(raw: unknown): { body: string } {
  if (!raw || typeof raw !== "object") {
    throw badRequest("Invalid payload");
  }

  var source = raw as Record<string, unknown>;
  if (typeof source.body !== "string") {
    throw badRequest("Comment body must be string");
  }
  var body: string;
  try {
    body = validateRichTextBody(source.body.trim(), COMMENT_BODY_MAX_CHARS);
  } catch (_error) {
    throw badRequest(COMMENT_BODY_LENGTH_ERROR);
  }
  var visibleBody = richTextBodyToVisibleText(body).trim();
  if (
    body.length < 1 ||
    body.length > COMMENT_BODY_MAX_CHARS ||
    visibleBody.length < 1 ||
    visibleBody.length > COMMENT_BODY_MAX_CHARS
  ) {
    throw badRequest(COMMENT_BODY_LENGTH_ERROR);
  }

  return { body };
}

function postVisibilitySql(viewerUserId: string | null, viewerIsStaff = false) {
  var repostSourceAccess = viewerUserId
    ? sql<boolean>`(
        ${posts.isRepost} = false
        or ${posts.replyToId} is null
        or exists (
          select 1
          from ${posts} source_posts
          inner join ${profiles} source_profiles on source_profiles.user_id = source_posts.user_id
          where source_posts.id = ${posts.replyToId}
            and (
              source_posts.moderation_status = 'visible'
              or source_posts.user_id = ${viewerUserId}
              or ${viewerIsStaff}
            )
            and (
              source_profiles.moderation_status = 'visible'
              or source_profiles.user_id = ${viewerUserId}
              or ${viewerIsStaff}
            )
            and (
              source_profiles.is_private = false
              or source_posts.user_id = ${viewerUserId}
              or exists (
                select 1
                from ${follows} source_follows
                where source_follows.follower_id = ${viewerUserId}
                  and source_follows.following_id = source_posts.user_id
                  and source_follows.status = 'accepted'
              )
            )
        )
      )`
    : sql<boolean>`(
        ${posts.isRepost} = false
        or ${posts.replyToId} is null
        or exists (
          select 1
          from ${posts} source_posts
          inner join ${profiles} source_profiles on source_profiles.user_id = source_posts.user_id
          where source_posts.id = ${posts.replyToId}
            and source_posts.moderation_status = 'visible'
            and source_profiles.moderation_status = 'visible'
            and source_profiles.is_private = false
        )
      )`;

  if (!viewerUserId) {
    return and(eq(posts.visibility, "public"), repostSourceAccess);
  }

  return sql<boolean>`(
    (
      ${posts.visibility} = 'public'
      or ${posts.userId} = ${viewerUserId}
      or (
        ${posts.visibility} = 'followers_only'
        and exists (
          select 1
          from ${follows}
          where ${follows.followerId} = ${viewerUserId}
            and ${follows.followingId} = ${posts.userId}
            and ${follows.status} = 'accepted'
        )
      )
    )
    and ${repostSourceAccess}
  )`;
}

function profileAccessSql(viewerUserId: string | null, viewerIsStaff = false) {
  var moderationAccess = moderationReadAccessSql(
    profiles.moderationStatus,
    profiles.userId,
    viewerUserId,
    viewerIsStaff
  );
  if (!viewerUserId) {
    return and(eq(profiles.isPrivate, false), moderationAccess);
  }

  return and(
    sql<boolean>`(
      ${profiles.isPrivate} = false
      or ${profiles.userId} = ${viewerUserId}
      or exists (
        select 1
        from ${follows}
        where ${follows.followerId} = ${viewerUserId}
          and ${follows.followingId} = ${profiles.userId}
          and ${follows.status} = 'accepted'
      )
    )`,
    moderationAccess
  );
}

function postModerationAccessSql(viewerUserId: string | null, viewerIsStaff = false) {
  return moderationReadAccessSql(
    posts.moderationStatus,
    posts.userId,
    viewerUserId,
    viewerIsStaff
  );
}

function compositeCursorSql(createdAtColumn: unknown, idColumn: unknown, cursor: { createdAt: Date; id: string } | null) {
  if (!cursor) return undefined;

  return or(
    lt(createdAtColumn as any, cursor.createdAt),
    and(eq(createdAtColumn as any, cursor.createdAt), lt(idColumn as any, cursor.id))
  );
}

async function invalidatePostInteractionCaches(input: {
  actorUserId: string;
  postOwnerId: string;
  isPostPublic: boolean;
}) {
  void input.isPostPublic;
  await invalidateViewerFeedCaches([input.actorUserId, input.postOwnerId]);
  await invalidateAuthorProfileFeedCaches([input.postOwnerId]);
  await invalidateProfileStatsCaches([input.postOwnerId]);
}

async function invalidateFeedAfterAuthorMutation(input: {
  authorUserId: string;
  includeGuest: boolean;
}) {
  await invalidateViewerFeedCaches([input.authorUserId]);
  await invalidateAuthorProfileFeedCaches([input.authorUserId]);
  await invalidateProfileStatsCaches([input.authorUserId]);
  if (input.includeGuest) {
    await invalidateFeedCacheForGuest();
  }
}

type FeedPoll = {
  id: string;
  type: "ranking" | "image";
  resultsVisibility: "after_vote" | "after_end";
  endsAt: string;
  totalVotes: number;
  hasVoted: boolean;
  isEnded: boolean;
  resultsVisible: boolean;
  selectedOptionIds: string[];
  options: Array<{
    id: string;
    label: string | null;
    imageUrl: string | null;
    position: number;
    voteCount: number | null;
    percent: number | null;
  }>;
};

var pollTablesAvailable: boolean | null = null;

type RawPollRow = {
  postId: string;
  id: string;
  type: "ranking" | "image";
  resultsVisibility: "after_vote" | "after_end";
  endsAt: Date;
  totalVotes: number;
};

type RawPollOptionRow = {
  pollId: string;
  id: string;
  label: string | null;
  imageUrl: string | null;
  position: number;
  voteCount: number | null;
};

type RawPollVoteRow = {
  pollId: string;
  optionId: string | null;
  rankingOptionIds: string[];
};

type PreloadedPoll = {
  body?: string;
  headline?: string | null;
  poll?: FeedPoll | null;
};

function dateFromDb(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

function isMissingRelationError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  var candidate = err as {
    code?: unknown;
    message?: unknown;
    cause?: { code?: unknown; message?: unknown };
  };
  var code = typeof candidate.code === "string" ? candidate.code : "";
  var causeCode = typeof candidate.cause?.code === "string" ? candidate.cause.code : "";
  var message = typeof candidate.message === "string" ? candidate.message : "";
  var causeMessage = typeof candidate.cause?.message === "string" ? candidate.cause.message : "";
  return (
    code === "42P01" ||
    causeCode === "42P01" ||
    message.includes("relation \"post_polls\" does not exist") ||
    causeMessage.includes("relation \"post_polls\" does not exist")
  );
}

async function hydratePostPoll(postId: string, viewerUserId: string | null): Promise<FeedPoll | null> {
  if (pollTablesAvailable === false) return null;
  var db = getDb();
  var pollRows: Array<{
    id: string;
    type: "ranking" | "image";
    resultsVisibility: "after_vote" | "after_end";
    endsAt: Date;
    totalVotes: number;
  }>;

  try {
    pollRows = await db
      .select({
        id: postPolls.id,
        type: postPolls.type,
        resultsVisibility: postPolls.resultsVisibility,
        endsAt: postPolls.endsAt,
        totalVotes: postPolls.totalVotes,
      })
      .from(postPolls)
      .where(eq(postPolls.postId, postId))
      .limit(1);
    pollTablesAvailable = true;
  } catch (error) {
    if (isMissingRelationError(error)) {
      pollTablesAvailable = false;
      return null;
    }
    throw error;
  }

  var poll = pollRows[0];
  if (!poll) return null;

  var optionRows = await db
    .select({
      id: pollOptions.id,
      label: pollOptions.label,
      imageUrl: pollOptions.imageUrl,
      position: pollOptions.position,
      voteCount: pollOptions.voteCount,
    })
    .from(pollOptions)
    .where(eq(pollOptions.pollId, poll.id))
    .orderBy(asc(pollOptions.position));

  var voteRow: { optionId: string | null; rankingOptionIds: string[] } | null = null;
  if (viewerUserId) {
    var voteRows = await db
      .select({
        optionId: pollVotes.optionId,
        rankingOptionIds: pollVotes.rankingOptionIds,
      })
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, poll.id), eq(pollVotes.userId, viewerUserId)))
      .limit(1);
    voteRow = voteRows[0] ?? null;
  }

  var endsAt = dateFromDb(poll.endsAt);
  var isEnded = endsAt.getTime() <= Date.now();
  var selectedOptionIds = voteRow
    ? poll.type === "ranking"
      ? voteRow.rankingOptionIds
      : voteRow.optionId
        ? [voteRow.optionId]
        : []
    : [];
  var hasVoted = selectedOptionIds.length > 0;
  var resultsVisible = hasVoted || isEnded;
  var totalVotes = Number(poll.totalVotes ?? 0);
  var scoreTotal = optionRows.reduce(function (sum, option) {
    return sum + Number(option.voteCount ?? 0);
  }, 0);
  var denominator = poll.type === "ranking" ? scoreTotal : totalVotes;

  var responseOptions = await Promise.all(optionRows.map(async function (option) {
    var voteCount = Number(option.voteCount ?? 0);
    return {
      id: option.id,
      label: option.label,
      imageUrl: await resolvePublicMediaUrl(option.imageUrl),
      position: Number(option.position),
      voteCount,
      percent: resultsVisible && denominator > 0 ? Math.round((voteCount / denominator) * 1000) / 10 : null,
    };
  }));

  return {
    id: poll.id,
    type: poll.type,
    resultsVisibility: poll.resultsVisibility,
    endsAt: Number.isNaN(endsAt.getTime()) ? new Date().toISOString() : endsAt.toISOString(),
    totalVotes,
    hasVoted,
    isEnded,
    resultsVisible,
    selectedOptionIds,
    options: responseOptions,
  };
}

async function hydratePostPollsForRows(
  postIds: string[],
  viewerUserId: string | null
): Promise<Map<string, FeedPoll | null>> {
  var result = new Map<string, FeedPoll | null>();
  for (var i = 0; i < postIds.length; i += 1) {
    result.set(postIds[i], null);
  }
  if (postIds.length === 0 || pollTablesAvailable === false) return result;

  var db = getDb();
  var pollRows: RawPollRow[];
  try {
    pollRows = await db
      .select({
        postId: postPolls.postId,
        id: postPolls.id,
        type: postPolls.type,
        resultsVisibility: postPolls.resultsVisibility,
        endsAt: postPolls.endsAt,
        totalVotes: postPolls.totalVotes,
      })
      .from(postPolls)
      .where(inArray(postPolls.postId, postIds));
    pollTablesAvailable = true;
  } catch (error) {
    if (isMissingRelationError(error)) {
      pollTablesAvailable = false;
      return result;
    }
    throw error;
  }

  if (pollRows.length === 0) return result;

  var pollIds: string[] = [];
  for (var row of pollRows) {
    pollIds.push(row.id);
  }

  var optionRows: RawPollOptionRow[] = [];
  if (pollIds.length > 0) {
    optionRows = await db
      .select({
        pollId: pollOptions.pollId,
        id: pollOptions.id,
        label: pollOptions.label,
        imageUrl: pollOptions.imageUrl,
        position: pollOptions.position,
        voteCount: pollOptions.voteCount,
      })
      .from(pollOptions)
      .where(inArray(pollOptions.pollId, pollIds))
      .orderBy(asc(pollOptions.pollId), asc(pollOptions.position));
  }

  var optionsByPollId = new Map<string, RawPollOptionRow[]>();
  for (var optionRow of optionRows) {
    var list = optionsByPollId.get(optionRow.pollId);
    if (!list) {
      list = [];
      optionsByPollId.set(optionRow.pollId, list);
    }
    list.push(optionRow);
  }

  var voteRows: RawPollVoteRow[] = [];
  if (viewerUserId && pollIds.length > 0) {
    voteRows = await db
      .select({
        pollId: pollVotes.pollId,
        optionId: pollVotes.optionId,
        rankingOptionIds: pollVotes.rankingOptionIds,
      })
      .from(pollVotes)
      .where(and(eq(pollVotes.userId, viewerUserId), inArray(pollVotes.pollId, pollIds)));
  }

  var votesByPollId = new Map<string, RawPollVoteRow>();
  for (var vote of voteRows) {
    votesByPollId.set(vote.pollId, vote);
  }

  for (var pollRow of pollRows) {
    var endsAt = dateFromDb(pollRow.endsAt);
    var isEnded = endsAt.getTime() <= Date.now();
    var voteRow = votesByPollId.get(pollRow.id) ?? null;
    var selectedOptionIds = voteRow
      ? pollRow.type === "ranking"
        ? voteRow.rankingOptionIds
        : voteRow.optionId
          ? [voteRow.optionId]
          : []
      : [];
    var hasVoted = selectedOptionIds.length > 0;
    var resultsVisible = hasVoted || isEnded;
    var totalVotes = Number(pollRow.totalVotes ?? 0);
    var pollOptionRows = optionsByPollId.get(pollRow.id) ?? [];
    var scoreTotal = pollOptionRows.reduce(function (sum, option) {
      return sum + Number(option.voteCount ?? 0);
    }, 0);
    var denominator = pollRow.type === "ranking" ? scoreTotal : totalVotes;

    var responseOptions = await Promise.all(pollOptionRows.map(async function (option) {
      var voteCount = Number(option.voteCount ?? 0);
      return {
        id: option.id,
        label: option.label,
        imageUrl: await resolvePublicMediaUrl(option.imageUrl),
        position: Number(option.position),
        voteCount,
        percent: resultsVisible && denominator > 0 ? Math.round((voteCount / denominator) * 1000) / 10 : null,
      };
    }));

    result.set(pollRow.postId, {
      id: pollRow.id,
      type: pollRow.type,
      resultsVisibility: pollRow.resultsVisibility,
      endsAt: Number.isNaN(endsAt.getTime()) ? new Date().toISOString() : endsAt.toISOString(),
      totalVotes,
      hasVoted,
      isEnded,
      resultsVisible,
      selectedOptionIds,
      options: responseOptions,
    });
  }

  return result;
}

async function toPostItem(row: {
  id: string;
  type: "text" | "discussion" | "log" | "review" | "image";
  headline: string | null;
  body: string;
  visibility: "public" | "followers_only" | "private";
  filmId: string | null;
  filmTmdbId: number | null;
  filmTitle: string | null;
  filmYear: number | null;
  filmPosterUrl: string | null;
  filmGenres: string[] | null;
  filmRating: number | null;
  media: PostMediaItem[];
  mediaUrls: string[] | null;
  linkPreview: {
    url: string;
    title: string;
    description: string | null;
    image: string | null;
    domain: string;
    provider: "youtube" | "vimeo" | "link";
  } | null;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  authorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarVariants?: AvatarVariants | null;
  role: string | null;
  roleContext: string | null;
  profileHeadline: string | null;
  profileHeadlineContext: string | null;
  filmsLoggedCount: number;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  bookmarkCount: number;
  isDeleted: boolean;
  moderationStatus: "visible" | "hidden" | "removed";
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
  bookmarkFolderId?: string | null;
}, viewerUserId: string | null = null, preloaded: PreloadedPoll = {}) {
  var [avatarUrl, avatarUrlLg] = await Promise.all([
    resolveProfileAvatarUrl(row.avatarUrl, row.authorId, row.avatarVariants, "sm"),
    resolveProfileAvatarUrl(row.avatarUrl, row.authorId, row.avatarVariants, "lg"),
  ]);
  var mediaItems = normalizePostMediaList(row.media);
  var responseMedia = mediaItems.map(function (item) {
    return {
      ...item,
      url: feedMediaUrl(item),
      variants: {
        ...item.variants,
        full: fullMediaUrl(item),
      },
    };
  });
  var responseMediaUrls = responseMedia
    .filter(function (item) {
      return item.type === "image";
    })
    .map(function (item) {
      return item.url;
    });

  var hydratedBody = preloaded?.body ?? await hydrateRichMentions(row.body);
  var hydratedHeadline = preloaded && Object.prototype.hasOwnProperty.call(preloaded, "headline")
    ? preloaded.headline ?? null
    : row.headline
      ? await hydrateRichMentions(row.headline)
      : row.headline;
  var hasPollOverride = preloaded != null && Object.prototype.hasOwnProperty.call(preloaded, "poll");
  var poll = hasPollOverride
    ? preloaded.poll
    : await hydratePostPoll(row.id, viewerUserId);

  return {
    id: row.id,
    type: row.type,
    headline: hydratedHeadline,
    body: hydratedBody,
    visibility: row.visibility,
    media: responseMedia,
    mediaUrls: responseMediaUrls,
    linkPreview: row.linkPreview
      ? {
          ...row.linkPreview,
          image: row.linkPreview.image,
        }
      : null,
    poll,
    film: row.filmId
      ? {
          id: row.filmId,
          tmdbId: row.filmTmdbId ?? undefined,
          title: row.filmTitle ?? "Unknown",
          year: row.filmYear,
          posterUrl: row.filmPosterUrl,
          genres: row.filmGenres ?? [],
          rating: row.filmRating == null ? null : row.filmRating / 2,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    isDeleted: row.isDeleted,
    moderationStatus: row.moderationStatus,
    author: {
      id: row.authorId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl,
      avatarUrlLg,
      role: row.role ?? row.profileHeadline,
      roleContext: row.roleContext ?? row.profileHeadlineContext,
      filmsLoggedCount: Number(row.filmsLoggedCount ?? 0),
    },
    likeCount: Number(row.likeCount ?? 0),
    commentCount: Number(row.commentCount ?? 0),
    repostCount: Number(row.repostCount ?? 0),
    bookmarkCount: Number(row.bookmarkCount ?? 0),
    isLiked: Boolean(row.isLiked),
    isReposted: Boolean(row.isReposted),
    isBookmarked: Boolean(row.isBookmarked),
    bookmarkFolderId: row.bookmarkFolderId ?? null,
  };
}

type HomeFeedRow = Parameters<typeof toPostItem>[0] & {
  cursorScore: number;
  cursorId: string;
  cursorCreatedAt: Date;
  cursorRetentionCreatedAt: Date | null;
};

type FeedScoreCursor = {
  score: number;
  id: string;
  asOf: Date;
  retentionCreatedAt: Date | null;
  legacy: boolean;
};

export type CachedHighFollowerAuthorRow = {
  id: string;
  type: "text" | "discussion" | "log" | "review" | "image";
  headline: string | null;
  body: string;
  visibility: "public" | "followers_only" | "private";
  filmId: string | null;
  filmTmdbId: number | null;
  filmTitle: string | null;
  filmYear: number | null;
  filmPosterUrl: string | null;
  filmGenres: string[] | null;
  filmRating: number | null;
  media: PostMediaItem[];
  mediaUrls: string[] | null;
  linkPreview: {
    url: string;
    title: string;
    description: string | null;
    image: string | null;
    domain: string;
    provider: "youtube" | "vimeo" | "link";
  } | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  authorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarVariants?: AvatarVariants | null;
  role: string | null;
  roleContext: string | null;
  profileHeadline: string | null;
  profileHeadlineContext: string | null;
  filmsLoggedCount: number;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  bookmarkCount: number;
  isDeleted: boolean;
  moderationStatus?: "visible" | "hidden" | "removed";
};

function compareHomeFeedRows(a: Pick<HomeFeedRow, "cursorScore" | "cursorId">, b: Pick<HomeFeedRow, "cursorScore" | "cursorId">): number {
  var scoreDelta = b.cursorScore - a.cursorScore;
  if (scoreDelta !== 0) return scoreDelta;
  return b.cursorId.localeCompare(a.cursorId);
}

export function mergeHomeFeedRows<T extends { id: string; cursorScore: number; cursorId: string }>(
  materializedRows: T[],
  liveRows: T[],
  limit: number
): { rows: T[]; hasMore: boolean } {
  var byPostId = new Map<string, T>();
  for (var row of materializedRows.concat(liveRows)) {
    var existing = byPostId.get(row.id);
    if (!existing || compareHomeFeedRows(row, existing) < 0) {
      byPostId.set(row.id, row);
    }
  }

  var rows = Array.from(byPostId.values()).sort(compareHomeFeedRows);
  return {
    rows: rows.slice(0, limit),
    hasMore: rows.length > limit,
  };
}

function encodeFeedScoreCursor(input: FeedScoreCursor): string {
  var payload = JSON.stringify({
    s: input.score,
    i: input.id,
    a: input.asOf.toISOString(),
    r: input.retentionCreatedAt ? input.retentionCreatedAt.toISOString() : null,
  });
  return Buffer.from(payload, "utf8").toString("base64");
}

function decodeFeedScoreCursor(cursorValue: string | undefined): FeedScoreCursor | null {
  if (!cursorValue) return null;

  try {
    var decoded = Buffer.from(cursorValue, "base64").toString("utf8");
    var parsed = JSON.parse(decoded) as { s?: unknown; i?: unknown; a?: unknown };
    var retentionCreatedAtRaw = (parsed as { r?: unknown }).r;
    var scoreRaw = parsed.s;
    var idRaw = parsed.i;
    var asOfRaw = parsed.a;
    if (typeof scoreRaw !== "number" || !Number.isFinite(scoreRaw)) {
      throw new Error("invalid-score");
    }
    if (typeof idRaw !== "string" || idRaw.length === 0) {
      throw new Error("invalid-id");
    }
    var asOf = typeof asOfRaw === "string" ? new Date(asOfRaw) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new Error("invalid-as-of");
    }
    var retentionCreatedAt = typeof retentionCreatedAtRaw === "string"
      ? new Date(retentionCreatedAtRaw)
      : null;
    if (retentionCreatedAt && Number.isNaN(retentionCreatedAt.getTime())) {
      throw new Error("invalid-retention-created-at");
    }

    return {
      score: scoreRaw,
      id: idRaw,
      asOf,
      retentionCreatedAt,
      legacy: !Object.prototype.hasOwnProperty.call(parsed, "r"),
    };
  } catch (_error) {
    throw badRequest("Invalid cursor");
  }
}

export function shouldUseColdFeedFallback(input: {
  cursor: FeedScoreCursor | null;
  retentionBoundary: Date;
  rankingAsOf: Date;
}): boolean {
  if (!input.cursor) return false;

  if (!input.cursor.legacy) {
    return input.cursor.retentionCreatedAt != null
      && input.cursor.retentionCreatedAt.getTime() <= input.retentionBoundary.getTime();
  }

  var boundaryScore = computeFeedScore({
    createdAt: input.retentionBoundary,
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    now: input.rankingAsOf,
  });
  return input.cursor.score <= boundaryScore;
}

function feedItemsRetentionDays(): number {
  return parseFeedItemsRetentionDays(process.env.FEED_ITEMS_RETENTION_DAYS);
}

function feedScoreSql(asOf: Date) {
  return sql<number>`(
    ${FEED_SCORE_RECENCY_WEIGHT} * exp(
      -greatest(extract(epoch from (${asOf}::timestamptz - ${posts.createdAt})) / 3600, 0)
      / ${FEED_SCORE_RECENCY_HALF_LIFE_HOURS}
    )
    + ${FEED_SCORE_ENGAGEMENT_WEIGHT} * ln(
      1
      + greatest(${posts.likeCount}, 0)
      + greatest(${posts.commentCount}, 0) * ${FEED_SCORE_COMMENT_WEIGHT}
      + greatest(${posts.repostCount}, 0) * ${FEED_SCORE_REPOST_WEIGHT}
    )
  )`;
}

function feedScoreCursorSql(scoreColumn: unknown, idColumn: unknown, cursor: FeedScoreCursor | null) {
  if (!cursor) return undefined;

  return or(
    lt(scoreColumn as any, cursor.score),
    and(eq(scoreColumn as any, cursor.score), lt(idColumn as any, cursor.id))
  );
}

function passesFeedScoreCursor(row: Pick<HomeFeedRow, "cursorScore" | "cursorId">, cursor: FeedScoreCursor | null): boolean {
  if (!cursor) return true;
  return row.cursorScore < cursor.score || (row.cursorScore === cursor.score && row.cursorId < cursor.id);
}

function cachedHighFollowerAuthorRowFromHomeRow(row: HomeFeedRow): CachedHighFollowerAuthorRow {
  return {
    id: row.id,
    type: row.type,
    headline: row.headline,
    body: row.body,
    visibility: row.visibility,
    filmId: row.filmId,
    filmTmdbId: row.filmTmdbId,
    filmTitle: row.filmTitle,
    filmYear: row.filmYear,
    filmPosterUrl: row.filmPosterUrl,
    filmGenres: row.filmGenres,
    filmRating: row.filmRating,
    media: row.media,
    mediaUrls: row.mediaUrls,
    linkPreview: row.linkPreview,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    authorId: row.authorId,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    avatarVariants: row.avatarVariants,
    role: row.role,
    roleContext: row.roleContext,
    profileHeadline: row.profileHeadline,
    profileHeadlineContext: row.profileHeadlineContext,
    filmsLoggedCount: Number(row.filmsLoggedCount ?? 0),
    likeCount: Number(row.likeCount ?? 0),
    commentCount: Number(row.commentCount ?? 0),
    repostCount: Number(row.repostCount ?? 0),
    bookmarkCount: Number(row.bookmarkCount ?? 0),
    isDeleted: row.isDeleted,
    moderationStatus: row.moderationStatus,
  };
}

function homeRowFromCachedHighFollowerAuthorRow(
  row: CachedHighFollowerAuthorRow,
  rankingAsOf: Date
): HomeFeedRow {
  var createdAt = new Date(row.createdAt);
  return {
    ...row,
    moderationStatus: row.moderationStatus ?? "visible",
    createdAt,
    updatedAt: new Date(row.updatedAt),
    editedAt: row.editedAt ? new Date(row.editedAt) : null,
    cursorScore: computeFeedScore({
      createdAt,
      likeCount: Number(row.likeCount ?? 0),
      commentCount: Number(row.commentCount ?? 0),
      repostCount: Number(row.repostCount ?? 0),
      now: rankingAsOf,
    }),
    cursorId: row.id,
    cursorCreatedAt: createdAt,
    cursorRetentionCreatedAt: null,
    isLiked: false,
    isReposted: false,
    isBookmarked: false,
  };
}

function isCachedHighFollowerAuthorRow(value: unknown): value is CachedHighFollowerAuthorRow {
  if (!value || typeof value !== "object") return false;
  var row = value as Partial<CachedHighFollowerAuthorRow>;
  return (
    typeof row.id === "string" &&
    typeof row.authorId === "string" &&
    typeof row.createdAt === "string" &&
    typeof row.updatedAt === "string" &&
    typeof row.type === "string" &&
    typeof row.body === "string" &&
    typeof row.username === "string" &&
    typeof row.displayName === "string"
  );
}

export function rankHighFollowerAuthorCacheRows(input: {
  rows: CachedHighFollowerAuthorRow[];
  rankingAsOf: Date;
  scoreCursor: FeedScoreCursor | null;
  limit: number;
}): HomeFeedRow[] {
  return input.rows
    .map(function (row) {
      return homeRowFromCachedHighFollowerAuthorRow(row, input.rankingAsOf);
    })
    .filter(function (row) {
      return passesFeedScoreCursor(row, input.scoreCursor);
    })
    .sort(compareHomeFeedRows)
    .slice(0, input.limit);
}

async function selectLiveHomeFeedRows(input: {
  viewerUserId: string;
  viewerIsStaff: boolean;
  authorIds: string[] | null;
  scoreCursor: FeedScoreCursor | null;
  rankingAsOf: Date;
  limit: number;
}): Promise<HomeFeedRow[]> {
  if (input.authorIds && input.authorIds.length === 0) return [];

  var db = getDb();
  var liveScore = feedScoreSql(input.rankingAsOf);
  var authorFilter = input.authorIds
    ? inArray(posts.userId, input.authorIds)
    : sql<boolean>`(
        ${posts.userId} = ${input.viewerUserId}
        or exists (
          select 1
          from ${follows}
          where ${follows.followerId} = ${input.viewerUserId}
            and ${follows.followingId} = ${posts.userId}
            and ${follows.status} = 'accepted'
        )
      )`;
  var liveFilters: any[] = [
    authorFilter,
    eq(posts.isDeleted, false),
    postModerationAccessSql(input.viewerUserId, input.viewerIsStaff),
    postVisibilitySql(input.viewerUserId, input.viewerIsStaff),
    profileAccessSql(input.viewerUserId, input.viewerIsStaff),
    ...blockFiltersForAuthor(input.viewerUserId, posts.userId),
    notMutedByViewerSql(input.viewerUserId, posts.userId),
  ];
  var liveCursorFilter = feedScoreCursorSql(liveScore, posts.id, input.scoreCursor);
  if (liveCursorFilter) liveFilters.push(liveCursorFilter);

  return db
    .select({
      cursorScore: liveScore,
      cursorId: posts.id,
      cursorCreatedAt: posts.createdAt,
      cursorRetentionCreatedAt: sql<Date | null>`null`,
      id: posts.id,
      type: posts.type,
      headline: posts.headline,
      body: posts.body,
      visibility: posts.visibility,
      filmId: posts.filmId,
      filmTmdbId: films.tmdbId,
      filmTitle: films.title,
      filmYear: films.year,
      filmPosterUrl: films.posterUrl,
      filmGenres: films.genres,
      filmRating: posts.filmRating,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
      linkPreview: posts.linkPreview,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      editedAt: posts.editedAt,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      role: profiles.role,
      roleContext: profiles.roleContext,
      profileHeadline: profiles.headline,
      profileHeadlineContext: profiles.headlineContext,
      filmsLoggedCount: profiles.filmsLoggedCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
      bookmarkCount: posts.bookmarkCount,
      isDeleted: posts.isDeleted,
      moderationStatus: posts.moderationStatus,
      isLiked: sql<boolean>`exists(select 1 from ${postLikes} where ${postLikes.postId} = ${posts.id} and ${postLikes.userId} = ${input.viewerUserId})`,
      isReposted: sql<boolean>`exists(select 1 from ${postReposts} where ${postReposts.postId} = ${posts.id} and ${postReposts.userId} = ${input.viewerUserId})`,
      isBookmarked: sql<boolean>`exists(select 1 from ${postBookmarks} where ${postBookmarks.postId} = ${posts.id} and ${postBookmarks.userId} = ${input.viewerUserId})`,
    })
    .from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .leftJoin(films, eq(films.id, posts.filmId))
    .where(and(...liveFilters))
    .orderBy(desc(liveScore), desc(posts.id))
    .limit(input.limit);
}

async function visibleHighFollowerAuthorIds(
  viewerUserId: string,
  viewerIsStaff: boolean,
  authorIds: string[]
): Promise<string[]> {
  if (authorIds.length === 0) return [];
  var db = getDb();
  var rows = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(
      and(
        inArray(profiles.userId, authorIds),
        profileAccessSql(viewerUserId, viewerIsStaff),
        ...blockFiltersForAuthor(viewerUserId, profiles.userId),
        notMutedByViewerSql(viewerUserId, profiles.userId)
      )
    );

  return rows.map(function (row) {
    return row.userId;
  });
}

async function selectHighFollowerAuthorRowsFromDb(input: {
  authorUserId: string;
  rankingAsOf: Date;
  scoreCursor: FeedScoreCursor | null;
  limit: number;
}): Promise<HomeFeedRow[]> {
  var db = getDb();
  var liveScore = feedScoreSql(input.rankingAsOf);
  var filters: any[] = [
    eq(posts.userId, input.authorUserId),
    eq(posts.isDeleted, false),
    eq(posts.moderationStatus, "visible"),
    eq(profiles.moderationStatus, "visible"),
    ne(posts.visibility, "private"),
  ];
  var cursorFilter = feedScoreCursorSql(liveScore, posts.id, input.scoreCursor);
  if (cursorFilter) filters.push(cursorFilter);

  return db
    .select({
      cursorScore: liveScore,
      cursorId: posts.id,
      cursorCreatedAt: posts.createdAt,
      cursorRetentionCreatedAt: sql<Date | null>`null`,
      id: posts.id,
      type: posts.type,
      headline: posts.headline,
      body: posts.body,
      visibility: posts.visibility,
      filmId: posts.filmId,
      filmTmdbId: films.tmdbId,
      filmTitle: films.title,
      filmYear: films.year,
      filmPosterUrl: films.posterUrl,
      filmGenres: films.genres,
      filmRating: posts.filmRating,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
      linkPreview: posts.linkPreview,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      editedAt: posts.editedAt,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      role: profiles.role,
      roleContext: profiles.roleContext,
      profileHeadline: profiles.headline,
      profileHeadlineContext: profiles.headlineContext,
      filmsLoggedCount: profiles.filmsLoggedCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
      bookmarkCount: posts.bookmarkCount,
      isDeleted: posts.isDeleted,
      moderationStatus: posts.moderationStatus,
      isLiked: sql<boolean>`false`,
      isReposted: sql<boolean>`false`,
      isBookmarked: sql<boolean>`false`,
    })
    .from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .leftJoin(films, eq(films.id, posts.filmId))
    .where(and(...filters))
    .orderBy(desc(liveScore), desc(posts.id))
    .limit(input.limit);
}

async function highFollowerAuthorRowsFromCache(input: {
  authorUserId: string;
  rankingAsOf: Date;
  scoreCursor: FeedScoreCursor | null;
  requestLimit: number;
  cachePostLimit: number;
  ttlSeconds: number;
  viewerUserId: string;
  viewerIsStaff: boolean;
}): Promise<HomeFeedRow[]> {
  var cached = await getHighFollowerAuthorFeedCache(input.authorUserId);
  var cachedRows = cached?.items.filter(isCachedHighFollowerAuthorRow) ?? null;

  if (!cachedRows) {
    var dbRows = await selectHighFollowerAuthorRowsFromDb({
      authorUserId: input.authorUserId,
      rankingAsOf: input.rankingAsOf,
      scoreCursor: null,
      limit: input.cachePostLimit,
    });
    cachedRows = dbRows.map(cachedHighFollowerAuthorRowFromHomeRow);
    await setHighFollowerAuthorFeedCache(
      input.authorUserId,
      {
        items: cachedRows,
        cachedAt: new Date().toISOString(),
        rowLimit: input.cachePostLimit,
      },
      input.ttlSeconds
    );
  }

  var moderationFilteredRows = await filterModeratedPostRows({
    rows: cachedRows,
    viewerUserId: input.viewerUserId,
    viewerIsStaff: input.viewerIsStaff,
  });
  if (!moderationFilteredRows) {
    return selectHighFollowerAuthorRowsFromDb({
      authorUserId: input.authorUserId,
      rankingAsOf: input.rankingAsOf,
      scoreCursor: input.scoreCursor,
      limit: input.requestLimit,
    });
  }
  cachedRows = moderationFilteredRows;

  var rankedRows = rankHighFollowerAuthorCacheRows({
    rows: cachedRows,
    rankingAsOf: input.rankingAsOf,
    scoreCursor: input.scoreCursor,
    limit: input.requestLimit,
  });

  if (
    input.scoreCursor &&
    rankedRows.length < input.requestLimit &&
    cachedRows.length >= input.cachePostLimit
  ) {
    return selectHighFollowerAuthorRowsFromDb({
      authorUserId: input.authorUserId,
      rankingAsOf: input.rankingAsOf,
      scoreCursor: input.scoreCursor,
      limit: input.requestLimit,
    });
  }

  return rankedRows;
}

async function highFollowerLiveRowsFromAuthorCache(input: {
  viewerUserId: string;
  viewerIsStaff: boolean;
  authorIds: string[];
  scoreCursor: FeedScoreCursor | null;
  rankingAsOf: Date;
  limit: number;
}): Promise<HomeFeedRow[]> {
  if (input.viewerIsStaff) {
    return selectLiveHomeFeedRows({
      viewerUserId: input.viewerUserId,
      viewerIsStaff: true,
      authorIds: input.authorIds,
      scoreCursor: input.scoreCursor,
      rankingAsOf: input.rankingAsOf,
      limit: input.limit,
    });
  }
  var visibleAuthorIds = await visibleHighFollowerAuthorIds(
    input.viewerUserId,
    input.viewerIsStaff,
    input.authorIds
  );
  var cachePostLimit = feedHighFollowerCachePostLimit();
  var ttlSeconds = feedHighFollowerCacheTtlSeconds();
  var pages = await Promise.all(
    visibleAuthorIds.map(function (authorUserId) {
      return highFollowerAuthorRowsFromCache({
        authorUserId,
        rankingAsOf: input.rankingAsOf,
        scoreCursor: input.scoreCursor,
        requestLimit: input.limit,
        cachePostLimit,
        ttlSeconds,
        viewerUserId: input.viewerUserId,
        viewerIsStaff: input.viewerIsStaff,
      });
    })
  );

  return pages.flat().sort(compareHomeFeedRows).slice(0, input.limit);
}

async function applyViewerInteractionFlags<T extends HomeFeedRow>(
  rows: T[],
  viewerUserId: string
): Promise<T[]> {
  if (rows.length === 0) return rows;
  var db = getDb();
  var postIds = Array.from(new Set(rows.map(function (row) {
    return row.id;
  })));
  var [likedRows, repostedRows, bookmarkedRows] = await Promise.all([
    db
      .select({ postId: postLikes.postId })
      .from(postLikes)
      .where(and(eq(postLikes.userId, viewerUserId), inArray(postLikes.postId, postIds))),
    db
      .select({ postId: postReposts.postId })
      .from(postReposts)
      .where(and(eq(postReposts.userId, viewerUserId), inArray(postReposts.postId, postIds))),
    db
      .select({ postId: postBookmarks.postId, folderId: postBookmarks.folderId })
      .from(postBookmarks)
      .where(and(eq(postBookmarks.userId, viewerUserId), inArray(postBookmarks.postId, postIds))),
  ]);

  var liked = new Set(likedRows.map(function (row) { return row.postId; }));
  var reposted = new Set(repostedRows.map(function (row) { return row.postId; }));
  var bookmarked = new Set(bookmarkedRows.map(function (row) { return row.postId; }));
  var bookmarkFoldersByPost = new Map<string, string | null>();
  for (var i = 0; i < bookmarkedRows.length; i += 1) {
    var bookmarkRow = bookmarkedRows[i];
    bookmarkFoldersByPost.set(bookmarkRow.postId, bookmarkRow.folderId ?? null);
  }

  return rows.map(function (row) {
    return {
      ...row,
      isLiked: liked.has(row.id),
      isReposted: reposted.has(row.id),
      isBookmarked: bookmarked.has(row.id),
      bookmarkFolderId: bookmarked.has(row.id)
        ? (bookmarkFoldersByPost.get(row.id) ?? null)
        : null,
    };
  });
}

async function highFollowerFolloweeIds(viewerUserId: string, threshold: number): Promise<string[]> {
  var db = getDb();
  var viewerFollows = alias(follows, "viewer_follows");

  var rows = await db
    .select({ followingId: viewerFollows.followingId })
    .from(viewerFollows)
    .innerJoin(profiles, eq(profiles.userId, viewerFollows.followingId))
    .where(
      and(
        eq(viewerFollows.followerId, viewerUserId),
        eq(viewerFollows.status, "accepted"),
        eq(profiles.moderationStatus, "visible"),
        gte(profiles.followerCount, threshold)
      )
    );

  return rows.map(function (row) {
    return row.followingId;
  });
}

async function getPostById(
  postId: string,
  viewerUserId: string | null,
  viewerIsStaff = false
) {
  var db = getDb();
  var rows = await db
    .select({
      id: posts.id,
      type: posts.type,
      headline: posts.headline,
      body: posts.body,
      visibility: posts.visibility,
      filmId: posts.filmId,
      filmTmdbId: films.tmdbId,
      filmTitle: films.title,
      filmYear: films.year,
      filmPosterUrl: films.posterUrl,
      filmGenres: films.genres,
      filmRating: posts.filmRating,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
      linkPreview: posts.linkPreview,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      editedAt: posts.editedAt,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      role: profiles.role,
      roleContext: profiles.roleContext,
      profileHeadline: profiles.headline,
      profileHeadlineContext: profiles.headlineContext,
      filmsLoggedCount: profiles.filmsLoggedCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
      bookmarkCount: posts.bookmarkCount,
      isDeleted: posts.isDeleted,
      moderationStatus: posts.moderationStatus,
      isLiked: viewerUserId
        ? sql<boolean>`exists(select 1 from ${postLikes} where ${postLikes.postId} = ${posts.id} and ${postLikes.userId} = ${viewerUserId})`
        : sql<boolean>`false`,
      isReposted: viewerUserId
        ? sql<boolean>`exists(select 1 from ${postReposts} where ${postReposts.postId} = ${posts.id} and ${postReposts.userId} = ${viewerUserId})`
        : sql<boolean>`false`,
      isBookmarked: viewerUserId
        ? sql<boolean>`exists(select 1 from ${postBookmarks} where ${postBookmarks.postId} = ${posts.id} and ${postBookmarks.userId} = ${viewerUserId})`
        : sql<boolean>`false`,
      bookmarkFolderId: viewerUserId
        ? sql<string | null>`(
            select ${postBookmarks.folderId}
            from ${postBookmarks}
            where ${postBookmarks.postId} = ${posts.id}
              and ${postBookmarks.userId} = ${viewerUserId}
            limit 1
          )`
        : sql<string | null>`null`,
    })
    .from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .leftJoin(films, eq(films.id, posts.filmId))
    .where(
      and(
        eq(posts.id, postId),
        eq(posts.isDeleted, false),
        postModerationAccessSql(viewerUserId, viewerIsStaff),
        postVisibilitySql(viewerUserId, viewerIsStaff),
        profileAccessSql(viewerUserId, viewerIsStaff)
      )
    )
    .limit(1);

  if (rows.length === 0) return null;
  var row = rows[0];
  var visibleCounters = await getVisiblePostCounters(postId, {
    likeCount: Number(row.likeCount ?? 0),
    commentCount: Number(row.commentCount ?? 0),
    repostCount: Number(row.repostCount ?? 0),
    bookmarkCount: Number(row.bookmarkCount ?? 0),
  });

  return toPostItem({
    ...row,
    ...visibleCounters,
  }, viewerUserId);
}

async function assertPostOwner(postId: string, userId: string) {
  var db = getDb();
  var rows = await db
    .select({
      id: posts.id,
      userId: posts.userId,
      isDeleted: posts.isDeleted,
      moderationStatus: posts.moderationStatus,
      visibility: posts.visibility,
      body: posts.body,
      headline: posts.headline,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (rows.length === 0) {
    throw notFound("Post not found");
  }

  if (rows[0].userId !== userId) {
    throw forbidden("You can only modify your own posts");
  }

  return rows[0];
}

async function assertReadablePost(
  postId: string,
  viewerUserId: string | null,
  viewerIsStaff = false
) {
  if (viewerUserId) {
    var db = getDb();
    var authorRows = await db
      .select({ userId: posts.userId })
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.isDeleted, false)))
      .limit(1);

    if (authorRows.length === 0) {
      throw notFound("Post not found");
    }

    await assertNoBlockBetween(viewerUserId, authorRows[0].userId);
  }

  var post = await getPostById(postId, viewerUserId, viewerIsStaff);
  if (!post) throw notFound("Post not found");
  return post;
}

async function assertReadablePostForInteraction(postId: string, viewerUserId: string | null) {
  if (!viewerUserId) {
    throw forbidden("Authentication required");
  }

  await assertCanInteractWithPost(viewerUserId, postId);
  var rows = await getDb()
    .select({ authorUserId: posts.userId, moderationStatus: posts.moderationStatus })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!rows[0]) throw notFound("Post not found");
  if (rows[0].moderationStatus !== "visible" && rows[0].authorUserId !== viewerUserId) {
    throw notFound("Post not found");
  }
}

feedRoutes.get("/", async function (c) {
  var parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });

  var db = getDb();
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var viewerIsStaff = isModerationStaffViewer(viewer);
  var rateLimitResponse = await applyRateLimit(c, {
    keyPrefix: "feed:read",
    limit: 120,
    windowSeconds: 60,
    identifier: viewer?.userId ?? identifyByIp(c),
  });
  if (rateLimitResponse) return rateLimitResponse;
  var requestCursor = parsed.cursor ?? null;

  if (viewer) {
    var scoreCursor = decodeFeedScoreCursor(parsed.cursor);
    var rankingAsOf = scoreCursor?.asOf ?? new Date();
    var retentionBoundary = feedItemsRetentionBoundary(new Date(), feedItemsRetentionDays());
    var useColdFeedFallback = shouldUseColdFeedFallback({
      cursor: scoreCursor,
      retentionBoundary,
      rankingAsOf,
    });
    c.header("Cache-Control", "private, no-store");
    var highFollowerAuthorIds = await highFollowerFolloweeIds(
      viewer.userId,
      feedHighFollowerThreshold()
    );
    var useHomeFeedCache = !useColdFeedFallback;
    var cacheKey = homeFeedCacheKey({
      viewerId: viewer.userId,
      cursor: requestCursor,
      limit: parsed.limit,
    });
    if (useHomeFeedCache) {
      var cached = await getFeedCache(cacheKey);
      if (cached) {
        var filteredCached = await filterModeratedFeedCachePayload({
          payload: cached,
          viewerUserId: viewer.userId,
          viewerIsStaff,
        });
        if (filteredCached) {
          c.header("X-Feed-Cache", "HIT");
          return c.json(filteredCached);
        }
      }
      c.header("X-Feed-Cache", "MISS");
    } else {
      c.header("X-Feed-Cache", "BYPASS retention-cold-path");
    }

    var filters: any[] = [
      eq(feedItems.userId, viewer.userId),
      gte(feedItems.createdAt, retentionBoundary),
      eq(posts.isDeleted, false),
      postModerationAccessSql(viewer.userId, viewerIsStaff),
      postVisibilitySql(viewer.userId, viewerIsStaff),
      profileAccessSql(viewer.userId, viewerIsStaff),
      ...blockFiltersForAuthor(viewer.userId, posts.userId),
      notMutedByViewerSql(viewer.userId, posts.userId),
    ];

    if (highFollowerAuthorIds.length > 0) {
      filters.push(notInArray(posts.userId, highFollowerAuthorIds));
    }

    var materializedScore = sql<number>`coalesce(${feedItems.score}, ${feedScoreSql(rankingAsOf)})`;
    var cursorFilter = feedScoreCursorSql(materializedScore, posts.id, scoreCursor);
    if (cursorFilter) filters.push(cursorFilter);

    var materializedRows = useColdFeedFallback
      ? []
      : await db
        .select({
          cursorScore: materializedScore,
          cursorId: posts.id,
          cursorCreatedAt: posts.createdAt,
          cursorRetentionCreatedAt: feedItems.createdAt,
          id: posts.id,
          type: posts.type,
          headline: posts.headline,
          body: posts.body,
          visibility: posts.visibility,
          filmId: posts.filmId,
          filmTmdbId: films.tmdbId,
          filmTitle: films.title,
          filmYear: films.year,
          filmPosterUrl: films.posterUrl,
          filmGenres: films.genres,
          filmRating: posts.filmRating,
          media: posts.media,
          mediaUrls: posts.mediaUrls,
          linkPreview: posts.linkPreview,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          editedAt: posts.editedAt,
          authorId: profiles.userId,
          username: profiles.username,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
          avatarVariants: profiles.avatarVariants,
          role: profiles.role,
          roleContext: profiles.roleContext,
          profileHeadline: profiles.headline,
          profileHeadlineContext: profiles.headlineContext,
          filmsLoggedCount: profiles.filmsLoggedCount,
          likeCount: posts.likeCount,
          commentCount: posts.commentCount,
          repostCount: posts.repostCount,
          bookmarkCount: posts.bookmarkCount,
          isDeleted: posts.isDeleted,
          moderationStatus: posts.moderationStatus,
          isLiked: sql<boolean>`exists(select 1 from ${postLikes} where ${postLikes.postId} = ${posts.id} and ${postLikes.userId} = ${viewer.userId})`,
          isReposted: sql<boolean>`exists(select 1 from ${postReposts} where ${postReposts.postId} = ${posts.id} and ${postReposts.userId} = ${viewer.userId})`,
          isBookmarked: sql<boolean>`exists(select 1 from ${postBookmarks} where ${postBookmarks.postId} = ${posts.id} and ${postBookmarks.userId} = ${viewer.userId})`,
        })
        .from(feedItems)
        .innerJoin(posts, eq(posts.id, feedItems.postId))
        .innerJoin(profiles, eq(profiles.userId, posts.userId))
        .leftJoin(films, eq(films.id, posts.filmId))
        .where(and(...filters))
        .orderBy(desc(materializedScore), desc(posts.id))
        .limit(parsed.limit + 1);

    var liveRows: HomeFeedRow[] = [];
    if (useColdFeedFallback) {
      liveRows = await selectLiveHomeFeedRows({
        viewerUserId: viewer.userId,
        viewerIsStaff,
        authorIds: null,
        scoreCursor,
        rankingAsOf,
        limit: parsed.limit + 1,
      });
    } else if (highFollowerAuthorIds.length > 0) {
      liveRows = await highFollowerLiveRowsFromAuthorCache({
        viewerUserId: viewer.userId,
        viewerIsStaff,
        authorIds: highFollowerAuthorIds,
        scoreCursor,
        rankingAsOf,
        limit: parsed.limit + 1,
      });
    }

    var merged = mergeHomeFeedRows(
      materializedRows as HomeFeedRow[],
      liveRows,
      parsed.limit + 1
    );
    var visibleRows = merged.rows.slice(0, parsed.limit);
    var visibleRowsWithInteractions = await applyViewerInteractionFlags(visibleRows, viewer.userId);
    var visibleRowsWithCounters = await applyVisiblePostCountersToRows(visibleRowsWithInteractions);
    var visibleRowsWithPreloaded = await hydratePostsForRows(visibleRowsWithCounters, viewer.userId);
    var items = await Promise.all(visibleRowsWithPreloaded.map(function (row) {
      return toPostItem(
        row,
        viewer?.userId ?? null,
        {
          body: row._preloadedBody,
          headline: row._preloadedHeadline,
          poll: row._preloadedPoll,
        }
      );
    }));

    var hasMore = merged.rows.length > parsed.limit || merged.hasMore;
    var tail = visibleRows[visibleRows.length - 1];
    var nextCursor = hasMore && tail
      ? encodeFeedScoreCursor({
          score: tail.cursorScore,
          id: tail.cursorId,
          asOf: rankingAsOf,
          retentionCreatedAt: tail.cursorRetentionCreatedAt,
          legacy: false,
        })
      : null;
    var payload = { items, nextCursor, hasMore };
    if (useHomeFeedCache) {
      await setFeedCache(cacheKey, payload, { viewerId: viewer.userId });
    }
    return c.json(payload);
  }

  c.header("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  var guestCursor = decodeCompositeCursor(parsed.cursor);
  var guestCacheKey = homeFeedCacheKey({
    viewerId: null,
    cursor: requestCursor,
    limit: parsed.limit,
  });
  var guestCached = await getFeedCache(guestCacheKey);
  if (guestCached) {
    var filteredGuestCached = await filterModeratedFeedCachePayload({
      payload: guestCached,
      viewerUserId: null,
      viewerIsStaff: false,
    });
    if (filteredGuestCached) {
      c.header("X-Feed-Cache", "HIT");
      return c.json(filteredGuestCached);
    }
  }
  c.header("X-Feed-Cache", "MISS");

  // Guest (unauthenticated) feed reads directly from posts table ordered by created_at.
  // Authenticated feed reads from feed_items (materialized fan-out).
  // This is intentional — do not unify without implementing public feed_items writes.
  var guestFilters: any[] = [
    eq(posts.isDeleted, false),
    eq(posts.moderationStatus, "visible"),
    eq(posts.visibility, "public"),
    eq(profiles.isPrivate, false),
    eq(profiles.moderationStatus, "visible"),
  ];
  var guestCursorFilter = compositeCursorSql(posts.createdAt, posts.id, guestCursor);
  if (guestCursorFilter) guestFilters.push(guestCursorFilter);

  var guestRows = await db
    .select({
      cursorCreatedAt: posts.createdAt,
      cursorId: posts.id,
      id: posts.id,
      type: posts.type,
      headline: posts.headline,
      body: posts.body,
      visibility: posts.visibility,
      filmId: posts.filmId,
      filmTmdbId: films.tmdbId,
      filmTitle: films.title,
      filmYear: films.year,
      filmPosterUrl: films.posterUrl,
      filmGenres: films.genres,
      filmRating: posts.filmRating,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
      linkPreview: posts.linkPreview,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      editedAt: posts.editedAt,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      role: profiles.role,
      roleContext: profiles.roleContext,
      profileHeadline: profiles.headline,
      profileHeadlineContext: profiles.headlineContext,
      filmsLoggedCount: profiles.filmsLoggedCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
      bookmarkCount: posts.bookmarkCount,
      isDeleted: posts.isDeleted,
      moderationStatus: posts.moderationStatus,
      isLiked: sql<boolean>`false`,
      isReposted: sql<boolean>`false`,
      isBookmarked: sql<boolean>`false`,
    })
    .from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .leftJoin(films, eq(films.id, posts.filmId))
    .where(and(...guestFilters))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(parsed.limit + 1);

  var guestVisibleRows = guestRows.slice(0, parsed.limit);
  var guestVisibleRowsWithCounters = await applyVisiblePostCountersToRows(guestVisibleRows);
  var guestVisibleRowsWithPreloaded = await hydratePostsForRows(guestVisibleRowsWithCounters, null);
  var guestItems = await Promise.all(guestVisibleRowsWithPreloaded.map(function (row) {
    return toPostItem(
      row,
      null,
      {
        body: row._preloadedBody,
        headline: row._preloadedHeadline,
        poll: row._preloadedPoll,
      }
    );
  }));

  var guestHasMore = guestRows.length > parsed.limit;
  var guestTail = guestVisibleRows[guestVisibleRows.length - 1];
  var guestNextCursor = guestHasMore && guestTail
    ? encodeCompositeCursor({ createdAt: guestTail.cursorCreatedAt, id: guestTail.cursorId })
    : null;
  var guestPayload = { items: guestItems, nextCursor: guestNextCursor, hasMore: guestHasMore };
  await setFeedCache(guestCacheKey, guestPayload, { viewerId: null });
  return c.json(guestPayload);
});

feedRoutes.post("/", requireAuth, createPostRateLimit, async function (c) {
  var user = c.get("user");
  var input = parseCreatePostInput(await c.req.json());
  var db = getDb();
  var normalizedMedia: PostMediaItem[] =
    input.media.length > 0
      ? input.media
      : input.mediaUrls.map(function (url) {
          var lower = url.toLowerCase();
          var type: "image" | "video" | "film_embed" | "none" = "image";
          if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.includes("video")) {
            type = "video";
          }
          if (type === "image") {
            return {
              type,
              url,
              variants: {
                thumb: url,
                feed: url,
                full: url,
              },
            };
          }
          return { type, url };
        });
  var normalizedMediaUrls = normalizedMedia
    .filter(function (item) {
      return item.type === "image";
    })
    .map(function (item) {
      return feedMediaUrl(item);
    });

  if (input.poll && normalizedMedia.length > 0) {
    throw badRequest("Poll posts cannot include images, GIFs, or videos");
  }

  if (input.filmId) {
    var filmRows = await db
      .select({ id: films.id })
      .from(films)
      .where(eq(films.id, input.filmId))
      .limit(1);

    if (filmRows.length === 0) {
      throw notFound("Film not found");
    }
  }

  var shouldFanoutToFeed = input.postToFeed && input.visibility !== "private";
  var createdPost = await getWriteDb().transaction(async function (tx) {
    var insertedRows = await tx
      .insert(posts)
      .values({
        userId: user.userId,
        type: input.type,
        headline: input.headline ?? null,
        body: input.body,
        filmId: input.filmId ?? null,
        filmRating: input.filmRating,
        visibility: input.visibility,
        media: normalizedMedia,
        mediaUrls: normalizedMediaUrls,
        linkPreview: input.linkPreview,
      })
      .returning({ id: posts.id, createdAt: posts.createdAt });

    var postId = insertedRows[0]?.id;
    if (!postId) {
      throw badRequest("Unable to create post");
    }
    var postCreatedAt = insertedRows[0].createdAt;

    if (input.poll) {
      var endsAt = new Date(Date.now() + input.poll.durationMinutes * 60 * 1000);
      var pollRows = await tx
        .insert(postPolls)
        .values({
          postId,
          type: input.poll.type,
          resultsVisibility: input.poll.resultsVisibility,
          endsAt,
        })
        .returning({ id: postPolls.id });
      var pollId = pollRows[0]?.id;
      if (!pollId) {
        throw badRequest("Unable to create poll");
      }

      await tx.insert(pollOptions).values(
        input.poll.options.map(function (option, index) {
          return {
            pollId,
            label: option.label,
            imageUrl: option.imageUrl,
            position: index + 1,
          };
        })
      );
    }

    if (shouldFanoutToFeed) {
      await tx
        .insert(feedItems)
        .values({
          userId: user.userId,
          postId,
          score: computeFeedScore({
            createdAt: postCreatedAt,
            likeCount: 0,
            commentCount: 0,
            repostCount: 0,
          }),
        })
        .onConflictDoNothing({
          target: [feedItems.userId, feedItems.postId],
        });
    }

    await recordCounterDeltas(tx, {
      targetTable: "profiles",
      targetId: user.userId,
      counterName: "postCount",
      delta: 1,
    });

    return { postId, postCreatedAt };
  });
  var postId = createdPost.postId;
  wakeCounterOutbox();

  await createMentionNotifications({
    body: input.body,
    actorId: user.userId,
    entityType: "post",
    entityId: postId,
  });

  if (shouldFanoutToFeed) {
    void enqueueFeedFanoutJob({
      postId,
      authorUserId: user.userId,
    }).catch(function (error) {
      console.warn("[feed.fanout] enqueue failed", {
        postId,
        authorUserId: user.userId,
        error,
      });
    });
  }

  var hasImageMedia = normalizedMedia.some(function (item) {
    return item.type === "image";
  });
  if (hasImageMedia) {
    try {
      await enqueueMediaProcessJob({ postId });
    } catch (error) {
      console.error("[media-process] enqueue failed", {
        postId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (shouldFanoutToFeed) {
    await invalidateFeedAfterAuthorMutation({
      authorUserId: user.userId,
      includeGuest: input.visibility === "public",
    });
  } else {
    await invalidateAuthorProfileFeedCaches([user.userId]);
    await invalidateProfileStatsCaches([user.userId]);
  }

  var created = await getPostById(postId, user.userId);
  if (!created) {
    throw notFound("Created post not found");
  }

  return c.json(created, 201);
});

feedRoutes.get("/posts/:postId", async function (c) {
  var postId = c.req.param("postId");
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var post = await assertReadablePost(
    postId,
    viewer?.userId ?? null,
    isModerationStaffViewer(viewer)
  );
  c.header("Cache-Control", "no-store");
  return c.json(post);
});

feedRoutes.get("/profiles/:username/posts", async function (c) {
  var parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });
  var cursor = decodeCompositeCursor(parsed.cursor);
  var username = c.req.param("username").toLowerCase().trim();
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var viewerUserId = viewer?.userId ?? null;
  var viewerIsStaff = isModerationStaffViewer(viewer);
  var db = getDb();

  var profileRows = await db
    .select({
      userId: profiles.userId,
      isPrivate: profiles.isPrivate,
      moderationStatus: profiles.moderationStatus,
    })
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1);

  if (profileRows.length === 0) {
    throw notFound("Profile not found");
  }

  var profileRow = profileRows[0];

  if (
    profileRow.moderationStatus !== "visible" &&
    profileRow.userId !== viewerUserId &&
    !viewerIsStaff
  ) {
    throw notFound("Profile not found");
  }

  if (viewerUserId && viewerUserId !== profileRow.userId) {
    await assertNoBlockBetween(viewerUserId, profileRow.userId);
  }

  if (profileRow.isPrivate && viewerUserId !== profileRow.userId) {
    if (!viewerUserId) {
      throw new ApiError(403, "PRIVATE_ACCOUNT", "This account is private");
    }

    var followRows = await db
      .select({ status: follows.status })
      .from(follows)
      .where(and(eq(follows.followerId, viewerUserId), eq(follows.followingId, profileRow.userId)))
      .limit(1);

    if (followRows[0]?.status !== "accepted") {
      throw new ApiError(403, "PRIVATE_ACCOUNT", "This account is private");
    }
  }

  if (viewerUserId) {
    c.header("Cache-Control", "private, no-store");
  } else {
    c.header("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  }

  var cacheKey = profileFeedCacheKey({
    username,
    viewerId: viewerUserId,
    cursor: parsed.cursor ?? null,
    limit: parsed.limit,
  });
  var cached = await getFeedCache(cacheKey);
  if (cached) {
    var filteredCached = await filterModeratedFeedCachePayload({
      payload: cached,
      viewerUserId,
      viewerIsStaff,
    });
    if (filteredCached && !viewerUserId) {
      var cachedEtag = weakEtag(filteredCached, `profile-posts-${username}`);
      c.header("ETag", cachedEtag);
      if (c.req.header("If-None-Match") === cachedEtag) {
        return new Response(null, { status: 304 });
      }
    }
    if (filteredCached) {
      c.header("X-Feed-Cache", "HIT");
      return c.json(filteredCached);
    }
  }
  c.header("X-Feed-Cache", "MISS");

  var filters: any[] = [
    eq(profiles.username, username),
    eq(posts.isDeleted, false),
    postModerationAccessSql(viewerUserId, viewerIsStaff),
    postVisibilitySql(viewerUserId, viewerIsStaff),
    profileAccessSql(viewerUserId, viewerIsStaff),
  ];
  var cursorFilter = compositeCursorSql(posts.createdAt, posts.id, cursor);
  if (cursorFilter) filters.push(cursorFilter);

  var rows = await db
    .select({
      cursorCreatedAt: posts.createdAt,
      cursorId: posts.id,
      id: posts.id,
      type: posts.type,
      headline: posts.headline,
      body: posts.body,
      visibility: posts.visibility,
      filmId: posts.filmId,
      filmTmdbId: films.tmdbId,
      filmTitle: films.title,
      filmYear: films.year,
      filmPosterUrl: films.posterUrl,
      filmGenres: films.genres,
      filmRating: posts.filmRating,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
      linkPreview: posts.linkPreview,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      editedAt: posts.editedAt,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      role: profiles.role,
      roleContext: profiles.roleContext,
      profileHeadline: profiles.headline,
      profileHeadlineContext: profiles.headlineContext,
      filmsLoggedCount: profiles.filmsLoggedCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
      bookmarkCount: posts.bookmarkCount,
      isDeleted: posts.isDeleted,
      moderationStatus: posts.moderationStatus,
      isLiked: viewerUserId
        ? sql<boolean>`exists(select 1 from ${postLikes} where ${postLikes.postId} = ${posts.id} and ${postLikes.userId} = ${viewerUserId})`
        : sql<boolean>`false`,
      isReposted: viewerUserId
        ? sql<boolean>`exists(select 1 from ${postReposts} where ${postReposts.postId} = ${posts.id} and ${postReposts.userId} = ${viewerUserId})`
        : sql<boolean>`false`,
      isBookmarked: viewerUserId
        ? sql<boolean>`exists(select 1 from ${postBookmarks} where ${postBookmarks.postId} = ${posts.id} and ${postBookmarks.userId} = ${viewerUserId})`
        : sql<boolean>`false`,
    })
    .from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .leftJoin(films, eq(films.id, posts.filmId))
    .where(and(...filters))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(parsed.limit + 1);

  var visibleRows = rows.slice(0, parsed.limit);
  var visibleRowsWithCounters = await applyVisiblePostCountersToRows(visibleRows);
  var visibleRowsWithPreloaded = await hydratePostsForRows(visibleRowsWithCounters, viewerUserId);
  var items = await Promise.all(visibleRowsWithPreloaded.map(function (row) {
    return toPostItem(
      row,
      viewerUserId,
      {
        body: row._preloadedBody,
        headline: row._preloadedHeadline,
        poll: row._preloadedPoll,
      }
    );
  }));
  var hasMore = rows.length > parsed.limit;
  var tail = visibleRows[visibleRows.length - 1];
  var nextCursor = hasMore && tail
    ? encodeCompositeCursor({ createdAt: tail.cursorCreatedAt, id: tail.cursorId })
    : null;
  var payload = { items, nextCursor, hasMore };
  if (!viewerUserId) {
    var etag = weakEtag(payload, `profile-posts-${username}`);
    c.header("ETag", etag);
    if (c.req.header("If-None-Match") === etag) {
      return new Response(null, { status: 304 });
    }
  }
  await setFeedCache(cacheKey, payload, {
    viewerId: viewerUserId,
    authorUserId: profileRow.userId,
  });
  return c.json(payload);
});

feedRoutes.get("/bookmarks", requireAuth, async function (c) {
  var user = c.get("user");
  var viewerIsStaff = isModerationStaffViewer(user);
  var parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });
  var folderIdParam = c.req.query("folderId");
  var folderId: string | null | undefined;
  if (folderIdParam === "none") {
    folderId = null;
  } else if (folderIdParam) {
    folderId = bookmarkFolderAssignSchema.parse({ folderId: folderIdParam }).folderId;
  }
  var cursor = decodeCompositeCursor(parsed.cursor);
  var db = getDb();

  if (folderId) {
    var ownedFolder = await db
      .select({ id: bookmarkFolders.id })
      .from(bookmarkFolders)
      .where(and(eq(bookmarkFolders.id, folderId), eq(bookmarkFolders.userId, user.userId)))
      .limit(1);
    if (ownedFolder.length === 0) {
      throw notFound("Folder not found");
    }
  }

  var filters: any[] = [
    eq(postBookmarks.userId, user.userId),
    eq(posts.isDeleted, false),
    postModerationAccessSql(user.userId, viewerIsStaff),
    postVisibilitySql(user.userId, viewerIsStaff),
    profileAccessSql(user.userId, viewerIsStaff),
    ...blockFiltersForAuthor(user.userId, posts.userId),
    notMutedByViewerSql(user.userId, posts.userId),
  ];
  if (folderId === null) {
    filters.push(sql`${postBookmarks.folderId} is null`);
  } else if (folderId) {
    filters.push(eq(postBookmarks.folderId, folderId));
  }
  var cursorFilter = compositeCursorSql(postBookmarks.createdAt, postBookmarks.postId, cursor);
  if (cursorFilter) filters.push(cursorFilter);

  var rows = await db
    .select({
      cursorCreatedAt: postBookmarks.createdAt,
      cursorId: postBookmarks.postId,
      id: posts.id,
      type: posts.type,
      headline: posts.headline,
      body: posts.body,
      visibility: posts.visibility,
      filmId: posts.filmId,
      filmTmdbId: films.tmdbId,
      filmTitle: films.title,
      filmYear: films.year,
      filmPosterUrl: films.posterUrl,
      filmGenres: films.genres,
      filmRating: posts.filmRating,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
      linkPreview: posts.linkPreview,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      editedAt: posts.editedAt,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      role: profiles.role,
      roleContext: profiles.roleContext,
      profileHeadline: profiles.headline,
      profileHeadlineContext: profiles.headlineContext,
      filmsLoggedCount: profiles.filmsLoggedCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
      bookmarkCount: posts.bookmarkCount,
      isDeleted: posts.isDeleted,
      moderationStatus: posts.moderationStatus,
      isLiked: sql<boolean>`exists(select 1 from ${postLikes} where ${postLikes.postId} = ${posts.id} and ${postLikes.userId} = ${user.userId})`,
      isReposted: sql<boolean>`exists(select 1 from ${postReposts} where ${postReposts.postId} = ${posts.id} and ${postReposts.userId} = ${user.userId})`,
      isBookmarked: sql<boolean>`true`,
      bookmarkFolderId: postBookmarks.folderId,
    })
    .from(postBookmarks)
    .innerJoin(posts, eq(posts.id, postBookmarks.postId))
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .leftJoin(films, eq(films.id, posts.filmId))
    .where(and(...filters))
    .orderBy(desc(postBookmarks.createdAt), desc(postBookmarks.postId))
    .limit(parsed.limit + 1);

  var visibleRows = rows.slice(0, parsed.limit);
  var visibleRowsWithCounters = await applyVisiblePostCountersToRows(visibleRows);
  var visibleRowsWithPreloaded = await hydratePostsForRows(visibleRowsWithCounters, user.userId);
  var items = await Promise.all(visibleRowsWithPreloaded.map(function (row) {
    return toPostItem(
      row,
      user.userId,
      {
        body: row._preloadedBody,
        headline: row._preloadedHeadline,
        poll: row._preloadedPoll,
      }
    );
  }));
  var hasMore = rows.length > parsed.limit;
  var tail = visibleRows[visibleRows.length - 1];
  var nextCursor = hasMore && tail
    ? encodeCompositeCursor({ createdAt: tail.cursorCreatedAt, id: tail.cursorId })
    : null;

  return c.json({ items, nextCursor, hasMore });
});

feedRoutes.delete("/posts/:postId", requireAuth, postEditRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  var current = await assertPostOwner(postId, user.userId);

  var deleted = await getWriteDb().transaction(async function (tx) {
    var deletedRows = await tx
      .update(posts)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(and(
        eq(posts.id, postId),
        eq(posts.userId, user.userId),
        eq(posts.isDeleted, false)
      ))
      .returning({ id: posts.id });

    if (deletedRows.length > 0) {
      await recordCounterDeltas(tx, {
        targetTable: "profiles" as const,
        targetId: user.userId,
        counterName: "postCount",
        delta: -1,
      });
    }
    return deletedRows.length > 0;
  });
  if (deleted) wakeCounterOutbox();

  await invalidateFeedAfterAuthorMutation({
    authorUserId: user.userId,
    includeGuest: current.visibility === "public",
  });

  return c.json({ ok: true });
});

feedRoutes.patch("/posts/:postId", requireAuth, postEditRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  var input = parsePatchPostInput(await c.req.json());
  var db = getDb();

  var current = await assertPostOwner(postId, user.userId);
  if (current.isDeleted) {
    throw badRequest("Cannot edit deleted post");
  }

  var pollRows = await db
    .select({ id: postPolls.id })
    .from(postPolls)
    .where(eq(postPolls.postId, postId))
    .limit(1);
  if (pollRows.length > 0) {
    throw badRequest("Poll posts cannot be edited");
  }

  var headline = input.headline !== undefined ? input.headline : current.headline;
  var body = input.body !== undefined ? input.body : current.body;
  var filmIdToPersist = input.filmId;

  if (filmIdToPersist !== undefined && filmIdToPersist !== null) {
    var filmRows = await db
      .select({ id: films.id })
      .from(films)
      .where(eq(films.id, filmIdToPersist))
      .limit(1);

    if (filmRows.length === 0) {
      throw notFound("Film not found");
    }
  }

  await db.insert(postEdits).values({
    postId,
    headline: current.headline,
    body: current.body,
    editedAt: new Date(),
  });

  await db
    .update(posts)
    .set({
      headline,
      body,
      ...(filmIdToPersist !== undefined ? { filmId: filmIdToPersist } : {}),
      editedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId));

  await invalidateFeedAfterAuthorMutation({
    authorUserId: user.userId,
    includeGuest: current.visibility === "public",
  });

  var updated = await getPostById(postId, user.userId);
  if (!updated) throw notFound("Post not found");

  return c.json(updated);
});

feedRoutes.post("/posts/:postId/poll/votes", requireAuth, postInteractionRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  await assertReadablePostForInteraction(postId, user.userId);

  var raw = await c.req.json();
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { optionIds?: unknown }).optionIds)) {
    throw badRequest("optionIds is required");
  }

  var optionIds = (raw as { optionIds: unknown[] }).optionIds.filter(function (value): value is string {
    return typeof value === "string" && value.length > 0;
  });
  var uniqueOptionIds = Array.from(new Set(optionIds));
  if (uniqueOptionIds.length === 0 || uniqueOptionIds.length > 10) {
    throw badRequest("Select 1-10 poll options");
  }

  var db = getDb();
  var postOwnerRows = await db
    .select({ userId: posts.userId, visibility: posts.visibility })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isDeleted, false)))
    .limit(1);
  if (postOwnerRows.length === 0) {
    throw notFound("Post not found");
  }

  var pollRows = await db
    .select({
      id: postPolls.id,
      type: postPolls.type,
      endsAt: postPolls.endsAt,
    })
    .from(postPolls)
    .where(eq(postPolls.postId, postId))
    .limit(1);

  var poll = pollRows[0];
  if (!poll) {
    throw notFound("Poll not found");
  }
  if (poll.endsAt.getTime() <= Date.now()) {
    throw badRequest("Poll has ended");
  }
  if (poll.type === "image" && uniqueOptionIds.length !== 1) {
    throw badRequest("Image polls accept one option");
  }

  var optionRows = await db
    .select({ id: pollOptions.id })
    .from(pollOptions)
    .where(and(eq(pollOptions.pollId, poll.id), inArray(pollOptions.id, uniqueOptionIds)));
  if (optionRows.length !== uniqueOptionIds.length) {
    throw badRequest("Invalid poll option");
  }

  var counterDeltas: CounterIncrementJobPayload[] = [];
  if (poll.type === "image") {
    counterDeltas.push({
      targetTable: "poll_options",
      targetId: uniqueOptionIds[0],
      counterName: "voteCount",
      delta: 1,
    });
  } else {
    for (var index = 0; index < uniqueOptionIds.length; index += 1) {
      counterDeltas.push({
        targetTable: "poll_options",
        targetId: uniqueOptionIds[index],
        counterName: "voteCount",
        delta: uniqueOptionIds.length - index,
      });
    }
  }
  counterDeltas.push({
    targetTable: "post_polls",
    targetId: poll.id,
    counterName: "totalVotes",
    delta: 1,
  });

  var inserted = await getWriteDb().transaction(async function (tx) {
    var rows = await tx
      .insert(pollVotes)
      .values({
        postId,
        pollId: poll.id,
        userId: user.userId,
        optionId: poll.type === "image" ? uniqueOptionIds[0] : null,
        rankingOptionIds: poll.type === "ranking" ? uniqueOptionIds : [],
      })
      .onConflictDoNothing()
      .returning({ id: pollVotes.id });

    if (rows.length > 0) {
      await recordCounterDeltas(tx, counterDeltas);
    }

    return rows;
  });

  if (inserted.length === 0) {
    throw conflict("You already voted in this poll");
  }
  wakeCounterOutbox();

  await invalidatePostInteractionCaches({
    actorUserId: user.userId,
    postOwnerId: postOwnerRows[0].userId,
    isPostPublic: postOwnerRows[0].visibility === "public",
  });

  var updated = await getPostById(postId, user.userId);
  if (!updated) throw notFound("Post not found");
  return c.json(updated);
});

feedRoutes.post("/posts/:postId/likes", requireAuth, postInteractionRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  try {
    await assertReadablePostForInteraction(postId, user.userId);

    var db = getDb();
    var postOwnerRows = await db
      .select({ userId: posts.userId, visibility: posts.visibility })
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.isDeleted, false)))
      .limit(1);

    if (postOwnerRows.length === 0) {
      throw notFound("Post not found");
    }

    var inserted = await getWriteDb().transaction(async function (tx) {
      var rows = await tx
        .insert(postLikes)
        .values({ postId: postId, userId: user.userId })
        .onConflictDoNothing()
        .returning({ postId: postLikes.postId });

      if (rows.length > 0) {
        await recordCounterDeltas(tx, {
          targetTable: "posts",
          targetId: postId,
          counterName: "likeCount",
          delta: 1,
        });
      }

      return rows;
    });

    var currentPostRows = await db
      .select({
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        repostCount: posts.repostCount,
        bookmarkCount: posts.bookmarkCount,
      })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);
    var visibleCounters = await getVisiblePostCounters(postId, {
      likeCount: Number(currentPostRows[0]?.likeCount ?? 0),
      commentCount: Number(currentPostRows[0]?.commentCount ?? 0),
      repostCount: Number(currentPostRows[0]?.repostCount ?? 0),
      bookmarkCount: Number(currentPostRows[0]?.bookmarkCount ?? 0),
    });

    if (inserted.length > 0) {
      wakeCounterOutbox();

      try {
        await createNotification(
          {
            recipientId: postOwnerRows[0].userId,
            actorId: user.userId,
            type: "like",
            entityType: "post",
            entityId: postId,
          },
          { delayMs: 10_000 }
        );
      } catch (error) {
        console.warn("[notifications] post like notification failed", {
          postId,
          actorUserId: user.userId,
          error,
        });
      }
    }

    try {
      await invalidatePostInteractionCaches({
        actorUserId: user.userId,
        postOwnerId: postOwnerRows[0].userId,
        isPostPublic: postOwnerRows[0].visibility === "public",
      });
    } catch (error) {
      console.warn("[feed-cache] post like cache invalidation failed", {
        postId,
        actorUserId: user.userId,
        error,
      });
    }

    return c.json({
      likeCount: visibleCounters.likeCount,
      isLiked: true,
    });
  } catch (err) {
    throw toActionError(err);
  }
});

feedRoutes.delete("/posts/:postId/likes", requireAuth, postInteractionRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  await assertReadablePostForInteraction(postId, user.userId);

  var db = getDb();
  var postOwnerRows = await db
    .select({ userId: posts.userId, visibility: posts.visibility })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isDeleted, false)))
    .limit(1);
  if (postOwnerRows.length === 0) {
    throw notFound("Post not found");
  }

  var deleted = await getWriteDb().transaction(async function (tx) {
    var rows = await tx
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, user.userId)))
      .returning({ postId: postLikes.postId });

    if (rows.length > 0) {
      await recordCounterDeltas(tx, {
        targetTable: "posts",
        targetId: postId,
        counterName: "likeCount",
        delta: -1,
      });
    }

    return rows;
  });

  var currentPostRows = await db
    .select({
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
      bookmarkCount: posts.bookmarkCount,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  var visibleCounters = await getVisiblePostCounters(postId, {
    likeCount: Number(currentPostRows[0]?.likeCount ?? 0),
    commentCount: Number(currentPostRows[0]?.commentCount ?? 0),
    repostCount: Number(currentPostRows[0]?.repostCount ?? 0),
    bookmarkCount: Number(currentPostRows[0]?.bookmarkCount ?? 0),
  });

  if (deleted.length > 0) {
    wakeCounterOutbox();

    try {
      var existingNotificationRows: Array<{
        id: string;
        actorId: string | null;
        bundleCount: number;
        actorIds?: string[] | null;
      }> = [];

      try {
        existingNotificationRows = await db
          .select({
            id: notifications.id,
            actorId: notifications.actorId,
            bundleCount: notifications.bundleCount,
            actorIds: notifications.actorIds,
          })
          .from(notifications)
          .where(
            and(
              eq(notifications.recipientId, postOwnerRows[0].userId),
              eq(notifications.actorId, user.userId),
              eq(notifications.type, "like"),
              eq(notifications.entityType, "post"),
              eq(notifications.entityId, postId),
              eq(notifications.isRead, false)
            )
          )
          .limit(1);
      } catch (error) {
        if (!isMissingActorIdsColumnError(error)) {
          throw error;
        }

        existingNotificationRows = await db
          .select({
            id: notifications.id,
            actorId: notifications.actorId,
            bundleCount: notifications.bundleCount,
          })
          .from(notifications)
          .where(
            and(
              eq(notifications.recipientId, postOwnerRows[0].userId),
              eq(notifications.actorId, user.userId),
              eq(notifications.type, "like"),
              eq(notifications.entityType, "post"),
              eq(notifications.entityId, postId),
              eq(notifications.isRead, false)
            )
          )
          .limit(1);
      }

      if (existingNotificationRows.length > 0) {
        var existingNotification = existingNotificationRows[0];
        var nextActorIds = normalizeActorIds(existingNotification.actorIds).filter(function (id) {
          return id !== user.userId;
        });

        if ((existingNotification.bundleCount ?? 0) <= 1) {
          await removeNotificationPublishJob(existingNotification.id);
          await db.delete(notifications).where(eq(notifications.id, existingNotification.id));
        } else {
          var updateValues: {
            bundleCount: number;
            actorId: string | null;
            actorIds?: string[];
          } = {
            bundleCount: existingNotification.bundleCount - 1,
            actorId: nextActorIds[0] ?? existingNotification.actorId,
          };

          if (existingNotification.actorIds !== undefined) {
            updateValues.actorIds = nextActorIds;
          }

          await db
            .update(notifications)
            .set(updateValues)
            .where(eq(notifications.id, existingNotification.id));
        }
      }
    } catch (error) {
      console.warn("[notifications] post unlike notification cleanup failed", {
        postId,
        actorUserId: user.userId,
        error,
      });
    }
  }

  try {
    await invalidatePostInteractionCaches({
      actorUserId: user.userId,
      postOwnerId: postOwnerRows[0].userId,
      isPostPublic: postOwnerRows[0].visibility === "public",
    });
  } catch (error) {
    console.warn("[feed-cache] post unlike cache invalidation failed", {
      postId,
      actorUserId: user.userId,
      error,
    });
  }

  return c.json({
    likeCount: visibleCounters.likeCount,
    isLiked: false,
  });
});

feedRoutes.post("/posts/:postId/reposts", requireAuth, postInteractionRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  await assertReadablePostForInteraction(postId, user.userId);
  var db = getDb();

  var sourceRows = await db
    .select({
      id: posts.id,
      userId: posts.userId,
      type: posts.type,
      headline: posts.headline,
      body: posts.body,
      visibility: posts.visibility,
      filmId: posts.filmId,
      filmRating: posts.filmRating,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
      linkPreview: posts.linkPreview,
    })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isDeleted, false)))
    .limit(1);

  if (sourceRows.length === 0) {
    throw notFound("Post not found");
  }

  var sourcePost = sourceRows[0];
  var repostCreate = await getWriteDb().transaction(async function (tx) {
    var inserted = await tx
      .insert(postReposts)
      .values({ postId: postId, userId: user.userId })
      .onConflictDoNothing()
      .returning({ postId: postReposts.postId });

    if (inserted.length === 0) {
      return { created: false, repostPostId: null as string | null };
    }

    var repostInsertRows = await tx
      .insert(posts)
      .values({
        userId: user.userId,
        type: sourcePost.type,
        headline: sourcePost.headline,
        body: sourcePost.body,
        filmId: sourcePost.filmId,
        filmRating: sourcePost.filmRating,
        visibility: "public",
        media: sourcePost.media,
        mediaUrls: sourcePost.mediaUrls ?? [],
        linkPreview: sourcePost.linkPreview,
        isRepost: true,
        replyToId: postId,
      })
      .returning({ id: posts.id, createdAt: posts.createdAt });

    var repostPostId = repostInsertRows[0]?.id ?? null;
    if (repostPostId) {
      var repostCreatedAt = repostInsertRows[0].createdAt;
      await tx
        .insert(feedItems)
        .values({
          userId: user.userId,
          postId: repostPostId,
          score: computeFeedScore({
            createdAt: repostCreatedAt,
            likeCount: 0,
            commentCount: 0,
            repostCount: 0,
          }),
        })
        .onConflictDoNothing({
          target: [feedItems.userId, feedItems.postId],
        });
    }

    await recordCounterDeltas(tx, [
      {
        targetTable: "posts",
        targetId: postId,
        counterName: "repostCount",
        delta: 1,
      },
      ...(repostPostId ? [{
        targetTable: "profiles" as const,
        targetId: user.userId,
        counterName: "postCount" as const,
        delta: 1,
      }] : []),
    ]);

    return { created: true, repostPostId };
  });

  if (repostCreate.created) {
    wakeCounterOutbox();

    var repostPostId = repostCreate.repostPostId;
    if (repostPostId) {
      void enqueueFeedFanoutJob({
        postId: repostPostId,
        authorUserId: user.userId,
      }).catch(function (error) {
        console.warn("[feed.fanout] enqueue failed", {
          postId: repostPostId,
          authorUserId: user.userId,
          error,
        });
      });
    }

    await invalidateFeedAfterAuthorMutation({
      authorUserId: user.userId,
      includeGuest: true,
    });
    await invalidatePostInteractionCaches({
      actorUserId: user.userId,
      postOwnerId: sourcePost.userId,
      isPostPublic: sourcePost.visibility === "public",
    });
  }

  return c.json({ ok: true });
});

feedRoutes.delete("/posts/:postId/reposts", requireAuth, postInteractionRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  await assertReadablePostForInteraction(postId, user.userId);
  var db = getDb();
  var postOwnerRows = await db
    .select({ userId: posts.userId, visibility: posts.visibility })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isDeleted, false)))
    .limit(1);
  if (postOwnerRows.length === 0) {
    throw notFound("Post not found");
  }

  var deleted = await getWriteDb().transaction(async function (tx) {
    var deletedRows = await tx
      .delete(postReposts)
      .where(and(eq(postReposts.postId, postId), eq(postReposts.userId, user.userId)))
      .returning({ postId: postReposts.postId });

    if (deletedRows.length > 0) {
      var deletedRepostRows = await tx
        .update(posts)
        .set({
          isDeleted: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(posts.userId, user.userId),
            eq(posts.replyToId, postId),
            eq(posts.isRepost, true),
            eq(posts.isDeleted, false)
          )
        )
        .returning({ id: posts.id });

      await recordCounterDeltas(tx, [
        {
          targetTable: "posts",
          targetId: postId,
          counterName: "repostCount",
          delta: -1,
        },
        ...(deletedRepostRows.length > 0 ? [{
          targetTable: "profiles" as const,
          targetId: user.userId,
          counterName: "postCount" as const,
          delta: -1,
        }] : []),
      ]);
    }

    return deletedRows;
  });

  if (deleted.length > 0) {
    wakeCounterOutbox();

    await invalidateFeedAfterAuthorMutation({
      authorUserId: user.userId,
      includeGuest: true,
    });
    await invalidatePostInteractionCaches({
      actorUserId: user.userId,
      postOwnerId: postOwnerRows[0].userId,
      isPostPublic: postOwnerRows[0].visibility === "public",
    });
  }

  return c.json({ ok: true });
});

async function assertOwnedBookmarkFolder(userId: string, folderId: string) {
  var db = getDb();
  var rows = await db
    .select({ id: bookmarkFolders.id })
    .from(bookmarkFolders)
    .where(and(eq(bookmarkFolders.id, folderId), eq(bookmarkFolders.userId, userId)))
    .limit(1);
  if (rows.length === 0) {
    throw notFound("Folder not found");
  }
}

feedRoutes.get("/bookmarks/folders", requireAuth, async function (c) {
  var user = c.get("user");
  var db = getDb();
  var folderRows = await db
    .select({
      id: bookmarkFolders.id,
      name: bookmarkFolders.name,
      itemCount: bookmarkFolders.itemCount,
      createdAt: bookmarkFolders.createdAt,
      updatedAt: bookmarkFolders.updatedAt,
    })
    .from(bookmarkFolders)
    .where(eq(bookmarkFolders.userId, user.userId))
    .orderBy(desc(bookmarkFolders.updatedAt));

  var unsortedCountRows = await db
    .select({
      unsortedCount: profiles.unsortedBookmarkCount,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.userId))
    .limit(1);

  return c.json({
    folders: folderRows.map(function (folder) {
      return {
        id: folder.id,
        name: folder.name,
        itemCount: Number(folder.itemCount ?? 0),
        createdAt: folder.createdAt.toISOString(),
        updatedAt: folder.updatedAt.toISOString(),
      };
    }),
    unsortedCount: Number(unsortedCountRows[0]?.unsortedCount ?? 0),
  });
});

feedRoutes.post("/bookmarks/folders", requireAuth, bookmarkFolderRateLimit, async function (c) {
  var user = c.get("user");
  var body = bookmarkFolderNameSchema.parse(await c.req.json());
  var db = getDb();
  var now = new Date();
  var rows = await db
    .insert(bookmarkFolders)
    .values({
      userId: user.userId,
      name: body.name,
      itemCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: bookmarkFolders.id,
      name: bookmarkFolders.name,
      itemCount: bookmarkFolders.itemCount,
      createdAt: bookmarkFolders.createdAt,
      updatedAt: bookmarkFolders.updatedAt,
    });

  var folder = rows[0];
  return c.json({
    folder: {
      id: folder.id,
      name: folder.name,
      itemCount: Number(folder.itemCount ?? 0),
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    },
  });
});

feedRoutes.patch("/bookmarks/folders/:folderId", requireAuth, bookmarkFolderRateLimit, async function (c) {
  var user = c.get("user");
  var folderId = c.req.param("folderId");
  var body = bookmarkFolderNameSchema.parse(await c.req.json());
  await assertOwnedBookmarkFolder(user.userId, folderId);
  var db = getDb();
  var rows = await db
    .update(bookmarkFolders)
    .set({ name: body.name, updatedAt: new Date() })
    .where(and(eq(bookmarkFolders.id, folderId), eq(bookmarkFolders.userId, user.userId)))
    .returning({
      id: bookmarkFolders.id,
      name: bookmarkFolders.name,
      itemCount: bookmarkFolders.itemCount,
      createdAt: bookmarkFolders.createdAt,
      updatedAt: bookmarkFolders.updatedAt,
    });

  if (rows.length === 0) {
    throw notFound("Folder not found");
  }

  var folder = rows[0];
  return c.json({
    folder: {
      id: folder.id,
      name: folder.name,
      itemCount: Number(folder.itemCount ?? 0),
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    },
  });
});

feedRoutes.delete("/bookmarks/folders/:folderId", requireAuth, bookmarkFolderRateLimit, async function (c) {
  var user = c.get("user");
  var folderId = c.req.param("folderId");
  await assertOwnedBookmarkFolder(user.userId, folderId);
  var db = getWriteDb();
  await db.transaction(async function (tx) {
    var unsortedTransferRows = await tx
      .select({ count: count() })
      .from(postBookmarks)
      .where(and(eq(postBookmarks.folderId, folderId), eq(postBookmarks.userId, user.userId)))
      .limit(1);
    var unsortedTransferCount = Number(unsortedTransferRows[0]?.count ?? 0);

    var deletedFolderRows = await tx
      .delete(bookmarkFolders)
      .where(and(eq(bookmarkFolders.id, folderId), eq(bookmarkFolders.userId, user.userId)))
      .returning({ id: bookmarkFolders.id });

    if (deletedFolderRows.length > 0 && unsortedTransferCount > 0) {
      await tx
        .update(profiles)
        .set({
          unsortedBookmarkCount: sql`GREATEST(${profiles.unsortedBookmarkCount} + ${unsortedTransferCount}, 0)`,
        })
        .where(eq(profiles.userId, user.userId));
    }
    if (deletedFolderRows.length === 0) {
      throw notFound("Folder not found");
    }
  });
  return c.json({ ok: true });
});

feedRoutes.post("/posts/:postId/bookmarks", requireAuth, postInteractionRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  try {
    await assertReadablePostForInteraction(postId, user.userId);
    var db = getDb();
    var postOwnerRows = await db
      .select({ userId: posts.userId, visibility: posts.visibility })
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.isDeleted, false)))
      .limit(1);
    if (postOwnerRows.length === 0) {
      throw notFound("Post not found");
    }

    var rawBody = await c.req.json().catch(function () {
      return {};
    });
    var folderId = bookmarkPostSchema.parse(rawBody).folderId;
    var hasExplicitFolderId = folderId !== undefined;
    var targetFolderId = folderId ?? null;
    if (targetFolderId) {
      await assertOwnedBookmarkFolder(user.userId, targetFolderId);
    }

    var existingRows = await db
      .select({ postId: postBookmarks.postId, folderId: postBookmarks.folderId })
      .from(postBookmarks)
      .where(and(eq(postBookmarks.postId, postId), eq(postBookmarks.userId, user.userId)))
      .limit(1);

    if (existingRows.length === 0) {
      var inserted = await getWriteDb().transaction(async function (tx) {
        var rows = await tx
          .insert(postBookmarks)
          .values({
            postId: postId,
            userId: user.userId,
            folderId: targetFolderId,
          })
          .returning({ postId: postBookmarks.postId, folderId: postBookmarks.folderId });

          if (rows.length > 0) {
            await recordCounterDeltas(tx, {
              targetTable: "posts",
              targetId: postId,
              counterName: "bookmarkCount",
              delta: 1,
            });
            if (targetFolderId !== null) {
              await tx
                .update(bookmarkFolders)
                .set({
                  itemCount: sql`GREATEST(${bookmarkFolders.itemCount} + 1, 0)`,
                })
                .where(eq(bookmarkFolders.id, targetFolderId));
            } else {
              await tx
                .update(profiles)
                .set({
                  unsortedBookmarkCount: sql`GREATEST(${profiles.unsortedBookmarkCount} + 1, 0)`,
                })
                .where(eq(profiles.userId, user.userId));
            }
          }

        return rows;
      });

      if (inserted.length > 0) {
        wakeCounterOutbox();
        try {
          await invalidatePostInteractionCaches({
            actorUserId: user.userId,
            postOwnerId: postOwnerRows[0].userId,
            isPostPublic: postOwnerRows[0].visibility === "public",
          });
        } catch (error) {
          console.warn("[feed-cache] post bookmark cache invalidation failed", {
            postId,
            actorUserId: user.userId,
            error,
          });
        }
      }

      var currentPostRows = await db
        .select({
          likeCount: posts.likeCount,
          commentCount: posts.commentCount,
          repostCount: posts.repostCount,
          bookmarkCount: posts.bookmarkCount,
        })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
      var visibleCounters = await getVisiblePostCounters(postId, {
        likeCount: Number(currentPostRows[0]?.likeCount ?? 0),
        commentCount: Number(currentPostRows[0]?.commentCount ?? 0),
        repostCount: Number(currentPostRows[0]?.repostCount ?? 0),
        bookmarkCount: Number(currentPostRows[0]?.bookmarkCount ?? 0),
      });

      return c.json({
        ok: true,
        folderId: inserted[0]?.folderId ?? null,
        bookmarkCount: visibleCounters.bookmarkCount,
        isBookmarked: true,
      });
    }

    if (hasExplicitFolderId) {
      var existingFolderId = existingRows[0]?.folderId ?? null;
      if (existingFolderId === targetFolderId) {
        return c.json({
          ok: true,
          folderId: targetFolderId,
          isBookmarked: true,
        });
      }

      var updated = await getWriteDb().transaction(async function (tx) {
        var rows = await tx
          .update(postBookmarks)
          .set({ folderId: targetFolderId })
          .where(and(eq(postBookmarks.postId, postId), eq(postBookmarks.userId, user.userId)))
          .returning({ folderId: postBookmarks.folderId });

          if (rows.length > 0 && existingFolderId !== rows[0]?.folderId) {
            if (existingFolderId !== null) {
              await tx
                .update(bookmarkFolders)
                .set({
                  itemCount: sql`GREATEST(${bookmarkFolders.itemCount} - 1, 0)`,
                })
                .where(eq(bookmarkFolders.id, existingFolderId));
            }

            if (targetFolderId !== null) {
              await tx
                .update(bookmarkFolders)
                .set({
                  itemCount: sql`GREATEST(${bookmarkFolders.itemCount} + 1, 0)`,
                })
                .where(eq(bookmarkFolders.id, targetFolderId));
            } else {
              await tx
                .update(profiles)
                .set({
                  unsortedBookmarkCount: sql`GREATEST(${profiles.unsortedBookmarkCount} + 1, 0)`,
                })
                .where(eq(profiles.userId, user.userId));
            }

            if (existingFolderId === null) {
              await tx
                .update(profiles)
                .set({
                  unsortedBookmarkCount: sql`GREATEST(${profiles.unsortedBookmarkCount} - 1, 0)`,
                })
                .where(eq(profiles.userId, user.userId));
            }
          }

        return rows;
      });
      return c.json({
        ok: true,
        folderId: updated[0]?.folderId ?? null,
        isBookmarked: true,
      });
    }

    return c.json({
      ok: true,
      folderId: existingRows[0]?.folderId ?? null,
      isBookmarked: true,
    });
  } catch (err) {
    throw toActionError(err);
  }
});

feedRoutes.patch("/posts/:postId/bookmarks", requireAuth, postInteractionRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  try {
    await assertReadablePostForInteraction(postId, user.userId);
    var body = bookmarkFolderAssignSchema.parse(await c.req.json());
    if (body.folderId) {
      await assertOwnedBookmarkFolder(user.userId, body.folderId);
    }

    var db = getDb();
    var current = await db
      .select({ folderId: postBookmarks.folderId })
      .from(postBookmarks)
      .where(and(eq(postBookmarks.postId, postId), eq(postBookmarks.userId, user.userId)))
      .limit(1);
    if (current.length === 0) {
      throw notFound("Bookmark not found");
    }

    var currentFolderId = current[0]?.folderId ?? null;
    if (currentFolderId === body.folderId) {
      return c.json({
        ok: true,
        folderId: currentFolderId,
        isBookmarked: true,
      });
    }

    var updated = await getWriteDb().transaction(async function (tx) {
      var rows = await tx
        .update(postBookmarks)
        .set({ folderId: body.folderId })
        .where(and(eq(postBookmarks.postId, postId), eq(postBookmarks.userId, user.userId)))
        .returning({ folderId: postBookmarks.folderId });

      if (rows.length > 0) {
        if (currentFolderId !== null) {
          await tx
            .update(bookmarkFolders)
            .set({
              itemCount: sql`GREATEST(${bookmarkFolders.itemCount} - 1, 0)`,
            })
            .where(eq(bookmarkFolders.id, currentFolderId));
        }
        if (currentFolderId === null) {
          await tx
            .update(profiles)
            .set({
              unsortedBookmarkCount: sql`GREATEST(${profiles.unsortedBookmarkCount} - 1, 0)`,
            })
            .where(eq(profiles.userId, user.userId));
        }

        if (body.folderId !== null) {
          await tx
            .update(bookmarkFolders)
            .set({
              itemCount: sql`GREATEST(${bookmarkFolders.itemCount} + 1, 0)`,
            })
            .where(eq(bookmarkFolders.id, body.folderId));
        } else {
          await tx
            .update(profiles)
            .set({
              unsortedBookmarkCount: sql`GREATEST(${profiles.unsortedBookmarkCount} + 1, 0)`,
            })
            .where(eq(profiles.userId, user.userId));
        }
      }

      return rows;
    });

    if (updated.length === 0) {
      throw notFound("Bookmark not found");
    }

    return c.json({
      ok: true,
      folderId: updated[0].folderId ?? null,
      isBookmarked: true,
    });
  } catch (err) {
    throw toActionError(err);
  }
});

feedRoutes.delete("/posts/:postId/bookmarks", requireAuth, postInteractionRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  await assertReadablePostForInteraction(postId, user.userId);
  var db = getDb();
  var postOwnerRows = await db
    .select({ userId: posts.userId, visibility: posts.visibility })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isDeleted, false)))
    .limit(1);
  if (postOwnerRows.length === 0) {
    throw notFound("Post not found");
  }

  var deleted = await getWriteDb().transaction(async function (tx) {
    var rows = await tx
      .delete(postBookmarks)
      .where(and(eq(postBookmarks.postId, postId), eq(postBookmarks.userId, user.userId)))
      .returning({ postId: postBookmarks.postId, folderId: postBookmarks.folderId });

    if (rows.length > 0) {
      await recordCounterDeltas(tx, {
        targetTable: "posts",
        targetId: postId,
        counterName: "bookmarkCount",
        delta: -1,
      });
      if (rows[0].folderId !== null) {
        await tx
          .update(bookmarkFolders)
          .set({
            itemCount: sql`GREATEST(${bookmarkFolders.itemCount} - 1, 0)`,
          })
          .where(eq(bookmarkFolders.id, rows[0].folderId));
      } else {
        await tx
          .update(profiles)
          .set({
            unsortedBookmarkCount: sql`GREATEST(${profiles.unsortedBookmarkCount} - 1, 0)`,
          })
          .where(eq(profiles.userId, user.userId));
      }
    }

    return rows;
  });

  if (deleted.length > 0) {
    wakeCounterOutbox();
    try {
      await invalidatePostInteractionCaches({
        actorUserId: user.userId,
        postOwnerId: postOwnerRows[0].userId,
        isPostPublic: postOwnerRows[0].visibility === "public",
      });
    } catch (error) {
      console.warn("[feed-cache] post unbookmark cache invalidation failed", {
        postId,
        actorUserId: user.userId,
        error,
      });
    }
  }

  var currentPostRows = await db
    .select({
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
      bookmarkCount: posts.bookmarkCount,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  var visibleCounters = await getVisiblePostCounters(postId, {
    likeCount: Number(currentPostRows[0]?.likeCount ?? 0),
    commentCount: Number(currentPostRows[0]?.commentCount ?? 0),
    repostCount: Number(currentPostRows[0]?.repostCount ?? 0),
    bookmarkCount: Number(currentPostRows[0]?.bookmarkCount ?? 0),
  });

  return c.json({
    ok: true,
    bookmarkCount: visibleCounters.bookmarkCount,
    isBookmarked: false,
  });
});

feedRoutes.post("/posts/:postId/comments/:commentId/likes", requireAuth, postInteractionRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  var commentId = c.req.param("commentId");

  try {
    await assertReadablePostForInteraction(postId, user.userId);

    var db = getDb();
    var commentRows = await db
      .select({
        userId: comments.userId,
        isDeleted: comments.isDeleted,
        moderationStatus: comments.moderationStatus,
      })
      .from(comments)
      .where(and(eq(comments.id, commentId), eq(comments.postId, postId)))
      .limit(1);

    if (
      commentRows.length === 0 ||
      commentRows[0].isDeleted ||
      (commentRows[0].moderationStatus !== "visible" && commentRows[0].userId !== user.userId)
    ) {
      throw notFound("Comment not found");
    }

    var inserted = await getWriteDb().transaction(async function (tx) {
      var rows = await tx
        .insert(commentLikes)
        .values({ commentId: commentId, userId: user.userId })
        .onConflictDoNothing()
        .returning({ commentId: commentLikes.commentId });

      if (rows.length > 0) {
        await recordCounterDeltas(tx, {
          targetTable: "comments",
          targetId: commentId,
          counterName: "likeCount",
          delta: 1,
        });
      }

      return rows;
    });

    if (inserted.length > 0) {
      wakeCounterOutbox();

      await createNotification({
        recipientId: commentRows[0].userId,
        actorId: user.userId,
        type: "like",
        entityType: "comment",
        entityId: commentId,
      }, { delayMs: 10_000 });
    }

    var countRows = await db
      .select({ likeCount: comments.likeCount })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    return c.json({
      likeCount: Number(countRows[0]?.likeCount ?? 0) + (inserted.length > 0 ? 1 : 0),
    });
  } catch (err) {
    throw toActionError(err);
  }
});

feedRoutes.delete("/posts/:postId/comments/:commentId/likes", requireAuth, postInteractionRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  var commentId = c.req.param("commentId");

  await assertReadablePostForInteraction(postId, user.userId);

  var db = getDb();
  var commentRows = await db
    .select({
      userId: comments.userId,
      isDeleted: comments.isDeleted,
      moderationStatus: comments.moderationStatus,
    })
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.postId, postId)))
    .limit(1);

  if (
    commentRows.length === 0 ||
    commentRows[0].isDeleted ||
    (commentRows[0].moderationStatus !== "visible" && commentRows[0].userId !== user.userId)
  ) {
    throw notFound("Comment not found");
  }

  var deleted = await getWriteDb().transaction(async function (tx) {
    var rows = await tx
      .delete(commentLikes)
      .where(and(eq(commentLikes.commentId, commentId), eq(commentLikes.userId, user.userId)))
      .returning({ commentId: commentLikes.commentId });

    if (rows.length > 0) {
      await recordCounterDeltas(tx, {
        targetTable: "comments",
        targetId: commentId,
        counterName: "likeCount",
        delta: -1,
      });
    }

    return rows;
  });

  if (deleted.length > 0) {
    wakeCounterOutbox();

    var existingNotificationRows: Array<{
      id: string;
      actorId: string | null;
      bundleCount: number;
      actorIds?: string[] | null;
    }> = [];

    try {
      existingNotificationRows = await db
        .select({
          id: notifications.id,
          actorId: notifications.actorId,
          bundleCount: notifications.bundleCount,
          actorIds: notifications.actorIds,
        })
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, commentRows[0].userId),
            eq(notifications.actorId, user.userId),
            eq(notifications.type, "like"),
            eq(notifications.entityType, "comment"),
            eq(notifications.entityId, commentId),
            eq(notifications.isRead, false)
          )
        )
        .limit(1);
    } catch (error) {
      if (!isMissingActorIdsColumnError(error)) {
        throw error;
      }

      existingNotificationRows = await db
        .select({
          id: notifications.id,
          actorId: notifications.actorId,
          bundleCount: notifications.bundleCount,
        })
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, commentRows[0].userId),
            eq(notifications.actorId, user.userId),
            eq(notifications.type, "like"),
            eq(notifications.entityType, "comment"),
            eq(notifications.entityId, commentId),
            eq(notifications.isRead, false)
          )
        )
        .limit(1);
    }

    if (existingNotificationRows.length > 0) {
      var existingNotification = existingNotificationRows[0];
      var nextActorIds = normalizeActorIds(existingNotification.actorIds).filter(function (id) {
        return id !== user.userId;
      });

      if ((existingNotification.bundleCount ?? 0) <= 1) {
        await removeNotificationPublishJob(existingNotification.id);
        await db.delete(notifications).where(eq(notifications.id, existingNotification.id));
      } else {
        var updateValues: {
          bundleCount: number;
          actorId: string | null;
          actorIds?: string[];
        } = {
          bundleCount: existingNotification.bundleCount - 1,
          actorId: nextActorIds[0] ?? existingNotification.actorId,
        };

        if (existingNotification.actorIds !== undefined) {
          updateValues.actorIds = nextActorIds;
        }

        await db
          .update(notifications)
          .set(updateValues)
          .where(eq(notifications.id, existingNotification.id));
      }
    }
  }

  var countRows = await db
    .select({ likeCount: comments.likeCount })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  return c.json({
    likeCount: Math.max(Number(countRows[0]?.likeCount ?? 0) - (deleted.length > 0 ? 1 : 0), 0),
  });
});

// Comments are returned as a flat list with parentId for client-side tree construction.
// Max depth: 3 levels, enforced on write. Do not change to nested API response
// without updating the client tree builder in features/feed/api/adapters.ts.
feedRoutes.get("/posts/:postId/comments", async function (c) {
  var postId = c.req.param("postId");
  var parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });
  var cursor = decodeCompositeCursor(parsed.cursor);
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var viewerIsStaff = isModerationStaffViewer(viewer);

  await assertReadablePost(postId, viewer?.userId ?? null, viewerIsStaff);

  var db = getDb();
  var filters: any[] = [
    eq(comments.postId, postId),
    moderationReadAccessSql(
      comments.moderationStatus,
      comments.userId,
      viewer?.userId ?? null,
      viewerIsStaff
    ),
    moderationReadAccessSql(
      profiles.moderationStatus,
      profiles.userId,
      viewer?.userId ?? null,
      viewerIsStaff
    ),
  ];
  if (viewer) {
    filters.push(...blockFiltersForAuthor(viewer.userId, comments.userId));
  }
  var cursorFilter = compositeCursorSql(comments.createdAt, comments.id, cursor);
  if (cursorFilter) filters.push(cursorFilter);

  var rows = await db
    .select({
      cursorCreatedAt: comments.createdAt,
      cursorId: comments.id,
      id: comments.id,
      postId: comments.postId,
      userId: comments.userId,
      parentId: comments.parentId,
      body: comments.body,
      likeCount: comments.likeCount,
      isDeleted: comments.isDeleted,
      moderationStatus: comments.moderationStatus,
      editedAt: comments.editedAt,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      isLiked: viewer
        ? sql<boolean>`exists(select 1 from ${commentLikes} where ${commentLikes.commentId} = ${comments.id} and ${commentLikes.userId} = ${viewer.userId})`
        : sql<boolean>`false`,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.userId, comments.userId))
    .where(and(...filters))
    .orderBy(desc(comments.createdAt), desc(comments.id))
    .limit(parsed.limit + 1);

  var visibleRows = rows.slice(0, parsed.limit);
  var items = await Promise.all(
    visibleRows.map(async function (row) {
      return {
        id: row.id,
        postId: row.postId,
        parentId: row.parentId,
        body: row.isDeleted ? null : await hydrateRichMentions(row.body),
        isDeleted: row.isDeleted,
        moderationStatus: row.moderationStatus,
        likeCount: Number(row.likeCount ?? 0),
        isLiked: Boolean(row.isLiked),
        editedAt: row.editedAt ? row.editedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        author: {
          id: row.userId,
          username: row.username,
          displayName: row.displayName,
          avatarUrl: await resolveProfileAvatarUrl(row.avatarUrl, row.userId, row.avatarVariants, "sm"),
          avatarUrlLg: await resolveProfileAvatarUrl(row.avatarUrl, row.userId, row.avatarVariants, "lg"),
        },
      };
    })
  );

  var hasMore = rows.length > parsed.limit;
  var tail = visibleRows[visibleRows.length - 1];
  var nextCursor = hasMore && tail
    ? encodeCompositeCursor({ createdAt: tail.cursorCreatedAt, id: tail.cursorId })
    : null;

  return c.json({ items, nextCursor, hasMore });
});

async function getCommentDepth(postId: string, commentId: string): Promise<number> {
  var db = getDb();
  var depth = 1;
  var currentId: string | null = commentId;

  while (currentId) {
    var rows: Array<{ parentId: string | null }> = await db
      .select({ parentId: comments.parentId })
      .from(comments)
      .where(and(eq(comments.id, currentId), eq(comments.postId, postId)))
      .limit(1);

    if (rows.length === 0) {
      throw badRequest("Invalid parent comment");
    }

    var parentId: string | null = rows[0].parentId;
    if (!parentId) break;

    depth += 1;
    currentId = parentId;

    if (depth > 3) break;
  }

  return depth;
}

feedRoutes.post("/posts/:postId/comments", requireAuth, commentWriteRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  var input = parseCreateCommentInput(await c.req.json());

  await assertReadablePostForInteraction(postId, user.userId);

  var db = getDb();
  var postRows = await db
    .select({ userId: posts.userId })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isDeleted, false)))
    .limit(1);

  if (postRows.length === 0) {
    throw notFound("Post not found");
  }

  var parentCommentOwnerId: string | null = null;

  if (input.parentId) {
    var parentDepth = await getCommentDepth(postId, input.parentId);
    if (parentDepth >= 3) {
      throw badRequest("Comments support max 3 levels");
    }

    var parentRows = await db
      .select({
        isDeleted: comments.isDeleted,
        userId: comments.userId,
        moderationStatus: comments.moderationStatus,
      })
      .from(comments)
      .where(and(eq(comments.id, input.parentId), eq(comments.postId, postId)))
      .limit(1);

    if (parentRows.length === 0) {
      throw badRequest("Parent comment not found");
    }

    if (parentRows[0].isDeleted) {
      throw badRequest("Cannot reply to deleted comment");
    }

    if (
      parentRows[0].moderationStatus !== "visible" &&
      parentRows[0].userId !== user.userId
    ) {
      throw badRequest("Parent comment not found");
    }

    parentCommentOwnerId = parentRows[0].userId;
  }

  var insertedRows = await getWriteDb().transaction(async function (tx) {
    var rows = await tx
      .insert(comments)
      .values({
        postId,
        userId: user.userId,
        parentId: input.parentId ?? null,
        body: input.body,
      })
      .returning({
        id: comments.id,
        postId: comments.postId,
        userId: comments.userId,
        parentId: comments.parentId,
        body: comments.body,
        likeCount: comments.likeCount,
        isDeleted: comments.isDeleted,
        editedAt: comments.editedAt,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      });

    if (rows.length > 0) {
      await recordCounterDeltas(tx, {
        targetTable: "posts",
        targetId: postId,
        counterName: "commentCount",
        delta: 1,
      });
    }

    return rows;
  });

  var inserted = insertedRows[0];
  if (!inserted) {
    throw badRequest("Unable to create comment");
  }

  wakeCounterOutbox();

  await createMentionNotifications({
    body: inserted.body,
    actorId: user.userId,
    entityType: "comment",
    entityId: inserted.id,
  });

  if (parentCommentOwnerId) {
    await createNotification({
      recipientId: parentCommentOwnerId,
      actorId: user.userId,
      type: "reply",
      entityType: "comment",
      entityId: inserted.id,
    });
  }

  if (!parentCommentOwnerId || parentCommentOwnerId !== postRows[0].userId) {
    await createNotification({
      recipientId: postRows[0].userId,
      actorId: user.userId,
      type: "comment",
      entityType: "comment",
      entityId: inserted.id,
    });
  }

  var profileRows = await db
    .select({
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.userId))
    .limit(1);

  if (profileRows.length === 0) {
    throw notFound("Profile not found");
  }

  return c.json(
    {
      id: inserted.id,
      postId: inserted.postId,
      parentId: inserted.parentId,
      body: await hydrateRichMentions(inserted.body),
      isDeleted: inserted.isDeleted,
      moderationStatus: "visible",
      likeCount: Number(inserted.likeCount ?? 0),
      editedAt: inserted.editedAt ? inserted.editedAt.toISOString() : null,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
      author: {
        id: inserted.userId,
        username: profileRows[0].username,
        displayName: profileRows[0].displayName,
        avatarUrl: await resolveProfileAvatarUrl(profileRows[0].avatarUrl, inserted.userId, profileRows[0].avatarVariants, "sm"),
        avatarUrlLg: await resolveProfileAvatarUrl(profileRows[0].avatarUrl, inserted.userId, profileRows[0].avatarVariants, "lg"),
      },
    },
    201
  );
});

feedRoutes.patch("/posts/:postId/comments/:commentId", requireAuth, commentWriteRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  var commentId = c.req.param("commentId");
  var input = parseUpdateCommentInput(await c.req.json());

  await assertReadablePostForInteraction(postId, user.userId);

  var db = getDb();
  var currentRows = await db
    .select({
      id: comments.id,
      userId: comments.userId,
      isDeleted: comments.isDeleted,
      moderationStatus: comments.moderationStatus,
    })
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.postId, postId)))
    .limit(1);

  if (currentRows.length === 0) {
    throw notFound("Comment not found");
  }

  var current = currentRows[0];
  if (current.userId !== user.userId) {
    throw forbidden("You can only edit your own comments");
  }

  if (current.isDeleted) {
    throw badRequest("Cannot edit deleted comment");
  }

  var updatedRows = await db
    .update(comments)
    .set({
      body: input.body,
      editedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(comments.id, commentId))
    .returning({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      body: comments.body,
      isDeleted: comments.isDeleted,
      moderationStatus: comments.moderationStatus,
      likeCount: comments.likeCount,
      editedAt: comments.editedAt,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      userId: comments.userId,
    });

  var updated = updatedRows[0];
  if (!updated) {
    throw badRequest("Unable to update comment");
  }

  var profileRows = await db
    .select({
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.userId))
    .limit(1);

  if (profileRows.length === 0) {
    throw notFound("Profile not found");
  }

  return c.json({
    id: updated.id,
    postId: updated.postId,
    parentId: updated.parentId,
    body: await hydrateRichMentions(updated.body),
    isDeleted: updated.isDeleted,
    moderationStatus: updated.moderationStatus,
    likeCount: Number(updated.likeCount ?? 0),
    editedAt: updated.editedAt ? updated.editedAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    author: {
      id: updated.userId,
      username: profileRows[0].username,
      displayName: profileRows[0].displayName,
      avatarUrl: await resolveProfileAvatarUrl(profileRows[0].avatarUrl, updated.userId, profileRows[0].avatarVariants, "sm"),
      avatarUrlLg: await resolveProfileAvatarUrl(profileRows[0].avatarUrl, updated.userId, profileRows[0].avatarVariants, "lg"),
    },
  });
});

feedRoutes.delete("/posts/:postId/comments/:commentId", requireAuth, commentWriteRateLimit, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  var commentId = c.req.param("commentId");

  await assertReadablePostForInteraction(postId, user.userId);

  var db = getDb();
  var currentRows = await db
    .select({
      id: comments.id,
      userId: comments.userId,
      isDeleted: comments.isDeleted,
    })
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.postId, postId)))
    .limit(1);

  if (currentRows.length === 0) {
    throw notFound("Comment not found");
  }

  var current = currentRows[0];
  if (current.userId !== user.userId) {
    throw forbidden("You can only delete your own comments");
  }

  if (!current.isDeleted) {
    await getWriteDb().transaction(async function (tx) {
      await tx
        .update(comments)
        .set({
          isDeleted: true,
          updatedAt: new Date(),
        })
        .where(eq(comments.id, commentId));

      await recordCounterDeltas(tx, {
        targetTable: "posts",
        targetId: postId,
        counterName: "commentCount",
        delta: -1,
      });
    });
    wakeCounterOutbox();
  }

  return c.json({ ok: true });
});

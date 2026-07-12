import { and, desc, eq, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import {
  comments,
  films,
  notifications,
  posts,
  profiles,
} from "@35mm/db/schema";
import { notificationQuerySchema, notificationIdSchema } from "@35mm/validators";
import type { NotificationItem, NotificationPage } from "@35mm/types";
import { decodeCompositeCursor, encodeCompositeCursor } from "../../lib/cursor.js";
import { getDb } from "../../lib/db.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { requireAuth } from "../../lib/middleware.js";
import { createRateLimitMiddleware, identifyByUserId } from "../../lib/rateLimit.js";
import {
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "../../lib/notifications.js";
import { resolveProfileAvatarUrl, type AvatarVariants } from "../media/url.js";

export var notificationsRoutes = new Hono();

var notificationWriteRateLimit = createRateLimitMiddleware({
  keyPrefix: "notifications:write",
  limit: 120,
  windowSeconds: 60,
  identify: identifyByUserId,
});

interface RawNotificationRow {
  id: string;
  type: NotificationItem["type"];
  isRead: boolean;
  bundleCount: number;
  createdAt: Date;
  actorIds: string[] | null;
  actorId: string | null;
  actorUsername: string | null;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  actorAvatarVariants: AvatarVariants | null;
  entityId: string | null;
  entityType: NonNullable<NotificationItem["entity"]>["type"] | null;
  metadata: Record<string, unknown>;
}

interface ActorProfile {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarVariants?: AvatarVariants | null;
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
    message.includes("column") && message.includes("does not exist")
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

interface EntityPostRow {
  id: string;
  filmTitle: string | null;
  filmPosterUrl: string | null;
  username: string | null;
}

interface EntityCommentRow {
  id: string;
  postId: string;
  postUsername: string | null;
  postFilmTitle: string | null;
  postFilmPoster: string | null;
}

interface EntityUserRow {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarVariants?: AvatarVariants | null;
}

interface EntityFilmRow {
  id: string;
  title: string;
  posterUrl: string | null;
}

type NotificationEntityMap = {
  posts: Map<string, EntityPostRow>;
  comments: Map<string, EntityCommentRow>;
  users: Map<string, EntityUserRow>;
  films: Map<string, EntityFilmRow>;
};

function toCursor(createdAt: Date, id: string): string {
  return encodeCompositeCursor({ createdAt, id });
}

async function resolveActor(row: RawNotificationRow) {
  if (!row.actorId) return null;

  return {
    id: row.actorId,
    username: row.actorUsername ?? "",
    displayName: row.actorDisplayName ?? row.actorUsername ?? "",
    avatarUrl: await resolveProfileAvatarUrl(row.actorAvatarUrl, row.actorId, row.actorAvatarVariants, "sm"),
    avatarUrlLg: await resolveProfileAvatarUrl(row.actorAvatarUrl, row.actorId, row.actorAvatarVariants, "lg"),
  };
}

async function resolveEntity(
  row: RawNotificationRow,
  maps: NotificationEntityMap
): Promise<NotificationItem["entity"]> {
  if (!row.entityType || !row.entityId) return null;

  if (row.entityType === "post") {
    var rowPost = maps.posts.get(row.entityId);
    return {
      type: "post",
      id: row.entityId,
      title: rowPost ? rowPost.filmTitle : null,
      thumbnailUrl: rowPost ? rowPost.filmPosterUrl : null,
      username: rowPost?.username ?? null,
    };
  }

  if (row.entityType === "comment") {
    var rowComment = maps.comments.get(row.entityId);
    return {
      type: "comment",
      id: row.entityId,
      title: rowComment ? rowComment.postFilmTitle : null,
      thumbnailUrl: rowComment ? rowComment.postFilmPoster : null,
      username: rowComment ? rowComment.postUsername : null,
      postId: rowComment ? rowComment.postId : null,
    };
  }

  if (row.entityType === "film") {
    var rowFilm = maps.films.get(row.entityId);
    return {
      type: "film",
      id: row.entityId,
      title: rowFilm ? rowFilm.title : null,
      thumbnailUrl: rowFilm ? rowFilm.posterUrl : null,
    };
  }

  if (row.entityType === "chat_thread") {
    return {
      type: "chat_thread",
      id: row.entityId,
      title: null,
      thumbnailUrl: null,
    };
  }

  var rowUser = maps.users.get(row.entityId);
  if (!rowUser) {
    return {
      type: "user",
      id: row.entityId,
      title: null,
      thumbnailUrl: null,
    };
  }

  return {
    type: "user",
    id: rowUser.id,
    title: rowUser.displayName?.trim() || rowUser.username,
    thumbnailUrl: await resolveProfileAvatarUrl(rowUser.avatarUrl, rowUser.id, rowUser.avatarVariants, "sm"),
  };
}

async function asNotificationItem(
  row: RawNotificationRow,
  maps: NotificationEntityMap,
  actorProfileMap: Map<string, ActorProfile>
): Promise<NotificationItem> {
  var actorIds = normalizeActorIds(row.actorIds);
  var actorProfiles = await Promise.all(
    actorIds
      .map(function (actorId) {
        return actorProfileMap.get(actorId);
      })
      .filter(function (profile): profile is ActorProfile {
        return Boolean(profile);
      })
      .map(async function (profile) {
        return {
          ...profile,
          avatarUrl: await resolveProfileAvatarUrl(profile.avatarUrl, profile.userId, profile.avatarVariants, "sm"),
          avatarUrlLg: await resolveProfileAvatarUrl(profile.avatarUrl, profile.userId, profile.avatarVariants, "lg"),
        };
      })
  );
  return {
    id: row.id,
    type: row.type,
    actor: await resolveActor(row),
    entity: await resolveEntity(row, maps),
    metadata: row.metadata,
    isRead: row.isRead,
    actorIds,
    actorProfiles,
    bundleCount: row.bundleCount,
    createdAt: row.createdAt.toISOString(),
  };
}

notificationsRoutes.get("/me/notifications", requireAuth, async function (c) {
  var user = c.get("user");
  var parsed = notificationQuerySchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    unreadOnly: c.req.query("unreadOnly"),
  });

  var cursor = decodedCursor(parsed.cursor);
  var filters = [eq(notifications.recipientId, user.userId) as SQL<boolean>];

  if (parsed.unreadOnly) {
    filters.push(eq(notifications.isRead, false) as SQL<boolean>);
  }

  if (cursor) {
    var cursorFilter = or(
      lt(notifications.createdAt, cursor.createdAt),
      and(eq(notifications.createdAt, cursor.createdAt), lt(notifications.id, cursor.id))
    ) as SQL<boolean> | undefined;
    if (cursorFilter) {
      filters.push(cursorFilter);
    }
  }

  var db = getDb();
  var rows: Array<{
    id: string;
    type: NotificationItem["type"];
    isRead: boolean;
    bundleCount: number;
    createdAt: Date;
    actorIds?: unknown;
    actorId: string | null;
    actorUsername: string | null;
    actorDisplayName: string | null;
    actorAvatarUrl: string | null;
    actorAvatarVariants: AvatarVariants | null;
    entityId: string | null;
    entityType: string | null;
    metadata: Record<string, unknown>;
  }>;

  try {
    rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        isRead: notifications.isRead,
        bundleCount: notifications.bundleCount,
        createdAt: notifications.createdAt,
        actorIds: notifications.actorIds,
        actorId: notifications.actorId,
        actorUsername: profiles.username,
        actorDisplayName: profiles.displayName,
        actorAvatarUrl: profiles.avatarUrl,
        actorAvatarVariants: profiles.avatarVariants,
        entityId: notifications.entityId,
        entityType: notifications.entityType,
        metadata: notifications.metadata,
      })
      .from(notifications)
      .leftJoin(profiles, eq(profiles.userId, notifications.actorId))
      .where(and(...filters))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(parsed.limit + 1);
  } catch (error) {
    if (!isMissingActorIdsColumnError(error)) {
      throw error;
    }

    rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        isRead: notifications.isRead,
        bundleCount: notifications.bundleCount,
        createdAt: notifications.createdAt,
        actorIds: sql`'{}'::text[]`,
        actorId: notifications.actorId,
        actorUsername: profiles.username,
        actorDisplayName: profiles.displayName,
        actorAvatarUrl: profiles.avatarUrl,
        actorAvatarVariants: profiles.avatarVariants,
        entityId: notifications.entityId,
        entityType: notifications.entityType,
        metadata: notifications.metadata,
      })
      .from(notifications)
      .leftJoin(profiles, eq(profiles.userId, notifications.actorId))
      .where(and(...filters))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(parsed.limit + 1);
  }

  var visible = rows.slice(0, parsed.limit) as RawNotificationRow[];
  var hasMore = rows.length > parsed.limit;
  var tail = visible[visible.length - 1];

  var actorIdSet = new Set<string>();
  var primaryActorIds = new Set<string>();
  for (var j = 0; j < visible.length; j += 1) {
    var row = visible[j];

    if (row.actorId) {
      primaryActorIds.add(row.actorId);
    }

    var actorIds = normalizeActorIds(row.actorIds);
    for (var k = 0; k < actorIds.length; k += 1) {
      var actorId = actorIds[k];
      if (!actorId || primaryActorIds.has(actorId)) {
        continue;
      }

      actorIdSet.add(actorId);
    }
  }

  var actorProfilesRows = actorIdSet.size > 0
    ? await db
        .select({
          userId: profiles.userId,
          username: profiles.username,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
          avatarVariants: profiles.avatarVariants,
        })
        .from(profiles)
        .where(inArray(profiles.userId, Array.from(actorIdSet)))
    : [];

  var actorProfileMap = new Map<string, ActorProfile>();
  for (var m = 0; m < actorProfilesRows.length; m += 1) {
    var actorProfileRow = actorProfilesRows[m];
    actorProfileMap.set(actorProfileRow.userId, actorProfileRow);
  }

  for (var n = 0; n < visible.length; n += 1) {
    var visibleRow = visible[n];
    if (!visibleRow.actorId || actorProfileMap.has(visibleRow.actorId)) {
      continue;
    }

    actorProfileMap.set(visibleRow.actorId, {
      userId: visibleRow.actorId,
      username: visibleRow.actorUsername ?? "",
      displayName: visibleRow.actorDisplayName ?? visibleRow.actorUsername ?? null,
      avatarUrl: visibleRow.actorAvatarUrl ?? null,
      avatarVariants: visibleRow.actorAvatarVariants ?? null,
    });
  }

  var postIds = new Set<string>();
  var commentIds = new Set<string>();
  var userIds = new Set<string>();
  var filmIds = new Set<string>();

  for (var i = 0; i < visible.length; i += 1) {
    var notificationRow = visible[i];
    if (notificationRow.entityType === "post" && notificationRow.entityId) {
      postIds.add(notificationRow.entityId);
    }

    if (notificationRow.entityType === "comment" && notificationRow.entityId) {
      commentIds.add(notificationRow.entityId);
    }

    if (notificationRow.entityType === "user" && notificationRow.entityId) {
      userIds.add(notificationRow.entityId);
    }

    if (notificationRow.entityType === "film" && notificationRow.entityId) {
      filmIds.add(notificationRow.entityId);
    }
  }

  var postRows: EntityPostRow[] =
    postIds.size > 0
      ? await db
          .select({
            id: posts.id,
            filmTitle: films.title,
            filmPosterUrl: films.posterUrl,
            username: profiles.username,
          })
          .from(posts)
          .innerJoin(profiles, eq(profiles.userId, posts.userId))
          .leftJoin(films, eq(posts.filmId, films.id))
          .where(inArray(posts.id, Array.from(postIds)))
      : [];

  var commentRows: EntityCommentRow[] =
    commentIds.size > 0
      ? await db
          .select({
            id: comments.id,
            postId: comments.postId,
            postFilmTitle: films.title,
            postFilmPoster: films.posterUrl,
            postUsername: profiles.username,
          })
          .from(comments)
          .innerJoin(posts, eq(comments.postId, posts.id))
          .innerJoin(profiles, eq(profiles.userId, posts.userId))
          .leftJoin(films, eq(posts.filmId, films.id))
          .where(inArray(comments.id, Array.from(commentIds)))
      : [];

  var userRows: EntityUserRow[] =
    userIds.size > 0
      ? await db
          .select({
            id: profiles.userId,
            username: profiles.username,
            displayName: profiles.displayName,
            avatarUrl: profiles.avatarUrl,
            avatarVariants: profiles.avatarVariants,
          })
          .from(profiles)
          .where(inArray(profiles.userId, Array.from(userIds)))
      : [];

  var filmRows: EntityFilmRow[] =
    filmIds.size > 0
      ? await db
          .select({
            id: films.id,
            title: films.title,
            posterUrl: films.posterUrl,
          })
          .from(films)
          .where(inArray(films.id, Array.from(filmIds)))
      : [];

  var postMap = new Map<string, EntityPostRow>();
  var commentMap = new Map<string, EntityCommentRow>();
  var userMap = new Map<string, EntityUserRow>();
  var filmMap = new Map<string, EntityFilmRow>();

  for (var j = 0; j < postRows.length; j += 1) {
    var postRow = postRows[j];
    postMap.set(postRow.id, postRow);
  }

  for (var k = 0; k < commentRows.length; k += 1) {
    var commentRow = commentRows[k];
    commentMap.set(commentRow.id, commentRow);
  }

  for (var l = 0; l < filmRows.length; l += 1) {
    var filmRow = filmRows[l];
    filmMap.set(filmRow.id, filmRow);
  }

  for (var m = 0; m < userRows.length; m += 1) {
    var userRow = userRows[m];
    userMap.set(userRow.id, userRow);
  }

  var map: NotificationEntityMap = {
    posts: postMap,
    comments: commentMap,
    users: userMap,
    films: filmMap,
  };

  var items = await Promise.all(visible.map(function (row) {
    return asNotificationItem(row, map, actorProfileMap);
  }));

  var page: NotificationPage = {
    items,
    nextCursor: hasMore && tail ? toCursor(tail.createdAt, tail.id) : null,
    hasMore,
  };

  return c.json(page);
});

notificationsRoutes.patch("/me/notifications/:notificationId/read", requireAuth, notificationWriteRateLimit, async function (c) {
  var user = c.get("user");
  var input = notificationIdSchema.parse({
    notificationId: c.req.param("notificationId"),
  });

  var changed = await markNotificationRead(user.userId, input.notificationId);
  if (!changed) {
    throw notFound("Notification not found");
  }

  return c.json({ ok: true, updated: true });
});

notificationsRoutes.patch("/me/notifications/:notificationId/unread", requireAuth, notificationWriteRateLimit, async function (c) {
  var user = c.get("user");
  var input = notificationIdSchema.parse({
    notificationId: c.req.param("notificationId"),
  });

  var changed = await markNotificationUnread(user.userId, input.notificationId);
  if (!changed) {
    throw notFound("Notification not found");
  }

  return c.json({ ok: true, updated: true });
});

notificationsRoutes.post("/me/notifications/read-all", requireAuth, notificationWriteRateLimit, async function (c) {
  var user = c.get("user");
  var updated = await markAllNotificationsRead(user.userId);

  return c.json({
    ok: true,
    updatedCount: updated,
  });
});

function decodedCursor(input: string | undefined): { createdAt: Date; id: string } | null {
  if (!input) return null;

  try {
    return decodeCompositeCursor(input);
  } catch (_err) {
    throw badRequest("Invalid cursor");
  }
}

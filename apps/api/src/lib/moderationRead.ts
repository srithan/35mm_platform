import { eq, or, sql } from "drizzle-orm";
import type { ModerationContentStatus, ModerationContentType } from "@35mm/types";
import type { SQLWrapper } from "drizzle-orm";
import type { FeedCachePayload } from "./feedCache.js";
import type { AuthUser } from "./middleware.js";
import { getRedisClient } from "./redis.js";
import { roleCanModerate, studioRoleFromAuthUserMetadata } from "./studioAuth.js";

const MODERATION_READ_CACHE_NS = "moderation-read:v1";

function moderationReadCacheKey(contentType: ModerationContentType, contentId: string): string {
  return MODERATION_READ_CACHE_NS + ":" + contentType + ":" + encodeURIComponent(contentId);
}

function moderationProfileStatsDirtyKey(authorUserId: string): string {
  return MODERATION_READ_CACHE_NS + ":profile-stats-dirty:" + encodeURIComponent(authorUserId);
}

export function isModerationStaffViewer(user: AuthUser | null | undefined): boolean {
  return Boolean(user && roleCanModerate(studioRoleFromAuthUserMetadata(user)));
}

export function moderationReadAccessSql(
  statusColumn: SQLWrapper,
  authorUserIdColumn: SQLWrapper,
  viewerUserId: string | null,
  viewerIsStaff: boolean
) {
  if (viewerIsStaff) return sql<boolean>`true`;
  if (!viewerUserId) return eq(statusColumn as any, "visible");
  return or(
    eq(statusColumn as any, "visible"),
    eq(authorUserIdColumn as any, viewerUserId)
  );
}

export async function setModerationReadStatus(
  contentType: ModerationContentType,
  contentId: string,
  status: ModerationContentStatus
): Promise<boolean> {
  var redis = getRedisClient();
  if (!redis) return true;
  try {
    await redis.set(moderationReadCacheKey(contentType, contentId), status);
    return true;
  } catch (error) {
    console.error("[moderation-read] status-sync-failed", {
      contentType,
      contentId,
      status,
      error,
    });
    return false;
  }
}

export async function markModerationProfileStatsDirty(authorUserId: string): Promise<boolean> {
  var redis = getRedisClient();
  if (!redis) return true;
  try {
    await redis.setex(moderationProfileStatsDirtyKey(authorUserId), 180, true);
    return true;
  } catch (error) {
    console.error("[moderation-read] profile-stats-dirty-sync-failed", { authorUserId, error });
    return false;
  }
}

export async function isModerationProfileStatsDirty(authorUserId: string): Promise<boolean> {
  var redis = getRedisClient();
  if (!redis) return false;
  try {
    return Boolean(await redis.get<boolean>(moderationProfileStatsDirtyKey(authorUserId)));
  } catch (error) {
    console.error("[moderation-read] profile-stats-dirty-read-failed", { authorUserId, error });
    return true;
  }
}

type CachedFeedItem = {
  id: string;
  moderationStatus?: ModerationContentStatus;
  author: { id: string };
};

export async function filterModeratedPostRows<T extends {
  id: string;
  authorId: string;
  moderationStatus?: ModerationContentStatus;
}>(input: {
  rows: T[];
  viewerUserId: string | null;
  viewerIsStaff: boolean;
}): Promise<T[] | null> {
  if (input.rows.length === 0) return input.rows;
  var redis = getRedisClient();
  if (!redis) return null;
  var keys: string[] = [];
  for (var row of input.rows) {
    keys.push(moderationReadCacheKey("post", row.id));
    keys.push(moderationReadCacheKey("profile", row.authorId));
  }
  try {
    var statuses = await redis.mget<ModerationContentStatus>(keys);
    return input.rows.filter(function (row, index) {
      var postStatus = statuses[index * 2] ?? row.moderationStatus ?? "visible";
      var profileStatus = statuses[index * 2 + 1] ?? "visible";
      var effectiveStatus = postStatus !== "visible" ? postStatus : profileStatus;
      return effectiveStatus === "visible"
        || input.viewerIsStaff
        || input.viewerUserId === row.authorId;
    });
  } catch (error) {
    console.error("[moderation-read] row-filter-failed", { error });
    return null;
  }
}

function isCachedFeedItem(value: unknown): value is CachedFeedItem {
  if (!value || typeof value !== "object") return false;
  var item = value as Partial<CachedFeedItem>;
  return typeof item.id === "string" && typeof item.author?.id === "string";
}

export async function filterModeratedFeedCachePayload(input: {
  payload: FeedCachePayload;
  viewerUserId: string | null;
  viewerIsStaff: boolean;
}): Promise<FeedCachePayload | null> {
  if (input.payload.items.length === 0) return input.payload;
  var items = input.payload.items;
  if (!items.every(isCachedFeedItem)) return null;
  var redis = getRedisClient();
  if (!redis) return null;

  var keys: string[] = [];
  for (var item of items) {
    keys.push(moderationReadCacheKey("post", item.id));
    keys.push(moderationReadCacheKey("profile", item.author.id));
  }

  try {
    var statuses = await redis.mget<ModerationContentStatus>(keys);
    var visibleItems: CachedFeedItem[] = [];
    for (var index = 0; index < items.length; index += 1) {
      var item = items[index];
      var postStatus = statuses[index * 2] ?? item.moderationStatus ?? "visible";
      var profileStatus = statuses[index * 2 + 1] ?? "visible";
      var effectiveStatus = postStatus !== "visible" ? postStatus : profileStatus;
      var canSee = effectiveStatus === "visible"
        || input.viewerIsStaff
        || input.viewerUserId === item.author.id;
      if (canSee) {
        visibleItems.push({ ...item, moderationStatus: effectiveStatus });
      }
    }
    return {
      ...input.payload,
      items: visibleItems,
      hasMore: input.payload.hasMore || visibleItems.length < items.length,
    };
  } catch (error) {
    console.error("[moderation-read] cache-filter-failed", { error });
    return null;
  }
}

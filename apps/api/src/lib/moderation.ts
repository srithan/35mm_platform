import { and, eq, sql, type AnyColumn } from "drizzle-orm";
import { feedItems, posts, profiles, userBlocks, userMutes } from "@35mm/db/schema";
import { getDb } from "./db.js";
import { ApiError, notFound } from "./errors.js";

export type ModerationStatus = {
  blockedByViewer: boolean;
  blockedByTarget: boolean;
  isMutedByViewer: boolean;
};

export function notBlockedByViewerSql(viewerUserId: string, authorUserIdColumn: AnyColumn) {
  return sql<boolean>`not exists(select 1 from ${userBlocks} where ${userBlocks.blockerId} = ${viewerUserId} and ${userBlocks.blockedId} = ${authorUserIdColumn})`;
}

export function notBlockedByAuthorSql(viewerUserId: string, authorUserIdColumn: AnyColumn) {
  return sql<boolean>`not exists(select 1 from ${userBlocks} where ${userBlocks.blockerId} = ${authorUserIdColumn} and ${userBlocks.blockedId} = ${viewerUserId})`;
}

export function notMutedByViewerSql(viewerUserId: string, authorUserIdColumn: AnyColumn) {
  return sql<boolean>`not exists(select 1 from ${userMutes} where ${userMutes.muterId} = ${viewerUserId} and ${userMutes.mutedId} = ${authorUserIdColumn})`;
}

export function blockFiltersForAuthor(viewerUserId: string, authorUserIdColumn: AnyColumn) {
  return [
    notBlockedByViewerSql(viewerUserId, authorUserIdColumn),
    notBlockedByAuthorSql(viewerUserId, authorUserIdColumn),
  ];
}

export function notBlockedWithViewerSql(viewerUserId: string, targetUserIdColumn: AnyColumn) {
  return and(
    notBlockedByViewerSql(viewerUserId, targetUserIdColumn),
    notBlockedByAuthorSql(viewerUserId, targetUserIdColumn)
  );
}

export async function getModerationStatus(
  viewerUserId: string,
  targetUserId: string
): Promise<ModerationStatus> {
  if (viewerUserId === targetUserId) {
    return {
      blockedByViewer: false,
      blockedByTarget: false,
      isMutedByViewer: false,
    };
  }

  var db = getDb();
  var rows = await db
    .select({
      blockedByViewer: sql<boolean>`exists(select 1 from ${userBlocks} where ${userBlocks.blockerId} = ${viewerUserId} and ${userBlocks.blockedId} = ${targetUserId})`,
      blockedByTarget: sql<boolean>`exists(select 1 from ${userBlocks} where ${userBlocks.blockerId} = ${targetUserId} and ${userBlocks.blockedId} = ${viewerUserId})`,
      isMutedByViewer: sql<boolean>`exists(select 1 from ${userMutes} where ${userMutes.muterId} = ${viewerUserId} and ${userMutes.mutedId} = ${targetUserId})`,
    })
    .from(profiles)
    .limit(1);

  return {
    blockedByViewer: Boolean(rows[0]?.blockedByViewer),
    blockedByTarget: Boolean(rows[0]?.blockedByTarget),
    isMutedByViewer: Boolean(rows[0]?.isMutedByViewer),
  };
}

export async function assertNoBlockBetween(viewerUserId: string, targetUserId: string) {
  if (viewerUserId === targetUserId) return;

  var status = await getModerationStatus(viewerUserId, targetUserId);
  if (status.blockedByViewer) {
    throw new ApiError(403, "BLOCKED", `BLOCKED_BY_YOU:${targetUserId}`);
  }
  if (status.blockedByTarget) {
    throw new ApiError(403, "BLOCKED", "BLOCKED_BY_THEM");
  }
}

export async function assertCanInteractWithPost(viewerUserId: string, postId: string) {
  var db = getDb();
  var rows = await db
    .select({ userId: posts.userId })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isDeleted, false)))
    .limit(1);

  if (rows.length === 0) {
    throw notFound("Post not found");
  }

  await assertNoBlockBetween(viewerUserId, rows[0].userId);
}

export async function purgeFeedItemsBetweenUsers(blockerId: string, blockedId: string) {
  var db = getDb();

  await db
    .delete(feedItems)
    .where(
      and(
        eq(feedItems.userId, blockerId),
        sql<boolean>`exists(
          select 1
          from ${posts}
          where ${posts.id} = ${feedItems.postId}
            and ${posts.userId} = ${blockedId}
        )`
      )
    );

  await db
    .delete(feedItems)
    .where(
      and(
        eq(feedItems.userId, blockedId),
        sql<boolean>`exists(
          select 1
          from ${posts}
          where ${posts.id} = ${feedItems.postId}
            and ${posts.userId} = ${blockerId}
        )`
      )
    );
}

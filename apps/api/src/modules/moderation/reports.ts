import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import {
  comments,
  moderationContentState,
  posts,
  profiles,
  reports,
} from "@35mm/db/schema";
import type {
  ModerationContentSnapshot,
  ModerationContentType,
  MyReportDetailDto,
  ReportDto,
  ReportPage,
} from "@35mm/types";
import type { CreateReportInput } from "@35mm/validators";
import { decodeCompositeCursor, encodeCompositeCursor } from "../../lib/cursor.js";
import { getDb, getWriteDb } from "../../lib/db.js";
import { notFound } from "../../lib/errors.js";
import { enqueueModerationAutoHideCheckJob } from "../../lib/jobs.js";
import { createUlid } from "../../lib/ulid.js";
import { resolveProfileAvatarUrl, type AvatarVariants } from "../media/url.js";

type Tx = any;
type ReportRow = typeof reports.$inferSelect;
var UNRESOLVED_REPORT_STATUSES: Array<"open" | "reviewing"> = ["open", "reviewing"];

export function isUnresolvedReportStatus(status: string): boolean {
  return status === "open" || status === "reviewing";
}

export type CreateReportResult = {
  report: ReportDto;
  created: boolean;
};

export function toReportDto(row: ReportRow): ReportDto {
  return {
    id: row.id,
    contentType: row.contentType,
    contentId: row.contentId,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function snapshotString(snapshot: ModerationContentSnapshot, key: string): string | null {
  var value = snapshot[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function snapshotNumber(snapshot: ModerationContentSnapshot, key: string): number | null {
  var value = snapshot[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function toReporterSnapshot(row: ReportRow): Promise<ModerationContentSnapshot> {
  var snapshot = row.contentSnapshot ?? {};
  if (row.contentType === "post") {
    var postRows = await getDb()
      .select({
        userId: posts.userId,
        type: posts.type,
        createdAt: posts.createdAt,
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        avatarVariants: profiles.avatarVariants,
      })
      .from(posts)
      .leftJoin(profiles, eq(profiles.userId, posts.userId))
      .where(eq(posts.id, row.contentId))
      .limit(1);
    var post = postRows[0];
    var authorId = snapshotString(snapshot, "author_id") ?? post?.userId ?? null;
    var authorAvatarUrl = snapshotString(snapshot, "author_avatar_url") ?? post?.avatarUrl ?? null;
    var authorAvatarVariants = (snapshot.author_avatar_variants ?? post?.avatarVariants ?? null) as AvatarVariants | null;
    return {
      body: snapshot.body ?? null,
      headline: snapshot.headline ?? null,
      media: snapshot.media ?? [],
      visibility: snapshot.visibility ?? null,
      post_type: snapshot.post_type ?? post?.type ?? "text",
      created_at: snapshot.created_at ?? post?.createdAt?.toISOString() ?? null,
      author_username: snapshot.author_username ?? post?.username ?? null,
      author_display_name: snapshot.author_display_name ?? post?.displayName ?? null,
      author_avatar_url: authorId
        ? await resolveProfileAvatarUrl(authorAvatarUrl, authorId, authorAvatarVariants, "sm")
        : authorAvatarUrl,
    };
  }
  if (row.contentType === "comment") {
    var commentRows = await getDb()
      .select({
        userId: comments.userId,
        createdAt: comments.createdAt,
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        avatarVariants: profiles.avatarVariants,
      })
      .from(comments)
      .leftJoin(profiles, eq(profiles.userId, comments.userId))
      .where(eq(comments.id, row.contentId))
      .limit(1);
    var comment = commentRows[0];
    var commentAuthorId = snapshotString(snapshot, "author_id") ?? comment?.userId ?? null;
    var commentAuthorAvatarUrl = snapshotString(snapshot, "author_avatar_url") ?? comment?.avatarUrl ?? null;
    var commentAuthorAvatarVariants = (snapshot.author_avatar_variants ?? comment?.avatarVariants ?? null) as AvatarVariants | null;
    return {
      body: snapshot.body ?? null,
      post_id: snapshot.post_id ?? null,
      created_at: snapshot.created_at ?? comment?.createdAt?.toISOString() ?? null,
      author_username: snapshot.author_username ?? comment?.username ?? null,
      author_display_name: snapshot.author_display_name ?? comment?.displayName ?? null,
      author_avatar_url: commentAuthorId
        ? await resolveProfileAvatarUrl(
            commentAuthorAvatarUrl,
            commentAuthorId,
            commentAuthorAvatarVariants,
            "sm"
          )
        : commentAuthorAvatarUrl,
    };
  }
  var profileRows = await getDb()
    .select({
      bio: profiles.bio,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      username: profiles.username,
      postCount: profiles.postCount,
      followerCount: profiles.followerCount,
      followingCount: profiles.followingCount,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(eq(profiles.userId, row.contentId))
    .limit(1);
  var profile = profileRows[0];
  var profileAvatarUrl = snapshotString(snapshot, "avatar_url") ?? profile?.avatarUrl ?? null;
  var profileAvatarVariants = (snapshot.avatar_variants ?? profile?.avatarVariants ?? null) as AvatarVariants | null;
  return {
    bio: snapshot.bio ?? profile?.bio ?? null,
    display_name: snapshot.display_name ?? profile?.displayName ?? null,
    avatar_url: await resolveProfileAvatarUrl(
      profileAvatarUrl,
      row.contentId,
      profileAvatarVariants,
      "sm"
    ),
    username: snapshot.username ?? profile?.username ?? null,
    post_count: snapshotNumber(snapshot, "post_count") ?? Number(profile?.postCount ?? 0),
    follower_count: snapshotNumber(snapshot, "follower_count") ?? Number(profile?.followerCount ?? 0),
    following_count: snapshotNumber(snapshot, "following_count") ?? Number(profile?.followingCount ?? 0),
    joined_at: snapshot.joined_at ?? profile?.createdAt?.toISOString() ?? null,
  };
}

export async function getReportForUser(input: {
  reporterUserId: string;
  reportId: string;
}): Promise<MyReportDetailDto> {
  var rows = await getDb()
    .select()
    .from(reports)
    .where(and(
      eq(reports.id, input.reportId),
      eq(reports.reporterUserId, input.reporterUserId)
    ))
    .limit(1);
  var row = rows[0];
  if (!row) throw notFound("Report was not found");
  return {
    ...toReportDto(row),
    contentSnapshot: await toReporterSnapshot(row),
  };
}

async function captureContentSnapshot(
  tx: Tx,
  contentType: ModerationContentType,
  contentId: string
): Promise<ModerationContentSnapshot> {
  if (contentType === "post") {
    var postRows = await tx
      .select({
        body: posts.body,
        headline: posts.headline,
        media: posts.media,
        authorId: posts.userId,
        visibility: posts.visibility,
        postType: posts.type,
        createdAt: posts.createdAt,
        authorUsername: profiles.username,
        authorDisplayName: profiles.displayName,
        authorAvatarUrl: profiles.avatarUrl,
        authorAvatarVariants: profiles.avatarVariants,
      })
      .from(posts)
      .leftJoin(profiles, eq(profiles.userId, posts.userId))
      .where(and(eq(posts.id, contentId), eq(posts.isDeleted, false)))
      .limit(1);
    var post = postRows[0];
    if (!post) throw notFound("Reported post was not found");
    return {
      body: post.body,
      headline: post.headline,
      media: post.media,
      author_id: post.authorId,
      author_username: post.authorUsername,
      author_display_name: post.authorDisplayName,
      author_avatar_url: post.authorAvatarUrl,
      author_avatar_variants: post.authorAvatarVariants,
      visibility: post.visibility,
      post_type: post.postType,
      created_at: post.createdAt.toISOString(),
    };
  }

  if (contentType === "comment") {
    var commentRows = await tx
      .select({
        body: comments.body,
        authorId: comments.userId,
        postId: comments.postId,
        createdAt: comments.createdAt,
        authorUsername: profiles.username,
        authorDisplayName: profiles.displayName,
        authorAvatarUrl: profiles.avatarUrl,
        authorAvatarVariants: profiles.avatarVariants,
      })
      .from(comments)
      .leftJoin(profiles, eq(profiles.userId, comments.userId))
      .where(and(eq(comments.id, contentId), eq(comments.isDeleted, false)))
      .limit(1);
    var comment = commentRows[0];
    if (!comment) throw notFound("Reported comment was not found");
    return {
      body: comment.body,
      author_id: comment.authorId,
      author_username: comment.authorUsername,
      author_display_name: comment.authorDisplayName,
      author_avatar_url: comment.authorAvatarUrl,
      author_avatar_variants: comment.authorAvatarVariants,
      post_id: comment.postId,
      created_at: comment.createdAt.toISOString(),
    };
  }

  var profileRows = await tx
    .select({
      bio: profiles.bio,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      username: profiles.username,
      postCount: profiles.postCount,
      followerCount: profiles.followerCount,
      followingCount: profiles.followingCount,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(eq(profiles.userId, contentId))
    .limit(1);
  var profile = profileRows[0];
  if (!profile) throw notFound("Reported profile was not found");
  return {
    bio: profile.bio,
    display_name: profile.displayName,
    avatar_url: profile.avatarUrl,
    avatar_variants: profile.avatarVariants,
    username: profile.username,
    post_count: profile.postCount,
    follower_count: profile.followerCount,
    following_count: profile.followingCount,
    joined_at: profile.createdAt.toISOString(),
  };
}

export async function createReport(
  reporterUserId: string,
  input: CreateReportInput
): Promise<CreateReportResult> {
  var now = new Date();
  var result = await getWriteDb().transaction(async function (tx) {
    var contentSnapshot = await captureContentSnapshot(tx, input.contentType, input.contentId);
    var reportValues = {
      id: createUlid(),
      reporterUserId,
      contentType: input.contentType,
      contentId: input.contentId,
      reason: input.reason,
      details: input.details ?? null,
      contentSnapshot,
      status: "open" as const,
      createdAt: now,
      updatedAt: now,
    };
    var inserted = await tx
      .insert(reports)
      .values(reportValues)
      .onConflictDoNothing()
      .returning();

    var row = inserted[0] ?? null;
    if (!row) {
      var findExisting = async function () {
        return tx
          .select()
          .from(reports)
          .where(and(
            eq(reports.reporterUserId, reporterUserId),
            eq(reports.contentType, input.contentType),
            eq(reports.contentId, input.contentId),
            inArray(reports.status, UNRESOLVED_REPORT_STATUSES)
          ))
          .limit(1);
      };
      var existing = await findExisting();
      if (existing[0]) return { row: existing[0], created: false };

      inserted = await tx
        .insert(reports)
        .values({ ...reportValues, id: createUlid() })
        .onConflictDoNothing()
        .returning();
      row = inserted[0] ?? null;
      if (!row) {
        existing = await findExisting();
        if (existing[0]) return { row: existing[0], created: false };
        throw new Error("Report dedupe conflict could not be resolved");
      }
    }

    await tx
      .insert(moderationContentState)
      .values({
        contentType: input.contentType,
        contentId: input.contentId,
        reportCount: 1,
        lastReportedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [moderationContentState.contentType, moderationContentState.contentId],
        set: {
          reportCount: sql`${moderationContentState.reportCount} + 1`,
          lastReportedAt: now,
          updatedAt: now,
        },
      });
    return { row, created: true };
  });

  await enqueueModerationAutoHideCheckJob({
    reportId: result.row.id,
    contentType: result.row.contentType,
    contentId: result.row.contentId,
  });

  return {
    report: toReportDto(result.row),
    created: result.created,
  };
}

export async function getReportsForUser(input: {
  reporterUserId: string;
  cursor?: string;
  limit: number;
}): Promise<ReportPage> {
  var cursor = decodeCompositeCursor(input.cursor);
  var rows = await getDb()
    .select()
    .from(reports)
    .where(and(
      eq(reports.reporterUserId, input.reporterUserId),
      cursor
        ? or(
            lt(reports.createdAt, cursor.createdAt),
            and(eq(reports.createdAt, cursor.createdAt), lt(reports.id, cursor.id))
          )
        : undefined
    ))
    .orderBy(desc(reports.createdAt), desc(reports.id))
    .limit(input.limit + 1);

  var hasMore = rows.length > input.limit;
  var pageRows = rows.slice(0, input.limit);
  var last = pageRows[pageRows.length - 1];
  return {
    items: pageRows.map(toReportDto),
    hasMore,
    nextCursor: hasMore && last
      ? encodeCompositeCursor({ createdAt: last.createdAt, id: last.id })
      : null,
  };
}

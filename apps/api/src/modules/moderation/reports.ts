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
  ReportDto,
  ReportPage,
} from "@35mm/types";
import type { CreateReportInput } from "@35mm/validators";
import { decodeCompositeCursor, encodeCompositeCursor } from "../../lib/cursor.js";
import { getDb, getWriteDb } from "../../lib/db.js";
import { notFound } from "../../lib/errors.js";
import { enqueueModerationAutoHideCheckJob } from "../../lib/jobs.js";
import { createUlid } from "../../lib/ulid.js";

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
      })
      .from(posts)
      .where(and(eq(posts.id, contentId), eq(posts.isDeleted, false)))
      .limit(1);
    var post = postRows[0];
    if (!post) throw notFound("Reported post was not found");
    return {
      body: post.body,
      headline: post.headline,
      media: post.media,
      author_id: post.authorId,
      visibility: post.visibility,
    };
  }

  if (contentType === "comment") {
    var commentRows = await tx
      .select({
        body: comments.body,
        authorId: comments.userId,
        postId: comments.postId,
      })
      .from(comments)
      .where(and(eq(comments.id, contentId), eq(comments.isDeleted, false)))
      .limit(1);
    var comment = commentRows[0];
    if (!comment) throw notFound("Reported comment was not found");
    return {
      body: comment.body,
      author_id: comment.authorId,
      post_id: comment.postId,
    };
  }

  var profileRows = await tx
    .select({
      bio: profiles.bio,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      username: profiles.username,
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
    username: profile.username,
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

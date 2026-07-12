import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import {
  moderationActions,
  moderationContentState,
  profiles,
  reports,
} from "@35mm/db/schema";
import type {
  ModerationActionDto,
  ModerationContentDetailDto,
  ModerationContentSnapshot,
  ModerationContentType,
  ModerationQueueItemDto,
  ModerationQueuePage,
  ModerationReportDetailDto,
  ModerationReportReason,
  ModerationReportStatus,
  ModerationUserStrikesDto,
} from "@35mm/types";
import type {
  ModerationDetailQueryInput,
  ModerationQueueQueryInput,
} from "@35mm/validators";
import { decodeCompositeCursor, encodeCompositeCursor } from "../../lib/cursor.js";
import { getDb } from "../../lib/db.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { resolveModerationTarget } from "./target.js";
import { toModerationActionDto, toModerationContentStateDto } from "./serializer.js";

type QueueCursor = {
  reportCount: number;
  lastReportedAt: string;
  contentType: ModerationContentType;
  contentId: string;
};

type QueueRow = {
  content_type: ModerationContentType;
  content_id: string;
  report_count: number | string;
  last_reported_at: Date | string;
  content_snapshot: ModerationContentSnapshot;
  reasons: Array<{ reason: ModerationReportReason; count: number | string }> | string;
  author_user_id: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  strike_count: number | string | null;
};

function encodeQueueCursor(value: QueueCursor): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeQueueCursor(value: string | undefined): QueueCursor | null {
  if (!value) return null;
  try {
    var parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<QueueCursor>;
    if (
      !Number.isInteger(parsed.reportCount) ||
      typeof parsed.lastReportedAt !== "string" ||
      !["post", "comment", "profile"].includes(parsed.contentType ?? "") ||
      typeof parsed.contentId !== "string" ||
      Number.isNaN(new Date(parsed.lastReportedAt).getTime())
    ) {
      throw new Error("invalid queue cursor");
    }
    return parsed as QueueCursor;
  } catch (_error) {
    throw badRequest("Invalid moderation queue cursor");
  }
}

function dateIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function parseReasons(value: QueueRow["reasons"]): ModerationQueueItemDto["reasons"] {
  var parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) return [];
  return parsed.map(function (item) {
    return { reason: item.reason, count: Number(item.count) };
  });
}

export async function getModerationQueue(
  input: ModerationQueueQueryInput
): Promise<ModerationQueuePage> {
  var status: ModerationReportStatus = input.status ?? "open";
  var cursor = decodeQueueCursor(input.cursor);
  var contentTypeFilter = input.contentType
    ? sql`and r."content_type" = ${input.contentType}::moderation_content_type`
    : sql``;
  var reasonFilter = input.reason
    ? sql`and r."reason" = ${input.reason}::moderation_report_reason`
    : sql``;
  var cursorFilter = cursor
    ? sql`and (
        state."report_count" < ${cursor.reportCount}
        or (state."report_count" = ${cursor.reportCount} and state."last_reported_at" < ${cursor.lastReportedAt}::timestamptz)
        or (state."report_count" = ${cursor.reportCount} and state."last_reported_at" = ${cursor.lastReportedAt}::timestamptz and state."content_type" > ${cursor.contentType}::moderation_content_type)
        or (state."report_count" = ${cursor.reportCount} and state."last_reported_at" = ${cursor.lastReportedAt}::timestamptz and state."content_type" = ${cursor.contentType}::moderation_content_type and state."content_id" > ${cursor.contentId})
      )`
    : sql``;

  var result = await getDb().execute<QueueRow>(sql`
    with candidates as (
      select state."content_type", state."content_id", state."report_count", state."last_reported_at"
      from "moderation_content_state" state
      where state."last_reported_at" is not null
        and exists (
          select 1
          from "reports" r
          where r."content_type" = state."content_type"
            and r."content_id" = state."content_id"
            and r."status" = ${status}::moderation_report_status
            ${contentTypeFilter}
            ${reasonFilter}
        )
        ${cursorFilter}
      order by state."report_count" desc, state."last_reported_at" desc, state."content_type", state."content_id"
      limit ${input.limit + 1}
    )
    select
      candidates."content_type" as content_type,
      candidates."content_id" as content_id,
      candidates."report_count" as report_count,
      candidates."last_reported_at" as last_reported_at,
      latest."content_snapshot" as content_snapshot,
      reason_counts."reasons" as reasons,
      author_profile."user_id"::text as author_user_id,
      author_profile."username" as username,
      author_profile."display_name" as display_name,
      author_profile."avatar_url" as avatar_url,
      author_profile."strike_count" as strike_count
    from candidates
    join lateral (
      select r."content_snapshot"
      from "reports" r
      where r."content_type" = candidates."content_type"
        and r."content_id" = candidates."content_id"
      order by r."created_at" desc, r."id" desc
      limit 1
    ) latest on true
    join lateral (
      select coalesce(
        jsonb_agg(jsonb_build_object('reason', grouped.reason, 'count', grouped.reason_count)
          order by grouped.reason_count desc, grouped.reason),
        '[]'::jsonb
      ) as reasons
      from (
        select r."reason" as reason, count(*)::integer as reason_count
        from "reports" r
        where r."content_type" = candidates."content_type"
          and r."content_id" = candidates."content_id"
          and r."status" = ${status}::moderation_report_status
          ${reasonFilter}
        group by r."reason"
      ) grouped
    ) reason_counts on true
    left join "profiles" author_profile
      on author_profile."user_id" = case
        when candidates."content_type" = 'profile' then candidates."content_id"::uuid
        else (latest."content_snapshot" ->> 'author_id')::uuid
      end
    order by candidates."report_count" desc, candidates."last_reported_at" desc, candidates."content_type", candidates."content_id"
  `);

  var hasMore = result.rows.length > input.limit;
  var pageRows = result.rows.slice(0, input.limit);
  var items = pageRows.map(function (row): ModerationQueueItemDto {
    var authorUserId = row.author_user_id ?? (row.content_type === "profile"
      ? row.content_id
      : String(row.content_snapshot.author_id ?? ""));
    return {
      contentType: row.content_type,
      contentId: row.content_id,
      contentSnapshot: row.content_snapshot,
      reportCount: Number(row.report_count),
      reasons: parseReasons(row.reasons),
      status,
      author: {
        userId: authorUserId,
        username: row.username ?? "deleted-user",
        displayName: row.display_name ?? "Deleted user",
        avatarUrl: row.avatar_url,
      },
      authorStrikeCount: Number(row.strike_count ?? 0),
      lastReportedAt: dateIso(row.last_reported_at),
    };
  });
  var last = items[items.length - 1];
  return {
    items,
    hasMore,
    nextCursor: hasMore && last
      ? encodeQueueCursor({
          reportCount: last.reportCount,
          lastReportedAt: last.lastReportedAt,
          contentType: last.contentType,
          contentId: last.contentId,
        })
      : null,
  };
}

async function getActionPage(input: {
  contentType?: ModerationContentType;
  contentId?: string;
  subjectUserId?: string;
  cursor?: string;
  limit: number;
}): Promise<{ items: ModerationActionDto[]; nextCursor: string | null; hasMore: boolean }> {
  var cursor = decodeCompositeCursor(input.cursor);
  var rows = await getDb()
    .select()
    .from(moderationActions)
    .where(and(
      input.contentType ? eq(moderationActions.contentType, input.contentType) : undefined,
      input.contentId ? eq(moderationActions.contentId, input.contentId) : undefined,
      input.subjectUserId ? eq(moderationActions.subjectUserId, input.subjectUserId) : undefined,
      cursor
        ? or(
            lt(moderationActions.createdAt, cursor.createdAt),
            and(eq(moderationActions.createdAt, cursor.createdAt), lt(moderationActions.id, cursor.id))
          )
        : undefined
    ))
    .orderBy(desc(moderationActions.createdAt), desc(moderationActions.id))
    .limit(input.limit + 1);
  var hasMore = rows.length > input.limit;
  var pageRows = rows.slice(0, input.limit);
  var last = pageRows[pageRows.length - 1];
  return {
    items: pageRows.map(toModerationActionDto),
    hasMore,
    nextCursor: hasMore && last
      ? encodeCompositeCursor({ createdAt: last.createdAt, id: last.id })
      : null,
  };
}

export async function getModerationContentDetail(
  contentType: ModerationContentType,
  contentId: string,
  input: ModerationDetailQueryInput
): Promise<ModerationContentDetailDto> {
  var target = await resolveModerationTarget(getDb(), contentType, contentId);
  var cursor = decodeCompositeCursor(input.reportCursor);
  var reportRows = await getDb()
    .select({
      report: reports,
      reporterUsername: profiles.username,
      reporterDisplayName: profiles.displayName,
      reporterAvatarUrl: profiles.avatarUrl,
    })
    .from(reports)
    .innerJoin(profiles, eq(profiles.userId, reports.reporterUserId))
    .where(and(
      eq(reports.contentType, contentType),
      eq(reports.contentId, contentId),
      cursor
        ? or(
            lt(reports.createdAt, cursor.createdAt),
            and(eq(reports.createdAt, cursor.createdAt), lt(reports.id, cursor.id))
          )
        : undefined
    ))
    .orderBy(desc(reports.createdAt), desc(reports.id))
    .limit(input.limit + 1);

  var reportHasMore = reportRows.length > input.limit;
  var reportPageRows = reportRows.slice(0, input.limit);
  var reportItems = reportPageRows.map(function (row): ModerationReportDetailDto {
    return {
      id: row.report.id,
      contentType: row.report.contentType,
      contentId: row.report.contentId,
      reason: row.report.reason,
      details: row.report.details,
      status: row.report.status,
      createdAt: row.report.createdAt.toISOString(),
      updatedAt: row.report.updatedAt.toISOString(),
      reporter: {
        userId: row.report.reporterUserId,
        username: row.reporterUsername,
        displayName: row.reporterDisplayName,
        avatarUrl: row.reporterAvatarUrl,
      },
      contentSnapshot: row.report.contentSnapshot,
      resolvedActionId: row.report.resolvedActionId,
    };
  });
  var lastReport = reportPageRows[reportPageRows.length - 1]?.report;

  var [stateRows, authorRows, actions, strikeHistory] = await Promise.all([
    getDb().select().from(moderationContentState).where(and(
      eq(moderationContentState.contentType, contentType),
      eq(moderationContentState.contentId, contentId)
    )).limit(1),
    getDb().select({
      userId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      strikeCount: profiles.strikeCount,
    }).from(profiles).where(eq(profiles.userId, target.authorUserId)).limit(1),
    getActionPage({ contentType, contentId, cursor: input.actionCursor, limit: input.limit }),
    getActionPage({ subjectUserId: target.authorUserId, cursor: input.strikeCursor, limit: input.limit }),
  ]);
  var author = authorRows[0];
  if (!author) throw notFound("Moderation target author was not found");
  var state = stateRows[0] ?? {
    contentType,
    contentId,
    status: "visible" as const,
    reportCount: 0,
    lastReportedAt: null,
    hiddenAt: null,
    removedAt: null,
    updatedAt: target.updatedAt,
  };

  return {
    contentType,
    contentId,
    author,
    state: toModerationContentStateDto(state),
    reports: {
      items: reportItems,
      hasMore: reportHasMore,
      nextCursor: reportHasMore && lastReport
        ? encodeCompositeCursor({ createdAt: lastReport.createdAt, id: lastReport.id })
        : null,
    },
    actions,
    strikeHistory,
  };
}

export async function getModerationUserStrikes(input: {
  userId: string;
  cursor?: string;
  limit: number;
}): Promise<ModerationUserStrikesDto> {
  var profileRows = await getDb()
    .select({ strikeCount: profiles.strikeCount })
    .from(profiles)
    .where(eq(profiles.userId, input.userId))
    .limit(1);
  if (!profileRows[0]) throw notFound("Moderation user was not found");
  var page = await getActionPage({
    subjectUserId: input.userId,
    cursor: input.cursor,
    limit: input.limit,
  });
  return {
    userId: input.userId,
    strikeCount: profileRows[0].strikeCount,
    ...page,
  };
}

export var moderationAdminReadInternalsForTest = {
  encodeQueueCursor,
  decodeQueueCursor,
};

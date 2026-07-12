import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  moderationActions,
  moderationContentState,
  moderationNotificationOutbox,
  comments,
  posts,
  profiles,
  reports,
  users,
} from "@35mm/db/schema";
import type {
  ModerationAction,
  ModerationActionDto,
  ModerationActionMetadata,
  ModerationContentStatus,
  ModerationContentType,
} from "@35mm/types";
import type {
  ModerationActionPayloadInput,
  ModerationDismissPayloadInput,
} from "@35mm/validators";
import { getWriteDb } from "../../lib/db.js";
import { conflict, forbidden, serviceUnavailable } from "../../lib/errors.js";
import {
  invalidateAuthorProfileFeedCaches,
  invalidateFeedCacheForGuest,
  invalidateHighFollowerAuthorFeedCache,
  invalidateViewerFeedCaches,
} from "../../lib/feedCache.js";
import { enqueueModerationNotificationOutboxJob } from "../../lib/jobs.js";
import { markModerationProfileStatsDirty, setModerationReadStatus } from "../../lib/moderationRead.js";
import { invalidateProfileStatsCaches } from "../../lib/profileStatsCache.js";
import { roleCanReverseModeration, type StudioRole } from "../../lib/studioAuth.js";
import { createUlid } from "../../lib/ulid.js";
import { toModerationActionDto } from "./serializer.js";
import { resolveModerationTarget } from "./target.js";

type Tx = any;
type ActionRow = typeof moderationActions.$inferSelect;

var STRIKE_ACTIONS = new Set<ModerationAction>([
  "user_warned",
  "user_suspended",
  "user_banned",
  "escalated",
]);

export function moderationActionAddsStrike(action: ModerationAction): boolean {
  return STRIKE_ACTIONS.has(action);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    var record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map(function (key) {
      return JSON.stringify(key) + ":" + canonicalJson(record[key]);
    }).join(",") + "}";
  }
  return JSON.stringify(value);
}

function requestMetadata(value: ModerationActionMetadata): ModerationActionMetadata {
  var next = { ...value };
  delete next.systemAutoHideRestored;
  return next;
}

function desiredContentStatus(action: ModerationAction): ModerationContentStatus | null {
  if (action === "content_hidden") return "hidden";
  if (action === "content_removed") return "removed";
  if (action === "content_warning_added") return "visible";
  return null;
}

function contentStatusRank(status: ModerationContentStatus): number {
  if (status === "visible") return 0;
  if (status === "hidden") return 1;
  return 2;
}

function assertIdempotentMatch(input: {
  existing: ActionRow;
  contentType: ModerationContentType;
  contentId: string;
  action: ModerationAction;
  reason: string;
  notes: string | null;
  metadata: ModerationActionMetadata;
}): void {
  if (
    input.existing.contentType !== input.contentType ||
    input.existing.contentId !== input.contentId ||
    input.existing.action !== input.action ||
    input.existing.reason !== input.reason ||
    input.existing.notes !== input.notes ||
    canonicalJson(requestMetadata(input.existing.metadata)) !== canonicalJson(input.metadata)
  ) {
    throw conflict("Idempotency-Key was already used for a different moderation action");
  }
}

async function lockState(tx: Tx, contentType: ModerationContentType, contentId: string) {
  var result = await tx.execute(sql`
    select *
    from "moderation_content_state"
    where "content_type" = ${contentType}::moderation_content_type
      and "content_id" = ${contentId}
    for update
  `);
  return result.rows[0] as {
    status: ModerationContentStatus;
    hidden_at: Date | null;
    removed_at: Date | null;
  };
}

async function unresolvedPrimaryReportId(
  tx: Tx,
  contentType: ModerationContentType,
  contentId: string
): Promise<string | null> {
  var result = await tx.execute(sql`
    select "id"
    from "reports"
    where "content_type" = ${contentType}::moderation_content_type
      and "content_id" = ${contentId}
      and "status" in ('open', 'reviewing')
    order by "created_at", "id"
    limit 1
    for update
  `);
  return (result.rows[0] as { id?: string } | undefined)?.id ?? null;
}

async function latestStaffActorId(
  tx: Tx,
  contentType: ModerationContentType,
  contentId: string
): Promise<string | null> {
  var rows = await tx
    .select({ actorUserId: moderationActions.actorUserId })
    .from(moderationActions)
    .where(and(
      eq(moderationActions.contentType, contentType),
      eq(moderationActions.contentId, contentId),
      eq(moderationActions.actorType, "staff")
    ))
    .orderBy(desc(moderationActions.createdAt), desc(moderationActions.id))
    .limit(1);
  return rows[0]?.actorUserId ?? null;
}

async function latestEnforcementAction(tx: Tx, contentType: ModerationContentType, contentId: string) {
  var rows = await tx.select({
    actorType: moderationActions.actorType,
    action: moderationActions.action,
    metadata: moderationActions.metadata,
  }).from(moderationActions).where(and(
    eq(moderationActions.contentType, contentType),
    eq(moderationActions.contentId, contentId),
    inArray(moderationActions.action, ["content_hidden", "content_removed", "content_warning_added"])
  )).orderBy(desc(moderationActions.createdAt), desc(moderationActions.id)).limit(1);
  return rows[0] ?? null;
}

async function existingIdempotentAction(
  tx: Tx,
  actorUserId: string,
  idempotencyKey: string
): Promise<ActionRow | null> {
  var rows = await tx
    .select()
    .from(moderationActions)
    .where(and(
      eq(moderationActions.actorUserId, actorUserId),
      eq(moderationActions.idempotencyKey, idempotencyKey)
    ))
    .limit(1);
  return rows[0] ?? null;
}

async function mutateModerationContent(input: {
  contentType: ModerationContentType;
  contentId: string;
  actorUserId: string;
  actorRole: StudioRole;
  idempotencyKey: string;
  action: ModerationAction;
  reason: string;
  notes: string | null;
  metadata: ModerationActionMetadata;
  resolution: "actioned" | "dismissed";
}): Promise<ModerationActionDto> {
  var row: ActionRow;
  try {
    row = await getWriteDb().transaction(async function (tx) {
    await tx.execute(sql`set local lock_timeout = '2s'`);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.actorUserId + ":" + input.idempotencyKey}))`);

    var existing = await existingIdempotentAction(tx, input.actorUserId, input.idempotencyKey);
    if (existing) {
      assertIdempotentMatch({
        existing,
        contentType: input.contentType,
        contentId: input.contentId,
        action: input.action,
        reason: input.reason,
        notes: input.notes,
        metadata: input.metadata,
      });
      return existing;
    }

    var target = await resolveModerationTarget(tx, input.contentType, input.contentId);
    var primaryReportId = await unresolvedPrimaryReportId(tx, input.contentType, input.contentId);
    if (input.resolution === "dismissed" && !primaryReportId) {
      throw conflict("Moderation content has no unresolved reports to dismiss");
    }

    var now = new Date();
    await tx
      .insert(moderationContentState)
      .values({
        contentType: input.contentType,
        contentId: input.contentId,
        reportCount: 0,
        updatedAt: now,
      })
      .onConflictDoNothing();
    var state = await lockState(tx, input.contentType, input.contentId);
    var desiredStatus = desiredContentStatus(input.action);
    var systemAutoHideRestored = false;
    if (input.resolution === "dismissed" && state.status === "hidden") {
      var latestEnforcement = await latestEnforcementAction(tx, input.contentType, input.contentId);
      if (latestEnforcement?.actorType === "system" && latestEnforcement.metadata?.autoHide === true) {
        desiredStatus = "visible";
        systemAutoHideRestored = true;
      }
    }
    if (
      desiredStatus &&
      !systemAutoHideRestored &&
      contentStatusRank(desiredStatus) < contentStatusRank(state.status)
    ) {
      var previousStaffActorId = await latestStaffActorId(tx, input.contentType, input.contentId);
      if (
        previousStaffActorId &&
        previousStaffActorId !== input.actorUserId &&
        !roleCanReverseModeration(input.actorRole)
      ) {
        throw forbidden("Only moderation_admin can reverse another staff member's enforcement action");
      }
    }

    var inserted = await tx
      .insert(moderationActions)
      .values({
        id: createUlid(),
        reportId: primaryReportId,
        contentType: input.contentType,
        contentId: input.contentId,
        actorType: "staff",
        actorUserId: input.actorUserId,
        subjectUserId: target.authorUserId,
        idempotencyKey: input.idempotencyKey,
        action: input.action,
        reason: input.reason,
        notes: input.notes,
        metadata: systemAutoHideRestored
          ? { ...input.metadata, systemAutoHideRestored: true }
          : input.metadata,
        createdAt: now,
      })
      .returning();
    var actionRow = inserted[0];
    if (!actionRow) throw new Error("Moderation action insert failed");

    if (desiredStatus === "visible") {
      await tx.update(moderationContentState).set({
        status: "visible",
        hiddenAt: null,
        removedAt: null,
        updatedAt: now,
      }).where(and(
        eq(moderationContentState.contentType, input.contentType),
        eq(moderationContentState.contentId, input.contentId)
      ));
    } else if (desiredStatus === "hidden") {
      await tx.update(moderationContentState).set({
        status: "hidden",
        hiddenAt: now,
        removedAt: null,
        updatedAt: now,
      }).where(and(
        eq(moderationContentState.contentType, input.contentType),
        eq(moderationContentState.contentId, input.contentId)
      ));
    } else if (desiredStatus === "removed") {
      await tx.update(moderationContentState).set({
        status: "removed",
        removedAt: now,
        updatedAt: now,
      }).where(and(
        eq(moderationContentState.contentType, input.contentType),
        eq(moderationContentState.contentId, input.contentId)
      ));
    }

    if (desiredStatus && input.contentType === "post") {
      await tx.update(posts).set({ moderationStatus: desiredStatus, updatedAt: now })
        .where(eq(posts.id, input.contentId));
    } else if (desiredStatus && input.contentType === "comment") {
      await tx.update(comments).set({ moderationStatus: desiredStatus, updatedAt: now })
        .where(eq(comments.id, input.contentId));
    } else if (desiredStatus && input.contentType === "profile") {
      await tx.update(profiles).set({ moderationStatus: desiredStatus, updatedAt: now })
        .where(eq(profiles.userId, input.contentId));
    }

    if (moderationActionAddsStrike(input.action)) {
      await tx.update(profiles).set({
        strikeCount: sql`${profiles.strikeCount} + 1`,
        updatedAt: now,
      }).where(eq(profiles.userId, target.authorUserId));
    }

    if (input.action === "user_suspended" || input.action === "user_banned") {
      var accountProfileStatus: ModerationContentStatus = input.action === "user_banned" ? "removed" : "hidden";
      await tx.update(users).set({
        status: input.action === "user_banned" ? "banned" : "suspended",
        updatedAt: now,
      })
        .where(eq(users.id, target.authorUserId));
      await tx.update(profiles).set({ moderationStatus: accountProfileStatus, updatedAt: now })
        .where(eq(profiles.userId, target.authorUserId));
      await tx.insert(moderationContentState).values({
        contentType: "profile",
        contentId: target.authorUserId,
        status: accountProfileStatus,
        reportCount: 0,
        hiddenAt: accountProfileStatus === "hidden" ? now : null,
        removedAt: accountProfileStatus === "removed" ? now : null,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [moderationContentState.contentType, moderationContentState.contentId],
        set: {
          status: accountProfileStatus,
          hiddenAt: accountProfileStatus === "hidden" ? now : null,
          removedAt: accountProfileStatus === "removed" ? now : null,
          updatedAt: now,
        },
      });
    }

    await tx.update(reports).set({
      status: input.resolution,
      resolvedActionId: actionRow.id,
      updatedAt: now,
    }).where(and(
      eq(reports.contentType, input.contentType),
      eq(reports.contentId, input.contentId),
      inArray(reports.status, ["open", "reviewing"])
    ));

    await tx.insert(moderationNotificationOutbox).values({
      id: createUlid(),
      actionId: actionRow.id,
      resolution: input.resolution,
      status: "pending",
      availableAt: now,
      createdAt: now,
      updatedAt: now,
    });

      return actionRow;
    });
  } catch (error) {
    var code = (error as { code?: unknown })?.code;
    var message = error instanceof Error ? error.message.toLowerCase() : "";
    if (code === "55P03" || code === "57014" || message.includes("lock timeout")) {
      throw conflict("Moderation target is locked by another action; retry this request");
    }
    throw error;
  }

  await enqueueModerationNotificationOutboxJob();
  var nextStatus = desiredContentStatus(row.action) ??
    (row.metadata?.systemAutoHideRestored === true ? "visible" : null);
  var accountProfileStatus: ModerationContentStatus | null = row.action === "user_banned"
    ? "removed"
    : row.action === "user_suspended"
      ? "hidden"
      : null;
  if (nextStatus || accountProfileStatus) {
    var statusSyncs: Array<Promise<boolean>> = [];
    if (nextStatus) statusSyncs.push(setModerationReadStatus(row.contentType, row.contentId, nextStatus));
    if (accountProfileStatus && row.subjectUserId) {
      statusSyncs.push(setModerationReadStatus("profile", row.subjectUserId, accountProfileStatus));
    }
    var [statusSyncResults, statsGuardSynced] = await Promise.all([
      Promise.all(statusSyncs),
      row.subjectUserId ? markModerationProfileStatsDirty(row.subjectUserId) : Promise.resolve(true),
    ]);
    if (!statusSyncResults.every(Boolean) || !statsGuardSynced) {
      throw serviceUnavailable(
        "MODERATION_CACHE_SYNC_UNAVAILABLE",
        "Moderation enforcement committed but cache synchronization failed; retry this request"
      );
    }
    if (row.subjectUserId) {
      await Promise.all([
        invalidateViewerFeedCaches([row.subjectUserId]),
        invalidateAuthorProfileFeedCaches([row.subjectUserId]),
        invalidateHighFollowerAuthorFeedCache(row.subjectUserId),
        invalidateProfileStatsCaches([row.subjectUserId]),
        invalidateFeedCacheForGuest(),
      ]);
    }
  }
  return toModerationActionDto(row);
}

export async function applyModerationAction(input: {
  contentType: ModerationContentType;
  contentId: string;
  actorUserId: string;
  actorRole: StudioRole;
  idempotencyKey: string;
  payload: ModerationActionPayloadInput;
}): Promise<ModerationActionDto> {
  if (input.payload.action === "no_action") {
    throw conflict("Use the moderation dismiss endpoint for no_action decisions");
  }
  return mutateModerationContent({
    contentType: input.contentType,
    contentId: input.contentId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    idempotencyKey: input.idempotencyKey,
    action: input.payload.action,
    reason: input.payload.reason,
    notes: input.payload.notes ?? null,
    metadata: input.payload.metadata,
    resolution: "actioned",
  });
}

export async function dismissModerationContent(input: {
  contentType: ModerationContentType;
  contentId: string;
  actorUserId: string;
  actorRole: StudioRole;
  idempotencyKey: string;
  payload: ModerationDismissPayloadInput;
}): Promise<ModerationActionDto> {
  return mutateModerationContent({
    contentType: input.contentType,
    contentId: input.contentId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    idempotencyKey: input.idempotencyKey,
    action: "no_action",
    reason: "No policy violation found",
    notes: input.payload.notes ?? null,
    metadata: {},
    resolution: "dismissed",
  });
}

export var moderationActionInternalsForTest = {
  canonicalJson,
  desiredContentStatus,
  contentStatusRank,
  moderationActionAddsStrike,
};

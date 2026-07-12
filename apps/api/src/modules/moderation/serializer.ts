import type { moderationActions, moderationContentState } from "@35mm/db/schema";
import type { ModerationActionDto, ModerationContentStateDto } from "@35mm/types";

type ActionRow = typeof moderationActions.$inferSelect;
type StateRow = typeof moderationContentState.$inferSelect;

export function toModerationActionDto(row: ActionRow): ModerationActionDto {
  return {
    id: row.id,
    reportId: row.reportId,
    contentType: row.contentType,
    contentId: row.contentId,
    actorType: row.actorType,
    actorUserId: row.actorUserId,
    subjectUserId: row.subjectUserId,
    action: row.action,
    reason: row.reason,
    notes: row.notes,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toModerationContentStateDto(row: StateRow): ModerationContentStateDto {
  return {
    contentType: row.contentType,
    contentId: row.contentId,
    status: row.status,
    reportCount: row.reportCount,
    lastReportedAt: row.lastReportedAt?.toISOString() ?? null,
    hiddenAt: row.hiddenAt?.toISOString() ?? null,
    removedAt: row.removedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

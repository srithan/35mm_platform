import type {
  NotificationActor,
  NotificationEntity,
  NotificationItem,
  NotificationPage,
  NotificationType,
} from "@35mm/types";

const NOTIFICATION_TYPES = new Set<NotificationType>([
  "like",
  "comment",
  "reply",
  "follow",
  "follow_request",
  "follow_request_approved",
  "mention",
  "repost",
  "film_logged",
  "chat_reaction",
  "report_status_update",
  "content_moderated",
  "content_under_review",
]);

const ENTITY_TYPES = new Set<NotificationEntity["type"]>([
  "post",
  "comment",
  "user",
  "film",
  "chat_thread",
  null,
]);

function record(value: unknown, contract: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${contract} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, key: string, contract: string): string {
  const field = value[key];
  if (typeof field !== "string" || field.trim().length === 0) {
    throw new Error(`${contract}.${key} must be a non-empty string.`);
  }
  return field;
}

function nullableStringField(value: Record<string, unknown>, key: string, contract: string): string | null {
  const field = value[key];
  if (field === null) return null;
  if (typeof field !== "string") {
    throw new Error(`${contract}.${key} must be a string or null.`);
  }
  return field;
}

function optionalNullableStringField(value: Record<string, unknown>, key: string, contract: string): string | null | undefined {
  if (!(key in value)) return undefined;
  return nullableStringField(value, key, contract);
}

function booleanField(value: Record<string, unknown>, key: string, contract: string): boolean {
  const field = value[key];
  if (typeof field !== "boolean") {
    throw new Error(`${contract}.${key} must be a boolean.`);
  }
  return field;
}

function countField(value: Record<string, unknown>, key: string, contract: string): number {
  const field = value[key];
  if (typeof field !== "number" || !Number.isSafeInteger(field) || field < 0) {
    throw new Error(`${contract}.${key} must be a non-negative integer.`);
  }
  return field;
}

function metadataField(value: Record<string, unknown>, key: string, contract: string): Record<string, unknown> {
  const field = value[key];
  return record(field, `${contract}.${key}`);
}

function parseActor(value: unknown): NotificationActor | null {
  if (value === null) return null;
  const actor = record(value, "NotificationActor");
  return {
    id: stringField(actor, "id", "NotificationActor"),
    username: stringField(actor, "username", "NotificationActor"),
    displayName: stringField(actor, "displayName", "NotificationActor"),
    avatarUrl: nullableStringField(actor, "avatarUrl", "NotificationActor"),
    ...(optionalNullableStringField(actor, "avatarUrlLg", "NotificationActor") !== undefined
      ? { avatarUrlLg: optionalNullableStringField(actor, "avatarUrlLg", "NotificationActor") ?? null }
      : {}),
  };
}

function parseEntity(value: unknown): NotificationEntity | null {
  if (value === null) return null;
  const entity = record(value, "NotificationEntity");
  const type = entity.type;
  if (!ENTITY_TYPES.has(type as NotificationEntity["type"])) {
    throw new Error("NotificationEntity.type is invalid.");
  }
  const contentPreview = optionalNullableStringField(entity, "contentPreview", "NotificationEntity");
  const username = optionalNullableStringField(entity, "username", "NotificationEntity");
  const postId = optionalNullableStringField(entity, "postId", "NotificationEntity");
  return {
    type: type as NotificationEntity["type"],
    id: nullableStringField(entity, "id", "NotificationEntity"),
    title: nullableStringField(entity, "title", "NotificationEntity"),
    thumbnailUrl: nullableStringField(entity, "thumbnailUrl", "NotificationEntity"),
    ...(contentPreview !== undefined ? { contentPreview } : {}),
    ...(username !== undefined ? { username } : {}),
    ...(postId !== undefined ? { postId } : {}),
  };
}

function parseActorProfiles(value: unknown): NotificationItem["actorProfiles"] {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error("NotificationItem.actorProfiles must be an array.");
  }
  return value.map((candidate) => {
    const profile = record(candidate, "NotificationActorProfile");
    return {
      userId: stringField(profile, "userId", "NotificationActorProfile"),
      username: stringField(profile, "username", "NotificationActorProfile"),
      displayName: nullableStringField(profile, "displayName", "NotificationActorProfile"),
      avatarUrl: nullableStringField(profile, "avatarUrl", "NotificationActorProfile"),
      ...(optionalNullableStringField(profile, "avatarUrlLg", "NotificationActorProfile") !== undefined
        ? { avatarUrlLg: optionalNullableStringField(profile, "avatarUrlLg", "NotificationActorProfile") ?? null }
        : {}),
    };
  });
}

export function parseNotificationItem(value: unknown): NotificationItem {
  const item = record(value, "NotificationItem");
  const type = item.type;
  if (!NOTIFICATION_TYPES.has(type as NotificationType)) {
    throw new Error("NotificationItem.type is invalid.");
  }
  const createdAt = stringField(item, "createdAt", "NotificationItem");
  if (!Number.isFinite(Date.parse(createdAt))) {
    throw new Error("NotificationItem.createdAt must be an ISO date.");
  }
  const actorIds = item.actorIds;
  const actorProfiles = parseActorProfiles(item.actorProfiles);
  return {
    id: stringField(item, "id", "NotificationItem"),
    type: type as NotificationType,
    actor: parseActor(item.actor ?? null),
    entity: parseEntity(item.entity ?? null),
    metadata: metadataField(item, "metadata", "NotificationItem"),
    isRead: booleanField(item, "isRead", "NotificationItem"),
    ...(Array.isArray(actorIds)
      ? { actorIds: actorIds.filter((candidate): candidate is string => typeof candidate === "string") }
      : {}),
    ...(actorProfiles !== undefined ? { actorProfiles } : {}),
    bundleCount: countField(item, "bundleCount", "NotificationItem"),
    createdAt,
  };
}

export function parseNotificationPage(value: unknown): NotificationPage {
  const page = record(value, "NotificationPage");
  const items = page.items;
  if (!Array.isArray(items)) {
    throw new Error("NotificationPage.items must be an array.");
  }
  const nextCursor = nullableStringField(page, "nextCursor", "NotificationPage");
  return {
    items: items.map(parseNotificationItem).filter((item) => item.type !== "chat_reaction"),
    nextCursor,
    hasMore: booleanField(page, "hasMore", "NotificationPage"),
  };
}

export function parseMutationOk(value: unknown): { readonly ok: boolean } {
  const payload = record(value, "NotificationMutation");
  return { ok: booleanField(payload, "ok", "NotificationMutation") };
}

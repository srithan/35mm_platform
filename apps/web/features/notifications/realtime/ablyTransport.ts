import * as Ably from "ably";
import type { NotificationRealtimeEvent, NotificationRealtimeTransport } from "./types";
import type { NotificationType } from "@35mm/types";

type AblyMessageData = {
  notificationId?: unknown;
  actorIds?: unknown;
  bundleCount?: unknown;
  type?: unknown;
  entityId?: unknown;
  entityType?: unknown;
};

const ALLOWED_NOTIFICATION_TYPES: readonly NotificationType[] = [
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
] as const;

function parseActorIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  var actors: string[] = [];
  for (var i = 0; i < value.length; i += 1) {
    const candidate = value[i];
    if (typeof candidate === "string" && candidate.trim()) {
      actors.push(candidate.trim());
    }
  }

  return actors;
}

function parseBundleCount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (Math.floor(value) !== value || value < 1) return undefined;
  return value;
}

function parseNotificationType(value: unknown): NotificationType | undefined {
  if (typeof value !== "string") return undefined;
  const maybeType = value.trim() as NotificationType;
  return (ALLOWED_NOTIFICATION_TYPES as readonly string[]).includes(maybeType)
    ? maybeType
    : undefined;
}

function parseEntityType(value: unknown): "post" | "comment" | "user" | "film" | "chat_thread" | null | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  if (
    value === "post" ||
    value === "comment" ||
    value === "user" ||
    value === "film" ||
    value === "chat_thread"
  ) return value;
  return undefined;
}

type AblyNotificationRealtimeTransportInput = {
  userId: string;
  apiKey: string;
};

function parseNotificationId(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (value && typeof value === "object" && "notificationId" in value) {
    var nested = (value as AblyMessageData).notificationId;
    if (typeof nested === "string" && nested.trim()) {
      return nested.trim();
    }
  }

  return "";
}

/** Ably transport for user notification stream. */
export function createAblyNotificationRealtimeTransport(
  input: AblyNotificationRealtimeTransportInput
): NotificationRealtimeTransport {
  var channelName = "user:" + input.userId + ":notifications";
  var realtime: Ably.Realtime | null = null;
  var channel: Ably.RealtimeChannel | null = null;

  function attachChannel() {
    if (!realtime) {
      realtime = new Ably.Realtime({
        key: input.apiKey,
        clientId: input.userId,
        echoMessages: false,
      });
    }

    if (!channel) {
      channel = realtime.channels.get(channelName);
    }
  }

  return {
    connect: function () {
      attachChannel();
      void channel?.attach();
    },
    disconnect: function () {
      void channel?.detach();
      channel = null;
      realtime?.close();
      realtime = null;
    },
    subscribe: function (handler) {
      attachChannel();

      function onMessage(message: Ably.Message): void {
        var data = message.data as AblyMessageData | string | null | undefined;
        var notificationId = parseNotificationId(data);
        if (!notificationId) return;

        var payload = {
          actorIds: data && typeof data === "object" ? parseActorIds((data as AblyMessageData).actorIds) : undefined,
          bundleCount: data && typeof data === "object" ? parseBundleCount((data as AblyMessageData).bundleCount) : undefined,
          notificationType:
            data && typeof data === "object"
              ? parseNotificationType((data as AblyMessageData).type)
              : undefined,
          entityId: data && typeof data === "object" ? (data as AblyMessageData).entityId : undefined,
          entityType: data && typeof data === "object" ? parseEntityType((data as AblyMessageData).entityType) : undefined,
        };

        handler({
          type: "notification.new",
          notificationId,
          actorIds: payload.actorIds,
          bundleCount: payload.bundleCount,
          notificationType: payload.notificationType,
          entityId: typeof payload.entityId === "string" ? payload.entityId.trim() || null : undefined,
          entityType: payload.entityType,
        });
      }

      channel?.subscribe("notification.new", onMessage);

      return function () {
        channel?.unsubscribe("notification.new", onMessage);
      };
    },
  };
}

import type { NotificationType } from "@35mm/types";

type NotificationEntityType = "post" | "comment" | "user" | null;

export type NotificationRealtimeEvent =
  | {
      type: "notification.new";
      notificationId: string;
      actorIds?: string[];
      bundleCount?: number;
      notificationType?: NotificationType;
      entityId?: string | null;
      entityType?: NotificationEntityType;
    }
  | {
      type: "notification.read";
      notificationId: string;
    };

export type NotificationRealtimeUnsubscribe = () => void;

export interface NotificationRealtimeTransport {
  subscribe: (
    handler: (event: NotificationRealtimeEvent) => void
  ) => NotificationRealtimeUnsubscribe;
  connect: () => void;
  disconnect: () => void;
}

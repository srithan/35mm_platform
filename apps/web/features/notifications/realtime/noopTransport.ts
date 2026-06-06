import type { NotificationRealtimeTransport } from "./types";

/** Default until Ably transport is enabled. */
export function createNoopNotificationRealtimeTransport(): NotificationRealtimeTransport {
  return {
    connect: function () {},
    disconnect: function () {},
    subscribe: function () {
      return function () {};
    },
  };
}

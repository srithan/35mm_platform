import type { ChatRealtimeTransport } from "./types";

/** Default until you wire Centrifugo, Pusher, Ably, or native WebSocket. */
export function createNoopChatRealtimeTransport(): ChatRealtimeTransport {
  return {
    connect: function () {},
    disconnect: function () {},
    subscribe: function () {
      return function () {};
    },
  };
}

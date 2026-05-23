/**
 * HTTP implementation of ChatApiClient.
 *
 * Expected REST shape (adjust paths to match your gateway):
 *
 * GET    /v1/chat/conversations?folder=inbox|archived|requests&limit=&cursor=
 * GET    /v1/chat/conversations/:chatId/messages?limit=&cursor=&direction=before|after
 * POST   /v1/chat/conversations/:chatId/messages  (+ Idempotency-Key header)
 * POST   /v1/chat/conversations/:chatId/messages/:messageId/reactions  { "emoji": "👍" }
 * DELETE /v1/chat/conversations/:chatId/messages/:messageId
 * POST   /v1/chat/conversations/:chatId/read
 * PATCH  /v1/chat/conversations/:chatId  { "archived": boolean }
 * DELETE /v1/chat/conversations/:chatId
 * POST   /v1/chat/conversations/:chatId/request  { "action": "accept" | "decline" }
 *
 * Paginated list bodies: { items, nextCursor, hasMore } (camelCase) or extend mapper below.
 */

import type { ChatSendPayload } from "../types";
import { chatHttpJson, type GetAccessToken } from "./http";
import type { ChatApiClient } from "./ChatApiClient";
import type {
  ListConversationsParams,
  ListMessagesParams,
  PaginatedConversations,
  PaginatedMessages,
  SendMessageResult,
} from "./types";

function encodeQuery(q: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  Object.keys(q).forEach(function (k) {
    const v = q[k];
    if (v !== undefined && v !== null && v !== "") {
      p.set(k, String(v));
    }
  });
  const s = p.toString();
  return s ? "?" + s : "";
}

export function createRemoteChatClient(opts: {
  baseUrl: string;
  getAccessToken?: GetAccessToken;
}): ChatApiClient {
  const baseUrl = opts.baseUrl.replace(/\/$/, "");
  const getAccessToken = opts.getAccessToken;

  return {
    listConversations: function (params: ListConversationsParams) {
      const qs = encodeQuery({
        folder: params.folder,
        limit: params.limit,
        cursor: params.cursor || undefined,
      });
      return chatHttpJson<PaginatedConversations>({
        baseUrl: baseUrl,
        path: "/conversations" + qs,
        getAccessToken: getAccessToken,
      });
    },

    listMessages: function (params: ListMessagesParams) {
      const qs = encodeQuery({
        limit: params.limit,
        cursor: params.cursor || undefined,
        direction: params.direction || "before",
      });
      return chatHttpJson<PaginatedMessages>({
        baseUrl: baseUrl,
        path: "/conversations/" + encodeURIComponent(params.chatId) + "/messages" + qs,
        getAccessToken: getAccessToken,
      });
    },

    sendMessage: function (chatId, payload, opts2) {
      return chatHttpJson<SendMessageResult>({
        baseUrl: baseUrl,
        path: "/conversations/" + encodeURIComponent(chatId) + "/messages",
        method: "POST",
        body: payload,
        getAccessToken: getAccessToken,
        idempotencyKey: opts2?.idempotencyKey,
      });
    },

    toggleReaction: function (chatId, messageId, emoji) {
      return chatHttpJson<void>({
        baseUrl: baseUrl,
        path:
          "/conversations/" +
          encodeURIComponent(chatId) +
          "/messages/" +
          encodeURIComponent(messageId) +
          "/reactions",
        method: "POST",
        body: { emoji: emoji },
        getAccessToken: getAccessToken,
      });
    },

    deleteMessage: function (chatId, messageId) {
      return chatHttpJson<void>({
        baseUrl: baseUrl,
        path:
          "/conversations/" +
          encodeURIComponent(chatId) +
          "/messages/" +
          encodeURIComponent(messageId),
        method: "DELETE",
        getAccessToken: getAccessToken,
      });
    },

    markConversationRead: function (chatId) {
      return chatHttpJson<void>({
        baseUrl: baseUrl,
        path: "/conversations/" + encodeURIComponent(chatId) + "/read",
        method: "POST",
        getAccessToken: getAccessToken,
      });
    },

    setConversationArchived: function (chatId, archived) {
      return chatHttpJson<void>({
        baseUrl: baseUrl,
        path: "/conversations/" + encodeURIComponent(chatId),
        method: "PATCH",
        body: { archived: archived },
        getAccessToken: getAccessToken,
      });
    },

    deleteConversation: function (chatId) {
      return chatHttpJson<void>({
        baseUrl: baseUrl,
        path: "/conversations/" + encodeURIComponent(chatId),
        method: "DELETE",
        getAccessToken: getAccessToken,
      });
    },

    respondToConversationRequest: function (chatId, action) {
      return chatHttpJson<void>({
        baseUrl: baseUrl,
        path: "/conversations/" + encodeURIComponent(chatId) + "/request",
        method: "POST",
        body: { action: action },
        getAccessToken: getAccessToken,
      });
    },
  };
}

"use client";

import { useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import type { ChatMessage, ChatPreview } from "../types";
import type { ChatSendPayload } from "../types";
import { getChatApiClient } from "../api/getChatApiClient";
import { folderFromUiFilter } from "../api/ChatApiClient";
import type { ChatFolder } from "../api/types";
import {
  CHAT_PAGE_LIMITS,
  CHAT_QUERY_POLICY,
} from "../config/runtimeConfig";
import { chatQueryKeys } from "../lib/queryKeys";

function client() {
  return getChatApiClient();
}

export function useConversations(opts: {
  folder: ChatFolder;
  enabled?: boolean;
}) {
  const folder = opts.folder;
  return useQuery({
    queryKey: chatQueryKeys.conversations(folder),
    queryFn: function () {
      return client().listConversations({
        folder: folder,
        limit: CHAT_PAGE_LIMITS.conversations,
        cursor: null,
      });
    },
    select: function (data) {
      return data.items;
    },
    staleTime: CHAT_QUERY_POLICY.staleTimeMs,
    gcTime: CHAT_QUERY_POLICY.gcTimeMs,
    enabled: opts.enabled !== false,
  });
}

export function useConversationsByUiFilter(
  filter: "active" | "archived" | "requests",
  enabled?: boolean
) {
  return useConversations({
    folder: folderFromUiFilter(filter),
    enabled: enabled,
  });
}

/**
 * Resolves one thread across inbox / archived / requests without a dedicated
 * GET /conversations/:id yet. Replace with a single query when backend adds it.
 */
export function useConversationRow(chatId: string | null): {
  row: ChatPreview | undefined;
  isLoading: boolean;
} {
  const inbox = useConversations({
    folder: "inbox",
    enabled: Boolean(chatId),
  });
  const archived = useConversations({
    folder: "archived",
    enabled: Boolean(chatId),
  });
  const requests = useConversations({
    folder: "requests",
    enabled: Boolean(chatId),
  });
  const row = useMemo(
    function () {
      if (!chatId) {
        return undefined;
      }
      const pools = [inbox.data, archived.data, requests.data];
      for (let i = 0; i < pools.length; i++) {
        const list = pools[i];
        if (!list) {
          continue;
        }
        for (let j = 0; j < list.length; j++) {
          if (list[j].id === chatId) {
            return list[j];
          }
        }
      }
      return undefined;
    },
    [chatId, inbox.data, archived.data, requests.data]
  );
  const isLoading =
    Boolean(chatId) &&
    (inbox.isLoading || archived.isLoading || requests.isLoading);
  return { row: row, isLoading: isLoading };
}

export function useChatMessages(chatId: string | null) {
  return useQuery({
    queryKey: chatQueryKeys.messages(chatId ?? ""),
    queryFn: function () {
      return client().listMessages({
        chatId: chatId as string,
        limit: CHAT_PAGE_LIMITS.messagesInitial,
        cursor: null,
        direction: "before",
      });
    },
    select: function (data) {
      return data.items;
    },
    enabled: Boolean(chatId),
    staleTime: CHAT_QUERY_POLICY.messagesStaleTimeMs,
    gcTime: CHAT_QUERY_POLICY.messagesGcTimeMs,
  });
}

/**
 * Cursor-paginated message history (prepend older). Wire to intersection observer
 * at the top of `ChatMessageList` when backend is live.
 */
export function useChatMessagesInfinite(chatId: string | null) {
  return useInfiniteQuery({
    queryKey: chatQueryKeys.messagesInfinite(chatId ?? ""),
    queryFn: function ({ pageParam }) {
      return client().listMessages({
        chatId: chatId as string,
        cursor: pageParam,
        limit: CHAT_PAGE_LIMITS.messagesOlder,
        direction: "before",
      });
    },
    initialPageParam: null as string | null,
    getNextPageParam: function (lastPage) {
      if (!lastPage.hasMore) {
        return undefined;
      }
      return lastPage.nextCursor ?? undefined;
    },
    select: function (data) {
      let acc: ChatMessage[] = [];
      for (let i = data.pages.length - 1; i >= 0; i--) {
        acc = acc.concat(data.pages[i].items);
      }
      return acc;
    },
    enabled: Boolean(chatId),
    staleTime: CHAT_QUERY_POLICY.messagesStaleTimeMs,
    gcTime: CHAT_QUERY_POLICY.messagesGcTimeMs,
  });
}

function invalidateAllConversationLists(queryClient: ReturnType<typeof useQueryClient>): void {
  (["inbox", "archived", "requests"] as ChatFolder[]).forEach(function (folder) {
    queryClient.invalidateQueries({
      queryKey: chatQueryKeys.conversations(folder),
    });
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (args: { chatId: string } & ChatSendPayload) {
      const chatId = args.chatId;
      const payload: ChatSendPayload = {
        text: args.text,
        replyToId: args.replyToId,
        gifUrl: args.gifUrl,
        imageDataUrl: args.imageDataUrl,
        file: args.file,
      };
      const key =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "idemp-" + String(Date.now());
      return client().sendMessage(chatId, payload, { idempotencyKey: key });
    },
    onSuccess: function (_data, args) {
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.messages(args.chatId),
      });
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.messagesInfinite(args.chatId),
      });
      invalidateAllConversationLists(queryClient);
    },
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (args: {
      chatId: string;
      messageId: string;
      emoji: string;
    }) {
      return client().toggleReaction(args.chatId, args.messageId, args.emoji);
    },
    onSuccess: function (_data, args) {
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.messages(args.chatId),
      });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (args: { chatId: string; messageId: string }) {
      return client().deleteMessage(args.chatId, args.messageId);
    },
    onSuccess: function (_data, args) {
      queryClient.invalidateQueries({
        queryKey: chatQueryKeys.messages(args.chatId),
      });
      invalidateAllConversationLists(queryClient);
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (chatId: string) {
      return client().markConversationRead(chatId);
    },
    onSuccess: function () {
      invalidateAllConversationLists(queryClient);
    },
  });
}

export function useSetConversationArchived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (args: { chatId: string; archived: boolean }) {
      return client().setConversationArchived(args.chatId, args.archived);
    },
    onSuccess: function () {
      invalidateAllConversationLists(queryClient);
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (chatId: string) {
      return client().deleteConversation(chatId);
    },
    onSuccess: function (_data, chatId) {
      queryClient.removeQueries({
        queryKey: chatQueryKeys.messages(chatId),
      });
      queryClient.removeQueries({
        queryKey: chatQueryKeys.messagesInfinite(chatId),
      });
      invalidateAllConversationLists(queryClient);
    },
  });
}

export function useRespondToConversationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (args: { chatId: string; action: "accept" | "decline" }) {
      const c = client();
      if (!c.respondToConversationRequest) {
        return Promise.resolve();
      }
      return c.respondToConversationRequest(args.chatId, args.action);
    },
    onSuccess: function () {
      invalidateAllConversationLists(queryClient);
    },
  });
}

/** @deprecated Use chatQueryKeys — kept for any external imports */
export const chatKeys = {
  all: chatQueryKeys.root,
  list: function () {
    return chatQueryKeys.conversations("inbox");
  },
  messages: function (chatId: string) {
    return chatQueryKeys.messages(chatId);
  },
};

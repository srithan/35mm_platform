"use client";

import { useMemo, useRef } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import type { ChatMessage, ChatPreview } from "../types";
import type { ChatSendPayload } from "../types";
import type { ChatPresenceState } from "@35mm/types";
import type { ChatReadReceiptState, ChatTypingUser } from "../realtime/state";
import type { CreateThreadParams, PaginatedMessages } from "../api/types";
import type { PaginatedConversations } from "../api/types";
import { getChatApiClient } from "../api/getChatApiClient";
import { folderFromUiFilter } from "../api/ChatApiClient";
import type { ChatFolder } from "../api/types";
import {
  CHAT_PAGE_LIMITS,
  CHAT_QUERY_POLICY,
} from "../config/runtimeConfig";
import { chatQueryKeys } from "../lib/queryKeys";
import { sortChatMessages, upsertChatMessageSorted } from "../lib/sortChatMessages";
import { formatRelativeShort } from "../lib/formatChatTime";
import {
  patchConversationPreviewInPages,
  type ConversationPreviewPatch,
} from "../lib/patchConversationPreview";
import {
  buildOptimisticChatMessage,
  createOptimisticMessageId,
} from "../lib/buildOptimisticChatMessage";

function client() {
  return getChatApiClient();
}

function emptyMessagesPage(): PaginatedMessages {
  return { items: [], nextCursor: null, hasMore: false };
}

function patchMessagesPage(
  prev: PaginatedMessages | undefined,
  patchItems: (items: ChatMessage[]) => ChatMessage[]
): PaginatedMessages {
  var base = prev ?? emptyMessagesPage();
  return {
    ...base,
    items: patchItems(base.items),
  };
}

function patchNewestInfinitePage(
  prev: InfiniteData<PaginatedMessages> | undefined,
  patchItems: (items: ChatMessage[]) => ChatMessage[]
): InfiniteData<PaginatedMessages> | undefined {
  if (!prev || prev.pages.length === 0) {
    return prev;
  }
  return {
    ...prev,
    pages: prev.pages.map(function (page, index) {
      if (index !== 0) {
        return page;
      }
      return patchMessagesPage(page, patchItems);
    }),
  };
}

function flattenConversationPages(
  pages: InfiniteData<PaginatedConversations> | undefined
): ChatPreview[] {
  if (!pages || pages.pages.length === 0) {
    return [];
  }
  const result: ChatPreview[] = [];
  for (var index = 0; index < pages.pages.length; index++) {
    result.push(...pages.pages[index].items);
  }
  return result;
}

function findConversationInPages(
  pages: InfiniteData<PaginatedConversations> | undefined,
  chatId: string | null
): ChatPreview | undefined {
  if (!chatId || !pages) {
    return undefined;
  }
  for (var pageIndex = 0; pageIndex < pages.pages.length; pageIndex++) {
    const row = pages.pages[pageIndex].items.find(function (item) {
      return item.id === chatId;
    });
    if (row) {
      return row;
    }
  }
  return undefined;
}

export function useConversations(opts: {
  folder: ChatFolder;
  enabled?: boolean;
}) {
  const folder = opts.folder;
  return useInfiniteQuery({
    queryKey: chatQueryKeys.conversations(folder),
    queryFn: function ({ pageParam }) {
      return client().listConversations({
        folder: folder,
        limit: CHAT_PAGE_LIMITS.conversations,
        cursor: pageParam,
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
      return flattenConversationPages(data);
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
  const queryClient = useQueryClient();
  const cachedRow = useMemo(
    function () {
      if (!chatId) {
        return undefined;
      }
      for (var folder of ["inbox", "archived", "requests"] as ChatFolder[]) {
        var page = queryClient.getQueryData<InfiniteData<PaginatedConversations>>(
          chatQueryKeys.conversations(folder)
        );
        var row = findConversationInPages(page, chatId);
        if (row) {
          return row;
        }
      }
      return undefined;
    },
    [chatId, queryClient]
  );
  const inbox = useConversations({
    folder: "inbox",
    enabled: Boolean(chatId),
  });
  const inboxRow = useMemo(
    function () {
      return inbox.data?.find(function (item) {
        return item.id === chatId;
      });
    },
    [chatId, inbox.data]
  );
  const archived = useConversations({
    folder: "archived",
    enabled: Boolean(chatId) && !cachedRow && !inboxRow && !inbox.isLoading,
  });
  const archivedRow = useMemo(
    function () {
      return archived.data?.find(function (item) {
        return item.id === chatId;
      });
    },
    [archived.data, chatId]
  );
  const requests = useConversations({
    folder: "requests",
    enabled:
      Boolean(chatId) &&
      !cachedRow &&
      !inboxRow &&
      !archivedRow &&
      !inbox.isLoading &&
      !archived.isLoading,
  });
  const row = useMemo(
    function () {
      if (!chatId) {
        return undefined;
      }
      if (cachedRow) {
        return cachedRow;
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
    [chatId, cachedRow, inbox.data, archived.data, requests.data]
  );
  const isLoading =
    Boolean(chatId) &&
    !row &&
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
      return sortChatMessages(data.items);
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
      return sortChatMessages(acc);
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

function previewFromSendPayload(payload: ChatSendPayload): string {
  if (payload.text.trim()) {
    return payload.text.trim();
  }
  if (payload.gifUrl) {
    return "GIF";
  }
  if (payload.imageDataUrl) {
    return "Photo";
  }
  if (payload.file) {
    return payload.file.name || "File";
  }
  return "Message";
}

function previewFromMessage(message: ChatMessage): string {
  if (message.text.trim()) {
    return message.text.trim();
  }
  if (message.media?.type === "gif") {
    return "GIF";
  }
  if (message.media?.type === "image") {
    return "Photo";
  }
  if (message.file) {
    return message.file.name || "File";
  }
  return "Message";
}

function patchConversationPreviewCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  patch: ConversationPreviewPatch
): boolean {
  let patched = false;
  (["inbox", "archived", "requests"] as ChatFolder[]).forEach(function (folder) {
    queryClient.setQueryData<InfiniteData<PaginatedConversations>>(
      chatQueryKeys.conversations(folder),
      function (prev) {
        const result = patchConversationPreviewInPages(prev, patch);
        patched = patched || result.patched;
        return result.data;
      }
    );
  });
  return patched;
}

function applyViewerReaction(
  reactions: ChatMessage["reactions"] | undefined,
  emoji: string,
  shouldRemove: boolean
): ChatMessage["reactions"] {
  var list = reactions
    ? reactions.map(function (reaction) {
        return {
          emoji: reaction.emoji,
          count: reaction.count,
          includesMe: reaction.includesMe,
        };
      })
    : [];

  if (shouldRemove) {
    return list
      .map(function (reaction) {
        if (reaction.emoji !== emoji || !reaction.includesMe) {
          return reaction;
        }
        return {
          emoji: reaction.emoji,
          count: Math.max(0, reaction.count - 1),
          includesMe: false,
        };
      })
      .filter(function (reaction) {
        return reaction.count > 0;
      });
  }

  var previousMineIndex = list.findIndex(function (reaction) {
    return reaction.includesMe;
  });
  if (previousMineIndex !== -1) {
    var previousMine = list[previousMineIndex];
    list[previousMineIndex] = {
      emoji: previousMine.emoji,
      count: Math.max(0, previousMine.count - 1),
      includesMe: false,
    };
    if (list[previousMineIndex].count <= 0) {
      list.splice(previousMineIndex, 1);
    }
  }

  var nextIndex = list.findIndex(function (reaction) {
    return reaction.emoji === emoji;
  });
  if (nextIndex === -1) {
    list.push({ emoji: emoji, count: 1, includesMe: true });
  } else {
    var nextReaction = list[nextIndex];
    list[nextIndex] = {
      emoji: nextReaction.emoji,
      count: nextReaction.count + 1,
      includesMe: true,
    };
  }
  return list;
}

function shouldRemoveViewerReaction(
  message: ChatMessage | undefined,
  emoji: string
): boolean {
  return Boolean(
    message?.reactions?.some(function (reaction) {
      return reaction.emoji === emoji && reaction.includesMe;
    })
  );
}

function updateMessageInList(
  items: ChatMessage[],
  messageId: string,
  updater: (message: ChatMessage) => ChatMessage
): ChatMessage[] {
  return items.map(function (message) {
    return message.id === messageId ? updater(message) : message;
  });
}

function reconcileViewerReaction(
  message: ChatMessage,
  emoji: string,
  shouldRemove: boolean
): ChatMessage {
  const hasExpectedReaction = Boolean(
    message.reactions?.some(function (reaction) {
      return reaction.emoji === emoji && reaction.includesMe;
    })
  );
  if (hasExpectedReaction === !shouldRemove) {
    return message;
  }
  if (!shouldRemove) {
    var list = message.reactions
      ? message.reactions.map(function (reaction) {
          return {
            emoji: reaction.emoji,
            count: reaction.count,
            includesMe: reaction.includesMe,
          };
        })
      : [];
    var previousMineIndex = list.findIndex(function (reaction) {
      return reaction.includesMe;
    });
    if (previousMineIndex !== -1) {
      var previousMine = list[previousMineIndex];
      list[previousMineIndex] = {
        emoji: previousMine.emoji,
        count: Math.max(0, previousMine.count - 1),
        includesMe: false,
      };
      if (list[previousMineIndex].count <= 0) {
        list.splice(previousMineIndex, 1);
      }
    }
    var nextIndex = list.findIndex(function (reaction) {
      return reaction.emoji === emoji;
    });
    if (nextIndex === -1) {
      list.push({ emoji: emoji, count: 1, includesMe: true });
    } else {
      list[nextIndex] = {
        emoji: list[nextIndex].emoji,
        count: Math.max(1, list[nextIndex].count),
        includesMe: true,
      };
    }
    return {
      ...message,
      reactions: list,
    };
  }
  return {
    ...message,
    reactions: applyViewerReaction(message.reactions, emoji, shouldRemove),
  };
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (params: CreateThreadParams) {
      return client().createThread(params);
    },
    onSuccess: function () {
      invalidateAllConversationLists(queryClient);
    },
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
    onMutate: function (args) {
      const previous = queryClient.getQueryData<PaginatedMessages>(
        chatQueryKeys.messages(args.chatId)
      );
      const previousConversations = {
        inbox: queryClient.getQueryData<InfiniteData<PaginatedConversations>>(
          chatQueryKeys.conversations("inbox")
        ),
        archived: queryClient.getQueryData<InfiniteData<PaginatedConversations>>(
          chatQueryKeys.conversations("archived")
        ),
        requests: queryClient.getQueryData<InfiniteData<PaginatedConversations>>(
          chatQueryKeys.conversations("requests")
        ),
      };
      const optimisticId = createOptimisticMessageId();
      const optimistic = buildOptimisticChatMessage(args, optimisticId);
      void queryClient.cancelQueries({
        queryKey: chatQueryKeys.messages(args.chatId),
      });
      (["inbox", "archived", "requests"] as ChatFolder[]).forEach(function (folder) {
        void queryClient.cancelQueries({
          queryKey: chatQueryKeys.conversations(folder),
        });
      });
      queryClient.setQueryData<PaginatedMessages>(
        chatQueryKeys.messages(args.chatId),
        function (prev) {
          return patchMessagesPage(prev, function (items) {
            return upsertChatMessageSorted(items, optimistic);
          });
        }
      );
      patchConversationPreviewCaches(queryClient, {
        chatId: args.chatId,
        lastMessage: previewFromSendPayload(args),
        lastMessageAt: formatRelativeShort(new Date(optimistic.createdAt)),
        unread: 0,
      });
      return {
        previous: previous,
        previousConversations: previousConversations,
        optimisticId: optimisticId,
      };
    },
    onError: function (_error, args, context) {
      if (context?.previousConversations) {
        (["inbox", "archived", "requests"] as ChatFolder[]).forEach(function (folder) {
          queryClient.setQueryData(
            chatQueryKeys.conversations(folder),
            context.previousConversations[folder]
          );
        });
      }
      if (context?.previous) {
        queryClient.setQueryData(
          chatQueryKeys.messages(args.chatId),
          context.previous
        );
        return;
      }
      if (context?.optimisticId) {
        queryClient.setQueryData<PaginatedMessages>(
          chatQueryKeys.messages(args.chatId),
          function (prev) {
            return patchMessagesPage(prev, function (items) {
              return items.filter(function (m) {
                return m.id !== context.optimisticId;
              });
            });
          }
        );
      }
    },
    onSuccess: function (result, args, context) {
      queryClient.setQueryData<PaginatedMessages>(
        chatQueryKeys.messages(args.chatId),
        function (prev) {
          return patchMessagesPage(prev, function (items) {
            var withoutPending = items.filter(function (m) {
              return m.id !== context?.optimisticId;
            });
            return upsertChatMessageSorted(withoutPending, result.message);
          });
        }
      );
      patchConversationPreviewCaches(queryClient, {
        chatId: args.chatId,
        lastMessage: previewFromMessage(result.message),
        lastMessageAt: formatRelativeShort(new Date(result.message.createdAt)),
        unread: 0,
      });
      queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
        chatQueryKeys.messagesInfinite(args.chatId),
        function (prev) {
          return patchNewestInfinitePage(prev, function (items) {
            var withoutPending = items.filter(function (m) {
              return m.id !== context?.optimisticId;
            });
            return upsertChatMessageSorted(withoutPending, result.message);
          });
        }
      );
      invalidateAllConversationLists(queryClient);
    },
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();
  const pendingReactionIntentsRef = useRef(new Map<string, boolean>());

  function intentKey(args: { chatId: string; messageId: string; emoji: string }): string {
    return args.chatId + ":" + args.messageId + ":" + args.emoji;
  }

  return useMutation({
    mutationFn: function (args: {
      chatId: string;
      messageId: string;
      emoji: string;
    }) {
      const key = intentKey(args);
      const shouldRemove = pendingReactionIntentsRef.current.get(key) ?? false;
      pendingReactionIntentsRef.current.delete(key);
      return client().toggleReaction(
        args.chatId,
        args.messageId,
        args.emoji,
        shouldRemove
      );
    },
    onMutate: async function (args) {
      const previous = queryClient.getQueryData<PaginatedMessages>(
        chatQueryKeys.messages(args.chatId)
      );
      const previousInfinite = queryClient.getQueryData<InfiniteData<PaginatedMessages>>(
        chatQueryKeys.messagesInfinite(args.chatId)
      );
      const message = previous?.items.find(function (item) {
        return item.id === args.messageId;
      });
      const shouldRemove = shouldRemoveViewerReaction(message, args.emoji);
      pendingReactionIntentsRef.current.set(intentKey(args), shouldRemove);
      await queryClient.cancelQueries({
        queryKey: chatQueryKeys.messages(args.chatId),
      });

      queryClient.setQueryData<PaginatedMessages>(
        chatQueryKeys.messages(args.chatId),
        function (prev) {
          if (!prev) {
            return prev;
          }
          return patchMessagesPage(prev, function (items) {
            return updateMessageInList(items, args.messageId, function (item) {
              return {
                ...item,
                reactions: applyViewerReaction(
                  item.reactions,
                  args.emoji,
                  shouldRemove
                ),
              };
            });
          });
        }
      );
      queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
        chatQueryKeys.messagesInfinite(args.chatId),
        function (prev) {
          return patchNewestInfinitePage(prev, function (items) {
            return updateMessageInList(items, args.messageId, function (item) {
              return {
                ...item,
                reactions: applyViewerReaction(
                  item.reactions,
                  args.emoji,
                  shouldRemove
                ),
              };
            });
          });
        }
      );
      return {
        previous: previous,
        previousInfinite: previousInfinite,
        shouldRemove: shouldRemove,
      };
    },
    onError: function (_error, args, context) {
      pendingReactionIntentsRef.current.delete(intentKey(args));
      if (context?.previous) {
        queryClient.setQueryData(
          chatQueryKeys.messages(args.chatId),
          context.previous
        );
      }
      if (context?.previousInfinite) {
        queryClient.setQueryData(
          chatQueryKeys.messagesInfinite(args.chatId),
          context.previousInfinite
        );
      }
    },
    onSuccess: function (message, args, context) {
      if (!message) {
        return;
      }
      const reconciled = reconcileViewerReaction(
        message,
        args.emoji,
        context?.shouldRemove ?? false
      );
      queryClient.setQueryData<PaginatedMessages>(
        chatQueryKeys.messages(args.chatId),
        function (prev) {
          return patchMessagesPage(prev, function (items) {
            return upsertChatMessageSorted(items, reconciled);
          });
        }
      );
      queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
        chatQueryKeys.messagesInfinite(args.chatId),
        function (prev) {
          return patchNewestInfinitePage(prev, function (items) {
            return upsertChatMessageSorted(items, reconciled);
          });
        }
      );
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function (args: {
      chatId: string;
      messageId: string;
      body: string;
    }) {
      return client().editMessage(args.chatId, args.messageId, args.body);
    },
    onSuccess: function (message, args) {
      queryClient.setQueryData<PaginatedMessages>(
        chatQueryKeys.messages(args.chatId),
        function (prev) {
          return patchMessagesPage(prev, function (items) {
            return upsertChatMessageSorted(items, message);
          });
        }
      );
      queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
        chatQueryKeys.messagesInfinite(args.chatId),
        function (prev) {
          return patchNewestInfinitePage(prev, function (items) {
            return upsertChatMessageSorted(items, message);
          });
        }
      );
      invalidateAllConversationLists(queryClient);
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
      queryClient.setQueryData<PaginatedMessages>(
        chatQueryKeys.messages(args.chatId),
        function (prev) {
          return patchMessagesPage(prev, function (items) {
            return items.filter(function (item) {
              return item.id !== args.messageId;
            });
          });
        }
      );
      queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
        chatQueryKeys.messagesInfinite(args.chatId),
        function (prev) {
          return patchNewestInfinitePage(prev, function (items) {
            return items.filter(function (item) {
              return item.id !== args.messageId;
            });
          });
        }
      );
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
    mutationFn: function (args: { chatId: string; lastReadMessageId: string }) {
      return client().markConversationRead(args.chatId, args.lastReadMessageId);
    },
    onSuccess: function () {
      invalidateAllConversationLists(queryClient);
    },
  });
}

export function useChatReadReceiptsSnapshot(
  chatId: string | null,
  opts?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...chatQueryKeys.conversation(chatId ?? ""), "readReceipts"],
    queryFn: function () {
      return client().listReadReceipts(chatId as string);
    },
    select: function (data): ChatReadReceiptState | null {
      var first = data.items[0];
      if (!first) {
        return null;
      }
      return {
        userId: first.userId,
        username: first.username,
        messageId: first.lastReadMessageId,
        readAt: "",
      };
    },
    enabled: Boolean(chatId) && opts?.enabled !== false,
    staleTime: 30_000,
    gcTime: CHAT_QUERY_POLICY.messagesGcTimeMs,
  });
}

export function useSetTyping() {
  return useMutation({
    mutationFn: function (args: { chatId: string; isTyping: boolean }) {
      return client().setTyping(args.chatId, args.isTyping);
    },
    retry: false,
  });
}

export function useChatTypingSnapshot(
  chatId: string | null,
  opts?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...chatQueryKeys.conversation(chatId ?? ""), "typing"],
    queryFn: function () {
      return client().listTypingUsers(chatId as string);
    },
    select: function (data): ChatTypingUser[] {
      return data.items.map(function (item) {
        return {
          userId: item.userId,
          username: item.username,
          avatarUrl: item.avatarUrl,
        };
      });
    },
    enabled: Boolean(chatId) && opts?.enabled === true,
    staleTime: 5_000,
    gcTime: 30_000,
  });
}

export function useChatPresence(
  userIds: Array<string | null | undefined>,
  opts?: { enabled?: boolean }
) {
  const ids = useMemo(
    function () {
      return Array.from(
        new Set(
          userIds
            .filter(function (id): id is string {
              return typeof id === "string" && id.trim().length > 0;
            })
            .map(function (id) {
              return id.trim();
            })
        )
      ).slice(0, 50);
    },
    [userIds]
  );

  return useQuery({
    queryKey: chatQueryKeys.presence(ids),
    queryFn: function () {
      return client().listPresence(ids);
    },
    select: function (data): Record<string, ChatPresenceState> {
      return data.users;
    },
    enabled: ids.length > 0 && opts?.enabled !== false,
    staleTime: 10_000,
    gcTime: 120_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
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

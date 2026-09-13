import { isApiClientError } from "@35mm/api-client";
import {
  AppIcon,
  AppText,
  Avatar,
  Button,
  Chip,
  ConfirmationDialog,
  IconButton,
  LoadingState,
  ModalSurface,
  PaginationFooter,
  StateSurface,
  TextField,
  useMobileUI,
  useToast,
} from "@35mm/mobile-ui";
import { spacing } from "@35mm/design-tokens";
import type { ChatMessage, ChatThreadPreview } from "@35mm/types";
import { FlashList } from "@shopify/flash-list";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import type { CurrentUserBootstrapProfile } from "@/features/auth/bootstrap/api";
import { useApiClient } from "@/services/api";
import {
  createChatThread,
  deleteChatMessage,
  deleteChatThread,
  editChatMessage,
  fetchChatInbox,
  fetchChatMessages,
  fetchChatPresence,
  fetchChatReadReceipts,
  fetchChatTyping,
  markChatThreadRead,
  pingChatPresence,
  presignChatMedia,
  searchChatContacts,
  sendChatMessage,
  setChatReaction,
  setChatThreadArchived,
  setChatThreadMuted,
  setChatTyping,
} from "./api";
import { chatKeys } from "./queryKeys";

type InboxPage = {
  readonly items: ChatThreadPreview[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
};
type MessagesPage = {
  readonly items: ChatMessage[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
};
type InboxData = InfiniteData<InboxPage, string | null>;
type MessagesData = InfiniteData<MessagesPage, string | null>;
type ComposerMode =
  | { readonly type: "send"; readonly replyTo: ChatMessage | null }
  | { readonly type: "edit"; readonly message: ChatMessage };
type StagedImage = {
  readonly uri: string;
  readonly filename: string;
  readonly contentType: string;
  readonly size: number;
  readonly width: number | null;
  readonly height: number | null;
};

const REACTIONS = ["❤️", "🎬", "👏", "🔥", "✨"];
const MAX_CHAT_IMAGE_BYTES = 12 * 1024 * 1024;

function emptyInboxPage(): InboxPage {
  return { items: [], nextCursor: null, hasMore: false };
}

function emptyMessagesPage(): MessagesPage {
  return { items: [], nextCursor: null, hasMore: false };
}

function otherMembers(thread: ChatThreadPreview, currentUserId: string) {
  return thread.members.filter((member) => member.userId !== currentUserId);
}

function threadTitle(thread: ChatThreadPreview, currentUserId: string): string {
  const others = otherMembers(thread, currentUserId);
  if (thread.type === "group") {
    return others.map((member) => member.displayName || member.username).join(", ") || "Group chat";
  }
  return others[0]?.displayName || others[0]?.username || "Conversation";
}

function threadAvatar(thread: ChatThreadPreview, currentUserId: string): string | null {
  return otherMembers(thread, currentUserId)[0]?.avatarUrl ?? null;
}

function relativeTime(value: string | null): string {
  if (!value) return "";
  const elapsed = Math.max(0, Date.now() - Date.parse(value));
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function uniqueThreads(pages: readonly InboxPage[]): ChatThreadPreview[] {
  const seen = new Set<string>();
  return pages.flatMap((page) => page.items.filter((thread) => {
    if (seen.has(thread.id)) return false;
    seen.add(thread.id);
    return true;
  }));
}

function uniqueMessages(pages: readonly MessagesPage[]): ChatMessage[] {
  const seen = new Set<string>();
  return pages
    .flatMap((page) => page.items)
    .filter((message) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    })
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function patchMessage(
  data: MessagesData | undefined,
  message: ChatMessage,
): MessagesData | undefined {
  if (!data) return data;
  let found = false;
  const pages = data.pages.map((page) => ({
    ...page,
    items: page.items.map((item) => {
      if (item.id !== message.id) return item;
      found = true;
      return message;
    }),
  }));
  if (!found && pages[0]) {
    pages[0] = { ...pages[0], items: [message, ...pages[0].items] };
  }
  return { ...data, pages };
}

function removeMessage(
  data: MessagesData | undefined,
  messageId: string,
): MessagesData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((message) =>
        message.id === messageId
          ? { ...message, body: null, mediaUrl: null, isDeleted: true }
          : message,
      ),
    })),
  };
}

function patchThread(
  data: InboxData | undefined,
  threadId: string,
  patch: (thread: ChatThreadPreview) => ChatThreadPreview | null,
): InboxData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.flatMap((thread) => {
        if (thread.id !== threadId) return [thread];
        const next = patch(thread);
        return next ? [next] : [];
      }),
    })),
  };
}

function validateImageAsset(asset: ImagePicker.ImagePickerAsset): StagedImage {
  const contentType = asset.mimeType ?? "image/jpeg";
  if (!contentType.startsWith("image/")) throw new Error("Choose an image file.");
  if (!Number.isSafeInteger(asset.fileSize) || !asset.fileSize || asset.fileSize > MAX_CHAT_IMAGE_BYTES) {
    throw new Error("Chat images must be 12 MB or smaller.");
  }
  return {
    uri: asset.uri,
    filename: asset.fileName?.trim() || "chat-image.jpg",
    contentType,
    size: asset.fileSize,
    width: asset.width > 0 ? asset.width : null,
    height: asset.height > 0 ? asset.height : null,
  };
}

async function uploadChatImage(
  client: ReturnType<typeof useApiClient>,
  image: StagedImage,
): Promise<{ readonly publicUrl: string; readonly metadata: NonNullable<ChatMessage["mediaMetadata"]> }> {
  const presign = await presignChatMedia(client, {
    contentLength: image.size,
    contentType: image.contentType,
  });
  const local = await fetch(image.uri);
  const blob = await local.blob();
  const upload = await fetch(presign.uploadUrl, {
    body: blob,
    headers: {
      "Cache-Control": presign.cacheControl,
      "Content-Type": presign.contentType,
    },
    method: "PUT",
  });
  if (!upload.ok) throw new Error("Image upload failed.");
  return {
    publicUrl: presign.publicUrl,
    metadata: {
      ...(image.width ? { width: image.width } : {}),
      ...(image.height ? { height: image.height } : {}),
      size: image.size,
      mimeType: image.contentType,
    },
  };
}

export function ChatScreen({
  profile,
}: {
  readonly profile: CurrentUserBootstrapProfile;
}) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { theme } = useMobileUI();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [composerMode, setComposerMode] = useState<ComposerMode>({ type: "send", replyTo: null });
  const [stagedImage, setStagedImage] = useState<StagedImage | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [threadActionTarget, setThreadActionTarget] = useState<ChatThreadPreview | null>(null);
  const [messageActionTarget, setMessageActionTarget] = useState<ChatMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [newChatVisible, setNewChatVisible] = useState(false);
  const typingRef = useRef<{
    threadId: string | null;
    isTyping: boolean;
    stopTimer: ReturnType<typeof setTimeout> | null;
  }>({ threadId: null, isTyping: false, stopTimer: null });

  const inboxQuery = useInfiniteQuery({
    queryKey: chatKeys.inbox(showArchived),
    queryFn: ({ pageParam, signal }) => fetchChatInbox(client, { cursor: pageParam, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
    refetchInterval: 30_000,
  });
  const allThreads = useMemo(() => uniqueThreads(inboxQuery.data?.pages ?? []), [inboxQuery.data?.pages]);
  const threads = useMemo(
    () => allThreads.filter((thread) => thread.isArchived === showArchived),
    [allThreads, showArchived],
  );
  const selectedThread = threads.find((thread) => thread.id === selectedThreadId)
    ?? allThreads.find((thread) => thread.id === selectedThreadId)
    ?? threads[0]
    ?? null;

  useEffect(() => {
    const interval = setInterval(() => {
      void pingChatPresence(client).catch(() => undefined);
    }, 45_000);
    void pingChatPresence(client).catch(() => undefined);
    return () => clearInterval(interval);
  }, [client]);

  useEffect(() => () => {
    if (typingRef.current.stopTimer) clearTimeout(typingRef.current.stopTimer);
  }, []);

  const messagesQuery = useInfiniteQuery({
    queryKey: selectedThread ? chatKeys.messages(selectedThread.id) : chatKeys.messages("none"),
    queryFn: ({ pageParam, signal }) => {
      if (!selectedThread) return Promise.resolve(emptyMessagesPage());
      return fetchChatMessages(client, { threadId: selectedThread.id, before: pageParam, signal });
    },
    enabled: Boolean(selectedThread),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
    refetchInterval: selectedThread ? 8_000 : false,
  });
  const messages = useMemo(() => uniqueMessages(messagesQuery.data?.pages ?? []), [messagesQuery.data?.pages]);
  const newestMessageId = messages.at(-1)?.id ?? null;

  useEffect(() => {
    if (!selectedThread || !newestMessageId) return;
    void markChatThreadRead(client, selectedThread.id, newestMessageId)
      .then(() => {
        queryClient.setQueryData<InboxData>(chatKeys.inbox(false), (current) =>
          patchThread(current, selectedThread.id, (thread) => ({ ...thread, unreadCount: 0 })),
        );
      })
      .catch(() => undefined);
  }, [client, newestMessageId, queryClient, selectedThread]);

  const typingQuery = useQuery({
    queryKey: selectedThread ? chatKeys.typing(selectedThread.id) : chatKeys.typing("none"),
    queryFn: ({ signal }) => selectedThread ? fetchChatTyping(client, selectedThread.id, signal) : Promise.resolve({ typingUserIds: [], items: [] }),
    enabled: Boolean(selectedThread),
    refetchInterval: 4_000,
  });
  const receiptsQuery = useQuery({
    queryKey: selectedThread ? chatKeys.receipts(selectedThread.id) : chatKeys.receipts("none"),
    queryFn: ({ signal }) => selectedThread ? fetchChatReadReceipts(client, selectedThread.id, signal) : Promise.resolve({ items: [] }),
    enabled: Boolean(selectedThread),
    refetchInterval: 20_000,
  });
  const visiblePresenceIds = useMemo(
    () => Array.from(new Set(threads.flatMap((thread) => otherMembers(thread, profile.userId).map((member) => member.userId)))).slice(0, 50),
    [profile.userId, threads],
  );
  const presenceQuery = useQuery({
    queryKey: chatKeys.presence(visiblePresenceIds),
    queryFn: ({ signal }) => fetchChatPresence(client, visiblePresenceIds, signal),
    enabled: visiblePresenceIds.length > 0,
    refetchInterval: 30_000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThread) throw new Error("Choose a conversation first.");
      const body = composerText.trim();
      if (!body && !stagedImage) throw new Error("Write a message or attach an image.");
      if (composerMode.type === "edit") {
        if (!body) throw new Error("Edited message cannot be empty.");
        return editChatMessage(client, selectedThread.id, composerMode.message.id, body);
      }
      if (stagedImage) {
        const uploaded = await uploadChatImage(client, stagedImage);
        return sendChatMessage(client, {
          threadId: selectedThread.id,
          body: body || null,
          contentType: "image",
          mediaUrl: uploaded.publicUrl,
          mediaMetadata: uploaded.metadata,
          ...(composerMode.replyTo ? { replyToId: composerMode.replyTo.id } : {}),
        });
      }
      return sendChatMessage(client, {
        threadId: selectedThread.id,
        body,
        contentType: "text",
        ...(composerMode.replyTo ? { replyToId: composerMode.replyTo.id } : {}),
      });
    },
    onSuccess: (message) => {
      if (!selectedThread) return;
      queryClient.setQueryData<MessagesData>(chatKeys.messages(selectedThread.id), (current) =>
        patchMessage(current, message),
      );
      void queryClient.invalidateQueries({ queryKey: chatKeys.inbox(false) });
      setComposerText("");
      setComposerMode({ type: "send", replyTo: null });
      setStagedImage(null);
      setAttachmentError(null);
    },
  });

  const reactionMutation = useMutation({
    mutationFn: ({ message, emoji }: { readonly message: ChatMessage; readonly emoji: string }) => {
      if (!selectedThread) throw new Error("Choose a conversation first.");
      const existing = message.reactions.find((reaction) => reaction.emoji === emoji);
      return setChatReaction(client, {
        threadId: selectedThread.id,
        messageId: message.id,
        emoji,
        selected: !existing?.viewerReacted,
      });
    },
    onSuccess: (message) => {
      if (!selectedThread) return;
      queryClient.setQueryData<MessagesData>(chatKeys.messages(selectedThread.id), (current) =>
        patchMessage(current, message),
      );
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (message: ChatMessage) => {
      if (!selectedThread) throw new Error("Choose a conversation first.");
      await deleteChatMessage(client, selectedThread.id, message.id);
      return message.id;
    },
    onSuccess: (messageId) => {
      if (!selectedThread) return;
      queryClient.setQueryData<MessagesData>(chatKeys.messages(selectedThread.id), (current) =>
        removeMessage(current, messageId),
      );
      setDeleteTarget(null);
      setMessageActionTarget(null);
    },
  });

  const threadStateMutation = useMutation({
    mutationFn: async (input: { readonly thread: ChatThreadPreview; readonly action: "archive" | "unarchive" | "mute" | "unmute" | "delete" }) => {
      if (input.action === "archive") return setChatThreadArchived(client, input.thread.id, true);
      if (input.action === "unarchive") return setChatThreadArchived(client, input.thread.id, false);
      if (input.action === "mute") {
        const mutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000).toISOString();
        return setChatThreadMuted(client, input.thread.id, mutedUntil);
      }
      if (input.action === "unmute") return setChatThreadMuted(client, input.thread.id, null);
      return deleteChatThread(client, input.thread.id);
    },
    onSuccess: (_result, input) => {
      setThreadActionTarget(null);
      queryClient.setQueryData<InboxData>(chatKeys.inbox(showArchived), (current) => {
        if (input.action === "delete") return patchThread(current, input.thread.id, () => null);
        return patchThread(current, input.thread.id, (thread) => ({
          ...thread,
          isArchived: input.action === "archive" ? true : input.action === "unarchive" ? false : thread.isArchived,
          isMuted: input.action === "mute" ? true : input.action === "unmute" ? false : thread.isMuted,
        }));
      });
      void queryClient.invalidateQueries({ queryKey: chatKeys.all });
    },
  });

  const pickImage = async () => {
    setAttachmentError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAttachmentError("Photo library access is required to attach an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: false,
      mediaTypes: ["images"],
      quality: 0.92,
    });
    if (result.canceled) return;
    try {
      setStagedImage(validateImageAsset(result.assets[0]!));
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Image could not be selected.");
    }
  };

  const updateTyping = (value: string) => {
    if (!selectedThread) return;
    const threadId = selectedThread.id;
    const trimmed = value.trim();
    const state = typingRef.current;
    if (state.threadId !== threadId) {
      if (state.stopTimer) clearTimeout(state.stopTimer);
      typingRef.current = { threadId, isTyping: false, stopTimer: null };
    }
    if (trimmed && !typingRef.current.isTyping) {
      typingRef.current.isTyping = true;
      void setChatTyping(client, threadId, true).catch(() => undefined);
    }
    if (typingRef.current.stopTimer) clearTimeout(typingRef.current.stopTimer);
    typingRef.current.stopTimer = setTimeout(() => {
      if (typingRef.current.threadId !== threadId || !typingRef.current.isTyping) return;
      typingRef.current.isTyping = false;
      void setChatTyping(client, threadId, false).catch(() => undefined);
    }, trimmed ? 2_500 : 0);
  };

  if (inboxQuery.isPending && threads.length === 0) {
    return (
      <View style={styles.centered} testID="chat-loading">
        <LoadingState label="Loading chat" />
      </View>
    );
  }

  if (inboxQuery.error && threads.length === 0) {
    const offline = isApiClientError(inboxQuery.error) && ["network", "timeout"].includes(inboxQuery.error.kind);
    return (
      <View style={styles.centered} testID="chat-error">
        <StateSurface
          kind={offline ? "offline" : "error"}
          message={offline ? "Check your connection and retry." : "35mm couldn’t load chat."}
          primaryAction={{ label: "Retry", onPress: () => void inboxQuery.refetch() }}
          title={offline ? "You’re offline" : "Chat unavailable"}
        />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="chat-screen">
      <View style={[styles.inboxPane, { borderRightColor: theme.colors.border }]}>
        <View style={styles.chatToolbar}>
          <View style={styles.chatTitle}>
            <AppText accessibilityRole="header" role="sectionTitle">Messages</AppText>
            <AppText color="textSecondary" role="metadata">Private conversations</AppText>
          </View>
          <IconButton icon="compose" label="New message" onPress={() => setNewChatVisible(true)} />
        </View>
        <View accessibilityRole="tablist" style={styles.filterRow}>
          <Chip accessibilityRole="tab" label="Inbox" onPress={() => setShowArchived(false)} selected={!showArchived} />
          <Chip accessibilityRole="tab" label="Archived" onPress={() => setShowArchived(true)} selected={showArchived} />
        </View>
        <FlashList
          data={threads}
          drawDistance={600}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={(
            <StateSurface
              compact
              kind="empty"
              message={showArchived ? "Archived conversations stay here." : "Start a conversation from followers, following, or search."}
              title={showArchived ? "No archived chats" : "No messages yet"}
            />
          )}
          ListFooterComponent={inboxQuery.hasNextPage ? (
            <PaginationFooter
              state={inboxQuery.isFetchingNextPage ? "loading" : inboxQuery.isFetchNextPageError ? "error" : "idle"}
              retry={() => void inboxQuery.fetchNextPage()}
            />
          ) : null}
          onEndReached={() => {
            if (inboxQuery.hasNextPage && !inboxQuery.isFetchingNextPage) void inboxQuery.fetchNextPage();
          }}
          onEndReachedThreshold={0.7}
          refreshControl={(
            <RefreshControl refreshing={inboxQuery.isRefetching} onRefresh={() => void inboxQuery.refetch()} />
          )}
          renderItem={({ item }) => (
            <ThreadRow
              currentUserId={profile.userId}
              online={otherMembers(item, profile.userId).some((member) => presenceQuery.data?.presence[member.userId])}
              onLongPress={() => setThreadActionTarget(item)}
              onPress={() => setSelectedThreadId(item.id)}
              selected={selectedThread?.id === item.id}
              thread={item}
            />
          )}
        />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 92 : 0}
        style={styles.threadPane}
      >
        {selectedThread ? (
          <>
            <View style={[styles.threadHeader, { borderBottomColor: theme.colors.border }]}>
              <IconButton icon="back" label="Back to conversations" onPress={() => setSelectedThreadId(null)} />
              <Avatar
                avatarSize="small"
                label={`${threadTitle(selectedThread, profile.userId)} avatar`}
                {...(threadAvatar(selectedThread, profile.userId) ? { source: { uri: threadAvatar(selectedThread, profile.userId)! } } : {})}
              />
              <View style={styles.threadHeaderCopy}>
                <AppText numberOfLines={1} role="rowLabel">{threadTitle(selectedThread, profile.userId)}</AppText>
                <AppText color="textSecondary" numberOfLines={1} role="metadata">
                  {typingQuery.data?.items.length
                    ? `${typingQuery.data.items.map((user) => user.username).join(", ")} typing`
                    : selectedThread.isMuted
                      ? "Muted"
                      : selectedThread.isArchived
                        ? "Archived"
                        : "Active now when available"}
                </AppText>
              </View>
              <IconButton icon="more" label="Conversation actions" onPress={() => setThreadActionTarget(selectedThread)} />
            </View>
            <View style={styles.messages}>
              {messagesQuery.isPending && messages.length === 0 ? (
                <LoadingState label="Loading messages" />
              ) : messagesQuery.error && messages.length === 0 ? (
                <StateSurface
                  kind={isApiClientError(messagesQuery.error) && ["network", "timeout"].includes(messagesQuery.error.kind) ? "offline" : "error"}
                  message="Message history could not load."
                  primaryAction={{ label: "Retry", onPress: () => void messagesQuery.refetch() }}
                  title="Thread unavailable"
                />
              ) : (
                <FlashList
                  data={messages}
                  drawDistance={900}
                  keyExtractor={(item) => item.id}
                  ListHeaderComponent={messagesQuery.hasNextPage ? (
                    <PaginationFooter
                      state={messagesQuery.isFetchingNextPage ? "loading" : messagesQuery.isFetchNextPageError ? "error" : "idle"}
                      retry={() => void messagesQuery.fetchNextPage()}
                    />
                  ) : null}
                  onEndReached={() => {
                    if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) void messagesQuery.fetchNextPage();
                  }}
                  onEndReachedThreshold={0.7}
                  renderItem={({ item }) => (
                    <MessageBubble
                      currentUserId={profile.userId}
                      message={item}
                      onAction={() => setMessageActionTarget(item)}
                      onOpenLink={(url) => void Linking.openURL(url)}
                    />
                  )}
                />
              )}
            </View>
            {typingQuery.data?.items.length ? (
              <AppText color="textSecondary" role="metadata" style={styles.typingLine}>
                {typingQuery.data.items.map((user) => user.username).join(", ")} typing…
              </AppText>
            ) : receiptsQuery.data?.items.length ? (
              <AppText color="textSecondary" role="metadata" style={styles.typingLine}>
                Seen by {receiptsQuery.data.items.slice(0, 2).map((receipt) => receipt.username).join(", ")}
              </AppText>
            ) : null}
            <Composer
              attachmentError={attachmentError}
              busy={sendMutation.isPending}
              error={sendMutation.error instanceof Error ? sendMutation.error.message : null}
              image={stagedImage}
              mode={composerMode}
              onCancelMode={() => {
                setComposerMode({ type: "send", replyTo: null });
                setComposerText("");
              }}
              onChangeText={(value) => {
                setComposerText(value);
                updateTyping(value);
              }}
              onPickImage={pickImage}
              onRemoveImage={() => setStagedImage(null)}
              onSend={() => sendMutation.mutate()}
              text={composerText}
            />
          </>
        ) : (
          <View style={styles.centered}>
            <StateSurface
              kind="empty"
              message="Choose a conversation or start a new message."
              primaryAction={{ label: "New message", onPress: () => setNewChatVisible(true) }}
              title="Messages"
            />
          </View>
        )}
      </KeyboardAvoidingView>
      <ThreadActions
        currentUserId={profile.userId}
        loading={threadStateMutation.isPending}
        onAction={(thread, action) => threadStateMutation.mutate({ thread, action })}
        onClose={() => setThreadActionTarget(null)}
        thread={threadActionTarget}
      />
      <MessageActions
        currentUserId={profile.userId}
        message={messageActionTarget}
        onClose={() => setMessageActionTarget(null)}
        onDelete={(message) => setDeleteTarget(message)}
        onEdit={(message) => {
          setComposerMode({ type: "edit", message });
          setComposerText(message.body ?? "");
          setMessageActionTarget(null);
        }}
        onReact={(message, emoji) => reactionMutation.mutate({ message, emoji })}
        onReply={(message) => {
          setComposerMode({ type: "send", replyTo: message });
          setMessageActionTarget(null);
        }}
      />
      {newChatVisible ? (
        <NewChatModal
          currentUserId={profile.userId}
          onClose={() => setNewChatVisible(false)}
          onCreated={(thread) => {
            queryClient.setQueryData<InboxData>(chatKeys.inbox(false), (current) => {
              if (!current) return { pageParams: [null], pages: [{ ...emptyInboxPage(), items: [thread] }] };
              return {
                ...current,
                pages: current.pages.map((page, index) =>
                  index === 0 ? { ...page, items: [thread, ...page.items.filter((item) => item.id !== thread.id)] } : page,
                ),
              };
            });
            setSelectedThreadId(thread.id);
            setNewChatVisible(false);
          }}
        />
      ) : null}
      <ConfirmationDialog
        confirmLabel="Delete"
        destructive
        loading={deleteMessageMutation.isPending}
        message="This replaces the message with a deleted placeholder."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget ? deleteMessageMutation.mutate(deleteTarget) : undefined}
        title="Delete message?"
        visible={Boolean(deleteTarget)}
      />
    </View>
  );
}

function ThreadRow({
  currentUserId,
  online,
  onLongPress,
  onPress,
  selected,
  thread,
}: {
  readonly currentUserId: string;
  readonly online: boolean;
  readonly onLongPress: () => void;
  readonly onPress: () => void;
  readonly selected: boolean;
  readonly thread: ChatThreadPreview;
}) {
  const { theme } = useMobileUI();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.threadRow,
        { backgroundColor: selected ? theme.colors.surfaceSunken : pressed ? theme.colors.surfacePressed : "transparent" },
      ]}
      testID={`chat-thread-${thread.id}`}
    >
      <View>
        <Avatar
          avatarSize="medium"
          label={`${threadTitle(thread, currentUserId)} avatar`}
          {...(threadAvatar(thread, currentUserId) ? { source: { uri: threadAvatar(thread, currentUserId)! } } : {})}
        />
        {online ? <View style={[styles.presenceDot, { backgroundColor: theme.colors.success }]} /> : null}
      </View>
      <View style={styles.threadCopy}>
        <View style={styles.threadLine}>
          <AppText numberOfLines={1} role="rowLabelCompact">{threadTitle(thread, currentUserId)}</AppText>
          <AppText color="textSecondary" role="metadata">{relativeTime(thread.lastMessageAt)}</AppText>
        </View>
        <AppText color={thread.unreadCount > 0 ? "text" : "textSecondary"} numberOfLines={2} role="metadata">
          {thread.lastMessagePreview || "No messages yet."}
        </AppText>
      </View>
      {thread.unreadCount > 0 ? (
        <View style={[styles.unreadBadge, { backgroundColor: theme.colors.accent }]}>
          <AppText color="onAccent" role="counter">{Math.min(thread.unreadCount, 99)}</AppText>
        </View>
      ) : thread.isMuted ? (
        <AppIcon name="bell" color={theme.colors.textTertiary} size="small" />
      ) : null}
    </Pressable>
  );
}

function MessageBubble({
  currentUserId,
  message,
  onAction,
  onOpenLink,
}: {
  readonly currentUserId: string;
  readonly message: ChatMessage;
  readonly onAction: () => void;
  readonly onOpenLink: (url: string) => void;
}) {
  const { theme } = useMobileUI();
  const own = message.senderId === currentUserId;
  const mediaRatio = message.mediaMetadata?.width && message.mediaMetadata.height
    ? message.mediaMetadata.width / message.mediaMetadata.height
    : 4 / 3;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${own ? "Your" : `${message.senderDisplayName}'s`} message`}
      onLongPress={onAction}
      style={[styles.messageRow, own && styles.messageRowOwn]}
    >
      {!own ? (
        <Avatar
          avatarSize="small"
          label={`${message.senderDisplayName} avatar`}
          {...(message.senderAvatarUrl ? { source: { uri: message.senderAvatarUrl } } : {})}
        />
      ) : null}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: own ? theme.colors.accent : theme.colors.surfaceSunken,
            borderColor: own ? theme.colors.accent : theme.colors.border,
          },
        ]}
      >
        {!own ? <AppText role="metadata">{message.senderDisplayName}</AppText> : null}
        {message.replySnapshot ? (
          <View style={[styles.replyPreview, { borderLeftColor: own ? theme.colors.onAccent : theme.colors.accent }]}>
            <AppText color={own ? "onAccent" : "textSecondary"} numberOfLines={1} role="metadata">
              Reply to @{message.replySnapshot.senderUsername}
            </AppText>
            <AppText color={own ? "onAccent" : "textSecondary"} numberOfLines={1} role="metadata">
              {message.replySnapshot.body ?? message.replySnapshot.contentType}
            </AppText>
          </View>
        ) : null}
        {message.isDeleted ? (
          <AppText color={own ? "onAccent" : "textSecondary"} role="metadata">Message deleted</AppText>
        ) : (
          <>
            {message.mediaUrl && (message.contentType === "image" || message.contentType === "gif") ? (
              <Image
                accessibilityLabel="Chat image"
                resizeMode="cover"
                source={{ uri: message.mediaUrl }}
                style={[styles.messageImage, { aspectRatio: mediaRatio }]}
              />
            ) : null}
            {message.mediaUrl && message.contentType === "file" ? (
              <Pressable accessibilityRole="link" onPress={() => onOpenLink(message.mediaUrl!)}>
                <AppText color={own ? "onAccent" : "accent"} role="rowLabelCompact">Open attachment</AppText>
              </Pressable>
            ) : null}
            {message.body ? (
              <AppText color={own ? "onAccent" : "text"}>{message.body}</AppText>
            ) : null}
            {message.linkPreview ? (
              <Pressable accessibilityRole="link" onPress={() => onOpenLink(message.linkPreview!.url)}>
                <AppText color={own ? "onAccent" : "accent"} role="metadata">
                  {message.linkPreview.title ?? message.linkPreview.url}
                </AppText>
              </Pressable>
            ) : null}
          </>
        )}
        <View style={styles.messageMeta}>
          <AppText color={own ? "onAccent" : "textSecondary"} role="metadata">
            {relativeTime(message.createdAt)}{message.editedAt ? " · edited" : ""}
          </AppText>
        </View>
        {message.reactions.length ? (
          <View style={styles.reactionRow}>
            {message.reactions.map((reaction) => (
              <View
                key={reaction.emoji}
                style={[styles.reactionPill, { borderColor: own ? theme.colors.onAccent : theme.colors.border }]}
              >
                <AppText color={own ? "onAccent" : "text"} role="metadata">
                  {reaction.emoji} {reaction.count}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function Composer({
  attachmentError,
  busy,
  error,
  image,
  mode,
  onCancelMode,
  onChangeText,
  onPickImage,
  onRemoveImage,
  onSend,
  text,
}: {
  readonly attachmentError: string | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly image: StagedImage | null;
  readonly mode: ComposerMode;
  readonly onCancelMode: () => void;
  readonly onChangeText: (value: string) => void;
  readonly onPickImage: () => void;
  readonly onRemoveImage: () => void;
  readonly onSend: () => void;
  readonly text: string;
}) {
  const { theme } = useMobileUI();
  const modeLabel = mode.type === "edit"
    ? "Editing message"
    : mode.replyTo
      ? `Replying to @${mode.replyTo.senderUsername}`
      : null;
  return (
    <View style={[styles.composer, { borderTopColor: theme.colors.border }]}>
      {modeLabel ? (
        <View style={[styles.modeBar, { backgroundColor: theme.colors.surfaceSunken }]}>
          <AppText color="textSecondary" numberOfLines={1} role="metadata">{modeLabel}</AppText>
          <IconButton icon="close" label="Cancel reply or edit" onPress={onCancelMode} />
        </View>
      ) : null}
      {image ? (
        <View style={[styles.imagePreview, { borderColor: theme.colors.border }]}>
          <Image accessibilityLabel="Staged chat image" source={{ uri: image.uri }} style={styles.imagePreviewThumb} />
          <View style={styles.imagePreviewCopy}>
            <AppText numberOfLines={1} role="rowLabelCompact">{image.filename}</AppText>
            <AppText color="textSecondary" role="metadata">{Math.round(image.size / 1024)} KB</AppText>
          </View>
          <IconButton icon="trash" label="Remove image" onPress={onRemoveImage} />
        </View>
      ) : null}
      <View style={styles.composerRow}>
        <IconButton disabled={busy || mode.type === "edit"} icon="image" label="Attach image" onPress={onPickImage} />
        <TextField
          containerStyle={styles.composerField}
          editable={!busy}
          {...(error ?? attachmentError ? { errorMessage: error ?? attachmentError ?? "" } : {})}
          label="Message"
          maxLength={4000}
          multiline
          onChangeText={onChangeText}
          placeholder="Message"
          returnKeyType="send"
          value={text}
        />
        <Button disabled={busy || (!text.trim() && !image)} label={mode.type === "edit" ? "Save" : "Send"} loading={busy} onPress={onSend} size="compact" />
      </View>
    </View>
  );
}

function ThreadActions({
  currentUserId,
  loading,
  onAction,
  onClose,
  thread,
}: {
  readonly currentUserId: string;
  readonly loading: boolean;
  readonly onAction: (thread: ChatThreadPreview, action: "archive" | "unarchive" | "mute" | "unmute" | "delete") => void;
  readonly onClose: () => void;
  readonly thread: ChatThreadPreview | null;
}) {
  if (!thread) return null;
  return (
    <ModalSurface accessibilityLabel="Conversation actions" onRequestClose={onClose} showCloseButton visible={Boolean(thread)}>
      <View style={styles.modalContent}>
        <AppText accessibilityRole="header" role="sectionTitle">{threadTitle(thread, currentUserId)}</AppText>
        <Button disabled={loading} fullWidth icon="archive" label={thread.isArchived ? "Unarchive" : "Archive"} onPress={() => onAction(thread, thread.isArchived ? "unarchive" : "archive")} />
        <Button disabled={loading} fullWidth icon="bell" label={thread.isMuted ? "Unmute" : "Mute for 7 days"} onPress={() => onAction(thread, thread.isMuted ? "unmute" : "mute")} variant="secondary" />
        <Button disabled={loading} fullWidth icon="trash" label="Delete conversation" onPress={() => onAction(thread, "delete")} variant="danger" />
      </View>
    </ModalSurface>
  );
}

function MessageActions({
  currentUserId,
  message,
  onClose,
  onDelete,
  onEdit,
  onReact,
  onReply,
}: {
  readonly currentUserId: string;
  readonly message: ChatMessage | null;
  readonly onClose: () => void;
  readonly onDelete: (message: ChatMessage) => void;
  readonly onEdit: (message: ChatMessage) => void;
  readonly onReact: (message: ChatMessage, emoji: string) => void;
  readonly onReply: (message: ChatMessage) => void;
}) {
  if (!message) return null;
  const own = message.senderId === currentUserId;
  return (
    <ModalSurface accessibilityLabel="Message actions" onRequestClose={onClose} showCloseButton visible={Boolean(message)}>
      <View style={styles.modalContent}>
        <AppText accessibilityRole="header" role="sectionTitle">Message</AppText>
        <View style={styles.reactionPicker}>
          {REACTIONS.map((emoji) => (
            <Pressable accessibilityRole="button" key={emoji} onPress={() => onReact(message, emoji)} style={styles.reactionButton}>
              <AppText role="sectionTitle">{emoji}</AppText>
            </Pressable>
          ))}
        </View>
        <Button fullWidth icon="reply" label="Reply" onPress={() => onReply(message)} variant="secondary" />
        {own && !message.isDeleted ? (
          <>
            {message.contentType === "text" ? <Button fullWidth icon="compose" label="Edit" onPress={() => onEdit(message)} variant="secondary" /> : null}
            <Button fullWidth icon="trash" label="Delete" onPress={() => onDelete(message)} variant="danger" />
          </>
        ) : null}
      </View>
    </ModalSurface>
  );
}

function NewChatModal({
  currentUserId,
  onClose,
  onCreated,
}: {
  readonly currentUserId: string;
  readonly onClose: () => void;
  readonly onCreated: (thread: ChatThreadPreview) => void;
}) {
  const client = useApiClient();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 300);
  const contactsQuery = useQuery({
    queryKey: chatKeys.contacts(debounced),
    queryFn: ({ signal }) => searchChatContacts(client, debounced, signal),
    enabled: debounced.length > 0,
    staleTime: 30_000,
  });
  const createMutation = useMutation({
    mutationFn: (userId: string) => createChatThread(client, userId),
    onSuccess: (thread) => {
      showToast({ message: "Conversation ready.", tone: "success" });
      onCreated(thread);
    },
  });
  const contacts = (contactsQuery.data?.users ?? []).filter((user) => user.id !== currentUserId);
  return (
    <ModalSurface accessibilityLabel="New message" onRequestClose={onClose} showCloseButton visible>
      <View style={styles.modalContent}>
        <AppText accessibilityRole="header" role="sectionTitle">New message</AppText>
        <TextField
          label="Search people"
          leadingIcon="search"
          onChangeText={setQuery}
          placeholder="Username or name"
          value={query}
        />
        {contactsQuery.isFetching ? <LoadingState label="Searching people" /> : null}
        <ScrollView style={styles.contactList}>
          {contacts.map((contact) => (
            <Pressable
              accessibilityRole="button"
              key={contact.id}
              onPress={() => createMutation.mutate(contact.id)}
              style={styles.contactRow}
            >
              <Avatar
                avatarSize="small"
                label={`${contact.displayName ?? contact.username} avatar`}
                {...(contact.avatarUrl ? { source: { uri: contact.avatarUrl } } : {})}
              />
              <View style={styles.contactCopy}>
                <AppText role="rowLabelCompact">{contact.displayName ?? contact.username}</AppText>
                <AppText color="textSecondary" role="metadata">@{contact.username}</AppText>
              </View>
              <AppIcon name="message" />
            </Pressable>
          ))}
          {debounced && !contactsQuery.isFetching && contacts.length === 0 ? (
            <StateSurface compact kind="empty" message="Try a username or display name." title="No people found" />
          ) : null}
          {createMutation.error ? (
            <AppText color="destructive" role="metadata">
              {createMutation.error instanceof Error ? createMutation.error.message : "Conversation could not be created."}
            </AppText>
          ) : null}
        </ScrollView>
      </View>
    </ModalSurface>
  );
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);
  return debounced;
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    maxWidth: "82%",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.screenHorizontal,
  },
  chatTitle: {
    flex: 1,
  },
  chatToolbar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
    padding: 10,
  },
  composerField: {
    flex: 1,
  },
  composerRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
  },
  contactCopy: {
    flex: 1,
  },
  contactList: {
    maxHeight: 360,
  },
  contactRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
  },
  imagePreview: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    padding: 8,
  },
  imagePreviewCopy: {
    flex: 1,
  },
  imagePreviewThumb: {
    borderRadius: 8,
    height: 52,
    width: 52,
  },
  inboxPane: {
    borderRightWidth: StyleSheet.hairlineWidth,
    flex: 0.95,
    minWidth: 150,
  },
  messageImage: {
    borderRadius: 12,
    maxHeight: 280,
    width: 244,
  },
  messageMeta: {
    alignItems: "flex-end",
  },
  messageRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messages: {
    flex: 1,
  },
  modalContent: {
    gap: 14,
    padding: 18,
  },
  modeBar: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  presenceDot: {
    borderColor: "white",
    borderRadius: 5,
    borderWidth: 1,
    bottom: 0,
    height: 10,
    position: "absolute",
    right: 0,
    width: 10,
  },
  reactionButton: {
    alignItems: "center",
    borderRadius: 14,
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
  },
  reactionPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reactionPill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  reactionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  replyPreview: {
    borderLeftWidth: 2,
    gap: 2,
    paddingLeft: 8,
  },
  root: {
    flex: 1,
    flexDirection: "row",
  },
  threadCopy: {
    flex: 1,
    gap: 3,
  },
  threadHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 8,
  },
  threadHeaderCopy: {
    flex: 1,
  },
  threadLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  threadPane: {
    flex: 1.35,
  },
  threadRow: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 8,
    minHeight: 74,
    padding: 10,
  },
  typingLine: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  unreadBadge: {
    alignItems: "center",
    borderRadius: 999,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});

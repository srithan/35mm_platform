import type { NotificationItem, NotificationPage } from "@35mm/types";
import {
  AppIcon,
  AppText,
  Avatar,
  Button,
  Chip,
  IconButton,
  LoadingState,
  PaginationFooter,
  StateSurface,
  useMobileUI,
} from "@35mm/mobile-ui";
import { spacing } from "@35mm/design-tokens";
import { isApiClientError } from "@35mm/api-client";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, StyleSheet, View } from "react-native";

import { useApiClient } from "@/services/api";
import {
  fetchNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
} from "./api";
import { notificationKeys } from "./queryKeys";

type NotificationFilter = "all" | "unread";

function actorSummary(item: NotificationItem): string {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const profile of item.actorProfiles ?? []) {
    if (seen.has(profile.userId)) continue;
    seen.add(profile.userId);
    const label = profile.displayName?.trim() || profile.username;
    if (label) names.push(label);
  }
  const fallback = item.actor?.displayName || item.actor?.username;
  if (names.length === 0 && fallback) names.push(fallback);
  if (names.length === 0) return "Someone";
  const total = Math.max(item.bundleCount, names.length, 1);
  if (total <= 1 || names.length === 1) return names[0] ?? "Someone";
  if (total === 2) return `${names[0] ?? "Someone"} and ${names[1] ?? "someone"}`;
  return `${names[0] ?? "Someone"}, ${names[1] ?? "someone"} and ${Math.max(total - 2, 1)} others`;
}

function actionSummary(item: NotificationItem): string {
  if (item.type === "report_status_update") {
    return item.metadata.outcome === "actioned"
      ? "We reviewed your report and took action"
      : "We reviewed your report";
  }
  if (item.type === "content_under_review") return "Your content is under review";
  if (item.type === "content_moderated") return "Your content was moderated";
  if (item.type === "follow") return "started following you";
  if (item.type === "follow_request") return "requested to follow you";
  if (item.type === "follow_request_approved") return "approved your follow request";
  if (item.type === "like") return item.entity?.type === "comment" ? "liked your comment" : "liked your post";
  if (item.type === "comment") return "commented on your post";
  if (item.type === "reply") return "replied to your comment";
  if (item.type === "mention") return item.entity?.type === "comment" ? "mentioned you in a comment" : "mentioned you in a post";
  if (item.type === "repost") return "reposted your post";
  if (item.type === "film_logged") return "logged a film you watched";
  return "interacted with you";
}

function relativeTime(value: string): string {
  const elapsed = Math.max(0, Date.now() - Date.parse(value));
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function readableDestination(item: NotificationItem): string | null {
  if (item.entity?.type === "comment" && item.entity.postId) return item.entity.postId;
  if (item.entity?.type === "post" && item.entity.id) return item.entity.id;
  return null;
}

function uniqueItems(pages: readonly NotificationPage[]): NotificationItem[] {
  const seen = new Set<string>();
  return pages.flatMap((page) => page.items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }));
}

function patchPages(
  page: NotificationPage,
  notificationId: string,
  patch: (item: NotificationItem) => NotificationItem | null,
): NotificationPage {
  return {
    ...page,
    items: page.items.flatMap((item) => {
      if (item.id !== notificationId) return [item];
      const next = patch(item);
      return next ? [next] : [];
    }),
  };
}

export function NotificationsScreen() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { theme } = useMobileUI();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const unreadOnly = filter === "unread";
  const query = useInfiniteQuery({
    queryKey: notificationKeys.page(unreadOnly),
    queryFn: ({ pageParam, signal }) =>
      fetchNotificationsPage(client, { cursor: pageParam, unreadOnly, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
  });
  const items = useMemo(() => uniqueItems(query.data?.pages ?? []), [query.data?.pages]);
  const unreadCount = items.filter((item) => !item.isRead).length;

  const readMutation = useMutation({
    mutationFn: ({ id, read }: { readonly id: string; readonly read: boolean }) =>
      markNotificationRead(client, id, read),
    onMutate: async ({ id, read }) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.page(unreadOnly) });
      const previous = queryClient.getQueryData<{ pages: NotificationPage[]; pageParams: unknown[] }>(
        notificationKeys.page(unreadOnly),
      );
      queryClient.setQueryData<{ pages: NotificationPage[]; pageParams: unknown[] }>(
        notificationKeys.page(unreadOnly),
        (current) => current
          ? {
              ...current,
              pages: current.pages.map((page) =>
                patchPages(page, id, (item) => unreadOnly && read ? null : { ...item, isRead: read }),
              ),
            }
          : current,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.page(unreadOnly), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(client),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.page(unreadOnly) });
      const previous = queryClient.getQueryData<{ pages: NotificationPage[]; pageParams: unknown[] }>(
        notificationKeys.page(unreadOnly),
      );
      queryClient.setQueryData<{ pages: NotificationPage[]; pageParams: unknown[] }>(
        notificationKeys.page(unreadOnly),
        (current) => current
          ? {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                items: unreadOnly ? [] : page.items.map((item) => ({ ...item, isRead: true })),
              })),
            }
          : current,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.page(unreadOnly), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  if (query.isPending) {
    return (
      <View style={styles.centered} testID="notifications-loading">
        <LoadingState label="Loading notifications" />
      </View>
    );
  }

  if (query.error && items.length === 0) {
    const offline = isApiClientError(query.error) && ["network", "timeout"].includes(query.error.kind);
    return (
      <View style={styles.centered} testID="notifications-error">
        <StateSurface
          kind={offline ? "offline" : "error"}
          message={offline ? "Check your connection and retry." : "35mm couldn’t load notifications."}
          primaryAction={{ label: "Retry", onPress: () => void query.refetch() }}
          title={offline ? "You’re offline" : "Notifications unavailable"}
        />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="notifications-screen">
      <View style={[styles.toolbar, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.filters}>
          <Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} />
          <Chip label="Unread" selected={filter === "unread"} onPress={() => setFilter("unread")} />
        </View>
        <Button
          disabled={unreadCount === 0 || markAllMutation.isPending}
          label="Mark all read"
          onPress={() => markAllMutation.mutate()}
          size="compact"
          variant="ghost"
        />
      </View>
      <FlashList
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <StateSurface
            kind="empty"
            message={unreadOnly ? "You are caught up." : "Likes, follows, replies, mentions, and requests will land here."}
            title={unreadOnly ? "No unread notifications" : "No notifications yet"}
          />
        }
        ListFooterComponent={
          <PaginationFooter
            state={query.isFetchingNextPage ? "loading" : query.isFetchNextPageError ? "error" : query.hasNextPage ? "idle" : "complete"}
            retry={() => void query.fetchNextPage()}
          />
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.7}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => void query.refetch()}
            tintColor={theme.colors.accent}
          />
        }
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            onOpen={() => {
              const postId = readableDestination(item);
              if (!item.isRead) readMutation.mutate({ id: item.id, read: true });
              if (postId) {
                router.push({ pathname: "/post/[postId]", params: { postId } });
              }
            }}
            onToggleRead={() => readMutation.mutate({ id: item.id, read: !item.isRead })}
            togglePending={readMutation.isPending}
          />
        )}
      />
    </View>
  );
}

function NotificationRow({
  item,
  onOpen,
  onToggleRead,
  togglePending,
}: {
  readonly item: NotificationItem;
  readonly onOpen: () => void;
  readonly onToggleRead: () => void;
  readonly togglePending: boolean;
}) {
  const { theme } = useMobileUI();
  const actor = item.actor;
  const actorLabel = actorSummary(item);
  const title = item.type === "content_moderated" ||
    item.type === "content_under_review" ||
    item.type === "report_status_update"
    ? actionSummary(item)
    : `${actorLabel} ${actionSummary(item)}`;
  const preview = item.entity?.contentPreview || item.entity?.title;
  const hasPostDestination = readableDestination(item) !== null;
  return (
    <Pressable
      accessibilityLabel={`${title}, ${relativeTime(item.createdAt)}${item.isRead ? "" : ", unread"}`}
      accessibilityRole={hasPostDestination ? "button" : "summary"}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: !item.isRead
            ? theme.colors.surfaceSunken
            : pressed
              ? theme.colors.surfacePressed
              : theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.avatarSlot}>
        {actor ? (
          <Avatar
            avatarSize="medium"
            label={`${actor.displayName} avatar`}
            {...(actor.avatarUrl ? { source: { uri: actor.avatarUrl } } : {})}
          />
        ) : (
          <View style={[styles.systemIcon, { backgroundColor: theme.colors.fill }]}>
            <AppIcon name="bell" color={theme.colors.textSecondary} />
          </View>
        )}
        {!item.isRead ? <View style={[styles.unreadDot, { backgroundColor: theme.colors.accent }]} /> : null}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <AppText numberOfLines={2} role="rowLabelCompact" style={styles.rowTitle}>
            {title}
          </AppText>
          <AppText color="textSecondary" role="metadata">
            {relativeTime(item.createdAt)}
          </AppText>
        </View>
        {preview ? (
          <AppText color="textSecondary" numberOfLines={2} role="metadata">
            {preview}
          </AppText>
        ) : null}
      </View>
      {item.entity?.thumbnailUrl ? (
        <Image
          accessibilityLabel={item.entity.title ? `${item.entity.title} thumbnail` : "Notification thumbnail"}
          source={{ uri: item.entity.thumbnailUrl }}
          style={styles.thumbnail}
        />
      ) : null}
      <IconButton
        disabled={togglePending}
        icon={item.isRead ? "mail" : "check"}
        label={item.isRead ? "Mark notification as unread" : "Mark notification as read"}
        onPress={onToggleRead}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatarSlot: {
    minWidth: 48,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
  },
  filters: {
    flexDirection: "row",
    gap: 8,
  },
  root: {
    flex: 1,
  },
  row: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 78,
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: 12,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    flex: 1,
  },
  rowTitleLine: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  systemIcon: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  thumbnail: {
    borderRadius: 8,
    height: 48,
    width: 48,
  },
  toolbar: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: spacing.screenHorizontal,
  },
  unreadDot: {
    borderRadius: 5,
    height: 10,
    position: "absolute",
    right: 1,
    top: 1,
    width: 10,
  },
});

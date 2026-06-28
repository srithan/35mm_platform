"use client";

import { TopStickyBar } from "@/components/TopStickyBar/TopStickyBar";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button/Button";
import { NotificationGroup } from "@/features/notifications/components/NotificationGroup";
import { NotificationItem } from "@/features/notifications/components/NotificationItem";
import { FollowRequestsTray } from "@/features/notifications/components/FollowRequestsTray";
import {
  type AvatarItem,
  type NotificationTextPart,
  type NotificationRecord,
} from "@/features/notifications/data/notificationsData";
import {
  acceptFollowRequest,
  declineFollowRequest,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/api/notificationsApi";
import { notificationsKeys } from "@/features/notifications/hooks/queryKeys";
import { getNotificationDestination } from "@/features/notifications/utils/notificationDestination";
import type { NotificationItem as ApiNotificationItem, NotificationPage } from "@35mm/types";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

interface NotificationRecordWithCreatedAt extends NotificationRecord {
  createdAt: string;
  destinationHref: string;
  followRequestUserId?: string;
}

interface NotificationGroupRecord {
  dateLabel: string;
  items: NotificationRecordWithCreatedAt[];
}

function initialForName(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

  return initials.length > 0 ? initials.slice(0, 2) : "?";
}

function colorFromSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) & 0xffffffff;
  }
  const hue = Math.abs(hash) % 360;
  const secondaryHue = (hue + 24) % 360;

  return `linear-gradient(135deg, hsl(${hue} 70% 42%), hsl(${secondaryHue} 68% 55%))`;
}
function actorSummary(item: ApiNotificationItem): string {
  const actorProfiles = item.actorProfiles ?? [];

  const names: string[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < actorProfiles.length; index += 1) {
    const profile = actorProfiles[index];
    const actorId = profile.userId;
    if (!actorId || seen.has(actorId)) continue;

    const label = profile.displayName || profile.username;
    seen.add(actorId);

    if (label) {
      names.push(label);
    }
  }

  const fallbackActor = item.actor?.displayName || item.actor?.username;
  if (names.length === 0 && fallbackActor) {
    names.push(fallbackActor);
  }

  if (names.length === 0) {
    return "Someone";
  }

  const total = Math.max(item.bundleCount, names.length, 1);

  if (total <= 1 || names.length === 1) {
    return names[0] ?? "Someone";
  }

  if (total === 2) {
    return `${names[0] ?? "Someone"} and ${names[1] ?? "Someone"}`;
  }

  return `${names[0] ?? "Someone"}, ${names[1] ?? "Someone"} and ${Math.max(total - 2, 1)} others`;
}

function extractFollowRequestUserId(item: ApiNotificationItem): string | undefined {
  if (item.type !== "follow_request") return undefined;

  return (
    item.actor?.id ||
    item.entity?.id ||
    item.actorProfiles?.[0]?.userId
  );
}

function activityText(item: ApiNotificationItem): NotificationTextPart[] {
  const textParts: NotificationTextPart[] = [
    {
      type: "user",
      value: actorSummary(item),
    },
  ];

  if (item.type === "follow") {
    textParts.push({ type: "text", value: " started following you" });
  } else if (item.type === "follow_request") {
    textParts.push({ type: "text", value: " requested to follow you" });
  } else if (item.type === "follow_request_approved") {
    textParts.push({ type: "text", value: " approved your follow request" });
  } else if (item.type === "like") {
    if (item.entity?.type === "comment") {
      if (item.entity?.title) {
        textParts.push({ type: "text", value: " liked your comment on " });
        textParts.push({ type: "strong", value: item.entity.title });
      } else {
        textParts.push({ type: "text", value: " liked your comment" });
      }
    } else {
      textParts.push({ type: "text", value: " liked your " });
      textParts.push({
        type: item.entity?.title ? "film" : "strong",
        value: item.entity?.title ?? "post",
      });
    }
  } else if (item.type === "comment") {
    textParts.push({ type: "text", value: " commented on your " });
    textParts.push({ type: item.entity?.title ? "film" : "strong", value: item.entity?.title ?? "post" });
  } else if (item.type === "reply") {
    textParts.push({ type: "text", value: " replied to your comment" });
  } else if (item.type === "mention") {
    textParts.push({ type: "text", value: " mentioned you" });
  } else if (item.type === "repost") {
    textParts.push({ type: "text", value: " reposted your " });
    textParts.push({ type: item.entity?.title ? "film" : "strong", value: item.entity?.title ?? "post" });
  } else if (item.type === "film_logged") {
    textParts.push({ type: "text", value: " logged " });
    textParts.push({ type: item.entity?.title ? "film" : "strong", value: item.entity?.title ?? "a film you logged" });
  } else {
    textParts.push({ type: "text", value: " interacted with you" });
  }

  return textParts;
}

function relativeTime(isoDate: string): string {
  const when = Date.parse(isoDate);
  if (Number.isNaN(when)) return "now";

  const diff = Date.now() - when;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 86_400_000 * 7) return `${Math.floor(diff / 86_400_000)}d ago`;

  return new Date(isoDate).toLocaleDateString();
}

function labelForDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "Recent";

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const day = new Date(parsed);
  day.setHours(0, 0, 0, 0);

  if (day.getTime() === today.getTime()) return "Today";
  if (day.getTime() === yesterday.getTime()) return "Yesterday";

  const diffDays = Math.floor((today.getTime() - day.getTime()) / (86_400_000));
  if (diffDays <= 6) return "This Week";

  if (parsed.getFullYear() === now.getFullYear()) {
    return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function notificationToRecord(item: ApiNotificationItem): NotificationRecordWithCreatedAt {
  const textParts = activityText(item);

  const actorUsername = item.actor?.username;
  const avatarSeed = actorUsername || item.actor?.id || item.id;
  const avatarBg = colorFromSeed(avatarSeed ?? item.id);
  const avatarText = actorUsername ? initialForName(actorUsername) : item.id.slice(0, 2).toUpperCase();

  return {
    id: item.id,
    destinationHref: getNotificationDestination(item),
    unread: !item.isRead,
    followRequestUserId: extractFollowRequestUserId(item),
    avatar: {
      initial: avatarText,
      bg: avatarBg,
      color: "#e8d6c7",
      avatarUrl: item.actor?.avatarUrl ?? null,
    } as AvatarItem,
    time: relativeTime(item.createdAt),
    createdAt: item.createdAt,
    preview: item.entity?.type === "comment" ? item.entity.title ?? undefined : undefined,
    thumbnail: item.entity?.thumbnailUrl ?? undefined,
    thumbnailAlt: item.entity?.title ?? undefined,
    contentParts: textParts,
  };
}

function groupNotificationsByDate(items: NotificationRecordWithCreatedAt[]): NotificationGroupRecord[] {
  const byDate = new Map<string, NotificationRecordWithCreatedAt[]>();
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const key = labelForDate(item.createdAt);
    const list = byDate.get(key);
    if (list) {
      list.push(item);
    } else {
      byDate.set(key, [item]);
    }
  }

  return Array.from(byDate.entries()).map(function (entry) {
    return {
      dateLabel: entry[0],
      items: entry[1],
    };
  });
}

export function NotificationsContent() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: notificationsKeys.content(),
    queryFn: async function () {
      return fetchNotifications({
        token: await getToken(),
        limit: 30,
      });
    },
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 15_000,
    refetchInterval: 5_000,
  });

  const data = notificationsQuery.data as NotificationPage | undefined;
  const hasItems = (data?.items?.length ?? 0) > 0;

  const markOne = useMutation({
    mutationFn: async function (notificationId: string) {
      return markNotificationRead({
        token: await getToken(),
        notificationId,
      });
    },
    onMutate: async function (notificationId: string) {
      await queryClient.cancelQueries({ queryKey: notificationsKeys.content() });

      const previous = queryClient.getQueryData<NotificationPage>(notificationsKeys.content());
      if (!previous) return { previous: null };

      queryClient.setQueryData(notificationsKeys.content(), {
        ...previous,
        items: previous.items.map(function (item) {
          if (item.id !== notificationId) return item;
          return { ...item, isRead: true };
        }),
      });

      return { previous };
    },
    onError: function (_error, _id, context) {
      if (context?.previous) {
        queryClient.setQueryData(notificationsKeys.content(), context.previous);
      }
    },
    onSettled: function () {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
    },
  });

  const markAll = useMutation({
    mutationFn: async function () {
      return markAllNotificationsRead({
        token: await getToken(),
      });
    },
    onMutate: async function () {
      await queryClient.cancelQueries({ queryKey: notificationsKeys.content() });

      const previous = queryClient.getQueryData<NotificationPage>(notificationsKeys.content());
      if (!previous) return { previous: null };

      queryClient.setQueryData(notificationsKeys.content(), {
        ...previous,
        items: previous.items.map(function (item) {
          return { ...item, isRead: true };
        }),
      });

      return { previous };
    },
    onError: function (_error, _vars, context) {
      if (context?.previous) {
        queryClient.setQueryData(notificationsKeys.content(), context.previous);
      }
    },
    onSettled: function () {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
    },
  });

  const acceptFollowRequestMutation = useMutation({
    mutationFn: async function (input: { notificationId: string; userId: string }) {
      return acceptFollowRequest({
        token: await getToken(),
        userId: input.userId,
      });
    },
    onMutate: async function (input: { notificationId: string; userId: string }) {
      await queryClient.cancelQueries({ queryKey: notificationsKeys.content() });

      const previous = queryClient.getQueryData<NotificationPage>(notificationsKeys.content());
      if (!previous) return { previous: null };

      queryClient.setQueryData(notificationsKeys.content(), {
        ...previous,
        items: previous.items.filter(function (item) {
          return item.id !== input.notificationId;
        }),
      });

      return { previous };
    },
    onError: function (_error, _vars, context) {
      if (context?.previous) {
        queryClient.setQueryData(notificationsKeys.content(), context.previous);
      }
    },
    onSuccess: function (data, _input, context) {
      if (!data.accepted && context?.previous) {
        queryClient.setQueryData(notificationsKeys.content(), context.previous);
      }
    },
    onSettled: function () {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
    },
  });

  const declineFollowRequestMutation = useMutation({
    mutationFn: async function (input: { notificationId: string; userId: string }) {
      return declineFollowRequest({
        token: await getToken(),
        userId: input.userId,
      });
    },
    onMutate: async function (input: { notificationId: string; userId: string }) {
      await queryClient.cancelQueries({ queryKey: notificationsKeys.content() });

      const previous = queryClient.getQueryData<NotificationPage>(notificationsKeys.content());
      if (!previous) return { previous: null };

      queryClient.setQueryData(notificationsKeys.content(), {
        ...previous,
        items: previous.items.filter(function (item) {
          return item.id !== input.notificationId;
        }),
      });

      return { previous };
    },
    onError: function (_error, _vars, context) {
      if (context?.previous) {
        queryClient.setQueryData(notificationsKeys.content(), context.previous);
      }
    },
    onSuccess: function (data, _input, context) {
      if (!data.declined && context?.previous) {
        queryClient.setQueryData(notificationsKeys.content(), context.previous);
      }
    },
    onSettled: function () {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
    },
  });

  const groups = useMemo(function () {
    if (!data?.items) {
      return [] as NotificationGroupRecord[];
    }

	    const items = data.items
	      .filter(function (item) {
	        return item.type !== "follow_request";
	      })
	      .map((item) => notificationToRecord(item));
    const grouped = groupNotificationsByDate(items);

    return grouped;
  }, [data]);

  const unreadCount = data?.items?.filter(function (item) {
    return !item.isRead;
  }).length ?? 0;

  const noNotificationRows = notificationsQuery.isLoading && !hasItems;

  function markNotificationReadAction(id: string) {
    if (markOne.isPending) return;
    const current = notificationsQuery.data?.items.find(function (item) {
      return item.id === id;
    });
    if (!current || current.isRead) return;
    markOne.mutate(id);
  }

  function markAllAction() {
    if (markAll.isPending) return;
    markAll.mutate();
  }

  function handleFollowRequestAction(
    notificationId: string,
    userId: string | undefined,
    action: "accept" | "ignore"
  ) {
    if (!userId) return;

    if (action === "accept") {
      if (acceptFollowRequestMutation.isPending) return;
      acceptFollowRequestMutation.mutate({
        notificationId,
        userId,
      });
      return;
    }

    if (declineFollowRequestMutation.isPending) return;
    declineFollowRequestMutation.mutate({
      notificationId,
      userId,
    });
  }

  const tabs = [
    {
      id: "all",
      label: "All",
      badgeCount: unreadCount,
      onClick: markAllAction,
    },
    { id: "priority", label: "Priority", onClick: function () {} },
    { id: "mentions", label: "Mentions", onClick: function () {} },
  ];

  return (
    <>
      <TopStickyBar
        tabs={tabs}
        activeTabId="all"
        navAriaLabel="Notification sections"
        rootClassName="pt-0 pb-0"
        tabClassName="min-w-max flex-shrink-0 flex justify-center items-center text-[14px] py-3 md:flex-none"
      />
	      <div className="pt-6">
	        <FollowRequestsTray />
	        {noNotificationRows ? (
          <div className="px-4 text-[12px] text-fg-muted">Loading notifications…</div>
        ) : !hasItems ? (
          <EmptyState
            size="lg"
            icon={<span className="text-[24px]">🔔</span>}
            headline="You're all caught up"
            subline="Likes, comments, and follows will appear here"
          />
        ) : (
          groups.map(function (group) {
            return (
              <NotificationGroup key={group.dateLabel} dateLabel={group.dateLabel}>
                {group.items.map(function (item) {
                  const isFollowRequest = item.followRequestUserId !== undefined;
                  const isProcessingFollowRequest =
                    (acceptFollowRequestMutation.isPending &&
                      acceptFollowRequestMutation.variables?.notificationId === item.id) ||
                    (declineFollowRequestMutation.isPending &&
                      declineFollowRequestMutation.variables?.notificationId === item.id);

                  return (
                    <Link
                      key={item.id}
                      href={item.destinationHref}
                      className="block"
                      onClick={function () {
                        markNotificationReadAction(item.id);
                      }}
                    >
                      <NotificationItem
                        avatarInitial={item.avatar?.initial}
                        avatarBg={item.avatar?.bg}
                        avatarColor={item.avatar?.color}
                        avatarUrl={item.avatar?.avatarUrl}
                        avatarStack={item.avatarStack}
                        text={
                          item.contentParts
                            .map(function (part, index) {
                              if (part.type === "user") {
                                return <span key={`${item.id}-${part.type}-${index}`}>{part.value}</span>;
                              }
                              if (part.type === "film") {
                                return (
                                  <span
                                    key={`${item.id}-${part.type}-${index}`}
                                    className="italic"
                                  >
                                    {part.value}
                                  </span>
                                );
                              }
                              if (part.type === "strong") {
                                return (
                                  <strong key={`${item.id}-${part.type}-${index}`}>{part.value}</strong>
                                );
                              }
                              return <span key={`${item.id}-${part.type}-${index}`}>{part.value}</span>;
                            })
                        }
                        time={item.time}
                        unread={item.unread}
                        preview={item.preview}
                        thumbnail={item.thumbnail}
                        thumbnailAlt={item.thumbnailAlt}
                        actions={
                          isFollowRequest ? (
                            <div className="flex gap-2 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isProcessingFollowRequest}
                                onClick={function (event) {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleFollowRequestAction(item.id, item.followRequestUserId, "ignore");
                                }}
                              >
                                {declineFollowRequestMutation.isPending &&
                                declineFollowRequestMutation.variables?.notificationId === item.id
                                  ? "Ignoring..."
                                  : "Ignore"}
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={isProcessingFollowRequest}
                                onClick={function (event) {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleFollowRequestAction(item.id, item.followRequestUserId, "accept");
                                }}
                              >
                                {acceptFollowRequestMutation.isPending &&
                                acceptFollowRequestMutation.variables?.notificationId === item.id
                                  ? "Accepting..."
                                  : "Accept"}
                              </Button>
                            </div>
                          ) : undefined
                        }
                          />
                    </Link>
                  );
                })}
              </NotificationGroup>
            );
          })
        )}
      </div>
      {notificationsQuery.data?.hasMore ? (
        <div className="py-10 text-center text-xs text-fg-muted tracking-wide cursor-pointer hover:text-fg transition-colors">
          Load older notifications ↓
        </div>
      ) : null}
    </>
  );
}

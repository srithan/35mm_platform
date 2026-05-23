"use client";

import { useEffect, useState } from "react";
import { TopStickyBar } from "@/components/TopStickyBar/TopStickyBar";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import { NotificationGroup } from "@/features/notifications/components/NotificationGroup";
import { NotificationItem } from "@/features/notifications/components/NotificationItem";
import {
  type NotificationAction,
  type NotificationTextPart,
  type NotificationUserMeta,
  type NotificationRecord,
} from "@/features/notifications/data/notificationsData";
import { useMarkAllRead } from "@/features/notifications/hooks/useMarkAllRead";
import { cn } from "@/lib/utils/cn";

interface NotificationGroupRecord {
  dateLabel: string;
  items: NotificationRecord[];
}

interface NotificationsResponse {
  userMeta: Record<string, NotificationUserMeta>;
  groups: NotificationGroupRecord[];
  unreadIds: string[];
}

function User({
  username,
  userMeta,
}: {
  username: string;
  userMeta: Record<string, NotificationUserMeta>;
}) {
  const meta = userMeta[username];
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <UsernameLink
        username={username}
        initial={meta?.initial}
        avatarBg={meta?.avatarBg}
        avatarColor={meta?.avatarColor}
        role={meta?.role}
        className="font-medium text-fg no-underline hover:underline"
      >
        {username}
      </UsernameLink>
    </span>
  );
}

function renderNotificationText(
  parts: NotificationTextPart[],
  userMeta: Record<string, NotificationUserMeta>
) {
  return parts.map((part, index) => {
    if (part.type === "user") {
      return <User key={`${part.type}-${index}`} username={part.value} userMeta={userMeta} />;
    }
    if (part.type === "film") {
      return (
        <span key={`${part.type}-${index}`} className="italic">
          {part.value}
        </span>
      );
    }
    if (part.type === "strong") {
      return <strong key={`${part.type}-${index}`}>{part.value}</strong>;
    }
    return <span key={`${part.type}-${index}`}>{part.value}</span>;
  });
}

function Actions({
  actions,
  onFollowAction,
  onDismissAction,
}: {
  actions: NotificationAction[];
  onFollowAction?: () => void;
  onDismissAction?: () => void;
}) {
  const btn =
    "text-[11px] font-medium border border-border px-2.5 py-0.5 rounded cursor-pointer transition-colors";
  const primary = "bg-fg text-bg border-fg hover:bg-[#2a2825]";
  const secondary = "hover:bg-fg hover:text-bg hover:border-fg";

  return actions.map((action) => (
    <button
      key={action.id}
      className={cn(btn, action.variant === "primary" ? primary : secondary)}
      onClick={
        action.id === "follow"
          ? onFollowAction
          : action.id === "dismiss"
            ? onDismissAction
            : undefined
      }
    >
      {action.label}
    </button>
  ));
}

export function NotificationsContent() {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const noopTabClick = () => undefined;

  useEffect(() => {
    let active = true;
    fetch("/api/notifications")
      .then((res) => res.json() as Promise<NotificationsResponse>)
      .then((payload) => {
        if (!active) return;
        setData(payload);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const unreadIds = data?.unreadIds ?? [];
  const { isRead, unreadCount, markRead } = useMarkAllRead(unreadIds);

  const groups = data?.groups ?? [];
  const tabs = [
    { id: "all", label: "All", badgeCount: unreadCount, onClick: noopTabClick },
    { id: "priority", label: "Priority", onClick: noopTabClick },
    { id: "mentions", label: "Mentions", onClick: noopTabClick },
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
        {loading && groups.length === 0 ? (
          <div className="px-4 text-[12px] text-fg-muted">Loading notifications…</div>
        ) : (
          groups.map((group) => (
            <NotificationGroup key={group.dateLabel} dateLabel={group.dateLabel}>
              {group.items.map((item) => {
                const r = item as NotificationRecord;
                const hasActions = (r.actions?.length ?? 0) > 0;
                return (
                  <div
                    key={r.id}
                    onClick={() => unreadIds.includes(r.id) && markRead(r.id)}
                  >
                    <NotificationItem
                      avatarInitial={r.avatar?.initial}
                      avatarBg={r.avatar?.bg}
                      avatarColor={r.avatar?.color}
                      avatarStack={r.avatarStack}
                      text={renderNotificationText(r.contentParts, data?.userMeta ?? {})}
                      time={r.time}
                      unread={r.unread && !isRead(r.id)}
                      preview={r.preview}
                      thumbnail={r.thumbnail}
                      thumbnailAlt={r.thumbnailAlt}
                      actions={
                        hasActions ? (
                          <Actions
                            actions={r.actions ?? []}
                            onFollowAction={() => markRead(r.id)}
                            onDismissAction={() => markRead(r.id)}
                          />
                        ) : undefined
                      }
                    />
                  </div>
                );
              })}
            </NotificationGroup>
          ))
        )}
      </div>
      <div className="py-10 text-center text-xs text-fg-muted tracking-wide cursor-pointer hover:text-fg transition-colors">
        Load older notifications ↓
      </div>
    </>
  );
}

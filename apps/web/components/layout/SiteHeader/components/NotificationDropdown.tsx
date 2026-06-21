import type { Ref, WheelEvent } from "react";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import Link from "next/link";
import {
  ChevronRight,
  Heart,
  Megaphone,
  MessageCircle,
  Repeat2,
  UserPlus,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { initialForName } from "@/features/profile/hooks/useCurrentUserProfile";
import {
  NotificationDropdownEmpty,
  NotificationDropdownSkeleton,
} from "@/features/notifications/components/NotificationDropdownStates";
import { getNotificationDestination } from "@/features/notifications/utils/notificationDestination";
import {
  actorDisplayName,
  formatNotificationText,
  relativeNotificationTime,
} from "../notificationUtils";
import type { HeaderNotifRow } from "../types";
import styles from "../SiteHeader.module.css";

const NOTIF_KIND_ICON = {
  like: Heart,
  follow: UserPlus,
  follow_request: UserPlus,
  mention: MessageCircle,
  comment: MessageCircle,
  reply: MessageCircle,
  broadcast: Megaphone,
  repost: Repeat2,
} as const;

type NotificationDropdownProps = {
  wrapRef: Ref<HTMLDivElement>;
  listRef: Ref<HTMLUListElement>;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  notifRowsQuery: UseQueryResult<{ items: HeaderNotifRow[] }>;
  notifRows: HeaderNotifRow[];
  unreadRowsQuery: UseQueryResult<{ items: unknown[]; hasMore?: boolean }>;
  unreadBadgeCount: string;
  markAllMutation: UseMutationResult<unknown, Error, void, unknown>;
  markOneMutation: UseMutationResult<unknown, Error, string, unknown>;
  markUnreadMutation: UseMutationResult<unknown, Error, string, unknown>;
  onTrapWheel: (ev: WheelEvent<HTMLDivElement>) => void;
};

export function NotificationDropdown({
  wrapRef,
  listRef,
  open,
  onToggle,
  onClose,
  notifRowsQuery,
  notifRows,
  unreadRowsQuery,
  unreadBadgeCount,
  markAllMutation,
  markOneMutation,
  markUnreadMutation,
  onTrapWheel,
}: NotificationDropdownProps) {
  function markAllNotifRead() {
    void markAllMutation.mutate();
  }

  return (
    <div className={styles.notifWrap} id="notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className={styles.btnNotif}
        id="btn-notif"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={onToggle}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path
            d="M6 10C6 6.69 8.69 4 12 4C15.31 4 18 6.69 18 10V16.5L20.5 18.5H3.5L6 16.5V10Z"
            strokeLinejoin="round"
          />
          <path
            d="M10 21.5C10 22.33 10.9 23 12 23C13.1 23 14 22.33 14 21.5"
            strokeLinecap="round"
          />
          <line x1="12" y1="1" x2="12" y2="4" strokeLinecap="round" />
        </svg>
        {Number(unreadRowsQuery.data?.items.length ?? 0) > 0 ? (
          <span
            className={cn(styles.btnNotifBadge, "unread-notification-badge")}
            id="notif-badge"
          >
            {unreadBadgeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(styles.notifPanel, styles.panelNotifications)}
          id="notif-panel"
          role="dialog"
          aria-label="Notifications"
          onWheel={onTrapWheel}
        >
          <div className={styles.notifPanelArrow} aria-hidden />
          <div className={styles.notifPanelHeader}>
            <h2 className={styles.notifPanelHeading}>Notifications</h2>
            <button
              type="button"
              className={styles.dropdownHeaderAction}
              id="notif-mark-all"
              onClick={markAllNotifRead}
            >
              Mark all read
            </button>
          </div>
          <ul
            ref={listRef}
            className={styles.notifList}
            role="list"
            aria-busy={notifRowsQuery.isPending}
            aria-live="polite"
          >
            {notifRowsQuery.isPending ? (
              <NotificationDropdownSkeleton />
            ) : notifRows.length === 0 ? (
              <NotificationDropdownEmpty />
            ) : (
              notifRows.map(function (row) {
                const IconGlyph = NOTIF_KIND_ICON[row.type];
                const isTogglingRead =
                  (markOneMutation.isPending && markOneMutation.variables === row.id) ||
                  (markUnreadMutation.isPending && markUnreadMutation.variables === row.id);

                function markRowAsRead() {
                  if (row.isRead || markOneMutation.isPending) return;
                  markOneMutation.mutate(row.id);
                }

                function toggleRowReadState() {
                  if (isTogglingRead) return;
                  if (row.isRead) {
                    markUnreadMutation.mutate(row.id);
                    return;
                  }
                  markOneMutation.mutate(row.id);
                }

                return (
                  <li key={row.id} className={styles.dropdownListItem}>
                    <div
                      className={cn(
                        styles.dropdownRow,
                        styles.dropdownRowNotif,
                        row.isRead ? styles.dropdownRowRead : styles.dropdownRowUnread
                      )}
                    >
                      <Link
                        href={getNotificationDestination(row)}
                        className={styles.dropdownRowLink}
                        onClick={function () {
                          markRowAsRead();
                          onClose();
                        }}
                      >
                        <span className={styles.dropdownNotifGlyph} aria-hidden>
                          <IconGlyph size={14} strokeWidth={2} />
                        </span>
                        <span className={styles.dropdownRowAvatar}>
                          <Avatar
                            initial={initialForName(actorDisplayName(row))}
                            size="sm"
                            src={row.actor?.avatarUrl ?? undefined}
                          />
                        </span>
                        <span className={styles.dropdownRowMain}>
                          <p className={styles.dropdownNotifText}>{formatNotificationText(row)}</p>
                          <span className={styles.dropdownNotifMetaRow}>
                            <span className={styles.dropdownNotifTime}>
                              {relativeNotificationTime(row.createdAt)}
                            </span>
                          </span>
                        </span>
                      </Link>
                      <button
                        type="button"
                        className={styles.rowDotButton}
                        title={row.isRead ? "Mark as unread" : "Mark as read"}
                        aria-label={row.isRead ? "Mark as unread" : "Mark as read"}
                        disabled={isTogglingRead}
                        onClick={function (event) {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleRowReadState();
                        }}
                      >
                        <span
                          className={cn(
                            styles.rowDot,
                            row.isRead ? styles.rowDotRead : styles.rowDotUnread
                          )}
                          aria-hidden
                        />
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          <Link
            href={ROUTES.NOTIFICATIONS}
            className={styles.notifSeeAll}
            onClick={function () {
              onClose();
            }}
          >
            Full activity feed
            <ChevronRight size={14} strokeWidth={2} aria-hidden />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

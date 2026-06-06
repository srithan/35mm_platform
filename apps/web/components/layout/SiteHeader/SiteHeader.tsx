"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useComposerModal } from "@/components/layout/PostComposerModalContext";
// import type { QuotedPost } from "@/stores/useComposerModalStore";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { isRouteActive } from "@/lib/utils/navigation";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { syncSiteHeaderStickyOffset } from "@/lib/utils/syncSiteHeaderStickyOffset";
import { initialForName, useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  ChevronRight,
  Heart,
  LogOut,
  Megaphone,
  MessageCircle,
  Repeat2,
  Settings,
  UserPlus,
} from "lucide-react";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/api/notificationsApi";
import { notificationsKeys } from "@/features/notifications/hooks/queryKeys";
import { getNotificationDestination } from "@/features/notifications/utils/notificationDestination";
import {
  NotificationDropdownEmpty,
  NotificationDropdownSkeleton,
} from "@/features/notifications/components/NotificationDropdownStates";
import type { NotificationItem as ApiNotificationItem, NotificationPage } from "@35mm/types";
import styles from "./SiteHeader.module.css";

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

type HeaderNotifRow = Omit<ApiNotificationItem, "type"> & {
  type: "like" | "comment" | "reply" | "follow" | "follow_request" | "mention" | "repost";
};

function actorDisplayName(row: HeaderNotifRow): string {
  if (!row.actor) return "Someone";
  return row.actor.displayName?.trim() || row.actor.username;
}

function relativeNotificationTime(isoDate: string): string {
  const when = Date.parse(isoDate);
  if (Number.isNaN(when)) return "now";

  const diff = Date.now() - when;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

function formatNotificationText(row: HeaderNotifRow): ReactNode {
  const actor = row.actor;
  const actorName = actor?.displayName?.trim() || actor?.username || "Someone";
  const isBundle = row.bundleCount > 1;
  const actorLabel = isBundle ? `${actorName} and ${row.bundleCount - 1} others` : actorName;

  if (row.type === "follow") {
    return (
      <>
        <strong>{actorLabel}</strong> followed you
      </>
    );
  }

  if (row.type === "follow_request") {
    return (
      <>
        <strong>{actorLabel}</strong> requested to follow you
      </>
    );
  }

  if (row.type === "mention") {
    return (
      <>
        <strong>{actorLabel}</strong> mentioned you
      </>
    );
  }

  if (row.type === "like") {
    return (
      <>
        <strong>{actorLabel}</strong> liked your {row.entity?.title ? <em>{row.entity.title}</em> : <strong>post</strong>}
      </>
    );
  }

  if (row.type === "comment") {
    return (
      <>
        <strong>{actorLabel}</strong> commented on your {row.entity?.title ? <em>{row.entity.title}</em> : "post"}
      </>
    );
  }

  if (row.type === "reply") {
    return (
      <>
        <strong>{actorLabel}</strong> replied to your comment
      </>
    );
  }

  return (
    <>
      <strong>{actorLabel}</strong> reposted your {row.entity?.title ? <em>{row.entity.title}</em> : "post"}
    </>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const queryClient = useQueryClient();
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const { openComposerModal } = useComposerModal();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const standaloneSearchRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const notifWrapRef = useRef<HTMLDivElement>(null);
  const notifListRef = useRef<HTMLUListElement>(null);
  const profileWrapRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => isRouteActive(pathname ?? "", href);
  const profileUsername = currentUser?.username ?? clerkUser?.username ?? null;
  const profileHref = profileUsername ? ROUTES.PROFILE(profileUsername) : ROUTES.HOME;
  const currentDisplayName =
    currentUser?.displayName ?? clerkUser?.fullName ?? clerkUser?.username ?? "Profile";
  const currentAvatarUrl = currentUser?.avatarUrl ?? null;
  const suppressDefaultAvatar = !currentUser?.avatarUrl &&
    (
      currentUserQuery.isPending ||
      currentUserQuery.isLoading ||
      currentUserQuery.isFetching ||
      currentUserQuery.fetchStatus !== "idle"
    );
  const currentInitial = initialForName(currentDisplayName);

  const notifRowsQuery = useQuery({
    queryKey: notificationsKeys.preview(),
    queryFn: async function () {
      return fetchNotifications({
        token: await getToken(),
        limit: 10,
      });
    },
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 20_000,
    refetchInterval: 5_000,
    gcTime: 5 * 60_000,
  });
  const notifRows = (notifRowsQuery.data?.items ?? []) as HeaderNotifRow[];

  const unreadRowsQuery = useQuery({
    queryKey: notificationsKeys.unread(),
    queryFn: async function () {
      return fetchNotifications({
        token: await getToken(),
        unreadOnly: true,
        limit: 50,
      });
    },
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 20_000,
    refetchInterval: 5_000,
    gcTime: 5 * 60_000,
  });
  const unreadRows = unreadRowsQuery.data?.items ?? [];

  const unreadBadgeCount =
    unreadRowsQuery.data?.hasMore && unreadRowsQuery.data?.items.length
      ? `${unreadRowsQuery.data.items.length}+`
      : String(unreadRows.length);

  const markAllMutation = useMutation({
    mutationFn: async function () {
      return markAllNotificationsRead({
        token: await getToken(),
      });
    },
    onMutate: async function () {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationsKeys.preview() }),
        queryClient.cancelQueries({ queryKey: notificationsKeys.unread() }),
        queryClient.cancelQueries({ queryKey: notificationsKeys.content() }),
      ]);

      const previousContent = queryClient.getQueryData<NotificationPage>(notificationsKeys.content());
      const previousPreview = queryClient.getQueryData(notificationsKeys.preview()) as
        | { items: { id: string; isRead: boolean }[]; itemsLeft?: number; hasMore?: boolean }
        | undefined;
      const previousUnread = queryClient.getQueryData(notificationsKeys.unread()) as
        | { items: { id: string; isRead: boolean }[]; hasMore?: boolean }
        | undefined;

      if (previousContent) {
        queryClient.setQueryData(notificationsKeys.content(), {
          ...previousContent,
          items: previousContent.items.map(function (item) {
            return { ...item, isRead: true };
          }),
        });
      }

      if (previousPreview) {
        queryClient.setQueryData(notificationsKeys.preview(), {
          ...previousPreview,
          items: previousPreview.items.map(function (item) {
            return { ...item, isRead: true };
          }),
        });
      }

      if (previousUnread) {
        queryClient.setQueryData(notificationsKeys.unread(), {
          ...previousUnread,
          items: [],
        });
      }

      return { previousContent, previousPreview, previousUnread };
    },
    onError: function (_error, _vars, context) {
      if (!context) return;
      if (context.previousContent) {
        queryClient.setQueryData(notificationsKeys.content(), context.previousContent);
      }
      if (context.previousPreview) {
        queryClient.setQueryData(notificationsKeys.preview(), context.previousPreview);
      }
      if (context.previousUnread) {
        queryClient.setQueryData(notificationsKeys.unread(), context.previousUnread);
      }
    },
    onSuccess: function () {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: async function (notificationId: string) {
      return markNotificationRead({
        token: await getToken(),
        notificationId,
      });
    },
    onMutate: async function (notificationId: string) {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationsKeys.preview() }),
        queryClient.cancelQueries({ queryKey: notificationsKeys.unread() }),
        queryClient.cancelQueries({ queryKey: notificationsKeys.content() }),
      ]);

      const previousContent = queryClient.getQueryData<NotificationPage>(notificationsKeys.content());
      const previousPreview = queryClient.getQueryData(notificationsKeys.preview()) as
        | { items: { id: string; isRead: boolean }[]; itemsLeft?: number; hasMore?: boolean }
        | undefined;
      const previousUnread = queryClient.getQueryData(notificationsKeys.unread()) as
        | { items: { id: string; isRead: boolean }[]; hasMore?: boolean }
        | undefined;

      if (previousContent) {
        queryClient.setQueryData(notificationsKeys.content(), {
          ...previousContent,
          items: previousContent.items.map(function (item) {
            if (item.id !== notificationId) return item;
            return { ...item, isRead: true };
          }),
        });
      }

      if (previousPreview) {
        queryClient.setQueryData(notificationsKeys.preview(), {
          ...previousPreview,
          items: previousPreview.items.map(function (item) {
            if (item.id !== notificationId) return item;
            return { ...item, isRead: true };
          }),
        });
      }

      if (previousUnread) {
        queryClient.setQueryData(notificationsKeys.unread(), {
          ...previousUnread,
          items: previousUnread.items.filter(function (item) {
            return item.id !== notificationId;
          }),
        });
      }

      return { previousContent, previousPreview, previousUnread };
    },
    onError: function (_error, _id, context) {
      if (!context) return;
      if (context.previousContent) {
        queryClient.setQueryData(notificationsKeys.content(), context.previousContent);
      }
      if (context.previousPreview) {
        queryClient.setQueryData(notificationsKeys.preview(), context.previousPreview);
      }
      if (context.previousUnread) {
        queryClient.setQueryData(notificationsKeys.unread(), context.previousUnread);
      }
    },
    onSuccess: function () {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
    },
  });

  useLayoutEffect(
    function () {
      const el = navRef.current;
      if (!el) return;

      function syncStickyOffset() {
        syncSiteHeaderStickyOffset();
      }

      syncStickyOffset();
      const ro = new ResizeObserver(syncStickyOffset);
      ro.observe(el);
      const mq = window.matchMedia("(min-width: 768px)");
      function onMq() {
        syncStickyOffset();
      }
      mq.addEventListener("change", onMq);
      return function () {
        ro.disconnect();
        mq.removeEventListener("change", onMq);
        document.documentElement.style.removeProperty("--site-header-sticky-offset");
      };
    },
    []
  );

  useEffect(
    function () {
      if (!notifOpen && !profileMenuOpen) return;
      function onDocMouseDown(ev: MouseEvent) {
        const t = ev.target as Node;
        if (notifOpen && notifWrapRef.current && !notifWrapRef.current.contains(t)) {
          setNotifOpen(false);
        }
        if (profileMenuOpen && profileWrapRef.current && !profileWrapRef.current.contains(t)) {
          setProfileMenuOpen(false);
        }
      }
      document.addEventListener("mousedown", onDocMouseDown);
      return function () {
        document.removeEventListener("mousedown", onDocMouseDown);
      };
    },
    [notifOpen, profileMenuOpen]
  );

  useEffect(
    function () {
      if (!notifOpen && !profileMenuOpen) return;
      function onKeyDown(ev: KeyboardEvent) {
        if (ev.key !== "Escape") return;
        setNotifOpen(false);
        setProfileMenuOpen(false);
      }
      document.addEventListener("keydown", onKeyDown);
      return function () {
        document.removeEventListener("keydown", onKeyDown);
      };
    },
    [notifOpen, profileMenuOpen]
  );

  useEffect(
    function () {
      if (!notifOpen && !profileMenuOpen) return;

      function isInsideOpenPanel(target: EventTarget | null) {
        if (!(target instanceof Node)) return false;
        if (notifOpen && notifWrapRef.current && notifWrapRef.current.contains(target)) {
          return true;
        }
        if (profileMenuOpen && profileWrapRef.current && profileWrapRef.current.contains(target)) {
          return true;
        }
        return false;
      }

      function preventBackgroundScroll(ev: Event) {
        if (isInsideOpenPanel(ev.target)) return;
        ev.preventDefault();
      }

      document.addEventListener("wheel", preventBackgroundScroll, { passive: false });
      document.addEventListener("touchmove", preventBackgroundScroll, { passive: false });

      return function () {
        document.removeEventListener("wheel", preventBackgroundScroll);
        document.removeEventListener("touchmove", preventBackgroundScroll);
      };
    },
    [notifOpen, profileMenuOpen]
  );

  function toggleNotif() {
    setNotifOpen(function (v) {
      return !v;
    });
    setProfileMenuOpen(false);
  }

  function toggleProfileMenu() {
    setProfileMenuOpen(function (v) {
      return !v;
    });
    setNotifOpen(false);
  }

  function trapNotifPanelWheel(ev: React.WheelEvent<HTMLDivElement>) {
    ev.stopPropagation();

    const list = notifListRef.current;
    if (!list) {
      ev.preventDefault();
      return;
    }

    const deltaY = ev.deltaY;
    if (deltaY === 0) return;

    const maxScrollTop = list.scrollHeight - list.clientHeight;
    if (maxScrollTop <= 0) {
      ev.preventDefault();
      return;
    }

    const atTop = list.scrollTop <= 0;
    const atBottom = list.scrollTop >= maxScrollTop - 1;

    if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
      ev.preventDefault();
      return;
    }

    if (!list.contains(ev.target as Node)) {
      list.scrollTop = Math.min(maxScrollTop, Math.max(0, list.scrollTop + deltaY));
      ev.preventDefault();
    }
  }

  function closeProfileMenu() {
    setProfileMenuOpen(false);
  }

  function handleLogoutClick() {
    closeProfileMenu();
    setLogoutConfirmOpen(true);
  }

  function confirmLogout() {
    void signOut().then(function () {
      router.push(ROUTES.AUTH_LOGIN);
    });
  }

  function markAllNotifRead() {
    void markAllMutation.mutate();
  }

  return (
    <>
    <nav
      ref={navRef}
      id="site-nav"
      className={styles.siteNav}
      // style={{ boxShadow: "rgba(0, 0, 0, 0.08) 0px 1px 12px" }}
    >
      <div className={styles.navMain}>
        <div className={styles.navLeft}>
          <Link href={ROUTES.HOME} className={styles.navLogo}>
            35mm<span className={styles.dot}>.</span>
          </Link>
          <div className={styles.standaloneSearch}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={standaloneSearchRef}
              id="header-standalone-search"
              className={styles.standaloneSearchInput}
              type="search"
              name="header-standalone-search"
              placeholder="Search films, people, reviews…"
              aria-label="Search films, people, and reviews"
              autoComplete="off"
              enterKeyHint="search"
            />
          </div>
        </div>

        <div className={styles.navCenter}>
          <div className={styles.navItems}>
            <Link
              href={ROUTES.HOME}
              className={cn(styles.navItem, isActive(ROUTES.HOME) && styles.active)}
              aria-current={isActive(ROUTES.HOME) ? "page" : undefined}
            >
              <span className={styles.navItemIcon}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15.1038 5H21.33C21.896 5 22.5 5.52847 22.5 6.3673V21.6327C22.5 22.4715 21.896 23 21.33 23H15.1038C14.5377 23 13.9338 22.4715 13.9338 21.6327V6.3673C13.9338 5.52847 14.5377 5 15.1038 5ZM2.67002 1H8.8962C9.46225 1 10.0662 1.52847 10.0662 2.3673V17.6327C10.0662 18.4715 9.46225 19 8.8962 19H2.67002C2.10396 19 1.5 18.4715 1.5 17.6327V2.3673C1.5 1.52847 2.10396 1 2.67002 1Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              <span className={styles.navItemText}>Feed</span>
            </Link>

            <Link
              href={ROUTES.DISCOVER}
              className={cn(
                styles.navItem,
                isActive(ROUTES.DISCOVER) && styles.active
              )}
              aria-current={isActive(ROUTES.DISCOVER) ? "page" : undefined}
            >
              <span className={styles.navItemIcon}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
                </svg>
              </span>
              <span className={styles.navItemText}>Discover</span>
            </Link>

            <Link
              href={profileHref}
              className={cn(
                styles.navItem,
                isActive(profileHref) && styles.active
              )}
              aria-current={
                isActive(profileHref) ? "page" : undefined
              }
            >
              <span className={styles.navItemIcon}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span className={styles.navItemText}>Profile</span>
            </Link>
          </div>
        </div>

        <div className={styles.navActions}>
            <div className={styles.notifWrap} id="notif-wrap" ref={notifWrapRef}>
            <button
              type="button"
              className={styles.btnNotif}
              id="btn-notif"
              aria-label="Notifications"
              aria-expanded={notifOpen}
              onClick={toggleNotif}
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

            {notifOpen ? (
              <div
                className={cn(styles.notifPanel, styles.panelNotifications)}
                id="notif-panel"
                role="dialog"
                aria-label="Notifications"
                onWheel={trapNotifPanelWheel}
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
                  ref={notifListRef}
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
                      function markRowAsRead() {
                        if (row.isRead || markOneMutation.isPending) return;
                        markOneMutation.mutate(row.id);
                      }
                  return (
                        <li key={row.id} className={styles.dropdownListItem}>
                          <Link
                            href={getNotificationDestination(row)}
                            className={cn(
                              styles.dropdownRow,
                              styles.dropdownRowNotif,
                              row.isRead ? styles.dropdownRowRead : styles.dropdownRowUnread
                            )}
                            onClick={function () {
                              markRowAsRead();
                              setNotifOpen(false);
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
                            <span
                              className={cn(
                                styles.rowDot,
                                styles.rowDotTrailing,
                                row.isRead ? styles.rowDotRead : styles.rowDotUnread
                              )}
                              title={row.isRead ? "Read" : "Unread"}
                              aria-hidden
                            />
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
                <Link
                  href={ROUTES.NOTIFICATIONS}
                  className={styles.notifSeeAll}
                  onClick={function () {
                    setNotifOpen(false);
                  }}
                >
                  Full activity feed
                  <ChevronRight size={14} strokeWidth={2} aria-hidden />
                </Link>
              </div>
            ) : null}
            </div>

            <button type="button" className={styles.btnPost} onClick={function () { openComposerModal(); }}>
              <span className={styles.btnPostInner}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                New Post
              </span>
            </button>
            <div
              className={cn(styles.notifWrap, styles.profileMenuWrap)}
              ref={profileWrapRef}
            >
              <button
                type="button"
                className={styles.profileMenuTrigger}
                id="btn-profile-menu"
                aria-label="Account menu"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                onClick={toggleProfileMenu}
              >
                <Avatar
                  initial={currentInitial}
                  src={currentAvatarUrl}
                  allowDefaultFallback={!suppressDefaultAvatar}
                  size="sm"
                  className={styles.navAvatar}
                />
              </button>
              {profileMenuOpen ? (
                <div
                  className={styles.profileMenu}
                  id="profile-menu"
                  role="menu"
                  aria-labelledby="btn-profile-menu"
                >
                  <div
                    className={cn(styles.notifPanelArrow, styles.notifPanelArrowProfile)}
                    aria-hidden
                  />
                  <Link
                    href={profileHref}
                    className={styles.profileMenuIdentity}
                    role="menuitem"
                    onClick={closeProfileMenu}
                  >
                    <Avatar
                      initial={currentInitial}
                      src={currentAvatarUrl}
                      allowDefaultFallback={!suppressDefaultAvatar}
                      size="md"
                      className={styles.profileMenuIdentityAvatar}
                    />
                    <span className={styles.profileMenuIdentityMeta}>
                      <span className={styles.profileMenuIdentityName}>{currentDisplayName}</span>
                      <span className={styles.profileMenuIdentityHint}>See your profile</span>
                    </span>
                    <ChevronRight
                      className={styles.profileMenuIdentityChevron}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </Link>
                  <div className={styles.profileMenuDivider} aria-hidden />
                  <Link
                    href={ROUTES.BOOKMARKS}
                    className={styles.profileMenuRow}
                    role="menuitem"
                    onClick={closeProfileMenu}
                  >
                    <span className={styles.profileMenuRowIcon} aria-hidden>
                      <Bookmark size={18} strokeWidth={1.75} />
                    </span>
                    Bookmarks
                  </Link>
                  <Link
                    href={ROUTES.SETTINGS}
                    className={styles.profileMenuRow}
                    role="menuitem"
                    onClick={closeProfileMenu}
                  >
                    <span className={styles.profileMenuRowIcon} aria-hidden>
                      <Settings size={18} strokeWidth={1.75} />
                    </span>
                    Settings
                  </Link>
                  <div className={styles.profileMenuDivider} aria-hidden />
                  <button
                    type="button"
                    className={cn(styles.profileMenuRow, styles.profileMenuRowLogout)}
                    role="menuitem"
                    onClick={handleLogoutClick}
                  >
                    <span className={styles.profileMenuRowIcon} aria-hidden>
                      <LogOut size={18} strokeWidth={1.75} />
                    </span>
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
        </div>
      </div>
    </nav>
    <ConfirmDialog
      open={logoutConfirmOpen}
      onClose={function () {
        setLogoutConfirmOpen(false);
      }}
      onConfirm={confirmLogout}
      title="Log out?"
      description="You will need to sign in again to use your account."
      confirmLabel="Log out"
      cancelLabel="Cancel"
      variant="danger"
      swapButtonOrder
    />
    </>
  );
}

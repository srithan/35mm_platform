"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useComposerModal } from "@/components/layout/PostComposerModalContext";
// import type { QuotedPost } from "@/stores/useComposerModalStore";
import { CURRENT_USER } from "@/lib/constants/currentUser";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { isRouteActive } from "@/lib/utils/navigation";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { syncSiteHeaderStickyOffset } from "@/lib/utils/syncSiteHeaderStickyOffset";
import { signOut } from "@/features/auth/lib/auth-client";
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
import styles from "./SiteHeader.module.css";

/** Deterministic profile photo URLs for header dropdown previews (replace with real URLs from API). */
function headerDropdownAvatarUrl(seed: string): string {
  return "https://i.pravatar.cc/64?u=" + encodeURIComponent(seed);
}

const NOTIF_KIND_ICON = {
  like: Heart,
  follow: UserPlus,
  comment: MessageCircle,
  broadcast: Megaphone,
  repost: Repeat2,
} as const;

type HeaderNotifRow = {
  id: string;
  initial: string;
  src: string;
  time: string;
  unread: boolean;
  kind: keyof typeof NOTIF_KIND_ICON;
  body: ReactNode;
};

const HEADER_NOTIF_PREVIEW_ROWS_START: HeaderNotifRow[] = [
  {
    id: "n1",
    initial: "F",
    src: headerDropdownAvatarUrl("35mm-header-notif-filmsbratz"),
    time: "2m",
    unread: true,
    kind: "like",
    body: (
      <>
        <strong>filmsbratz</strong> liked your post about <em>The Green Pastures</em>
      </>
    ),
  },
  {
    id: "n2",
    initial: "C",
    src: headerDropdownAvatarUrl("35mm-header-notif-cinephile-raj"),
    time: "14m",
    unread: true,
    kind: "follow",
    body: (
      <>
        <strong>cinephile_raj</strong> started following you
      </>
    ),
  },
  {
    id: "n3",
    initial: "R",
    src: headerDropdownAvatarUrl("35mm-header-notif-reelcritic"),
    time: "1h",
    unread: true,
    kind: "comment",
    body: (
      <>
        <strong>reelcritic</strong> commented on your review:{" "}
        <em>&quot;Totally agree about the third act…&quot;</em>
      </>
    ),
  },
  {
    id: "n4",
    initial: "A",
    src: headerDropdownAvatarUrl("35mm-header-notif-a24"),
    time: "3h",
    unread: false,
    kind: "broadcast",
    body: (
      <>
        <strong>A24</strong> posted a new trailer — <em>The Drama</em>
      </>
    ),
  },
  {
    id: "n5",
    initial: "N",
    src: headerDropdownAvatarUrl("35mm-header-notif-nouvelle-vague"),
    time: "Yesterday",
    unread: false,
    kind: "repost",
    body: (
      <>
        <strong>nouvelle_vague</strong> reposted your list: <em>Top 10 Criterion picks</em>
      </>
    ),
  },
];

const HEADER_NOTIF_PREVIEW_ROWS_EXTRA: HeaderNotifRow[] = Array.from(
  { length: 15 },
  function (_, i) {
    const n = i + 6;
    const kinds: (keyof typeof NOTIF_KIND_ICON)[] = [
      "like",
      "follow",
      "comment",
      "broadcast",
      "repost",
    ];
    const kind = kinds[n % 5];
    const u = "user_" + n;
    let body: ReactNode = (
      <>
        <strong>{u}</strong> interacted with your activity.
      </>
    );
    if (kind === "like") {
      body = (
        <>
          <strong>{u}</strong> liked your post
        </>
      );
    } else if (kind === "follow") {
      body = (
        <>
          <strong>{u}</strong> started following you
        </>
      );
    } else if (kind === "comment") {
      body = (
        <>
          <strong>{u}</strong> commented on your review
        </>
      );
    } else if (kind === "broadcast") {
      body = (
        <>
          <strong>{u}</strong> posted an update
        </>
      );
    } else {
      body = (
        <>
          <strong>{u}</strong> reposted your list
        </>
      );
    }
    return {
      id: "n" + n,
      initial: String.fromCharCode(65 + (n % 26)),
      src: headerDropdownAvatarUrl("35mm-header-notif-user-" + n),
      time: (n % 9) + 1 + "h",
      unread: n <= 14,
      kind: kind,
      body: body,
    };
  }
);

const HEADER_NOTIF_PREVIEW_ROWS: HeaderNotifRow[] = HEADER_NOTIF_PREVIEW_ROWS_START.concat(
  HEADER_NOTIF_PREVIEW_ROWS_EXTRA
);

const INITIAL_UNREAD_NOTIF_COUNT = HEADER_NOTIF_PREVIEW_ROWS.filter(function (r) {
  return r.unread;
}).length;

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { openComposerModal } = useComposerModal();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(INITIAL_UNREAD_NOTIF_COUNT);
  const [allNotificationsRead, setAllNotificationsRead] = useState(false);
  const standaloneSearchRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const notifWrapRef = useRef<HTMLDivElement>(null);
  const profileWrapRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => isRouteActive(pathname ?? "", href);

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

  function closeProfileMenu() {
    setProfileMenuOpen(false);
  }

  function handleLogoutClick() {
    closeProfileMenu();
    setLogoutConfirmOpen(true);
  }

  function confirmLogout() {
    void signOut().then(function (result) {
      if (result.ok) {
        router.push(ROUTES.AUTH_LOGIN);
      }
    });
  }

  function markAllNotifRead() {
    setNotifCount(0);
    setAllNotificationsRead(true);
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
              href={ROUTES.PROFILE(CURRENT_USER.username)}
              className={cn(
                styles.navItem,
                isActive(ROUTES.PROFILE(CURRENT_USER.username)) && styles.active
              )}
              aria-current={
                isActive(ROUTES.PROFILE(CURRENT_USER.username)) ? "page" : undefined
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
              {notifCount > 0 ? (
                <span
                  className={cn(styles.btnNotifBadge, "unread-notification-badge")}
                  id="notif-badge"
                >
                  {notifCount}
                </span>
              ) : null}
            </button>

            {notifOpen ? (
              <div
                className={cn(styles.notifPanel, styles.panelNotifications)}
                id="notif-panel"
                role="dialog"
                aria-label="Notifications"
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
                <ul className={styles.notifList} role="list">
                  {HEADER_NOTIF_PREVIEW_ROWS.map(function (row) {
                    const IconGlyph = NOTIF_KIND_ICON[row.kind];
                    const isUnread = row.unread && !allNotificationsRead;
                    return (
                      <li key={row.id} className={styles.dropdownListItem}>
                        <Link
                          href={ROUTES.NOTIFICATIONS}
                          className={cn(
                            styles.dropdownRow,
                            styles.dropdownRowNotif,
                            isUnread ? styles.dropdownRowUnread : styles.dropdownRowRead
                          )}
                          onClick={function () {
                            setNotifOpen(false);
                          }}
                        >
                          <span
                            className={styles.dropdownNotifGlyph}
                            aria-hidden
                          >
                            <IconGlyph size={14} strokeWidth={2} />
                          </span>
                          <span className={styles.dropdownRowAvatar}>
                            <Avatar
                              initial={row.initial}
                              size="sm"
                              src={row.src}
                            />
                          </span>
                          <span className={styles.dropdownRowMain}>
                            <p className={styles.dropdownNotifText}>{row.body}</p>
                            <span className={styles.dropdownNotifMetaRow}>
                              <span className={styles.dropdownNotifTime}>{row.time}</span>
                            </span>
                          </span>
                          <span
                            className={cn(
                              styles.rowDot,
                              styles.rowDotTrailing,
                              isUnread ? styles.rowDotUnread : styles.rowDotRead
                            )}
                            title={isUnread ? "Unread" : "Read"}
                            aria-hidden
                          />
                        </Link>
                      </li>
                    );
                  })}
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
                <Image
                  className={styles.navAvatar}
                  src={CURRENT_USER.avatarUrl}
                  alt=""
                  width={32}
                  height={32}
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
                    href={ROUTES.PROFILE(CURRENT_USER.username)}
                    className={styles.profileMenuIdentity}
                    role="menuitem"
                    onClick={closeProfileMenu}
                  >
                    <Image
                      className={styles.profileMenuIdentityAvatar}
                      src={CURRENT_USER.avatarUrl}
                      alt=""
                      width={40}
                      height={40}
                    />
                    <span className={styles.profileMenuIdentityMeta}>
                      <span className={styles.profileMenuIdentityName}>{CURRENT_USER.name}</span>
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

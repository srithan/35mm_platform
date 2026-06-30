import Link from "next/link";
import { Icon } from "@/components/Icon/Icon";
import {
  formatChatUnreadBadgeCount,
  useChatUnreadBadgeCount,
} from "@/features/chat/hooks/useChatUnreadBadgeCount";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import styles from "../SiteHeader.module.css";

type NavLinksProps = {
  isActive: (href: string) => boolean;
  profileHref: string;
};

export function NavLinks({ isActive, profileHref }: NavLinksProps) {
  const chatUnreadCount = useChatUnreadBadgeCount();
  const chatUnreadLabel = formatChatUnreadBadgeCount(chatUnreadCount);
  const hasChatUnread = chatUnreadCount > 0;

  return (
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
          className={cn(styles.navItem, isActive(ROUTES.DISCOVER) && styles.active)}
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
          href={ROUTES.SHORT_FILMS}
          className={cn(styles.navItem, isActive(ROUTES.SHORT_FILMS) && styles.active)}
          aria-current={isActive(ROUTES.SHORT_FILMS) ? "page" : undefined}
        >
          <span className={styles.navItemIcon}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 21 23"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M1.5 2.35965C1.5 1.32355 2.6323 0.685338 3.51868 1.22183L18.6201 10.3622C19.4752 10.8797 19.4752 12.1203 18.6201 12.6378L3.51868 21.7782C2.6323 22.3147 1.5 21.6764 1.5 20.6404V2.35965Z"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </span>
          <span className={styles.navItemText}>Short Films</span>
        </Link>

        <Link
          href={ROUTES.CHAT}
          className={cn(styles.navItem, isActive(ROUTES.CHAT) && styles.active)}
          aria-current={isActive(ROUTES.CHAT) ? "page" : undefined}
          aria-label={
            hasChatUnread
              ? "Messages (" + chatUnreadLabel + " unread)"
              : "Messages"
          }
        >
          <span className={cn(styles.navItemIcon, styles.navItemIconWithBadge)}>
            <Icon
              name="chat"
              className="h-5 w-5"
              strokeWidth={1.9}
              filled={isActive(ROUTES.CHAT)}
            />
            {hasChatUnread ? (
              <span
                className={cn(styles.navItemBadge, "unread-notification-badge")}
                aria-hidden="true"
              >
                {chatUnreadLabel}
              </span>
            ) : null}
          </span>
          <span className={styles.navItemText}>Messages</span>
        </Link>

        <Link
          href={profileHref}
          className={cn(styles.navItem, isActive(profileHref) && styles.active)}
          aria-current={isActive(profileHref) ? "page" : undefined}
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
  );
}

import Link from "next/link";
import {
  Bookmark,
  ChevronRight,
  FileText,
  Lock,
  LogOut,
  Palette,
  Settings,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import styles from "../../SiteHeader.module.css";

type ProfileMenuMainViewProps = {
  profileHref: string;
  currentDisplayName: string;
  currentInitial: string;
  currentAvatarUrl: string | null;
  suppressDefaultAvatar: boolean;
  onClose: () => void;
  onOpenAppearance: () => void;
  onOpenPrivacy: () => void;
  onLogoutClick: () => void;
};

export function ProfileMenuMainView({
  profileHref,
  currentDisplayName,
  currentInitial,
  currentAvatarUrl,
  suppressDefaultAvatar,
  onClose,
  onOpenAppearance,
  onOpenPrivacy,
  onLogoutClick,
}: ProfileMenuMainViewProps) {
  return (
    <>
      <Link
        href={profileHref}
        className={styles.profileMenuIdentity}
        role="menuitem"
        onClick={onClose}
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
        onClick={onClose}
      >
        <span className={styles.profileMenuRowIcon} aria-hidden>
          <Bookmark size={18} strokeWidth={1.75} />
        </span>
        <span className={styles.profileMenuRowText}>Bookmarks</span>
      </Link>
      <Link
        href={ROUTES.DRAFTS}
        className={styles.profileMenuRow}
        role="menuitem"
        onClick={onClose}
      >
        <span className={styles.profileMenuRowIcon} aria-hidden>
          <FileText size={18} strokeWidth={1.75} />
        </span>
        <span className={styles.profileMenuRowText}>Drafts</span>
      </Link>
      <button
        type="button"
        className={styles.profileMenuRow}
        role="menuitem"
        onClick={onOpenAppearance}
      >
        <span className={styles.profileMenuRowIcon} aria-hidden>
          <Palette size={18} strokeWidth={1.75} />
        </span>
        <span className={styles.profileMenuRowText}>Appearance</span>
        <ChevronRight className={styles.profileMenuRowChevron} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className={styles.profileMenuRow}
        role="menuitem"
        onClick={onOpenPrivacy}
      >
        <span className={styles.profileMenuRowIcon} aria-hidden>
          <Lock size={18} strokeWidth={1.75} />
        </span>
        <span className={styles.profileMenuRowText}>Privacy</span>
        <ChevronRight className={styles.profileMenuRowChevron} strokeWidth={2} aria-hidden />
      </button>
      <Link
        href={ROUTES.SETTINGS}
        className={styles.profileMenuRow}
        role="menuitem"
        onClick={onClose}
      >
        <span className={styles.profileMenuRowIcon} aria-hidden>
          <Settings size={18} strokeWidth={1.75} />
        </span>
        <span className={styles.profileMenuRowText}>Settings</span>
      </Link>
      <div className={styles.profileMenuDivider} aria-hidden />
      <button
        type="button"
        className={cn(styles.profileMenuRow, styles.profileMenuRowLogout)}
        role="menuitem"
        onClick={onLogoutClick}
      >
        <span className={styles.profileMenuRowIcon} aria-hidden>
          <LogOut size={18} strokeWidth={1.75} />
        </span>
        <span className={styles.profileMenuRowText}>Log out</span>
      </button>
    </>
  );
}

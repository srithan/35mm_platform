"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  Bell,
  ChevronDown,
  Clapperboard,
  House,
  MessageCircle,
  Search,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/Logo";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { ProfileMenu } from "@/components/layout/SiteHeader/components/ProfileMenu/ProfileMenu";
import { useSiteHeaderDropdowns } from "@/components/layout/SiteHeader/hooks/useSiteHeaderDropdowns";
import { useComposerModal } from "@/components/layout/PostComposerModalContext";
import { useAuthPrompt } from "@/features/auth/components/AuthPromptProvider";
import {
  initialForName,
  useCurrentUserProfile,
} from "@/features/profile/hooks/useCurrentUserProfile";
import { ROUTES } from "@/lib/constants/routes";
import { FOCUSED_NAVIGATION_ALIGNMENT } from "@/lib/config/uiFlags";
import { isRouteActive } from "@/lib/utils/navigation";
import { cn } from "@/lib/utils/cn";
import styles from "./FocusedNavigationSidebar.module.css";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  fillWhenActive?: boolean;
  gated?: boolean;
  matches?: (pathname: string) => boolean;
};

function isDiscoverSection(pathname: string): boolean {
  return [ROUTES.DISCOVER, ROUTES.FILMS, ROUTES.LISTS, ROUTES.CONTRIBUTE].some(function (route) {
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

export function FocusedNavigationSidebar() {
  const pathname = usePathname() ?? ROUTES.HOME;
  const router = useRouter();
  const { signOut } = useClerk();
  const { user: clerkUser, isLoaded: userLoaded, isSignedIn } = useUser();
  const { promptLogin } = useAuthPrompt();
  const { openComposerModal } = useComposerModal();
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const signedOut = userLoaded && !isSignedIn;
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const {
    profileMenuOpen,
    profileWrapRef,
    toggleProfileMenu,
    closeProfileMenu,
  } = useSiteHeaderDropdowns();

  const profileUsername = currentUser?.username ?? clerkUser?.username ?? null;
  const profileHref = profileUsername ? ROUTES.PROFILE(profileUsername) : ROUTES.HOME;
  const currentDisplayName =
    currentUser?.displayName ?? clerkUser?.fullName ?? clerkUser?.username ?? "Profile";
  const currentAvatarUrl = currentUser?.avatarUrl ?? null;
  const suppressDefaultAvatar =
    !currentUser?.avatarUrl &&
    (currentUserQuery.isPending ||
      currentUserQuery.isLoading ||
      currentUserQuery.isFetching ||
      currentUserQuery.fetchStatus !== "idle");

  const items: readonly NavigationItem[] = [
    { href: ROUTES.HOME, label: "Home", icon: House, gated: true },
    {
      href: ROUTES.DISCOVER,
      label: "Discover",
      icon: Search,
      matches: isDiscoverSection,
    },
    { href: ROUTES.SEVENTY_MM, label: "Watch", icon: Clapperboard, gated: true },
    { href: ROUTES.CHAT, label: "Messages", icon: MessageCircle, gated: true },
    { href: ROUTES.NOTIFICATIONS, label: "Activity", icon: Bell, gated: true },
    { href: profileHref, label: "Profile", icon: UserRound, gated: true },
  ];

  function handleGatedNavigation(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    promptLogin();
  }

  function handleNewPost() {
    if (signedOut) {
      promptLogin();
      return;
    }
    openComposerModal();
  }

  function confirmLogout() {
    void signOut().then(function () {
      router.push(ROUTES.AUTH_LOGIN);
    });
  }

  return (
    <aside className={styles.sidebar} aria-label="Primary navigation">
      <div className={styles.inner}>
        <BrandLogo
          href={ROUTES.HOME}
          className={styles.brand}
          markClassName={styles.brandMark}
        />

        <nav
          className={cn(
            styles.nav,
            FOCUSED_NAVIGATION_ALIGNMENT === "center" ? styles.navCentered : null
          )}
          aria-label="Main navigation"
        >
          {items.map(function (item) {
            const active = item.matches
              ? item.matches(pathname)
              : isRouteActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(styles.navItem, active ? styles.navItemActive : null)}
                aria-current={active ? "page" : undefined}
                onClick={signedOut && item.gated ? handleGatedNavigation : undefined}
              >
                <span className={styles.navItemIconWrap} aria-hidden>
                  <Icon
                    className={cn(
                      styles.navItemIcon,
                      active && item.fillWhenActive !== false ? styles.navItemIconFilled : null
                    )}
                    size={24}
                    strokeWidth={2}
                  />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button type="button" className={styles.newPost} onClick={handleNewPost}>
            <span>Create</span>
            <ChevronDown className={styles.newPostIcon} size={18} strokeWidth={2.4} aria-hidden />
          </button>
        </nav>

        <div className={styles.bottom}>
          {signedOut ? (
            <div className={styles.authActions}>
              <Link
                href={ROUTES.AUTH_LOGIN}
                className={styles.authLink}
                onClick={function (event: MouseEvent<HTMLAnchorElement>) {
                  event.preventDefault();
                  promptLogin({ mode: "login" });
                }}
              >
                Log in
              </Link>
              <Link
                href={ROUTES.AUTH_SIGNUP}
                className={cn(styles.authLink, styles.authSignup)}
                onClick={function (event: MouseEvent<HTMLAnchorElement>) {
                  event.preventDefault();
                  promptLogin({ mode: "signup" });
                }}
              >
                Sign up
              </Link>
            </div>
          ) : (
            <ProfileMenu
              wrapRef={profileWrapRef}
              open={profileMenuOpen}
              onToggle={toggleProfileMenu}
              onClose={closeProfileMenu}
              onLogoutClick={function () {
                setLogoutConfirmOpen(true);
              }}
              profileHref={profileHref}
              currentDisplayName={currentDisplayName}
              currentInitial={initialForName(currentDisplayName)}
              currentAvatarUrl={currentAvatarUrl}
              suppressDefaultAvatar={suppressDefaultAvatar}
              triggerVariant="sidebar-more"
            />
          )}
        </div>
      </div>

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
    </aside>
  );
}

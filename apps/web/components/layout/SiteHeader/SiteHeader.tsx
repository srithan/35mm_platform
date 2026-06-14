"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { ROUTES } from "@/lib/constants/routes";
import { isRouteActive } from "@/lib/utils/navigation";
import { initialForName, useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { HeaderLeft } from "./components/HeaderLeft";
import { NavLinks } from "./components/NavLinks";
import { NewPostButton } from "./components/NewPostButton";
import { NotificationDropdown } from "./components/NotificationDropdown";
import { ProfileMenu } from "./components/ProfileMenu/ProfileMenu";
import { useSiteHeaderDropdowns } from "./hooks/useSiteHeaderDropdowns";
import { useSiteHeaderNotifications } from "./hooks/useSiteHeaderNotifications";
import { useSiteHeaderStickyOffset } from "./hooks/useSiteHeaderStickyOffset";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const navRef = useSiteHeaderStickyOffset();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const {
    notifOpen,
    profileMenuOpen,
    notifWrapRef,
    profileWrapRef,
    toggleNotif,
    toggleProfileMenu,
    closeNotif,
    closeProfileMenu,
  } = useSiteHeaderDropdowns();

  const {
    notifRowsQuery,
    notifRows,
    unreadRowsQuery,
    unreadBadgeCount,
    markAllMutation,
    markOneMutation,
    notifListRef,
    trapNotifPanelWheel,
  } = useSiteHeaderNotifications();

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

  function handleLogoutClick() {
    setLogoutConfirmOpen(true);
  }

  function confirmLogout() {
    void signOut().then(function () {
      router.push(ROUTES.AUTH_LOGIN);
    });
  }

  return (
    <>
      <nav
        ref={navRef}
        id="site-nav"
        className={styles.siteNav}
      >
        <div className={styles.navMain}>
          <HeaderLeft />
          <NavLinks isActive={isActive} profileHref={profileHref} />
          <div className={styles.navActions}>
            <NotificationDropdown
              wrapRef={notifWrapRef}
              listRef={notifListRef}
              open={notifOpen}
              onToggle={toggleNotif}
              onClose={closeNotif}
              notifRowsQuery={notifRowsQuery}
              notifRows={notifRows}
              unreadRowsQuery={unreadRowsQuery}
              unreadBadgeCount={unreadBadgeCount}
              markAllMutation={markAllMutation}
              markOneMutation={markOneMutation}
              onTrapWheel={trapNotifPanelWheel}
            />
            <NewPostButton />
            <ProfileMenu
              wrapRef={profileWrapRef}
              open={profileMenuOpen}
              onToggle={toggleProfileMenu}
              onClose={closeProfileMenu}
              onLogoutClick={handleLogoutClick}
              profileHref={profileHref}
              currentDisplayName={currentDisplayName}
              currentInitial={currentInitial}
              currentAvatarUrl={currentAvatarUrl}
              suppressDefaultAvatar={suppressDefaultAvatar}
            />
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

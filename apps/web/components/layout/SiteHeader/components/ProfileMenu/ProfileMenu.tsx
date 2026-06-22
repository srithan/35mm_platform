import type { Ref } from "react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { cn } from "@/lib/utils/cn";
import type { ThemeOption } from "@/lib/theme/ThemeProvider";
import {
  DEFAULT_ACCENT_COLOR,
  resolveAccentColor,
  type AccentColorOption,
} from "@/lib/theme/accentColors";
import { applyAccentColor } from "@/lib/theme/applyAccentColor";
import type { AppearanceSettings, PrivacySettings } from "@/features/settings/types/settings";
import {
  useSettingsQuery,
  useUpdateAppearanceMutation,
  useUpdatePrivacyMutation,
} from "@/features/settings/hooks/useSettings";
import { useTheme } from "@/lib/theme/useTheme";
import type { ProfileMenuDirection, ProfileMenuView } from "../../types";
import { ProfileMenuAppearanceView } from "./ProfileMenuAppearanceView";
import { ProfileMenuMainView } from "./ProfileMenuMainView";
import { ProfileMenuPrivacyView } from "./ProfileMenuPrivacyView";
import styles from "../../SiteHeader.module.css";

type ProfileMenuProps = {
  wrapRef: Ref<HTMLDivElement>;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogoutClick: () => void;
  profileHref: string;
  currentDisplayName: string;
  currentInitial: string;
  currentAvatarUrl: string | null;
  suppressDefaultAvatar: boolean;
};

export function ProfileMenu({
  wrapRef,
  open,
  onToggle,
  onClose,
  onLogoutClick,
  profileHref,
  currentDisplayName,
  currentInitial,
  currentAvatarUrl,
  suppressDefaultAvatar,
}: ProfileMenuProps) {
  const { theme, setTheme } = useTheme();
  const settingsQuery = useSettingsQuery();
  const updateAppearanceMutation = useUpdateAppearanceMutation();
  const updatePrivacyMutation = useUpdatePrivacyMutation();
	  const [profileMenuView, setProfileMenuView] = useState<ProfileMenuView>("main");
	  const [profileMenuDirection, setProfileMenuDirection] = useState<ProfileMenuDirection>("forward");
	  const [confirmMakePublicOpen, setConfirmMakePublicOpen] = useState(false);

  const appearanceSettings: AppearanceSettings = settingsQuery.data?.appearance
    ? {
        ...settingsQuery.data.appearance,
        theme: settingsQuery.data.appearance.theme ?? theme,
        accentColor: resolveAccentColor(settingsQuery.data.appearance.accentColor),
      }
    : {
        theme,
        accentColor: DEFAULT_ACCENT_COLOR,
        videoAutoplay: true,
      };
  const privacySettings: PrivacySettings = settingsQuery.data?.privacy ?? {
    privateAccount: false,
    allowMessagesFromAnyone: true,
    showActivityStatus: true,
  };

  useEffect(
    function () {
      if (open) return;
      setProfileMenuView("main");
      setProfileMenuDirection("forward");
    },
    [open]
  );

  function handleToggle() {
    if (!open) {
      setProfileMenuView("main");
      setProfileMenuDirection("forward");
    }
    onToggle();
  }

  function openProfileSubmenu(view: Extract<ProfileMenuView, "appearance" | "privacy">) {
    setProfileMenuDirection("forward");
    setProfileMenuView(view);
  }

  function returnToProfileMainMenu() {
    setProfileMenuDirection("back");
    setProfileMenuView("main");
  }

  function selectProfileTheme(nextTheme: ThemeOption) {
    if (nextTheme === appearanceSettings.theme) return;
    const previousTheme = theme;
    setTheme(nextTheme);
    updateAppearanceMutation.mutate(
      { ...appearanceSettings, theme: nextTheme },
      {
        onError: function () {
          setTheme(previousTheme);
        },
      }
    );
  }

  function selectProfileAccentColor(nextAccentColor: AccentColorOption) {
    if (nextAccentColor === appearanceSettings.accentColor) return;
    const previousAccentColor = appearanceSettings.accentColor;
    applyAccentColor(nextAccentColor);
    updateAppearanceMutation.mutate(
      { ...appearanceSettings, accentColor: nextAccentColor },
      {
        onError: function () {
          applyAccentColor(previousAccentColor);
        },
      }
    );
  }

  function toggleProfileVideoAutoplay(checked: boolean) {
    updateAppearanceMutation.mutate({
      ...appearanceSettings,
      videoAutoplay: checked,
    });
  }

	  function toggleProfilePrivacySetting(key: keyof PrivacySettings, checked: boolean) {
	    if (key === "privateAccount" && privacySettings.privateAccount && !checked) {
	      setConfirmMakePublicOpen(true);
	      return;
	    }
	    updatePrivacyMutation.mutate({
	      ...privacySettings,
	      [key]: checked,
	    });
  }

  function handleLogoutClick() {
    onClose();
    onLogoutClick();
  }

  return (
	    <div className={cn(styles.notifWrap, styles.profileMenuWrap)} ref={wrapRef}>
      <button
        type="button"
        className={styles.profileMenuTrigger}
        id="btn-profile-menu"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={handleToggle}
      >
        <Avatar
          initial={currentInitial}
          src={currentAvatarUrl}
          allowDefaultFallback={!suppressDefaultAvatar}
          size="sm"
          className={styles.navAvatar}
        />
      </button>
      {open ? (
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
          <div className={styles.profileMenuViewport}>
            <div
              key={profileMenuView}
              className={cn(
                styles.profileMenuPanel,
                profileMenuView !== "main" && profileMenuDirection === "forward"
                  ? styles.profileMenuPanelForward
                  : null,
                profileMenuDirection === "back" ? styles.profileMenuPanelBack : null
              )}
            >
              {profileMenuView === "main" ? (
                <ProfileMenuMainView
                  profileHref={profileHref}
                  currentDisplayName={currentDisplayName}
                  currentInitial={currentInitial}
                  currentAvatarUrl={currentAvatarUrl}
                  suppressDefaultAvatar={suppressDefaultAvatar}
                  onClose={onClose}
                  onOpenAppearance={function () {
                    openProfileSubmenu("appearance");
                  }}
                  onOpenPrivacy={function () {
                    openProfileSubmenu("privacy");
                  }}
                  onLogoutClick={handleLogoutClick}
                />
              ) : null}

              {profileMenuView === "appearance" ? (
                <ProfileMenuAppearanceView
                  appearanceSettings={appearanceSettings}
                  updateAppearanceMutation={updateAppearanceMutation}
                  onBack={returnToProfileMainMenu}
                  onSelectTheme={selectProfileTheme}
                  onSelectAccentColor={selectProfileAccentColor}
                  onToggleVideoAutoplay={toggleProfileVideoAutoplay}
                />
              ) : null}

              {profileMenuView === "privacy" ? (
                <ProfileMenuPrivacyView
                  privacySettings={privacySettings}
                  updatePrivacyMutation={updatePrivacyMutation}
                  onBack={returnToProfileMainMenu}
                  onToggleSetting={toggleProfilePrivacySetting}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
	      <ConfirmDialog
	        open={confirmMakePublicOpen}
	        onClose={() => setConfirmMakePublicOpen(false)}
	        onConfirm={() => {
	          updatePrivacyMutation.mutate({
	            ...privacySettings,
	            privateAccount: false,
	          });
	        }}
	        title="Make account public?"
	        description="Your posts will become visible to everyone. Any pending follow requests will be approved automatically."
	        cancelLabel="Cancel"
	        confirmLabel="Make Public"
	      />
	    </div>
	  );
	}

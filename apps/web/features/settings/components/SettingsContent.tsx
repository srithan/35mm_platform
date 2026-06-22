"use client";

import { Button } from "@/components/Button";
import { TopStickyBar } from "@/components/TopStickyBar/TopStickyBar";
import { ROUTES } from "@/lib/constants/routes";
import { useTheme } from "@/lib/theme/useTheme";
import { useAuth } from "@clerk/nextjs";
import { SettingsAccountPanel } from "./SettingsAccountPanel";
import { SettingsPrivacyPanel } from "./SettingsPrivacyPanel";
import { SettingsNotificationsPanel } from "./SettingsNotificationsPanel";
import { SettingsAppearancePanel } from "./SettingsAppearancePanel";
import { SettingsDataSecurityPanel } from "./SettingsDataSecurityPanel";
import {
  useSettingsQuery,
  useUpdateAppearanceMutation,
  useUpdateNotificationsMutation,
  useUpdatePrivacyMutation,
  useUpdateProfileMutation,
} from "../hooks/useSettings";
import type { UserSettings } from "../types/settings";

const SETTINGS_TABS = [
  {
    id: "Account",
    label: "Account",
    href: ROUTES.SETTINGS_ACCOUNT,
  },
  {
    id: "Privacy",
    label: "Privacy",
    href: ROUTES.SETTINGS_PRIVACY,
  },
  {
    id: "Notifications",
    label: "Notifications",
    mobileLabel: "Notices",
    href: ROUTES.SETTINGS_NOTIFICATIONS,
  },
  {
    id: "Appearance",
    label: "Appearance",
    mobileLabel: "Display",
    href: ROUTES.SETTINGS_APPEARANCE,
  },
  {
    id: "Data & security",
    label: "Data & security",
    mobileLabel: "Data",
    href: ROUTES.SETTINGS_DATA_SECURITY,
  },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

export function SettingsContent({ initialTab = "Account" }: { initialTab?: SettingsTab }) {
  const { theme, setTheme } = useTheme();
  const { isLoaded } = useAuth();
  const settingsQuery = useSettingsQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const updatePrivacyMutation = useUpdatePrivacyMutation();
  const updateNotificationsMutation = useUpdateNotificationsMutation();
  const updateAppearanceMutation = useUpdateAppearanceMutation();

  const settings = settingsQuery.data;

  const fallbackSettings: UserSettings = {
    profile: {
      displayName: "",
      username: "",
      email: "",
    },
    privacy: {
      privateAccount: false,
      allowMessagesFromAnyone: true,
      showActivityStatus: true,
    },
    notifications: {
      newFollowers: true,
      likesOnPosts: true,
      commentsAndReplies: true,
      mentions: true,
      festivalUpdates: true,
      watchlistStreaming: true,
      emailDigest: false,
    },
    appearance: {
      theme,
      accentColor: "theme",
      videoAutoplay: true,
    },
  };

  const settingsTabBar = (
    <TopStickyBar
      tabs={SETTINGS_TABS}
      activeTabId={initialTab}
      navAriaLabel="Settings sections"
      variant="headline"
      title="Settings"
      subtitle="Manage your account and preferences"
      rootClassName="shadow-[0_1px_0_rgba(0,0,0,0.02)]"
      headerClassName="mx-auto w-full max-w-3xl px-4 sm:px-6 md:px-8"
      tabsViewportClassName="md:justify-start"
      tabsListClassName="mx-auto w-full max-w-3xl gap-5 px-4 sm:px-6 md:px-8"
      tabClassName="pb-2 pt-2 text-[12.5px] sm:text-[13px]"
    />
  );

  if (!isLoaded || !settingsQuery.isFetched) {
    return (
      <>
        {settingsTabBar}
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:px-8 lg:py-8">
          <div className="rounded-lg border border-border bg-elevated p-5 text-sm text-fg-muted sm:p-6">
            Loading settings...
          </div>
        </div>
      </>
    );
  }

  const hydratedSettings = settings ?? fallbackSettings;

  const tabPanels: Record<SettingsTab, React.ReactNode> = {
    Account: (
      <SettingsAccountPanel
        initialValues={hydratedSettings.profile}
        onSave={async (values) => {
          await updateProfileMutation.mutateAsync(values);
        }}
      />
    ),
    Privacy: (
      <SettingsPrivacyPanel
        initialValues={hydratedSettings.privacy}
        onSave={async (values) => {
          await updatePrivacyMutation.mutateAsync(values);
        }}
      />
    ),
    Notifications: (
      <SettingsNotificationsPanel
        initialValues={hydratedSettings.notifications}
        onSave={async (values) => {
          await updateNotificationsMutation.mutateAsync(values);
        }}
      />
    ),
    Appearance: (
      <SettingsAppearancePanel
        initialValues={{ ...hydratedSettings.appearance, theme }}
        setTheme={setTheme}
        onSave={async (values) => {
          await updateAppearanceMutation.mutateAsync(values);
          setTheme(values.theme);
        }}
      />
    ),
    "Data & security": <SettingsDataSecurityPanel />,
  };

  return (
    <>
      {settingsTabBar}

      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:px-8 lg:py-8">
        {settingsQuery.isError ? (
          <div className="rounded-lg border border-accent/30 bg-elevated p-5 sm:p-6">
            <p className="text-sm text-accent">
              Could not load settings. Please retry.
            </p>
            <div className="pt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void settingsQuery.refetch();
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : (
          tabPanels[initialTab]
        )}
      </div>
    </>
  );
}

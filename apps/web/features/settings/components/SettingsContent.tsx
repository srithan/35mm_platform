"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { TopStickyBar } from "@/components/TopStickyBar/TopStickyBar";
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
  "Account",
  "Privacy",
  "Notifications",
  "Appearance",
  "Data & security",
] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

export function SettingsContent({ initialTab = "Account" }: { initialTab?: SettingsTab }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const { theme, setTheme } = useTheme();
  const { isLoaded } = useAuth();
  const settingsQuery = useSettingsQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const updatePrivacyMutation = useUpdatePrivacyMutation();
  const updateNotificationsMutation = useUpdateNotificationsMutation();
  const updateAppearanceMutation = useUpdateAppearanceMutation();

  const tabs = SETTINGS_TABS.map((tab) => ({
    id: tab,
    label: tab,
    onClick: () => setActiveTab(tab),
  }));

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

  if (!isLoaded || !settingsQuery.isFetched) {
    return (
      <div className="px-10 py-8">
        <div className="rounded-xl border border-border bg-elevated p-6 text-sm text-fg-muted">
          Loading settings...
        </div>
      </div>
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
      <TopStickyBar
        tabs={tabs}
        activeTabId={activeTab}
        navAriaLabel="Settings sections"
        variant="headline"
        title="Settings"
        subtitle="Manage your account and preferences"
      />

      <div className="px-10 py-8">
        {settingsQuery.isError ? (
          <div className="rounded-xl border border-accent/30 bg-elevated p-6">
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
          tabPanels[activeTab]
        )}
      </div>
    </>
  );
}

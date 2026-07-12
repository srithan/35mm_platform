"use client";

import { Button } from "@/components/Button";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/lib/theme/useTheme";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Database,
  Palette,
  Shield,
  UserRound,
  Video,
} from "lucide-react";
import { SettingsAccountPanel } from "./SettingsAccountPanel";
import { SettingsPrivacyPanel } from "./SettingsPrivacyPanel";
import { SettingsNotificationsPanel } from "./SettingsNotificationsPanel";
import { SettingsAppearancePanel } from "./SettingsAppearancePanel";
import { SettingsMediaPanel } from "./SettingsMediaPanel";
import {
  SettingsModerationListPanel,
  type SettingsModerationListKind,
} from "./SettingsModerationListPanel";
import { SettingsDataSecurityPanel } from "./SettingsDataSecurityPanel";
import { MyReportsPanel } from "@/features/moderation/components/MyReportsPanel";
import {
  useSettingsQuery,
  useUpdateAppearanceMutation,
  useUpdateMediaMutation,
  useUpdateNotificationsMutation,
  useUpdatePrivacyMutation,
  useUpdateProfileMutation,
} from "../hooks/useSettings";
import type { UserSettings } from "../types/settings";

const SETTINGS_TABS = [
  {
    id: "Account",
    label: "Account",
    description: "Profile and login basics",
    icon: UserRound,
    href: ROUTES.SETTINGS_ACCOUNT,
  },
  {
    id: "Privacy",
    label: "Privacy",
    description: "Audience and interactions",
    icon: Shield,
    href: ROUTES.SETTINGS_PRIVACY,
  },
  {
    id: "Notifications",
    label: "Notifications",
    mobileLabel: "Notices",
    description: "Push, activity, email",
    icon: Bell,
    href: ROUTES.SETTINGS_NOTIFICATIONS,
  },
  {
    id: "Appearance",
    label: "Appearance",
    mobileLabel: "Display",
    description: "Theme, color, motion",
    icon: Palette,
    href: ROUTES.SETTINGS_APPEARANCE,
  },
  {
    id: "Media",
    label: "Media",
    description: "Video playback and captions",
    icon: Video,
    href: ROUTES.SETTINGS_MEDIA,
  },
  {
    id: "Data & security",
    label: "Data & security",
    mobileLabel: "Data",
    description: "Exports and account safety",
    icon: Database,
    href: ROUTES.SETTINGS_DATA_SECURITY,
  },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

type PrivacyListKind = SettingsModerationListKind | "reports";

type SettingsContentProps = {
  initialTab?: SettingsTab;
  privacyList?: PrivacyListKind;
  mobileHome?: boolean;
};

const PRIVACY_LIST_LABELS: Record<PrivacyListKind, string> = {
  blocked: "Blocked",
  muted: "Muted",
  reports: "Your reports",
};

export function SettingsContent({
  initialTab = "Account",
  privacyList,
  mobileHome = false,
}: SettingsContentProps) {
  const { theme, setTheme } = useTheme();
  const { isLoaded } = useAuth();
  const settingsQuery = useSettingsQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const updatePrivacyMutation = useUpdatePrivacyMutation();
  const updateNotificationsMutation = useUpdateNotificationsMutation();
  const updateAppearanceMutation = useUpdateAppearanceMutation();
  const updateMediaMutation = useUpdateMediaMutation();

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
      emailPreferences: {
        likesOnPosts: false,
        repostsOnPosts: false,
        newFollowers: true,
        followRequests: true,
        followRequestApproved: true,
        comments: true,
        replies: true,
        mentions: true,
        filmLogged: false,
      },
    },
    appearance: {
      theme,
      accentColor: "theme",
      videoAutoplay: true,
    },
    media: {
      videoDefaultQuality: "auto",
      videoAutoplay: true,
      alwaysShowCaptions: false,
      captionStyle: "default",
      quietMode: false,
    },
  };

  const mobileSettingsHome = (
    <div className="mx-auto w-full max-w-3xl select-none px-4 py-5 sm:px-6 md:hidden">
      <div className="px-1 pb-4">
        <h1 className="text-[22px] font-bold leading-7 tracking-[-0.02em] text-fg">
          Settings
        </h1>
        <p className="mt-1 text-[12.5px] leading-5 text-fg-muted">
          Manage account, privacy, media, and app preferences.
        </p>
      </div>
      <nav aria-label="Settings sections" className="-mx-4 sm:-mx-6">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className="group flex min-w-0 items-center gap-3.5 border-b border-border px-5 py-4 text-left no-underline transition-colors first:border-t hover:bg-sunken sm:px-6"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-fg-muted transition-colors group-hover:text-fg"
                aria-hidden
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold leading-5 text-fg">
                  {tab.label}
                </span>
                <span className="block truncate text-[12px] leading-4 text-fg-muted">
                  {tab.description}
                </span>
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-fg-faint transition-colors group-hover:text-fg-muted"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );

  if (!isLoaded || !settingsQuery.isFetched) {
    return (
      <>
        {mobileHome ? mobileSettingsHome : null}
        <div
          className={cn(
            "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:px-8 lg:py-8",
            mobileHome ? "hidden md:block" : ""
          )}
        >
          <div className="text-sm text-fg-muted md:rounded-2xl md:border md:border-border md:bg-elevated md:p-6 md:shadow-[0_18px_44px_rgba(0,0,0,0.05)]">
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
    Privacy: privacyList === "reports" ? (
      <MyReportsPanel />
    ) : privacyList ? (
      <SettingsModerationListPanel kind={privacyList} />
    ) : (
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
    Media: (
      <SettingsMediaPanel
        initialValues={{
          ...hydratedSettings.media,
          videoAutoplay:
            hydratedSettings.media?.videoAutoplay ??
            hydratedSettings.appearance.videoAutoplay,
        }}
        onSave={async (values) => {
          await updateMediaMutation.mutateAsync(values);
        }}
      />
    ),
    "Data & security": <SettingsDataSecurityPanel />,
  };

  const activeTab = SETTINGS_TABS.find((tab) => tab.id === initialTab) ?? SETTINGS_TABS[0];
  const privacyListLabel = privacyList ? PRIVACY_LIST_LABELS[privacyList] : null;
  const headerTitle = privacyListLabel ?? activeTab.label;
  const headerDescription = privacyListLabel ? "Privacy controls" : activeTab.description;
  const mobileBackHref = privacyListLabel ? ROUTES.SETTINGS_PRIVACY : ROUTES.SETTINGS;
  const mobileBackLabel = privacyListLabel ? "Back to privacy settings" : "Back to settings";

  return (
    <>
      {mobileHome ? mobileSettingsHome : null}

      <div
        className={cn(
          "mx-auto w-full max-w-6xl select-none px-4 py-5 sm:px-6 md:grid md:grid-cols-[18rem_minmax(0,1fr)] md:gap-8 md:px-8 md:py-6 lg:py-8",
          mobileHome ? "hidden md:grid" : ""
        )}
      >
        <aside className="hidden md:block">
          <div className="sticky top-[calc(var(--site-header-sticky-offset,4.5rem)+1rem)] overflow-hidden rounded-2xl border border-border bg-elevated p-3 shadow-[0_18px_44px_rgba(0,0,0,0.05)]">
            <div className="px-4 pb-3 pt-2">
              <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-fg">
                Settings
              </h1>
            </div>
            <nav aria-label="Settings sections" className="space-y-1">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = tab.id === initialTab;

                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-start gap-3.5 rounded-xl px-4 py-3 text-left no-underline transition-colors",
                      active
                        ? "bg-sunken text-fg shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--fg)_8%,transparent)]"
                        : "text-fg-muted hover:bg-sunken hover:text-fg"
                    )}
                  >
                    {active ? (
                      <span
                        className="absolute left-1.5 top-3 bottom-3 w-0.5 rounded-full bg-accent"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        active
                          ? "bg-bg text-accent shadow-sm"
                          : "bg-sunken text-fg-muted group-hover:text-fg"
                      )}
                      aria-hidden
                    >
                      <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-5">
                        {tab.label}
                      </span>
                      <span
                        className={cn(
                          "block text-[11.5px] leading-4",
                          active ? "text-fg-muted" : "text-fg-faint"
                        )}
                      >
                        {tab.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-elevated md:shadow-[0_18px_44px_rgba(0,0,0,0.05)]">
            <div className="hidden border-b border-border px-5 py-4 md:block sm:px-6">
              <div className="flex min-w-0 items-center justify-between gap-4">
                <div className="min-w-0">
                  {privacyListLabel ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <Link
                        href={ROUTES.SETTINGS_PRIVACY}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg"
                        aria-label="Back to privacy settings"
                      >
                        <span aria-hidden>←</span>
                      </Link>
                      <h2 className="truncate text-[15px] font-semibold leading-5 text-fg">
                        {privacyListLabel}
                      </h2>
                    </div>
                  ) : (
                    <h2 className="truncate text-[15px] font-semibold leading-5 text-fg">
                      {headerTitle}
                    </h2>
                  )}
                  <p className="mt-0.5 truncate text-[12px] leading-4 text-fg-muted">
                    {headerDescription}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-1 md:hidden">
              <div>
                <Link
                  href={mobileBackHref}
                  className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-hover hover:text-fg"
                  aria-label={mobileBackLabel}
                >
                  <ArrowLeft className="h-5 w-5" strokeWidth={2.1} aria-hidden />
                </Link>
              </div>
              <div className="mt-1 min-w-0">
                {privacyListLabel ? (
                  <h1 className="truncate text-[22px] font-bold leading-7 tracking-[-0.02em] text-fg">
                    {privacyListLabel}
                  </h1>
                ) : (
                  <h1 className="truncate text-[22px] font-bold leading-7 tracking-[-0.02em] text-fg">
                    {headerTitle}
                  </h1>
                )}
              </div>
              <p className="mt-1 text-[12px] leading-4 text-fg-muted">
                {headerDescription}
              </p>
            </div>

            <div className="px-1 pt-5 md:p-6">
              {settingsQuery.isError ? (
                <div className="rounded-2xl border border-accent/30 bg-sunken p-5 sm:p-6">
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
          </div>
        </main>
      </div>
    </>
  );
}

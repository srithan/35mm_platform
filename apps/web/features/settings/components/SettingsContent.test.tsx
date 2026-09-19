import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsContent } from "./SettingsContent";

const flags = vi.hoisted(() => ({ focusedNavigationEnabled: false }));

vi.mock("@/lib/config/uiFlags", () => ({
  get FOCUSED_NAVIGATION_ENABLED() {
    return flags.focusedNavigationEnabled;
  },
}));

vi.mock("@/lib/theme/useTheme", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true }),
}));

vi.mock("../hooks/useSettings", () => ({
  useSettingsQuery: () => ({
    data: {
      profile: {
        displayName: "Jane Viewer",
        username: "jane",
        email: "jane@example.com",
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
        theme: "light",
        accentColor: "theme",
        videoAutoplay: true,
      },
      media: {
        videoDefaultQuality: "auto",
        videoAutoplay: true,
        alwaysShowCaptions: false,
        captionStyle: "default",
        startWithSound: false,
        quietMode: false,
      },
      streamingServices: {
        serviceIds: [],
      },
    },
    isFetched: true,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateAppearanceMutation: () => ({ mutateAsync: vi.fn() }),
  useUpdateMediaMutation: () => ({ mutateAsync: vi.fn() }),
  useUpdateNotificationsMutation: () => ({ mutateAsync: vi.fn() }),
  useUpdatePrivacyMutation: () => ({ mutateAsync: vi.fn() }),
  useUpdateProfileMutation: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("./SettingsAccountPanel", () => ({
  SettingsAccountPanel: () => <section>Account panel</section>,
}));

vi.mock("./SettingsPrivacyPanel", () => ({
  SettingsPrivacyPanel: () => <section>Privacy panel</section>,
}));

vi.mock("./SettingsNotificationsPanel", () => ({
  SettingsNotificationsPanel: () => <section>Notifications panel</section>,
}));

vi.mock("./SettingsAppearancePanel", () => ({
  SettingsAppearancePanel: () => <section>Appearance panel</section>,
}));

vi.mock("./SettingsMediaPanel", () => ({
  SettingsMediaPanel: () => <section>Media panel</section>,
}));

vi.mock("./SettingsModerationListPanel", () => ({
  SettingsModerationListPanel: () => <section>Moderation list panel</section>,
}));

vi.mock("./SettingsDataSecurityPanel", () => ({
  SettingsDataSecurityPanel: () => <section>Data security panel</section>,
}));

vi.mock("@/features/moderation/components/MyReportsPanel", () => ({
  MyReportsPanel: () => <section>Reports panel</section>,
}));

vi.mock("@/features/moderation/components/MyReportDetailPanel", () => ({
  MyReportDetailPanel: () => <section>Report detail panel</section>,
}));

describe("SettingsContent desktop layout", () => {
  beforeEach(() => {
    flags.focusedNavigationEnabled = false;
  });

  it("keeps desktop settings navigation in a side column by default", () => {
    const { container } = render(<SettingsContent initialTab="Privacy" />);

    const root = container.firstElementChild as HTMLElement;
    const nav = screen.getByRole("navigation", { name: "Settings sections" });

    expect(root).toHaveClass("max-w-6xl", "md:grid", "md:grid-cols-[18rem_minmax(0,1fr)]");
    expect(nav).toHaveClass("space-y-1");
    expect(nav).not.toHaveClass("flex");
    expect(screen.getByText("Privacy panel")).toBeInTheDocument();
  });

  it("uses top desktop tabs and single-column body when focused navigation is enabled", () => {
    flags.focusedNavigationEnabled = true;

    const { container } = render(<SettingsContent initialTab="Privacy" />);

    const root = container.firstElementChild as HTMLElement;
    const nav = screen.getByRole("navigation", { name: "Settings sections" });
    const activeTab = screen.getByRole("link", { name: /^Privacy$/ });

    expect(root).toHaveClass("max-w-5xl", "md:block");
    expect(root).not.toHaveClass("md:grid", "md:grid-cols-[18rem_minmax(0,1fr)]");
    expect(nav).toHaveClass("sticky", "border-b", "md:block");
    expect(nav).not.toHaveClass("space-y-1");
    expect(activeTab).toHaveClass("border-b-4", "border-accent", "py-3");
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(screen.getByText("Privacy panel")).toBeInTheDocument();
  });
});

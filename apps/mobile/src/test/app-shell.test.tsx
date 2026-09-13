import { MobileUIProvider, SafeAreaProvider } from "@35mm/mobile-ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { CurrentUserBootstrapProfile } from "@/features/auth/bootstrap/api";
import { AppShell } from "@/features/shell/AppShell";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/features/shell/HomeFeedScreen", () => ({
  HomeFeedScreen: () => null,
}));

jest.mock("@/features/bookmarks/BookmarksScreen", () => ({
  BookmarksScreen: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require("react-native") as typeof import("react-native");
    return <Text>Bookmarks screen</Text>;
  },
}));

jest.mock("@/features/chat/ChatScreen", () => ({
  ChatScreen: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require("react-native") as typeof import("react-native");
    return <Text>Chat screen</Text>;
  },
}));

jest.mock("@/features/lists/ListsScreen", () => ({
  ListsScreen: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require("react-native") as typeof import("react-native");
    return <Text>Lists screen</Text>;
  },
}));

jest.mock("@/features/notifications/NotificationsScreen", () => ({
  NotificationsScreen: () => null,
}));

jest.mock("@/features/profile/ProfileScreen", () => ({
  ProfileScreen: ({
    currentUser,
  }: {
    readonly currentUser: CurrentUserBootstrapProfile;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text, View } = require("react-native") as typeof import("react-native");
    return (
      <View>
        <Text>@{currentUser.username}</Text>
        <Text>{currentUser.filmsLoggedCount}</Text>
        <Text>{currentUser.followerCount}</Text>
        <Text>{currentUser.followingCount}</Text>
      </View>
    );
  },
}));

jest.mock("@/features/videos/VideoPostComposer", () => ({
  VideoPostComposer: ({ visible }: { readonly visible: boolean }) =>
    visible ? null : null,
}));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <MobileUIProvider preference="light" reduceMotion systemColorScheme="light">
        {children}
      </MobileUIProvider>
    </SafeAreaProvider>
  );
}

const PROFILE: CurrentUserBootstrapProfile = {
  userId: "user-1",
  username: "toni",
  displayName: "Toni",
  avatarUrl: null,
  avatarUrlLg: null,
  role: "critic",
  roleContext: "Noir desk",
  filmsLoggedCount: 42,
  followerCount: 1200,
  followingCount: 98,
};

describe("mobile app shell", () => {
  it("renders the five-tab shell and gates unfinished web-parity destinations", async () => {
    await render(
      <Providers>
        <AppShell profile={PROFILE} />
      </Providers>,
    );

    expect(screen.getByTestId("app-shell")).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Home" })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Discover" })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Create" })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Notifications" })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Profile" })).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId("shell-tab-discover"));
    await waitFor(() => {
      expect(screen.getByText("Discover is next in the native build")).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByTestId("shell-tab-profile"));
    await waitFor(() => {
      expect(screen.getByText("@toni")).toBeOnTheScreen();
    });
    expect(screen.getByText("42")).toBeOnTheScreen();
    expect(screen.getByText("1200")).toBeOnTheScreen();
    expect(screen.getByText("98")).toBeOnTheScreen();
  });

  it("opens drawer destinations from the shared shell", async () => {
    await render(
      <Providers>
        <AppShell profile={PROFILE} />
      </Providers>,
    );

    fireEvent.press(screen.getByRole("button", { name: "Open navigation drawer" }));
    await waitFor(() => {
      expect(screen.getByText("Bookmarks")).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByTestId("drawer-destination-bookmarks"));
    await waitFor(() => {
      expect(screen.getByText("Bookmarks screen")).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: "Open navigation drawer" }));
    await waitFor(() => {
      expect(screen.getByTestId("drawer-destination-lists")).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByTestId("drawer-destination-lists"));
    await waitFor(() => {
      expect(screen.getByText("Lists screen")).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByRole("button", { name: "Open navigation drawer" }));
    await waitFor(() => {
      expect(screen.getByTestId("drawer-destination-chat")).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByTestId("drawer-destination-chat"));
    await waitFor(() => {
      expect(screen.getByText("Chat screen")).toBeOnTheScreen();
    });
  });
});

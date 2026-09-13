import { MobileUIProvider, SafeAreaProvider } from "@35mm/mobile-ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { CurrentUserBootstrapProfile } from "@/features/auth/bootstrap/api";
import {
  fetchProfileFeedPage,
  fetchProfileListsPage,
  fetchProfileStats,
  fetchPublicProfile,
  followProfile,
  reportProfile,
} from "@/features/profile/api";
import { ProfileScreen } from "@/features/profile/ProfileScreen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@35mm/mobile-ui", () => {
  const actual = jest.requireActual("@35mm/mobile-ui") as typeof import("@35mm/mobile-ui");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react") as typeof import("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text, View } = require("react-native") as typeof import("react-native");
  return {
    ...actual,
    ActionSheet: ({
      sections,
      testID,
      visible,
    }: {
      readonly sections: readonly {
        readonly actions: readonly {
          readonly id: string;
          readonly label: string;
          readonly onPress: () => void;
        }[];
      }[];
      readonly testID?: string;
      readonly visible: boolean;
    }) => visible ? (
      <View testID={testID}>
        {sections.flatMap((section) => section.actions).map((action) => (
          <Pressable accessibilityRole="button" key={action.id} onPress={action.onPress}>
            <Text>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    ) : null,
    ModalSurface: ({
      children,
      testID,
      visible,
    }: {
      readonly children: React.ReactNode;
      readonly testID?: string;
      readonly visible: boolean;
    }) => visible ? <View testID={testID}>{children}</View> : null,
  };
});

jest.mock("@/services/api", () => ({
  useApiClient: () => ({ client: "mock" }),
}));

jest.mock("@/features/profile/api", () => ({
  fetchPublicProfile: jest.fn(),
  fetchProfileFeedPage: jest.fn(),
  fetchProfileListsPage: jest.fn(),
  fetchProfileStats: jest.fn(),
  followProfile: jest.fn(),
  reportProfile: jest.fn(),
}));

jest.mock("@/features/feed/PostCard", () => ({
  PostCard: ({ post }: { readonly post: { readonly body: string } }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require("react-native") as typeof import("react-native");
    return <Text>{post.body}</Text>;
  },
}));

jest.mock("@shopify/flash-list", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react") as typeof import("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native") as typeof import("react-native");
  return {
    FlashList: ({
      data,
      keyExtractor,
      ListEmptyComponent,
      ListFooterComponent,
      ListHeaderComponent,
      renderItem,
    }: {
      readonly data: readonly unknown[];
      readonly keyExtractor: (item: unknown, index: number) => string;
      readonly ListEmptyComponent?: React.ComponentType | React.ReactElement;
      readonly ListFooterComponent?: React.ComponentType | React.ReactElement;
      readonly ListHeaderComponent?: React.ComponentType | React.ReactElement;
      readonly renderItem: (info: { item: unknown; index: number }) => React.ReactElement | null;
    }) => (
      <View>
        {ListHeaderComponent
          ? React.isValidElement(ListHeaderComponent)
            ? ListHeaderComponent
            : React.createElement(ListHeaderComponent)
          : null}
        {data.length === 0 && ListEmptyComponent
          ? React.isValidElement(ListEmptyComponent)
            ? ListEmptyComponent
            : React.createElement(ListEmptyComponent)
          : data.map((item, index) => (
              <React.Fragment key={keyExtractor(item, index)}>
                {renderItem({ item, index })}
              </React.Fragment>
            ))}
        {ListFooterComponent
          ? React.isValidElement(ListFooterComponent)
            ? ListFooterComponent
            : React.createElement(ListFooterComponent)
          : null}
      </View>
    ),
  };
});

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

const PROFILE = {
  userId: "4b3c0a38-5ac5-47c3-a6af-c2a09a3e6f86",
  username: "toni",
  displayName: "Toni",
  bio: "Noir and melodrama.",
  avatarUrl: "https://cdn.35mm.test/avatar.jpg",
  avatarUrlLg: "https://cdn.35mm.test/avatar-lg.jpg",
  coverUrl: "https://cdn.35mm.test/cover.jpg",
  location: "Los Angeles",
  website: "https://toni.example",
  dateOfBirth: null,
  role: "Critic",
  roleContext: "Noir desk",
  headline: "Critic",
  headlineContext: "Noir desk",
  filmsLoggedCount: 42,
  followerCount: 1200,
  followingCount: 98,
  followState: "none" as const,
  isPrivate: false,
  hasIncomingFollowRequest: false,
  hasPendingRequestToViewer: false,
  isMutedByViewer: false,
  isDeactivated: false,
  moderationStatus: "visible" as const,
  createdAt: "2026-09-13T12:00:00.000Z",
};

const CURRENT_USER: CurrentUserBootstrapProfile = {
  userId: "b78c0a86-5816-4cd5-bfb3-26084d201f42",
  username: "maya",
  displayName: "Maya",
  avatarUrl: null,
  avatarUrlLg: null,
  role: "Cinephile",
  roleContext: null,
  filmsLoggedCount: 9,
  followerCount: 3,
  followingCount: 7,
};

const POST = {
  id: "530784aa-d70d-4c51-b846-2fea9ff2c632",
  author: {
    id: PROFILE.userId,
    username: "toni",
    displayName: "Toni",
    avatarUrl: null,
  },
  type: "text" as const,
  nsfw: { status: "none" as const, categories: [], source: null },
  body: "Profile post body",
  media: [],
  linkPreview: null,
  film: null,
  poll: null,
  createdAt: "2026-09-13T12:00:00.000Z",
  updatedAt: "2026-09-13T12:00:00.000Z",
  likeCount: 1,
  commentCount: 0,
  repostCount: 0,
  bookmarkCount: 0,
  quoteCount: 0,
  isLiked: false,
  isReposted: false,
  isBookmarked: false,
  bookmarkFolderId: null,
  repostContext: null,
  quotedPost: null,
  quotedPostUnavailable: false,
};

const STATS = {
  username: "toni",
  selectedYear: null,
  availableYears: [2026],
  filmsLoggedCount: 42,
  hoursWatched: 88,
  runtimeKnownCount: 40,
  averageRating: 8.2,
  ratedCount: 38,
  uniqueFilmsCount: 39,
  rewatchCount: 3,
  thisYearCount: 20,
  reviewsWrittenCount: 11,
  reviewLikeCount: 90,
  memberSince: "2026-01-01T00:00:00.000Z",
  favoriteFilms: [],
  genres: [],
  activity: [],
  ratingDistribution: [],
  decades: [],
  directors: [],
  artists: [],
  musicDirectors: [],
  countries: [],
  languages: [],
  mostWatchedFilms: [],
  cachedAt: "2026-09-13T12:30:00.000Z",
};

const activeQueryClients: QueryClient[] = [];

function Providers({
  children,
  queryClient,
}: {
  readonly children: ReactNode;
  readonly queryClient: QueryClient;
}) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <MobileUIProvider preference="light" reduceMotion systemColorScheme="light">
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </MobileUIProvider>
    </SafeAreaProvider>
  );
}

function renderWithProviders(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false },
      mutations: { gcTime: Infinity, retry: false },
    },
  });
  activeQueryClients.push(queryClient);
  return render(
    <Providers queryClient={queryClient}>
      {children}
    </Providers>,
  );
}

const fetchPublicProfileMock = fetchPublicProfile as jest.MockedFunction<typeof fetchPublicProfile>;
const fetchProfileFeedPageMock = fetchProfileFeedPage as jest.MockedFunction<typeof fetchProfileFeedPage>;
const fetchProfileListsPageMock = fetchProfileListsPage as jest.MockedFunction<typeof fetchProfileListsPage>;
const fetchProfileStatsMock = fetchProfileStats as jest.MockedFunction<typeof fetchProfileStats>;
const followProfileMock = followProfile as jest.MockedFunction<typeof followProfile>;
const reportProfileMock = reportProfile as jest.MockedFunction<typeof reportProfile>;

describe("mobile profile screen", () => {
  beforeEach(() => {
    fetchPublicProfileMock.mockResolvedValue(PROFILE);
    fetchProfileFeedPageMock.mockResolvedValue({ items: [POST], nextCursor: null, hasMore: false });
    fetchProfileListsPageMock.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    fetchProfileStatsMock.mockResolvedValue(STATS);
    followProfileMock.mockResolvedValue({ status: "accepted" });
    reportProfileMock.mockResolvedValue({
      id: "01J00000000000000000000000",
      contentType: "profile",
      contentId: PROFILE.userId,
      reason: "harassment",
      details: null,
      status: "open",
      createdAt: "2026-09-13T12:00:00.000Z",
      updatedAt: "2026-09-13T12:00:00.000Z",
    });
  });

  afterEach(() => {
    for (const queryClient of activeQueryClients) queryClient.clear();
    activeQueryClients.splice(0, activeQueryClients.length);
    jest.clearAllMocks();
  });

  it("renders profile header, tabs, and cursor-backed posts", async () => {
    await renderWithProviders(<ProfileScreen currentUser={CURRENT_USER} username="toni" />);

    await waitFor(() => {
      expect(screen.getByText("Toni")).toBeOnTheScreen();
    });
    expect(screen.getByText("@toni")).toBeOnTheScreen();
    expect(screen.getByText("Noir and melodrama.")).toBeOnTheScreen();
    expect(screen.getByText("Profile post body")).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId("profile-tab-stats"));
    await waitFor(() => {
      expect(fetchProfileStatsMock).toHaveBeenCalledWith(expect.anything(), "toni", expect.anything());
    });
    expect(screen.getByText("8.2")).toBeOnTheScreen();
  });

  it("follows and reports through production mutation endpoints", async () => {
    await renderWithProviders(<ProfileScreen currentUser={CURRENT_USER} username="toni" />);

    await waitFor(() => {
      expect(screen.getByText("Follow")).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByText("Follow"));
    await waitFor(() => {
      expect(followProfileMock).toHaveBeenCalledWith(expect.anything(), PROFILE.userId);
    });

    fireEvent.press(screen.getByRole("button", { name: "More profile actions" }));
    fireEvent.press(await screen.findByText("Report profile"));
    fireEvent.press(await screen.findByText("Submit report"));
    await waitFor(() => {
      expect(reportProfileMock).toHaveBeenCalledWith(expect.anything(), {
        userId: PROFILE.userId,
        reason: "harassment",
        details: null,
      });
    });
  });
});

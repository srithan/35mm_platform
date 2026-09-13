import { MobileUIProvider, SafeAreaProvider } from "@35mm/mobile-ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import {
  fetchBookmarkFolders,
  fetchBookmarksPage,
  removeBookmark,
} from "@/features/bookmarks/api";
import { BookmarksScreen } from "@/features/bookmarks/BookmarksScreen";

jest.mock("@/services/api", () => ({
  useApiClient: () => ({ client: "mock" }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/features/bookmarks/api", () => ({
  assignBookmarkFolder: jest.fn(),
  createBookmarkFolder: jest.fn(),
  deleteBookmarkFolder: jest.fn(),
  fetchBookmarkFolders: jest.fn(),
  fetchBookmarksPage: jest.fn(),
  removeBookmark: jest.fn(),
  renameBookmarkFolder: jest.fn(),
}));

jest.mock("@/features/feed/PostCard", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react") as typeof import("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text, View } = require("react-native") as typeof import("react-native");
  return {
    PostCard: ({
      onBookmarkPress,
      post,
    }: {
      readonly onBookmarkPress: () => void;
      readonly post: { readonly id: string; readonly body: string };
    }) => (
      <View>
        <Text>{post.body}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Mock remove ${post.id}`} onPress={onBookmarkPress}>
          <Text>Mock remove</Text>
        </Pressable>
      </View>
    ),
  };
});

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
      renderItem,
    }: {
      readonly data: readonly unknown[];
      readonly keyExtractor: (item: unknown, index: number) => string;
      readonly ListEmptyComponent?: React.ComponentType | React.ReactElement;
      readonly ListFooterComponent?: React.ComponentType | React.ReactElement;
      readonly renderItem: (info: { item: unknown; index: number }) => React.ReactElement | null;
    }) => (
      <View>
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
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  activeQueryClients.push(queryClient);
  return render(
    <Providers queryClient={queryClient}>
      {children}
    </Providers>,
  );
}

const fetchBookmarkFoldersMock = fetchBookmarkFolders as jest.MockedFunction<typeof fetchBookmarkFolders>;
const fetchBookmarksPageMock = fetchBookmarksPage as jest.MockedFunction<typeof fetchBookmarksPage>;
const removeBookmarkMock = removeBookmark as jest.MockedFunction<typeof removeBookmark>;

const POST = {
  id: "530784aa-d70d-4c51-b846-2fea9ff2c632",
  author: {
    id: "user-1",
    username: "ava",
    displayName: "Ava",
    avatarUrl: null,
  },
  type: "text" as const,
  nsfw: { status: "none" as const, categories: [], source: null },
  body: "Saved post",
  media: [],
  linkPreview: null,
  film: null,
  poll: null,
  createdAt: "2026-09-13T12:00:00.000Z",
  updatedAt: "2026-09-13T12:00:00.000Z",
  likeCount: 1,
  commentCount: 2,
  repostCount: 0,
  bookmarkCount: 3,
  quoteCount: 0,
  isLiked: false,
  isReposted: false,
  isBookmarked: true,
  bookmarkFolderId: null,
  repostContext: null,
  quotedPost: null,
  quotedPostUnavailable: false,
};

describe("mobile bookmarks screen", () => {
  beforeEach(() => {
    fetchBookmarkFoldersMock.mockResolvedValue({
      folders: [{
        id: "11111111-1111-4111-8111-111111111111",
        name: "Favorites",
        itemCount: 1,
        createdAt: "2026-09-13T12:00:00.000Z",
        updatedAt: "2026-09-13T12:01:00.000Z",
      }],
      unsortedCount: 1,
    });
    fetchBookmarksPageMock.mockResolvedValue({
      items: [POST],
      nextCursor: null,
      hasMore: false,
    });
    removeBookmarkMock.mockResolvedValue({ ok: true, folderId: null, isBookmarked: false, bookmarkCount: 2 });
  });

  afterEach(() => {
    for (const queryClient of activeQueryClients) queryClient.clear();
    activeQueryClients.splice(0, activeQueryClients.length);
    jest.clearAllMocks();
  });

  it("renders folders, switches unsorted filter, and removes a bookmark", async () => {
    await renderWithProviders(<BookmarksScreen currentUserId="viewer-1" />);

    await waitFor(() => {
      expect(screen.getByText("Saved post")).toBeOnTheScreen();
    });
    expect(screen.getByText("Favorites")).toBeOnTheScreen();

    fireEvent.press(screen.getByRole("tab", { name: "Unsorted, 1 saved" }));
    await waitFor(() => {
      expect(fetchBookmarksPageMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ folderId: null }),
      );
    });

    fireEvent.press(screen.getByRole("button", { name: `Mock remove ${POST.id}` }));
    await waitFor(() => {
      expect(removeBookmarkMock).toHaveBeenCalledWith(expect.anything(), POST.id);
    });
  });

});

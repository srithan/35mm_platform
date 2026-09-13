import { MobileUIProvider, SafeAreaProvider } from "@35mm/mobile-ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import {
  fetchPublicListsPage,
  fetchWatchlist,
} from "@/features/lists/api";
import { ListsScreen } from "@/features/lists/ListsScreen";

jest.mock("@/services/api", () => ({
  useApiClient: () => ({ client: "mock" }),
}));

jest.mock("@/features/lists/api", () => ({
  fetchPublicListsPage: jest.fn(),
  fetchWatchlist: jest.fn(),
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

const OWNER = {
  id: "user-1",
  username: "maya",
  displayName: "Maya",
  avatarUrl: null,
  filmsLoggedCount: 12,
};

const LIST = {
  id: "list-1",
  userId: "user-1",
  type: "custom" as const,
  title: "City Nights",
  description: "Neon and rain.",
  visibility: "public" as const,
  isRanked: true,
  tags: ["noir"],
  shareSlug: "city-nights",
  likeCount: 9,
  commentCount: 2,
  entryCount: 1,
  isLiked: false,
  isOwner: false,
  createdAt: "2026-09-13T12:00:00.000Z",
  updatedAt: "2026-09-13T12:30:00.000Z",
  owner: OWNER,
  posterUrls: [null],
};

const ENTRY = {
  id: "entry-1",
  film: {
    id: "film-1",
    title: "Heat",
    year: 1995,
    posterUrl: null,
    genres: ["Crime"],
  },
  position: 1,
  note: "Coffee-shop gravity.",
  addedAt: "2026-09-13T12:10:00.000Z",
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

const fetchPublicListsPageMock = fetchPublicListsPage as jest.MockedFunction<typeof fetchPublicListsPage>;
const fetchWatchlistMock = fetchWatchlist as jest.MockedFunction<typeof fetchWatchlist>;

describe("mobile lists screen", () => {
  beforeEach(() => {
    fetchPublicListsPageMock.mockResolvedValue({
      items: [LIST],
      nextCursor: null,
      hasMore: false,
    });
    fetchWatchlistMock.mockResolvedValue({
      ...LIST,
      id: "watchlist-1",
      type: "watchlist",
      title: "Watchlist",
      entryCount: 1,
      entries: [ENTRY],
      entriesPage: {
        items: [ENTRY],
        nextCursor: null,
        hasMore: false,
      },
      clonedFromListId: null,
    });
  });

  afterEach(() => {
    for (const queryClient of activeQueryClients) queryClient.clear();
    activeQueryClients.splice(0, activeQueryClients.length);
    jest.clearAllMocks();
  });

  it("renders public lists and switches sort", async () => {
    await renderWithProviders(<ListsScreen />);

    await waitFor(() => {
      expect(screen.getByText("City Nights")).toBeOnTheScreen();
    });
    expect(screen.getByText("Neon and rain.")).toBeOnTheScreen();
    expect(screen.getByText("1 films")).toBeOnTheScreen();

    fireEvent.press(screen.getByText("Recent"));
    await waitFor(() => {
      expect(fetchPublicListsPageMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ sort: "recent" }),
      );
    });
  });

  it("renders watchlist entries from the authenticated detail endpoint", async () => {
    await renderWithProviders(<ListsScreen />);

    await waitFor(() => {
      expect(screen.getByText("City Nights")).toBeOnTheScreen();
    });
    fireEvent.press(screen.getByText("Watchlist"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Heat, 1995" })).toBeOnTheScreen();
    });
    expect(screen.getByText("Coffee-shop gravity.")).toBeOnTheScreen();
    expect(fetchWatchlistMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ cursor: null }),
    );
  });
});

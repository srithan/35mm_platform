import { MobileUIProvider, SafeAreaProvider } from "@35mm/mobile-ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import {
  fetchNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/api";
import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";

jest.mock("@/services/api", () => ({
  useApiClient: () => ({ client: "mock" }),
}));

jest.mock("@/features/notifications/api", () => ({
  fetchNotificationsPage: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
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

const fetchNotificationsPageMock = fetchNotificationsPage as jest.MockedFunction<typeof fetchNotificationsPage>;
const markNotificationReadMock = markNotificationRead as jest.MockedFunction<typeof markNotificationRead>;
const markAllNotificationsReadMock = markAllNotificationsRead as jest.MockedFunction<typeof markAllNotificationsRead>;

describe("mobile notifications screen", () => {
  beforeEach(() => {
    fetchNotificationsPageMock.mockResolvedValue({
      items: [{
        id: "notif-1",
        type: "like",
        actor: {
          id: "user-1",
          username: "ava",
          displayName: "Ava",
          avatarUrl: null,
        },
        entity: {
          type: "post",
          id: "530784aa-d70d-4c51-b846-2fea9ff2c632",
          title: "Heat",
          thumbnailUrl: null,
          contentPreview: "Perfect ending.",
        },
        metadata: {},
        isRead: false,
        bundleCount: 1,
        createdAt: "2026-09-13T12:00:00.000Z",
      }],
      nextCursor: null,
      hasMore: false,
    });
    markNotificationReadMock.mockResolvedValue({ ok: true });
    markAllNotificationsReadMock.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    for (const queryClient of activeQueryClients) queryClient.clear();
    activeQueryClients.splice(0, activeQueryClients.length);
    jest.clearAllMocks();
  });

  it("renders production notifications and toggles read state", async () => {
    await renderWithProviders(<NotificationsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Ava liked your post")).toBeOnTheScreen();
    });
    expect(screen.getByText("Perfect ending.")).toBeOnTheScreen();

    fireEvent.press(screen.getByRole("button", { name: "Mark notification as read" }));
    await waitFor(() => {
      expect(markNotificationReadMock).toHaveBeenCalledWith(
        expect.anything(),
        "notif-1",
        true,
      );
    });
  });

  it("supports the unread filter and mark-all-read action", async () => {
    await renderWithProviders(<NotificationsScreen />);

    await waitFor(() => {
      expect(screen.getByText("Ava liked your post")).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByText("Unread"));
    await waitFor(() => {
      expect(fetchNotificationsPageMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ unreadOnly: true }),
      );
    });

    fireEvent.press(screen.getByRole("button", { name: "Mark all read" }));
    await waitFor(() => {
      expect(markAllNotificationsReadMock).toHaveBeenCalledTimes(1);
    });
  });
});

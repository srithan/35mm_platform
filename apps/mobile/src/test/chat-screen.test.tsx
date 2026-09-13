import { MobileUIProvider, SafeAreaProvider, ToastProvider } from "@35mm/mobile-ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { CurrentUserBootstrapProfile } from "@/features/auth/bootstrap/api";
import {
  fetchChatInbox,
  fetchChatMessages,
  markChatThreadRead,
  sendChatMessage,
} from "@/features/chat/api";
import { ChatScreen } from "@/features/chat/ChatScreen";

jest.mock("@/services/api", () => ({
  useApiClient: () => ({ client: "mock" }),
}));

jest.mock("@/features/chat/api", () => ({
  createChatThread: jest.fn(),
  deleteChatMessage: jest.fn(),
  deleteChatThread: jest.fn(),
  editChatMessage: jest.fn(),
  fetchChatInbox: jest.fn(),
  fetchChatMessages: jest.fn(),
  fetchChatPresence: jest.fn().mockResolvedValue({ presence: {}, users: {} }),
  fetchChatReadReceipts: jest.fn().mockResolvedValue({ items: [] }),
  fetchChatTyping: jest.fn().mockResolvedValue({ typingUserIds: [], items: [] }),
  markChatThreadRead: jest.fn(),
  pingChatPresence: jest.fn().mockResolvedValue(undefined),
  presignChatMedia: jest.fn(),
  searchChatContacts: jest.fn(),
  sendChatMessage: jest.fn(),
  setChatReaction: jest.fn(),
  setChatThreadArchived: jest.fn(),
  setChatThreadMuted: jest.fn(),
  setChatTyping: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
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

const PROFILE: CurrentUserBootstrapProfile = {
  userId: "user-1",
  username: "toni",
  displayName: "Toni",
  avatarUrl: null,
  avatarUrlLg: null,
  role: null,
  roleContext: null,
  filmsLoggedCount: 0,
  followerCount: 0,
  followingCount: 0,
};

const THREAD = {
  id: "01JCHATTHREAD000000000000001",
  type: "dm" as const,
  members: [{
    userId: "user-2",
    username: "ava",
    displayName: "Ava",
    avatarUrl: null,
    avatarVariants: null,
    role: "member" as const,
    joinedAt: "2026-09-13T12:00:00.000Z",
  }],
  lastMessageAt: "2026-09-13T12:01:00.000Z",
  lastMessagePreview: "Heat tonight?",
  lastSenderId: "user-2",
  unreadCount: 1,
  isArchived: false,
  isMuted: false,
  deletedAt: null,
};

const MESSAGE = {
  id: "7d9f7b90-5278-11ef-9a3d-0242ac120002",
  threadId: THREAD.id,
  bucket: 202609,
  senderId: "user-2",
  senderUsername: "ava",
  senderDisplayName: "Ava",
  senderAvatarUrl: null,
  senderAvatarVariants: null,
  contentType: "text" as const,
  body: "Heat tonight?",
  mediaUrl: null,
  mediaMetadata: null,
  linkPreview: null,
  replyToId: null,
  replySnapshot: null,
  reactions: [],
  isDeleted: false,
  editedAt: null,
  createdAt: "2026-09-13T12:02:00.000Z",
};

const activeQueryClients: QueryClient[] = [];

function Providers({ children, queryClient }: { readonly children: ReactNode; readonly queryClient: QueryClient }) {
  return (
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <MobileUIProvider preference="light" reduceMotion systemColorScheme="light">
        <ToastProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </ToastProvider>
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
  return render(<Providers queryClient={queryClient}>{children}</Providers>);
}

const fetchChatInboxMock = fetchChatInbox as jest.MockedFunction<typeof fetchChatInbox>;
const fetchChatMessagesMock = fetchChatMessages as jest.MockedFunction<typeof fetchChatMessages>;
const sendChatMessageMock = sendChatMessage as jest.MockedFunction<typeof sendChatMessage>;
const markChatThreadReadMock = markChatThreadRead as jest.MockedFunction<typeof markChatThreadRead>;

describe("mobile chat screen", () => {
  beforeEach(() => {
    fetchChatInboxMock.mockResolvedValue({ items: [THREAD], nextCursor: null, hasMore: false });
    fetchChatMessagesMock.mockResolvedValue({ items: [MESSAGE], nextCursor: null, hasMore: false });
    markChatThreadReadMock.mockResolvedValue(undefined);
    sendChatMessageMock.mockImplementation(async (_client, input) => ({
      ...MESSAGE,
      id: "8d9f7b90-5278-11ef-9a3d-0242ac120002",
      senderId: PROFILE.userId,
      senderUsername: PROFILE.username,
      senderDisplayName: PROFILE.displayName,
      body: input.body,
      createdAt: "2026-09-13T12:03:00.000Z",
    }));
  });

  afterEach(() => {
    for (const queryClient of activeQueryClients) queryClient.clear();
    activeQueryClients.splice(0, activeQueryClients.length);
    jest.clearAllMocks();
  });

  it("renders inbox, message history, and marks newest message read", async () => {
    await renderWithProviders(<ChatScreen profile={PROFILE} />);

    await waitFor(() => expect(screen.getByTestId(`chat-thread-${THREAD.id}`)).toBeOnTheScreen());
    expect(screen.getAllByText("Heat tonight?").length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(markChatThreadReadMock).toHaveBeenCalledWith(expect.anything(), THREAD.id, MESSAGE.id);
    });
  });

  it("sends a text message through the production chat endpoint", async () => {
    await renderWithProviders(<ChatScreen profile={PROFILE} />);

    await waitFor(() => expect(screen.getByTestId(`chat-thread-${THREAD.id}`)).toBeOnTheScreen());
    fireEvent(screen.getByPlaceholderText("Message"), "onChangeText", "Absolutely.");
    await waitFor(() => expect(screen.getByDisplayValue("Absolutely.")).toBeOnTheScreen());
    fireEvent.press(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(sendChatMessageMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          threadId: THREAD.id,
          contentType: "text",
          body: "Absolutely.",
        }),
      );
    });
  });
});

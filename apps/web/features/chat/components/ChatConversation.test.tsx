import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { StrictMode } from "react";
import type { ChatMessage } from "../types";
import { ChatConversation } from "./ChatConversation";

const mocks = vi.hoisted(() => ({
  deleteConversation: vi.fn(),
  markConversationRead: vi.fn(),
  messages: [] as ChatMessage[],
  mutation: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/chat/THREAD-1",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/layout/ChatInputFocusContext", () => ({
  useChatInputFocus: () => ({ setChatInputFocused: vi.fn() }),
}));

vi.mock("../hooks/useChatQueries", () => ({
  useChatMessages: () => ({
    data: mocks.messages,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useChatReadReceiptsSnapshot: () => ({ data: null }),
  useChatTypingSnapshot: () => ({ data: [] }),
  useConversationRow: () => ({ row: undefined }),
  useSendMessage: () => ({ mutate: mocks.mutation, isPending: false }),
  useMarkConversationRead: () => ({ mutate: mocks.markConversationRead }),
  useSetTyping: () => ({ mutate: mocks.mutation }),
  useSetConversationArchived: () => ({ mutate: mocks.mutation }),
  useToggleReaction: () => ({ mutate: mocks.mutation }),
  useEditMessage: () => ({ mutate: mocks.mutation, isPending: false }),
  useDeleteMessage: () => ({ mutate: mocks.mutation }),
  useDeleteConversation: () => ({
    mutate: mocks.deleteConversation,
    status: "idle",
  }),
}));

vi.mock("../realtime/state", () => ({
  useChatReadReceipt: () => null,
  useChatTypingUsers: () => [],
  useIsChatRealtimeConfigured: () => true,
}));

vi.mock("../context/NewChatContext", () => ({
  useNewChat: () => ({ openNewChat: vi.fn() }),
}));

vi.mock("./ChatPresenceIndicator", () => ({
  useChatPresenceSummary: () => ({ availability: "offline", label: "Offline" }),
  ChatPresenceDot: () => null,
}));

vi.mock("./ChatMessageList", () => ({
  ChatMessageList: () => null,
  ChatMessagesSkeleton: () => null,
}));

vi.mock("./ChatComposer", () => ({ ChatComposer: () => null }));
vi.mock("./ChatJumpToLatestFab", () => ({ ChatJumpToLatestFab: () => null }));
vi.mock("./ChatHeaderMoreMenu", () => ({ ChatHeaderMoreMenu: () => null }));
vi.mock("@/components/ConfirmDialog/ConfirmDialog", () => ({
  ConfirmDialog: () => null,
}));

function renderConversation() {
  return render(
    <StrictMode>
      <ChatConversation
        chatId="THREAD-1"
        chatName="Test conversation"
        hideHeader
        discardDraftIfNoMessages
      />
    </StrictMode>
  );
}

describe("ChatConversation empty draft cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.deleteConversation.mockClear();
    mocks.markConversationRead.mockClear();
    mocks.mutation.mockClear();
    mocks.messages = [];
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("does not delete an empty draft during a mounted rerender", () => {
    const view = renderConversation();

    view.rerender(
      <StrictMode>
        <ChatConversation
          chatId="THREAD-1"
          chatName="Test conversation"
          hideHeader
          discardDraftIfNoMessages
        />
      </StrictMode>
    );
    act(function () {
      vi.runAllTimers();
    });

    expect(mocks.deleteConversation).not.toHaveBeenCalled();

    view.unmount();
    act(function () {
      vi.runAllTimers();
    });
    expect(mocks.deleteConversation).toHaveBeenCalledOnce();
    expect(mocks.deleteConversation).toHaveBeenCalledWith("THREAD-1");
  });

  it("keeps a draft when messages load before unmount", () => {
    const view = renderConversation();
    mocks.messages = [
      {
        id: "MESSAGE-1",
        chatId: "THREAD-1",
        text: "Existing message",
        createdAt: "2026-07-21T12:00:00.000Z",
        isOwn: false,
      },
    ];

    view.rerender(
      <StrictMode>
        <ChatConversation
          chatId="THREAD-1"
          chatName="Test conversation"
          hideHeader
          discardDraftIfNoMessages
        />
      </StrictMode>
    );
    act(function () {
      vi.runAllTimers();
    });
    view.unmount();
    act(function () {
      vi.runAllTimers();
    });

    expect(mocks.deleteConversation).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FloatingChatInbox } from "./FloatingChatInbox";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/lib/hooks/useIsDesktopMd", () => ({
  useIsDesktopMd: () => true,
}));

vi.mock("@/lib/hooks/usePopoverLayer", () => ({
  usePopoverLayer: () => undefined,
}));

vi.mock("@/components/Avatar", () => ({
  Avatar: () => <span aria-hidden />,
}));

vi.mock("@/components/BodyPortal/BodyPortal", () => ({
  BodyPortal: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ConfirmDialog/ConfirmDialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("../realtime/state", () => ({
  useChatRealtime: () => ({ currentUserId: "CURRENT-USER" }),
}));

vi.mock("../hooks/useChatContactCandidates", () => ({
  useChatContactCandidates: () => ({
    candidates: [],
    isError: false,
    isLoading: false,
    refetch: mocks.refetch,
  }),
}));

vi.mock("../hooks/useChatQueries", () => {
  const conversations = {
    data: [],
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isLoading: false,
    refetch: mocks.refetch,
  };
  const mutation = {
    isError: false,
    isPending: false,
    mutate: mocks.mutate,
  };

  return {
    useChatPresence: () => ({ data: undefined }),
    useConversations: () => conversations,
    useConversationsByUiFilter: () => conversations,
    useConversationRow: () => ({ isLoading: false, row: undefined }),
    useCreateConversation: () => mutation,
    useDeleteConversation: () => mutation,
    useSetConversationArchived: () => mutation,
  };
});

vi.mock("./ChatPresenceIndicator", () => ({
  ChatPresenceDot: () => null,
  getChatPresenceTargetIds: () => [],
  summarizeChatPresence: () => ({
    availability: "offline",
    label: "Offline",
  }),
}));

vi.mock("./ChatConversation", () => ({
  ChatConversation: () => null,
}));

describe("FloatingChatInbox motion", () => {
  it("colors the message icon from the active theme foreground", () => {
    const { container } = render(<FloatingChatInbox />);
    const icon = container.querySelector(
      '[style*="float-message.svg"]',
    );

    expect(icon).toHaveClass("bg-current", "text-fg");
    expect(icon).toHaveStyle({
      mask: 'url("/float-message.svg") center / contain no-repeat',
    });
  });

  it("keeps the panel mounted until its close animation finishes", async () => {
    render(<FloatingChatInbox />);

    fireEvent.click(screen.getByRole("button", { name: "Open messages" }));
    const panel = screen.getByLabelText("Floating messages");
    expect(panel).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close messages" }));

    expect(panel).toBeInTheDocument();
    await waitFor(
      function () {
        expect(
          screen.queryByLabelText("Floating messages"),
        ).not.toBeInTheDocument();
      },
      { timeout: 1_000 },
    );
    expect(
      screen.getByRole("button", { name: "Open messages" }),
    ).toBeInTheDocument();
  });

  it("recovers when close is immediately reversed", async () => {
    render(<FloatingChatInbox />);
    fireEvent.click(screen.getByRole("button", { name: "Open messages" }));
    fireEvent.click(screen.getByRole("button", { name: "Close messages" }));
    fireEvent.click(screen.getByRole("button", { name: "Open messages" }));

    await waitFor(function () {
      expect(
        screen.queryByRole("button", { name: "Open messages" }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByLabelText("Floating messages")).toBeInTheDocument();
  });
});

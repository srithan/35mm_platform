import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseStoredRichText } from "@/lib/utils/richContent";
import { CommentSection } from "./CommentSection";

const mocks = vi.hoisted(() => ({
  createCommentMutateAsync: vi.fn(async (input: { body: string }) => ({
    id: "comment-1",
    ...input,
  })),
  searchMentionSuggestionsMock: vi.fn(async () => [
    {
      id: "22222222-2222-4222-8222-222222222222",
      username: "mani",
      displayName: "Mani Ratnam",
      avatarUrl: null,
      isFollowing: false,
    },
  ]),
}));

vi.mock("@/components/Avatar", () => ({
  Avatar: () => <div data-testid="avatar" />,
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn(async () => "test-token") }),
}));

vi.mock("@/features/profile/hooks/useCurrentUserProfile", () => ({
  initialForName: () => "T",
  useCurrentUserProfile: () => ({
    data: { displayName: "Test User", username: "testuser", avatarUrl: null },
  }),
}));

vi.mock("../hooks/useCommentMutations", () => ({
  useCreateComment: () => ({
    mutateAsync: mocks.createCommentMutateAsync,
    isPending: false,
    isError: false,
  }),
}));

vi.mock("../../api/mentionsApi", () => ({
  searchMentionSuggestions: mocks.searchMentionSuggestionsMock,
}));

vi.mock("../api/mentionsApi", () => ({
  searchMentionSuggestions: mocks.searchMentionSuggestionsMock,
}));

vi.mock("@/features/feed/api/mentionsApi", () => ({
  searchMentionSuggestions: mocks.searchMentionSuggestionsMock,
}));

function findMentionNode(node: any): any | null {
  if (!node || typeof node !== "object") return null;
  if (node.type === "mention") return node;
  for (const child of node.content ?? []) {
    const found = findMentionNode(child);
    if (found) return found;
  }
  return null;
}

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    disconnect() {}
    unobserve() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

beforeEach(() => {
  mocks.createCommentMutateAsync.mockClear();
  mocks.searchMentionSuggestionsMock.mockClear();
});

describe("CommentSection", () => {
  it("opens mention autocomplete and inserts stable mention node in comment editor", async () => {
    const user = userEvent.setup();
    render(<CommentSection comments={[]} postId="post-1" postUsername="ava" />);

    await user.click(screen.getByRole("button", { name: "Post your reply" }));
    const editor = screen.getByRole("combobox", { name: "Post your reply" });
    await user.type(editor, "@ma");

    var listbox = await screen.findByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(listbox).toHaveClass("z-[calc(var(--z-composer)+10)]");
    await user.click(await screen.findByRole("option", { name: /Mani Ratnam/i }));
    await user.click(screen.getByRole("button", { name: "Reply" }));

    await waitFor(() => {
      expect(mocks.createCommentMutateAsync).toHaveBeenCalledTimes(1);
    });

    var input = (mocks.createCommentMutateAsync.mock.calls[0] as unknown[])[0] as { body: string };
    var mention = findMentionNode(parseStoredRichText(input.body));
    expect(mention?.attrs).toMatchObject({
      id: "22222222-2222-4222-8222-222222222222",
      username: "mani",
      label: "mani",
    });
  });
});

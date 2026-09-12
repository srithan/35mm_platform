import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PostCardMoreMenu } from "./PostCardMoreMenu";

vi.mock("@/features/auth/components/AuthPromptProvider", function () {
  return {
    useAuthPrompt: function () {
      return {
        isLoaded: true,
        isSignedIn: false,
        promptLogin: vi.fn(),
        requireAuth: vi.fn(),
      };
    },
  };
});

vi.mock("@/features/bookmarks/hooks/useBookmarkToFolderFlow", function () {
  return {
    useBookmarkToFolderFlow: function () {
      return { menuItem: null, picker: null };
    },
  };
});

vi.mock("@/stores/useComposerModalStore", function () {
  return {
    useComposerModalStore: function () {
      return vi.fn();
    },
  };
});

describe("PostCardMoreMenu guest items", function () {
  it("only offers Share for signed-out viewers", function () {
    render(
      <PostCardMoreMenu
        isPostAuthor={false}
        postId="post-1"
        userId="user-1"
        variant="text"
        text="hello"
        normalizedMediaUrls={[]}
        author={{ handle: "@pat" }}
        onShare={vi.fn()}
        onDeleteRequest={vi.fn()}
        onBlockRequest={vi.fn()}
        onReportRequest={vi.fn()}
        onMuteRequest={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    expect(screen.getByRole("menuitem", { name: /Share post/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Report post/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Mute/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Block/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Hide post/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Bookmark/ })).not.toBeInTheDocument();
  });
});

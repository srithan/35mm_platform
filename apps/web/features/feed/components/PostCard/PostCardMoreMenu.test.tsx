import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostCardMoreMenu } from "./PostCardMoreMenu";

const mocks = vi.hoisted(function () {
  return { isSignedIn: false, openForEdit: vi.fn() };
});

beforeEach(function () {
  mocks.isSignedIn = false;
  mocks.openForEdit.mockReset();
});

vi.mock("@/features/auth/components/AuthPromptProvider", function () {
  return {
    useAuthPrompt: function () {
      return {
        isLoaded: true,
        isSignedIn: mocks.isSignedIn,
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
      return mocks.openForEdit;
    },
  };
});

describe("PostCardMoreMenu film editing", function () {
  it("passes saved viewing metadata, visibility, and creation date into the composer", function () {
    mocks.isSignedIn = true;
    render(
      <PostCardMoreMenu
        isPostAuthor
        postId="post-1"
        userId="user-1"
        variant="film-log"
        sourcePostType="review"
        createdAt="2026-09-13T02:00:00.000Z"
        visibility="private"
        watchedOn="2026-07-01"
        isRewatch
        text="A wonderful rewatch."
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
    fireEvent.click(screen.getByRole("menuitem", { name: /Edit post/ }));

    expect(mocks.openForEdit).toHaveBeenCalledWith(expect.objectContaining({
      postId: "post-1",
      type: "review",
      body: "A wonderful rewatch.",
      createdAt: "2026-09-13T02:00:00.000Z",
      visibility: "private",
      watchedOn: "2026-07-01",
      isRewatch: true,
    }));
  });
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

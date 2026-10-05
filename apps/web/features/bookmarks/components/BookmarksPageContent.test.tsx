import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Post } from "@/features/feed/types/feed";
import { BookmarksPageContent } from "./BookmarksPageContent";

const flags = vi.hoisted(() => ({ focused: true, compact: true }));
const mocks = vi.hoisted(() => ({ fetchNextPage: vi.fn() }));

vi.mock("@/lib/config/uiFlags", () => ({
  get BROWSE_CHROME_VARIANT() {
    return flags.focused ? "focused" : "rail";
  },
  get BROWSE_DENSITY_VARIANT() {
    return flags.compact ? "compact" : "classic";
  },
}));

vi.mock("../hooks/useBookmarks", () => ({
  useBookmarks: () => ({
    status: "success",
    isError: false,
    data: {
      pages: [
        {
          items: [makePost("post-1", "Parasite", "Maya"), makePost("post-2", "Moonlight", "Jordan")],
          nextCursor: null,
          hasMore: false,
        },
      ],
    },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: mocks.fetchNextPage,
  }),
}));

vi.mock("../hooks/useBookmarkFolders", () => ({
  useBookmarkFolders: () => ({
    status: "success",
    isError: false,
    data: {
      folders: [{ id: "folder-1", name: "Favorites", itemCount: 1 }],
      unsortedCount: 1,
    },
  }),
}));

vi.mock("../hooks/useBookmarkFolderMutations", () => ({
  useCreateBookmarkFolder: () => ({ isPending: false, mutate: vi.fn() }),
  useRenameBookmarkFolder: () => ({ isPending: false, mutate: vi.fn() }),
  useDeleteBookmarkFolder: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock("@/features/feed/hooks/useConnectionPreferences", () => ({
  useConnectionPreferences: () => ({ slow: false, saveData: false }),
}));

vi.mock("@/components/FlashToast", () => ({
  useFlashToast: () => ({ show: vi.fn() }),
}));

vi.mock("@/features/feed/components/PostCard", () => ({
  PostCard: ({ postId, filmCard }: { postId: string; filmCard?: { title: string } }) => (
    <article data-testid={`post-${postId}`}>{filmCard?.title}</article>
  ),
}));

function makePost(id: string, filmTitle: string, displayName: string): Post {
  return {
    id,
    author: {
      id: `author-${id}`,
      username: displayName.toLocaleLowerCase(),
      displayName,
      avatarUrl: null,
      isFollowing: false,
    },
    type: "text",
    body: `Thoughts about ${filmTitle}`,
    media: [],
    film: {
      id: `film-${id}`,
      title: filmTitle,
      year: 2020,
      posterUrl: null,
      genres: [],
      rating: null,
    },
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    bookmarkCount: 1,
    quoteCount: 0,
    isLiked: false,
    isReposted: false,
    isBookmarked: true,
    repostContext: null,
    createdAt: "2026-10-04T12:00:00.000Z",
    updatedAt: "2026-10-04T12:00:00.000Z",
  };
}

describe("BookmarksPageContent", () => {
  beforeEach(() => {
    flags.focused = true;
    flags.compact = true;
    mocks.fetchNextPage.mockReset();
  });

  it("uses a folder-dropdown headline, right-aligned creation action, and search below", async () => {
    const user = userEvent.setup();
    render(<BookmarksPageContent />);

    const layout = screen.getByTestId("bookmarks-page-layout");
    const header = screen.getByTestId("bookmarks-page-header");

    expect(layout).toHaveClass("mx-auto", "max-w-[640px]", "grid-cols-1");
    expect(layout).not.toHaveClass("xl:grid-cols-[260px_minmax(0,640px)]");
    const heading = within(header).getByRole("heading", { name: "All Bookmarks" });
    const folderTrigger = within(header).getByRole("button", { name: "All Bookmarks" });
    expect(heading).toHaveClass("font-sans");
    expect(heading).not.toHaveClass("font-display-discover");
    expect(folderTrigger).not.toHaveClass("focus-visible:ring-2");
    expect(within(header).getByRole("searchbox", { name: "Search loaded bookmarks" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "New folder" })).toBeInTheDocument();

    await user.click(folderTrigger);

    expect(screen.getByRole("menu", { name: "All Bookmarks" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /Favorites/ })).toBeInTheDocument();
  });

  it("moves custom-folder rename and delete into the More menu", async () => {
    const user = userEvent.setup();
    render(<BookmarksPageContent />);

    await user.click(screen.getByRole("button", { name: "All Bookmarks" }));
    await user.click(screen.getByRole("menuitemradio", { name: /Favorites/ }));

    const header = screen.getByTestId("bookmarks-page-header");
    expect(within(header).getByRole("heading", { name: "Favorites" })).toBeInTheDocument();
    expect(within(header).queryByRole("button", { name: "Rename" })).not.toBeInTheDocument();
    expect(within(header).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    await user.click(within(header).getByRole("button", { name: "Folder actions" }));

    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    expect(screen.getByRole("dialog", { name: "Rename folder" })).toBeInTheDocument();
  });

  it("opens folder creation in a modal", async () => {
    const user = userEvent.setup();
    render(<BookmarksPageContent />);

    await user.click(screen.getByRole("button", { name: "New folder" }));

    expect(screen.getByRole("dialog", { name: "New folder" })).toBeInTheDocument();
    expect(screen.getByLabelText("Folder name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create folder" })).toBeDisabled();
  });

  it("filters loaded bookmarks without starting unbounded pagination", async () => {
    const user = userEvent.setup();
    render(<BookmarksPageContent />);

    await user.type(screen.getByRole("searchbox", { name: "Search loaded bookmarks" }), "parasite");

    expect(screen.getByTestId("post-post-1")).toBeInTheDocument();
    expect(screen.queryByTestId("post-post-2")).not.toBeInTheDocument();
    expect(mocks.fetchNextPage).not.toHaveBeenCalled();
  });

  it("finishes the bookmarks feed with a cinematic closing title", () => {
    render(<BookmarksPageContent />);

    const endTitle = screen.getByRole("status", { name: "End of feed" });
    expect(endTitle).toHaveTextContent("That’s a wrap. You’ve reached the end of your saves.");
  });

  it("keeps the existing two-column desktop layout outside focused navigation", () => {
    flags.focused = false;
    render(<BookmarksPageContent />);

    expect(screen.getByTestId("bookmarks-page-layout")).toHaveClass(
      "max-w-[960px]",
      "xl:grid-cols-[260px_minmax(0,640px)]"
    );
    expect(screen.queryByTestId("bookmarks-page-header")).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});

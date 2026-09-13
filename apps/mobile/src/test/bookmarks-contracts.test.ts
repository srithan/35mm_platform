import { parseBookmarkFoldersResponse, parseBookmarkPage } from "@/features/bookmarks/contracts";

const POST = {
  id: "530784aa-d70d-4c51-b846-2fea9ff2c632",
  author: {
    id: "user-1",
    username: "ava",
    displayName: "Ava",
    avatarUrl: null,
  },
  type: "text",
  nsfw: { status: "none", categories: [], source: null },
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

describe("mobile bookmark contracts", () => {
  it("parses folders and cursor pages", () => {
    expect(parseBookmarkFoldersResponse({
      folders: [{
        id: "folder-1",
        name: "Favorites",
        itemCount: 4,
        createdAt: "2026-09-13T12:00:00.000Z",
        updatedAt: "2026-09-13T12:01:00.000Z",
      }],
      unsortedCount: 2,
    })).toEqual({
      folders: [{
        id: "folder-1",
        name: "Favorites",
        itemCount: 4,
        createdAt: "2026-09-13T12:00:00.000Z",
        updatedAt: "2026-09-13T12:01:00.000Z",
      }],
      unsortedCount: 2,
    });

    expect(parseBookmarkPage({
      items: [POST],
      nextCursor: "cursor-1",
      hasMore: true,
    }).items[0]?.isBookmarked).toBe(true);
  });

  it("rejects hostile folder counters", () => {
    expect(() => parseBookmarkFoldersResponse({
      folders: [{
        id: "folder-1",
        name: "Favorites",
        itemCount: -1,
        createdAt: "2026-09-13T12:00:00.000Z",
        updatedAt: "2026-09-13T12:01:00.000Z",
      }],
      unsortedCount: 0,
    })).toThrow("BookmarkFolder.itemCount");
  });
});

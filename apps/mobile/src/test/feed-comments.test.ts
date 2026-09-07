import type { FeedComment } from "@35mm/types";

import { flattenCommentTree } from "@/features/feed/CommentThread";
import { parseCommentPage } from "@/features/feed/contracts";

function comment(id: string, parentId: string | null): FeedComment {
  return {
    id,
    postId: "post-1",
    parentId,
    author: { id: `author-${id}`, username: id, displayName: id.toUpperCase() },
    body: `Comment ${id}`,
    gifUrl: null,
    isDeleted: false,
    moderationStatus: "visible",
    nsfw: { status: "none", categories: [], source: null },
    likeCount: 0,
    isLiked: false,
    editedAt: null,
    createdAt: "2026-09-06T12:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z",
  };
}

describe("mobile comments", () => {
  it("validates cursor pages before rendering them", () => {
    expect(parseCommentPage({
      items: [comment("root", null)],
      nextCursor: "cursor-2",
      hasMore: true,
    })).toMatchObject({ hasMore: true, nextCursor: "cursor-2" });

    expect(() => parseCommentPage({
      items: [{ ...comment("bad", null), likeCount: -1 }],
      nextCursor: null,
      hasMore: false,
    })).toThrow("likeCount must be a non-negative integer");
  });

  it("deduplicates paged results and renders replies at the bounded three levels", () => {
    const root = comment("root", null);
    const child = comment("child", "root");
    const grandchild = comment("grandchild", "child");
    const fourthLevel = comment("fourth", "grandchild");
    const flattened = flattenCommentTree([root, child, grandchild, fourthLevel, child]);

    expect(flattened.map((item) => [item.comment.id, item.depth])).toEqual([
      ["root", 0],
      ["child", 1],
      ["grandchild", 2],
      ["fourth", 2],
    ]);
  });
});

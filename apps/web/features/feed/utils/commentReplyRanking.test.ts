import { describe, expect, it } from "vitest";
import type { Comment } from "../types/feed";
import { rankCommentReplies } from "./commentReplyRanking";

function makeReply(input: {
  id: string;
  likeCount: number;
  createdAt: string;
}): Comment {
  return {
    id: input.id,
    postId: "post-1",
    parentId: "comment-1",
    depth: 1,
    body: input.id,
    likeCount: input.likeCount,
    isLiked: false,
    createdAt: input.createdAt,
    replies: [],
    author: {
      id: `author-${input.id}`,
      username: input.id,
      displayName: input.id,
      avatarUrl: null,
      isFollowing: false,
    },
  };
}

describe("rankCommentReplies", function () {
  it("ranks replies by likes, then by recency", function () {
    const replies = [
      makeReply({ id: "new-no-likes", likeCount: 0, createdAt: "2026-07-21T12:00:00Z" }),
      makeReply({ id: "older-liked", likeCount: 4, createdAt: "2026-07-19T12:00:00Z" }),
      makeReply({ id: "newer-liked", likeCount: 4, createdAt: "2026-07-20T12:00:00Z" }),
      makeReply({ id: "old-no-likes", likeCount: 0, createdAt: "2026-07-18T12:00:00Z" }),
    ];

    expect(rankCommentReplies(replies).map((reply) => reply.id)).toEqual([
      "newer-liked",
      "older-liked",
      "new-no-likes",
      "old-no-likes",
    ]);
    expect(replies.map((reply) => reply.id)).toEqual([
      "new-no-likes",
      "older-liked",
      "newer-liked",
      "old-no-likes",
    ]);
  });
});

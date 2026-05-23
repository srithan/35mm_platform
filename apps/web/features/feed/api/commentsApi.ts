import { getCommentsForPost as getMockComments } from "../data/mockComments";
import type { Comment, CommentsResult } from "../types/feed";
import { adaptCommentToFeedType } from "./adapters";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchComments(postId: string): Promise<CommentsResult> {
  await delay(200);
  const raw = getMockComments(postId) ?? [];

  return {
    postId,
    comments: raw.map((comment) => adaptCommentToFeedType(comment, 0)),
  };
}

export async function createComment(
  postId: string,
  body: string,
  parentId: string | null
): Promise<Comment> {
  await delay(250);
  const now = new Date().toISOString();

  return {
    id: `temp-${Date.now()}`,
    postId,
    parentId,
    depth: parentId ? 1 : 0,
    body,
    likeCount: 0,
    isLiked: false,
    createdAt: now,
    replies: [],
    author: {
      id: "current-user",
      username: "you",
      displayName: "You",
      avatarUrl: null,
      isFollowing: false,
    },
  };
}

export async function likeComment(_commentId: string): Promise<void> {
  await delay(100);
}

export async function unlikeComment(_commentId: string): Promise<void> {
  await delay(100);
}

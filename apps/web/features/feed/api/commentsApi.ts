import type { Comment } from "../types/feed";
import { buildCommentTree } from "./adapters";
import { apiRequest } from "./http";

type CommentsEnvelope = {
  items: Array<{
    id: string;
    postId: string;
    parentId: string | null;
    body: string | null;
    isDeleted?: boolean;
    likeCount: number;
    editedAt?: string | null;
    createdAt: string;
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      role?: string | null;
      roleContext?: string | null;
      filmsLoggedCount?: number | null;
    };
  }>;
  nextCursor: string | null;
  hasMore: boolean;
};

export async function fetchComments(params: {
  postId: string;
  cursor?: string;
  limit?: number;
  token?: string | null;
}): Promise<{ comments: Comment[]; nextCursor: string | null; hasMore: boolean }> {
  var query = new URLSearchParams({
    limit: String(params.limit ?? 20),
  });
  if (params.cursor) {
    query.set("cursor", params.cursor);
  }

  var response = await apiRequest<CommentsEnvelope>(
    `/v1/feed/posts/${encodeURIComponent(params.postId)}/comments?${query.toString()}`,
    {
      token: params.token,
    }
  );

  return {
    comments: buildCommentTree(response.items),
    nextCursor: response.nextCursor,
    hasMore: response.hasMore,
  };
}

export async function createComment(params: {
  postId: string;
  body: string;
  parentId: string | null;
  token: string | null;
}): Promise<Comment> {
  var response = await apiRequest<{
    id: string;
    postId: string;
    parentId: string | null;
    body: string | null;
    isDeleted?: boolean;
    likeCount: number;
    editedAt?: string | null;
    createdAt: string;
    author: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      role?: string | null;
      roleContext?: string | null;
      filmsLoggedCount?: number | null;
    };
  }>(`/v1/feed/posts/${encodeURIComponent(params.postId)}/comments`, {
    method: "POST",
    token: params.token,
    body: {
      body: params.body,
      parentId: params.parentId,
    },
  });

  return buildCommentTree([response])[0];
}

export async function deleteComment(params: {
  postId: string;
  commentId: string;
  token: string | null;
}): Promise<void> {
  await apiRequest<{ ok: true }>(
    `/v1/feed/posts/${encodeURIComponent(params.postId)}/comments/${encodeURIComponent(params.commentId)}`,
    {
      method: "DELETE",
      token: params.token,
    }
  );
}

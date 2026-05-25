import { useAuth } from "@clerk/nextjs";
import type { InfiniteData } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createComment, deleteComment, updateComment } from "../api/commentsApi";
import type { Comment } from "../types/feed";
import { feedKeys } from "./queryKeys";

type CommentsPage = {
  comments: Comment[];
  nextCursor: string | null;
  hasMore: boolean;
};

function appendRootComment(data: InfiniteData<CommentsPage> | undefined, comment: Comment) {
  if (!data || data.pages.length === 0) return data;

  var first = data.pages[0];
  return {
    ...data,
    pages: [
      {
        ...first,
        comments: [comment, ...first.comments],
      },
      ...data.pages.slice(1),
    ],
  };
}

function markCommentDeletedInTree(list: Comment[], commentId: string): Comment[] {
  return list.map(function (comment) {
    if (comment.id === commentId) {
      return {
        ...comment,
        isDeleted: true,
        body: null,
      };
    }

    return {
      ...comment,
      replies: markCommentDeletedInTree(comment.replies, commentId),
    };
  });
}

function updateCommentInTree(list: Comment[], next: Comment): Comment[] {
  return list.map(function (comment) {
    if (comment.id === next.id) {
      return {
        ...comment,
        body: next.body,
        editedAt: next.editedAt,
      };
    }

    return {
      ...comment,
      replies: updateCommentInTree(comment.replies, next),
    };
  });
}

function applyCommentUpdate(
  data: InfiniteData<CommentsPage> | undefined,
  next: Comment
): InfiniteData<CommentsPage> | undefined {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map(function (page) {
      return {
        ...page,
        comments: updateCommentInTree(page.comments, next),
      };
    }),
  };
}

function markCommentDeleted(
  data: InfiniteData<CommentsPage> | undefined,
  commentId: string
): InfiniteData<CommentsPage> | undefined {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map(function (page) {
      return {
        ...page,
        comments: markCommentDeletedInTree(page.comments, commentId),
      };
    }),
  };
}

export function useCreateComment(postId: string) {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: { body: string; parentId: string | null }) {
      return createComment({
        postId,
        body: input.body,
        parentId: input.parentId,
        token: await getToken(),
      });
    },
    onSuccess: function (comment) {
      queryClient.setQueryData<InfiniteData<CommentsPage>>(
        feedKeys.comments(postId),
        function (oldData) {
          if (comment.parentId) return oldData;
          return appendRootComment(oldData, comment);
        }
      );
      queryClient.invalidateQueries({ queryKey: feedKeys.comments(postId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.post(postId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.home() });
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useDeleteComment(postId: string) {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (commentId: string) {
      await deleteComment({
        postId,
        commentId,
        token: await getToken(),
      });
      return commentId;
    },
    onMutate: async function (commentId) {
      await queryClient.cancelQueries({ queryKey: feedKeys.comments(postId) });

      var previous = queryClient.getQueryData<InfiniteData<CommentsPage>>(
        feedKeys.comments(postId)
      );

      queryClient.setQueryData<InfiniteData<CommentsPage>>(
        feedKeys.comments(postId),
        function (oldData) {
          return markCommentDeleted(oldData, commentId);
        }
      );

      return { previous };
    },
    onError: function (_err, _commentId, context) {
      if (context?.previous) {
        queryClient.setQueryData(feedKeys.comments(postId), context.previous);
      }
    },
    onSettled: function () {
      queryClient.invalidateQueries({ queryKey: feedKeys.comments(postId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.post(postId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.home() });
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useUpdateComment(postId: string) {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: { commentId: string; body: string }) {
      return updateComment({
        postId,
        commentId: input.commentId,
        body: input.body,
        token: await getToken(),
      });
    },
    onSuccess: function (comment) {
      queryClient.setQueryData<InfiniteData<CommentsPage>>(
        feedKeys.comments(postId),
        function (oldData) {
          return applyCommentUpdate(oldData, comment);
        }
      );
      queryClient.invalidateQueries({ queryKey: feedKeys.comments(postId) });
    },
  });
}

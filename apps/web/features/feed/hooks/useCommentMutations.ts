import { useAuth } from "@clerk/nextjs";
import type { InfiniteData } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createComment,
  deleteComment,
  likeComment,
  unlikeComment,
  updateComment,
} from "../api/commentsApi";
import { showGlobalFlashToast } from "@/components/FlashToast";
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

function applyCommentDeleteInTree(list: Comment[], commentId: string): Comment[] {
  return list
    .map(function (comment) {
      if (comment.id === commentId) {
        if (comment.replies.length === 0) {
          return null;
        }

        return {
          ...comment,
          body: null,
          isDeleted: true,
          replies: comment.replies,
        };
      }

      return {
        ...comment,
        replies: applyCommentDeleteInTree(comment.replies, commentId),
      };
    })
    .filter(function (comment): comment is Comment {
      return comment !== null;
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

function applyCommentLikeInTree(list: Comment[], commentId: string, isLiked: boolean): Comment[] {
  return list.map(function (comment) {
    if (comment.id === commentId) {
      return {
        ...comment,
        isLiked: isLiked,
        likeCount: Math.max(0, comment.likeCount + (isLiked ? 1 : -1)),
      };
    }

    return {
      ...comment,
      replies: applyCommentLikeInTree(comment.replies, commentId, isLiked),
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
        comments: applyCommentDeleteInTree(page.comments, commentId),
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
      showGlobalFlashToast("Could not delete comment", "error");
    },
    onSuccess: function () {
      showGlobalFlashToast("Comment deleted");
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

export function useLikeComment(postId: string) {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: { commentId: string; isLiked: boolean }) {
      var token = await getToken();
      if (input.isLiked) {
        return likeComment({
          postId,
          commentId: input.commentId,
          token,
        });
      }

      return unlikeComment({
        postId,
        commentId: input.commentId,
        token,
      });
    },
    onMutate: async function (input) {
      await queryClient.cancelQueries({ queryKey: feedKeys.comments(postId) });

      var previous = queryClient.getQueryData<InfiniteData<CommentsPage>>(
        feedKeys.comments(postId)
      );

      queryClient.setQueryData<InfiniteData<CommentsPage>>(
        feedKeys.comments(postId),
        function (oldData) {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map(function (page) {
              return {
                ...page,
                comments: applyCommentLikeInTree(page.comments, input.commentId, input.isLiked),
              };
            }),
          };
        }
      );

      return { previous };
    },
    onError: function (_err, _input, context) {
      if (context?.previous) {
        queryClient.setQueryData(feedKeys.comments(postId), context.previous);
      }
      showGlobalFlashToast("Could not update comment like", "error");
    },
    onSettled: function () {
      queryClient.invalidateQueries({ queryKey: feedKeys.comments(postId) });
    },
  });
}

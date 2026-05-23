import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createComment, likeComment, unlikeComment } from "../api/commentsApi";
import { feedKeys } from "./queryKeys";

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId: string | null }) =>
      createComment(postId, body, parentId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.comments(postId) });
      queryClient.invalidateQueries({ queryKey: ["post"] });
    },
  });
}

export function useLikeComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, isLiked }: { commentId: string; isLiked: boolean }) =>
      isLiked ? unlikeComment(commentId) : likeComment(commentId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: feedKeys.comments(postId) }),
  });
}

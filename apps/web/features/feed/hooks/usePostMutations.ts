import type { InfiniteData } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likePost, repostPost, savePost, unlikePost, unsavePost } from "../api/postsApi";
import type { FeedPage, Post } from "../types/feed";
import { feedKeys } from "./queryKeys";

function patchPostInFeedCache(
  cache: InfiniteData<FeedPage> | undefined,
  postId: string,
  patch: Partial<Post>
): InfiniteData<FeedPage> | undefined {
  if (!cache) return undefined;
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      posts: page.posts.map((post) => (post.id === postId ? { ...post, ...patch } : post)),
    })),
  };
}

export function useLikePost(tab: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) =>
      isLiked ? unlikePost(postId) : likePost(postId),
    onMutate: async ({ postId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.tab(tab) });
      const previous = queryClient.getQueryData<InfiniteData<FeedPage>>(feedKeys.tab(tab));
      const currentPost = previous?.pages.flatMap((page) => page.posts).find((post) => post.id === postId);

      queryClient.setQueryData<InfiniteData<FeedPage>>(feedKeys.tab(tab), (old) =>
        patchPostInFeedCache(old, postId, {
          isLiked: !isLiked,
          likeCount: (currentPost?.likeCount ?? 0) + (isLiked ? -1 : 1),
        })
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(feedKeys.tab(tab), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.tab(tab) });
    },
  });
}

export function useRepostPost(tab: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId }: { postId: string }) => repostPost(postId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: feedKeys.tab(tab) }),
  });
}

export function useSavePost(tab: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, isSaved }: { postId: string; isSaved: boolean }) =>
      isSaved ? unsavePost(postId) : savePost(postId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: feedKeys.tab(tab) }),
  });
}

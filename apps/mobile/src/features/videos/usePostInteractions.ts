import type { FeedPage, FeedPost } from "@35mm/types";
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";

import { feedKeys } from "@/features/feed/queryKeys";
import { useApiClient } from "@/services/api";
import { deletePost, setPostBookmark, setPostLike, setPostRepost } from "./api";

type ToggleField = "isLiked" | "isReposted" | "isBookmarked";
type CountField = "likeCount" | "repostCount" | "bookmarkCount";

function updatePost(
  data: InfiniteData<FeedPage> | undefined,
  postId: string,
  transform: (post: FeedPost) => FeedPost | null,
): InfiniteData<FeedPage> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.flatMap((post) => {
        if (post.id !== postId) return [post];
        const next = transform(post);
        return next ? [next] : [];
      }),
    })),
  };
}

function useTogglePostInteraction(
  post: FeedPost,
  field: ToggleField,
  countField: CountField,
  request: (selected: boolean, key: string) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => request(!post[field], Crypto.randomUUID()),
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ exact: true, queryKey: feedKeys.home() }),
        queryClient.cancelQueries({ exact: true, queryKey: feedKeys.post(post.id) }),
      ]);
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedPage>>(feedKeys.home());
      const previousPost = queryClient.getQueryData<FeedPost>(feedKeys.post(post.id));
      queryClient.setQueryData<InfiniteData<FeedPage>>(feedKeys.home(), (current) =>
        updatePost(current, post.id, (item) => ({
          ...item,
          [field]: !item[field],
          [countField]: Math.max(0, item[countField] + (item[field] ? -1 : 1)),
        })),
      );
      queryClient.setQueryData<FeedPost>(feedKeys.post(post.id), (current) => current ? ({
        ...current,
        [field]: !current[field],
        [countField]: Math.max(0, current[countField] + (current[field] ? -1 : 1)),
      }) : current);
      return { previousFeed, previousPost };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFeed) queryClient.setQueryData(feedKeys.home(), context.previousFeed);
      if (context?.previousPost) queryClient.setQueryData(feedKeys.post(post.id), context.previousPost);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ exact: true, queryKey: feedKeys.home() }),
        queryClient.invalidateQueries({ exact: true, queryKey: feedKeys.post(post.id) }),
      ]);
    },
  });
}

export function usePostInteractions(post: FeedPost) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const like = useTogglePostInteraction(post, "isLiked", "likeCount", (selected, key) =>
    setPostLike(client, post.id, selected, key),
  );
  const repost = useTogglePostInteraction(post, "isReposted", "repostCount", (selected, key) =>
    setPostRepost(client, post.id, selected, key),
  );
  const bookmark = useTogglePostInteraction(post, "isBookmarked", "bookmarkCount", (selected, key) =>
    setPostBookmark(client, post.id, selected, key),
  );
  const remove = useMutation({
    mutationFn: () => deletePost(client, post.id, Crypto.randomUUID()),
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ exact: true, queryKey: feedKeys.home() }),
        queryClient.cancelQueries({ exact: true, queryKey: feedKeys.post(post.id) }),
      ]);
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedPage>>(feedKeys.home());
      const previousPost = queryClient.getQueryData<FeedPost>(feedKeys.post(post.id));
      queryClient.setQueryData<InfiniteData<FeedPage>>(feedKeys.home(), (current) =>
        updatePost(current, post.id, () => null),
      );
      queryClient.removeQueries({ queryKey: feedKeys.post(post.id) });
      return { previousFeed, previousPost };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFeed) queryClient.setQueryData(feedKeys.home(), context.previousFeed);
      if (context?.previousPost) queryClient.setQueryData(feedKeys.post(post.id), context.previousPost);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: feedKeys.home() }),
  });
  return { like, repost, bookmark, remove };
}

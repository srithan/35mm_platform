import { useAuth } from "@clerk/nextjs";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bookmarkPost,
  createPost,
  deletePost,
  likePost,
  repostPost,
  unbookmarkPost,
  unlikePost,
  unrepostPost,
  updatePost,
  votePoll,
  type CreatePostInput,
  type UpdatePostInput,
} from "../api/postsApi";
import type { FeedPage, Post } from "../types/feed";
import { feedKeys } from "./queryKeys";
import { bookmarkKeys } from "@/features/bookmarks/hooks/queryKeys";
import { showGlobalFlashToast } from "@/components/FlashToast";

type FeedCacheSnapshot = Array<[readonly unknown[], InfiniteData<FeedPage> | undefined]>;

function isInfiniteFeedData(
  value: unknown
): value is InfiniteData<FeedPage> | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { pages?: unknown }).pages);
}

function updatePostInInfinite(
  data: InfiniteData<FeedPage> | undefined,
  postId: string,
  updater: (post: Post) => Post
): InfiniteData<FeedPage> | undefined {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map(function (page) {
      return {
        ...page,
        posts: page.posts.map(function (post) {
          return post.id === postId ? updater(post) : post;
        }),
      };
    }),
  };
}

function removePostFromInfinite(
  data: InfiniteData<FeedPage> | undefined,
  postId: string
): InfiniteData<FeedPage> | undefined {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map(function (page) {
      return {
        ...page,
        posts: page.posts.filter(function (post) {
          return post.id !== postId;
        }),
      };
    }),
  };
}

function snapshotFeedCaches(queryClient: QueryClient): FeedCacheSnapshot {
  var entries = queryClient.getQueriesData<unknown>({
    queryKey: feedKeys.all,
  });

  var snapshots: FeedCacheSnapshot = [];
  for (var i = 0; i < entries.length; i += 1) {
    var entry = entries[i];
    var key = entry[0];
    var data = entry[1];
    if (!isInfiniteFeedData(data)) continue;
    snapshots.push([key, data]);
  }
  return snapshots;
}

function restoreFeedCaches(queryClient: QueryClient, snapshot: FeedCacheSnapshot) {
  for (var i = 0; i < snapshot.length; i += 1) {
    var entry = snapshot[i];
    queryClient.setQueryData(entry[0], entry[1]);
  }
}

function patchAllFeedCaches(
  queryClient: QueryClient,
  postId: string,
  updater: (post: Post) => Post
) {
  var entries = queryClient.getQueriesData<unknown>({
    queryKey: feedKeys.all,
  });

  for (var i = 0; i < entries.length; i += 1) {
    var [key, data] = entries[i];
    if (!isInfiniteFeedData(data)) continue;
    queryClient.setQueryData(key, updatePostInInfinite(data, postId, updater));
  }

  queryClient.setQueryData<Post | undefined>(feedKeys.post(postId), function (existing) {
    return existing ? updater(existing) : existing;
  });
}

function removePostFromAllFeedCaches(
  queryClient: QueryClient,
  postId: string
) {
  var entries = queryClient.getQueriesData<unknown>({
    queryKey: feedKeys.all,
  });

  for (var i = 0; i < entries.length; i += 1) {
    var [key, data] = entries[i];
    if (!isInfiniteFeedData(data)) continue;
    queryClient.setQueryData(key, removePostFromInfinite(data, postId));
  }
}

export function useLikePost() {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: { postId: string; isLiked: boolean }) {
      var token = await getToken();
      if (input.isLiked) {
        return likePost(input.postId, token);
      }
      return unlikePost(input.postId, token);
    },
    onMutate: async function (input) {
      await queryClient.cancelQueries({ queryKey: feedKeys.all });
      await queryClient.cancelQueries({ queryKey: feedKeys.post(input.postId) });

      var snapshot = snapshotFeedCaches(queryClient);
      var previousPost = queryClient.getQueryData<Post>(feedKeys.post(input.postId));

      patchAllFeedCaches(queryClient, input.postId, function (post) {
        return {
          ...post,
          isLiked: input.isLiked,
          likeCount: Math.max(0, post.likeCount + (input.isLiked ? 1 : -1)),
        };
      });

      return {
        snapshot,
        previousPost,
      };
    },
    onError: function (_err, input, context) {
      if (!context) return;
      restoreFeedCaches(queryClient, context.snapshot);
      queryClient.setQueryData(feedKeys.post(input.postId), context.previousPost);
    },
  });
}

export function useRepostPost() {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: { postId: string; isReposted: boolean }) {
      var token = await getToken();
      if (input.isReposted) {
        await repostPost(input.postId, token);
      } else {
        await unrepostPost(input.postId, token);
      }
    },
    onMutate: async function (input) {
      await queryClient.cancelQueries({ queryKey: feedKeys.all });
      await queryClient.cancelQueries({ queryKey: feedKeys.post(input.postId) });

      var snapshot = snapshotFeedCaches(queryClient);
      var previousPost = queryClient.getQueryData<Post>(feedKeys.post(input.postId));

      patchAllFeedCaches(queryClient, input.postId, function (post) {
        return {
          ...post,
          isReposted: input.isReposted,
          repostCount: Math.max(0, post.repostCount + (input.isReposted ? 1 : -1)),
        };
      });

      return { snapshot, previousPost };
    },
    onError: function (_err, input, context) {
      if (!context) return;
      restoreFeedCaches(queryClient, context.snapshot);
      queryClient.setQueryData(feedKeys.post(input.postId), context.previousPost);
    },
  });
}

export function useBookmarkPost() {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: { postId: string; isBookmarked: boolean }) {
      var token = await getToken();
      if (input.isBookmarked) {
        await bookmarkPost(input.postId, token);
      } else {
        await unbookmarkPost(input.postId, token);
      }
    },
    onMutate: async function (input) {
      await queryClient.cancelQueries({ queryKey: feedKeys.all });
      await queryClient.cancelQueries({ queryKey: feedKeys.post(input.postId) });

      var snapshot = snapshotFeedCaches(queryClient);
      var previousPost = queryClient.getQueryData<Post>(feedKeys.post(input.postId));

      patchAllFeedCaches(queryClient, input.postId, function (post) {
        return {
          ...post,
          isBookmarked: input.isBookmarked,
          bookmarkCount: Math.max(0, post.bookmarkCount + (input.isBookmarked ? 1 : -1)),
        };
      });

      return { snapshot, previousPost };
    },
    onError: function (_err, input, context) {
      if (!context) return;
      restoreFeedCaches(queryClient, context.snapshot);
      queryClient.setQueryData(feedKeys.post(input.postId), context.previousPost);
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.list() });
    },
  });
}

export function useVotePoll() {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: { postId: string; optionIds: string[] }) {
      return votePoll(input.postId, input.optionIds, await getToken());
    },
    onSuccess: function (updated) {
      patchAllFeedCaches(queryClient, updated.id, function () {
        return updated;
      });
      queryClient.setQueryData(feedKeys.post(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
    onError: function () {
      showGlobalFlashToast("Could not submit vote", "error");
    },
  });
}

export function useCreatePost() {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: CreatePostInput) {
      return createPost(input, await getToken());
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: feedKeys.home() });
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useUpdatePost() {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: UpdatePostInput) {
      return updatePost(input, await getToken());
    },
    onSuccess: function (updated) {
      queryClient.setQueryData(feedKeys.post(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: feedKeys.post(updated.id) });
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
  });
}

export function useDeletePost() {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: { postId: string }) {
      await deletePost(input.postId, await getToken());
    },
    onMutate: async function (input) {
      await queryClient.cancelQueries({ queryKey: feedKeys.all });
      await queryClient.cancelQueries({ queryKey: feedKeys.post(input.postId) });
      await queryClient.cancelQueries({ queryKey: feedKeys.comments(input.postId) });

      var snapshot = snapshotFeedCaches(queryClient);
      var previousPost = queryClient.getQueryData<Post>(feedKeys.post(input.postId));
      var previousComments = queryClient.getQueryData(feedKeys.comments(input.postId));

      removePostFromAllFeedCaches(queryClient, input.postId);
      queryClient.setQueryData(feedKeys.post(input.postId), undefined);

      return { snapshot, previousPost, previousComments };
    },
    onError: function (_err, input, context) {
      if (!context) return;
      restoreFeedCaches(queryClient, context.snapshot);
      queryClient.setQueryData(feedKeys.post(input.postId), context.previousPost);
      queryClient.setQueryData(feedKeys.comments(input.postId), context.previousComments);
      showGlobalFlashToast("Could not delete post", "error");
    },
    onSuccess: function (_data, input) {
      showGlobalFlashToast("Post deleted");
      queryClient.removeQueries({ queryKey: feedKeys.post(input.postId) });
      queryClient.removeQueries({ queryKey: feedKeys.comments(input.postId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.list() });
    },
  });
}

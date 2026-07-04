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
import { applyOptimisticPollVote } from "../utils/pollUtils";

type FeedCacheSnapshot = Array<[readonly unknown[], InfiniteData<FeedPage> | undefined]>;
type PostCacheSnapshot = Array<[readonly unknown[], Post | undefined]>;

function isInfiniteFeedData(
  value: unknown
): value is InfiniteData<FeedPage> | undefined {
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  var pages = (value as { pages?: unknown }).pages;
  if (!Array.isArray(pages)) return false;
  return pages.every(function (page) {
    return Boolean(page) && typeof page === "object" && Array.isArray((page as { posts?: unknown }).posts);
  });
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

function snapshotPostCaches(queryClient: QueryClient, postId: string): PostCacheSnapshot {
  return queryClient.getQueriesData<Post | undefined>({
    queryKey: feedKeys.post(postId),
  });
}

function restorePostCaches(queryClient: QueryClient, snapshot: PostCacheSnapshot) {
  for (var i = 0; i < snapshot.length; i += 1) {
    var entry = snapshot[i];
    queryClient.setQueryData(entry[0], entry[1]);
  }
}

function patchPostDetailCaches(
  queryClient: QueryClient,
  postId: string,
  updater: (post: Post) => Post,
  fallbackPost?: Post
) {
  var entries = queryClient.getQueriesData<Post | undefined>({
    queryKey: feedKeys.post(postId),
  });

  for (var i = 0; i < entries.length; i += 1) {
    var [key, data] = entries[i];
    queryClient.setQueryData<Post | undefined>(key, data ? updater(data) : fallbackPost);
  }
}

function patchAllFeedCaches(
  queryClient: QueryClient,
  postId: string,
  updater: (post: Post) => Post
) {
  var updatedPostFromFeed: Post | undefined;
  var entries = queryClient.getQueriesData<unknown>({
    queryKey: feedKeys.all,
  });

  for (var i = 0; i < entries.length; i += 1) {
    var [key, data] = entries[i];
    if (!isInfiniteFeedData(data)) continue;
    queryClient.setQueryData(
      key,
      updatePostInInfinite(data, postId, function (post) {
        var updated = updater(post);
        updatedPostFromFeed = updated;
        return updated;
      })
    );
  }

  patchPostDetailCaches(queryClient, postId, updater, updatedPostFromFeed);
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

export function useLikePost(postId?: string) {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationKey: feedKeys.postLike(postId ?? "unknown"),
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
      var previousPosts = snapshotPostCaches(queryClient, input.postId);

      patchAllFeedCaches(queryClient, input.postId, function (post) {
        var countDelta = post.isLiked === input.isLiked ? 0 : input.isLiked ? 1 : -1;
        return {
          ...post,
          isLiked: input.isLiked,
          likeCount: Math.max(0, post.likeCount + countDelta),
        };
      });

      return {
        snapshot,
        previousPosts,
      };
    },
    onError: function (_err, input, context) {
      if (!context) return;
      restoreFeedCaches(queryClient, context.snapshot);
      restorePostCaches(queryClient, context.previousPosts);
    },
    onSuccess: function (data, input) {
      patchAllFeedCaches(queryClient, input.postId, function (post) {
        return {
          ...post,
          isLiked: data.isLiked ?? input.isLiked,
          likeCount: Math.max(0, Number(data.likeCount ?? post.likeCount)),
        };
      });
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
      var previousPosts = snapshotPostCaches(queryClient, input.postId);

      patchAllFeedCaches(queryClient, input.postId, function (post) {
        return {
          ...post,
          isReposted: input.isReposted,
          repostCount: Math.max(0, post.repostCount + (input.isReposted ? 1 : -1)),
        };
      });

      return { snapshot, previousPosts };
    },
    onError: function (_err, input, context) {
      if (!context) return;
      restoreFeedCaches(queryClient, context.snapshot);
      restorePostCaches(queryClient, context.previousPosts);
    },
  });
}

export function useBookmarkPost(postId?: string) {
  var queryClient = useQueryClient();
  var { getToken } = useAuth();

  return useMutation({
    mutationKey: feedKeys.postBookmark(postId ?? "unknown"),
    mutationFn: async function (input: {
      postId: string;
      isBookmarked: boolean;
      folderId?: string | null;
    }) {
      var token = await getToken();
      if (input.isBookmarked) {
        return bookmarkPost(input.postId, token, input.folderId);
      }
      var result = await unbookmarkPost(input.postId, token);
      return {
        ...result,
        folderId: null as string | null,
      };
    },
    onMutate: async function (input) {
      await queryClient.cancelQueries({ queryKey: feedKeys.all });
      await queryClient.cancelQueries({ queryKey: feedKeys.post(input.postId) });

      var snapshot = snapshotFeedCaches(queryClient);
      var previousPosts = snapshotPostCaches(queryClient, input.postId);

      patchAllFeedCaches(queryClient, input.postId, function (post) {
        var wasBookmarked = post.isBookmarked;
        var nextBookmarked = input.isBookmarked;
        var countDelta =
          nextBookmarked && !wasBookmarked ? 1 : !nextBookmarked && wasBookmarked ? -1 : 0;
        return {
          ...post,
          isBookmarked: nextBookmarked,
          bookmarkFolderId: nextBookmarked
            ? (input.folderId !== undefined ? input.folderId : post.bookmarkFolderId ?? null)
            : null,
          bookmarkCount: Math.max(0, post.bookmarkCount + countDelta),
        };
      });

      return { snapshot, previousPosts };
    },
    onError: function (_err, input, context) {
      if (!context) return;
      restoreFeedCaches(queryClient, context.snapshot);
      restorePostCaches(queryClient, context.previousPosts);
    },
    onSuccess: function (data, input) {
      patchAllFeedCaches(queryClient, input.postId, function (post) {
        var isBookmarked = data.isBookmarked ?? input.isBookmarked;
        var bookmarkCount = data.bookmarkCount === undefined
          ? post.bookmarkCount
          : Math.max(0, Number(data.bookmarkCount));
        return {
          ...post,
          isBookmarked,
          bookmarkFolderId: isBookmarked ? data.folderId : null,
          bookmarkCount,
        };
      });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
      if (input.isBookmarked && input.folderId) {
        queryClient.invalidateQueries({ queryKey: bookmarkKeys.folders() });
      }
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
    onMutate: async function (input) {
      await queryClient.cancelQueries({ queryKey: feedKeys.all });
      await queryClient.cancelQueries({ queryKey: feedKeys.post(input.postId) });

      var snapshot = snapshotFeedCaches(queryClient);
      var previousPosts = snapshotPostCaches(queryClient, input.postId);

      patchAllFeedCaches(queryClient, input.postId, function (post) {
        if (!post.poll) return post;
        return {
          ...post,
          poll: applyOptimisticPollVote(post.poll, input.optionIds),
        };
      });

      return { snapshot, previousPosts };
    },
    onError: function (_err, input, context) {
      if (!context) return;
      restoreFeedCaches(queryClient, context.snapshot);
      restorePostCaches(queryClient, context.previousPosts);
      showGlobalFlashToast("Could not submit vote", "error");
    },
    onSuccess: function (updated) {
      patchAllFeedCaches(queryClient, updated.id, function () {
        return updated;
      });
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
      patchPostDetailCaches(queryClient, updated.id, function () {
        return updated;
      }, updated);
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
      var previousPosts = snapshotPostCaches(queryClient, input.postId);
      var previousComments = queryClient.getQueryData(feedKeys.comments(input.postId));

      removePostFromAllFeedCaches(queryClient, input.postId);
      queryClient.setQueriesData({ queryKey: feedKeys.post(input.postId) }, undefined);

      return { snapshot, previousPosts, previousComments };
    },
    onError: function (_err, input, context) {
      if (!context) return;
      restoreFeedCaches(queryClient, context.snapshot);
      restorePostCaches(queryClient, context.previousPosts);
      queryClient.setQueryData(feedKeys.comments(input.postId), context.previousComments);
      showGlobalFlashToast("Could not delete post", "error");
    },
    onSuccess: function (_data, input) {
      showGlobalFlashToast("Post deleted");
      queryClient.removeQueries({ queryKey: feedKeys.post(input.postId) });
      queryClient.removeQueries({ queryKey: feedKeys.comments(input.postId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    },
  });
}

import { isApiClientError } from "@35mm/api-client";
import type { FeedPage, FeedPost } from "@35mm/types";
import {
  AppText,
  IconButton,
  LoadingState,
  PaginationFooter,
  Screen,
  StateSurface,
  useMobileUI,
} from "@35mm/mobile-ui";
import { useAuth } from "@clerk/expo";
import { FlashList } from "@shopify/flash-list";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";

import { useApiClient } from "@/services/api";
import { fetchCommentPage, fetchPost } from "./api";
import { CommentRow, flattenCommentTree } from "./CommentThread";
import { PostCard } from "./PostCard";
import { feedKeys } from "./queryKeys";

function postFromHomeCache(
  data: InfiniteData<FeedPage> | undefined,
  postId: string,
): FeedPost | undefined {
  for (let page of data?.pages ?? []) {
    let post = page.items.find((item) => item.id === postId);
    if (post) return post;
  }
  return undefined;
}

function DetailHeader({ onBack }: { readonly onBack: () => void }) {
  const { theme } = useMobileUI();
  return (
    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
      <IconButton icon="back" label="Back" onPress={onBack} />
      <AppText accessibilityRole="header" role="screenTitle">Post</AppText>
      <View accessibilityElementsHidden style={styles.headerSpacer} />
    </View>
  );
}

export function PostDetailScreen({ postId }: { readonly postId: string }) {
  const client = useApiClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const { theme } = useMobileUI();
  const cachedPost = postFromHomeCache(
    queryClient.getQueryData<InfiniteData<FeedPage>>(feedKeys.home()),
    postId,
  );
  const postQuery = useQuery({
    queryKey: feedKeys.post(postId),
    queryFn: ({ signal }) => fetchPost(client, postId, signal),
    initialData: cachedPost,
    staleTime: 30_000,
  });
  const commentsQuery = useInfiniteQuery({
    queryKey: feedKeys.comments(postId),
    queryFn: ({ pageParam, signal }) => fetchCommentPage(client, postId, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
    enabled: postQuery.isSuccess,
    staleTime: 30_000,
  });
  const comments = useMemo(
    () => flattenCommentTree(commentsQuery.data?.pages.flatMap((page) => page.items) ?? []),
    [commentsQuery.data?.pages],
  );
  const refresh = useCallback(() => {
    void Promise.all([postQuery.refetch(), commentsQuery.refetch()]);
  }, [commentsQuery, postQuery]);

  if (postQuery.isPending) {
    return (
      <Screen safeAreaEdges={["top", "right", "bottom", "left"]} testID="post-detail-loading">
        <DetailHeader onBack={() => router.back()} />
        <LoadingState label="Loading post and comments" />
      </Screen>
    );
  }
  if (postQuery.isError || !postQuery.data) {
    let privateOrMissing = isApiClientError(postQuery.error) && [403, 404].includes(postQuery.error.status ?? 0);
    let offline = isApiClientError(postQuery.error) && ["network", "timeout"].includes(postQuery.error.kind);
    return (
      <Screen safeAreaEdges={["top", "right", "bottom", "left"]} testID="post-detail-error">
        <DetailHeader onBack={() => router.back()} />
        <StateSurface
          kind={offline ? "offline" : privateOrMissing ? "private" : "error"}
          message={
            offline
              ? "Check your connection and retry."
              : privateOrMissing
                ? "This post is unavailable or you don’t have access."
                : "35mm couldn’t load this post."
          }
          primaryAction={{ label: "Retry", onPress: () => void postQuery.refetch() }}
          title={offline ? "You’re offline" : privateOrMissing ? "Post unavailable" : "Couldn’t load post"}
        />
      </Screen>
    );
  }

  let post = postQuery.data;
  return (
    <Screen safeAreaEdges={["top", "right", "bottom", "left"]} testID="post-detail-screen">
      <DetailHeader onBack={() => router.back()} />
      <FlashList
        data={comments}
        drawDistance={700}
        keyExtractor={(item) => item.comment.id}
        ListHeaderComponent={
          <View>
            <PostCard
              active
              autoplay={false}
              currentUserId={userId ?? ""}
              onDeleted={() => router.back()}
              post={post}
              startWithSound={false}
            />
            <AppText role="sectionTitle" style={styles.commentsTitle}>
              {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
            </AppText>
          </View>
        }
        ListEmptyComponent={
          commentsQuery.isPending ? (
            <LoadingState label="Loading comments" />
          ) : commentsQuery.isError ? (
            <StateSurface
              kind={
                isApiClientError(commentsQuery.error) && ["network", "timeout"].includes(commentsQuery.error.kind)
                  ? "offline"
                  : "error"
              }
              message="35mm couldn’t load comments."
              primaryAction={{ label: "Retry", onPress: () => void commentsQuery.refetch() }}
              title="Comments unavailable"
            />
          ) : (
            <StateSurface
              kind="empty"
              message="Comments will appear here when someone joins the conversation."
              title="No comments yet"
            />
          )
        }
        ListFooterComponent={
          comments.length > 0 ? (
            <PaginationFooter
              retry={() => void commentsQuery.fetchNextPage()}
              state={
                commentsQuery.isFetchingNextPage
                  ? "loading"
                  : commentsQuery.isFetchNextPageError
                    ? "error"
                    : commentsQuery.hasNextPage
                      ? "idle"
                      : "complete"
              }
            />
          ) : null
        }
        onEndReached={() => {
          if (commentsQuery.hasNextPage && !commentsQuery.isFetchingNextPage) {
            void commentsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            onRefresh={refresh}
            refreshing={postQuery.isRefetching || (commentsQuery.isRefetching && !commentsQuery.isFetchingNextPage)}
            tintColor={theme.colors.accent}
          />
        }
        renderItem={({ item }) => <CommentRow item={item} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  commentsTitle: { paddingHorizontal: 16, paddingVertical: 14 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: 8,
  },
  headerSpacer: { height: 44, width: 44 },
});

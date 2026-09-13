import type { FeedPost } from "@35mm/types";
import {
  LoadingState,
  PaginationFooter,
  StateSurface,
  useMobileUI,
} from "@35mm/mobile-ui";
import { isApiClientError } from "@35mm/api-client";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, View, type ViewToken } from "react-native";

import type { CurrentUserBootstrapProfile } from "@/features/auth/bootstrap/api";
import { fetchHomeFeedPage } from "@/features/feed/api";
import { PostCard } from "@/features/feed/PostCard";
import { feedKeys } from "@/features/feed/queryKeys";
import { fetchMobileVideoPreferences } from "@/features/videos/api";
import { videoPostKeys } from "@/features/videos/queryKeys";
import { useApiClient } from "@/services/api";

function uniquePosts(pages: readonly { readonly items: readonly FeedPost[] }[]): FeedPost[] {
  const seen = new Set<string>();
  return pages.flatMap((page) => page.items.filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  }));
}

export function HomeFeedScreen({
  profile,
  onCompose,
}: {
  readonly profile: CurrentUserBootstrapProfile;
  readonly onCompose: () => void;
}) {
  const client = useApiClient();
  const router = useRouter();
  const { theme } = useMobileUI();
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const preferences = useQuery({
    queryKey: videoPostKeys.settings(),
    queryFn: () => fetchMobileVideoPreferences(client),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const query = useInfiniteQuery({
    queryKey: feedKeys.home(),
    queryFn: ({ pageParam, signal }) => fetchHomeFeedPage(client, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
  });
  const posts = useMemo(() => uniquePosts(query.data?.pages ?? []), [query.data?.pages]);
  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 50, minimumViewTime: 250 }),
    [],
  );
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<FeedPost>[] }) => {
      setActivePostId(viewableItems.find((token) => token.isViewable)?.item?.id ?? null);
    },
    [],
  );

  if (query.isPending) {
    return (
      <View style={styles.centered} testID="home-feed-loading">
        <LoadingState label="Loading home feed" />
      </View>
    );
  }
  if (query.error && posts.length === 0) {
    const offline = isApiClientError(query.error) && ["network", "timeout"].includes(query.error.kind);
    return (
      <View style={styles.centered} testID="home-feed-error">
        <StateSurface
          kind={offline ? "offline" : "error"}
          message={offline ? "Check your connection and retry." : "35mm couldn’t load your feed."}
          primaryAction={{ label: "Retry", onPress: () => void query.refetch() }}
          title={offline ? "You’re offline" : "Feed unavailable"}
        />
      </View>
    );
  }

  return (
    <FlashList
      data={posts}
      drawDistance={900}
      keyExtractor={(post) => post.id}
      ListEmptyComponent={
        <StateSurface
          kind="empty"
          message="Follow people or publish your first video post."
          primaryAction={{ label: "Create video post", onPress: onCompose }}
          title="Your feed is quiet"
        />
      }
      ListFooterComponent={
        <PaginationFooter
          state={query.isFetchingNextPage ? "loading" : query.isFetchNextPageError ? "error" : query.hasNextPage ? "idle" : "complete"}
          retry={() => void query.fetchNextPage()}
        />
      }
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onEndReachedThreshold={0.6}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => void query.refetch()}
          tintColor={theme.colors.accent}
        />
      }
      renderItem={({ item }) => (
        <PostCard
          active={activePostId === item.id}
          autoplay={preferences.data?.autoplay ?? false}
          currentUserId={profile.userId}
          onOpenPost={() => router.push({ pathname: "/post/[postId]", params: { postId: item.id } })}
          post={item}
          startWithSound={preferences.data?.startWithSound ?? false}
        />
      )}
      testID="home-feed-list"
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
  },
});

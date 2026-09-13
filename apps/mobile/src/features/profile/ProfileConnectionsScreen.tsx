import { isApiClientError } from "@35mm/api-client";
import {
  AppText,
  Avatar,
  IconButton,
  LoadingState,
  PaginationFooter,
  Screen,
  StateSurface,
  useMobileUI,
} from "@35mm/mobile-ui";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { Pressable, RefreshControl, StyleSheet, View } from "react-native";

import { useApiClient } from "@/services/api";
import { fetchProfileConnectionsPage } from "./api";
import type { ProfileConnectionUser } from "./contracts";
import { profileKeys, type ProfileConnectionsKind } from "./queryKeys";

function uniqueUsers(pages: readonly { readonly items: readonly ProfileConnectionUser[] }[]): ProfileConnectionUser[] {
  const seen = new Set<string>();
  return pages.flatMap((page) => page.items.filter((user) => {
    if (seen.has(user.userId)) return false;
    seen.add(user.userId);
    return true;
  }));
}

function isOfflineError(error: unknown): boolean {
  return isApiClientError(error) && (error.kind === "network" || error.kind === "timeout");
}

export function ProfileConnectionsScreen({
  kind,
  username,
}: {
  readonly kind: ProfileConnectionsKind;
  readonly username: string;
}) {
  const client = useApiClient();
  const router = useRouter();
  const { theme } = useMobileUI();
  const normalizedUsername = username.trim().toLowerCase();
  const query = useInfiniteQuery({
    queryKey: profileKeys.connections(normalizedUsername, kind),
    queryFn: ({ pageParam, signal }) =>
      fetchProfileConnectionsPage(client, {
        cursor: pageParam,
        kind,
        signal,
        username: normalizedUsername,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
  });
  const users = uniqueUsers(query.data?.pages ?? []);

  return (
    <Screen safeAreaEdges={["top", "right", "bottom", "left"]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <IconButton icon="back" label="Back to profile" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <AppText accessibilityRole="header" role="sectionTitle">
            {kind === "followers" ? "Followers" : "Following"}
          </AppText>
          <AppText color="textSecondary" role="metadata">@{normalizedUsername}</AppText>
        </View>
      </View>
      <FlashList
        data={users}
        keyExtractor={(item) => item.userId}
        ListEmptyComponent={
          query.isPending ? (
            <LoadingState compact label="Loading connections" style={styles.state} />
          ) : query.isError ? (
            <View style={styles.state}>
              <StateSurface
                compact
                kind={isOfflineError(query.error) ? "offline" : "error"}
                title="Couldn't load connections"
                primaryAction={{ label: "Try again", onPress: () => void query.refetch() }}
              />
            </View>
          ) : (
            <View style={styles.state}>
              <StateSurface
                compact
                kind="empty"
                title={kind === "followers" ? "No followers yet" : "Not following anyone yet"}
              />
            </View>
          )
        }
        ListFooterComponent={
          <PaginationFooter
            state={
              query.isFetchingNextPage
                ? "loading"
                : query.isFetchNextPageError
                  ? "error"
                  : query.hasNextPage
                    ? "idle"
                    : users.length > 0
                      ? "complete"
                      : "idle"
            }
            completeMessage="End of connections"
            retry={() => void query.fetchNextPage()}
          />
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={theme.colors.accent} />}
        renderItem={({ item }) => (
          <Pressable
            accessibilityLabel={`Open ${item.displayName}'s profile`}
            accessibilityRole="button"
            onPress={() => router.push(`/profile/${encodeURIComponent(item.username)}` as Href)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surface,
                borderBottomColor: theme.colors.border,
              },
            ]}
          >
            <Avatar
              avatarSize="medium"
              label={`${item.displayName} avatar`}
              {...(item.avatarUrlLg ?? item.avatarUrl ? { source: { uri: item.avatarUrlLg ?? item.avatarUrl ?? "" } } : {})}
            />
            <View style={styles.rowCopy}>
              <AppText role="rowLabelCompact">{item.displayName}</AppText>
              <AppText color="textSecondary" role="metadata">@{item.username}</AppText>
              {item.bio ? (
                <AppText color="textSecondary" numberOfLines={2} role="metadata">{item.bio}</AppText>
              ) : null}
            </View>
          </Pressable>
        )}
        testID="profile-connections-screen"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    minHeight: 58,
    paddingHorizontal: 8,
  },
  headerCopy: {
    flex: 1,
  },
  row: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  state: {
    padding: 20,
  },
});

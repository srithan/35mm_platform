import { isApiClientError } from "@35mm/api-client";
import {
  AppIcon,
  AppText,
  Avatar,
  Card,
  Chip,
  LoadingState,
  PaginationFooter,
  StateSurface,
  useMobileUI,
} from "@35mm/mobile-ui";
import { radius, spacing } from "@35mm/design-tokens";
import type { FilmListDetail, FilmListEntry, FilmListPage, FilmListSummary } from "@35mm/types";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useApiClient } from "@/services/api";
import { fetchPublicListsPage, fetchWatchlist, type PublicFilmListSort } from "./api";
import { listKeys } from "./queryKeys";

type ListsTab = "explore" | "watchlist";

type ListsRow =
  | { readonly type: "summary"; readonly list: FilmListSummary }
  | { readonly type: "watchlist-header"; readonly list: FilmListDetail }
  | { readonly type: "entry"; readonly entry: FilmListEntry };

const EMPTY_PUBLIC_PAGES: readonly FilmListPage[] = [];
const EMPTY_WATCHLIST_PAGES: readonly FilmListDetail[] = [];

function uniqueLists(pages: readonly FilmListPage[]): FilmListSummary[] {
  const seen = new Set<string>();
  return pages.flatMap((page) => page.items.filter((list) => {
    if (seen.has(list.id)) return false;
    seen.add(list.id);
    return true;
  }));
}

function uniqueEntries(pages: readonly FilmListDetail[]): FilmListEntry[] {
  const seen = new Set<string>();
  return pages.flatMap((page) => {
    const entries = page.entriesPage?.items ?? page.entries;
    return entries.filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  });
}

function publicPageCursor(page: FilmListPage): string | null | undefined {
  return page.hasMore ? page.nextCursor : undefined;
}

function watchlistPageCursor(page: FilmListDetail): string | null | undefined {
  return page.entriesPage?.hasMore ? page.entriesPage.nextCursor : undefined;
}

export function ListsScreen() {
  const client = useApiClient();
  const { theme } = useMobileUI();
  const [tab, setTab] = useState<ListsTab>("explore");
  const [sort, setSort] = useState<PublicFilmListSort>("popular");

  const publicQuery = useInfiniteQuery({
    queryKey: listKeys.public(sort),
    queryFn: ({ pageParam, signal }) =>
      fetchPublicListsPage(client, { sort, cursor: pageParam, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: publicPageCursor,
  });

  const watchlistQuery = useInfiniteQuery({
    queryKey: listKeys.watchlist(),
    queryFn: ({ pageParam, signal }) =>
      fetchWatchlist(client, { cursor: pageParam, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: watchlistPageCursor,
  });

  const publicPages = publicQuery.data?.pages ?? EMPTY_PUBLIC_PAGES;
  const lists = useMemo(() => uniqueLists(publicPages), [publicPages]);
  const watchlistPages = watchlistQuery.data?.pages ?? EMPTY_WATCHLIST_PAGES;
  const watchlist = watchlistPages[0] ?? null;
  const watchlistEntries = useMemo(() => uniqueEntries(watchlistPages), [watchlistPages]);
  const rows = useMemo<ListsRow[]>(() => {
    if (tab === "explore") return lists.map((list) => ({ type: "summary", list }));
    return [
      ...(watchlist ? [{ type: "watchlist-header" as const, list: watchlist }] : []),
      ...watchlistEntries.map((entry) => ({ type: "entry" as const, entry })),
    ];
  }, [lists, tab, watchlist, watchlistEntries]);

  const activeQuery = tab === "explore" ? publicQuery : watchlistQuery;
  const pendingInitial = activeQuery.isPending && rows.length === 0;
  const errorInitial = activeQuery.error && rows.length === 0;

  if (pendingInitial) {
    return (
      <View style={styles.centered} testID="lists-loading">
        <LoadingState label={tab === "explore" ? "Loading lists" : "Loading watchlist"} />
      </View>
    );
  }

  if (errorInitial) {
    const offline = isApiClientError(activeQuery.error) && ["network", "timeout"].includes(activeQuery.error.kind);
    return (
      <View style={styles.centered} testID="lists-error">
        <StateSurface
          compact
          kind={offline ? "offline" : "error"}
          message={offline ? "Connection dropped while loading film lists." : "Film lists could not load."}
          primaryAction={{ label: "Retry", onPress: () => void activeQuery.refetch() }}
          title={offline ? "Lists offline" : "Lists unavailable"}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.toolbar, { borderBottomColor: theme.colors.border }]}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.toolbarRow}
          showsHorizontalScrollIndicator={false}
        >
          <Chip label="Explore" selected={tab === "explore"} onPress={() => setTab("explore")} />
          <Chip label="Watchlist" selected={tab === "watchlist"} onPress={() => setTab("watchlist")} />
          {tab === "explore" ? (
            <>
              <View style={[styles.toolbarDivider, { backgroundColor: theme.colors.border }]} />
              <Chip label="Popular" selected={sort === "popular"} onPress={() => setSort("popular")} />
              <Chip label="Recent" selected={sort === "recent"} onPress={() => setSort("recent")} />
            </>
          ) : null}
        </ScrollView>
      </View>
      <FlashList
        data={rows}
        keyExtractor={(item) =>
          item.type === "summary"
            ? `list-${item.list.id}`
            : item.type === "watchlist-header"
              ? `watchlist-${item.list.id}`
              : `entry-${item.entry.id}`
        }
        refreshControl={(
          <RefreshControl
            refreshing={activeQuery.isRefetching && !activeQuery.isFetchingNextPage}
            onRefresh={() => void activeQuery.refetch()}
            tintColor={theme.colors.accent}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <StateSurface
              compact
              kind="empty"
              message={tab === "explore"
                ? "Public film lists will appear here once people publish them."
                : "Your watchlist is empty. Add films from title pages once catalog mobile lands."}
              title={tab === "explore" ? "No lists yet" : "No watchlist films"}
            />
          </View>
        )}
        ListFooterComponent={(
          <PaginationFooter
            state={
              activeQuery.isFetchingNextPage
                ? "loading"
                : activeQuery.isFetchNextPageError
                  ? "error"
                  : activeQuery.hasNextPage ? "idle" : "complete"
            }
            retry={() => void activeQuery.fetchNextPage()}
            completeMessage="End of lists"
          />
        )}
        onEndReached={() => {
          if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
            void activeQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) =>
          item.type === "summary" ? (
            <ListSummaryCard list={item.list} />
          ) : item.type === "watchlist-header" ? (
            <WatchlistHeader list={item.list} />
          ) : (
            <WatchlistEntryRow entry={item.entry} />
          )
        }
      />
    </View>
  );
}

function ListSummaryCard({ list }: { readonly list: FilmListSummary }) {
  const { theme } = useMobileUI();
  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.cardHeader}>
        <PosterStrip posterUrls={list.posterUrls} />
        <View style={styles.cardCopy}>
          <View style={styles.titleRow}>
            <AppText numberOfLines={2} role="rowLabel">{list.title}</AppText>
            {list.visibility === "private" ? (
              <AppIcon name="lock" size="small" color={theme.colors.textSecondary} />
            ) : null}
          </View>
          {list.description ? (
            <AppText color="textSecondary" numberOfLines={2} role="metadata">
              {list.description}
            </AppText>
          ) : null}
          <View style={styles.ownerRow}>
            <Avatar
              avatarSize="small"
              label={`${list.owner.displayName} avatar`}
              {...(list.owner.avatarUrl ? { source: { uri: list.owner.avatarUrl } } : {})}
            />
            <AppText color="textSecondary" numberOfLines={1} role="metadata">
              {list.owner.displayName} @{list.owner.username}
            </AppText>
          </View>
        </View>
      </View>
      <View style={styles.metaRow}>
        <MetaPill icon="film" label={`${list.entryCount} films`} />
        <MetaPill icon="heart" label={`${list.likeCount}`} />
        <MetaPill icon={list.isRanked ? "star" : "folder"} label={list.isRanked ? "Ranked" : "Unranked"} />
      </View>
      {list.tags.length > 0 ? (
        <AppText color="textSecondary" numberOfLines={1} role="metadata" style={styles.tags}>
          {list.tags.slice(0, 4).map((tag) => `#${tag}`).join(" ")}
        </AppText>
      ) : null}
    </Card>
  );
}

function WatchlistHeader({ list }: { readonly list: FilmListDetail }) {
  return (
    <Card variant="sunken" style={styles.watchlistHeader}>
      <View style={styles.watchlistHeaderCopy}>
        <AppText role="sectionTitle">{list.title}</AppText>
        <AppText color="textSecondary" role="metadata">
          {list.entryCount} films · {list.visibility}
        </AppText>
      </View>
      <PosterStrip posterUrls={list.posterUrls} compact />
    </Card>
  );
}

function WatchlistEntryRow({ entry }: { readonly entry: FilmListEntry }) {
  const { theme } = useMobileUI();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.film.title}${entry.film.year ? `, ${entry.film.year}` : ""}`}
      style={({ pressed }) => [
        styles.entryRow,
        {
          backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <PosterImage uri={entry.film.posterUrl} small />
      <View style={styles.entryCopy}>
        <AppText numberOfLines={1} role="rowLabel">
          {entry.position != null ? `${entry.position}. ` : ""}{entry.film.title}
        </AppText>
        <AppText color="textSecondary" numberOfLines={1} role="metadata">
          {[entry.film.year, ...entry.film.genres.slice(0, 2)].filter(Boolean).join(" · ") || "Film"}
        </AppText>
        {entry.note ? (
          <AppText color="textSecondary" numberOfLines={2} role="metadata">
            {entry.note}
          </AppText>
        ) : null}
      </View>
      <AppIcon name="chevron-right" color={theme.colors.textSecondary} size="small" />
    </Pressable>
  );
}

function PosterStrip({
  posterUrls,
  compact = false,
}: {
  readonly posterUrls: readonly (string | null)[];
  readonly compact?: boolean;
}) {
  const visible = posterUrls.slice(0, compact ? 3 : 4);
  return (
    <View style={[styles.posterStrip, compact ? styles.posterStripCompact : null]}>
      {visible.length > 0
        ? visible.map((posterUrl, index) => (
            <PosterImage
              key={`${posterUrl ?? "missing"}-${index}`}
              style={index > 0 ? styles.posterOverlap : null}
              uri={posterUrl}
            />
          ))
        : <PosterImage uri={null} />}
    </View>
  );
}

function PosterImage({
  uri,
  small = false,
  style,
}: {
  readonly uri: string | null;
  readonly small?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useMobileUI();
  return (
    <View style={[
      small ? styles.posterSmall : styles.poster,
      { backgroundColor: theme.colors.surfaceSunken, borderColor: theme.colors.border },
      style,
    ]}>
      {uri ? (
        <Image source={{ uri }} style={styles.posterImage} />
      ) : (
        <AppIcon name="film" color={theme.colors.textSecondary} size={small ? "small" : "medium"} />
      )}
    </View>
  );
}

function MetaPill({
  icon,
  label,
}: {
  readonly icon: "film" | "folder" | "heart" | "star";
  readonly label: string;
}) {
  const { theme } = useMobileUI();
  return (
    <View style={[styles.metaPill, { backgroundColor: theme.colors.surfaceSunken }]}>
      <AppIcon name={icon} color={theme.colors.textSecondary} size="small" />
      <AppText color="textSecondary" numberOfLines={1} role="metadata">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.screenHorizontal,
  },
  toolbar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarRow: {
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
  },
  toolbarDivider: {
    height: 28,
    width: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
  },
  empty: {
    paddingVertical: spacing.xxl,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    gap: spacing.md,
  },
  cardCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  ownerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
  },
  posterStrip: {
    flexDirection: "row",
    width: 88,
  },
  posterStripCompact: {
    width: 70,
  },
  poster: {
    alignItems: "center",
    aspectRatio: 2 / 3,
    borderRadius: radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    overflow: "hidden",
    width: 44,
  },
  posterOverlap: {
    marginLeft: -18,
  },
  posterSmall: {
    alignItems: "center",
    aspectRatio: 2 / 3,
    borderRadius: radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    overflow: "hidden",
    width: 44,
  },
  posterImage: {
    height: "100%",
    width: "100%",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  metaPill: {
    alignItems: "center",
    borderRadius: radius.pill,
    flexDirection: "row",
    gap: spacing.xxs,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
  },
  tags: {
    marginTop: spacing.sm,
  },
  watchlistHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  watchlistHeaderCopy: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
  entryRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 88,
    paddingVertical: spacing.sm,
  },
  entryCopy: {
    flex: 1,
    gap: spacing.xxs,
    minWidth: 0,
  },
});

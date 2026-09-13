import { isApiClientError } from "@35mm/api-client";
import {
  ActionSheet,
  AppIcon,
  AppText,
  Button,
  ConfirmationDialog,
  IconButton,
  LoadingState,
  PaginationFooter,
  StateSurface,
  TextField,
  useMobileUI,
  type ActionSheetSection,
} from "@35mm/mobile-ui";
import type { FeedPost } from "@35mm/types";
import { FlashList } from "@shopify/flash-list";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { PostCard } from "@/features/feed/PostCard";
import { useApiClient } from "@/services/api";
import {
  assignBookmarkFolder,
  createBookmarkFolder,
  deleteBookmarkFolder,
  fetchBookmarkFolders,
  fetchBookmarksPage,
  removeBookmark,
  renameBookmarkFolder,
} from "./api";
import type { BookmarkFolder, BookmarkPage } from "./contracts";
import { bookmarkKeys, type BookmarkFilterId } from "./queryKeys";

type BookmarkFilter = {
  readonly id: BookmarkFilterId;
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly icon: "bookmark" | "folder";
};

type EditorState =
  | { readonly mode: "create" }
  | { readonly mode: "rename"; readonly folder: BookmarkFolder }
  | null;

type InfiniteBookmarks = InfiniteData<BookmarkPage, string | null>;

const EMPTY_FOLDERS: readonly BookmarkFolder[] = [];

function normalizeFolderName(value: string): string {
  return value.trim().slice(0, 80);
}

function uniquePosts(pages: readonly BookmarkPage[]): FeedPost[] {
  const seen = new Set<string>();
  return pages.flatMap((page) => page.items.filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  }));
}

function searchableText(post: FeedPost): string {
  return [
    post.headline,
    post.body,
    post.author.displayName,
    post.author.username,
    post.film?.title,
  ].filter(Boolean).join(" ").toLowerCase();
}

function patchPost(
  data: InfiniteBookmarks | undefined,
  postId: string,
  patch: (post: FeedPost) => FeedPost | null,
): InfiniteBookmarks | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.flatMap((post) => {
        if (post.id !== postId) return [post];
        const next = patch(post);
        return next ? [next] : [];
      }),
    })),
  };
}

export function BookmarksScreen({
  currentUserId,
}: {
  readonly currentUserId: string;
}) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { theme } = useMobileUI();
  const [selectedFolderId, setSelectedFolderId] = useState<BookmarkFilterId>(undefined);
  const [editor, setEditor] = useState<EditorState>(null);
  const [folderName, setFolderName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [moveTarget, setMoveTarget] = useState<FeedPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookmarkFolder | null>(null);

  const foldersQuery = useQuery({
    queryKey: bookmarkKeys.folders(),
    queryFn: ({ signal }) => fetchBookmarkFolders(client, signal),
    staleTime: 60_000,
  });
  const bookmarksQuery = useInfiniteQuery({
    queryKey: bookmarkKeys.list(selectedFolderId),
    queryFn: ({ pageParam, signal }) =>
      fetchBookmarksPage(client, { cursor: pageParam, folderId: selectedFolderId, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
  });

  const folders = foldersQuery.data?.folders ?? EMPTY_FOLDERS;
  const unsortedCount = foldersQuery.data?.unsortedCount ?? 0;
  const allCount = useMemo(
    () => folders.reduce((sum, folder) => sum + folder.itemCount, unsortedCount),
    [folders, unsortedCount],
  );
  const filters = useMemo<BookmarkFilter[]>(
    () => [
      { id: undefined, key: "all", label: "All", count: allCount, icon: "bookmark" },
      { id: null, key: "unsorted", label: "Unsorted", count: unsortedCount, icon: "folder" },
      ...folders.map((folder) => ({
        id: folder.id,
        key: folder.id,
        label: folder.name,
        count: folder.itemCount,
        icon: "folder" as const,
      })),
    ],
    [allCount, folders, unsortedCount],
  );
  const selectedFolder = typeof selectedFolderId === "string"
    ? folders.find((folder) => folder.id === selectedFolderId) ?? null
    : null;
  const selectedFilter = filters.find((filter) => filter.id === selectedFolderId) ?? filters[0];
  const posts = useMemo(() => uniquePosts(bookmarksQuery.data?.pages ?? []), [bookmarksQuery.data?.pages]);
  const normalizedSearch = searchText.trim().toLowerCase();
  const visiblePosts = useMemo(
    () => normalizedSearch
      ? posts.filter((post) => searchableText(post).includes(normalizedSearch))
      : posts,
    [normalizedSearch, posts],
  );

  const folderMutation = useMutation({
    mutationFn: async () => {
      const name = normalizeFolderName(folderName);
      if (!name) throw new Error("Folder name is required.");
      if (editor?.mode === "rename") return renameBookmarkFolder(client, editor.folder.id, name);
      return createBookmarkFolder(client, name);
    },
    onSuccess: (folder) => {
      setEditor(null);
      setFolderName("");
      setSelectedFolderId(folder.id);
      void queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (folderId: string) => deleteBookmarkFolder(client, folderId),
    onSuccess: () => {
      setDeleteTarget(null);
      setSelectedFolderId(undefined);
      void queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ postId, folderId }: { readonly postId: string; readonly folderId: string | null }) =>
      assignBookmarkFolder(client, postId, folderId),
    onMutate: async ({ postId, folderId }) => {
      await queryClient.cancelQueries({ queryKey: bookmarkKeys.lists() });
      const previous = queryClient.getQueriesData<InfiniteBookmarks>({ queryKey: bookmarkKeys.lists() });
      queryClient.setQueryData<InfiniteBookmarks>(bookmarkKeys.list(selectedFolderId), (current) =>
        patchPost(current, postId, (post) => {
          if (selectedFolderId === undefined) return { ...post, bookmarkFolderId: folderId };
          if (selectedFolderId === folderId) return { ...post, bookmarkFolderId: folderId };
          return null;
        }),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.previous ?? []) {
        queryClient.setQueryData(key, value);
      }
    },
    onSettled: () => {
      setMoveTarget(null);
      void queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (post: FeedPost) => removeBookmark(client, post.id),
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey: bookmarkKeys.lists() });
      const previous = queryClient.getQueriesData<InfiniteBookmarks>({ queryKey: bookmarkKeys.lists() });
      for (const [key] of previous) {
        queryClient.setQueryData<InfiniteBookmarks>(key, (current) =>
          patchPost(current, post.id, () => null),
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.previous ?? []) {
        queryClient.setQueryData(key, value);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    },
  });

  function openEditor(next: EditorState) {
    setEditor(next);
    setFolderName(next?.mode === "rename" ? next.folder.name : "");
  }

  if ((bookmarksQuery.isPending && posts.length === 0) || (foldersQuery.isPending && !foldersQuery.data)) {
    return (
      <View style={styles.centered} testID="bookmarks-loading">
        <LoadingState label="Loading bookmarks" />
      </View>
    );
  }

  if ((bookmarksQuery.error && posts.length === 0) || foldersQuery.error) {
    const error = bookmarksQuery.error ?? foldersQuery.error;
    const offline = isApiClientError(error) && ["network", "timeout"].includes(error.kind);
    return (
      <View style={styles.centered} testID="bookmarks-error">
        <StateSurface
          kind={offline ? "offline" : "error"}
          message={offline ? "Check your connection and retry." : "35mm couldn’t load bookmarks."}
          primaryAction={{ label: "Retry", onPress: () => {
            void foldersQuery.refetch();
            void bookmarksQuery.refetch();
          } }}
          title={offline ? "You’re offline" : "Bookmarks unavailable"}
        />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="bookmarks-screen">
      <View style={[styles.toolbar, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <AppText accessibilityRole="header" role="sectionTitle">Bookmarks</AppText>
            <AppText color="textSecondary" role="metadata">
              {selectedFilter?.count ?? posts.length} saved
            </AppText>
          </View>
          <Button
            icon="plus"
            label="Folder"
            onPress={() => openEditor({ mode: "create" })}
            size="compact"
            variant="secondary"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          accessibilityRole="tablist"
        >
          {filters.map((filter) => (
            <FolderChip
              filter={filter}
              key={filter.key}
              selected={filter.id === selectedFolderId}
              onPress={() => setSelectedFolderId(filter.id)}
            />
          ))}
        </ScrollView>
        <View style={styles.searchRow}>
          <TextField
            accessibilityLabel="Search loaded bookmarks"
            containerStyle={styles.searchField}
            label="Search loaded"
            leadingIcon="search"
            onChangeText={setSearchText}
            placeholder="Search loaded posts"
            returnKeyType="search"
            value={searchText}
          />
          {selectedFolder ? (
            <IconButton
              icon="more"
              label="Folder actions"
              onPress={() => openEditor({ mode: "rename", folder: selectedFolder })}
            />
          ) : null}
          {selectedFolder ? (
            <IconButton
              destructive
              icon="trash"
              label="Delete selected folder"
              onPress={() => setDeleteTarget(selectedFolder)}
            />
          ) : null}
        </View>
        {folderMutation.error || deleteMutation.error || moveMutation.error || removeMutation.error ? (
          <AppText accessibilityLiveRegion="polite" color="destructive" role="metadata">
            Bookmark action failed. Your saved posts were restored.
          </AppText>
        ) : null}
      </View>

      {editor ? (
        <FolderEditor
          editor={editor}
          error={folderMutation.error}
          folderName={folderName}
          loading={folderMutation.isPending}
          onChangeName={setFolderName}
          onClose={() => setEditor(null)}
          onSubmit={() => folderMutation.mutate()}
        />
      ) : null}

      <FlashList
        data={visiblePosts}
        drawDistance={700}
        keyExtractor={(post) => post.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <StateSurface
              kind="empty"
              message={normalizedSearch
                ? "Search only checks posts already loaded on this device."
                : allCount === 0
                  ? "Use the bookmark action on posts to save them here."
                  : "Saved posts in this folder will appear here."}
              title={normalizedSearch ? "No loaded match" : allCount === 0 ? "Nothing saved yet" : "No posts here"}
              {...(normalizedSearch && bookmarksQuery.hasNextPage
                ? { primaryAction: { label: "Search next page", onPress: () => void bookmarksQuery.fetchNextPage() } }
                : {})}
            />
          </View>
        }
        ListFooterComponent={
          <PaginationFooter
            state={bookmarksQuery.isFetchingNextPage
              ? "loading"
              : bookmarksQuery.isFetchNextPageError
                ? "error"
                : bookmarksQuery.hasNextPage
                  ? "idle"
                  : "complete"}
            retry={() => void bookmarksQuery.fetchNextPage()}
          />
        }
        onEndReached={() => {
          if (bookmarksQuery.hasNextPage && !bookmarksQuery.isFetchingNextPage) {
            void bookmarksQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={(bookmarksQuery.isRefetching || foldersQuery.isRefetching) && !bookmarksQuery.isFetchingNextPage}
            onRefresh={() => {
              void foldersQuery.refetch();
              void bookmarksQuery.refetch();
            }}
            tintColor={theme.colors.accent}
          />
        }
        renderItem={({ item }) => (
          <View>
            <View style={[styles.rowActions, { borderBottomColor: theme.colors.border }]}>
              <Button
                icon="folder"
                label={item.bookmarkFolderId
                  ? folders.find((folder) => folder.id === item.bookmarkFolderId)?.name ?? "Move"
                  : "Move"}
                onPress={() => setMoveTarget(item)}
                size="compact"
                variant="ghost"
              />
              <Button
                label="Remove"
                loading={removeMutation.isPending}
                onPress={() => removeMutation.mutate(item)}
                size="compact"
                variant="danger"
              />
            </View>
            <PostCard
              active
              autoplay={false}
              bookmarkError={Boolean(removeMutation.error)}
              bookmarkPending={removeMutation.isPending}
              currentUserId={currentUserId}
              onBookmarkPress={() => removeMutation.mutate(item)}
              onOpenPost={() => router.push({ pathname: "/post/[postId]", params: { postId: item.id } })}
              post={item}
              startWithSound={false}
            />
          </View>
        )}
        testID="bookmarks-list"
      />
      <MoveSheet
        folders={folders}
        loading={moveMutation.isPending}
        onClose={() => setMoveTarget(null)}
        onMove={(folderId) => {
          if (moveTarget) moveMutation.mutate({ postId: moveTarget.id, folderId });
        }}
        post={moveTarget}
      />
      <ConfirmationDialog
        confirmLabel="Delete folder"
        destructive
        loading={deleteMutation.isPending}
        message="Saved posts move back to Unsorted. This cannot be undone."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : "Delete folder?"}
        visible={deleteTarget !== null}
      />
    </View>
  );
}

function FolderChip({
  filter,
  selected,
  onPress,
}: {
  readonly filter: BookmarkFilter;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  const { theme } = useMobileUI();
  return (
    <Pressable
      accessibilityLabel={`${filter.label}, ${filter.count} saved`}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.folderChip,
        {
          backgroundColor: selected
            ? theme.colors.accent
            : pressed
              ? theme.colors.surfacePressed
              : theme.colors.surfaceSunken,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
        },
      ]}
    >
      <AppIcon
        name={filter.icon}
        color={selected ? theme.colors.onAccent : theme.colors.textSecondary}
        size="extraSmall"
        filled={selected && filter.icon === "bookmark"}
      />
      <AppText
        numberOfLines={1}
        role="metadata"
        style={{ color: selected ? theme.colors.onAccent : theme.colors.text }}
      >
        {filter.label}
      </AppText>
      <AppText
        role="counter"
        style={{ color: selected ? theme.colors.onAccent : theme.colors.textSecondary }}
      >
        {filter.count}
      </AppText>
    </Pressable>
  );
}

function FolderEditor({
  editor,
  error,
  folderName,
  loading,
  onChangeName,
  onClose,
  onSubmit,
}: {
  readonly editor: EditorState;
  readonly error: Error | null;
  readonly folderName: string;
  readonly loading: boolean;
  readonly onChangeName: (value: string) => void;
  readonly onClose: () => void;
  readonly onSubmit: () => void;
}) {
  if (!editor) return null;
  const name = normalizeFolderName(folderName);
  return (
    <View
      accessibilityLabel="Bookmark folder editor"
      accessibilityViewIsModal={false}
      style={styles.editor}
      testID="bookmark-folder-editor"
    >
      <View style={styles.editorHeader}>
        <AppText role="sectionTitle">
          {editor.mode === "rename" ? "Rename folder" : "New folder"}
        </AppText>
        <IconButton icon="close" label="Close folder editor" onPress={onClose} />
      </View>
      <TextField
        accessibilityLabel="Folder name"
        label="Folder name"
        maxLength={80}
        onChangeText={onChangeName}
        placeholder="Favorites, essays, watch later"
        returnKeyType="done"
        value={folderName}
        {...(error ? { errorMessage: "Could not save folder." } : {})}
      />
      <View style={styles.editorActions}>
        <Button label="Cancel" onPress={onClose} size="compact" variant="secondary" />
        <Button
          disabled={!name}
          label={editor.mode === "rename" ? "Save" : "Create"}
          loading={loading}
          onPress={onSubmit}
          size="compact"
        />
      </View>
    </View>
  );
}

function MoveSheet({
  folders,
  loading,
  onClose,
  onMove,
  post,
}: {
  readonly folders: readonly BookmarkFolder[];
  readonly loading: boolean;
  readonly onClose: () => void;
  readonly onMove: (folderId: string | null) => void;
  readonly post: FeedPost | null;
}) {
  const sections = useMemo<readonly ActionSheetSection[]>(() => [{
    id: "bookmark-move",
    title: "Move bookmark",
    actions: [
      {
        id: "unsorted",
        label: "Unsorted",
        description: "Keep this post outside folders",
        icon: "bookmark",
        disabled: loading,
        onPress: () => onMove(null),
      },
      ...folders.map((folder) => ({
        id: folder.id,
        label: folder.name,
        description: `${folder.itemCount} saved`,
        icon: "folder" as const,
        disabled: loading,
        onPress: () => onMove(folder.id),
      })),
    ],
  }], [folders, loading, onMove]);
  return (
    <ActionSheet
      accessibilityLabel="Move bookmark"
      onRequestClose={onClose}
      sections={sections}
      visible={post !== null}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
  },
  editor: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  editorActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  editorHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  empty: {
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  filters: {
    gap: 8,
    paddingRight: 16,
  },
  folderChip: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    maxWidth: 190,
    paddingHorizontal: 10,
  },
  root: {
    flex: 1,
  },
  rowActions: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  searchField: {
    flex: 1,
  },
  searchRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
  },
  titleCopy: {
    flex: 1,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  toolbar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
    padding: 16,
  },
});

"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bookmark, Check, ChevronDown, Folder, Inbox, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { Dialog } from "@/components/Dialog/Dialog";
import { EmptyState } from "@/components/EmptyState";
import { useFlashToast } from "@/components/FlashToast";
import { PostCard } from "@/features/feed/components/PostCard";
import { ApiRequestError } from "@/features/feed/api/http";
import { useConnectionPreferences } from "@/features/feed/hooks/useConnectionPreferences";
import { resolvePostImageUrls } from "@/features/feed/utils/postMedia";
import { cn } from "@/lib/utils/cn";
import { BROWSE_CHROME_VARIANT, BROWSE_DENSITY_VARIANT } from "@/lib/config/uiFlags";
import { useBookmarks } from "../hooks/useBookmarks";
import { useBookmarkFolders } from "../hooks/useBookmarkFolders";
import {
  useCreateBookmarkFolder,
  useDeleteBookmarkFolder,
  useRenameBookmarkFolder,
} from "../hooks/useBookmarkFolderMutations";
import type { Post } from "@/features/feed/types/feed";
import type { BookmarkFolderWithCount } from "../types";

type SelectedFolderId = string | null | undefined;

type FolderOption = {
  id: SelectedFolderId;
  label: string;
  count: number;
  kind: "all" | "unsorted" | "folder";
};

function postToVariant(post: Post): "text" | "film-log" | "image" | "discussion" {
  if (post.type === "discussion") return "discussion";
  if (post.type === "log" || post.type === "review") return "film-log";
  if (post.type === "image") return "image";
  return "text";
}

function formatPostTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "now";
  const diff = Date.now() - then;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function selectedFolderTitle(
  selectedFolderId: SelectedFolderId,
  folders: BookmarkFolderWithCount[]
): string {
  if (selectedFolderId === undefined) return "All Bookmarks";
  if (selectedFolderId === null) return "Unsorted";
  return folders.find((folder) => folder.id === selectedFolderId)?.name ?? "Folder";
}

export function BookmarksPageContent() {
  const [selectedFolderId, setSelectedFolderId] = useState<SelectedFolderId>(undefined);
  const [bookmarkSearch, setBookmarkSearch] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [renameFolderModalOpen, setRenameFolderModalOpen] = useState(false);
  const [deleteFolderConfirmOpen, setDeleteFolderConfirmOpen] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const query = useBookmarks(selectedFolderId);
  const foldersQuery = useBookmarkFolders();
  const createFolderMutation = useCreateBookmarkFolder();
  const renameFolderMutation = useRenameBookmarkFolder();
  const deleteFolderMutation = useDeleteBookmarkFolder();
  const connection = useConnectionPreferences();
  const { show: showFlashToast } = useFlashToast();
  const posts = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data]
  );
  const folders = foldersQuery.data?.folders ?? [];
  const unsortedCount = foldersQuery.data?.unsortedCount ?? 0;
  const imageVariant: "feed" | "thumb" = connection.slow || connection.saveData ? "thumb" : "feed";
  const allCount = useMemo(
    () => folders.reduce((sum, folder) => sum + folder.itemCount, unsortedCount),
    [folders, unsortedCount]
  );
  const folderOptions = useMemo<FolderOption[]>(
    () => [
      { id: undefined, label: "All Bookmarks", count: allCount, kind: "all" },
      { id: null, label: "Unsorted", count: unsortedCount, kind: "unsorted" },
      ...folders.map((folder) => ({
        id: folder.id,
        label: folder.name,
        count: folder.itemCount,
        kind: "folder" as const,
      })),
    ],
    [allCount, folders, unsortedCount]
  );
  const selectedTitle = selectedFolderTitle(selectedFolderId, folders);
  const selectedCount =
    folderOptions.find((option) => option.id === selectedFolderId)?.count ?? posts.length;
  const selectedFolder = typeof selectedFolderId === "string"
    ? folders.find((folder) => folder.id === selectedFolderId) ?? null
    : null;
  const useFocusedBookmarksLayout =
    BROWSE_CHROME_VARIANT === "focused" && BROWSE_DENSITY_VARIANT === "compact";
  const normalizedSearch = bookmarkSearch.trim().toLocaleLowerCase();
  const visiblePosts = useMemo(
    function () {
      if (!useFocusedBookmarksLayout || normalizedSearch.length === 0) return posts;
      return posts.filter(function (post) {
        return [
          post.headline,
          post.body,
          post.author.displayName,
          post.author.username,
          post.film?.title,
        ].some(function (value) {
          return value?.toLocaleLowerCase().includes(normalizedSearch);
        });
      });
    },
    [normalizedSearch, posts, useFocusedBookmarksLayout]
  );

  function errorMessage(error: unknown, fallback: string): string {
    return error instanceof ApiRequestError ? error.message : fallback;
  }

  function createFolder(e: FormEvent) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name || createFolderMutation.isPending) return;
    createFolderMutation.mutate(name, {
      onSuccess: function (folder) {
        setNewFolderName("");
        setCreateFolderModalOpen(false);
        setSelectedFolderId(folder.id);
        showFlashToast("Folder created");
      },
      onError: function (error) {
        showFlashToast(errorMessage(error, "Could not create folder"), "error");
      },
    });
  }

  function beginRename(folder: BookmarkFolderWithCount) {
    setRenamingFolderId(folder.id);
    setRenameValue(folder.name);
  }

  function renameFolder(e: FormEvent) {
    e.preventDefault();
    const folderId = renamingFolderId;
    const name = renameValue.trim();
    if (!folderId || !name || renameFolderMutation.isPending) return;
    renameFolderMutation.mutate(
      { folderId, name },
      {
        onSuccess: function () {
          setRenameFolderModalOpen(false);
          setRenamingFolderId(null);
          setRenameValue("");
          showFlashToast("Folder renamed");
        },
        onError: function (error) {
          showFlashToast(errorMessage(error, "Could not rename folder"), "error");
        },
      }
    );
  }

  function deleteSelectedFolder() {
    if (!selectedFolder || deleteFolderMutation.isPending) return;
    deleteFolderMutation.mutate(selectedFolder.id, {
      onSuccess: function () {
        setDeleteFolderConfirmOpen(false);
        setSelectedFolderId(undefined);
        setRenamingFolderId(null);
        showFlashToast("Folder deleted");
      },
      onError: function (error) {
        showFlashToast(errorMessage(error, "Could not delete folder"), "error");
      },
    });
  }

  if (query.status === "pending" && foldersQuery.status === "pending") {
    return <BookmarksPageSkeleton />;
  }

  if (query.isError || foldersQuery.isError) {
    return (
      <div className="px-4 py-12 text-sm text-fg-muted">
        Failed to load bookmarks.
      </div>
    );
  }

  const selectedFolderToolbar = (
    <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-fg">{selectedTitle}</h2>
        <p className="mt-0.5 text-xs text-fg-muted">{selectedCount} posts</p>
      </div>
      {selectedFolder ? (
        <div className="flex flex-wrap items-center gap-2">
          {renamingFolderId === selectedFolder.id ? (
            <form onSubmit={renameFolder} className="flex gap-2">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={80}
                className="h-9 min-w-0 rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none focus:border-accent"
                autoFocus
              />
              <button
                type="submit"
                disabled={!renameValue.trim() || renameFolderMutation.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-fg px-3 text-xs font-semibold text-bg disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2} />
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenamingFolderId(null);
                  setRenameValue("");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-fg-muted hover:bg-hover hover:text-fg"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
                Cancel
              </button>
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={() => beginRename(selectedFolder)}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-fg-muted hover:bg-hover hover:text-fg"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                Rename
              </button>
              <button
                type="button"
                onClick={deleteSelectedFolder}
                disabled={deleteFolderMutation.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-fg-muted hover:bg-hover hover:text-fg disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                Delete
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );

  const classicFolderRail = (
    <>
      <div className="mb-3 flex items-end justify-between">
        <div className="shrink-0">
          <h1 className="font-display-discover text-[28px] leading-tight text-fg">Bookmarks</h1>
          <p className="mt-1 text-sm text-fg-muted">{allCount} saved</p>
        </div>
      </div>
      <nav
        aria-label="Bookmark folders"
        className="flex gap-2 overflow-x-auto pb-1 xl:block xl:space-y-1 xl:overflow-visible xl:pb-0"
      >
        {folderOptions.map((option) => (
          <FolderButton
            key={option.id === undefined ? "all" : option.id ?? "unsorted"}
            option={option}
            selected={option.id === selectedFolderId}
            onSelect={() => setSelectedFolderId(option.id)}
          />
        ))}
      </nav>
      <form onSubmit={createFolder} className="mt-3 flex gap-2">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="New folder"
          maxLength={80}
          className="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!newFolderName.trim() || createFolderMutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-fg px-3 py-2 text-xs font-semibold text-bg disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Create
        </button>
      </form>
    </>
  );

  const focusedHeader = (
    <>
      <div className="flex min-w-0 items-center justify-between gap-4">
        <DropdownMenu.Root modal={false}>
          <h1 className="min-w-0 font-sans text-[28px] font-bold leading-tight tracking-tight text-fg">
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="group flex min-w-0 items-center gap-2 text-left outline-none transition-opacity hover:opacity-70 focus-visible:opacity-70"
              >
                <span className="truncate">{selectedTitle}</span>
                <ChevronDown
                  className="h-5 w-5 shrink-0 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                  strokeWidth={1.8}
                  aria-hidden
                />
              </button>
            </DropdownMenu.Trigger>
          </h1>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={8}
              collisionPadding={12}
              aria-label="Bookmark folders"
              className="z-50 max-h-[min(420px,var(--radix-dropdown-menu-content-available-height))] min-w-[240px] overflow-y-auto rounded-md border border-border-strong bg-elevated py-1.5 shadow-[0_16px_34px_rgba(0,0,0,0.18)]"
            >
              <DropdownMenu.RadioGroup
                value={selectedFolderId === undefined ? "all" : selectedFolderId === null ? "unsorted" : `folder:${selectedFolderId}`}
                onValueChange={function (value) {
                  if (value === "all") setSelectedFolderId(undefined);
                  else if (value === "unsorted") setSelectedFolderId(null);
                  else setSelectedFolderId(value.slice("folder:".length));
                }}
              >
                {folderOptions.map(function (option) {
                  const Icon = option.kind === "unsorted" ? Inbox : option.kind === "all" ? Bookmark : Folder;
                  const value = option.id === undefined ? "all" : option.id === null ? "unsorted" : `folder:${option.id}`;
                  return (
                    <DropdownMenu.RadioItem
                      key={value}
                      value={value}
                      className="relative flex min-h-10 cursor-default select-none items-center gap-2.5 px-3 py-1.5 text-sm text-fg outline-none transition-colors focus:bg-hover"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-fg-muted" strokeWidth={1.8} aria-hidden />
                      <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                      <span className="font-mono text-[11px] text-fg-muted">{option.count}</span>
                      <DropdownMenu.ItemIndicator className="flex h-4 w-4 items-center justify-center text-accent">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
                      </DropdownMenu.ItemIndicator>
                    </DropdownMenu.RadioItem>
                  );
                })}
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={function () {
              setNewFolderName("");
              setCreateFolderModalOpen(true);
            }}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-elevated px-3 text-xs font-semibold text-fg transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            New folder
          </button>
          {selectedFolder ? (
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Folder actions"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-elevated text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                >
                  <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  collisionPadding={12}
                  className="z-50 min-w-[160px] rounded-md border border-border-strong bg-elevated py-1.5 shadow-[0_16px_34px_rgba(0,0,0,0.18)]"
                >
                  <DropdownMenu.Item
                    onSelect={function () {
                      beginRename(selectedFolder);
                      setRenameFolderModalOpen(true);
                    }}
                    className="flex min-h-9 cursor-default select-none items-center gap-2.5 px-3 text-sm font-medium text-fg outline-none transition-colors focus:bg-hover"
                  >
                    <Pencil className="h-4 w-4 text-fg-muted" strokeWidth={1.8} aria-hidden />
                    Rename
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={function () {
                      setDeleteFolderConfirmOpen(true);
                    }}
                    className="flex min-h-9 cursor-default select-none items-center gap-2.5 px-3 text-sm font-medium text-[#ba181b] outline-none transition-colors focus:bg-hover"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                    Delete
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : null}
        </div>
      </div>

      <form role="search" className="relative mt-4 w-full" onSubmit={(event) => event.preventDefault()}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden />
        <label htmlFor="bookmark-search" className="sr-only">Search loaded bookmarks</label>
        <input
          id="bookmark-search"
          type="search"
          value={bookmarkSearch}
          onChange={(event) => setBookmarkSearch(event.target.value)}
          placeholder="Search bookmarks"
          maxLength={100}
          className="h-10 w-full rounded-md border border-border bg-sunken pl-9 pr-9 text-sm text-fg outline-none placeholder:text-fg-muted focus:border-accent [&::-webkit-search-cancel-button]:appearance-none"
        />
        {bookmarkSearch ? (
          <button
            type="button"
            aria-label="Clear bookmark search"
            onClick={() => setBookmarkSearch("")}
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </form>

      <div className="mt-3 flex min-h-9 items-center border-b border-border pb-3">
        <p className="text-xs text-fg-muted">{selectedCount} posts</p>
      </div>
    </>
  );

  return (
    <div
      data-testid="bookmarks-page-layout"
      className={cn(
        "mx-auto grid w-full grid-cols-1 gap-6 px-4 py-4",
        useFocusedBookmarksLayout
          ? "max-w-[640px]"
          : "max-w-[960px] xl:grid-cols-[260px_minmax(0,640px)] xl:px-0"
      )}
    >
      {useFocusedBookmarksLayout ? (
        <header data-testid="bookmarks-page-header" className="min-w-0">
          {focusedHeader}
        </header>
      ) : (
        <aside className="xl:sticky xl:top-20 xl:self-start">
          {classicFolderRail}
        </aside>
      )}

      <section className="min-w-0">
        {!useFocusedBookmarksLayout ? (
          <div className="mb-3">{selectedFolderToolbar}</div>
        ) : null}

        {query.status === "pending" ? (
          <BookmarkPostsSkeleton />
        ) : visiblePosts.length === 0 ? (
          <>
            <EmptyState
              size="md"
              icon={<Bookmark className="h-6 w-6" strokeWidth={1.8} />}
              headline={
                normalizedSearch
                  ? "No matching bookmarks"
                  : allCount === 0
                    ? "Nothing saved yet"
                    : "No posts here"
              }
              subline={
                normalizedSearch
                  ? "Try another search or scan the next saved page."
                  : allCount === 0
                    ? "Use the bookmark action on posts to save them."
                    : "Saved posts in this folder will appear here."
              }
              className="max-w-none"
            />
            {normalizedSearch && query.hasNextPage ? (
              <SearchNextPageButton
                isFetching={query.isFetchingNextPage}
                onLoad={() => void query.fetchNextPage()}
              />
            ) : null}
          </>
        ) : (
          <>
            {visiblePosts.map((post, index) => (
              <BookmarkPostCard
                key={post.id}
                post={post}
                imageVariant={imageVariant}
                saveData={connection.saveData}
                animationDelay={(index + 1) * 35}
              />
            ))}
            {normalizedSearch ? (
              query.hasNextPage ? (
                <SearchNextPageButton
                  isFetching={query.isFetchingNextPage}
                  onLoad={() => void query.fetchNextPage()}
                />
              ) : null
            ) : (
              <InfiniteTrigger
                hasNextPage={Boolean(query.hasNextPage)}
                isFetching={query.isFetchingNextPage}
                onLoad={() => void query.fetchNextPage()}
              />
            )}
          </>
        )}
      </section>

      {useFocusedBookmarksLayout ? (
        <Dialog
          open={createFolderModalOpen}
          onClose={function () {
            if (!createFolderMutation.isPending) setCreateFolderModalOpen(false);
          }}
          title="New folder"
          description="Create a folder for organizing saved posts."
          className="max-w-md"
        >
          <form onSubmit={createFolder} className="space-y-5">
            <div>
              <label htmlFor="new-bookmark-folder-name" className="mb-2 block text-sm font-semibold text-fg">Folder name</label>
              <input
                id="new-bookmark-folder-name"
                type="text"
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="e.g. Weekend watches"
                maxLength={80}
                className="h-11 w-full rounded-md border border-border bg-sunken px-3 text-[16px] text-fg outline-none placeholder:text-fg-muted focus:border-accent sm:text-sm"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateFolderModalOpen(false)}
                disabled={createFolderMutation.isPending}
                className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-fg-muted hover:bg-hover hover:text-fg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newFolderName.trim() || createFolderMutation.isPending}
                className="h-10 rounded-md bg-fg px-4 text-sm font-semibold text-bg disabled:opacity-50"
              >
                {createFolderMutation.isPending ? "Creating..." : "Create folder"}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}
      {useFocusedBookmarksLayout ? (
        <Dialog
          open={renameFolderModalOpen}
          onClose={function () {
            if (renameFolderMutation.isPending) return;
            setRenameFolderModalOpen(false);
            setRenamingFolderId(null);
            setRenameValue("");
          }}
          title="Rename folder"
          className="max-w-md"
        >
          <form onSubmit={renameFolder} className="space-y-5">
            <div>
              <label htmlFor="rename-bookmark-folder" className="mb-2 block text-sm font-semibold text-fg">Folder name</label>
              <input
                id="rename-bookmark-folder"
                type="text"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                maxLength={80}
                className="h-11 w-full rounded-md border border-border bg-sunken px-3 text-[16px] text-fg outline-none placeholder:text-fg-muted focus:border-accent sm:text-sm"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={function () {
                  setRenameFolderModalOpen(false);
                  setRenamingFolderId(null);
                  setRenameValue("");
                }}
                disabled={renameFolderMutation.isPending}
                className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-fg-muted hover:bg-hover hover:text-fg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!renameValue.trim() || renameFolderMutation.isPending}
                className="h-10 rounded-md bg-fg px-4 text-sm font-semibold text-bg disabled:opacity-50"
              >
                {renameFolderMutation.isPending ? "Saving..." : "Save name"}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}
      {useFocusedBookmarksLayout && selectedFolder ? (
        <ConfirmDialog
          open={deleteFolderConfirmOpen}
          onClose={() => setDeleteFolderConfirmOpen(false)}
          onConfirm={deleteSelectedFolder}
          title={`Delete ${selectedFolder.name}?`}
          description="Posts in this folder will remain bookmarked and move to Unsorted."
          confirmLabel="Delete folder"
          variant="danger"
          swapButtonOrder
        />
      ) : null}
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-sunken-2", className)} aria-hidden />;
}

function BookmarksPageSkeleton() {
  const useFocusedBookmarksLayout =
    BROWSE_CHROME_VARIANT === "focused" && BROWSE_DENSITY_VARIANT === "compact";

  return (
    <div
      className={cn(
        "mx-auto grid w-full grid-cols-1 gap-6 px-4 py-4",
        useFocusedBookmarksLayout
          ? "max-w-[640px]"
          : "max-w-[960px] xl:grid-cols-[260px_minmax(0,640px)] xl:px-0"
      )}
    >
      <div
        className={cn(
          useFocusedBookmarksLayout && "min-w-0",
          !useFocusedBookmarksLayout && "xl:sticky xl:top-20 xl:self-start"
        )}
        aria-label="Loading bookmark folders"
      >
        {useFocusedBookmarksLayout ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <SkeletonBlock className="h-8 w-44" />
              <SkeletonBlock className="h-9 w-28" />
            </div>
            <SkeletonBlock className="mt-4 h-10 w-full" />
            <div className="mt-3 border-b border-border pb-3">
              <SkeletonBlock className="h-3 w-16" />
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <SkeletonBlock className="h-8 w-36" />
              <SkeletonBlock className="mt-2 h-4 w-20" />
            </div>
            <div className="flex gap-2 overflow-hidden xl:block xl:space-y-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={`bookmark-folder-skeleton-${index}`}
                  className="flex min-w-[168px] items-center gap-2 rounded-md px-3 py-2 xl:w-full xl:min-w-0"
                >
                  <SkeletonBlock className="h-4 w-4 shrink-0 rounded" />
                  <SkeletonBlock className="h-4 flex-1" />
                  <SkeletonBlock className="h-3 w-6" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <SkeletonBlock className="h-9 flex-1" />
              <SkeletonBlock className="h-9 w-20" />
            </div>
          </>
        )}
      </div>
      <section className="min-w-0" aria-label="Loading bookmarks">
        <div className="mb-3 border-b border-border pb-3">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="mt-2 h-3 w-16" />
        </div>
        <BookmarkPostsSkeleton />
      </section>
    </div>
  );
}

function BookmarkPostsSkeleton() {
  return (
    <div className="space-y-0" aria-label="Loading bookmark posts">
      {[0, 1, 2].map((index) => (
        <article
          key={`bookmark-post-skeleton-${index}`}
          className="border-b border-border px-1 py-5"
        >
          <div className="flex gap-3">
            <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-3 w-12" />
              </div>
              <SkeletonBlock className="mt-4 h-4 w-[86%]" />
              <SkeletonBlock className="mt-2 h-4 w-[64%]" />
              <SkeletonBlock className="mt-4 aspect-[16/9] w-full max-w-[420px] rounded-lg" />
              <div className="mt-4 flex gap-8">
                <SkeletonBlock className="h-4 w-12" />
                <SkeletonBlock className="h-4 w-12" />
                <SkeletonBlock className="h-4 w-12" />
                <SkeletonBlock className="h-4 w-12" />
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function FolderButton({
  option,
  selected,
  onSelect,
}: {
  option: FolderOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = option.kind === "unsorted" ? Inbox : option.kind === "all" ? Bookmark : Folder;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-w-[168px] items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors xl:w-full xl:min-w-0",
        selected
          ? "bg-hover text-fg"
          : "text-fg-muted hover:bg-hover hover:text-fg"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      <span className="shrink-0 font-mono text-[11px] text-fg-muted">{option.count}</span>
    </button>
  );
}

function SearchNextPageButton({
  isFetching,
  onLoad,
}: {
  isFetching: boolean;
  onLoad: () => void;
}) {
  return (
    <div className="flex justify-center py-4">
      <button
        type="button"
        onClick={onLoad}
        disabled={isFetching}
        className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-fg-muted hover:bg-hover hover:text-fg disabled:opacity-50"
      >
        {isFetching ? "Searching next page..." : "Search next 20 bookmarks"}
      </button>
    </div>
  );
}

function BookmarkPostCard({
  post,
  imageVariant,
  saveData,
  animationDelay,
}: {
  post: Post;
  imageVariant: "feed" | "thumb";
  saveData: boolean;
  animationDelay: number;
}) {
  const image = post.media.find((item) => item.type === "image");
  const filmCard = post.film
    ? {
        title: post.film.title,
        year: post.film.year ?? 0,
        genre: post.film.genres[0],
        posterUrl: post.film.posterUrl,
        rating: post.film.rating == null ? undefined : Math.round(post.film.rating * 2),
      }
    : undefined;

  return (
    <PostCard
      postId={post.id}
      variant={postToVariant(post)}
      sourcePostType={post.type}
      createdAt={post.createdAt}
      visibility={post.visibility}
      watchedOn={post.watchedOn}
      isRewatch={post.isRewatch}
      username={post.author.username}
      userId={post.author.id}
      handle={`@${post.author.username}`}
      displayName={post.author.displayName}
      timestamp={formatPostTime(post.createdAt)}
      avatarInitial={post.author.displayName.charAt(0).toUpperCase() || "U"}
      avatarUrl={post.author.avatarUrl}
      headline={post.headline}
      text={post.body}
      filmCard={filmCard}
      attachedFilm={post.film}
      mediaUrls={resolvePostImageUrls(post, imageVariant)}
      viewerMediaUrls={resolvePostImageUrls(post, "full")}
      saveData={saveData}
      linkPreview={post.linkPreview}
      imageSrc={image?.url}
      imageCaption={image?.altText}
      media={post.media}
      likeCount={post.likeCount}
      repostCount={post.repostCount}
      quoteCount={post.quoteCount}
      liked={post.isLiked}
      reposted={post.isReposted}
      repostContext={post.repostContext}
      quotedPost={post.quotedPost}
      quotedPostUnavailable={post.quotedPostUnavailable}
      bookmarked={post.isBookmarked}
      bookmarkFolderId={post.bookmarkFolderId}
      commentCount={post.commentCount}
      role={post.author.role}
      roleContext={post.author.roleContext}
      filmsLoggedCount={post.author.filmsLoggedCount}
      animationDelay={animationDelay}
    />
  );
}

function InfiniteTrigger({
  hasNextPage,
  isFetching,
  onLoad,
}: {
  hasNextPage: boolean;
  isFetching: boolean;
  onLoad: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      function ([entry]) {
        if (entry.isIntersecting && hasNextPage && !isFetching) {
          onLoad();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, onLoad]);

  return (
    <div ref={ref} className="h-8 flex items-center justify-center text-sm text-fg-muted">
      {isFetching ? "Loading more..." : null}
    </div>
  );
}

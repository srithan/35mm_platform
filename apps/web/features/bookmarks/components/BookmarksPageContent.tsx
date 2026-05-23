"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FolderInput, Plus, FolderOpen } from "lucide-react";
import { Button } from "@/components/Button/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { Dialog } from "@/components/Dialog/Dialog";
import { PortalDropdown } from "@/components/PortalDropdown/PortalDropdown";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import type { BookmarkFolderWithCount, BookmarkListItem } from "../types";
import {
  useBookmarkFoldersQuery,
  useBookmarkItemsQuery,
  useBookmarkSearchQuery,
  useCreateBookmarkFolderMutation,
  useDeleteBookmarkFolderMutation,
  useMoveBookmarkMutation,
  useRemoveBookmarkMutation,
  useRenameBookmarkFolderMutation,
} from "../hooks/useBookmarks";
import { bookmarkKeys } from "../hooks/queryKeys";

function formatSavedLabel(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const day = 86400000;
  if (diffMs < day) return "Saved today";
  if (diffMs < 2 * day) return "Saved yesterday";
  if (diffMs < 7 * day) return "Saved " + Math.floor(diffMs / day) + "d ago";
  return (
    "Saved " +
    d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    })
  );
}

function BookmarkRowSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-4 border-b border-border animate-pulse">
      <div className="w-10 h-10 rounded-full bg-skeleton flex-shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-3 w-40 rounded bg-skeleton" />
        <div className="h-3 w-full rounded bg-skeleton" />
        <div className="h-3 w-2/3 rounded bg-skeleton" />
      </div>
    </div>
  );
}

function BookmarkPostRow({
  item,
  folders,
}: {
  item: BookmarkListItem;
  folders: BookmarkFolderWithCount[];
}) {
  const router = useRouter();
  const moveMutation = useMoveBookmarkMutation();
  const removeMutation = useRemoveBookmarkMutation();
  const [removeOpen, setRemoveOpen] = useState(false);
  const post = item.post;
  const author = post.author;
  const href = ROUTES.POST(author.username, post.id);
  const preview = post.body.replace(/\s+/g, " ").trim().slice(0, 160);
  const moveTargets = folders.filter((f) => f.id !== item.bookmark.folderId);

  const goToPost = useCallback(() => {
    router.push(href);
  }, [href, router]);

  return (
    <>
      <div className="flex gap-3 px-4 py-4 border-b border-border hover:bg-hover/60 transition-colors group min-w-0">
        <button
          type="button"
          onClick={goToPost}
          className="flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/15"
          aria-label={"Open post by " + author.displayName}
        >
          {author.avatarUrl ? (
            <Image
              src={author.avatarUrl}
              alt=""
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center font-display text-sm text-fg-muted">
              {author.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={goToPost}
            className="text-left w-full bg-transparent border-none p-0 cursor-pointer font-inherit"
          >
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[13.5px] font-bold text-fg group-hover:underline underline-offset-2">
                {author.displayName}
              </span>
              <span className="text-[13px] text-fg-muted">@{author.username}</span>
            </div>
            <p className="text-[14px] text-fg-light leading-snug mt-1 line-clamp-2">{preview}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-sunken border border-border text-fg-muted">
                {item.folderName}
              </span>
              <span className="text-[11px] text-fg-faint">{formatSavedLabel(item.bookmark.savedAt)}</span>
              {item.bookmark.note ? (
                <span className="text-[11px] text-accent truncate max-w-[200px]">{item.bookmark.note}</span>
              ) : null}
            </div>
          </button>
        </div>
        <PortalDropdown
          align="end"
          menuLabel="Bookmark actions"
          items={[
            ...moveTargets.map((f) => ({
              id: "move-" + f.id,
              label: "Move to " + f.name,
              onSelect: () => {
                void moveMutation.mutateAsync({
                  bookmarkId: item.bookmark.id,
                  targetFolderId: f.id,
                });
              },
            })),
            {
              id: "remove",
              label: "Remove from bookmarks",
              danger: true,
              onSelect: () => setRemoveOpen(true),
            },
          ]}
          trigger={({ ref, toggle, onKeyDown, isOpen, menuId }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              onKeyDown={onKeyDown}
              aria-label="Bookmark options"
              aria-expanded={isOpen}
              aria-controls={isOpen ? menuId : undefined}
              className="flex-shrink-0 self-start p-2 rounded-full text-fg-muted hover:text-fg hover:bg-hover opacity-80 group-hover:opacity-100 transition-opacity"
            >
              <span className="sr-only">Options</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="6" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="12" cy="18" r="1.8" />
              </svg>
            </button>
          )}
        />
      </div>
      <ConfirmDialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onConfirm={() => {
          setRemoveOpen(false);
          void removeMutation.mutateAsync(item.bookmark.id);
        }}
        title="Remove bookmark?"
        description="This post will be removed from your bookmarks. You can save it again from the feed."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
      />
    </>
  );
}

type FolderRowModel = {
  id: string | null;
  name: string;
  itemCount: number;
};

function FolderRow({
  folder,
  totalAll,
  selectedId,
  onSelect,
  onRenamed,
}: {
  folder: FolderRowModel;
  totalAll: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRenamed: () => void;
}) {
  const renameMutation = useRenameBookmarkFolderMutation();
  const deleteMutation = useDeleteBookmarkFolderMutation();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isAll = folder.id == null;
  const count = isAll ? totalAll : folder.itemCount;
  const active = (isAll && selectedId == null) || folder.id === selectedId;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1 rounded-xl min-w-0",
          active ? "bg-[#f4e9e7] dark:bg-fg/[0.06]" : "hover:bg-hover"
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(folder.id)}
          className={cn(
            "flex-1 text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-none bg-transparent cursor-pointer font-inherit min-w-0"
          )}
        >
          {isAll ? (
            <FolderOpen className="w-[18px] h-[18px] text-accent flex-shrink-0" strokeWidth={2} />
          ) : (
            <FolderInput className="w-[18px] h-[18px] text-fg-muted flex-shrink-0" strokeWidth={2} />
          )}
          <span className="text-[14px] font-semibold text-fg truncate flex-1">{folder.name}</span>
          <span className="text-[11px] text-fg-muted tabular-nums flex-shrink-0">{count}</span>
        </button>
        {!isAll && folder.id ? (
          <PortalDropdown
            align="end"
            menuLabel="Folder actions"
            items={[
              {
                id: "rename",
                label: "Rename folder",
                onSelect: () => {
                  setRenameValue(folder.name);
                  setRenameOpen(true);
                },
              },
              {
                id: "delete",
                label: "Delete folder",
                danger: true,
                onSelect: () => setDeleteOpen(true),
              },
            ]}
            trigger={({ ref, toggle, onKeyDown, isOpen, menuId }) => (
              <button
                ref={ref}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle();
                }}
                onKeyDown={onKeyDown}
                aria-label={"Folder options: " + folder.name}
                aria-expanded={isOpen}
                aria-controls={isOpen ? menuId : undefined}
                className="p-2 mr-1 rounded-lg text-fg-muted hover:text-fg hover:bg-hover flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="6" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="18" r="1.5" />
                </svg>
              </button>
            )}
          />
        ) : null}
      </div>
      <Dialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename folder"
        description="Choose a name you will recognize in search."
        className="max-w-[min(100%,22rem)] sm:max-w-md"
        contentClassName="!p-0"
      >
        <form
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            if (!folder.id) return;
            const v = renameValue.trim();
            if (!v) return;
            void renameMutation.mutateAsync({ folderId: folder.id, name: v }).then(() => {
              setRenameOpen(false);
              onRenamed();
            });
          }}
        >
          <div className="px-5 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6">
            <label
              htmlFor={"bookmark-rename-folder-" + folder.id}
              className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted mb-2"
            >
              Folder name
            </label>
            <input
              id={"bookmark-rename-folder-" + folder.id}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className={cn(
                "w-full h-10 rounded-lg border border-border bg-bg px-3.5 text-[14px] text-fg",
                "placeholder:text-fg-muted outline-none transition-[border-color,box-shadow]",
                "focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/15"
              )}
              placeholder="Folder name"
              autoFocus
              autoComplete="off"
            />
          </div>
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 sm:px-6 border-t border-border bg-sunken/40">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!renameValue.trim() || renameMutation.isPending}
            >
              {renameMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Dialog>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (!folder.id) return;
          setDeleteOpen(false);
          void deleteMutation.mutateAsync(folder.id).then(() => {
            onSelect(null);
            onRenamed();
          });
        }}
        title="Delete folder?"
        description={
          "All bookmarks in “" +
          folder.name +
          "” will be removed. This cannot be undone in this demo."
        }
        confirmLabel="Delete folder"
        cancelLabel="Cancel"
        variant="danger"
      />
    </>
  );
}

export function BookmarksPageContent() {
  const queryClient = useQueryClient();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [bookmarkSearchQuery, setBookmarkSearchQuery] = useState("");
  const [bookmarkSearchBarKey, setBookmarkSearchBarKey] = useState(0);
  const searchActive = bookmarkSearchQuery.trim().length > 0;

  const onBookmarkSearch = useCallback(function (query: string) {
    setBookmarkSearchQuery(query);
  }, []);

  const clearBookmarkSearch = useCallback(function () {
    setBookmarkSearchQuery("");
    setBookmarkSearchBarKey(function (k) {
      return k + 1;
    });
  }, []);

  const foldersQuery = useBookmarkFoldersQuery();
  const itemsQuery = useBookmarkItemsQuery(selectedFolderId, {
    enabled: !searchActive,
  });
  const searchQuery = useBookmarkSearchQuery(bookmarkSearchQuery);

  const createMutation = useCreateBookmarkFolderMutation();
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const folders = foldersQuery.data ?? [];
  const totalCount = useMemo(
    () => folders.reduce((sum, f) => sum + f.itemCount, 0),
    [folders]
  );

  const listItems: BookmarkListItem[] = useMemo(() => {
    if (searchActive) {
      return searchQuery.data?.items ?? [];
    }
    if (itemsQuery.data) return itemsQuery.data;
    return [];
  }, [searchActive, searchQuery.data, itemsQuery.data]);

  const searchFolders = searchQuery.data?.folders ?? [];

  const invalidateUi = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
  }, [queryClient]);

  const folderRows: FolderRowModel[] = useMemo(
    () => [{ id: null, name: "All saved", itemCount: 0 }, ...folders],
    [folders]
  );

  const itemsLoading =
    searchActive
      ? searchQuery.isLoading || searchQuery.isFetching
      : itemsQuery.isLoading || itemsQuery.isFetching;

  const itemsError = searchActive ? searchQuery.isError : itemsQuery.isError;

  return (
    <div className="min-h-0 flex flex-col pb-8">
      <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-md border-b border-border">
        <div className="px-4 pt-4 pb-3">
          <h1 className="font-display text-[20px] md:text-[22px] font-semibold text-fg tracking-tight">
            Bookmarks
          </h1>
          <p className="text-[12px] text-fg-muted mt-0.5 max-w-lg leading-relaxed">
            Saved posts organized in folders. Search matches folder names and post text — same as when the API ships.
          </p>
          <SearchBar
            key={bookmarkSearchBarKey}
            placeholder="Search folders and saved posts…"
            onSearch={onBookmarkSearch}
            variant="inline"
            showDropdown={false}
            results={[]}
            className="mt-3 w-full"
          />
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <aside className="lg:w-[260px] lg:flex-shrink-0 lg:border-r border-border bg-bg">
          <div className="p-3 lg:p-4 space-y-1">
            <div className="flex items-center justify-between gap-2 px-1 pb-2 lg:pb-3">
              <span className="text-[11px] uppercase tracking-[0.12em] text-fg-muted font-semibold">Folders</span>
              <button
                type="button"
                onClick={() => {
                  setNewFolderName("");
                  setNewFolderOpen(true);
                }}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                New
              </button>
            </div>
            <div className="hidden lg:flex flex-col gap-0.5">
              {folderRows.map((f) => (
                <FolderRow
                  key={f.id ?? "all"}
                  folder={f}
                  totalAll={totalCount}
                  selectedId={selectedFolderId}
                  onSelect={setSelectedFolderId}
                  onRenamed={invalidateUi}
                />
              ))}
            </div>
            <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {folderRows.map((f) => {
                const isAll = f.id == null;
                const count = isAll ? totalCount : f.itemCount;
                const active = (isAll && selectedFolderId == null) || f.id === selectedFolderId;
                return (
                  <button
                    key={f.id ?? "all"}
                    type="button"
                    onClick={() => setSelectedFolderId(f.id)}
                    className={cn(
                      "flex-shrink-0 px-3 py-2 rounded-full text-[13px] font-semibold border transition-colors",
                      active
                        ? "border-accent bg-[#f4e9e7] dark:bg-fg/[0.08] text-fg"
                        : "border-border bg-elevated text-fg-muted hover:border-fg-muted/30"
                    )}
                  >
                    {f.name}
                    <span className="text-fg-muted font-normal ml-1">{count}</span>
                  </button>
                );
              })}
            </div>
            <details className="lg:hidden mt-2 group/details">
              <summary className="text-[11px] text-fg-muted cursor-pointer list-none flex items-center gap-1 px-1 py-1 [&::-webkit-details-marker]:hidden">
                <span className="underline-offset-2 group-open/details:underline">Manage folders</span>
                <span className="text-fg-faint">(rename, delete)</span>
              </summary>
              <div className="mt-2 space-y-0.5 pl-0.5">
                {folderRows.map((f) => (
                  <FolderRow
                    key={f.id ?? "all"}
                    folder={f}
                    totalAll={totalCount}
                    selectedId={selectedFolderId}
                    onSelect={setSelectedFolderId}
                    onRenamed={invalidateUi}
                  />
                ))}
              </div>
            </details>
          </div>
        </aside>

        <main className="flex-1 min-w-0 min-h-[50vh]">
          {searchActive ? (
            <div className="px-4 md:px-10 pt-4">
              <p className="text-[13px] text-fg-muted mb-4">
                Results for{" "}
                <span className="text-fg font-medium">&ldquo;{bookmarkSearchQuery.trim()}&rdquo;</span>
              </p>
              {searchQuery.isLoading ? (
                <div className="border border-border rounded-xl overflow-hidden bg-elevated">
                  <BookmarkRowSkeleton />
                  <BookmarkRowSkeleton />
                  <BookmarkRowSkeleton />
                </div>
              ) : searchQuery.isError ? (
                <div className="rounded-xl border border-accent/25 bg-elevated p-6 text-sm text-accent">
                  Search failed.{" "}
                  <button
                    type="button"
                    className="underline font-medium"
                    onClick={() => void searchQuery.refetch()}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {searchFolders.length > 0 ? (
                    <section className="mb-8">
                      <h2 className="text-[11px] uppercase tracking-[0.12em] text-fg-muted font-semibold mb-2">
                        Folders
                      </h2>
                      <ul className="rounded-xl border border-border bg-elevated divide-y divide-border overflow-hidden">
                        {searchFolders.map((f) => (
                          <li key={f.id}>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-hover transition-colors"
                              onClick={() => {
                                clearBookmarkSearch();
                                setSelectedFolderId(f.id);
                              }}
                            >
                              <FolderInput className="w-4 h-4 text-fg-muted flex-shrink-0" strokeWidth={2} />
                              <span className="font-medium text-fg">{f.name}</span>
                              <span className="text-xs text-fg-muted ml-auto">Open folder</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  <section>
                    <h2 className="text-[11px] uppercase tracking-[0.12em] text-fg-muted font-semibold mb-2">
                      Posts
                    </h2>
                    {listItems.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-elevated px-6 py-12 text-center">
                        <p className="text-sm text-fg-muted">No saved posts match that search.</p>
                        <p className="text-xs text-fg-faint mt-2">Try another keyword or clear search.</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border bg-elevated overflow-hidden">
                        {listItems.map((item) => (
                          <BookmarkPostRow key={item.bookmark.id} item={item} folders={folders} />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          ) : (
            <>
              {foldersQuery.isError ? (
                <div className="px-4 md:px-10 pt-8 text-sm text-accent">
                  Could not load folders.{" "}
                  <button type="button" className="underline" onClick={() => void foldersQuery.refetch()}>
                    Retry
                  </button>
                </div>
              ) : null}
              <div className="border-b border-border px-4 md:px-10 py-3 flex items-center justify-between gap-3 bg-bg">
                <p className="text-[13px] text-fg-muted truncate">
                  {selectedFolderId == null ? (
                    <>
                      Showing <span className="text-fg font-medium">all</span> bookmarks ({totalCount})
                    </>
                  ) : (
                    <>
                      Folder:{" "}
                      <span className="text-fg font-medium">
                        {folders.find((f) => f.id === selectedFolderId)?.name ?? "—"}
                      </span>
                    </>
                  )}
                </p>
                <Link
                  href={ROUTES.HOME}
                  className="text-[12px] font-semibold text-accent hover:opacity-90 flex-shrink-0 no-underline"
                >
                  Back to feed
                </Link>
              </div>
              {itemsError ? (
                <div className="px-4 md:px-10 pt-6 text-sm text-accent">
                  Could not load bookmarks.{" "}
                  <button type="button" className="underline" onClick={() => void itemsQuery.refetch()}>
                    Retry
                  </button>
                </div>
              ) : itemsLoading ? (
                <div className="border-t border-border">
                  <BookmarkRowSkeleton />
                  <BookmarkRowSkeleton />
                  <BookmarkRowSkeleton />
                </div>
              ) : listItems.length === 0 ? (
                <div className="mx-4 md:mx-10 mt-6 rounded-xl border border-dashed border-border bg-elevated px-6 py-14 text-center">
                  <FolderOpen className="w-10 h-10 text-fg-muted mx-auto mb-3 opacity-60" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-fg">
                    {selectedFolderId == null ? "No bookmarks yet" : "This folder is empty"}
                  </p>
                  <p className="text-xs text-fg-muted mt-2 max-w-sm mx-auto leading-relaxed">
                    When you save posts from the feed, they’ll show up here. This demo is pre-filled with sample saves.
                  </p>
                  <Link
                    href={ROUTES.HOME}
                    className="inline-flex mt-6 text-[12.5px] font-semibold px-4 py-1.5 h-8 rounded-full bg-transparent text-fg border border-border hover:border-fg-muted hover:bg-hover transition-colors no-underline items-center justify-center"
                  >
                    Browse feed
                  </Link>
                </div>
              ) : (
                <div>
                  {listItems.map((item) => (
                    <BookmarkPostRow key={item.bookmark.id} item={item} folders={folders} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <Dialog
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="New folder"
        description="Group saves by topic, shoot, or watchlist."
        className="max-w-[min(100%,22rem)] sm:max-w-md"
        contentClassName="!p-0"
      >
        <form
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            const v = newFolderName.trim();
            if (!v) return;
            void createMutation.mutateAsync(v).then((folder) => {
              setNewFolderOpen(false);
              setNewFolderName("");
              setSelectedFolderId(folder.id);
              invalidateUi();
            });
          }}
        >
          <div className="px-5 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6">
            <label
              htmlFor="bookmark-new-folder-name"
              className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted mb-2"
            >
              Folder name
            </label>
            <input
              id="bookmark-new-folder-name"
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className={cn(
                "w-full h-10 rounded-lg border border-border bg-bg px-3.5 text-[14px] text-fg",
                "placeholder:text-fg-muted outline-none transition-[border-color,box-shadow]",
                "focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/15"
              )}
              placeholder="e.g. Sundance 2026"
              autoFocus
              autoComplete="off"
            />
          </div>
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 sm:px-6 border-t border-border bg-sunken/40">
            <Button type="button" variant="ghost" size="sm" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!newFolderName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create folder"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

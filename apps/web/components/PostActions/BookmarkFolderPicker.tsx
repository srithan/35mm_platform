"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, FolderOpen, FolderPlus, Loader2 } from "lucide-react";
import { Dialog } from "@/components/Dialog/Dialog";
import { cn } from "@/lib/utils/cn";
import type { BookmarkFolderWithCount } from "@/features/bookmarks/types";

interface BookmarkFolderPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarked: boolean;
  folderId: string | null;
  folders: BookmarkFolderWithCount[];
  foldersLoading?: boolean;
  onSelectFolder: (folderId: string | null) => Promise<void> | void;
  onCreateFolder: (name: string) => Promise<void>;
  creatingFolder?: boolean;
}

export function BookmarkFolderPicker({
  open,
  onOpenChange,
  bookmarked,
  folderId,
  folders,
  foldersLoading = false,
  onSelectFolder,
  onCreateFolder,
  creatingFolder = false,
}: BookmarkFolderPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [pendingFolderId, setPendingFolderId] = useState<string | null | undefined>(undefined);
  const [creatingAndSaving, setCreatingAndSaving] = useState(false);
  const createPending = creatingFolder || creatingAndSaving;

  useEffect(
    function () {
      if (!open) {
        setNewFolderName("");
      }
    },
    [open]
  );

  function handleClose() {
    onOpenChange(false);
  }

  function handleSelect(targetFolderId: string | null) {
    if (pendingFolderId !== undefined) return;
    setPendingFolderId(targetFolderId);
    void Promise.resolve(onSelectFolder(targetFolderId))
      .then(function () {
        window.setTimeout(handleClose, 0);
      })
      .catch(function () {
        // The mutation owner owns the user-facing error toast.
      })
      .finally(function () {
        setPendingFolderId(undefined);
      });
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed || createPending) return;
    setCreatingAndSaving(true);
    void onCreateFolder(trimmed)
      .then(function () {
        setNewFolderName("");
        window.setTimeout(handleClose, 0);
      })
      .catch(function () {
        // The mutation owner owns the user-facing error toast.
      })
      .finally(function () {
        setCreatingAndSaving(false);
      });
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Save to folder"
      description={
        bookmarked
          ? "Move this post to a folder, or keep it in all bookmarks."
          : "Organize saved posts into folders, or save without one."
      }
      className="max-w-[420px]"
      contentClassName="p-0"
    >
      <div className="px-5 pb-2 sm:px-6">
        <button
          type="button"
          onClick={function () {
            handleSelect(null);
          }}
          disabled={pendingFolderId !== undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors",
            "hover:bg-hover active:bg-hover",
            bookmarked && !folderId && "bg-accent/8 ring-1 ring-accent/20"
          )}
        >
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              bookmarked && !folderId ? "bg-accent/12 text-accent" : "bg-sunken text-fg-muted"
            )}
          >
            <Bookmark className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium text-fg">All bookmarks</span>
            <span className="block text-[12px] text-fg-muted">Saved without a folder</span>
          </span>
          {pendingFolderId === null ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" strokeWidth={2} />
          ) : bookmarked && !folderId ? (
            <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
          ) : null}
        </button>
      </div>

      <div className="border-t border-border px-5 py-3 sm:px-6">
        <p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
          Your folders
        </p>

        <div className="max-h-[min(42vh,280px)] overflow-y-auto overscroll-contain -mx-1 px-1">
          {foldersLoading ? (
            <div className="flex items-center justify-center py-10 text-fg-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : folders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-sunken/50 px-4 py-6 text-center">
              <FolderOpen className="mx-auto mb-2 h-5 w-5 text-fg-muted" strokeWidth={1.6} />
              <p className="text-sm text-fg-muted">No folders yet</p>
              <p className="mt-1 text-[12px] text-fg-muted">Create one below</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {folders.map(function (folder) {
                const selected = bookmarked && folderId === folder.id;
                return (
                  <li key={folder.id}>
                    <button
                      type="button"
                      onClick={function () {
                        handleSelect(folder.id);
                      }}
                      disabled={pendingFolderId !== undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors",
                        "hover:bg-hover active:bg-hover",
                        selected && "bg-accent/8 ring-1 ring-accent/20"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          selected ? "bg-accent/12 text-accent" : "bg-sunken text-fg-muted"
                        )}
                      >
                        <FolderOpen className="h-4 w-4" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-fg">
                          {folder.name}
                        </span>
                        <span className="block text-[12px] text-fg-muted">
                          {folder.itemCount === 1 ? "1 saved post" : `${folder.itemCount} saved posts`}
                        </span>
                      </span>
                      {pendingFolderId === folder.id ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" strokeWidth={2} />
                      ) : selected ? (
                        <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                      ) : (
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-fg-muted">
                          {folder.itemCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-sunken/40 px-5 py-4 sm:px-6">
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-2">
          <label
            htmlFor="bookmark-folder-name"
            className="flex items-center gap-2 text-[13px] font-medium text-fg"
          >
            <FolderPlus className="h-4 w-4 text-accent" strokeWidth={2} />
            New folder
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              id="bookmark-folder-name"
              type="text"
              value={newFolderName}
              onChange={function (e) {
                setNewFolderName(e.target.value);
              }}
              placeholder="Folder name"
              maxLength={80}
              className={cn(
                "min-w-0 flex-1 rounded-xl border border-border bg-elevated px-3.5 py-2.5",
                "text-sm text-fg placeholder:text-fg-muted outline-none",
                "focus:border-accent focus:ring-2 focus:ring-accent/15"
              )}
            />
            <button
              type="submit"
              disabled={!newFolderName.trim() || createPending}
              className={cn(
                "shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white",
                "transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
              )}
            >
              {createPending ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

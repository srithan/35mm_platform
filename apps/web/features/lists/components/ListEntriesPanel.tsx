"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import type { FilmListDetail, FilmListEntry } from "@35mm/types";
import { FilmPoster } from "@/components/FilmPoster";
import { FilmSearch } from "@/features/feed/components/PostComposer/FilmSearch";
import type { FilmResult } from "@/features/feed/components/PostComposer/types";
import { cn } from "@/lib/utils/cn";

type ListEntriesPanelProps = {
  list: FilmListDetail;
  isOwner: boolean;
  isLoading?: boolean;
  hasMoreEntries?: boolean;
  isLoadingMoreEntries?: boolean;
  onLoadMoreEntries?: () => void;
  onAddFilm?: (film: FilmResult) => void;
  onEditNote?: (entry: FilmListEntry) => void;
  onMoveEntry?: (entryIndex: number, direction: -1 | 1) => void;
  onRemoveEntry?: (entryId: string) => void;
  className?: string;
};

export function ListEntriesPanel({
  list,
  isOwner,
  isLoading = false,
  hasMoreEntries,
  isLoadingMoreEntries,
  onLoadMoreEntries,
  onAddFilm,
  onEditNote,
  onMoveEntry,
  onRemoveEntry,
  className,
}: ListEntriesPanelProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {isOwner && onAddFilm ? (
        <div className="max-w-md">
          <FilmSearch onSelect={onAddFilm} isHidden={false} />
        </div>
      ) : null}

      {isLoading ? (
        <div className="text-[12px] text-fg-muted">Loading films...</div>
      ) : list.entries.length > 0 ? (
        <div className="space-y-2">
          {list.entries.map(function (entry, index) {
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-elevated p-2.5 transition-colors hover:bg-hover/40"
              >
                <div className="w-8 text-center font-mono text-[11px] text-fg-muted">
                  {list.isRanked ? index + 1 : ""}
                </div>
                <div className="w-10 shrink-0">
                  <FilmPoster src={entry.film.posterUrl} alt={entry.film.title} size="sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-fg">{entry.film.title}</div>
                  <div className="text-[11px] text-fg-muted">{entry.film.year ?? ""}</div>
                  {entry.note ? (
                    <div className="mt-1 text-[12px] leading-relaxed text-fg-light">{entry.note}</div>
                  ) : null}
                </div>
                {isOwner ? (
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      onClick={function () {
                        onMoveEntry?.(index, -1);
                      }}
                      disabled={index === 0}
                      className="rounded p-1.5 text-fg-muted transition-colors hover:text-fg disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={function () {
                        onMoveEntry?.(index, 1);
                      }}
                      disabled={index === list.entries.length - 1}
                      className="rounded p-1.5 text-fg-muted transition-colors hover:text-fg disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    {list.type !== "watchlist" ? (
                      <button
                        type="button"
                        onClick={function () {
                          onEditNote?.(entry);
                        }}
                        className="rounded p-1.5 text-fg-muted transition-colors hover:text-fg"
                        aria-label="Edit note"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={function () {
                        onRemoveEntry?.(entry.id);
                      }}
                      className="rounded p-1.5 text-fg-muted transition-colors hover:text-accent"
                      aria-label="Remove film"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
          {hasMoreEntries ? (
            <button
              type="button"
              disabled={isLoadingMoreEntries}
              onClick={function () {
                if (!isLoadingMoreEntries) onLoadMoreEntries?.();
              }}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-hover/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingMoreEntries ? "Loading more films..." : "Load more films"}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-sunken/40 px-4 py-8 text-center text-[13px] text-fg-muted">
          {isOwner ? "Search above to add your first film." : "No films in this list yet."}
        </div>
      )}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import type { FilmListDetail, FilmListEntry } from "@35mm/types";
import { FilmPoster } from "@/components/FilmPoster";
import { FilmSearch } from "@/features/feed/components/PostComposer/FilmSearch";
import type { FilmResult } from "@/features/feed/components/PostComposer/types";
import { cn } from "@/lib/utils/cn";

type ListEntriesPanelProps = {
  list: FilmListDetail;
  isOwner: boolean;
  viewMode?: "list" | "grid";
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
  viewMode = "list",
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
        viewMode === "grid" ? (
          <div className="grid grid-cols-3 gap-x-2 gap-y-5 py-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {list.entries.map(function (entry, index) {
              return (
                <article key={entry.id} className="group min-w-0">
                  <div
                    className="relative aspect-[2/3] overflow-hidden rounded-sm bg-sunken outline-2 outline-offset-2 transition-[outline-color] duration-150 hover:outline hover:outline-fg/80 focus-within:outline focus-within:outline-fg motion-reduce:transition-none"
                    title={[entry.film.title, entry.film.year].filter(Boolean).join(" · ")}
                  >
                    <FilmPoster
                      src={entry.film.posterUrl}
                      alt={entry.film.title}
                      size="xl"
                      className="h-full w-full rounded-none"
                    />
                    {list.isRanked ? (
                      <span className="absolute left-1.5 top-1.5 rounded-sm bg-black/75 px-1.5 py-1 font-mono text-[9px] font-semibold text-white backdrop-blur-sm">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    ) : null}
                    {isOwner ? (
                      <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <GridActionButton
                          label="Move up"
                          disabled={index === 0}
                          onClick={function () { onMoveEntry?.(index, -1); }}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </GridActionButton>
                        <GridActionButton
                          label="Move down"
                          disabled={index === list.entries.length - 1}
                          onClick={function () { onMoveEntry?.(index, 1); }}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </GridActionButton>
                        {list.type !== "watchlist" ? (
                          <GridActionButton label="Edit note" onClick={function () { onEditNote?.(entry); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </GridActionButton>
                        ) : null}
                        <GridActionButton label="Remove film" onClick={function () { onRemoveEntry?.(entry.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </GridActionButton>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-1.5 truncate text-[11px] font-semibold text-fg">{entry.film.title}</p>
                  {entry.film.year ? (
                    <p className="font-mono text-[10px] text-fg-muted">{entry.film.year}</p>
                  ) : null}
                  {entry.note ? (
                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-fg-muted">{entry.note}</p>
                  ) : null}
                </article>
              );
            })}
            {hasMoreEntries ? (
              <button
                type="button"
                disabled={isLoadingMoreEntries}
                onClick={function () {
                  if (!isLoadingMoreEntries) onLoadMoreEntries?.();
                }}
                className="col-span-full mt-2 w-full rounded-full border border-border bg-bg px-3 py-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-hover/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMoreEntries ? "Loading more films..." : "Load more films"}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {list.entries.map(function (entry, index) {
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "group flex items-center gap-4 py-4 transition-colors hover:bg-hover/70",
                    list.isRanked ? "px-2" : "pr-2"
                  )}
                >
                  {list.isRanked ? (
                    <div className="w-16 shrink-0 text-center font-display text-5xl italic leading-none text-fg opacity-20 transition-opacity group-hover:opacity-35">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                  ) : null}
                  <div className="w-12 shrink-0">
                    <FilmPoster src={entry.film.posterUrl} alt={entry.film.title} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-fg">{entry.film.title}</div>
                    <div className="font-mono text-[11px] text-fg-muted">{entry.film.year ?? ""}</div>
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
                className="my-4 w-full rounded-full border border-border bg-bg px-3 py-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-hover/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMoreEntries ? "Loading more films..." : "Load more films"}
              </button>
            ) : null}
          </div>
        )
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-sunken/40 px-4 py-8 text-center text-[13px] text-fg-muted">
          {isOwner ? "Search above to add your first film." : "No films in this list yet."}
        </div>
      )}
    </div>
  );
}

function GridActionButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-sm bg-black/75 text-white backdrop-blur-sm transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-35"
    >
      {children}
    </button>
  );
}

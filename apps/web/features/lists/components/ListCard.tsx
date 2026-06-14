"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Heart, Pencil, Trash2 } from "lucide-react";
import type { FilmListDetail, FilmListEntry, FilmListSummary } from "@35mm/types";
import { FilmPoster } from "@/components/FilmPoster";
import type { FilmResult } from "@/features/feed/components/PostComposer/types";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { formatListMeta } from "../lib/listMeta";
import { ListEntriesPanel } from "./ListEntriesPanel";

type ListCardProps = {
  list: FilmListSummary;
  expanded: boolean;
  detail?: FilmListDetail | null;
  detailLoading?: boolean;
  isOwnProfile: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onLike?: () => void;
  onClone?: () => void;
  onAddFilm?: (film: FilmResult) => void;
  onEditNote?: (entry: FilmListEntry) => void;
  onMoveEntry?: (entryIndex: number, direction: -1 | 1) => void;
  onRemoveEntry?: (entryId: string) => void;
};

export function ListCard({
  list,
  expanded,
  detail,
  detailLoading = false,
  isOwnProfile,
  onToggle,
  onEdit,
  onDelete,
  onLike,
  onClone,
  onAddFilm,
  onEditNote,
  onMoveEntry,
  onRemoveEntry,
}: ListCardProps) {
  var posters = (list.posterUrls.length ? list.posterUrls : [null, null, null]).slice(0, 3);

  return (
    <div className="py-5">
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onToggle}
          className="flex shrink-0 gap-2 text-left"
          aria-expanded={expanded}
        >
          {posters.map(function (src, i) {
            return (
              <div key={i} className="relative z-[3] -mr-2 w-12 shrink-0 last:mr-0">
                <FilmPoster
                  src={src}
                  alt=""
                  size="list"
                  placeholderGradient="from-[#1a1a2e] to-[#3a3a6e]"
                  placeholderStrokeColor="rgba(255,255,255,0.3)"
                />
              </div>
            );
          })}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={onToggle}
              className="block min-w-0 flex-1 text-left font-display text-[15px] font-semibold hover:text-accent"
            >
              {list.title}
            </button>
            <Link
              href={ROUTES.LIST(list.id)}
              className="shrink-0 text-[11px] font-semibold text-fg-muted no-underline hover:text-accent"
              onClick={function (e) {
                e.stopPropagation();
              }}
            >
              Open
            </Link>
          </div>
          {list.description ? (
            <div className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-fg-light">{list.description}</div>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
            <span>{formatListMeta(list)}</span>
            {list.visibility === "private" ? (
              <EyeOff className="h-3.5 w-3.5" aria-label="Private" />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-label="Public" />
            )}
          </div>
          {list.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {list.tags.map(function (tag) {
                return (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-sunken px-2 py-0.5 text-[10px] font-medium text-fg-muted"
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex items-start gap-1">
          {!isOwnProfile && list.visibility === "public" ? (
            <>
              <button
                type="button"
                onClick={onLike}
                className={cn(
                  "rounded border p-2 transition-colors",
                  list.isLiked
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border text-fg-muted hover:text-fg"
                )}
                aria-label={list.isLiked ? "Unlike list" : "Like list"}
              >
                <Heart className={cn("h-3.5 w-3.5", list.isLiked && "fill-current")} />
              </button>
              <button
                type="button"
                onClick={onClone}
                className="rounded border border-border p-2 text-fg-muted transition-colors hover:text-fg"
                aria-label="Clone list"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </>
          ) : null}
          {isOwnProfile ? (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="rounded border border-border p-2 text-fg-muted transition-colors hover:text-fg"
                aria-label="Edit list"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {list.type !== "watchlist" ? (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded border border-border p-2 text-fg-muted transition-colors hover:text-accent"
                  aria-label="Delete list"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </>
          ) : null}
          <button
            type="button"
            onClick={onToggle}
            className="rounded border border-border p-2 text-fg-muted transition-colors hover:text-fg"
            aria-label={expanded ? "Collapse list" : "Expand list"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-5 border-t border-border pt-4">
          {detail ? (
            <ListEntriesPanel
              list={detail}
              isOwner={isOwnProfile}
              isLoading={detailLoading}
              onAddFilm={onAddFilm}
              onEditNote={onEditNote}
              onMoveEntry={onMoveEntry}
              onRemoveEntry={onRemoveEntry}
            />
          ) : detailLoading ? (
            <div className="text-[12px] text-fg-muted">Loading films...</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

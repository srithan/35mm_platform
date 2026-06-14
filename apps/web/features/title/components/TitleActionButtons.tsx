"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark, BookmarkPlus, Check, ExternalLink, PenLine } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { TMDBMovie } from "@/lib/tmdb/types";
import type { TitleMedia } from "@/lib/title/paths";
import { tmdbMovieToFilmPayload } from "@/features/lists/api/listsApi";
import { useWatchlistMutation } from "@/features/lists/hooks/useLists";
import {
  readTitleActionState,
  writeTitleActionState,
} from "../lib/titleActionStorage";

const btnIcon = "h-[18px] w-[18px] shrink-0";
const btnBase =
  "inline-flex w-full min-h-[2.75rem] items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-[transform,background-color,box-shadow,border-color,opacity] sm:w-auto active:scale-[0.99] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg/25";

const primary =
  "border border-transparent bg-fg text-bg shadow-sm hover:opacity-95";
const secondary =
  "border border-border bg-elevated text-fg shadow-sm " +
  "hover:border-border-strong hover:bg-sunken/60 dark:hover:bg-sunken/50";
const accent =
  "border border-transparent bg-accent text-white shadow-sm hover:opacity-95";

type TitleActionButtonsProps = {
  detail: TMDBMovie;
  media: TitleMedia;
  tmdbId: string;
  imdbId: string | null | undefined;
  onWriteReview: () => void;
};

export function TitleActionButtons(props: TitleActionButtonsProps) {
  const [watched, setWatched] = useState(false);
  const [onWatchlist, setOnWatchlist] = useState(false);
  const [watchlistFilmId, setWatchlistFilmId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const watchlistMutation = useWatchlistMutation();

  useEffect(
    function () {
      const s = readTitleActionState(props.media, props.tmdbId);
      setWatched(s.watched);
      setOnWatchlist(s.watchlist);
      setHydrated(true);
    },
    [props.media, props.tmdbId]
  );

  const persist = useCallback(
    function (w: boolean, l: boolean) {
      setWatched(w);
      setOnWatchlist(l);
      writeTitleActionState(props.media, props.tmdbId, { watched: w, watchlist: l });
    },
    [props.media, props.tmdbId]
  );

  const onToggleWatched = useCallback(
    function () {
      if (!hydrated) return;
      const nextW = !watched;
      persist(nextW, nextW ? false : onWatchlist);
    },
    [hydrated, watched, onWatchlist, persist]
  );

  const onToggleWatchlist = useCallback(
    function () {
      if (!hydrated || watched) return;
      if (onWatchlist) {
        watchlistMutation.mutate(
          { filmId: watchlistFilmId ?? undefined, inWatchlist: Boolean(watchlistFilmId) },
          {
            onSuccess: function () {
              setWatchlistFilmId(null);
              persist(watched, false);
            },
            onError: function () {
              setWatchlistFilmId(null);
              persist(watched, false);
            },
          }
        );
        return;
      }

      watchlistMutation.mutate(
        { film: tmdbMovieToFilmPayload(props.detail) },
        {
          onSuccess: function (result) {
            if ("filmId" in result) setWatchlistFilmId(result.filmId);
            persist(watched, true);
          },
        }
      );
    },
    [hydrated, watched, onWatchlist, watchlistFilmId, watchlistMutation, props.detail, persist]
  );

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={onToggleWatched}
        aria-pressed={watched}
        disabled={!hydrated}
        className={cn(btnBase, watched ? primary : secondary)}
      >
        <Check className={btnIcon} strokeWidth={2.5} aria-hidden />
        <span>{watched ? "Watched" : "Mark watched"}</span>
      </button>
      <button
        type="button"
        onClick={onToggleWatchlist}
        aria-pressed={onWatchlist}
        disabled={!hydrated || watched || watchlistMutation.isPending}
        title={watched ? "Remove “Watched” to add this title to your watchlist again" : undefined}
        className={cn(
          btnBase,
          onWatchlist && !watched ? primary : secondary,
          watched && "cursor-not-allowed opacity-50"
        )}
      >
        {onWatchlist && !watched ? (
          <Bookmark className={btnIcon} strokeWidth={2.25} aria-hidden />
        ) : (
          <BookmarkPlus className={btnIcon} strokeWidth={2.25} aria-hidden />
        )}
        <span>{onWatchlist && !watched ? "On watchlist" : "Watchlist"}</span>
      </button>
      <button type="button" onClick={props.onWriteReview} className={cn(btnBase, accent)}>
        <PenLine className={btnIcon} strokeWidth={2.25} />
        <span>Write review</span>
      </button>
      {props.imdbId ? (
        <a
          href={"https://www.imdb.com/title/" + props.imdbId}
          target="_blank"
          rel="noreferrer"
          className={cn(btnBase, secondary)}
        >
          <ExternalLink className={btnIcon} strokeWidth={2.25} />
          <span>IMDb</span>
        </a>
      ) : null}
    </div>
  );
}

"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { Clock3, Clapperboard, Globe2, ListPlus, Plus } from "lucide-react";
import { FilmPoster } from "@/components/FilmPoster";
import { ROUTES } from "@/lib/constants/routes";
import type { FilmCatalogDisplayItem } from "../api/filmsApi";

function FilmOpenTarget({
  children,
  className,
  film,
  isOpening,
  onOpen,
}: {
  children: ReactNode;
  className: string;
  film: FilmCatalogDisplayItem;
  isOpening: boolean;
  onOpen?: (film: FilmCatalogDisplayItem) => void;
}) {
  var label = `${isOpening ? "Opening" : "Open"} ${film.title}${film.year ? ` (${film.year})` : ""}`;
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (isOpening) {
      event.preventDefault();
      return;
    }
    if (
      film.source === "tmdb" &&
      onOpen &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      onOpen(film);
    }
  }

  return (
    <Link
      href={ROUTES.TITLE(film.mediaType, film.title)}
      aria-label={label}
      aria-disabled={isOpening || undefined}
      onClick={handleClick}
      className={`${className}${isOpening ? " cursor-wait opacity-70" : ""}`}
    >
      {children}
    </Link>
  );
}

export function FilmCatalogCard({
  film,
  isOpening = false,
  onOpen,
  showInfo = true,
}: {
  film: FilmCatalogDisplayItem;
  isOpening?: boolean;
  onOpen?: (film: FilmCatalogDisplayItem) => void;
  showInfo?: boolean;
}) {
  var facts = [
    film.year == null ? null : String(film.year),
    film.mediaType === "tv" ? "TV" : null,
    film.runtime == null ? null : film.runtime + " min",
  ].filter(Boolean).join(" · ");

  return (
    <article className="group min-w-0">
      <FilmOpenTarget
        film={film}
        isOpening={isOpening}
        onOpen={onOpen}
        className="block w-full rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-film-red focus-visible:ring-offset-4 focus-visible:ring-offset-bg disabled:cursor-wait disabled:opacity-70"
      >
        <div className="relative overflow-hidden rounded-sm bg-fg shadow-[0_1px_0_rgba(28,26,23,0.08)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_30px_-18px_rgba(28,26,23,0.5)] motion-reduce:transition-none">
          <FilmPoster
            src={film.posterUrl}
            alt={film.title}
            size="xl"
            className="w-full rounded-none transition duration-500 group-hover:scale-[1.025] group-hover:opacity-90 motion-reduce:transition-none"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" />
          {film.isVerified ? (
            <span className="absolute right-2 top-2 rounded-full bg-bg/90 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-fg shadow-sm backdrop-blur">
              Verified
            </span>
          ) : film.source === "tmdb" ? (
            <span className="absolute right-2 top-2 rounded-full bg-black/72 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur">
              TMDB
            </span>
          ) : null}
          {isOpening ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[11px] font-semibold text-white backdrop-blur-[1px]">
              Adding to 35mm…
            </span>
          ) : null}
        </div>
      </FilmOpenTarget>

      {showInfo ? <div className="border-b border-border pb-3 pt-2.5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 truncate text-[13px] font-semibold leading-snug text-fg">
            <FilmOpenTarget film={film} isOpening={isOpening} onOpen={onOpen} className="max-w-full truncate text-left outline-none hover:text-film-red focus-visible:text-film-red disabled:cursor-wait disabled:opacity-60">
              {film.title}
            </FilmOpenTarget>
          </h2>
          {facts ? (
            <span className="shrink-0 font-mono text-[9.5px] leading-5 text-fg-muted">
              {facts}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-[11px] text-fg-muted">
          {[film.director, film.genres.slice(0, 2).join(" / ")].filter(Boolean).join(" · ") || "Title record"}
        </p>
      </div> : null}
    </article>
  );
}

export function FilmCatalogListRow({
  addingListId,
  canAddToList = false,
  film,
  isOpening = false,
  listOptions = [],
  listOptionsLoading = false,
  onOpen,
  onAddToList,
  onRequestListAuth,
  rank,
}: {
  addingListId?: string | null;
  canAddToList?: boolean;
  film: FilmCatalogDisplayItem;
  isOpening?: boolean;
  listOptions?: Array<{ id: string; title: string }>;
  listOptionsLoading?: boolean;
  onOpen?: (film: FilmCatalogDisplayItem) => void;
  onAddToList?: (film: FilmCatalogDisplayItem, listId: string) => void;
  onRequestListAuth?: () => void;
  rank?: number;
}) {
  var rankLabel = rank == null ? null : String(rank).padStart(2, "0");
  var mediaLabel = film.mediaType === "tv" ? "Series" : "Film";
  var yearLabel = film.year == null ? "Year unknown" : String(film.year);
  var runtimeLabel = film.runtime == null ? null : film.runtime + " min";
  var localeLabel = [film.language?.toUpperCase(), film.country].filter(Boolean).join(" / ");
  var genreLabel = film.genres.slice(0, 3).join(" / ") || "Genre unlisted";
  var titleDetails = [yearLabel, mediaLabel].filter(Boolean).join(" · ");
  var listActionDisabled = isOpening || listOptionsLoading || !onAddToList;

  return (
    <article className="group/list-row relative overflow-hidden rounded-[22px] border border-border bg-elevated shadow-[0_8px_28px_-26px_rgba(28,26,23,0.5)] transition duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_24px_46px_-34px_rgba(28,26,23,0.52)] motion-reduce:transition-none">
      <FilmOpenTarget
        film={film}
        isOpening={isOpening}
        onOpen={onOpen}
        className="group relative isolate flex min-h-[132px] w-full items-stretch gap-3 overflow-hidden p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-film-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-wait disabled:opacity-60 sm:gap-4 sm:p-3.5"
      >
        <span className="pointer-events-none absolute inset-y-4 left-0 w-1 rounded-r-full bg-[linear-gradient(180deg,var(--film-red),var(--film-gold))] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />
        <span className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(110deg,color-mix(in_srgb,var(--film-red)_8%,transparent),transparent_38%),linear-gradient(180deg,var(--elevated),var(--sunken))] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />
        <div className="relative shrink-0">
          <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-bg/90 px-2 py-1 font-mono text-[9px] font-semibold leading-none text-fg shadow-sm backdrop-blur">
            {rankLabel ?? "—"}
          </span>
          <FilmPoster
            src={film.posterUrl}
            alt=""
            size="lg"
            className="w-14 rounded-[16px] shadow-[0_16px_28px_-20px_rgba(0,0,0,0.95)] ring-1 ring-black/5"
          />
        </div>
        <div className="min-w-0 flex-1 pb-9">
          <div className="min-w-0">
            <h2 className="min-w-0 overflow-hidden text-[15.5px] font-semibold leading-tight text-fg [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] group-hover:text-film-red">
              {film.title}
            </h2>
          </div>
          {film.originalTitle && film.originalTitle !== film.title ? (
            <p className="mt-0.5 truncate text-[11px] text-fg-muted">{film.originalTitle}</p>
          ) : null}
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="inline-flex h-6 items-center rounded-full bg-sunken px-2 font-mono text-[10px] font-semibold uppercase text-fg-muted">
              {titleDetails}
            </span>
            {runtimeLabel ? (
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-sunken px-2 font-mono text-[10px] font-semibold text-fg-muted">
                <Clock3 className="h-3 w-3" aria-hidden />
                {runtimeLabel}
              </span>
            ) : null}
            {localeLabel ? (
              <span className="inline-flex h-6 max-w-full items-center gap-1 rounded-full bg-sunken px-2 font-mono text-[10px] font-semibold uppercase text-fg-muted">
                <Globe2 className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{localeLabel}</span>
              </span>
            ) : null}
          </div>
          <p className="mt-2 flex min-w-0 items-center gap-1.5 pr-10 text-[12px] text-fg-muted">
            <Clapperboard className="h-3.5 w-3.5 shrink-0 text-film-red" aria-hidden />
            <span className="truncate">{genreLabel}</span>
          </p>
          {film.director ? (
            <p className="mt-2 min-w-0 truncate pr-10 text-[11px] font-semibold text-fg">
              <span className="font-mono font-medium uppercase text-fg-faint">Director:</span>{" "}
              {film.director}
            </p>
          ) : null}
        </div>
        {isOpening ? (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-bg/75 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg backdrop-blur-sm">
            Adding to 35mm…
          </span>
        ) : null}
      </FilmOpenTarget>
      <div className="absolute bottom-3 right-3 z-20">
        {canAddToList ? (
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger
              type="button"
              disabled={listActionDisabled}
              title="Add to list"
              aria-label={`Add ${film.title} to list`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg text-fg-muted shadow-sm transition-colors hover:border-film-red/35 hover:bg-film-red hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-film-red/35 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <ListPlus className="h-4 w-4" aria-hidden />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                collisionPadding={12}
                className="z-50 w-[min(17rem,calc(100vw-2rem))] rounded-[18px] border border-border-strong bg-elevated p-2 shadow-xl"
              >
                <DropdownMenu.Label className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                  Add to list
                </DropdownMenu.Label>
                {listOptionsLoading ? (
                  <DropdownMenu.Item disabled className="rounded-full px-3 py-2 text-[12px] text-fg-muted outline-none">
                    Loading lists…
                  </DropdownMenu.Item>
                ) : listOptions.length > 0 ? (
                  listOptions.map(function (list) {
                    var isAdding = addingListId === list.id;
                    return (
                      <DropdownMenu.Item
                        key={list.id}
                        disabled={Boolean(addingListId)}
                        onSelect={function () { onAddToList?.(film, list.id); }}
                        className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold text-fg outline-none transition-colors focus:bg-sunken disabled:cursor-wait disabled:opacity-60"
                      >
                        <Plus className="h-3.5 w-3.5 text-film-red" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{list.title}</span>
                        {isAdding ? <span className="text-[10px] uppercase text-fg-muted">Adding</span> : null}
                      </DropdownMenu.Item>
                    );
                  })
                ) : (
                  <DropdownMenu.Item disabled className="rounded-full px-3 py-2 text-[12px] text-fg-muted outline-none">
                    No custom lists yet
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item asChild className="rounded-full px-3 py-2 text-[12px] font-semibold text-fg outline-none transition-colors focus:bg-sunken">
                  <Link href={ROUTES.LISTS}>Manage lists</Link>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : (
          <button
            type="button"
            title="Add to list"
            aria-label={`Add ${film.title} to list`}
            onClick={onRequestListAuth}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg text-fg-muted shadow-sm transition-colors hover:border-film-red/35 hover:bg-film-red hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-film-red/35"
          >
            <ListPlus className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </article>
  );
}

"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
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
  film,
  isOpening = false,
  onOpen,
}: {
  film: FilmCatalogDisplayItem;
  isOpening?: boolean;
  onOpen?: (film: FilmCatalogDisplayItem) => void;
}) {
  var metadata = [
    film.year == null ? null : String(film.year),
    film.mediaType === "tv" ? "TV" : "Movie",
    film.runtime == null ? null : film.runtime + " min",
    film.language?.toUpperCase(),
    film.country,
  ].filter(Boolean).join(" · ");

  return (
    <article className="border-b border-border">
      <FilmOpenTarget
        film={film}
        isOpening={isOpening}
        onOpen={onOpen}
        className="group grid min-h-24 w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-4 py-3 text-left outline-none transition-colors hover:bg-hover focus-visible:bg-hover disabled:cursor-wait disabled:opacity-60 sm:grid-cols-[48px_minmax(0,1fr)_minmax(180px,0.55fr)] sm:px-2"
      >
        <FilmPoster
          src={film.posterUrl}
          alt=""
          size="md"
          className="w-12 rounded-[2px] shadow-sm"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[14px] font-semibold text-fg group-hover:text-film-red">
              {film.title}
            </h2>
            {film.isVerified ? (
              <span className="hidden shrink-0 rounded-full border border-border-strong px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-muted md:inline">
                Verified
              </span>
            ) : film.source === "tmdb" ? (
              <span className="hidden shrink-0 rounded-full border border-border-strong px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-fg-muted md:inline">
                TMDB
              </span>
            ) : null}
          </div>
          {film.originalTitle && film.originalTitle !== film.title ? (
            <p className="mt-0.5 truncate text-[11px] text-fg-muted">{film.originalTitle}</p>
          ) : null}
          <p className="mt-1 truncate font-mono text-[10px] text-fg-muted">{metadata || "Title record"}</p>
        </div>
        <div className="hidden min-w-0 text-right sm:block">
          <p className="truncate text-[12px] font-medium text-fg">{film.director || "Creator unknown"}</p>
          <p className="mt-1 truncate text-[10.5px] text-fg-muted">
            {film.genres.slice(0, 3).join(" / ") || "Genre unlisted"}
          </p>
        </div>
      </FilmOpenTarget>
    </article>
  );
}

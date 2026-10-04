"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import type { ShortFilm } from "../data/mockShortFilms";

export function ShortFilmThumbCard({
  film,
  tone = "default",
}: {
  film: ShortFilm;
  tone?: "default" | "cinema";
}) {
  const cinema = tone === "cinema";

  return (
    <Link
      href={ROUTES.SEVENTY_MM_FILM(film.id)}
      className={cn(
        "group block shrink-0 no-underline text-inherit",
        cinema
          ? "w-[240px] sm:w-[280px] md:w-[310px]"
          : "w-[200px] sm:w-[220px] md:w-[240px]",
        "rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
      )}
    >
      <div
        className={cn(
          "relative aspect-video overflow-hidden bg-[#0d0806]",
          cinema
            ? "rounded-md ring-1 ring-border"
            : "rounded-xl ring-1 ring-black/[0.06]",
        )}
      >
        <img
          src={film.posterSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.045] motion-reduce:transition-none"
          loading="lazy"
        />
        {film.staffPick ? (
          <span
            className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-bg"
            title="Staff pick"
          >
            Pick
          </span>
        ) : null}
        <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-white/95">
          {film.durationLabel}
        </span>
      </div>
      <div className={cn("pr-1", cinema ? "mt-3" : "mt-2.5")}>
        <p
          className={cn(
            "line-clamp-2 text-[14px] font-semibold leading-snug text-fg transition-colors",
            "group-hover:text-accent",
          )}
        >
          {film.title}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-fg-muted">
          {film.director}
        </p>
        <p
          className={cn("mt-0.5 text-[12px] text-fg-faint", cinema && "hidden")}
        >
          {film.category}
          <span aria-hidden> · </span>
          {film.year}
        </p>
      </div>
    </Link>
  );
}

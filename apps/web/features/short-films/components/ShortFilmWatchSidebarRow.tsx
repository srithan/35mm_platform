"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import type { ShortFilm } from "../data/mockShortFilms";

export function ShortFilmWatchSidebarRow({ film }: { film: ShortFilm }) {
  return (
    <Link
      href={ROUTES.SHORT_FILM(film.id)}
      className={cn(
        "flex gap-2.5 p-1.5 -mx-1.5 rounded-xl no-underline text-inherit transition-colors",
        "hover:bg-sunken/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
      )}
    >
      <div className="relative w-[136px] sm:w-[152px] lg:w-[168px] shrink-0 aspect-video rounded-lg overflow-hidden bg-fg/10 ring-1 ring-border">
        <img src={film.posterSrc} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <span className="absolute bottom-1 right-1 text-[11px] font-semibold tabular-nums text-white bg-black/80 px-1 py-0.5 rounded">
          {film.durationLabel}
        </span>
        {film.staffPick ? (
          <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wide text-white bg-red-600/95 px-1 py-0.5 rounded">
            Pick
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[13px] font-semibold text-fg leading-snug line-clamp-2">{film.title}</p>
        <p className="text-[12px] text-fg-muted mt-1 line-clamp-1">{film.director}</p>
        <p className="text-[12px] text-fg-faint mt-0.5">
          {film.category}
          <span className="text-fg-faint/80"> · </span>
          {film.year}
        </p>
      </div>
    </Link>
  );
}

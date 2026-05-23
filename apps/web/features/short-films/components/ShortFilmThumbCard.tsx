"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { formatCount } from "@/lib/utils/formatCount";
import { cn } from "@/lib/utils/cn";
import { directorAvatarSrc } from "../data/mockShortFilms";
import type { ShortFilm } from "../data/mockShortFilms";

export function ShortFilmThumbCard({ film }: { film: ShortFilm }) {
  const avatar = directorAvatarSrc(film.id);
  return (
    <Link
      href={ROUTES.SHORT_FILM(film.id)}
      className={cn(
        "group block w-[220px] sm:w-[240px] shrink-0 no-underline text-inherit",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 rounded-xl"
      )}
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-fg/10 ring-1 ring-black/5">
        <img
          src={film.posterSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        {film.staffPick ? (
          <span
            className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/85 text-white text-[10px] font-bold flex items-center justify-center border border-white/15"
            title="Staff pick"
          >
            SP
          </span>
        ) : null}
        <span className="absolute bottom-2 right-2 text-[11px] font-medium tabular-nums text-white bg-black/70 px-1.5 py-0.5 rounded">
          {film.durationLabel}
        </span>
      </div>
      <div className="mt-2.5 flex gap-2.5 pr-1">
        <img
          src={avatar}
          alt=""
          className="w-9 h-9 rounded-full object-cover ring-1 ring-border flex-shrink-0 bg-sunken"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-fg leading-snug line-clamp-2 group-hover:text-accent transition-colors">
            {film.title}
          </p>
          <p className="text-[13px] text-fg mt-0.5 truncate">{film.director}</p>
          <p className="text-[12px] text-fg-muted mt-0.5">
            {film.views != null && film.views > 0
              ? formatCount(film.views) + " views"
              : "Vimeo Staff Picks"}
          </p>
        </div>
      </div>
    </Link>
  );
}

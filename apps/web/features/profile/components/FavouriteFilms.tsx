import Link from "next/link";
import { FilmPoster } from "@/components/FilmPoster";
import { ROUTES } from "@/lib/constants/routes";
import type { ProfileStatsFilm } from "../api/profileApi";

function PosterCard(props: { film: ProfileStatsFilm }) {
  var content = (
    <>
      <div className="w-[52px] transition-opacity group-hover:opacity-80">
        <FilmPoster
          src={props.film.posterUrl}
          imdbId={props.film.imdbId}
          alt={props.film.title}
          size="favourite"
        />
      </div>
      <div className="text-[9px] text-fg-muted mt-1 leading-snug max-w-[52px] truncate">
        {props.film.title}
      </div>
    </>
  );

  if (props.film.tmdbId == null) {
    return (
      <div className="flex-shrink-0 text-center group" title={props.film.title}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={ROUTES.TITLE("movie", props.film.tmdbId)}
      className="flex-shrink-0 text-center cursor-pointer group"
      title={props.film.title}
    >
      {content}
    </Link>
  );
}

export function FavouriteFilms(props: { films: ProfileStatsFilm[] }) {
  return (
    <div className="py-7 px-10 border-b border-border bg-fg/5">
      <div className="text-[10px] tracking-[0.1em] uppercase text-fg-muted mb-3">
        Favourite films
      </div>
      {props.films.length === 0 ? (
        <div className="text-xs text-fg-muted">No favourites selected yet</div>
      ) : null}
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {props.films.map((film) => (
          <PosterCard key={film.id} film={film} />
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { FilmPoster } from "@/components/FilmPoster";
import { ROUTES } from "@/lib/constants/routes";
import type { ProfileStatsFilm } from "../api/profileApi";

function PosterCard(props: { film: ProfileStatsFilm }) {
  var content = (
    <>
      <div className="overflow-hidden rounded-sm shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <FilmPoster
          src={props.film.posterUrl}
          imdbId={props.film.imdbId}
          alt={props.film.title}
          size="xl"
        />
      </div>
      <div className="mt-1.5 truncate text-[10px] font-medium leading-snug text-fg">
        {props.film.title}
      </div>
      {props.film.year ? <div className="font-mono text-[8px] text-fg-muted">{props.film.year}</div> : null}
    </>
  );

  if (props.film.tmdbId == null) {
    return (
      <div className="min-w-0 group" title={props.film.title}>
        {content}
      </div>
    );
  }

  return (
    <Link
      href={ROUTES.TITLE("movie", props.film.title)}
      className="min-w-0 cursor-pointer group"
      title={props.film.title}
    >
      {content}
    </Link>
  );
}

export function FavouriteFilms(props: { films: ProfileStatsFilm[] }) {
  return (
    <section className="border-b border-border bg-[var(--stats-panel,var(--color-bg-sunken))] px-5 py-9 sm:px-10">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-muted">
        Personal canon
      </div>
      <h3 className="mb-5 mt-1 font-display text-[25px] font-semibold leading-none tracking-[-0.025em] text-fg">Favourite films</h3>
      {props.films.length === 0 ? (
        <div className="text-xs text-fg-muted">No favourites selected yet</div>
      ) : null}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-2">
        {props.films.map((film) => (
          <PosterCard key={film.id} film={film} />
        ))}
      </div>
    </section>
  );
}

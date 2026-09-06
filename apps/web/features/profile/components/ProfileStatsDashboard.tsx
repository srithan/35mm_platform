"use client";

import { FilmPoster } from "@/components/FilmPoster";
import { formatCount } from "@/lib/utils/formatCount";
import type {
  ProfileStatsDecade,
  ProfileStatsMostWatchedFilm,
  ProfileStatsNamedCount,
  ProfileStatsRatingBucket,
  ProfileStatsSummary,
} from "../api/profileApi";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { FavouriteFilms } from "./FavouriteFilms";
import { GenreBreakdown } from "./GenreBreakdown";
import styles from "./ProfileStatsDashboard.module.css";

function memberYear(value: string | null): string | null {
  if (!value) return null;
  var date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : String(date.getUTCFullYear());
}

function SectionTitle(props: {
  eyebrow: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-muted">
          {props.eyebrow}
        </div>
        <h3 className="mt-1 font-display text-[25px] font-semibold leading-none tracking-[-0.025em] text-fg">
          {props.title}
        </h3>
      </div>
      {props.note ? (
        <p className="max-w-[180px] text-right text-[10px] leading-snug text-fg-muted">
          {props.note}
        </p>
      ) : null}
    </div>
  );
}

function RatingDistribution(props: {
  buckets: ProfileStatsRatingBucket[];
  ratedCount: number;
}) {
  var byRating = new Map(
    props.buckets.map(function (bucket) {
      return [bucket.rating, bucket.count];
    }),
  );
  var ratings = Array.from({ length: 10 }, function (_, index) {
    return (index + 1) / 2;
  });
  var maximum = Math.max(
    1,
    ...ratings.map(function (rating) {
      return byRating.get(rating) ?? 0;
    }),
  );

  return (
    <section
      className="border-b border-border px-5 py-9 sm:px-10"
      aria-labelledby="ratings-heading"
    >
      <div id="ratings-heading">
        <SectionTitle
          eyebrow="Taste profile"
          title="Ratings skyline"
          note={`${formatCount(props.ratedCount)} rated ${props.ratedCount === 1 ? "film" : "films"}`}
        />
      </div>
      {props.ratedCount === 0 ? (
        <p className="text-xs text-fg-muted">
          Ratings appear here after films receive stars.
        </p>
      ) : (
        <div
          className="flex h-40 items-end gap-1.5 sm:gap-2.5"
          role="img"
          aria-label="Rating distribution from half a star to five stars"
        >
          {ratings.map(function (rating) {
            var count = byRating.get(rating) ?? 0;
            var height =
              count === 0
                ? 2
                : Math.max(8, Math.round((count / maximum) * 100));
            return (
              <div
                key={rating}
                className="group flex min-w-0 flex-1 flex-col items-center justify-end self-stretch"
              >
                <span className="mb-1 font-mono text-[8px] text-fg-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  {count}
                </span>
                <div
                  className="w-full rounded-t-[3px] bg-film-red transition-opacity group-hover:opacity-75"
                  style={{ height: `${height}%` }}
                  title={`${rating} stars: ${count}`}
                />
                <span className="mt-2 font-mono text-[8px] text-fg-muted">
                  {rating === 0.5
                    ? "½"
                    : rating === 5
                      ? "5★"
                      : Number.isInteger(rating)
                        ? rating
                        : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DecadeChart(props: { decades: ProfileStatsDecade[] }) {
  var maximum = Math.max(
    1,
    ...props.decades.map(function (item) {
      return item.count;
    }),
  );
  return (
    <section className="border-b border-border px-5 py-9 sm:px-10">
      <SectionTitle eyebrow="Across film history" title="Decades explored" />
      {props.decades.length === 0 ? (
        <p className="text-xs text-fg-muted">
          Release-year data will shape this timeline.
        </p>
      ) : (
        <div className="space-y-2.5">
          {props.decades.map(function (item) {
            return (
              <div
                key={item.decade}
                className="grid grid-cols-[42px_1fr_32px] items-center gap-3"
              >
                <span className="font-mono text-[10px] text-fg-muted">
                  {item.decade}s
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-sunken-2">
                  <div
                    className="h-full rounded-full bg-fg"
                    style={{
                      width: `${Math.max(3, (item.count / maximum) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-right font-mono text-[10px] text-fg-muted">
                  {formatCount(item.count)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RankedList(props: { title: string; items: ProfileStatsNamedCount[] }) {
  return (
    <div className="min-w-0">
      <h4 className="border-b border-border pb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-fg-muted">
        {props.title}
      </h4>
      {props.items.length === 0 ? (
        <p className="py-3 text-[11px] text-fg-muted">Not enough metadata</p>
      ) : (
        <ol className="divide-y divide-border">
          {props.items.slice(0, 6).map(function (item, index) {
            return (
              <li
                key={item.name}
                className="grid grid-cols-[16px_1fr_auto] gap-1.5 py-2.5 text-[11px]"
              >
                <span className="font-mono text-fg-faint">{index + 1}</span>
                <span className="truncate text-fg" title={item.name}>
                  {item.name}
                </span>
                <span className="font-mono text-fg-muted">
                  {formatCount(item.count)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function PeopleCredits(props: {
  directors: ProfileStatsNamedCount[];
  artists: ProfileStatsNamedCount[];
  musicDirectors: ProfileStatsNamedCount[];
}) {
  return (
    <section className="border-b border-border px-5 py-9 sm:px-10">
      <SectionTitle
        eyebrow="Names across the credits"
        title="People behind your films"
        note="Ranked by watched films"
      />
      <div className="grid grid-cols-1 gap-7 sm:grid-cols-3 sm:gap-5">
        <RankedList title="Directors" items={props.directors} />
        <RankedList title="Artists" items={props.artists} />
        <RankedList title="Music directors" items={props.musicDirectors} />
      </div>
    </section>
  );
}

function FilmWorld(props: {
  countries: ProfileStatsNamedCount[];
  languages: ProfileStatsNamedCount[];
}) {
  return (
    <section className="border-b border-border px-5 py-9 sm:px-10">
      <SectionTitle
        eyebrow="Creative geography"
        title="Your film world"
        note="Ranked by watched films"
      />
      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-10">
        <RankedList title="Countries" items={props.countries} />
        <RankedList title="Languages" items={props.languages} />
      </div>
    </section>
  );
}

function MostWatched(props: { films: ProfileStatsMostWatchedFilm[] }) {
  if (props.films.length === 0) return null;
  return (
    <section className="border-b border-border bg-[var(--stats-panel,var(--color-bg-sunken))] px-5 py-9 sm:px-10">
      <SectionTitle eyebrow="Returned to" title="Films worth another look" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-2">
        {props.films.map(function (film) {
          return (
            <div key={film.id} className="min-w-0">
              <div className="relative overflow-hidden rounded-sm shadow-sm">
                <FilmPoster
                  src={film.posterUrl}
                  imdbId={film.imdbId}
                  alt={film.title}
                  size="xl"
                />
                <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/80 px-1.5 py-0.5 font-mono text-[9px] text-white backdrop-blur-sm">
                  ×{film.watches}
                </span>
              </div>
              <p
                className="mt-1.5 truncate text-[10px] font-medium text-fg"
                title={film.title}
              >
                {film.title}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function metricSubline(stats: ProfileStatsSummary): string {
  if (stats.runtimeKnownCount === 0)
    return "Runtime metadata unavailable for logged films";
  if (stats.hoursWatched <= 0) return "Less than one hour recorded";
  var days = Math.floor(stats.hoursWatched / 24);
  var timeLabel =
    days === 0
      ? "Less than one day in the dark"
      : `${formatCount(days)} ${days === 1 ? "day" : "days"} in the dark`;
  if (stats.runtimeKnownCount >= stats.filmsLoggedCount) return timeLabel;
  return `${timeLabel} · runtime known for ${stats.runtimeKnownCount} of ${stats.filmsLoggedCount}`;
}

export function ProfileStatsDashboard(props: {
  stats: ProfileStatsSummary;
  displayName: string;
  selectedYear: number | null;
  onYearChange: (year: number | null) => void;
}) {
  var stats = props.stats;
  var joined = memberYear(stats.memberSince);
  var average =
    stats.averageRating == null ? "—" : stats.averageRating.toFixed(1);
  var averageRuntime =
    stats.filmsLoggedCount > 0 && stats.hoursWatched > 0
      ? Math.round((stats.hoursWatched * 60) / stats.filmsLoggedCount)
      : 0;
  var supporting = [
    { label: "Unique films", value: stats.uniqueFilmsCount },
    { label: "Rated", value: stats.ratedCount },
    { label: "Rewatches", value: stats.rewatchCount },
    { label: "Reviews", value: stats.reviewsWrittenCount },
    { label: "Review likes", value: stats.reviewLikeCount },
    {
      label: "Avg runtime",
      value: averageRuntime > 0 ? `${averageRuntime}m` : "—",
    },
  ];
  var periodLabel =
    props.selectedYear == null ? "All time" : String(props.selectedYear);

  return (
    <div className={`${styles.dashboard} overflow-hidden bg-bg`}>
      <section
        className={`${styles.hero} relative overflow-hidden border-b border-black px-5 pb-10 pt-10 sm:px-10 sm:pb-12`}
      >
        <div
          className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full bg-film-red opacity-20 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/55">
            {joined ? `Film record · since ${joined}` : "Film record"}
          </p>
          <label>
            <span className="sr-only">Stats year</span>
            <select
              className={styles.yearSelector}
              value={props.selectedYear ?? "all"}
              onChange={function (event) {
                props.onYearChange(
                  event.target.value === "all"
                    ? null
                    : Number(event.target.value),
                );
              }}
            >
              <option value="all">All time</option>
              {stats.availableYears.map(function (year) {
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
        <p className="relative z-10 mt-8 font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">
          {periodLabel}
        </p>
        <h2 className="relative z-10 mt-2 max-w-[500px] font-display text-[38px] font-semibold leading-[0.96] tracking-[-0.035em] text-white sm:text-[48px]">
          {props.displayName}&apos;s life in film
        </h2>
        <div className="relative z-10 mt-9 grid grid-cols-3 gap-5">
          <div>
            <div className="font-display text-[38px] font-semibold leading-none text-white sm:text-[46px]">
              {formatCount(stats.filmsLoggedCount)}
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">
              Films logged
            </div>
          </div>
          <div>
            <div className="font-display text-[38px] font-semibold leading-none text-white sm:text-[46px]">
              {formatCount(stats.hoursWatched)}
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">
              Hours watched
            </div>
          </div>
          <div>
            <div className="font-display text-[38px] font-semibold leading-none text-white sm:text-[46px]">
              {average}
              <span className="ml-1 text-[18px] text-film-red">★</span>
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">
              Average rating
            </div>
          </div>
        </div>
        <p className="relative z-10 mt-5 text-[11px] text-white/55">
          {metricSubline(stats)} · {formatCount(stats.reviewLikeCount)} review{" "}
          {stats.reviewLikeCount === 1 ? "like" : "likes"}
        </p>
      </section>

      <div
        className={`${styles.metricRail} grid grid-cols-2 gap-px border-b border-black sm:grid-cols-3`}
      >
        {supporting.map(function (item) {
          return (
            <div key={item.label} className={`${styles.metricCell} px-4 py-4`}>
              <div className="font-display text-[22px] font-semibold leading-none text-white">
                {typeof item.value === "number"
                  ? formatCount(item.value)
                  : item.value}
              </div>
              <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/45">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {props.selectedYear == null ? (
        <FavouriteFilms films={stats.favoriteFilms} />
      ) : null}
      <ActivityHeatmap activity={stats.activity} year={props.selectedYear} />
      <RatingDistribution
        buckets={stats.ratingDistribution}
        ratedCount={stats.ratedCount}
      />
      <DecadeChart decades={stats.decades} />
      <GenreBreakdown genres={stats.genres} />
      <PeopleCredits
        directors={stats.directors}
        artists={stats.artists}
        musicDirectors={stats.musicDirectors}
      />
      <FilmWorld countries={stats.countries} languages={stats.languages} />
      <MostWatched films={stats.mostWatchedFilms} />
    </div>
  );
}

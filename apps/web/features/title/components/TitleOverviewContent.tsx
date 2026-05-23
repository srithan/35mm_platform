import Link from "next/link";
import { LazyImage } from "@/components/LazyImage";
import { posterUrl, yearFromDate } from "@/features/discover/lib/tmdb-utils";
import { tmdbItemToTitlePath } from "@/lib/title/paths";
import { cn } from "@/lib/utils/cn";
import type { TMDBMovie, TMDBSeasonDetail, TMDBVideo } from "@/lib/tmdb/types";
import { youtubeThumb } from "../lib/titleVideos";
import { TitleAtAGlance } from "./TitleAtAGlance";
import { TitleCastCard } from "./TitleCastCard";
import { TitleEpisodesPanel } from "./TitleEpisodesPanel";
import { TitleWatchBlock } from "./TitleWatchBlock";
import { TitleSectionTitle } from "./titlePageLayoutTokens";

type TitleOverviewContentProps = {
  detail: TMDBMovie;
  isTv: boolean;
  yearStr: string;
  certification: string | undefined;
  directors: string | undefined;
  creators: string | undefined;
  writers: string | undefined;
  seasons: TMDBSeasonDetail[];
  displayVideos: TMDBVideo[];
  playingKey: string | null;
  onSelectVideoKey: (key: string) => void;
  recommendations: TMDBMovie[];
  watchProvidersUS:
    | NonNullable<TMDBMovie["watch/providers"]>["results"]["US"]
    | undefined;
};

export function TitleOverviewContent(props: TitleOverviewContentProps) {
  const d = props.detail;
  const hasWatch =
    props.watchProvidersUS &&
    (props.watchProvidersUS.flatrate ||
      props.watchProvidersUS.rent ||
      props.watchProvidersUS.buy);

  return (
    <div className="flex min-w-0 flex-col gap-12">
      {d.overview ? (
        <section>
          <TitleSectionTitle className="mb-3">About</TitleSectionTitle>
          <p className="text-[15px] leading-[1.75] text-fg/88">{d.overview}</p>
        </section>
      ) : null}

      <TitleAtAGlance
        isTv={props.isTv}
        yearStr={props.yearStr}
        certification={props.certification}
        detail={d}
        directors={props.directors}
        creators={props.creators}
        writers={props.writers}
      />

      {d.credits?.cast && d.credits.cast.length > 0 ? (
        <section>
          <TitleSectionTitle className="mb-3">Cast</TitleSectionTitle>
          <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
            {d.credits.cast.slice(0, 18).map(function (person) {
              return <TitleCastCard key={person.id} person={person} />;
            })}
          </div>
        </section>
      ) : null}

      {props.isTv && props.seasons.length > 0 ? (
        <TitleEpisodesPanel detail={d} seasons={props.seasons} />
      ) : null}

      {props.displayVideos.length > 0 ? (
        <section>
          <TitleSectionTitle className="mb-3">Trailers &amp; videos</TitleSectionTitle>
          {props.playingKey ? (
            <div className="mb-4 aspect-video w-full max-w-3xl overflow-hidden rounded-xl bg-black/[0.06]">
              <iframe
                title="Selected video"
                className="h-full w-full border-0 outline-none"
                src={"https://www.youtube.com/embed/" + props.playingKey}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {props.displayVideos
              .filter(function (v) {
                return v.site === "YouTube" && v.key;
              })
              .map(function (v) {
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={function () {
                      props.onSelectVideoKey(v.key);
                    }}
                    className={cn(
                      "w-28 shrink-0 overflow-hidden rounded-lg text-left",
                      "bg-elevated shadow-sm transition-shadow",
                      props.playingKey === v.key
                        ? "ring-2 ring-film-gold/50"
                        : "hover:shadow"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={youtubeThumb(v.key)}
                      alt=""
                      className="aspect-video w-full object-cover"
                    />
                    <p className="line-clamp-2 p-1.5 text-[10px] leading-snug text-fg-muted">
                      {v.name}
                    </p>
                  </button>
                );
              })}
          </div>
        </section>
      ) : null}

      <div className="lg:hidden">
        {hasWatch && props.watchProvidersUS ? (
          <TitleWatchBlock watchProvidersUS={props.watchProvidersUS} />
        ) : null}
      </div>

      {props.recommendations.length > 0 ? (
        <section aria-label="Related titles from TMDB">
          <TitleSectionTitle className="mb-1">More like this</TitleSectionTitle>
          <p className="mb-4 text-[13px] text-fg/55">From TMDB recommendations</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4">
            {props.recommendations.slice(0, 8).map(function (item) {
              return (
                <li key={item.id + "-" + (item.title || item.name || "")}>
                  <Link
                    href={tmdbItemToTitlePath({
                      id: item.id,
                      name: item.name,
                      title: item.title,
                      media_type: item.media_type,
                    })}
                    className="group block"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-sunken">
                      {item.poster_path ? (
                        <LazyImage
                          src={posterUrl(item.poster_path, "w185") || ""}
                          alt={item.title || item.name || ""}
                          aspectRatio="2/3"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-snug text-fg group-hover:underline group-hover:underline-offset-2">
                      {item.title || item.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-fg/55">
                      {yearFromDate(item.release_date || item.first_air_date || "")}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

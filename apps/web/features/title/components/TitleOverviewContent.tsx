import Link from "next/link";
import { LazyImage } from "@/components/LazyImage";
import { posterUrl, yearFromDate } from "@/features/discover/lib/tmdb-utils";
import { tmdbItemToTitlePath } from "@/lib/title/paths";
import { SHOW_POSTER_CARD_METADATA } from "@/lib/constants/uiFlags";
import { cn } from "@/lib/utils/cn";
import type { TMDBMovie, TMDBSeasonDetail, TMDBVideo } from "@/lib/tmdb/types";
import { RELATED_TITLE_LIMIT } from "../lib/titleRelated";
import { youtubeThumb } from "../lib/titleVideos";
import { TitleAtAGlance } from "./TitleAtAGlance";
import { TitleCastSection } from "./TitleCastSection";
import { TitleCrewSection } from "./TitleCrewSection";
import { TitleEpisodesPanel } from "./TitleEpisodesPanel";
import { TitleSectionTitle } from "./titlePageLayoutTokens";
import type { TitleContentTab } from "./TitleContentTabs";

type TitleOverviewContentProps = {
  section: Exclude<TitleContentTab, "reviews">;
  detail: TMDBMovie;
  isTv: boolean;
  yearStr: string;
  certification: string | undefined;
  seasons: TMDBSeasonDetail[];
  displayVideos: TMDBVideo[];
  playingKey: string | null;
  onSelectVideoKey: (key: string) => void;
  recommendations: TMDBMovie[];
};

export function TitleOverviewContent(props: TitleOverviewContentProps) {
  const d = props.detail;

  if (props.section === "about") {
    return (
      <div className="flex min-w-0 flex-col gap-12">
        <TitleAtAGlance
          isTv={props.isTv}
          yearStr={props.yearStr}
          certification={props.certification}
          detail={d}
        />

        {props.displayVideos.length > 0 ? (
          <section>
            <TitleSectionTitle className="mb-3">
              Trailers &amp; videos
            </TitleSectionTitle>
            {props.playingKey ? (
              <div className="mb-4 aspect-video w-full max-w-3xl overflow-hidden rounded-sm border border-fg/85 bg-black/[0.06]">
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
                        "w-28 shrink-0 overflow-hidden rounded-sm text-left",
                        "border border-border bg-elevated shadow-sm transition-[background-color,border-color,box-shadow]",
                        props.playingKey === v.key
                          ? "border-film-gold"
                          : "hover:border-border-strong hover:bg-[color-mix(in_srgb,var(--accent)_8%,var(--elevated))] hover:shadow",
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
      </div>
    );
  }

  if (props.section === "cast") {
    const cast = d.credits?.cast ?? [];
    const crew = d.credits?.crew ?? [];

    return (
      <div className="flex min-w-0 flex-col gap-12">
        {cast.length > 0 ? <TitleCastSection cast={cast} /> : null}

        {crew.length > 0 ? <TitleCrewSection crew={crew} /> : null}

        {props.isTv && props.seasons.length > 0 ? (
          <TitleEpisodesPanel detail={d} seasons={props.seasons} />
        ) : null}
      </div>
    );
  }

  if (props.recommendations.length === 0) {
    return (
      <p className="text-sm text-fg-muted">
        No related titles are available right now.
      </p>
    );
  }

  return (
    <section aria-label="Related titles from TMDB">
      <TitleSectionTitle className="mb-1">More like this</TitleSectionTitle>
      <p className="mb-4 font-mono text-[11px] text-fg-muted">
        Ranked from TMDB recommendations and similar titles
      </p>
      <ul className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-4 sm:gap-x-3 sm:gap-y-4 md:grid-cols-4">
        {props.recommendations.slice(0, RELATED_TITLE_LIMIT).map(function (item) {
          return (
            <li key={item.id + "-" + (item.title || item.name || "")}>
              <Link
                href={tmdbItemToTitlePath({
                  id: item.id,
                  name: item.name,
                  title: item.title,
                  media_type: item.media_type,
                })}
                aria-label={"Open " + (item.title || item.name || "title")}
                className="group block"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-sunken transition-transform duration-300 group-hover:-translate-y-1">
                  {item.poster_path ? (
                    <LazyImage
                      src={posterUrl(item.poster_path, "w185") || ""}
                      alt={item.title || item.name || ""}
                      aspectRatio="2/3"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : null}
                </div>
                {SHOW_POSTER_CARD_METADATA ? (
                  <>
                    <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-snug text-fg group-hover:underline group-hover:underline-offset-2">
                      {item.title || item.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-fg/55">
                      {yearFromDate(
                        item.release_date || item.first_air_date || "",
                      )}
                    </p>
                  </>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

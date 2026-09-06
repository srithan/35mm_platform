import { LazyImage } from "@/components/LazyImage";
import { posterUrl, starsFromVote } from "@/features/discover/lib/tmdb-utils";
import { ROUTES } from "@/lib/constants/routes";
import type { TMDBMedia, TMDBPerson } from "@/lib/tmdb/types";
import { titleHeroBackdropUrl } from "../lib/titleHeroImage";
import { titleKindLabel } from "../lib/titleKindLabel";
import { TitleCoverBackButton } from "./TitleCoverBackButton";
import { TitleCreditNameLinks } from "./TitleCreditNameLinks";

type TitlePageHeroProps = {
  detail: TMDBMedia;
  isTv: boolean;
  displayTitle: string;
  metaLine: string;
  creditPeople: TMDBPerson[];
};

export function TitlePageHero({
  detail,
  isTv,
  displayTitle,
  metaLine,
  creditPeople,
}: TitlePageHeroProps) {
  const backdrop = titleHeroBackdropUrl(detail.backdrop_path);
  return (
    <div>
      <div className="relative mx-auto h-[200px] max-w-[1600px] overflow-hidden bg-sunken sm:h-[360px] lg:h-[360px]">
        {backdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdrop}
            alt=""
            fetchPriority="high"
            className="h-full w-full object-cover object-[center_30%]"
          />
        ) : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, var(--bg) 0%, transparent 48%), linear-gradient(to right, var(--bg), transparent 12%, transparent 88%, var(--bg))",
          }}
        />
        <div className="absolute inset-x-0 top-4 mx-auto max-w-[1120px] px-5">
          <TitleCoverBackButton />
        </div>
      </div>
      <div className="relative mx-auto -mt-16 grid max-w-[1120px] grid-cols-[92px_minmax(0,1fr)] items-end gap-5 px-5 sm:-mt-24 sm:grid-cols-[184px_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-12">
        <div className="title-hero-poster aspect-[2/3] self-start overflow-hidden sm:self-end rounded-sm bg-sunken shadow-[0_12px_35px_rgba(0,0,0,0.18)] [&_img]:border-0 [&_img]:outline-none [&_img:focus]:outline-none [&_img:focus-visible]:outline-none">
          {detail.poster_path ? (
            <LazyImage
              src={posterUrl(detail.poster_path, "w500") || ""}
              alt={displayTitle + " poster"}
              aspectRatio="2/3"
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center font-display text-fg-muted">
              {displayTitle}
            </div>
          )}
        </div>
        <div className="min-w-0 pb-1 pt-16 sm:pt-24">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-muted">
            {titleKindLabel(detail, isTv)}
            {metaLine ? " / " + metaLine : ""}
          </p>
          <h1 className="break-words font-display text-[clamp(2rem,5.4vw,4.8rem)] font-normal leading-[0.98] tracking-[-0.045em] text-fg">
            {displayTitle}
          </h1>
          {creditPeople.length > 0 ? (
            <p className="mt-4 text-sm text-fg-muted">
              {isTv ? "Created by" : "Directed by"}{" "}
              <TitleCreditNameLinks
                items={creditPeople.map(function (person) {
                  return {
                    id: person.id,
                    name: person.name,
                    href: ROUTES.PERSON(person.id),
                  };
                })}
              />
            </p>
          ) : null}
          {detail.vote_count > 0 ? (
            <p className="mt-4 flex flex-wrap items-baseline gap-x-2 text-xs text-fg-muted">
              <span className="font-mono text-xl text-fg">
                {starsFromVote(detail.vote_average).toFixed(1)}
                <span className="text-xs text-fg-muted"> / 5</span>
              </span>
              <span>
                on TMDB · {detail.vote_count.toLocaleString()} ratings
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

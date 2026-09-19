import { LazyImage } from "@/components/LazyImage";
import {
  BROWSE_DENSITY_VARIANT,
  DESKTOP_NAVIGATION_VARIANT,
} from "@/lib/config/uiFlags";
import { posterUrl } from "@/features/discover/lib/tmdb-utils";
import { ROUTES } from "@/lib/constants/routes";
import type { TMDBMedia, TMDBPerson } from "@/lib/tmdb/types";
import { cn } from "@/lib/utils/cn";
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
  const useCompactBrowseDensity = BROWSE_DENSITY_VARIANT === "compact";
  const useFocusedNavigation =
    DESKTOP_NAVIGATION_VARIANT === "focused-sidebar";
  return (
    <div>
      <div
        className={cn(
          "relative mx-auto max-w-[1600px] overflow-hidden bg-sunken",
          useCompactBrowseDensity
            ? "h-[170px] sm:h-[310px] lg:h-[310px]"
            : "h-[200px] sm:h-[360px] lg:h-[360px]",
        )}
      >
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
        <div
          className={cn(
            "absolute inset-x-0 top-4 mx-auto px-5",
            useFocusedNavigation ? "max-w-[1240px]" : "max-w-[1120px]",
          )}
        >
          <TitleCoverBackButton />
        </div>
      </div>
      <div
        className={cn(
          "relative mx-auto grid items-end gap-5 px-5 sm:gap-8 lg:gap-12",
          useFocusedNavigation ? "max-w-[1240px]" : "max-w-[1120px]",
          useCompactBrowseDensity
            ? "-mt-14 grid-cols-[82px_minmax(0,1fr)] sm:-mt-20 sm:grid-cols-[134px_minmax(0,1fr)] lg:grid-cols-[174px_minmax(0,1fr)]"
            : "-mt-16 grid-cols-[92px_minmax(0,1fr)] sm:-mt-24 sm:grid-cols-[184px_minmax(0,1fr)] lg:grid-cols-[224px_minmax(0,1fr)]",
        )}
      >
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
          <p className="mb-2 font-mono text-[10px] uppercase leading-tight tracking-[0.16em] text-fg-muted sm:mb-2.5">
            {titleKindLabel(detail, isTv)}
            {metaLine ? " / " + metaLine : ""}
          </p>
          <h1
            className={cn(
              "break-words font-display font-normal leading-[0.94] tracking-[-0.045em] text-fg sm:leading-[0.95]",
              useCompactBrowseDensity
                ? "text-[clamp(1.75rem,4.8vw,4.2rem)]"
                : "text-[clamp(2rem,5.4vw,4.8rem)]",
            )}
          >
            {displayTitle}
          </h1>
          {creditPeople.length > 0 ? (
            <p className="mt-6 text-sm leading-snug text-fg-muted sm:mt-7">
              {isTv ? "Created by" : "Directed by"}{" "}
              <TitleCreditNameLinks
                items={creditPeople.map(function (person) {
                  return {
                    id: person.id,
                    name: person.name,
                    href: ROUTES.PERSON_ROLE(
                      person.slug || String(person.id),
                      isTv ? "creator" : "director",
                    ),
                  };
                })}
              />
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

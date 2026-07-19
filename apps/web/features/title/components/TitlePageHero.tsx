import { LazyImage } from "@/components/LazyImage";
import { posterUrl, starsFromVote } from "@/features/discover/lib/tmdb-utils";
import { cn } from "@/lib/utils/cn";
import type { TMDBMedia } from "@/lib/tmdb/types";
import { titleHeroImageUrl } from "../lib/titleHeroImage";
import { titleKindLabel } from "../lib/titleKindLabel";
import { TitleCoverBackButton } from "./TitleCoverBackButton";

function HeroStar({
  filled,
  half,
  onDark,
}: {
  filled?: boolean;
  half?: boolean;
  onDark?: boolean;
}) {
  const emptyC = onDark ? "rgba(255,255,255,0.22)" : "var(--neutral-300)";
  const fullC = "var(--color-film-gold)";
  return (
    <div
      className="h-2.5 w-2.5 shrink-0"
      style={{
        clipPath:
          "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
        background: half
          ? "linear-gradient(90deg, " + fullC + " 50%, " + emptyC + " 50%)"
          : filled
            ? fullC
            : emptyC,
      }}
    />
  );
}

type TitlePageHeroProps = {
  detail: TMDBMedia;
  isTv: boolean;
  displayTitle: string;
  metaLine: string;
};

export function TitlePageHero(props: TitlePageHeroProps) {
  const d = props.detail;
  const kind = titleKindLabel(d, props.isTv);
  const heroImgSrc = titleHeroImageUrl(d.backdrop_path, d.poster_path);
  const stars = starsFromVote(d.vote_average);
  const fullStars = Math.floor(stars);
  const hasHalf = stars % 1 >= 0.5;
  const metaLine = props.metaLine;

  return (
    <div className="mx-auto w-full max-w-[1300px] px-4 pt-6 sm:px-6 lg:px-10">
      <div className="relative min-h-[300px] w-full overflow-hidden rounded-sm border border-fg/85 sm:min-h-[460px]">
        <TitleCoverBackButton />
        {heroImgSrc ? (
          <div className="absolute inset-0 scale-[1.03] will-change-transform sm:scale-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImgSrc}
              alt=""
              className="h-full min-h-[300px] w-full object-cover object-[center_22%] sm:min-h-[22rem]"
            />
          </div>
        ) : (
          <div className="min-h-[300px] w-full bg-gradient-to-br from-neutral-900 via-sunken to-neutral-800 sm:min-h-[22rem]" />
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/92 via-black/40 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-l from-white/0 via-black/20 to-black/68"
          aria-hidden
        />

        <div className="relative z-10 flex min-h-[300px] flex-col justify-end px-5 pb-5 pt-20 sm:min-h-[460px] sm:px-8 sm:pb-8 sm:pt-28">
          <div className="mx-auto flex w-full max-w-5xl items-end gap-5 sm:max-w-6xl sm:gap-10 md:gap-12">
            <div
              className={cn(
                "w-24 shrink-0 sm:w-[12rem] md:w-[13.25rem]",
                "relative aspect-[2/3] translate-y-1 overflow-hidden rounded-sm border-2 border-bg",
                "shadow-[0_20px_50px_rgba(0,0,0,0.45)] sm:translate-y-2"
              )}
            >
              {d.poster_path ? (
                <LazyImage
                  src={posterUrl(d.poster_path, "w500") || ""}
                  alt={props.displayTitle}
                  aspectRatio="2/3"
                  className="h-full w-full"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-0.5 text-left sm:pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 sm:text-[11px]">
                {kind}
              </p>
              <h1
                className={cn(
                  "mt-2 text-balance font-display text-3xl font-semibold leading-[1.02] text-white",
                  "[text-shadow:0_2px_4px_rgba(0,0,0,0.85),0_8px_32px_rgba(0,0,0,0.5)]",
                  "sm:mt-2.5 sm:text-5xl md:text-[3.35rem] md:leading-none"
                )}
              >
                {props.displayTitle}
              </h1>
              {metaLine ? (
                <p className="mt-2.5 max-w-2xl text-pretty text-[13px] font-medium leading-relaxed text-white/90 sm:mx-0 sm:mt-3.5 sm:max-w-2xl sm:text-[15px] [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
                  {metaLine}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center justify-start gap-x-2.5 gap-y-1 sm:mt-5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(function (i) {
                    return (
                      <HeroStar
                        key={i}
                        filled={i <= fullStars}
                        half={i === fullStars + 1 && hasHalf}
                        onDark
                      />
                    );
                  })}
                </div>
                <span className="text-[12px] font-medium tabular-nums text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                  {stars.toFixed(1)}
                  <span className="text-white/55">/5</span>
                </span>
                <span className="text-[12px] text-white/40">·</span>
                <span className="text-[12px] text-white/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.75)]">
                  {d.vote_count.toLocaleString()} ratings
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

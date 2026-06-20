"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { carouselDotSize, carouselDotStyle, carouselNavButtonOnDarkClass } from "@/lib/utils/carouselDots";
import { cn } from "@/lib/utils/cn";
import { SHORT_FILMS_HERO_SLIDES } from "../data/mockShortFilms";

export function ShortFilmsHero() {
  const slides = SHORT_FILMS_HERO_SLIDES;
  const [i, setI] = useState(0);
  const n = slides.length;
  const current = slides[i] ?? slides[0];

  const go = useCallback(
    function (dir: number) {
      setI(function (prev) {
        return (prev + dir + n) % n;
      });
    },
    [n]
  );

  useEffect(
    function () {
      if (n < 2) return;
      const t = window.setInterval(function () {
        go(1);
      }, 7000);
      return function () {
        window.clearInterval(t);
      };
    },
    [go, n]
  );

  if (!current) return null;

  return (
    <section className="w-full pt-5 md:pt-6">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#0d0806] ring-1 ring-black/[0.06] shadow-[0_24px_60px_-32px_rgba(0,0,0,0.5)]">
        {slides.map(function (slide, idx) {
          return (
            <img
              key={slide.id}
              src={slide.posterSrc}
              alt=""
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                idx === i ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            />
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

        {n > 1 ? (
          <>
            <button
              type="button"
              onClick={function () {
                go(-1);
              }}
              className={cn(
                carouselNavButtonOnDarkClass,
                "absolute left-3 top-1/2 z-20 h-9 w-9 -translate-y-1/2 md:left-5"
              )}
              aria-label="Previous slide"
            >
              <span className="text-lg leading-none pr-0.5">‹</span>
            </button>
            <button
              type="button"
              onClick={function () {
                go(1);
              }}
              className={cn(
                carouselNavButtonOnDarkClass,
                "absolute right-3 top-1/2 z-20 h-9 w-9 -translate-y-1/2 md:right-5"
              )}
              aria-label="Next slide"
            >
              <span className="text-lg leading-none pl-0.5">›</span>
            </button>
          </>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end p-5 sm:p-7 md:p-9">
          {current.staffPick ? (
            <span className="mb-2 inline-flex w-fit rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              Staff pick
            </span>
          ) : null}
          <h1 className="max-w-2xl font-display text-[1.55rem] font-bold leading-tight tracking-tight text-white sm:text-[1.95rem] md:text-[2.35rem]">
            {current.title}
          </h1>
          <p className="mt-2 text-[13px] text-white/85 sm:text-[14px] md:text-[15px]">
            {current.director}
            <span className="text-white/45"> · </span>
            {current.durationLabel}
            <span className="text-white/45"> · </span>
            {current.category}
          </p>
          <div className="mt-5">
            <Link
              href={ROUTES.SHORT_FILM(current.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-5 py-2.5",
                "bg-white text-[13px] font-semibold text-black no-underline shadow-lg",
                "transition-[transform,filter] hover:bg-white/95 active:scale-[0.98]"
              )}
            >
              <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} aria-hidden />
              Watch
            </Link>
          </div>
        </div>

        {n > 1 ? (
          <div className="absolute bottom-4 left-0 right-0 z-20 flex h-3 items-center justify-center gap-[7px]">
            {slides.map(function (_, idx) {
              const isActive = idx === i;
              const size = carouselDotSize(idx, i, slides.length);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={function () {
                    setI(idx);
                  }}
                  className={cn(
                    "rounded-full transition-[background-color,height,width] duration-200 ease-out",
                    isActive ? "bg-white" : "bg-white/35 hover:bg-white/55"
                  )}
                  style={carouselDotStyle(size)}
                  aria-label={"Go to slide " + (idx + 1)}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

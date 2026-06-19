"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { carouselDotSize, carouselDotStyle, carouselNavButtonOnDarkClass } from "@/lib/utils/carouselDots";
import { cn } from "@/lib/utils/cn";
import { directorAvatarSrc, SHORT_FILMS_HERO_SLIDES } from "../data/mockShortFilms";

function StaffPickLaurel() {
  return (
    <span className="inline-flex items-center gap-1.5 text-white/95" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="opacity-90">
        <path d="M12 2l1.8 4.1 4.4.4-3.3 2.9 1 4.3L12 15.9 7.1 13.7l1-4.3-3.3-2.9 4.4-.4L12 2z" />
      </svg>
      <span className="text-[11px] font-semibold uppercase tracking-wider">Staff pick</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="opacity-90">
        <path d="M12 2l1.8 4.1 4.4.4-3.3 2.9 1 4.3L12 15.9 7.1 13.7l1-4.3-3.3-2.9 4.4-.4L12 2z" />
      </svg>
    </span>
  );
}

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

  const avatar = directorAvatarSrc(current.id);
  const heroHeightClass =
    "min-h-[max(440px,52vh)] md:min-h-[max(520px,58vh)] lg:min-h-[max(620px,65vh)]";

  return (
    <section
      className={cn(
        "relative left-1/2 -translate-x-1/2 w-screen max-w-[100vw] mb-10 md:mb-12"
      )}
    >
      <div className={cn("relative overflow-hidden bg-fg/10", heroHeightClass)}>
        {slides.map(function (slide, idx) {
          return (
            <img
              key={slide.id}
              src={slide.posterSrc}
              alt=""
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
                idx === i ? "opacity-100 z-0" : "opacity-0 z-0 pointer-events-none"
              )}
            />
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20 z-[1]" />

        <button
          type="button"
          onClick={function () {
            go(-1);
          }}
          className={cn(
            carouselNavButtonOnDarkClass,
            "absolute left-4 md:left-8 lg:left-12 top-1/2 -translate-y-1/2 z-20 w-10 h-10"
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
            "absolute right-4 md:right-8 lg:right-12 top-1/2 -translate-y-1/2 z-20 w-10 h-10"
          )}
          aria-label="Next slide"
        >
          <span className="text-lg leading-none pl-0.5">›</span>
        </button>

        <div
          className={cn(
            "relative z-10 flex flex-col justify-end px-6 md:px-10 lg:px-16 xl:px-20",
            "pb-12 md:pb-16 pt-20 md:pt-24",
            heroHeightClass
          )}
        >
          {current.staffPick ? (
            <div className="mb-3">
              <StaffPickLaurel />
            </div>
          ) : null}
          <h1 className="text-white text-[1.85rem] md:text-[2.5rem] lg:text-[2.85rem] font-bold tracking-tight leading-[1.08] max-w-2xl drop-shadow-sm">
            {current.title}
          </h1>
          <div className="mt-4 flex items-center gap-2.5">
            <img
              src={avatar}
              alt=""
              className="w-8 h-8 rounded-full object-cover ring-2 ring-white/30"
            />
            <span className="text-white/95 text-[15px] font-medium">{current.director}</span>
          </div>
          <p className="mt-3 text-white/85 text-[15px] leading-relaxed max-w-lg line-clamp-2">
            {current.synopsis}
          </p>
          <div className="mt-6">
            <Link
              href={ROUTES.SHORT_FILM(current.id)}
              className={cn(
                "inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-full",
                "bg-white text-fg text-[14px] font-semibold no-underline shadow-lg",
                "hover:bg-white/95 transition-transform hover:scale-[1.02]"
              )}
            >
              <svg width="16" height="16" viewBox="0 0 21 23" fill="currentColor" aria-hidden className="shrink-0">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M1.5 2.35965C1.5 1.32355 2.6323 0.685338 3.51868 1.22183L18.6201 10.3622C19.4752 10.8797 19.4752 12.1203 18.6201 12.6378L3.51868 21.7782C2.6323 22.3147 1.5 21.6764 1.5 20.6404V2.35965Z"
                />
              </svg>
              Watch
            </Link>
          </div>
        </div>

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
                  isActive ? "bg-[#38a8f4]" : "bg-white/35 hover:bg-white/55"
                )}
                style={carouselDotStyle(size)}
                aria-label={"Go to slide " + (idx + 1)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

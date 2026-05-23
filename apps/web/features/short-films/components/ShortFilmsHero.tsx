"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
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

  return (
    <section className="mx-4 md:mx-6 mt-4 md:mt-5 mb-10 relative">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl min-h-[300px] md:min-h-[380px] lg:min-h-[420px]",
          "bg-fg/10 ring-1 ring-border"
        )}
      >
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
          className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/92 text-fg shadow-md flex items-center justify-center hover:bg-white transition-colors border border-black/5"
          aria-label="Previous slide"
        >
          <span className="text-lg leading-none pr-0.5">‹</span>
        </button>
        <button
          type="button"
          onClick={function () {
            go(1);
          }}
          className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/92 text-fg shadow-md flex items-center justify-center hover:bg-white transition-colors border border-black/5"
          aria-label="Next slide"
        >
          <span className="text-lg leading-none pl-0.5">›</span>
        </button>

        <div className="relative z-10 flex flex-col justify-end min-h-[300px] md:min-h-[380px] lg:min-h-[420px] px-6 md:px-12 pb-10 md:pb-12 pt-16">
          {current.staffPick ? (
            <div className="mb-3">
              <StaffPickLaurel />
            </div>
          ) : null}
          <h1 className="text-white text-[1.75rem] md:text-[2.35rem] font-bold tracking-tight leading-[1.1] max-w-xl drop-shadow-sm">
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
          <Link
            href={ROUTES.SHORT_FILM(current.id)}
            className={cn(
              "mt-6 inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-full",
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

        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
          {slides.map(function (_, idx) {
            return (
              <button
                key={idx}
                type="button"
                onClick={function () {
                  setI(idx);
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === i ? "bg-white w-6" : "bg-white/45 hover:bg-white/70"
                )}
                aria-label={"Go to slide " + (idx + 1)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

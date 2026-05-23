"use client";

import { useRef } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import type { ShortFilmShelf } from "../data/mockShortFilms";
import { ShortFilmThumbCard } from "./ShortFilmThumbCard";

function featuredWatermarkLetter(shelf: ShortFilmShelf): string {
  if (shelf.featured.watermarkLetter) {
    return shelf.featured.watermarkLetter;
  }
  const t = shelf.featured.title;
  for (let i = 0; i < t.length; i++) {
    const c = t.charAt(i);
    if (/[A-Za-z0-9]/.test(c)) {
      return c.toUpperCase();
    }
  }
  return "·";
}

export function ShortFilmsShelfRow({ shelf }: { shelf: ShortFilmShelf }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const featuredHref =
    shelf.featured.href && shelf.featured.href !== "#"
      ? shelf.featured.href
      : shelf.items[0]
        ? ROUTES.SHORT_FILM(shelf.items[0].id)
        : ROUTES.SHORT_FILMS;
  const channelTag = shelf.id === "staff-picks" ? "Staff pick" : "Collection";
  const wm = featuredWatermarkLetter(shelf);

  function scrollByDir(dir: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  }

  return (
    <section className="mb-12 md:mb-14 px-4 md:px-6" aria-labelledby={"shelf-" + shelf.id}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <h2
            id={"shelf-" + shelf.id}
            className="text-[17px] md:text-[18px] font-semibold text-fg tracking-tight flex items-center gap-1"
          >
            <span className="truncate">{shelf.heading}</span>
            <span className="text-fg-muted font-normal" aria-hidden>
              ›
            </span>
          </h2>
          <button
            type="button"
            className={cn(
              "shrink-0 px-3 py-1 rounded-full text-[12px] font-semibold",
              "border border-border bg-bg text-fg-muted hover:text-fg hover:border-fg/20 transition-colors"
            )}
          >
            Follow
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={function () {
              scrollByDir(-1);
            }}
            className="w-9 h-9 rounded-full border border-border bg-bg text-fg-muted hover:text-fg flex items-center justify-center transition-colors"
            aria-label="Scroll shelf left"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={function () {
              scrollByDir(1);
            }}
            className="w-9 h-9 rounded-full border border-border bg-bg text-fg-muted hover:text-fg flex items-center justify-center transition-colors"
            aria-label="Scroll shelf right"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex gap-4 md:gap-5 items-stretch">
        <Link
          href={featuredHref}
          className={cn(
            "group relative shrink-0 w-[168px] sm:w-[200px] md:w-[228px] rounded-2xl overflow-hidden no-underline text-inherit",
            "ring-1 ring-border",
            "shadow-[0_4px_24px_-8px_rgba(0,0,0,0.25)]",
            "min-h-[280px] sm:min-h-[320px] md:min-h-[360px]"
          )}
        >
          <div
            className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03] origin-center"
            style={{ background: shelf.featured.gradient }}
            aria-hidden
          />
          <span
            className="absolute inset-0 flex items-center justify-center font-bold tracking-tight text-white pointer-events-none select-none"
            style={{
              fontSize: "clamp(3.5rem, 32vw, 6.5rem)",
              lineHeight: 1,
              opacity: 0.14,
            }}
            aria-hidden
          >
            {wm}
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/20 to-black/10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 flex flex-col z-[1]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80 mb-2">
              {channelTag}
            </span>
            <span className="text-white text-[1.25rem] md:text-[1.4rem] font-bold leading-tight drop-shadow-sm">
              {shelf.featured.title}
            </span>
            <span className="text-white/85 text-[12px] mt-2 font-medium tabular-nums">
              {shelf.featured.statsLine}
            </span>
            <p className="text-white/90 text-[13px] leading-snug mt-3 line-clamp-4">
              {shelf.featured.description}
            </p>
            <span
              className={cn(
                "mt-4 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl",
                "bg-white/14 backdrop-blur-sm text-white text-[13px] font-semibold",
                "border border-white/25 group-hover:bg-white/22 transition-colors"
              )}
            >
              <svg width="14" height="14" viewBox="0 0 21 23" fill="currentColor" aria-hidden>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M1.5 2.35965C1.5 1.32355 2.6323 0.685338 3.51868 1.22183L18.6201 10.3622C19.4752 10.8797 19.4752 12.1203 18.6201 12.6378L3.51868 21.7782C2.6323 22.3147 1.5 21.6764 1.5 20.6404V2.35965Z"
                />
              </svg>
              Start watching
            </span>
          </div>
        </Link>

        <div
          ref={scrollRef}
          className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide pb-1 -mr-1"
        >
          <div
            className="grid grid-rows-2 grid-flow-col gap-x-3 gap-y-4 md:gap-x-4 md:gap-y-5 auto-cols-[220px] sm:auto-cols-[240px] h-full"
          >
            {shelf.items.map(function (film) {
              return <ShortFilmThumbCard key={shelf.id + "-" + film.id} film={film} />;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

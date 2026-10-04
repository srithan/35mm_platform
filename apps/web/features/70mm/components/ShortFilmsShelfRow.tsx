"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ShortFilmShelf } from "../data/mockShortFilms";
import { ShortFilmThumbCard } from "./ShortFilmThumbCard";

export function ShortFilmsShelfRow({
  shelf,
  tone = "default",
}: {
  shelf: ShortFilmShelf;
  tone?: "default" | "cinema";
}) {
  const cinema = tone === "cinema";
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollByDir(dir: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.round(el.clientWidth * 0.75),
      behavior: "smooth",
    });
  }

  return (
    <section
      className={cinema ? "mb-8 md:mb-10" : "mb-10 md:mb-12"}
      aria-labelledby={"shelf-" + shelf.id}
    >
      <div
        className={
          cinema
            ? "mb-3 flex items-center justify-between gap-3"
            : "mb-4 flex items-center justify-between gap-3"
        }
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {cinema ? null : (
            <span
              className="h-5 w-1 shrink-0 rounded-full bg-accent"
              aria-hidden
            />
          )}
          <h2
            id={"shelf-" + shelf.id}
            className={
              cinema
                ? "truncate text-[19px] font-semibold tracking-tight text-fg md:text-[21px]"
                : "truncate text-[17px] font-semibold tracking-tight text-fg md:text-[18px]"
            }
          >
            {shelf.heading}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={function () {
              scrollByDir(-1);
            }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
              cinema
                ? "border-border bg-bg/80 text-fg-muted backdrop-blur-sm hover:bg-sunken hover:text-fg"
                : "border-border bg-bg text-fg-muted hover:text-fg",
            )}
            aria-label={"Scroll " + shelf.heading + " left"}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            onClick={function () {
              scrollByDir(1);
            }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
              cinema
                ? "border-border bg-bg/80 text-fg-muted backdrop-blur-sm hover:bg-sunken hover:text-fg"
                : "border-border bg-bg text-fg-muted hover:text-fg",
            )}
            aria-label={"Scroll " + shelf.heading + " right"}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="scrollbar-hide overflow-x-auto pb-1">
        <div className="flex w-max items-start gap-3 md:gap-4">
          {shelf.items.map(function (film) {
            return (
              <ShortFilmThumbCard
                key={shelf.id + "-" + film.id}
                film={film}
                tone={tone}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

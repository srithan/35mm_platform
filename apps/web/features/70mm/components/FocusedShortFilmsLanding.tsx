"use client";

import Link from "next/link";
import { Info, Play } from "lucide-react";
import { UploadedFilms } from "@/features/videos/components/UploadedFilms";
import { ROUTES } from "@/lib/constants/routes";
import {
  MOCK_SHORT_FILM_SHELVES,
  SHORT_FILMS_HERO_SLIDES,
} from "../data/mockShortFilms";
import { ShortFilmsShelfRow } from "./ShortFilmsShelfRow";
import { ShortFilmsUploadStrip } from "./ShortFilmsUploadStrip";

export function FocusedShortFilmsLanding() {
  const lead = SHORT_FILMS_HERO_SLIDES[0];

  if (!lead) return null;

  return (
    <div className="mx-auto w-full max-w-[1600px] bg-bg pb-14 text-fg">
      <section
        className="relative isolate min-h-[520px] overflow-hidden sm:min-h-[620px] lg:min-h-[min(760px,72vh)]"
        aria-labelledby="featured-film-title"
      >
        <img
          src={lead.posterSrc}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center sm:object-[center_38%]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(4,4,4,.96)_0%,rgba(4,4,4,.74)_32%,rgba(4,4,4,.2)_66%,rgba(4,4,4,.08)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,var(--bg)_0%,color-mix(in_srgb,var(--bg)_82%,transparent)_10%,transparent_43%)]" />

        <div className="flex min-h-[520px] items-end px-5 pb-24 pt-16 sm:min-h-[620px] sm:px-8 sm:pb-28 lg:min-h-[min(760px,72vh)] lg:px-12 lg:pb-32">
          <div className="max-w-[590px]">
            <p className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
              <span className="h-2 w-2 rounded-full bg-film-red" aria-hidden />
              35mm featured film
            </p>
            <h1
              id="featured-film-title"
              className="max-w-[560px] font-display text-[clamp(3.2rem,7vw,6.6rem)] leading-[0.86] tracking-[-0.045em] text-white [text-wrap:balance]"
            >
              {lead.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-white/80">
              <span className="text-film-gold">Staff pick</span>
              <span>{lead.year}</span>
              <span>{lead.durationLabel}</span>
              <span className="rounded border border-white/35 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                {lead.category}
              </span>
            </div>
            <p className="mt-4 line-clamp-3 max-w-[520px] text-[15px] leading-6 text-white/80 sm:text-base">
              {lead.synopsis}
            </p>
            <p className="mt-3 text-sm text-white/55">
              Directed by {lead.director}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={ROUTES.SEVENTY_MM_FILM(lead.id)}
                className="inline-flex h-12 items-center justify-center gap-2.5 rounded-md bg-white px-6 text-[15px] font-bold text-black no-underline transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <Play
                  className="h-5 w-5 fill-current"
                  strokeWidth={0}
                  aria-hidden
                />
                Play
              </Link>
              <Link
                href={ROUTES.SEVENTY_MM_FILM(lead.id)}
                className="inline-flex h-12 items-center justify-center gap-2.5 rounded-md bg-white/20 px-6 text-[15px] font-semibold text-white no-underline backdrop-blur-sm transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Info className="h-5 w-5" strokeWidth={2} aria-hidden />
                More info
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 -mt-16 px-4 sm:px-6 lg:px-10">
        {MOCK_SHORT_FILM_SHELVES.slice(0, 2).map(function (shelf) {
          return (
            <ShortFilmsShelfRow key={shelf.id} shelf={shelf} tone="cinema" />
          );
        })}

        <div className="mb-12 mt-4">
          <ShortFilmsUploadStrip />
        </div>

        <div id="community-films" className="scroll-mt-[140px] md:scroll-mt-20">
          <UploadedFilms />
        </div>

        <div
          id="film-categories"
          className="scroll-mt-[140px] pt-4 md:scroll-mt-20"
        >
          {MOCK_SHORT_FILM_SHELVES.slice(2).map(function (shelf) {
            return (
              <ShortFilmsShelfRow key={shelf.id} shelf={shelf} tone="cinema" />
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { formatCount } from "@/lib/utils/formatCount";
import { cn } from "@/lib/utils/cn";
import { CommentSection } from "@/features/feed/components/CommentSection";
import { getMockCommentsForShortFilm } from "../data/mockShortFilmComments";
import { MOCK_SHORT_FILMS, directorAvatarSrc } from "../data/mockShortFilms";
import type { ShortFilm } from "../data/mockShortFilms";
import { ShortFilmWatchSidebarRow } from "./ShortFilmWatchSidebarRow";

function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function mockLikeCount(id: string): number {
  return 1200 + (seedFromId("likes-" + id) % 88000);
}

function mockSubscriberCount(id: string): number {
  return 900 + (seedFromId("subs-" + id) % 498000);
}

function relatedFilmsFor(film: ShortFilm, limit: number): ShortFilm[] {
  const id = film.id;
  const sameCat: ShortFilm[] = [];
  const rest: ShortFilm[] = [];
  for (let i = 0; i < MOCK_SHORT_FILMS.length; i++) {
    const f = MOCK_SHORT_FILMS[i];
    if (f.id === id) continue;
    if (f.category === film.category) {
      sameCat.push(f);
    } else {
      rest.push(f);
    }
  }
  return sameCat.concat(rest).slice(0, limit);
}

type ChipId = "all" | "director" | "category" | "staff";

export function ShortFilmWatchContent({ film }: { film: ShortFilm }) {
  const [chip, setChip] = useState<ChipId>("all");
  const [descExpanded, setDescExpanded] = useState(false);

  const related = useMemo(
    function () {
      return relatedFilmsFor(film, 28);
    },
    [film]
  );

  const mockComments = useMemo(
    function () {
      return getMockCommentsForShortFilm(film.id);
    },
    [film.id]
  );

  const filteredRelated = useMemo(
    function () {
      if (chip === "all") return related;
      if (chip === "director") {
        return related.filter(function (f) {
          return f.director === film.director;
        });
      }
      if (chip === "category") {
        return related.filter(function (f) {
          return f.category === film.category;
        });
      }
      if (chip === "staff") {
        return related.filter(function (f) {
          return f.staffPick;
        });
      }
      return related;
    },
    [related, chip, film.director, film.category]
  );

  const sidebarList = filteredRelated.length > 0 ? filteredRelated : related;

  const avatar = directorAvatarSrc(film.id);
  const likes = mockLikeCount(film.id);
  const subs = mockSubscriberCount(film.id);
  const hasStaffInRelated = related.some(function (f) {
    return f.staffPick;
  });

  const directorChipLabel =
    film.director.length > 22 ? film.director.slice(0, 20) + "…" : film.director;

  return (
    <div className="pb-10 md:pb-14 bg-bg">
      <div className="w-full px-4 md:px-6 pt-4 md:pt-5">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
          {/* Primary column — player + YouTube-style stack (width follows 1400px shell) */}
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                "overflow-hidden rounded-xl bg-black ring-1 ring-border",
                "shadow-[0_16px_40px_-24px_rgba(0,0,0,0.28)]"
              )}
            >
              {film.vimeoPlayerSrc ? (
                <iframe
                  src={film.vimeoPlayerSrc}
                  title={film.title}
                  className="block aspect-video w-full border-0 bg-black outline-none"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : film.videoUrl ? (
                <video
                  src={film.videoUrl}
                  controls
                  playsInline
                  className="block aspect-video w-full bg-black outline-none"
                  poster={film.posterSrc}
                />
              ) : (
                <div className="aspect-video bg-fg/5 flex items-center justify-center text-fg-muted text-sm">
                  No playable source
                </div>
              )}
            </div>

            <h1 className="mt-3 md:mt-4 text-[1.25rem] sm:text-[1.4rem] md:text-[1.55rem] font-bold text-fg tracking-tight leading-snug">
              {film.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3 gap-y-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img
                  src={avatar}
                  alt=""
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover ring-1 ring-border shrink-0 bg-sunken"
                />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-fg truncate">{film.director}</p>
                  <p className="text-[12px] text-fg-muted">{formatCount(subs)} subscribers</p>
                </div>
              </div>
              <button
                type="button"
                className={cn(
                  "shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors",
                  "bg-fg text-bg hover:opacity-90"
                )}
              >
                Subscribe
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-semibold",
                  "bg-sunken text-fg border border-border hover:bg-hover transition-colors"
                )}
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {formatCount(likes)}
              </button>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-semibold",
                  "bg-sunken text-fg border border-border hover:bg-hover transition-colors"
                )}
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Share
              </button>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-semibold",
                  "bg-sunken text-fg border border-border hover:bg-hover transition-colors"
                )}
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                Save
              </button>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center justify-center w-10 h-10 rounded-full",
                  "bg-sunken text-fg border border-border hover:bg-hover transition-colors"
                )}
                aria-label="More actions"
              >
                <span className="text-lg leading-none pb-1">⋯</span>
              </button>
            </div>

            <div
              className={cn(
                "mt-4 rounded-xl border border-border bg-sunken/50 px-3 py-3 md:px-4 md:py-3.5"
              )}
            >
              <p className="text-[13px] font-semibold text-fg mb-2">
                {film.views != null && film.views > 0 ? (
                  <>
                    {formatCount(film.views)} views<span className="text-fg-muted font-normal"> · </span>
                  </>
                ) : null}
                <span className="text-fg-muted font-normal">
                  {film.year}
                  {film.staffPick ? (
                    <>
                      <span> · </span>
                      <span className="text-accent">Staff pick</span>
                    </>
                  ) : null}
                  <span> · </span>
                  {film.durationLabel}
                </span>
              </p>
              <p
                className={cn(
                  "text-[14px] text-fg-light leading-relaxed whitespace-pre-wrap",
                  !descExpanded && "line-clamp-4"
                )}
              >
                {film.synopsis}
              </p>
              {film.synopsis.length > 180 ? (
                <button
                  type="button"
                  onClick={function () {
                    setDescExpanded(function (v) {
                      return !v;
                    });
                  }}
                  className="mt-1.5 text-[13px] font-semibold text-fg hover:underline"
                >
                  {descExpanded ? "Show less" : "Show more"}
                </button>
              ) : null}
            </div>

            <div className="mt-6 rounded-xl border border-border bg-bg overflow-hidden">
              <CommentSection
                className="mt-0"
                comments={mockComments}
                postId={"short-film:" + film.id}
              />
            </div>
          </div>

          {/* Sidebar — chips + vertical related list */}
          <aside
            className={cn(
              "w-full lg:w-[min(100%,402px)] shrink-0",
              "lg:max-h-[calc(100vh-var(--site-header-sticky-offset,0px)-1.5rem)] lg:overflow-y-auto lg:pr-1"
            )}
          >
            <p className="text-[13px] font-semibold text-fg mb-2 lg:pt-0.5">Up next</p>
            <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 scroll-smooth [scrollbar-width:thin]">
              <button
                type="button"
                onClick={function () {
                  setChip("all");
                }}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors border",
                  chip === "all"
                    ? "bg-fg text-bg border-fg"
                    : "bg-sunken text-fg-muted border-border hover:text-fg hover:border-border-strong"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={function () {
                  setChip("director");
                }}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors border max-w-[200px] truncate",
                  chip === "director"
                    ? "bg-fg text-bg border-fg"
                    : "bg-sunken text-fg-muted border-border hover:text-fg hover:border-border-strong"
                )}
                title={"From " + film.director}
              >
                From {directorChipLabel}
              </button>
              <button
                type="button"
                onClick={function () {
                  setChip("category");
                }}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors border",
                  chip === "category"
                    ? "bg-fg text-bg border-fg"
                    : "bg-sunken text-fg-muted border-border hover:text-fg hover:border-border-strong"
                )}
              >
                {film.category}
              </button>
              {hasStaffInRelated ? (
                <button
                  type="button"
                  onClick={function () {
                    setChip("staff");
                  }}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors border",
                    chip === "staff"
                      ? "bg-fg text-bg border-fg"
                      : "bg-sunken text-fg-muted border-border hover:text-fg hover:border-border-strong"
                  )}
                >
                  Staff picks
                </button>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              {sidebarList.map(function (f) {
                return <ShortFilmWatchSidebarRow key={f.id} film={f} />;
              })}
            </div>

            <Link
              href={ROUTES.SHORT_FILMS}
              className="mt-4 inline-flex text-[13px] font-semibold text-accent hover:underline no-underline"
            >
              Browse all short films
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}

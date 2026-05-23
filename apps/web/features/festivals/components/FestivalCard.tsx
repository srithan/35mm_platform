"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import type { FestivalListItem } from "../data/mockFestivals";
import { cn } from "@/lib/utils/cn";

interface FestivalCardProps {
  festival: FestivalListItem;
  variant?: "list" | "grid";
}

const BADGE_LABELS: Record<string, string> = {
  "academy-award": "Academy Award® Qualifying",
  bafta: "BAFTA Qualifying",
  "top-100": "Top 100",
  "best-reviewed": "Best Reviewed",
  new: "New",
  "fiapf-accredited": "FIAPF Accredited",
};

function badgeClass(b: string) {
  return b === "academy-award" || b === "bafta"
    ? "border-film-gold/40 bg-film-gold/[0.08] text-fg/90 dark:border-border dark:bg-film-gold/[0.12]"
    : "border-border bg-sunken/50 text-fg/85 dark:bg-sunken/30";
}

function closedBadgeClass() {
  return (
    "inline-flex border border-red-200/80 bg-red-50 text-red-800 dark:border-red-500/30 " +
    "dark:bg-red-950/35 dark:text-red-200/90"
  );
}

function FestivalCardList({ festival }: { festival: FestivalListItem }) {
  return (
    <Link
      href={ROUTES.FESTIVAL(festival.slug)}
      className={cn(
        "group relative flex min-h-[5.5rem] items-stretch gap-3.5 rounded-2xl border border-border p-3 sm:min-h-0 sm:gap-4 sm:p-3.5",
        "bg-elevated/70 shadow-sm transition-all duration-200",
        "hover:border-border-strong hover:shadow-md dark:bg-elevated/30"
      )}
    >
      <div
        className={cn(
          "relative w-[3.75rem] shrink-0 overflow-hidden rounded-xl sm:w-16",
          "bg-sunken/60 aspect-square",
          "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5)]"
        )}
      >
        <Image
          src={festival.pagePicture}
          alt=""
          width={64}
          height={64}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <h3
          className={cn(
            "font-sans text-[15px] font-semibold leading-snug tracking-[-0.02em] text-fg",
            "transition-colors",
            "group-hover:underline group-hover:decoration-fg/25 group-hover:underline-offset-2"
          )}
        >
          {festival.name}
        </h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-fg-muted">
          <span>
            {festival.location}
            {", "}
            {festival.country}
          </span>
          <span className="text-fg/25" aria-hidden>
            ·
          </span>
          <span>{festival.yearsRunning} years</span>
          {festival.nextDeadline ? (
            <>
              <span className="text-fg/25" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1 text-fg-muted">
                <Calendar className="h-3 w-3 shrink-0 text-fg/45" strokeWidth={2} />
                <span>Deadline {festival.nextDeadline}</span>
              </span>
            </>
          ) : null}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {festival.badges
            ? festival.badges.map(function (b) {
                return (
                  <span
                    key={b}
                    className={cn(
                      "max-w-full rounded-full border px-2 py-0.5 text-[9px] font-medium leading-tight",
                      badgeClass(b)
                    )}
                  >
                    {BADGE_LABELS[b] ?? b}
                  </span>
                );
              })
            : null}
          {!festival.isOpen && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                closedBadgeClass()
              )}
              title="Submissions are closed"
            >
              Closed
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center self-center">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-sunken/30",
            "text-fg/40 transition-all duration-200",
            "group-hover:border-border-strong group-hover:bg-sunken/60 group-hover:text-fg group-hover:shadow-sm"
          )}
        >
          <ChevronRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-px"
            strokeWidth={2.25}
          />
        </span>
      </div>
    </Link>
  );
}

function FestivalCardGrid({ festival }: { festival: FestivalListItem }) {
  return (
    <Link
      href={ROUTES.FESTIVAL(festival.slug)}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border",
        "bg-elevated/80 shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg dark:bg-elevated/25"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sunken/40">
        <Image
          src={festival.pagePicture}
          alt=""
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0 opacity-80"
          aria-hidden
        />
        {!festival.isOpen && (
          <span
            className={cn(
              "absolute right-2.5 top-2.5 rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider shadow-sm",
              closedBadgeClass()
            )}
            title="Submissions are closed"
          >
            Closed
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3.5 pt-4">
        <h3
          className={cn(
            "font-sans line-clamp-2 text-[0.95rem] font-semibold leading-snug tracking-[-0.02em] text-fg",
            "transition-colors",
            "group-hover:text-fg/95"
          )}
        >
          {festival.name}
        </h3>
        <p className="mt-2 flex flex-wrap content-start items-center gap-x-1.5 gap-y-0.5 text-[11px] text-fg-muted">
          <span>
            {festival.location}
            {", "}
            {festival.country}
          </span>
          <span className="text-fg/25" aria-hidden>
            ·
          </span>
          <span>{festival.yearsRunning} years</span>
          {festival.nextDeadline ? (
            <>
              <span className="text-fg/25" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1 text-fg-muted">
                <Calendar className="h-3 w-3 shrink-0 text-fg/45" strokeWidth={2} />
                {festival.nextDeadline}
              </span>
            </>
          ) : null}
        </p>
        <div className="mb-0.5 mt-3 flex min-h-[1.5rem] flex-wrap content-start gap-1.5">
          {festival.badges
            ? festival.badges.map(function (b) {
                return (
                  <span
                    key={b}
                    className={cn(
                      "max-w-full rounded-full border px-2 py-0.5 text-[8.5px] font-medium leading-tight",
                      badgeClass(b)
                    )}
                  >
                    {BADGE_LABELS[b] ?? b}
                  </span>
                );
              })
            : null}
        </div>
        <div
          className={cn(
            "mt-auto border-t border-border pt-3",
            "flex items-center justify-end text-[12px] font-medium text-fg/50",
            "transition-colors group-hover:text-fg"
          )}
        >
          <span className="inline-flex items-center gap-1">
            View festival
            <ChevronRight
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.5}
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function FestivalCard({ festival, variant = "list" }: FestivalCardProps) {
  return variant === "list" ? (
    <FestivalCardList festival={festival} />
  ) : (
    <FestivalCardGrid festival={festival} />
  );
}

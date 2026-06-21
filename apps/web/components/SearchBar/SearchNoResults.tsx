"use client";

import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/constants/routes";
import { TRENDING_PILLS } from "./searchConstants";
import type { SearchTrendingPill } from "./types";

const FALLBACK_PILLS = TRENDING_PILLS.slice(0, 4);

export interface SearchNoResultsProps {
  query: string;
  onSelectPill: (pill: SearchTrendingPill) => void;
  className?: string;
}

export function SearchNoResults({
  query,
  onSelectPill,
  className,
}: SearchNoResultsProps) {
  const trimmed = query.trim();
  const displayQuery =
    trimmed.length > 28 ? `${trimmed.slice(0, 28)}…` : trimmed;

  return (
    <div
      className={cn(
        "flex flex-col items-center px-4 py-6 text-center",
        className,
      )}
    >
      <div className="relative mb-3 flex h-10 w-10 items-center justify-center rounded-[0.65rem] border border-border bg-sunken text-fg-muted">
        <Search className="h-[18px] w-[18px] opacity-70" aria-hidden />
      </div>

      <p className="text-[13px] font-semibold leading-snug text-fg">
        No matches found
      </p>

      {displayQuery ? (
        <p className="mt-1.5 max-w-full truncate font-mono text-[12px] text-fg-muted">
          &ldquo;{displayQuery}&rdquo;
        </p>
      ) : null}

      <p className="mt-2 max-w-[16rem] text-[11px] leading-relaxed text-fg-faint">
        Check spelling, try a film title, @username, or #tag
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
        {FALLBACK_PILLS.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelectPill(pill);
            }}
            className={cn(
              "inline-flex items-center rounded-full border border-border bg-sunken px-2.5 py-1",
              "text-[11px] font-medium text-fg-muted",
              "transition-[background-color,border-color,color,transform] duration-150 ease-out",
              "hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:bg-[color-mix(in_srgb,var(--accent)_6%,var(--sunken))] hover:text-fg",
              "active:scale-[0.97]",
            )}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <Link
        href={ROUTES.DISCOVER}
        className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-fg-muted transition-colors hover:text-fg"
      >
        Browse discover
        <ArrowUpRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

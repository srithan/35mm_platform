"use client";

import { cn } from "@/lib/utils/cn";
import { discoverFilterChipClasses } from "@/components/filters/sidebarFilterStyles";
import type { TMDBGenre } from "@/lib/tmdb/types";

function genreChipLabel(name: string): string {
  if (name === "Science Fiction") return "Sci-Fi";
  return name;
}

interface GenreFilterStripProps {
  genres: TMDBGenre[];
  activeId: number | null;
  onSelect: (id: number | null) => void;
  /** Vertical list for narrow filter column (desktop sidebar). */
  variant?: "strip" | "sidebar";
}

const chipBtn =
  "text-[11px] px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer border";

export function GenreFilterStrip({
  genres,
  activeId,
  onSelect,
  variant = "strip",
}: GenreFilterStripProps) {
  const sidebar = variant === "sidebar";
  if (sidebar) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={function () {
            onSelect(null);
          }}
          className={discoverFilterChipClasses(activeId === null)}
        >
          All
        </button>
        {genres.map(function (g) {
          return (
            <button
              key={g.id}
              type="button"
              onClick={function () {
                onSelect(g.id);
              }}
              className={discoverFilterChipClasses(activeId === g.id)}
            >
              {genreChipLabel(g.name)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-hide lg:overflow-visible py-3 px-4 md:px-6 lg:bg-bg">
      <div className="flex gap-1.5 min-w-max lg:min-w-0 lg:flex-wrap">
        <button
          type="button"
          onClick={function () {
            onSelect(null);
          }}
          className={cn(
            chipBtn,
            "whitespace-nowrap flex-shrink-0",
            activeId === null
              ? "bg-fg text-bg border-fg"
              : "text-fg-light border-border bg-elevated hover:border-fg-muted hover:text-fg"
          )}
        >
          All genres
        </button>
        {genres.map(function (g) {
          return (
            <button
              key={g.id}
              type="button"
              onClick={function () {
                onSelect(g.id);
              }}
              className={cn(
                chipBtn,
                "whitespace-nowrap flex-shrink-0",
                activeId === g.id
                  ? "bg-fg text-bg border-fg"
                  : "text-fg-light border-border bg-elevated hover:border-fg-muted hover:text-fg"
              )}
            >
              {g.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";

const LEVELS = ["", "h1", "h2", "h3", "h4"] as const;

/** Deterministic pseudo-random from index — same output on server and client to avoid hydration mismatch */
function deterministicLevel(i: number): (typeof LEVELS)[number] {
  const hash = ((i * 2654435761) % 1000) / 1000;
  if (hash > 0.72) return LEVELS[(Math.floor(hash * 5) % 4) + 1];
  return LEVELS[0];
}

function deterministicFilms(i: number): number {
  return ((i * 2654435761) % 3);
}

export function ActivityHeatmap() {
  const cells = useMemo(
    () => Array.from({ length: 364 }, (_, i) => deterministicLevel(i)),
    []
  );

  return (
    <div className="py-7 px-10 border-b border-border">
      <div className="text-[10px] tracking-[0.1em] uppercase text-fg-muted mb-3">
        Activity — last 12 months
      </div>
      <div className="grid gap-0.5 mt-3" style={{ gridTemplateColumns: "repeat(52, 1fr)" }}>
        {cells.map((level, i) => (
          <div
            key={i}
            className={cn(
              "aspect-square rounded-sm bg-border transition-opacity cursor-pointer hover:opacity-70",
              level === "h1" && "bg-[var(--color-heat-1)]",
              level === "h2" && "bg-[var(--color-heat-2)]",
              level === "h3" && "bg-[var(--color-heat-3)]",
              level === "h4" && "bg-accent"
            )}
            title={`${deterministicFilms(i)} films`}
          />
        ))}
      </div>
      <div className="flex gap-1.5 items-center mt-2.5 text-[10px] text-fg-muted">
        Less
        <div className="w-2.5 h-2.5 rounded-sm bg-border" />
        <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-heat-1)]" />
        <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-heat-2)]" />
        <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-heat-3)]" />
        <div className="w-2.5 h-2.5 rounded-sm bg-accent" />
        More
      </div>
    </div>
  );
}

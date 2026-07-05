"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";
import type { ProfileStatsActivityDay } from "../api/profileApi";

const LEVELS = ["", "h1", "h2", "h3", "h4"] as const;

function isoDateDaysAgo(daysAgo: number): string {
  var date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function levelForCount(count: number): (typeof LEVELS)[number] {
  if (count >= 4) return "h4";
  if (count >= 3) return "h3";
  if (count >= 2) return "h2";
  if (count >= 1) return "h1";
  return "";
}

export function ActivityHeatmap(props: { activity: ProfileStatsActivityDay[] }) {
  const cells = useMemo(
    function () {
      var byDate = new Map(
        props.activity.map(function (day) {
          return [day.date, day.count];
        })
      );
      return Array.from({ length: 364 }, function (_, index) {
        var date = isoDateDaysAgo(363 - index);
        var count = byDate.get(date) ?? 0;
        return {
          date,
          count,
          level: levelForCount(count),
        };
      });
    },
    [props.activity]
  );

  return (
    <div className="py-7 px-10 border-b border-border">
      <div className="text-[10px] tracking-[0.1em] uppercase text-fg-muted mb-3">
        Activity — last 12 months
      </div>
      <div className="grid gap-0.5 mt-3" style={{ gridTemplateColumns: "repeat(52, 1fr)" }}>
        {cells.map((cell) => (
          <div
            key={cell.date}
            className={cn(
              "aspect-square rounded-sm bg-border transition-opacity cursor-pointer hover:opacity-70",
              cell.level === "h1" && "bg-[var(--color-heat-1)]",
              cell.level === "h2" && "bg-[var(--color-heat-2)]",
              cell.level === "h3" && "bg-[var(--color-heat-3)]",
              cell.level === "h4" && "bg-accent"
            )}
            title={`${cell.date}: ${cell.count} ${cell.count === 1 ? "film" : "films"}`}
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

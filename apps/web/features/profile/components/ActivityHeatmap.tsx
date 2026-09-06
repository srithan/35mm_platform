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

function datesForYear(year: number): string[] {
  var cursor = new Date(Date.UTC(year, 0, 1));
  var end = new Date(Date.UTC(year + 1, 0, 1));
  var dates: string[] = [];
  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function levelForCount(count: number): (typeof LEVELS)[number] {
  if (count >= 4) return "h4";
  if (count >= 3) return "h3";
  if (count >= 2) return "h2";
  if (count >= 1) return "h1";
  return "";
}

export function ActivityHeatmap(props: { activity: ProfileStatsActivityDay[]; year?: number | null }) {
  const cells = useMemo(
    function () {
      var byDate = new Map(
        props.activity.map(function (day) {
          return [day.date, day.count];
        })
      );
      var dates = props.year == null
        ? Array.from({ length: 364 }, function (_, index) { return isoDateDaysAgo(363 - index); })
        : datesForYear(props.year);
      return dates.map(function (date) {
        var count = byDate.get(date) ?? 0;
        return {
          date,
          count,
          level: levelForCount(count),
        };
      });
    },
    [props.activity, props.year]
  );

  var activeDays = cells.filter(function (cell) { return cell.count > 0; }).length;
  var totalFilms = cells.reduce(function (sum, cell) { return sum + cell.count; }, 0);
  var longestStreak = 0;
  var runningStreak = 0;
  for (var cell of cells) {
    runningStreak = cell.count > 0 ? runningStreak + 1 : 0;
    longestStreak = Math.max(longestStreak, runningStreak);
  }
  var busiest = cells.reduce(function (best, cell) { return cell.count > best.count ? cell : best; }, cells[0]);
  var busiestLabel = busiest && busiest.count > 0
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${busiest.date}T00:00:00Z`))
    : "—";

  return (
    <section className="border-b border-border px-5 py-9 sm:px-10">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-muted">
        Viewing rhythm · {props.year == null ? "last 12 months" : props.year}
      </div>
      <h3 className="mt-1 font-display text-[25px] font-semibold leading-none tracking-[-0.025em] text-fg">A year at the movies</h3>
      <div className="mt-5 grid grid-cols-4 divide-x divide-border border-y border-border py-3">
        {[
          [totalFilms, "films"],
          [activeDays, "active days"],
          [longestStreak, "day streak"],
          [busiestLabel, "busiest day"],
        ].map(function (metric) {
          return <div key={String(metric[1])} className="px-2 first:pl-0 last:pr-0"><div className="font-display text-[20px] font-semibold text-fg">{metric[0]}</div><div className="font-mono text-[7px] uppercase tracking-[0.1em] text-fg-muted sm:text-[8px]">{metric[1]}</div></div>;
        })}
      </div>
      <div className="mt-5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid min-w-[520px] grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.ceil(cells.length / 7)}, minmax(0, 1fr))` }}>
          {cells.map((cell) => (
            <div
              key={cell.date}
              className={cn(
                "aspect-square rounded-[2px] bg-border transition-opacity hover:opacity-70",
                cell.level === "h1" && "bg-[var(--color-heat-1)]",
                cell.level === "h2" && "bg-[var(--color-heat-2)]",
                cell.level === "h3" && "bg-[var(--color-heat-3)]",
                cell.level === "h4" && "bg-film-red"
              )}
              title={`${cell.date}: ${cell.count} ${cell.count === 1 ? "film" : "films"}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-wider text-fg-muted">
        Less
        <div className="w-2.5 h-2.5 rounded-sm bg-border" />
        <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-heat-1)]" />
        <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-heat-2)]" />
        <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-heat-3)]" />
        <div className="w-2.5 h-2.5 rounded-sm bg-film-red" />
        More
      </div>
    </section>
  );
}

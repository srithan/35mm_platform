"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ProfileStatsGenre } from "../api/profileApi";

export function GenreBreakdown(props: { genres: ProfileStatsGenre[] }) {
  var shouldReduceMotion = useReducedMotion();

  return (
    <section className="border-b border-border bg-[var(--stats-panel,var(--color-bg-sunken))] px-5 py-9 sm:px-10">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-fg-muted">
        Taste map · all time
      </div>
      <h3 className="mb-5 mt-1 font-display text-[25px] font-semibold leading-none tracking-[-0.025em] text-fg">Genres in rotation</h3>
      {props.genres.length === 0 ? (
        <div className="mt-3 text-xs text-fg-muted">No genre data yet</div>
      ) : null}
      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {props.genres.map((genre) => (
          <div key={genre.name}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-fg">{genre.name}</span>
              <span className="font-mono text-[10px] text-fg-muted">{genre.count} · {genre.percentage}%</span>
            </div>
            <div className="h-1 bg-border rounded overflow-hidden">
              <motion.div
                className="h-full rounded bg-film-red"
                initial={{ width: 0 }}
                animate={{ width: `${genre.percentage}%` }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

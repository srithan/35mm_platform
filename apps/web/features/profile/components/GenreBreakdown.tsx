"use client";

import { motion } from "framer-motion";
import type { ProfileStatsGenre } from "../api/profileApi";

export function GenreBreakdown(props: { genres: ProfileStatsGenre[] }) {
  return (
    <div className="py-7 px-10 border-b border-border">
      <div className="text-[10px] tracking-[0.1em] uppercase text-fg-muted mb-1">
        Genres — all time
      </div>
      {props.genres.length === 0 ? (
        <div className="mt-3 text-xs text-fg-muted">No genre data yet</div>
      ) : null}
      <div className="mt-1">
        {props.genres.map((genre) => (
          <div key={genre.name} className="mb-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-fg">{genre.name}</span>
              <span className="text-fg-muted ">{genre.percentage}%</span>
            </div>
            <div className="h-1 bg-border rounded overflow-hidden">
              <motion.div
                className="h-full bg-fg rounded"
                initial={{ width: 0 }}
                animate={{ width: `${genre.percentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

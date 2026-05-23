"use client";

import { motion } from "framer-motion";

const GENRES = [
  { name: "Drama", pct: 38 },
  { name: "Documentary", pct: 21 },
  { name: "Thriller", pct: 14 },
  { name: "International", pct: 12 },
  { name: "Sci-Fi", pct: 8 },
  { name: "Other", pct: 7 },
];

export function GenreBreakdown() {
  return (
    <div className="py-7 px-10 border-b border-border">
      <div className="text-[10px] tracking-[0.1em] uppercase text-fg-muted mb-1">
        Genres — all time
      </div>
      <div className="mt-1">
        {GENRES.map((g, i) => (
          <div key={g.name} className="mb-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-fg">{g.name}</span>
              <span className="text-fg-muted ">{g.pct}%</span>
            </div>
            <div className="h-1 bg-border rounded overflow-hidden">
              <motion.div
                className="h-full bg-fg rounded"
                initial={{ width: 0 }}
                animate={{ width: `${g.pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

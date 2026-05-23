"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { MOCK_FESTIVALS } from "../data/mockFestivals";

export function FestivalsRightPanel() {
  const upcoming = MOCK_FESTIVALS.filter((f) => f.nextDeadline)
    .slice(0, 5)
    .sort((a, b) =>
      (a.nextDeadline ?? "").localeCompare(b.nextDeadline ?? "")
    );

  return (
    <>
      <div className="mb-7">
        <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-4">
          Upcoming Deadlines
        </div>
        {upcoming.map((f) => (
          <Link
            key={f.id}
            href={ROUTES.FESTIVAL(f.slug)}
            className="flex flex-col gap-0.5 py-2.5 border-b border-border last:border-b-0 cursor-pointer group"
          >
            <div className="text-[12.5px] italic leading-snug group-hover:text-accent group-hover:underline">
              {f.name}
            </div>
            <div className="flex items-center gap-1.5 text-[10.5px] text-fg-muted ">
              <Calendar className="w-3 h-3 flex-shrink-0" strokeWidth={1.8} />
              {f.nextDeadline}
            </div>
          </Link>
        ))}
      </div>
      <div className="border-t border-border pt-6">
        <div className="text-[10px] tracking-[0.12em] uppercase text-fg-muted font-medium mb-4">
          Quick Links
        </div>
        <div className="flex flex-wrap gap-1">
          {["Academy Qualifying", "Best Reviewed", "Documentary", "Short Film"].map(
            (label) => (
              <button
                key={label}
                type="button"
                className="text-[11px] text-fg-light border border-border px-2.5 py-1 rounded-sm cursor-pointer transition-all hover:border-fg-muted hover:text-fg"
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { discoverFilterChipClasses } from "@/components/filters/sidebarFilterStyles";
import {
  DISCOVER_MOOD_OPTIONS,
  type DiscoverMoodId,
} from "../lib/discoverMoodFilters";

interface DiscoverMoodFilterStripProps {
  activeId: DiscoverMoodId;
  onSelect: (id: DiscoverMoodId) => void;
}

export function DiscoverMoodFilterStrip({
  activeId,
  onSelect,
}: DiscoverMoodFilterStripProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {DISCOVER_MOOD_OPTIONS.map(function (opt) {
        const selected = activeId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={function () {
              onSelect(opt.id);
            }}
            className={discoverFilterChipClasses(selected)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

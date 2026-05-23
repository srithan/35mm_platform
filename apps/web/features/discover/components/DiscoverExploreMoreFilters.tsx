"use client";

import type { Dispatch, SetStateAction } from "react";
import { cn } from "@/lib/utils/cn";
import {
  discoverFilterChipClasses,
  sidebarFilterSectionTitle,
} from "@/components/filters/sidebarFilterStyles";
import type { DiscoverExploreFiltersState } from "../lib/discoverExploreFilters";
import {
  DISCOVER_CERT_OPTIONS,
  DISCOVER_DECADE_OPTIONS,
  DISCOVER_DURATION_OPTIONS,
  DISCOVER_LANGUAGE_OPTIONS,
  DISCOVER_RATING_OPTIONS,
  DISCOVER_TYPE_OPTIONS,
} from "../lib/discoverExploreFilters";

type SetExplore = Dispatch<SetStateAction<DiscoverExploreFiltersState>>;

interface DiscoverExploreMoreFiltersProps {
  filters: DiscoverExploreFiltersState;
  setFilters: SetExplore;
}

function FilterChipGroup<T extends string>(props: {
  title: string;
  options: readonly { id: T; label: string }[];
  selectedId: T;
  onSelect: (id: T) => void;
}): JSX.Element {
  const title = props.title;
  const options = props.options;
  const selectedId = props.selectedId;
  const onSelect = props.onSelect;

  return (
    <div>
      <p className={cn(sidebarFilterSectionTitle, "mb-2.5")}>{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(function (opt) {
          const selected = selectedId === opt.id;
          return (
            <button
              key={String(opt.id)}
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
    </div>
  );
}

export function DiscoverExploreMoreFilters({
  filters,
  setFilters,
}: DiscoverExploreMoreFiltersProps) {
  return (
    <div className="space-y-6">
      <FilterChipGroup
        title="Release era"
        options={DISCOVER_DECADE_OPTIONS}
        selectedId={filters.decadeId}
        onSelect={function (id) {
          setFilters(function (prev) {
            return { ...prev, decadeId: id };
          });
        }}
      />
      <FilterChipGroup
        title="Language"
        options={DISCOVER_LANGUAGE_OPTIONS}
        selectedId={filters.languageId}
        onSelect={function (id) {
          setFilters(function (prev) {
            return { ...prev, languageId: id };
          });
        }}
      />
      <FilterChipGroup
        title="Duration"
        options={DISCOVER_DURATION_OPTIONS}
        selectedId={filters.durationId}
        onSelect={function (id) {
          setFilters(function (prev) {
            return { ...prev, durationId: id };
          });
        }}
      />
      <FilterChipGroup
        title="Content rating (US)"
        options={DISCOVER_CERT_OPTIONS}
        selectedId={filters.certificationId}
        onSelect={function (id) {
          setFilters(function (prev) {
            return { ...prev, certificationId: id };
          });
        }}
      />
      <FilterChipGroup
        title="Type"
        options={DISCOVER_TYPE_OPTIONS}
        selectedId={filters.typeId}
        onSelect={function (id) {
          setFilters(function (prev) {
            return { ...prev, typeId: id };
          });
        }}
      />
      <FilterChipGroup
        title="Min. score"
        options={DISCOVER_RATING_OPTIONS}
        selectedId={filters.ratingPresetId}
        onSelect={function (id) {
          setFilters(function (prev) {
            return { ...prev, ratingPresetId: id };
          });
        }}
      />
    </div>
  );
}

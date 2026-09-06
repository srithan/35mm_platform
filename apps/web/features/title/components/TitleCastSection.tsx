"use client";

import { useState } from "react";
import type { TMDBPerson } from "@/lib/tmdb/types";
import { TitleCastCard, TitleCastSeeAllCard } from "./TitleCastCard";
import { TitleSectionTitle } from "./titlePageLayoutTokens";

export const TITLE_CAST_GRID_CAPACITY = 12;

/** Max cast cards shown before overflow; See All occupies the last grid slot. */
export const TITLE_CAST_PREVIEW_COUNT = TITLE_CAST_GRID_CAPACITY;

type TitleCastSectionProps = {
  cast: TMDBPerson[];
};

export function TitleCastSection(props: TitleCastSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = props.cast.length > TITLE_CAST_GRID_CAPACITY;
  const previewCastCount = hasOverflow
    ? TITLE_CAST_GRID_CAPACITY - 1
    : props.cast.length;
  const visibleCast = expanded
    ? props.cast
    : props.cast.slice(0, previewCastCount);
  const remainingCount = props.cast.length - previewCastCount;

  return (
    <section>
      <TitleSectionTitle className="mb-3">Cast</TitleSectionTitle>
      <div className="grid auto-cols-[4.5rem] grid-flow-col grid-rows-2 snap-x snap-proximity gap-x-4 gap-y-5 overflow-x-auto overscroll-x-contain pb-3 pr-4 scrollbar-hide sm:grid-flow-row sm:grid-rows-none sm:grid-cols-6 sm:auto-cols-auto sm:snap-none sm:gap-4 sm:overflow-visible sm:pb-1 sm:pr-0 md:grid-cols-6">
        {visibleCast.map(function (person) {
          return (
            <TitleCastCard
              key={person.id + "-" + (person.character || "")}
              person={person}
              className="snap-start"
            />
          );
        })}
        {!expanded && hasOverflow ? (
          <TitleCastSeeAllCard
            remainingCount={remainingCount}
            onClick={function () {
              setExpanded(true);
            }}
            className="snap-start"
          />
        ) : null}
      </div>
    </section>
  );
}

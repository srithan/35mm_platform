"use client";

import { useEffect, useMemo, useState } from "react";
import type { TMDBMovie, TMDBSeasonDetail } from "@/lib/tmdb/types";
import { TitleEpisodeBlock } from "./TitleEpisodeBlock";
import { TitleSectionTitle } from "./titlePageLayoutTokens";

const seasonSelectClass =
  "min-h-10 w-full min-w-0 sm:min-w-[14rem] max-w-md rounded-xl border border-fg/12 bg-elevated px-3 py-2 text-[13px] text-fg shadow-sm outline-none " +
  "hover:border-fg/22 focus:border-fg/35 focus:ring-2 focus:ring-fg/15";

function sortSeasons(seasons: TMDBSeasonDetail[]): TMDBSeasonDetail[] {
  return seasons.slice().sort(function (a, b) {
    return a.season_number - b.season_number;
  });
}

function defaultSeasonNumber(seasons: TMDBSeasonDetail[]): number {
  if (seasons.length === 0) return 1;
  const sorted = sortSeasons(seasons);
  const s1 = sorted.find(function (s) {
    return s.season_number === 1;
  });
  if (s1) return 1;
  return sorted[0].season_number;
}

type TitleEpisodesPanelProps = {
  detail: TMDBMovie;
  seasons: TMDBSeasonDetail[];
};

export function TitleEpisodesPanel(props: TitleEpisodesPanelProps) {
  const d = props.detail;
  const sortedSeasons = useMemo(
    function () {
      return sortSeasons(props.seasons);
    },
    [props.seasons]
  );

  const [selectedSeason, setSelectedSeason] = useState(function () {
    return defaultSeasonNumber(props.seasons);
  });

  useEffect(
    function () {
      if (sortedSeasons.length === 0) return;
      setSelectedSeason(function (prev) {
        const stillValid = sortedSeasons.some(function (s) {
          return s.season_number === prev;
        });
        if (stillValid) return prev;
        return defaultSeasonNumber(props.seasons);
      });
    },
    [sortedSeasons, props.seasons]
  );

  const activeSeason = useMemo(
    function () {
      return sortedSeasons.find(function (s) {
        return s.season_number === selectedSeason;
      });
    },
    [sortedSeasons, selectedSeason]
  );

  if (sortedSeasons.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-3">
          <TitleSectionTitle>Episodes</TitleSectionTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label htmlFor="title-season-select" className="text-[13px] font-medium text-fg/80">
              Season
            </label>
            <select
              id="title-season-select"
              className={seasonSelectClass}
              value={selectedSeason}
              onChange={function (e) {
                setSelectedSeason(Number(e.target.value));
              }}
            >
              {sortedSeasons.map(function (season) {
                const n = season.episodes ? season.episodes.length : 0;
                const label =
                  (season.name || "Season " + season.season_number) +
                  (n ? " (" + n + (n === 1 ? " ep)" : " eps)") : "");
                return (
                  <option key={season.season_number} value={season.season_number}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <p className="shrink-0 text-[12px] text-fg/60 sm:text-right">
          {d.number_of_seasons
            ? d.number_of_seasons + " season" + (d.number_of_seasons === 1 ? "" : "s")
            : ""}
          {d.number_of_episodes
            ? (d.number_of_seasons ? " · " : "") + d.number_of_episodes + " episodes total"
            : null}
        </p>
      </div>

      {activeSeason ? (
        <div>
          {activeSeason.overview && activeSeason.overview.length > 0 && activeSeason.season_number !== 0 ? (
            <p className="text-[13px] text-fg/85 mb-4 leading-relaxed max-w-3xl">
              {activeSeason.overview}
            </p>
          ) : null}
          {(activeSeason.episodes || []).length === 0 ? (
            <p className="text-[13px] text-fg-muted">No episodes listed for this season yet.</p>
          ) : (
            <div className="space-y-3">
              {(activeSeason.episodes || []).map(function (ep) {
                return (
                  <TitleEpisodeBlock
                    key={ep.id + "-" + ep.season_number + "-" + ep.episode_number}
                    episode={ep}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

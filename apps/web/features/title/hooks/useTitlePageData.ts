"use client";

import { useState, useEffect } from "react";
import { parseTmdbJsonObject } from "@/lib/tmdb/parseTmdbJson";
import type {
  TMDBMovie,
  TMDBSeasonDetail,
  TMDBVideo,
} from "@/lib/tmdb/types";
import type { TitleMedia } from "@/lib/title/paths";

const MAX_SEASONS_FETCH = 40;

function parseDetail(text: string): TMDBMovie | null {
  const d = parseTmdbJsonObject<TMDBMovie>(text);
  if (!d || typeof d.id !== "number") return null;
  return d;
}

function parseRecs(text: string): TMDBMovie[] {
  const d = parseTmdbJsonObject<{ results: TMDBMovie[] }>(text);
  if (!d || !Array.isArray(d.results)) return [];
  return d.results;
}

function parseSeason(text: string): TMDBSeasonDetail | null {
  const d = parseTmdbJsonObject<TMDBSeasonDetail>(text);
  if (!d || !Array.isArray(d.episodes)) return null;
  return d;
}

export type TitlePageStatus = "loading" | "ok" | "error" | "invalid_id";

export interface TitlePageData {
  status: TitlePageStatus;
  detail: TMDBMovie | null;
  /** YouTube and other site embeds, filtered in UI. */
  videos: TMDBVideo[];
  recommendations: TMDBMovie[];
  /** Only for TV: each season with full episode list. */
  seasons: TMDBSeasonDetail[];
  errorMessage: string | null;
}

const emptyData: TitlePageData = {
  status: "loading",
  detail: null,
  videos: [],
  recommendations: [],
  seasons: [],
  errorMessage: null,
};

export function useTitlePageData(media: TitleMedia, idParam: string): TitlePageData {
  const [data, setData] = useState<TitlePageData>(emptyData);

  useEffect(
    function () {
      const id = parseInt(idParam, 10);
      if (isNaN(id) || id < 1) {
        setData({
          status: "invalid_id",
          detail: null,
          videos: [],
          recommendations: [],
          seasons: [],
          errorMessage: null,
        });
        return;
      }

      let cancelled = false;
      setData({
        status: "loading",
        detail: null,
        videos: [],
        recommendations: [],
        seasons: [],
        errorMessage: null,
      });

      const cert = media === "tv" ? "content_ratings" : "release_dates";
      const extra =
        media === "tv" ? "created_by" : "";
      const detailUrl =
        "/api/tmdb/" +
        media +
        "/" +
        id +
        "?append_to_response=" +
        ["credits", "watch/providers", "external_ids", cert, "videos", extra]
          .filter(Boolean)
          .join(",");
      const recUrl = `/api/tmdb/${media}/${id}/recommendations?page=1`;

      Promise.all([
        fetch(detailUrl).then(function (r) {
          return r.text();
        }),
        fetch(recUrl).then(function (r) {
          return r.text();
        }),
      ])
        .then(function ([detailText, recText]) {
          if (cancelled) return;
          const detail = parseDetail(detailText);
          if (!detail) {
            setData({
              status: "error",
              detail: null,
              videos: [],
              recommendations: [],
              seasons: [],
              errorMessage: "Could not load this title.",
            });
            return;
          }
          const videoResults = detail.videos?.results
            ? detail.videos.results.slice()
            : [];
          const recommendations = parseRecs(recText);

          if (media !== "tv") {
            setData({
              status: "ok",
              detail: detail,
              videos: videoResults,
              recommendations: recommendations,
              seasons: [],
              errorMessage: null,
            });
            return;
          }

          if (!detail.number_of_seasons || detail.number_of_seasons < 1) {
            setData({
              status: "ok",
              detail: detail,
              videos: videoResults,
              recommendations: recommendations,
              seasons: [],
              errorMessage: null,
            });
            return;
          }

          const n = Math.min(
            Math.max(0, detail.number_of_seasons),
            MAX_SEASONS_FETCH
          );
          const seasonFetches: Promise<TMDBSeasonDetail | null>[] = [];
          for (let s = 1; s <= n; s++) {
            seasonFetches.push(
              fetch("/api/tmdb/tv/" + id + "/season/" + s)
                .then(function (r) {
                  return r.text();
                })
                .then(function (t) {
                  return parseSeason(t);
                })
                .catch(function () {
                  return null;
                })
            );
          }
          return Promise.all(seasonFetches).then(function (seasonList) {
            if (cancelled) return;
            const seasons = seasonList.filter(
              function (x): x is TMDBSeasonDetail {
                return x != null;
              }
            );
            setData({
              status: "ok",
              detail: detail,
              videos: videoResults,
              recommendations: recommendations,
              seasons: seasons,
              errorMessage: null,
            });
          });
        })
        .catch(function () {
          if (cancelled) return;
          setData({
            status: "error",
            detail: null,
            videos: [],
            recommendations: [],
            seasons: [],
            errorMessage: "Network error. Try again.",
          });
        });

      return function () {
        cancelled = true;
      };
    },
    [media, idParam]
  );

  return data;
}

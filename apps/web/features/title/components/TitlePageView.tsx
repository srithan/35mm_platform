"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { yearFromDate } from "@/features/discover/lib/tmdb-utils";
import { cn } from "@/lib/utils/cn";
import type { TitleMedia } from "@/lib/title/paths";
import { useTitlePageData } from "../hooks/useTitlePageData";
import { sortVideosForDisplay } from "../lib/titleVideos";
import { TitleContentTabs } from "./TitleContentTabs";
import { TitleOverviewContent } from "./TitleOverviewContent";
import { TitlePageAside } from "./TitlePageAside";
import { TitlePageHero } from "./TitlePageHero";
import { TitleErrorState, TitlePageLoadingState } from "./TitlePageStates";
import { TitleReviewsSection } from "./TitleReviewsSection";
import { MAIN_SECTION_GAP } from "./titlePageLayoutTokens";

type TitleContentTab = "overview" | "reviews";

export function TitlePageView(props: { media: TitleMedia; id: string }) {
  const { media, id } = props;
  const { status, detail, videos, recommendations, seasons, errorMessage } =
    useTitlePageData(media, id);
  const [activeVideoKey, setActiveVideoKey] = useState<string | null>(null);
  const [contentTab, setContentTab] = useState<TitleContentTab>("overview");
  const [reviewsTabMounted, setReviewsTabMounted] = useState(false);

  const goToReviewsTab = useCallback(
    function () {
      setReviewsTabMounted(true);
      const wasNotReviews = contentTab !== "reviews";
      setContentTab("reviews");
      if (wasNotReviews) {
        window.setTimeout(function () {
          const el = document.getElementById("title-reviews-panel");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
    },
    [contentTab]
  );

  useEffect(
    function () {
      if (typeof window === "undefined") return;
      if (window.location.hash === "#reviews") {
        setReviewsTabMounted(true);
        setContentTab("reviews");
      }
    },
    []
  );

  useEffect(
    function () {
      if (typeof window === "undefined" || window.location.hash !== "#reviews") return;
      if (contentTab !== "reviews" || !reviewsTabMounted) return;
      const t = window.setTimeout(function () {
        document.getElementById("title-reviews-panel")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
      return function () {
        window.clearTimeout(t);
      };
    },
    [contentTab, reviewsTabMounted]
  );

  const displayVideos = useMemo(
    function () {
      return sortVideosForDisplay(videos.slice());
    },
    [videos]
  );

  const isTv = media === "tv";
  const displayTitle = detail
    ? detail.title || detail.name || "Unknown"
    : "…";

  const yearStr = detail
    ? yearFromDate(detail.release_date || detail.first_air_date || "")
    : "";
  const watchProvidersUS = detail?.["watch/providers"]?.results?.US;

  let certification: string | undefined;
  if (detail) {
    if (isTv) {
      certification = detail.content_ratings?.results?.find(
        function (r) {
          return r.iso_3166_1 === "US";
        }
      )?.rating;
    } else {
      certification = detail.release_dates?.results
        ?.find(function (r) {
          return r.iso_3166_1 === "US";
        })
        ?.release_dates?.find(function (r) {
          return r.certification !== "";
        })?.certification;
    }
  }

  const directors = detail?.credits?.crew
    ?.filter(function (c) {
      return c.job === "Director";
    })
    .map(function (c) {
      return c.name;
    })
    .join(", ");
  const creators = detail?.created_by
    ?.map(function (c) {
      return c.name;
    })
    .join(", ");
  const writers = detail?.credits?.crew
    ?.filter(function (c) {
      return c.job === "Screenplay" || c.job === "Writer";
    })
    .map(function (c) {
      return c.name;
    })
    .join(", ");

  const firstYoutube = displayVideos.find(function (v) {
    return v.site === "YouTube" && v.key;
  });
  const playingKey = activeVideoKey || (firstYoutube ? firstYoutube.key : null);

  if (status === "invalid_id" || status === "error") {
    return <TitleErrorState message={errorMessage} />;
  }

  if (status === "loading" || !detail) {
    return <TitlePageLoadingState />;
  }

  const genreLine = (detail.genres || [])
    .map(function (g) {
      return g.name;
    })
    .join(", ");
  const metaLine = [yearStr, certification, genreLine].filter(Boolean).join(" · ");

  return (
    <div className="w-full min-h-full bg-gradient-to-b from-sunken/35 via-bg to-bg">
      <TitlePageHero
        detail={detail}
        isTv={isTv}
        displayTitle={displayTitle}
        metaLine={metaLine}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 pt-3 sm:pt-5">
        <TitleContentTabs
          contentTab={contentTab}
          onSelectOverview={function () {
            setContentTab("overview");
          }}
          onSelectReviews={goToReviewsTab}
        />

        <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-[1fr_300px] lg:gap-10 lg:items-start">
          <div className="order-2 min-w-0 lg:order-1">
            <div
              id="title-panel-overview"
              role="tabpanel"
              aria-labelledby="title-tab-overview"
              hidden={contentTab !== "overview"}
              className={cn(MAIN_SECTION_GAP, contentTab !== "overview" && "hidden")}
            >
              <TitleOverviewContent
                detail={detail}
                isTv={isTv}
                yearStr={yearStr}
                certification={certification}
                directors={directors}
                creators={creators}
                writers={writers}
                seasons={seasons}
                displayVideos={displayVideos}
                playingKey={playingKey}
                onSelectVideoKey={setActiveVideoKey}
                recommendations={recommendations}
                watchProvidersUS={watchProvidersUS}
              />
            </div>

            <div
              id="title-reviews-panel"
              role="tabpanel"
              aria-labelledby="title-tab-reviews"
              hidden={contentTab !== "reviews"}
              className={cn("min-w-0", contentTab !== "reviews" && "hidden")}
            >
              {reviewsTabMounted ? <TitleReviewsSection /> : null}
            </div>
          </div>

          <aside className="order-1 mb-8 flex flex-col gap-6 lg:order-2 lg:mb-0 lg:sticky lg:top-[calc(var(--site-header-sticky-offset,4.5rem)+12px)]">
            <TitlePageAside
              detail={detail}
              media={media}
              titleId={id}
              onWriteReview={goToReviewsTab}
              watchProvidersUS={watchProvidersUS}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

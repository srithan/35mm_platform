"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { yearFromDate } from "@/features/discover/lib/tmdb-utils";
import { cn } from "@/lib/utils/cn";
import type { TitleMedia } from "@/lib/title/paths";
import { useTitlePageData } from "../hooks/useTitlePageData";
import { crewByJobs } from "../lib/titleCrew";
import { sortVideosForDisplay } from "../lib/titleVideos";
import { TitleContentTabs, type TitleContentTab } from "./TitleContentTabs";
import { TitleOverviewContent } from "./TitleOverviewContent";
import { TitlePageAside } from "./TitlePageAside";
import { TitlePageHero } from "./TitlePageHero";
import { TitleErrorState, TitlePageLoadingState } from "./TitlePageStates";
import { TitleReviewsSection } from "./TitleReviewsSection";
import { MAIN_SECTION_GAP } from "./titlePageLayoutTokens";
import { useTitleFilmReference } from "../hooks/useTitleReviews";
import { useComposerModalStore } from "@/stores/useComposerModalStore";
import { useAuth } from "@clerk/nextjs";
import { useAuthPrompt } from "@/features/auth/components/AuthPromptProvider";
import { resolveTmdbFilm } from "@/features/films/api/filmsApi";
import { posterUrl } from "@/features/discover/lib/tmdb-utils";
import { showGlobalFlashToast } from "@/components/FlashToast";

type TitleContentTabState = TitleContentTab;

export function TitlePageView(props: {
  media: TitleMedia;
  id: string;
  tmdbId?: string;
}) {
  const { media, id, tmdbId } = props;
  const router = useRouter();
  const { status, detail, videos, recommendations, seasons, errorMessage } =
    useTitlePageData(media, id, tmdbId);
  const [activeVideoKey, setActiveVideoKey] = useState<string | null>(null);
  const [contentTab, setContentTab] = useState<TitleContentTabState>("reviews");
  const filmReference = useTitleFilmReference(media, id);
  const { getToken, isSignedIn } = useAuth();
  const { promptLogin } = useAuthPrompt();
  const [openingReview, setOpeningReview] = useState(false);

  useLayoutEffect(
    function () {
      if (typeof window === "undefined") return;
      window.scrollTo(0, 0);
    },
    [media, id],
  );


  useEffect(() => {
    if (status !== "ok" || window.location.hash !== "#reviews") return;
    setContentTab("reviews");
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("title-reviews-panel")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [status, media, id]);

  const displayVideos = useMemo(
    function () {
      return sortVideosForDisplay(videos.slice());
    },
    [videos],
  );

  const isTv = media === "tv";
  const displayTitle = detail ? detail.title || detail.name || "Unknown" : "…";

  const yearStr = detail
    ? yearFromDate(detail.release_date || detail.first_air_date || "")
    : "";
  const watchProvidersUS = detail?.["watch/providers"]?.results?.US;

  let certification: string | undefined;
  if (detail) {
    if (isTv) {
      certification = detail.content_ratings?.results?.find(function (r) {
        return r.iso_3166_1 === "US";
      })?.rating;
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

  const creditPeople = isTv
    ? detail?.created_by ?? []
    : crewByJobs(detail?.credits?.crew, ["Director"]);

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
  const metaLine = [yearStr, certification, genreLine]
    .filter(Boolean)
    .join(" · ");

  async function writeReview() {
    if (!isSignedIn) {
      promptLogin({ message: "Log in to write a review and join the conversation." });
      return;
    }
    if (!detail || isTv || openingReview) return;
    setOpeningReview(true);
    try {
      const film = {
        tmdbId: detail.id,
        title: displayTitle,
        year: yearStr ? Number(yearStr) : null,
        posterUrl: posterUrl(detail.poster_path, "w500"),
        genres: (detail.genres ?? []).map((genre) => genre.name),
      };
      const filmId =
        filmReference.data ??
        (await resolveTmdbFilm(film, await getToken())).filmId;
      const openModal = !window.matchMedia("(max-width: 767px)").matches;
      useComposerModalStore
        .getState()
        .openForFilm({ ...film, id: filmId, rating: null }, openModal);
      if (!openModal) router.push(ROUTES.NEW_POST);
      void filmReference.refetch();
    } catch (error) {
      showGlobalFlashToast(
        error instanceof Error
          ? error.message
          : "Could not open the review editor.",
        "error",
      );
    } finally {
      setOpeningReview(false);
    }
  }

  const overviewProps = {
    detail,
    isTv,
    yearStr,
    certification,
    seasons,
    displayVideos,
    playingKey,
    onSelectVideoKey: setActiveVideoKey,
    recommendations,
  };

  return (
    <div className="min-h-full w-full bg-bg">
      <TitlePageHero
        detail={detail}
        isTv={isTv}
        displayTitle={displayTitle}
        metaLine={metaLine}
        creditPeople={creditPeople}
      />
      <div className="mx-auto grid max-w-[1120px] gap-8 px-5 pb-24 pt-8 sm:grid-cols-[184px_minmax(0,1fr)] sm:gap-x-8 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-x-12">
        <aside className="min-w-0 sm:sticky sm:top-[calc(var(--site-header-sticky-offset,4.5rem)+24px)] sm:self-start">
          <TitlePageAside
            detail={detail}
            media={media}
            titleId={id}
            onWriteReview={writeReview}
            reviewPending={openingReview}
            watchProvidersUS={watchProvidersUS}
          />
        </aside>
        <div className="min-w-0">
          {detail.overview ? (
            <section aria-label="Synopsis" className="mb-8 max-w-[660px]">
              {detail.tagline ? (
                <p className="mb-3 font-display text-xl italic text-fg sm:text-2xl">
                  {detail.tagline}
                </p>
              ) : null}
              <p className="text-[15px] leading-[1.8] text-fg-muted">
                {detail.overview}
              </p>
            </section>
          ) : null}
          <TitleContentTabs
            contentTab={contentTab}
            onSelectTab={setContentTab}
          />
          <div
            id="title-reviews-panel"
            role="tabpanel"
            aria-labelledby="title-tab-reviews"
            hidden={contentTab !== "reviews"}
            className={cn(
              "max-w-[680px] scroll-mt-28 pt-8",
              contentTab !== "reviews" && "hidden",
            )}
          >
            {contentTab === "reviews" ? (
              <TitleReviewsSection
                filmId={filmReference.data ?? null}
                referenceLoading={filmReference.isLoading}
                referenceError={filmReference.isError}
                onRetryReference={() => void filmReference.refetch()}
                isTv={isTv}
                onWriteReview={writeReview}
                reviewPending={openingReview}
              />
            ) : null}
          </div>
          <div
            id="title-panel-about"
            role="tabpanel"
            aria-labelledby="title-tab-about"
            hidden={contentTab !== "about"}
            className={cn(
              MAIN_SECTION_GAP,
              "max-w-[680px] pt-8",
              contentTab !== "about" && "hidden",
            )}
          >
            {contentTab === "about" ? (
              <TitleOverviewContent section="about" {...overviewProps} />
            ) : null}
          </div>
          <div
            id="title-panel-cast"
            role="tabpanel"
            aria-labelledby="title-tab-cast"
            hidden={contentTab !== "cast"}
            className={cn(
              MAIN_SECTION_GAP,
              "max-w-[680px] pt-8",
              contentTab !== "cast" && "hidden",
            )}
          >
            {contentTab === "cast" ? (
              <TitleOverviewContent section="cast" {...overviewProps} />
            ) : null}
          </div>
          <div
            id="title-panel-more"
            role="tabpanel"
            aria-labelledby="title-tab-more"
            hidden={contentTab !== "more"}
            className={cn(
              MAIN_SECTION_GAP,
              "max-w-[680px] pt-8",
              contentTab !== "more" && "hidden",
            )}
          >
            {contentTab === "more" ? (
              <TitleOverviewContent section="more" {...overviewProps} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

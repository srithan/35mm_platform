"use client";

import {
  useCallback,
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
import { sortVideosForDisplay } from "../lib/titleVideos";
import { TitleContentTabs } from "./TitleContentTabs";
import { TitleOverviewContent } from "./TitleOverviewContent";
import { TitlePageAside } from "./TitlePageAside";
import { TitlePageHero } from "./TitlePageHero";
import { TitleErrorState, TitlePageLoadingState } from "./TitlePageStates";
import { TitleReviewsSection } from "./TitleReviewsSection";
import { MAIN_SECTION_GAP } from "./titlePageLayoutTokens";
import { useTitleFilmReference } from "../hooks/useTitleReviews";
import { useComposerModalStore } from "@/stores/useComposerModalStore";
import { useAuth, useClerk } from "@clerk/nextjs";
import { resolveTmdbFilm } from "@/features/films/api/filmsApi";
import { posterUrl } from "@/features/discover/lib/tmdb-utils";
import { showGlobalFlashToast } from "@/components/FlashToast";

type TitleContentTab = "overview" | "reviews";

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
  const [contentTab, setContentTab] = useState<TitleContentTab>("reviews");
  const filmReference = useTitleFilmReference(media, id);
  const { getToken, isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const [openingReview, setOpeningReview] = useState(false);

  useLayoutEffect(
    function () {
      if (typeof window === "undefined") return;
      window.scrollTo(0, 0);
    },
    [media, id],
  );

  const goToReviewsTab = useCallback(() => setContentTab("reviews"), []);

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
  const metaLine = [yearStr, certification, genreLine]
    .filter(Boolean)
    .join(" · ");

  async function writeReview() {
    if (!isSignedIn) {
      openSignIn();
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

  return (
    <div className="min-h-full w-full bg-bg">
      <TitlePageHero
        detail={detail}
        isTv={isTv}
        displayTitle={displayTitle}
        metaLine={metaLine}
        credit={isTv ? creators : directors}
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
            onSelectOverview={() => setContentTab("overview")}
            onSelectReviews={goToReviewsTab}
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
            id="title-panel-overview"
            role="tabpanel"
            aria-labelledby="title-tab-overview"
            hidden={contentTab !== "overview"}
            className={cn(
              MAIN_SECTION_GAP,
              "pt-8",
              contentTab !== "overview" && "hidden",
            )}
          >
            {contentTab === "overview" ? (
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
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

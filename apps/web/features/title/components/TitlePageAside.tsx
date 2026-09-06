import type { TitleMedia } from "@/lib/title/paths";
import type { TMDBMovie } from "@/lib/tmdb/types";

import { TitleActionButtons } from "./TitleActionButtons";
import { TitleWatchBlock } from "./TitleWatchBlock";

type TitlePageAsideProps = {
  detail: TMDBMovie;
  media: TitleMedia;
  titleId: string;
  onWriteReview: () => void;
  reviewPending?: boolean;
  watchProvidersUS:
    NonNullable<TMDBMovie["watch/providers"]>["results"]["US"] | undefined;
};

export function TitlePageAside(props: TitlePageAsideProps) {
  const w = props.watchProvidersUS;
  const hasWatch = w && (w.flatrate || w.rent || w.buy);
  return (
    <div className="space-y-8">
      <div className="w-full">
        <TitleActionButtons
          detail={props.detail}
          media={props.media}
          tmdbId={props.titleId}
          imdbId={props.detail.external_ids?.imdb_id}
          onWriteReview={props.onWriteReview}
          reviewPending={props.reviewPending}
        />
      </div>

      {hasWatch && w ? (
        <>
          <div className="hidden sm:block">
            <TitleWatchBlock watchProvidersUS={w} />
          </div>
          <details className="border-t border-border pt-4 sm:hidden">
            <summary className="cursor-pointer text-sm font-medium text-fg">
              Where to watch
            </summary>
            <div className="pt-4">
              <TitleWatchBlock watchProvidersUS={w} />
            </div>
          </details>
        </>
      ) : null}
    </div>
  );
}

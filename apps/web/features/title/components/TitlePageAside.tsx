import type { TitleMedia } from "@/lib/title/paths";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { PANEL } from "./titlePageLayoutTokens";
import { TitleActionButtons } from "./TitleActionButtons";
import { TitleWatchBlock } from "./TitleWatchBlock";

type TitlePageAsideProps = {
  detail: TMDBMovie;
  media: TitleMedia;
  titleId: string;
  onWriteReview: () => void;
  watchProvidersUS:
    | NonNullable<TMDBMovie["watch/providers"]>["results"]["US"]
    | undefined;
};

export function TitlePageAside(props: TitlePageAsideProps) {
  const w = props.watchProvidersUS;
  const hasWatch = w && (w.flatrate || w.rent || w.buy);
  return (
    <>
      <div className={PANEL + " w-full"}>
        <TitleActionButtons
          media={props.media}
          tmdbId={props.titleId}
          imdbId={props.detail.external_ids?.imdb_id}
          onWriteReview={props.onWriteReview}
        />
      </div>

      {hasWatch && w ? (
        <div className="hidden lg:block">
          <TitleWatchBlock watchProvidersUS={w} />
        </div>
      ) : null}
    </>
  );
}

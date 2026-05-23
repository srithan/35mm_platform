import { useState } from "react";
import { LazyImage } from "@/components/LazyImage";
import { posterUrl } from "@/features/discover/lib/tmdb-utils";
import { cn } from "@/lib/utils/cn";
import type { TMDBEpisode } from "@/lib/tmdb/types";

function formatAirDate(s: string | null): string {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = s.slice(0, 10).split("-");
    if (d.length === 3) return d[1] + "/" + d[2] + "/" + d[0];
  }
  return s;
}

export function TitleEpisodeBlock(props: { episode: TMDBEpisode }) {
  const ep = props.episode;
  const [open, setOpen] = useState(false);
  const hasLongOverview = (ep.overview || "").length > 220;
  return (
    <div className="group overflow-hidden rounded-xl bg-sunken/40 transition-colors hover:bg-sunken/55 dark:bg-sunken/25">
      <div className="flex flex-col sm:flex-row gap-0 sm:gap-0">
        <div className="sm:w-44 md:w-52 flex-shrink-0 aspect-video bg-sunken">
          {ep.still_path ? (
            <LazyImage
              src={posterUrl(ep.still_path, "w342") || ""}
              alt=""
              aspectRatio="16/9"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-fg-faint text-[10px] tracking-wide">
              S{ep.season_number}·E{ep.episode_number}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 p-3.5 sm:p-4 md:p-5">
          <div className="text-[11px] text-fg-muted font-medium">
            {"Episode " + ep.episode_number}
            {ep.air_date ? " · " + formatAirDate(ep.air_date) : ""}
            {ep.runtime != null && ep.runtime > 0
              ? " · " + ep.runtime + " min"
              : ""}
          </div>
          <h4 className="text-[15px] font-semibold text-fg leading-snug mt-1.5">
            {ep.name}
          </h4>
          {ep.overview ? (
            <p
              className={cn(
                "text-[13px] text-fg/85 leading-relaxed mt-2",
                !open && hasLongOverview && "line-clamp-3"
              )}
            >
              {ep.overview}
            </p>
          ) : (
            <p className="text-[12px] text-fg-muted mt-2 italic">No synopsis yet.</p>
          )}
          {hasLongOverview ? (
            <button
              type="button"
              onClick={function () {
                setOpen(!open);
              }}
              className="mt-2 text-[12px] font-medium text-fg/90 hover:underline"
            >
              {open ? "Show less" : "Read more"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

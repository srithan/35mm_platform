import type { TMDBMedia } from "@/lib/tmdb/types";
import { PANEL, TitleSectionTitle } from "./titlePageLayoutTokens";

type WatchBlockProps = {
  watchProvidersUS: NonNullable<
    TMDBMedia["watch/providers"]
  >["results"]["US"];
};

export function TitleWatchBlock(props: WatchBlockProps) {
  const w = props.watchProvidersUS;
  if (!w) return null;
  const hasStream = w.flatrate && w.flatrate.length > 0;
  const hasRent = w.rent && w.rent.length > 0;
  const hasBuy = w.buy && w.buy.length > 0;
  if (!hasStream && !hasRent && !hasBuy) return null;
  return (
    <div className={PANEL}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <TitleSectionTitle>Where to watch</TitleSectionTitle>
        {w.link ? (
          <a
            href={w.link}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium text-fg/75 hover:underline"
          >
            JustWatch
          </a>
        ) : null}
      </div>
      <div className="space-y-4 text-[12px]">
        {hasStream ? (
          <div>
            <p className="text-[11px] text-fg-muted font-medium mb-2">Stream</p>
            <div className="flex flex-wrap gap-2">
              {w.flatrate!.map(function (p) {
                return (
                  <div
                    key={"f-" + p.provider_id}
                    title={p.provider_name}
                    className="rounded-lg bg-sunken/70 p-1.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={"https://image.tmdb.org/t/p/w45" + p.logo_path}
                      alt=""
                      className="w-8 h-8 rounded-md"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {hasRent ? (
          <div>
            <p className="text-[11px] text-fg-muted font-medium mb-2">Rent</p>
            <div className="flex flex-wrap gap-2">
              {w.rent!.map(function (p) {
                return (
                  <div
                    key={"r-" + p.provider_id}
                    title={p.provider_name}
                    className="rounded-lg bg-sunken/70 p-1.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={"https://image.tmdb.org/t/p/w45" + p.logo_path}
                      alt=""
                      className="w-8 h-8 rounded-md"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {hasBuy ? (
          <div>
            <p className="text-[11px] text-fg-muted font-medium mb-2">Buy</p>
            <div className="flex flex-wrap gap-2">
              {w.buy!.map(function (p) {
                return (
                  <div
                    key={"b-" + p.provider_id}
                    title={p.provider_name}
                    className="rounded-lg bg-sunken/70 p-1.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={"https://image.tmdb.org/t/p/w45" + p.logo_path}
                      alt=""
                      className="w-8 h-8 rounded-md"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

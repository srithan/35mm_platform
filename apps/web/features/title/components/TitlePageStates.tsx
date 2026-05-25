import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/constants/routes";

export function TitleErrorState(props: { message?: string | null }) {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <p className="text-fg-muted text-[15px] leading-relaxed">
        {props.message || "We couldn’t find this title."}
      </p>
      <Link
        href={ROUTES.DISCOVER}
        className="inline-flex mt-6 text-[14px] font-semibold text-fg underline decoration-fg/25 underline-offset-2 hover:decoration-fg/50"
      >
        Go to Discover
      </Link>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block overflow-hidden rounded-sm",
        "bg-gradient-to-r from-skeleton via-skeleton-strong to-skeleton",
        "bg-skeleton-shimmer animate-skeleton-shimmer",
        className
      )}
    />
  );
}

function TitleHeroSkeleton() {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="relative min-h-[min(72vh,820px)] w-full sm:min-h-[min(58vh,700px)]">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/92 via-black/40 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-white/0 via-black/20 to-black/68" />

        <div className="relative z-10 flex min-h-[min(72vh,820px)] flex-col justify-end px-4 pb-10 pt-28 sm:min-h-[min(58vh,700px)] sm:px-6 sm:pb-12 sm:pt-32 md:px-10 md:pb-14">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-7 sm:max-w-6xl sm:flex-row sm:items-end sm:gap-10 md:gap-12">
            <Skeleton className="aspect-[2/3] w-[9.5rem] shrink-0 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.45)] sm:w-[12rem] md:w-[13.25rem]" />
            <div className="min-w-0 flex-1 pb-0.5 text-center sm:pb-2 sm:text-left">
              <Skeleton className="mx-auto h-3.5 w-20 rounded-full bg-white/15 sm:mx-0 sm:w-24" />
              <Skeleton className="mt-3 h-10 w-[78%] rounded bg-white/15 sm:h-12 md:h-14 md:w-[70%]" />
              <Skeleton className="mt-3.5 h-4 w-[64%] rounded bg-white/12" />
              <Skeleton className="mt-2 h-4 w-[48%] rounded bg-white/12" />
              <div className="mt-4 flex items-center justify-center gap-2 sm:justify-start">
                {Array.from({ length: 5 }).map(function (_, index) {
                  return <Skeleton key={index} className="h-2.5 w-2.5 rounded-full bg-white/18" />;
                })}
                <Skeleton className="ml-1 h-3.5 w-10 rounded bg-white/12" />
                <span className="text-white/25">·</span>
                <Skeleton className="h-3.5 w-24 rounded bg-white/12" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TitleTabsSkeleton() {
  return (
    <div className="flex items-center gap-2 border-b border-border pb-3">
      <Skeleton className="h-10 w-24 rounded-full" />
      <Skeleton className="h-10 w-20 rounded-full" />
    </div>
  );
}

function TitleActionButtonsSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

function TitleWatchBlockSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-elevated/30 p-5 shadow-sm dark:bg-sunken/20">
      <Skeleton className="h-4 w-28 rounded" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

function TitleGlanceSkeleton() {
  return (
    <section className="min-w-0">
      <Skeleton className="h-7 w-40 rounded" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map(function (_, index) {
          return (
            <div
              key={index}
              className="flex gap-3 rounded-2xl border border-border bg-elevated/50 p-4 shadow-sm dark:bg-sunken/25"
            >
              <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="mt-3 h-4 w-[78%] rounded" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map(function (_, index) {
          return (
            <div
              key={index}
              className="flex gap-4 rounded-2xl border border-border bg-elevated/30 p-5 shadow-sm dark:bg-sunken/20"
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-full self-start" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="mt-2 h-4 w-[86%] rounded" />
                <Skeleton className="mt-2 h-4 w-[66%] rounded" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TitleCastSkeletonRow() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
      {Array.from({ length: 8 }).map(function (_, index) {
        return (
          <div key={index} className="w-[4.5rem] flex-shrink-0 text-center sm:w-20">
            <Skeleton className="mx-auto mb-2 h-16 w-16 rounded-full sm:h-[4.5rem] sm:w-[4.5rem]" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="mt-1 h-2.5 w-[76%] rounded" />
          </div>
        );
      })}
    </div>
  );
}

function TitleRecommendationSkeletonGrid() {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4">
      {Array.from({ length: 8 }).map(function (_, index) {
        return (
          <li key={index}>
            <Skeleton className="aspect-[2/3] w-full rounded-lg" />
            <Skeleton className="mt-2 h-3.5 w-[88%] rounded" />
            <Skeleton className="mt-2 h-3 w-20 rounded" />
          </li>
        );
      })}
    </ul>
  );
}

export function TitlePageLoadingState() {
  return (
    <div className="min-h-full w-full bg-gradient-to-b from-sunken/35 via-bg to-bg">
      <TitleHeroSkeleton />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 pt-3 sm:pt-5">
        <TitleTabsSkeleton />

        <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-[1fr_300px] lg:gap-10 lg:items-start">
          <div className="order-2 min-w-0 lg:order-1">
            <div className="flex flex-col gap-12 min-w-0">
              <section>
                <Skeleton className="h-7 w-24 rounded" />
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-[94%] rounded" />
                  <Skeleton className="h-4 w-[82%] rounded" />
                </div>
              </section>

              <TitleGlanceSkeleton />

              <section>
                <Skeleton className="h-7 w-16 rounded" />
                <div className="mt-4">
                  <TitleCastSkeletonRow />
                </div>
              </section>

              <section>
                <Skeleton className="h-7 w-28 rounded" />
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {Array.from({ length: 4 }).map(function (_, index) {
                    return (
                      <div key={index} className="w-28 shrink-0 overflow-hidden rounded-lg">
                        <Skeleton className="aspect-video w-full rounded-none" />
                        <Skeleton className="h-3 w-[82%] rounded mt-1.5" />
                        <Skeleton className="mt-1 h-2.5 w-[46%] rounded" />
                      </div>
                    );
                  })}
                </div>
              </section>

              <section aria-label="Related titles from TMDB">
                <Skeleton className="h-7 w-40 rounded" />
                <Skeleton className="mt-2 h-3 w-40 rounded" />
                <div className="mt-4">
                  <TitleRecommendationSkeletonGrid />
                </div>
              </section>
            </div>
          </div>

          <aside className="order-1 mb-8 flex flex-col gap-6 lg:order-2 lg:mb-0 lg:sticky lg:top-[calc(var(--site-header-sticky-offset,4.5rem)+12px)]">
            <TitleActionButtonsSkeleton />
            <div className="hidden lg:block">
              <TitleWatchBlockSkeleton />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

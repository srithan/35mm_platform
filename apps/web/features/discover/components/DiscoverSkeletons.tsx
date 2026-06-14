"use client";

import { cn } from "@/lib/utils/cn";

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

function PosterCardSkeleton() {
  return (
    <div className="w-[116px] flex-shrink-0 text-left sm:w-[132px] lg:w-[148px]">
      <Skeleton className="mb-2 aspect-[2/3] rounded-xl" />
      <Skeleton className="h-3.5 w-[88%] rounded" />
      <Skeleton className="mt-1 h-2.5 w-1/2 rounded" />
    </div>
  );
}

export function DiscoverShelfSkeleton({
  titleWidth = "w-36",
  cardCount = 6,
  className,
}: {
  titleWidth?: string;
  cardCount?: number;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-center gap-2.5">
        <Skeleton className="h-5 w-1 rounded-full" />
        <Skeleton className={cn("h-5 rounded", titleWidth)} />
      </div>
      <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6 lg:-mx-2 lg:px-2">
        <div className="flex items-start gap-3 pb-2 md:gap-4">
          {Array.from({ length: cardCount }).map(function (_, index) {
            return <PosterCardSkeleton key={index} />;
          })}
        </div>
      </div>
    </section>
  );
}

export function DiscoverHeroSkeleton() {
  return (
    <section
      className={cn(
        "group relative min-h-[420px] w-full overflow-hidden rounded-2xl",
        "bg-[var(--discover-placeholder)] text-left shadow-sm md:min-h-[520px] xl:min-h-[580px]"
      )}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-skeleton/70 via-skeleton-strong/65 to-skeleton/80" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/88 via-black/30 to-black/5 md:bg-[linear-gradient(90deg,rgba(0,0,0,.8)_0%,rgba(0,0,0,.5)_38%,rgba(0,0,0,.14)_72%,rgba(0,0,0,.04)_100%)]" />

      <div className="relative z-10 flex min-h-[420px] max-w-2xl flex-col justify-end gap-5 p-5 md:min-h-[520px] md:p-8 xl:min-h-[580px]">
        <div className="space-y-4">
          <Skeleton className="h-5 w-24 rounded-full bg-white/15" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-[78%] rounded bg-white/15 md:h-14 md:w-[68%]" />
            <Skeleton className="h-4 w-[56%] rounded bg-white/12" />
            <Skeleton className="h-4 w-[44%] rounded bg-white/12" />
          </div>
          <Skeleton className="h-12 w-[82%] rounded-xl bg-white/12" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24 rounded-full bg-white/12" />
          <Skeleton className="h-9 w-20 rounded-full bg-white/12" />
          <Skeleton className="h-9 w-24 rounded-full bg-white/12" />
        </div>
      </div>
    </section>
  );
}

function SearchResultCardSkeleton() {
  return (
    <div className="text-left">
      <Skeleton className="aspect-[2/3] rounded-xl" />
      <Skeleton className="mt-2 h-3.5 w-[88%] rounded" />
      <Skeleton className="mt-1 h-2.5 w-1/2 rounded" />
    </div>
  );
}

export function DiscoverSearchResultsSkeleton() {
  return (
    <div className="py-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map(function (_, index) {
          return <SearchResultCardSkeleton key={index} />;
        })}
      </div>
    </div>
  );
}

export function DiscoverPageLoadingState() {
  return (
    <div className="min-h-full w-full bg-bg md:max-w-none md:mx-0">
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-safe md:px-6 lg:pt-0">
        <div className="flex flex-col gap-4 border-b border-border py-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Skeleton className="h-7 w-32 rounded md:h-8 md:w-40" />
            <Skeleton className="mt-3 h-4 w-full max-w-xl rounded" />
            <Skeleton className="mt-2 h-4 w-[72%] max-w-lg rounded" />
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:min-w-[440px]">
            <Skeleton className="h-10 flex-1 rounded-full" />
            <Skeleton className="h-10 w-full rounded-full sm:w-36" />
          </div>
        </div>

        <div className="min-w-0 pt-5">
          <DiscoverHeroSkeleton />
          <div className="mt-8">
            <DiscoverShelfSkeleton
              titleWidth="w-40"
              cardCount={7}
            />
          </div>
          <div className="mt-8">
            <DiscoverShelfSkeleton
              titleWidth="w-32"
              cardCount={7}
            />
          </div>
          <div className="mt-8">
            <DiscoverShelfSkeleton
              titleWidth="w-36"
              cardCount={7}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

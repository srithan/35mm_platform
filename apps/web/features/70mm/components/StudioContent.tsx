"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  Eye,
  Film,
  FolderKanban,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import type { UploadedFilm } from "@35mm/types";
import { getUploadedFilms } from "@/features/videos/api/videoApi";
import { videoKeys } from "@/features/videos/hooks/queryKeys";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { SeventyMmNavigation } from "./SeventyMmNavigation";

const releaseDate = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function isScheduled(film: UploadedFilm) {
  return new Date(film.releaseAt).getTime() > Date.now();
}

function StudioMetric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-[24px] border p-5",
        emphasis
          ? "border-fg bg-fg text-bg"
          : "border-border bg-bg-elevated text-fg",
      )}
    >
      <p className="font-mono text-3xl font-semibold tabular-nums">{value}</p>
      <p
        className={cn(
          "mt-1 text-sm",
          emphasis ? "text-bg/65" : "text-fg-muted",
        )}
      >
        {label}
      </p>
    </article>
  );
}

function ProjectRow({ film }: { film: UploadedFilm }) {
  const scheduled = isScheduled(film);

  return (
    <article className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1.25fr)_minmax(130px,.65fr)_minmax(120px,.55fr)_auto] md:items-center">
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-sunken">
          {film.thumbnailUrl ? (
            <img
              src={film.thumbnailUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <Film className="h-6 w-6 text-fg-faint" aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold text-fg">
            {film.title}
          </h2>
          <p className="mt-1 truncate text-sm text-fg-muted">
            {film.director || film.author.displayName}
          </p>
        </div>
      </div>

      <div>
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
            scheduled ? "bg-[#fff1c2] text-[#5c4600]" : "bg-sunken text-fg",
          )}
        >
          {scheduled ? (
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              aria-hidden
            />
          )}
          {scheduled ? "Scheduled" : "Live"}
        </span>
        <p className="mt-1.5 text-xs text-fg-faint">
          {releaseDate.format(new Date(film.releaseAt))}
        </p>
      </div>

      <p className="flex items-center gap-2 text-sm font-semibold capitalize text-fg">
        {film.visibility === "public" ? (
          <Eye className="h-4 w-4 text-fg-faint" aria-hidden />
        ) : (
          <LockKeyhole className="h-4 w-4 text-fg-faint" aria-hidden />
        )}
        {film.visibility}
      </p>

      <Link
        href={ROUTES.SEVENTY_MM_FILM(film.id)}
        className="inline-flex h-10 w-fit items-center justify-center rounded-full bg-fg px-5 text-sm font-bold text-bg no-underline transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        Open
      </Link>
    </article>
  );
}

export function StudioContent() {
  const { userId, isLoaded, getToken } = useAuth();
  const projects = useInfiniteQuery({
    queryKey: videoKeys.films(userId ?? null, true),
    enabled: isLoaded && Boolean(userId),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      getUploadedFilms(pageParam, true, await getToken()),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30_000,
  });
  const films = projects.data?.pages.flatMap((page) => page.items) ?? [];
  const scheduledCount = films.filter(isScheduled).length;
  const liveCount = films.length - scheduledCount;
  const limitedCount = films.filter(
    (film) => film.visibility !== "public",
  ).length;

  return (
    <div className="min-h-full bg-bg pb-20">
      <SeventyMmNavigation active="studio" />
      <main className="mx-auto w-full max-w-[1500px] px-4 pt-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
              Creator studio
            </p>
            <h1 className="mt-3 font-display text-[clamp(3rem,7vw,5rem)] leading-[0.9] tracking-[-0.025em] text-fg">
              Manage releases.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-6 text-fg-muted">
              Review published projects, release timing, and audience visibility
              from one place.
            </p>
          </div>
          <Link
            href={ROUTES.SEVENTY_MM_UPLOAD}
            className="inline-flex h-12 w-fit shrink-0 items-center justify-center rounded-full bg-fg px-6 text-sm font-bold text-bg no-underline transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            New project
          </Link>
        </header>

        {!isLoaded ? (
          <div
            className="mt-10 flex items-center gap-3 text-sm text-fg-muted"
            role="status"
          >
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
            Loading studio…
          </div>
        ) : !userId ? (
          <section className="mt-10 rounded-[28px] border border-border bg-bg-elevated p-8 text-center">
            <FolderKanban
              className="mx-auto h-9 w-9 text-fg-faint"
              aria-hidden
            />
            <h2 className="mt-4 font-display text-3xl text-fg">
              Your projects live here.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-fg-muted">
              Sign in to manage films uploaded to 70mm.
            </p>
            <Link
              href={ROUTES.AUTH_LOGIN}
              className="mt-5 inline-flex rounded-full bg-fg px-5 py-2.5 text-sm font-bold text-bg"
            >
              Sign in
            </Link>
          </section>
        ) : projects.isPending ? (
          <div
            className="mt-10 flex items-center gap-3 text-sm text-fg-muted"
            role="status"
          >
            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
            Loading projects…
          </div>
        ) : projects.isError ? (
          <section
            className="mt-10 rounded-[28px] border border-border bg-bg-elevated p-8"
            role="alert"
          >
            <h2 className="font-display text-3xl text-fg">
              Projects unavailable.
            </h2>
            <p className="mt-2 text-sm text-fg-muted">
              {projects.error.message}
            </p>
            <button
              type="button"
              onClick={() => void projects.refetch()}
              className="mt-5 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-fg"
            >
              Retry
            </button>
          </section>
        ) : films.length === 0 ? (
          <section className="mt-10 rounded-[28px] border border-border bg-bg-elevated p-8 text-center">
            <FolderKanban
              className="mx-auto h-9 w-9 text-fg-faint"
              aria-hidden
            />
            <h2 className="mt-4 font-display text-3xl text-fg">
              Start your first release.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-fg-muted">
              Published 70mm projects will appear here with their release timing
              and visibility.
            </p>
            <Link
              href={ROUTES.SEVENTY_MM_UPLOAD}
              className="mt-5 inline-flex rounded-full bg-fg px-5 py-2.5 text-sm font-bold text-bg"
            >
              Upload a film
            </Link>
          </section>
        ) : (
          <>
            <section
              className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Loaded project summary"
            >
              <StudioMetric
                label="projects loaded"
                value={films.length}
                emphasis
              />
              <StudioMetric label="live now" value={liveCount} />
              <StudioMetric label="scheduled" value={scheduledCount} />
              <StudioMetric label="limited visibility" value={limitedCount} />
            </section>

            <section
              className="mt-6 overflow-hidden rounded-[28px] border border-border bg-bg-elevated shadow-sm"
              aria-labelledby="studio-projects-title"
            >
              <div className="hidden grid-cols-[minmax(0,1.25fr)_minmax(130px,.65fr)_minmax(120px,.55fr)_auto] gap-4 border-b border-border bg-sunken p-4 font-mono text-xs uppercase tracking-[0.16em] text-fg-faint md:grid">
                <h2
                  id="studio-projects-title"
                  className="font-inherit text-inherit"
                >
                  Project
                </h2>
                <span>Status</span>
                <span>Audience</span>
                <span>Action</span>
              </div>
              <div className="divide-y divide-border">
                {films.map((film) => (
                  <ProjectRow key={film.id} film={film} />
                ))}
              </div>
            </section>

            {projects.hasNextPage ? (
              <button
                type="button"
                disabled={projects.isFetchingNextPage}
                onClick={() => void projects.fetchNextPage()}
                className="mx-auto mt-6 flex h-11 items-center justify-center rounded-full border border-border bg-bg-elevated px-6 text-sm font-bold text-fg disabled:cursor-wait disabled:opacity-60"
              >
                {projects.isFetchingNextPage
                  ? "Loading…"
                  : "Load more projects"}
              </button>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
